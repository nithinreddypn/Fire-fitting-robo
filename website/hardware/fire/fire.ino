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
#include "robot_status.h"

// ── Motor Pins (PWM on IN pins directly, EnA & EnB removed) ──
#define RIGHT_MOTOR_IN1 14  // Right Motor IN1 (PWM Forward)
#define RIGHT_MOTOR_IN2 27  // Right Motor IN2 (PWM Backward)
#define LEFT_MOTOR_IN1  19  // Left Motor IN1  (PWM Forward) - Moved from 26 to free DAC2 for Acoustic Audio
#define LEFT_MOTOR_IN2  25  // Left Motor IN2  (PWM Backward)

// ── Acoustic Audio Cannon (TPA3116D2 + 8Ω 0.5W Speaker) ──
#define DAC_AUDIO_PIN   26  // ESP32 DAC2 (GPIO 26) -> TPA3116D2 Audio IN
#define AUDIO_VOLUME    55  // Dynamic range clamp (safe level for 8Ω 0.5W speaker; 3-layer protection)
volatile bool sonicWaveActive = false;
TaskHandle_t audioTaskHandle = NULL;

// ── Ultrasonic Sensor Pins ──
#define ULTRASONIC_TRIG_PIN 5   // Ultrasonic TRIG
#define ULTRASONIC_ECHO_PIN 18  // Ultrasonic ECHO

// ── Servos ──
#define ULTRASONIC_SERVO_PIN 13  // Ultrasonic Sweep Servo
#define PAN_PIN              32  // Camera Pan Servo
#define CAM_TILT_PIN         33  // Camera Tilt Servo

Servo camTiltServo;
Servo panServo;
Servo ultrasonicServo;

// ── OLED Display (I2C) Pins ──
#define OLED_SDA_PIN 21
#define OLED_SCL_PIN 22

