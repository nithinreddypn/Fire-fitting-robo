#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <iostream>
#include <sstream>
#include <ESP32Servo.h>
#include <Adafruit_NeoPixel.h>
#include <Wire.h>
#include <driver/dac.h>
#include <driver/rtc_io.h>
#include "robot_status.h"

// ── Motor Pins (PWM on IN pins directly, EnA & EnB removed) ──
#define RIGHT_MOTOR_IN1     14  // Right Motor IN1 (PWM Forward - Primary Pin)
#define RIGHT_MOTOR_IN1_ALT 2   // Right Motor IN1 (PWM Forward - Parallel Mirror Pin on GPIO 2 / Onboard LED)
#define RIGHT_MOTOR_IN2     27  // Right Motor IN2 (PWM Backward)
#define LEFT_MOTOR_IN1      19  // Left Motor IN1  (PWM Forward)
#define LEFT_MOTOR_IN2      25  // Left Motor IN2  (PWM Backward - Primary Pin)
#define LEFT_MOTOR_IN2_ALT  23  // Left Motor IN2  (PWM Backward - Parallel Mirror Pin on GPIO 23)

// Dedicated LEDC PWM Channels for Motors (Using Low-Speed Channels 8-13 to prevent any servo timer collision)
#define MOTOR_PWM_FREQ 1000  // 1 kHz smooth PWM
#define MOTOR_PWM_RES  8     // 8-bit resolution (0-255)
#define CH_RM_IN1     8      // Low-Speed Channel 8
#define CH_RM_IN1_ALT 9      // Low-Speed Channel 9 (GPIO 2 mirror)
#define CH_RM_IN2     10     // Low-Speed Channel 10
#define CH_LM_IN1     11     // Low-Speed Channel 11
#define CH_LM_IN2     12     // Low-Speed Channel 12
#define CH_LM_IN2_ALT 13     // Low-Speed Channel 13 (GPIO 23 mirror)

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  #define MOTOR_PWM_ATTACH(pin, ch, freq, res) ledcAttach(pin, freq, res)
  #define MOTOR_PWM_WRITE(pin, ch, duty)       ledcWrite(pin, duty)
#else
  #define MOTOR_PWM_ATTACH(pin, ch, freq, res) do { ledcSetup(ch, freq, res); ledcAttachPin(pin, ch); } while(0)
  #define MOTOR_PWM_WRITE(pin, ch, duty)       ledcWrite(ch, duty)
#endif

// ── Acoustic Audio Cannon (TPA3110 Power Amplifier + Extinguisher Speaker) ──
#define DAC_AUDIO_PIN   26   // ESP32 DAC2 (GPIO 26) -> TPA3110 Audio IN (Direct Connection, No Relay)
#define AUDIO_VOLUME    126  // MAX RAIL-TO-RAIL DYNAMIC RANGE (128 ± 126 = 2 to 254) for maximum acoustic extinction power
volatile bool sonicWaveActive = false;
TaskHandle_t audioTaskHandle = NULL;

// ── Ultrasonic Sensor Pins ──
#define ULTRASONIC_TRIG_PIN 5   // Ultrasonic TRIG
#define ULTRASONIC_ECHO_PIN 18  // Ultrasonic ECHO

// ── Directional Servos (Water Direction & Sonic Direction) ──
#define ULTRASONIC_SERVO_PIN 13  // Ultrasonic Sweep Servo
#define WATER_DIR_PIN        32  // Water Direction Nozzle Servo (GPIO 32, formerly Pan)
#define SONIC_DIR_PIN        33  // Sonic Direction Cannon Servo (GPIO 33, formerly CamTilt)

Servo sonicDirServo;
Servo waterDirServo;
Servo ultrasonicServo;

// Aliases for backwards compatibility with legacy naming
#define panServo waterDirServo
#define camTiltServo sonicDirServo
#define PAN_PIN WATER_DIR_PIN
#define CAM_TILT_PIN SONIC_DIR_PIN

// ── OLED Display (I2C) Pins ──
#define OLED_SDA_PIN 21
#define OLED_SCL_PIN 22

// ── Lighting & Relays ──
#define LIGHT_PIN       4
#define AUTO_RELAY_PIN  17  // Auto Mode Relay (GPIO 17) -> Engaged ONLY when Automatic Mode is clicked
#define RELAY_PIN       16  // Water Relay (GPIO 16)
#define AM_RELAY_PIN    15  // Secondary Auto Relay Pin (GPIO 15)
#define RELAY2_PIN      17  // Backwards compatibility alias for Auto Mode Relay GPIO 17