// ── Lighting & Relays ──
#define LIGHT_PIN 4
#define RELAY2_PIN 17    // Sonic Wave Suppressor Relay (formerly Gas/CO2)
#define RELAY_PIN 16     // Water Relay (moved from 32 to avoid conflict with Pan Servo)
#define AM_RELAY_PIN 15  // Auto Mode Relay (moved from 33 to avoid conflict with Tilt Servo)

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
  if (digitalRead(RELAY_PIN) == HIGH) {
    return STATUS_WATER_ACTIVE;
  }
  if (digitalRead(RELAY2_PIN) == HIGH || sonicWaveActive) {
    return STATUS_SONIC_ACTIVE;
  }
  if (digitalRead(AM_RELAY_PIN) == HIGH) {
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
// Hardware: ESP32 DAC2 (GPIO 26) -> TPA3116D2 Amplifier -> 8Ω 0.5W Speaker
// 3-Layer Speaker Protection:
//   1. Software Dynamic Range Clamping (AUDIO_VOLUME = 55 peak-to-peak)
//   2. Hardware Potentiometer Attenuation (recommended 25%-40% gain)
//   3. Zero DC Standby Heating: DAC parked at 128 bias (1.65V DC). AC-coupling cap blocks DC entirely (0.00V AC, 0 mA)
void taskAcousticOutput(void *pvParameters) {
  // Initialize DAC2 on GPIO 26
  dac_output_enable(DAC_CHANNEL_2);
  dac_output_voltage(DAC_CHANNEL_2, 128); // Midpoint DC bias

  // 1. Diagnostic Power-on Boot Chord: 523Hz (C5), 659Hz (E5), 784Hz (G5) ~160ms each
  const int chordFreqs[3] = {523, 659, 784};
  for (int note = 0; note < 3; note++) {
    int freq = chordFreqs[note];
    unsigned long noteStart = millis();
    float phase = 0.0f;
    float phaseInc = 2.0f * PI * freq / 8000.0f;
    while (millis() - noteStart < 160) {
      uint8_t sample = 128 + (int8_t)(sinf(phase) * (AUDIO_VOLUME * 0.65f));
      dac_output_voltage(DAC_CHANNEL_2, sample);
      phase += phaseInc;
      if (phase >= 2.0f * PI) phase -= 2.0f * PI;
      delayMicroseconds(125); // 8000 Hz sample rate
    }
  }
  // Park at midpoint standby bias
  dac_output_voltage(DAC_CHANNEL_2, 128);

  // 2. Synthesized Low-Frequency Acoustic Wave Loop
  unsigned long sampleIndex = 0;
  const float sampleRate = 8000.0f;

  while (true) {
    if (sonicWaveActive) {
      // Stream in 64-sample batches (~8ms of audio), then yield 1ms to FreeRTOS scheduler
      for (int i = 0; i < 64; i++) {
        if (!sonicWaveActive) break;

        float t = (float)sampleIndex / sampleRate;

        // Multi-Harmonic Vortex Synthesis:
        // Fundamental (120 Hz) + 2nd Harmonic (240 Hz) + 3rd Harmonic (360 Hz)
        // Modulated by a 10 Hz amplitude envelope for flame boundary layer vortex shedding
        float wave = 0.55f * sinf(2.0f * PI * 120.0f * t)
                   + 0.30f * sinf(2.0f * PI * 240.0f * t)
                   + 0.15f * sinf(2.0f * PI * 360.0f * t);

        float envelope = 0.75f + 0.25f * sinf(2.0f * PI * 10.0f * t);
        float sampleFloat = wave * envelope * (float)AUDIO_VOLUME;

        int sampleInt = 128 + (int)sampleFloat;
        if (sampleInt < 0) sampleInt = 0;
        if (sampleInt > 255) sampleInt = 255;

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
      // AC capacitor on amplifier completely blocks DC: 0.00 V AC reaches speaker, 0 mA, zero heating!
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

// ── Motor Control via Direct PWM on IN pins (No EnA/EnB) ──
void rotateMotor(int motorNumber, int motorDirection)
{
  if (motorNumber == RIGHT_MOTOR)
  {
    if (motorDirection == FORWARD)
    {
      digitalWrite(RIGHT_MOTOR_IN2, LOW);
      analogWrite(RIGHT_MOTOR_IN1, currentSpeed);
      Serial.printf("Right Motor: FORWARD on Pin %d (PWM:%d), Pin %d LOW\n", RIGHT_MOTOR_IN1, currentSpeed, RIGHT_MOTOR_IN2);
    }
    else if (motorDirection == BACKWARD)
    {
      digitalWrite(RIGHT_MOTOR_IN1, LOW);
      analogWrite(RIGHT_MOTOR_IN2, currentSpeed);
      Serial.printf("Right Motor: BACKWARD on Pin %d (PWM:%d), Pin %d LOW\n", RIGHT_MOTOR_IN2, currentSpeed, RIGHT_MOTOR_IN1);
    }
    else
    {
      analogWrite(RIGHT_MOTOR_IN1, 0);
      analogWrite(RIGHT_MOTOR_IN2, 0);
      digitalWrite(RIGHT_MOTOR_IN1, LOW);
      digitalWrite(RIGHT_MOTOR_IN2, LOW);
    }
  }
  else if (motorNumber == LEFT_MOTOR)
  {
    if (motorDirection == FORWARD)
    {
      digitalWrite(LEFT_MOTOR_IN2, LOW);
      analogWrite(LEFT_MOTOR_IN1, currentSpeed);
      Serial.printf("Left Motor: FORWARD on Pin %d (PWM:%d), Pin %d LOW\n", LEFT_MOTOR_IN1, currentSpeed, LEFT_MOTOR_IN2);
    }
    else if (motorDirection == BACKWARD)
    {
      digitalWrite(LEFT_MOTOR_IN1, LOW);
      analogWrite(LEFT_MOTOR_IN2, currentSpeed);
      Serial.printf("Left Motor: BACKWARD on Pin %d (PWM:%d), Pin %d LOW\n", LEFT_MOTOR_IN2, currentSpeed, LEFT_MOTOR_IN1);
    }
    else
    {
      analogWrite(LEFT_MOTOR_IN1, 0);
      analogWrite(LEFT_MOTOR_IN2, 0);
      digitalWrite(LEFT_MOTOR_IN1, LOW);
      digitalWrite(LEFT_MOTOR_IN2, LOW);
    }
  }
}

void moveCar(int inputValue) {
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
      panServo.write(15);
      ultrasonicServo.write(45);
      camTiltServo.write(106);
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
        else if (key == "Pan")
        {
          panServo.write(valueInt);
          Serial.printf("Pan servo set to: %d\n", valueInt);
        }
        else if (key == "Tilt")
        {
          ultrasonicServo.write(valueInt);
          Serial.printf("Ultrasonic sweep servo set to: %d\n", valueInt);
        }
        else if (key == "CamTilt")
        {
          camTiltServo.write(valueInt);
          Serial.printf("CamTilt servo set to: %d\n", valueInt);
        }
        else if (key == "Relay2")
        {
          sonicWaveActive = (valueInt == 1);
          digitalWrite(RELAY2_PIN, valueInt == 1 ? HIGH : LOW);
          Serial.printf("Sonic Wave Cannon: %s (Relay %d & DAC2 Acoustic Engine)\n", sonicWaveActive ? "ACTIVE" : "STANDBY", RELAY2_PIN);
        }
        else if (key == "Relay")
        {
          digitalWrite(RELAY_PIN, valueInt == 1 ? HIGH : LOW);
        }
        else if (key == "AMRelay")
        {
          digitalWrite(AM_RELAY_PIN, valueInt == 1 ? HIGH : LOW);
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
  // Initialize servos first
  Serial.println("Initializing servos...");
  panServo.attach(PAN_PIN);
  camTiltServo.attach(CAM_TILT_PIN);
  ultrasonicServo.attach(ULTRASONIC_SERVO_PIN);
 
  // Set servos to default positions
  panServo.write(15);
  camTiltServo.write(106);
  ultrasonicServo.write(45);
  delay(300); // Give servos time to reach position
  Serial.println("Servos initialized successfully");
 
  // Setup Motor Pins as OUTPUT explicitly
  pinMode(RIGHT_MOTOR_IN1, OUTPUT);
  pinMode(RIGHT_MOTOR_IN2, OUTPUT);
  pinMode(LEFT_MOTOR_IN1,  OUTPUT);
  pinMode(LEFT_MOTOR_IN2,  OUTPUT);

  digitalWrite(RIGHT_MOTOR_IN1, LOW);
  digitalWrite(RIGHT_MOTOR_IN2, LOW);
  digitalWrite(LEFT_MOTOR_IN1,  LOW);
  digitalWrite(LEFT_MOTOR_IN2,  LOW);

  moveCar(STOP);
  Serial.println("Motor pins initialized (analogWrite PWM, No EnA/EnB)");

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
  Serial.printf("Water Relay pin %d initialized\n", RELAY_PIN);
 
  pinMode(AM_RELAY_PIN, OUTPUT);
  digitalWrite(AM_RELAY_PIN, LOW);
  Serial.printf("AM Relay pin %d initialized\n", AM_RELAY_PIN);

  pinMode(RELAY2_PIN, OUTPUT);
  digitalWrite(RELAY2_PIN, LOW);
  Serial.printf("RELAY2 (Sonic Wave) pin %d initialized\n", RELAY2_PIN);

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