#define UP 1
#define DOWN 2
#define LEFT 3
#define RIGHT 4
#define STOP 0
#define RIGHT_MOTOR 0
#define LEFT_MOTOR 1
#define FORWARD 1
#define BACKWARD -1

int currentSpeed = 200;  // Default speed (0-255), set to 200 for reliable starting torque
int currentCarState = STOP;

// ── NeoPixel definitions ──
#define NEOPIXEL_PIN 12
#define NUMPIXELS 20
Adafruit_NeoPixel pixels(NUMPIXELS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

const char* ssid     = "RNS ROBOT";
const char* password = "12345678";

AsyncWebServer server(80);
AsyncWebSocket wsCarInput("/CarInput");




// ── Web Interface HTML/CSS/JS (Separated to prevent Arduino IDE preprocessor #line injection) ──
#include "html_page.h"

void setSolidColor(uint32_t color) {
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, color);
  }
  pixels.show();
}

void setAllOff() {
  pixels.clear();
  pixels.show();
}

// ── System Status Evaluation (RobotStatus enum defined in robot_status.h) ──
RobotStatus getSystemStatus() {
  if (sonicWaveActive) {
    return STATUS_SONIC_ACTIVE;
  }
  if (digitalRead(RELAY_PIN) == HIGH) {
    return STATUS_WATER_ACTIVE;
  }
  if (digitalRead(AM_RELAY_PIN) == HIGH || digitalRead(RELAY2_PIN) == HIGH) {
    return STATUS_AUTO_MODE;
  }
  if (wsCarInput.count() == 0) {
    return STATUS_WIFI_DISCONNECTED;
  }
  if (currentCarState != STOP) {
    return STATUS_MOVING;
  }
  return STATUS_CONNECTED_STANDBY;
}

// 1. Soft Breathing Pulse (Used when waiting for Wi-Fi client connection)
void renderBreathing(uint8_t r, uint8_t g, uint8_t b, unsigned long currentMillis) {
  float rad = (currentMillis % 2400) * (2.0 * PI / 2400.0);
  float factor = (sin(rad) + 1.0) / 2.0; // 0.0 to 1.0
  uint8_t red   = (uint8_t)(r * (0.12 + 0.88 * factor));
  uint8_t green = (uint8_t)(g * (0.12 + 0.88 * factor));
  uint8_t blue  = (uint8_t)(b * (0.12 + 0.88 * factor));
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, pixels.Color(red, green, blue));
  }
  pixels.show();
}

// 2. Solid Emerald Glow with subtle organic heartbeat (Connected & Ready)
void renderSolidWithHeartbeat(uint8_t r, uint8_t g, uint8_t b, unsigned long currentMillis) {
  unsigned long t = currentMillis % 3000;
  float factor = 1.0;
  if (t < 140) {
    factor = 1.0 + 0.40 * sin(t * PI / 140.0);
  } else if (t >= 240 && t < 380) {
    factor = 1.0 + 0.22 * sin((t - 240) * PI / 140.0);
  }
  uint8_t red   = (uint8_t)constrain((int)(r * factor), 0, 255);
  uint8_t green = (uint8_t)constrain((int)(g * factor), 0, 255);
  uint8_t blue  = (uint8_t)constrain((int)(b * factor), 0, 255);
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, pixels.Color(red, green, blue));
  }
  pixels.show();
}

// 3. Motion Wave / Comet Effect across 20 LEDs (Driving)
void renderMotionChase(uint8_t r, uint8_t g, uint8_t b, unsigned long currentMillis) {
  int head = (currentMillis / 45) % NUMPIXELS;
  for (int i = 0; i < NUMPIXELS; i++) {
    int dist = (head - i + NUMPIXELS) % NUMPIXELS;
    if (dist < 6) {
      float fade = 1.0 - (dist / 6.0);
      pixels.setPixelColor(i, pixels.Color((uint8_t)(r * fade), (uint8_t)(g * fade), (uint8_t)(b * fade)));
    } else {
      pixels.setPixelColor(i, pixels.Color(0, 15, 30)); // Soft background glow
    }
  }
  pixels.show();
}

// 4. Dual Emergency Strobe (Water = Red, Gas = Violet)
void renderEmergencyStrobe(uint8_t r, uint8_t g, uint8_t b, unsigned long currentMillis) {
  unsigned long t = currentMillis % 450;
  bool on = (t < 75) || (t >= 150 && t < 225);
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, on ? pixels.Color(r, g, b) : 0);
  }
  pixels.show();
}

// 5. Tactical Cylon / Larson Scanner (Autonomous Search Mode)
void renderLarsonScanner(uint8_t r, uint8_t g, uint8_t b, unsigned long currentMillis) {
  int span = NUMPIXELS * 2 - 2;
  int pos = (currentMillis / 55) % span;
  if (pos >= NUMPIXELS) {
    pos = span - pos;
  }
  for (int i = 0; i < NUMPIXELS; i++) {
    int dist = abs(i - pos);
    if (dist == 0) {
      pixels.setPixelColor(i, pixels.Color(r, g, b));
    } else if (dist == 1) {
      pixels.setPixelColor(i, pixels.Color(r / 3, g / 3, b / 3));
    } else if (dist == 2) {
      pixels.setPixelColor(i, pixels.Color(r / 10, g / 10, b / 10));
    } else {
      pixels.setPixelColor(i, 0);
    }
  }
  pixels.show();
}

// 6. Master Non-Blocking NeoPixel Loop (~40 FPS)
void updateNeoPixels() {
  unsigned long currentMillis = millis();
  static unsigned long lastUpdate = 0;
  if (currentMillis - lastUpdate < 25) {
    return;
  }
  lastUpdate = currentMillis;

  RobotStatus status = getSystemStatus();

  switch (status) {
    case STATUS_WATER_ACTIVE:
      renderEmergencyStrobe(255, 0, 0, currentMillis);        // Emergency Fire Engine Red Strobe
      break;

    case STATUS_SONIC_ACTIVE:
      renderEmergencyStrobe(190, 0, 255, currentMillis);      // High-Visibility Acoustic Violet/Purple Strobe
      break;

    case STATUS_AUTO_MODE:
      renderLarsonScanner(255, 140, 0, currentMillis);        // Amber / Gold Tactical Larson Scanner
      break;

    case STATUS_WIFI_DISCONNECTED:
      renderBreathing(0, 80, 255, currentMillis);             // Deep Royal Blue Breathing (Waiting for Wi-Fi Client)
      break;

    case STATUS_MOVING:
      renderMotionChase(0, 220, 255, currentMillis);          // Electric Cyan Traveling Comet Wave (Driving)
      break;

    case STATUS_CONNECTED_STANDBY:
    default:
      renderSolidWithHeartbeat(0, 255, 50, currentMillis);    // Emerald Green with Organic Heartbeat (Ready)
      break;
  }
}

// 7. Startup Boot Animation
void bootAnimation() {
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, pixels.Color(212, 165, 32)); // Luxury gold chase
    pixels.show();
    delay(20);
  }
  delay(100);
  setSolidColor(pixels.Color(0, 80, 255)); // Flash Royal Blue (Wi-Fi ready)
  delay(200);
  pixels.clear();
  pixels.show();
}


// ── Acoustic Fire Suppression Audio Engine (FreeRTOS Task on Core 0) ──
// Hardware: ESP32 DAC2 (GPIO 26) -> TPA3110 Power Amplifier -> Acoustic Extinguisher Speaker
// Features: Direct ESP32 DAC connection (NO RELAY) for instantaneous acoustic suppression
void taskAcousticOutput(void *pvParameters) {
  // Initialize DAC2 on GPIO 26 ONLY
  dac_output_enable(DAC_CHANNEL_2);
  dac_output_voltage(DAC_CHANNEL_2, 128); // Midpoint DC bias

  // Ensure DAC1 on GPIO 25 remains disconnected from DAC peripheral
  // NOTE: Never call rtc_gpio_deinit() here as it would unbind GPIO 25 from the LEDC PWM matrix!
  dac_output_disable(DAC_CHANNEL_1);

  // 1. Diagnostic Power-on Boot Chord: 523Hz (C5), 659Hz (E5), 784Hz (G5) ~160ms each
  const int chordFreqs[3] = {523, 659, 784};
  for (int note = 0; note < 3; note++) {
    int freq = chordFreqs[note];
    unsigned long noteStart = millis();
    float phase = 0.0f;
    float phaseInc = 2.0f * PI * freq / 8000.0f;
    while (millis() - noteStart < 160) {
      uint8_t sample = 128 + (int8_t)(sinf(phase) * (AUDIO_VOLUME * 0.45f));
      dac_output_voltage(DAC_CHANNEL_2, sample);
      phase += phaseInc;
      if (phase >= 2.0f * PI) phase -= 2.0f * PI;
      delayMicroseconds(125); // 8000 Hz sample rate
    }
  }
  // Park at midpoint standby bias
  dac_output_voltage(DAC_CHANNEL_2, 128);

  // 2. Synthesized Low-Frequency Acoustic Vortex Wave Loop (Acoustic Flame Extinction)
  unsigned long sampleIndex = 0;
  const float sampleRate = 8000.0f;

  while (true) {
    if (sonicWaveActive) {
      // Stream in 64-sample batches (~8ms of audio), then yield 1ms to FreeRTOS scheduler
      for (int i = 0; i < 64; i++) {
        if (!sonicWaveActive) break;

        float t = (float)sampleIndex / sampleRate;

        // Tuned Acoustic Vortex Fire-Extinguishing Synthesis:
        // GMU / DARPA Research on acoustic suppression shows 40-50 Hz produces the largest flame-thinning air vortex.
        // Fundamental (44 Hz) + 2nd harmonic (88 Hz) + 3rd harmonic (132 Hz)
        float wave = 0.65f * sinf(2.0f * PI * 44.0f * t)
                   + 0.25f * sinf(2.0f * PI * 88.0f * t)
                   + 0.10f * sinf(2.0f * PI * 132.0f * t);

        // Soft-saturation shaper: Boosts RMS acoustic energy by ~250% for maximum physical air displacement
        if (wave > 0.0f) {
          wave = 1.0f - expf(-1.8f * wave);
        } else {
          wave = -1.0f + expf(1.8f * wave);
        }

        // 8.5 Hz pulsating vortex envelope creates periodic toroidal air puffs that extinguish fire
        float envelope = 0.65f + 0.35f * sinf(2.0f * PI * 8.5f * t);
        float sampleFloat = wave * envelope * (float)AUDIO_VOLUME;

        int sampleInt = 128 + (int)sampleFloat;
        if (sampleInt < 2) sampleInt = 2;
        if (sampleInt > 254) sampleInt = 254;

        dac_output_voltage(DAC_CHANNEL_2, (uint8_t)sampleInt);

        sampleIndex++;
        if (sampleIndex >= 80000) { // Wrap every 10 seconds to maintain float precision
          sampleIndex = 0;
        }
        delayMicroseconds(125); // 8000 Hz sample rate (125 us)
      }
      vTaskDelay(pdMS_TO_TICKS(1)); // Yield to prevent Core 0 watchdog starvation
    } else {
      // STANDBY / OFF STATUS:
      // Clamp DAC at exact midpoint bias (128 = 1.65V).
      // AC capacitor on TPA3110 amplifier completely blocks DC: 0.00 V AC reaches speaker, 0 mA, zero heating!
      dac_output_voltage(DAC_CHANNEL_2, 128);
      sampleIndex = 0;
      vTaskDelay(pdMS_TO_TICKS(40));
    }
  }
}


// ── Ultrasonic Distance Read Function ──
long readUltrasonicDistanceCM() {
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  long duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 30000); // 30ms timeout (~5m max)
  if (duration == 0) return -1;
  return duration * 0.034 / 2;
}

// ── Motor Control via Dedicated LEDC PWM (No EnA/EnB, No Servo Timer Stealing) ──
void rotateMotor(int motorNumber, int motorDirection)
{
  // Apply Minimum Torque Deadband Clamp (avoids hum/stall below PWM 130)
  int speed = (currentSpeed > 0) ? map(constrain(currentSpeed, 1, 255), 1, 255, 135, 255) : 0;

  if (motorNumber == RIGHT_MOTOR)
  {
    if (motorDirection == FORWARD)
    {
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2,     CH_RM_IN2,     0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1,     CH_RM_IN1,     speed);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1_ALT, CH_RM_IN1_ALT, speed);
      Serial.printf("Right Motor: FORWARD on Pin %d & %d (PWM:%d)\n", RIGHT_MOTOR_IN1, RIGHT_MOTOR_IN1_ALT, speed);
    }
    else if (motorDirection == BACKWARD)
    {
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1,     CH_RM_IN1,     0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1_ALT, CH_RM_IN1_ALT, 0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2,     CH_RM_IN2,     speed);
      Serial.printf("Right Motor: BACKWARD on Pin %d (PWM:%d)\n", RIGHT_MOTOR_IN2, speed);
    }
    else
    {
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1,     CH_RM_IN1,     0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1_ALT, CH_RM_IN1_ALT, 0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2,     CH_RM_IN2,     0);
    }
  }
  else if (motorNumber == LEFT_MOTOR)
  {
    if (motorDirection == FORWARD)
    {
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2,     CH_LM_IN2,     0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2_ALT, CH_LM_IN2_ALT, 0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN1,     CH_LM_IN1,     speed);
      Serial.printf("Left Motor: FORWARD on Pin %d (PWM:%d)\n", LEFT_MOTOR_IN1, speed);
    }
    else if (motorDirection == BACKWARD)
    {
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN1,     CH_LM_IN1,     0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2,     CH_LM_IN2,     speed);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2_ALT, CH_LM_IN2_ALT, speed);
      Serial.printf("Left Motor: BACKWARD on Pins %d & %d (PWM:%d)\n", LEFT_MOTOR_IN2, LEFT_MOTOR_IN2_ALT, speed);
    }
    else
    {
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN1,     CH_LM_IN1,     0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2,     CH_LM_IN2,     0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2_ALT, CH_LM_IN2_ALT, 0);
    }
  }
}

void moveCar(int inputValue) {
  static int prevCarState = STOP;
  // Enforce shoot-through / brownout protection: 15ms stop dead-time when changing direction
  if (prevCarState != inputValue && prevCarState != STOP && inputValue != STOP) {
    rotateMotor(RIGHT_MOTOR, STOP);
    rotateMotor(LEFT_MOTOR, STOP);
    delay(15);
  }
  prevCarState = inputValue;

  currentCarState = inputValue;
  Serial.printf("Got value as %d (Speed: %d)\n", inputValue, currentSpeed);
  switch(inputValue) {
    case UP:
      rotateMotor(RIGHT_MOTOR, FORWARD);
      rotateMotor(LEFT_MOTOR, FORWARD);
      break;
    
    case DOWN:
      rotateMotor(RIGHT_MOTOR, BACKWARD);
      rotateMotor(LEFT_MOTOR, BACKWARD);
      break;
    
    case LEFT:
      rotateMotor(RIGHT_MOTOR, FORWARD);   // Turn Left
      rotateMotor(LEFT_MOTOR, BACKWARD);
      break;

    case RIGHT:
      rotateMotor(RIGHT_MOTOR, BACKWARD);  // Turn Right
      rotateMotor(LEFT_MOTOR, FORWARD);
      break;
        
    case STOP:
    default:
      rotateMotor(RIGHT_MOTOR, STOP);
      rotateMotor(LEFT_MOTOR, STOP);
      break;
  }
}



void handleRoot(AsyncWebServerRequest *request)
{
  request->send_P(200, "text/html", htmlHomePage);
}




void handleNotFound(AsyncWebServerRequest *request)
{
    request->send(404, "text/plain", "File Not Found");
}




void onCarInputWebSocketEvent(AsyncWebSocket *server,
                      AsyncWebSocketClient *client,
                      AwsEventType type,
                      void *arg,
                      uint8_t *data,
                      size_t len)
{                      
  switch (type)
  {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u disconnected\n", client->id());
      moveCar(STOP);
      analogWrite(LIGHT_PIN, 0);
      waterDirServo.write(90);
      ultrasonicServo.write(90);
      sonicDirServo.write(90);
      digitalWrite(RELAY2_PIN, LOW);
      sonicWaveActive = false;
      digitalWrite(RELAY_PIN, LOW);
      digitalWrite(AM_RELAY_PIN, LOW);
      break;
    case WS_EVT_DATA:
      AwsFrameInfo *info;
      info = (AwsFrameInfo*)arg;
      if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
      {
        std::string myData = "";
        myData.assign((char *)data, len);
        std::istringstream ss(myData);
        std::string key, value;
        std::getline(ss, key, ',');
        std::getline(ss, value, ',');
        Serial.printf("Key [%s] Value[%s]\n", key.c_str(), value.c_str());
        int valueInt = atoi(value.c_str());    
        if (key == "MoveCar")
        {
          moveCar(valueInt);        
        }
        else if (key == "Speed")
        {
          currentSpeed = valueInt;
          moveCar(currentCarState);
        }
        else if (key == "Light")
        {
          analogWrite(LIGHT_PIN, valueInt);          
        }
        else if (key == "Pan" || key == "WaterDir")
        {
          waterDirServo.write(valueInt);
          Serial.printf("Water Direction servo (GPIO %d) set to: %d deg\n", WATER_DIR_PIN, valueInt);
        }
        else if (key == "Tilt")
        {
          ultrasonicServo.write(valueInt);
          Serial.printf("Ultrasonic sweep servo (GPIO %d) set to: %d deg\n", ULTRASONIC_SERVO_PIN, valueInt);
        }
        else if (key == "CamTilt" || key == "SonicDir")
        {
          sonicDirServo.write(valueInt);
          Serial.printf("Sonic Direction servo (GPIO %d) set to: %d deg\n", SONIC_DIR_PIN, valueInt);
        }
        else if (key == "Relay2" || key == "Sonic" || key == "Amp")
        {
          // Direct ESP32 DAC2 Acoustic Extinguisher Cannon (TP3110 Power Amp on GPIO 26, NO RELAY!)
          sonicWaveActive = (valueInt == 1);
          Serial.printf("Sonic Wave Cannon: %s (Direct ESP32 DAC2 GPIO 26 -> TP3110 Amp, NO RELAY)\n", 
                        sonicWaveActive ? "ACTIVE [45Hz/90Hz FIRE EXTINCTION SOUND ON]" : "STANDBY [SILENT]");
        }
        else if (key == "Relay")
        {
          digitalWrite(RELAY_PIN, valueInt == 1 ? HIGH : LOW);
          Serial.printf("Water Cannon Relay (GPIO %d): %s\n", RELAY_PIN, valueInt == 1 ? "HIGH (ON)" : "LOW (OFF)");
        }
        else if (key == "AMRelay")
        {
          // Mode Selector at top of webpage:
          // Clicking Automatic Mode -> Turns ON Relay 17!
          // Clicking Manual Mode    -> Turns OFF Relay 17!
          bool isAuto = (valueInt == 1);
          digitalWrite(AUTO_RELAY_PIN, isAuto ? HIGH : LOW);
          digitalWrite(AM_RELAY_PIN,   isAuto ? HIGH : LOW);
          Serial.printf("Mode Switch: %s -> Relay 17 (GPIO %d) set to %s\n", 
                        isAuto ? "AUTOMATIC MODE" : "MANUAL MODE", 
                        AUTO_RELAY_PIN, 
                        isAuto ? "HIGH (RELAY 17 ON)" : "LOW (RELAY 17 OFF)");
        }              
      }
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
    default:
      break;  
  }
}




void setUpPinModes()
{
  // Allow ESP32PWM to allocate Timers 0 & 1 for Servos (keeps Timers 2 & 3 dedicated for motors)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);

  // Initialize servos first
  Serial.println("Initializing directional and sweep servos...");
  waterDirServo.attach(WATER_DIR_PIN);
  sonicDirServo.attach(SONIC_DIR_PIN);
  ultrasonicServo.attach(ULTRASONIC_SERVO_PIN);
 
  // Set servos to default positions (90 deg center for nozzles & acoustic cannon, 90 deg for sonar sweep)
  waterDirServo.write(90);
  sonicDirServo.write(90);
  ultrasonicServo.write(90);
  delay(300); // Give servos time to reach position
  Serial.println("Servos initialized successfully (WaterDir=90, SonicDir=90, SonarSweep=90)");
 
  // ── Motor Setup via Dedicated LEDC PWM Channels ──
  // 1. Explicitly detach DAC1 from GPIO 25 so it can output digital PWM
  dac_output_disable(DAC_CHANNEL_1);

  // 2. Set digital pin modes with maximum 40mA drive capability
  pinMode(RIGHT_MOTOR_IN1,     OUTPUT);
  pinMode(RIGHT_MOTOR_IN1_ALT, OUTPUT);
  pinMode(RIGHT_MOTOR_IN2,     OUTPUT);
  pinMode(LEFT_MOTOR_IN1,      OUTPUT);
  pinMode(LEFT_MOTOR_IN2,      OUTPUT);
  pinMode(LEFT_MOTOR_IN2_ALT,  OUTPUT);

  gpio_set_drive_capability((gpio_num_t)RIGHT_MOTOR_IN1,     GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)RIGHT_MOTOR_IN1_ALT, GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)RIGHT_MOTOR_IN2,     GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)LEFT_MOTOR_IN1,      GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)LEFT_MOTOR_IN2,      GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)LEFT_MOTOR_IN2_ALT,  GPIO_DRIVE_CAP_3);

  // 3. Attach Dedicated Low-Speed LEDC PWM Channels directly (Zero Servo Timer Interference)
  MOTOR_PWM_ATTACH(RIGHT_MOTOR_IN1,     CH_RM_IN1,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(RIGHT_MOTOR_IN1_ALT, CH_RM_IN1_ALT, MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(RIGHT_MOTOR_IN2,     CH_RM_IN2,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(LEFT_MOTOR_IN1,      CH_LM_IN1,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(LEFT_MOTOR_IN2,      CH_LM_IN2,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(LEFT_MOTOR_IN2_ALT,  CH_LM_IN2_ALT, MOTOR_PWM_FREQ, MOTOR_PWM_RES);

  // 4. Ensure all motor outputs start at 0 (Off)
  MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1,     CH_RM_IN1,     0);
  MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1_ALT, CH_RM_IN1_ALT, 0);
  MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2,     CH_RM_IN2,     0);
  MOTOR_PWM_WRITE(LEFT_MOTOR_IN1,      CH_LM_IN1,     0);
  MOTOR_PWM_WRITE(LEFT_MOTOR_IN2,      CH_LM_IN2,     0);
  MOTOR_PWM_WRITE(LEFT_MOTOR_IN2_ALT,  CH_LM_IN2_ALT, 0);

  moveCar(STOP);
  Serial.println("Motor pins initialized (Low-Speed LEDC Channels 8-13; Zero Servo Conflict; 40mA max drive)");

  // Setup light pin
  pinMode(LIGHT_PIN, OUTPUT);    
  digitalWrite(LIGHT_PIN, LOW);

  // Setup Ultrasonic Sensor pins
  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  Serial.println("Ultrasonic pins initialized (TRIG=5, ECHO=18)");

  // Setup OLED I2C bus (SDA=21, SCL=22)
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  Serial.println("I2C bus initialized for OLED (SDA=21, SCL=22)");

  // Setup relay pins
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  Serial.printf("Water Relay pin %d initialized (LOW/OFF)\n", RELAY_PIN);

  pinMode(AUTO_RELAY_PIN, OUTPUT);
  digitalWrite(AUTO_RELAY_PIN, LOW);
  Serial.printf("Auto Mode Relay pin %d initialized (LOW/OFF)\n", AUTO_RELAY_PIN);

  pinMode(AM_RELAY_PIN, OUTPUT);
  digitalWrite(AM_RELAY_PIN, LOW);
  Serial.printf("Secondary Auto Mode Relay pin %d initialized (LOW/OFF)\n", AM_RELAY_PIN);

  // Setup NeoPixel pin
  pinMode(NEOPIXEL_PIN, OUTPUT);
  Serial.printf("NeoPixel pin %d initialized\n", NEOPIXEL_PIN);

  Serial.println("All pins initialized successfully");
}




void setup(void)
{
  Serial.begin(115200);  // Enable serial communication
  Serial.println("\n\n=== ESP32 Robot Starting ===");
 
  setUpPinModes();
 
  // Initialize NeoPixels with professional startup animation
  pixels.begin();
  pixels.setBrightness(180);
  bootAnimation();
  Serial.println("NeoPixels online - Running Professional Status Engine");
 
  // Setup WiFi Access Point
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  // Setup web server
  server.on("/", HTTP_GET, handleRoot);
  server.on("/favicon.ico", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(204); // Silently succeed without 404
  });
  server.onNotFound(handleNotFound);
   
  wsCarInput.onEvent(onCarInputWebSocketEvent);
  server.addHandler(&wsCarInput);
  server.begin();
  Serial.println("HTTP server started");

  // Start Acoustic Fire Suppression Engine on Core 0 (Priority 2, 4096-byte stack)
  xTaskCreatePinnedToCore(
    taskAcousticOutput,
    "taskAcousticOutput",
    4096,
    NULL,
    2,
    &audioTaskHandle,
    0
  );
  Serial.println("Acoustic Audio Engine online (Pinned to Core 0, DAC2 GPIO 26)");

  Serial.println("=== Setup Complete ===\n");
}




void loop()
{
  wsCarInput.cleanupClients();
  updateNeoPixels();
}
