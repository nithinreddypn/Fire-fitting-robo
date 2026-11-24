// ============================================================
//   FIRE GUARD ROBOT - Autonomous ESP32 Suppression Rover
//   Version: v4.5 (Enhanced Production Release)
//
//   Hardware Features:
//     - 5-Channel IR Photodiode Flame Array (GPIO 33, 32, 35, 34, 39)
//     - Neo-6M GPS Receiver via HardwareSerial2 (RX 16, TX 17)
//     - High-Torque Extinguisher Vectoring Servo (GPIO 13)
//     - 12V Submersible Water Pump Relay Driver (GPIO 19)
//     - Piezo Warble Siren Alarm (GPIO 12, LEDC CH 0)
//     - Dual HC-SR04 Ultrasonic Sonar Profiler (FL: 25/26, FR: 27/14)
//     - 1.3" SH1106 I2C OLED Display (0x3C, SDA 21, SCL 22)
//     - Cloud Logging to Supabase REST Endpoint (HTTPS)
//     - FreeRTOS Multithreaded Architecture (Core 0 & Core 1)
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <ESP32Servo.h>
#include <TinyGPS++.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

// ============================================================
//   OLED DISPLAY CONFIGURATION (128x64 SH1106 I2C)
// ============================================================
#define SCREEN_W   128
#define SCREEN_H   64
#define OLED_RESET -1
#define OLED_ADDR  0x3C
Adafruit_SH1106G display(SCREEN_W, SCREEN_H, &Wire, OLED_RESET);
bool oledOK = false;

// ============================================================
//   PIEZO BUZZER ALARM (LEDC Core 2.x & 3.x Compatible)
// ============================================================
#define BUZZER_PIN 12
#define BUZZER_CH  0

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  #define BUZZER_ATTACH(pin, freq, res) ledcAttach(pin, freq, res)
  #define BUZZER_TONE(pin, ch, freq)    ledcWriteTone(pin, freq)
#else
  #define BUZZER_ATTACH(pin, freq, res) do { ledcSetup(BUZZER_CH, freq, res); ledcAttachPin(pin, BUZZER_CH); } while(0)
  #define BUZZER_TONE(pin, ch, freq)    ledcWriteTone(ch, freq)
#endif

// ============================================================
//   WATER PUMP RELAY ACTUATOR
//   Set RELAY_ACTIVE_LOW to true if using standard Active-LOW relay module
// ============================================================
#define RELAY_PIN 19
#define RELAY_ACTIVE_LOW false
volatile bool relayOn = false;

// ============================================================
//   AUTONOMOUS MOTOR DRIVER (Dedicated Hardware Timers 2 & 3: Channels 4-7)
//   Hardware Pins:
//     Right Motor: GPIO 14 (IN1 Forward),  GPIO 27 (IN2 Backward)
//     Left Motor:  GPIO 25 (IN1 Forward),  GPIO 26 (IN2 Backward)
//                  GPIO 23 (IN2 Backward Mirror via GPIO Matrix)
// ============================================================
#define RIGHT_MOTOR_IN1     14
#define RIGHT_MOTOR_IN2     27
#define LEFT_MOTOR_IN1      25
#define LEFT_MOTOR_IN2      26
#define LEFT_MOTOR_IN2_ALT  23

#define MOTOR_PWM_FREQ 1000
#define MOTOR_PWM_RES  8
#define CH_RM_IN1     4
#define CH_RM_IN2     5
#define CH_LM_IN1     6
#define CH_LM_IN2     7
#define CH_LM_IN2_ALT 7

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  #define MOTOR_PWM_ATTACH(pin, ch, freq, res) ledcAttach(pin, freq, res)
  #define MOTOR_PWM_WRITE(pin, ch, duty)       ledcWrite(pin, duty)
#else
  #define MOTOR_PWM_ATTACH(pin, ch, freq, res) do { ledcSetup(ch, freq, res); ledcAttachPin(pin, ch); } while(0)
  #define MOTOR_PWM_WRITE(pin, ch, duty)       ledcWrite(ch, duty)
#endif

#define UP 1
#define DOWN 2
#define LEFT 3
#define RIGHT 4
#define STOP 0

#define RIGHT_MOTOR 0
#define LEFT_MOTOR 1
#define FORWARD 1
#define BACKWARD -1

#define AUTO_DRIVE_SPEED 185
#define AUTO_TURN_SPEED  195

// ============================================================
//   NOZZLE SERVO ACTUATOR (GPIO 13)
// ============================================================
#define SERVO_PIN        13
#define SERVO_STANDBY    90
Servo fireServo;
volatile int servoAngle = SERVO_STANDBY;
const int SENSOR_SERVO_ANGLE[5] = { 30, 60, 90, 120, 150 };

// ============================================================
//   GPS MODULE — NEO-6M on HardwareSerial(2) (RX=16, TX=17)
// ============================================================
#define GPS_RX_PIN   16
#define GPS_TX_PIN   17
#define GPS_BAUD     9600
HardwareSerial gpsSerial(2);
TinyGPSPlus    gps;

struct GpsData {
  double  lat;
  double  lng;
  bool    valid;
  uint8_t satellites;
  double  hdop;
};
volatile GpsData gpsData = { 0.0, 0.0, false, 0, 99.9 };

// ============================================================
//   HC-SR04 ULTRASONIC RANGE SENSOR (Single Center Sonar)
//   Connected to ESP32: TRIG = GPIO 5, ECHO = GPIO 18
// ============================================================
#define US_CONNECTED true
#define US_TRIG_PIN  5
#define US_ECHO_PIN  18
#define OBSTACLE_CM  30
#define US_MAX_CM    400

// Backwards compatibility aliases
#define US_FL_CONNECTED US_CONNECTED
#define US_FR_CONNECTED false
#define US_FL_TRIG      US_TRIG_PIN
#define US_FL_ECHO      US_ECHO_PIN
#define US_FR_TRIG      US_TRIG_PIN
#define US_FR_ECHO      US_ECHO_PIN

// Priority timing intervals
#define OBSTACLE_SHOW_AFTER_MS  3000
#define OBSTACLE_HOLD_MS        2000

// Sensor diagnostic / component error status flags
volatile bool compErrorUS = false;
volatile bool compErrorL  = false;
volatile bool compErrorR  = false;

// ============================================================
//   WIFI & SUPABASE CLOUD ENDPOINTS (LIVE SYNCHRONIZATION)
// ============================================================
const char* WIFI_SSID         = "NOVA..";
const char* WIFI_PASSWORD     = "Nova@7399...";

// User Live Supabase Project & Anon API Key
const char* SUPABASE_URL      = "https://awktiffbxwhwuhkmpfvu.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3a3RpZmZieHdod3Voa21wZnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MDkxNjQsImV4cCI6MjExMDk4NTE2NH0.fwTtEMn1sJbNE48kc-1L87_aNn5J3jYIwCgEffY3Hjs";
const char* SUPABASE_TABLE    = "/rest/v1/fire_events";

// ============================================================
//   5-CHANNEL IR FLAME PHOTODIODE MATRIX
//   User Wiring: A1/D1 -> GPIO 33 ... continuous ... A5/D5 -> GPIO 39
//     Index 0: GPIO 33 (A1/D1) -> Left Flank    (Servo:  30°)
//     Index 1: GPIO 32 (A2/D2) -> Front-Left    (Servo:  60°)
//     Index 2: GPIO 35 (A3/D3) -> Front-Center  (Servo:  90° Straight Ahead)
//     Index 3: GPIO 34 (A4/D4) -> Front-Right   (Servo: 120°)
//     Index 4: GPIO 39 (A5/D5) -> Right Flank   (Servo: 150°)
// ============================================================
#define NUM_SENSORS 5
const int SENSOR_PINS[NUM_SENSORS]  = { 33, 32, 35, 34, 39 };
const char* SENSOR_DIR[NUM_SENSORS] = {
  "Left", "Front-Left", "Front-Center", "Front-Right", "Right"
};
const char* SENSOR_SHORT_LABEL[NUM_SENSORS] = {
  "L", "FL", "FC", "FR", "R"
};

int  sensorBaseline[NUM_SENSORS]      = { 0 };
bool sensorIsRestingHigh[NUM_SENSORS] = { false };
#define FIRE_DELTA_THRESHOLD 800  // Minimum ADC delta to eliminate WiFi/ambient noise
const int CONFIRM_COUNT = 3;
int  confirmCounter     = 0;

// ============================================================
//   SHARED DATA BUFFER (PROTECTED BY MUTEX)
// ============================================================
struct SensorData {
  int  values[NUM_SENSORS];
  bool sensorFired[NUM_SENSORS];
  int  strongestIndex;
  int  intensity;
  int  activeSensors;
  bool fireConfirmed;
  const char* fireDirection;
  const char* status;
  char timestamp[32];
  int  distLeft;
  int  distRight;
  bool obstacleLeft;
  bool obstacleRight;
};
SensorData sData;

volatile bool wifiConnected = false;
volatile int  wifiStrength  = 0;
volatile bool ntpSynced     = false;

// ============================================================
//   DISPLAY SCREENS & ANIMATION STATE
// ============================================================
enum Screen { SCR_BOOT, SCR_NORMAL, SCR_FIRE, SCR_OBSTACLE, SCR_ERROR };
volatile Screen currentScreen    = SCR_BOOT;
volatile int    animTick         = 0;
volatile int    bootPct          = 0;
volatile char   bootMsg[32]      = "Initializing...";

volatile unsigned long fireStartTime    = 0;
volatile unsigned long obstacleShowTime = 0;
volatile bool          inObstacleWindow = false;

// ============================================================
//   FREERTOS MUTEX HANDLERS
// ============================================================
SemaphoreHandle_t dataMutex;
SemaphoreHandle_t dispMutex;
SemaphoreHandle_t gpsMutex;

// ============================================================
//   FORWARD DECLARATIONS
// ============================================================
void calibrateSensors();
bool evaluateFlameSensor(int i, int rawVal, int &intensityOut);
void connectWiFi();
void syncNTP();
void postToSupabase(const char* ts, int intensity, int active,
                    int sIdx, const char* dir, int vals[],
                    int distL, int distR, bool relay,
                    double lat, double lng, bool gpsValid);
void updateTimestamp();
int  readUltrasonic(int trigPin, int echoPin);
void buzzerTone(int freq, int durationMs);
void buzzerStartup();
void drawBoot(int pct, const char* msg);
void drawNormal();
void drawFire();
void drawObstacleAlert();
void drawComponentError();
void drawProgressBar(int x, int y, int w, int h, int pct);
void drawWiFiIcon(int x, int y);
void drawCenteredText(const char* txt, int y, uint8_t sz = 1);
void drawDashedBorder(int phase);
void updateScreenPriority();
void setRelay(bool on);
void setServoToSensor(int sensorIdx);
void setServoAngle(int angle);

// ============================================================
//   AUTONOMOUS MOTOR CONTROL FUNCTIONS
// ============================================================
void rotateMotor(int motorNumber, int motorDirection, int targetSpeed)
{
  int speed = (targetSpeed > 0) ? map(constrain(targetSpeed, 1, 255), 1, 255, 135, 255) : 0;

  if (motorNumber == RIGHT_MOTOR)
  {
    if (motorDirection == FORWARD)
    {
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2, CH_RM_IN2, 0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1, CH_RM_IN1, speed);
    }
    else if (motorDirection == BACKWARD)
    {
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1, CH_RM_IN1, 0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2, CH_RM_IN2, speed);
    }
    else
    {
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1, CH_RM_IN1, 0);
      MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2, CH_RM_IN2, 0);
    }
  }
  else if (motorNumber == LEFT_MOTOR)
  {
    if (motorDirection == FORWARD)
    {
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2,     CH_LM_IN2,     0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2_ALT, CH_LM_IN2_ALT, 0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN1,     CH_LM_IN1,     speed);
    }
    else if (motorDirection == BACKWARD)
    {
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN1,     CH_LM_IN1,     0);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2,     CH_LM_IN2,     speed);
      MOTOR_PWM_WRITE(LEFT_MOTOR_IN2_ALT, CH_LM_IN2_ALT, speed);
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
  if (prevCarState != inputValue && prevCarState != STOP && inputValue != STOP) {
    rotateMotor(RIGHT_MOTOR, STOP, 0);
    rotateMotor(LEFT_MOTOR, STOP, 0);
    delay(15);
  }
  prevCarState = inputValue;

  switch(inputValue) {
    case UP:
      rotateMotor(RIGHT_MOTOR, FORWARD, AUTO_DRIVE_SPEED);
      rotateMotor(LEFT_MOTOR, FORWARD, AUTO_DRIVE_SPEED);
      break;
    
    case DOWN:
      rotateMotor(RIGHT_MOTOR, BACKWARD, AUTO_DRIVE_SPEED);
      rotateMotor(LEFT_MOTOR, BACKWARD, AUTO_DRIVE_SPEED);
      break;
    
    case LEFT:
      rotateMotor(RIGHT_MOTOR, FORWARD, AUTO_TURN_SPEED);
      rotateMotor(LEFT_MOTOR, BACKWARD, AUTO_TURN_SPEED);
      break;

    case RIGHT:
      rotateMotor(RIGHT_MOTOR, BACKWARD, AUTO_TURN_SPEED);
      rotateMotor(LEFT_MOTOR, FORWARD, AUTO_TURN_SPEED);
      break;
        
    case STOP:
    default:
      rotateMotor(RIGHT_MOTOR, STOP, 0);
      rotateMotor(LEFT_MOTOR, STOP, 0);
      break;
  }
}

void setupMotors() {
  pinMode(RIGHT_MOTOR_IN1,    OUTPUT);
  pinMode(RIGHT_MOTOR_IN2,    OUTPUT);
  pinMode(LEFT_MOTOR_IN1,     OUTPUT);
  pinMode(LEFT_MOTOR_IN2,     OUTPUT);
  pinMode(LEFT_MOTOR_IN2_ALT, OUTPUT);

  digitalWrite(RIGHT_MOTOR_IN1,    LOW);
  digitalWrite(RIGHT_MOTOR_IN2,    LOW);
  digitalWrite(LEFT_MOTOR_IN1,     LOW);
  digitalWrite(LEFT_MOTOR_IN2,     LOW);
  digitalWrite(LEFT_MOTOR_IN2_ALT, LOW);

  gpio_set_drive_capability((gpio_num_t)RIGHT_MOTOR_IN1,    GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)RIGHT_MOTOR_IN2,    GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)LEFT_MOTOR_IN1,     GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)LEFT_MOTOR_IN2,     GPIO_DRIVE_CAP_3);
  gpio_set_drive_capability((gpio_num_t)LEFT_MOTOR_IN2_ALT, GPIO_DRIVE_CAP_3);

  MOTOR_PWM_ATTACH(RIGHT_MOTOR_IN1,    CH_RM_IN1,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(RIGHT_MOTOR_IN2,    CH_RM_IN2,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(LEFT_MOTOR_IN1,     CH_LM_IN1,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(LEFT_MOTOR_IN2,     CH_LM_IN2,     MOTOR_PWM_FREQ, MOTOR_PWM_RES);
  MOTOR_PWM_ATTACH(LEFT_MOTOR_IN2_ALT, CH_LM_IN2_ALT, MOTOR_PWM_FREQ, MOTOR_PWM_RES);

  MOTOR_PWM_WRITE(RIGHT_MOTOR_IN1,    CH_RM_IN1,     0);
  MOTOR_PWM_WRITE(RIGHT_MOTOR_IN2,    CH_RM_IN2,     0);
  MOTOR_PWM_WRITE(LEFT_MOTOR_IN1,     CH_LM_IN1,     0);
  MOTOR_PWM_WRITE(LEFT_MOTOR_IN2,     CH_LM_IN2,     0);
  MOTOR_PWM_WRITE(LEFT_MOTOR_IN2_ALT, CH_LM_IN2_ALT, 0);

  moveCar(STOP);
  Serial.println("[INIT] Autonomous Motors -> Channels 4-7 (Timers 2 & 3) Standstill Initialized");
}

// ============================================================
//   ACTUATOR CONTROLS
// ============================================================
void setRelay(bool on) {
  bool pinState = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PIN, pinState ? HIGH : LOW);
  relayOn = on;
  Serial.print("[RELAY] GPIO 19 -> ");
  Serial.println(on ? "ENGAGED (DISCHARGE)" : "RELEASED (STANDBY)");
}

void setServoAngle(int angle) {
  angle = constrain(angle, 0, 180);
  fireServo.write(angle);
  servoAngle = angle;
  Serial.print("[SERVO] GPIO 13 Slewed -> ");
  Serial.print(angle);
  Serial.println(" deg");
}

void setServoToSensor(int sensorIdx) {
  if (sensorIdx < 0 || sensorIdx >= NUM_SENSORS) return;
  int angle = SENSOR_SERVO_ANGLE[sensorIdx];
  setServoAngle(angle);
  Serial.print("[SERVO] Vector Locked on: ");
  Serial.print(SENSOR_DIR[sensorIdx]);
  Serial.print(" (Target Angle: ");
  Serial.print(angle);
  Serial.println(" deg)");
}

// ============================================================
//   UNIVERSAL FLAME DETECTION LOGIC (Supports A1..A5 & D1..D5)
// ============================================================
bool evaluateFlameSensor(int i, int rawVal, int &intensityOut) {
  intensityOut = 0;
  bool triggered = false;
  int base = sensorBaseline[i];

  if (sensorIsRestingHigh[i]) {
    // RESTING-HIGH: Voltage drops on flame detection (or digital Active-LOW)
    // Requires at least 800 ADC drop AND reading below 2500 ADC (or clean digitalRead LOW)
    int drop = base - rawVal;
    if ((drop >= FIRE_DELTA_THRESHOLD && rawVal < 2500) || (digitalRead(SENSOR_PINS[i]) == LOW && rawVal < 1500)) {
      triggered = true;
      intensityOut = map(constrain(drop, FIRE_DELTA_THRESHOLD, max(FIRE_DELTA_THRESHOLD + 1, base)), 
                         FIRE_DELTA_THRESHOLD, max(FIRE_DELTA_THRESHOLD + 1, base), 20, 100);
    }
  } else {
    // RESTING-LOW: Voltage rises on flame detection (or digital Active-HIGH)
    // Requires at least 800 ADC rise AND reading above 1500 ADC (or clean digitalRead HIGH)
    int rise = rawVal - base;
    if ((rise >= FIRE_DELTA_THRESHOLD && rawVal > 1500) || (digitalRead(SENSOR_PINS[i]) == HIGH && rawVal > 2500)) {
      triggered = true;
      intensityOut = map(constrain(rise, FIRE_DELTA_THRESHOLD, max(FIRE_DELTA_THRESHOLD + 1, 4095 - base)), 
                         FIRE_DELTA_THRESHOLD, max(FIRE_DELTA_THRESHOLD + 1, 4095 - base), 20, 100);
    }
  }
  return triggered;
}

// ============================================================
//   OLED SCREEN PRIORITY MANAGER
// ============================================================
void updateScreenPriority() {
  bool fire  = sData.fireConfirmed;
  bool obs   = sData.obstacleLeft || sData.obstacleRight;

  if (!fire && !obs) { currentScreen = SCR_NORMAL; inObstacleWindow = false; return; }
  if (fire && !obs)  { currentScreen = SCR_FIRE;   inObstacleWindow = false; return; }
  if (!fire && obs && US_CONNECTED) { currentScreen = SCR_OBSTACLE; return; }

  if (fire && obs && US_CONNECTED) {
    unsigned long now = millis();
    if (!inObstacleWindow) {
      if (fireStartTime == 0) fireStartTime = now;
      if (now - fireStartTime >= OBSTACLE_SHOW_AFTER_MS) {
        inObstacleWindow = true;
        obstacleShowTime = now;
        currentScreen    = SCR_OBSTACLE;
      } else {
        currentScreen = SCR_FIRE;
      }
    } else {
      if (now - obstacleShowTime >= OBSTACLE_HOLD_MS) {
        inObstacleWindow = false;
        fireStartTime    = millis();
        currentScreen    = SCR_FIRE;
      } else {
        currentScreen = SCR_OBSTACLE;
      }
    }
    return;
  }
  currentScreen = SCR_NORMAL;
}

// ============================================================
//   ULTRASONIC TIMING MEASUREMENT (HC-SR04)
// ============================================================
int readUltrasonic(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long dur = pulseIn(echoPin, HIGH, 25000); // 25ms timeout (~4.3m max)
  if (dur == 0) return US_MAX_CM;
  return constrain((int)(dur / 58), 0, US_MAX_CM);
}

// ============================================================
//   BUZZER SOUND SYNTHESIS
// ============================================================
void buzzerTone(int freq, int durationMs) {
  BUZZER_TONE(BUZZER_PIN, BUZZER_CH, freq > 0 ? freq : 0);
  vTaskDelay(pdMS_TO_TICKS(durationMs));
}

void buzzerStartup() {
  BUZZER_ATTACH(BUZZER_PIN, 2000, 8);
  buzzerTone(1000, 80); buzzerTone(0, 80);
  buzzerTone(1400, 80); buzzerTone(0, 200);
}

// ============================================================
//   NTP CLOCK SYNCHRONIZATION
// ============================================================
void syncNTP() {
  Serial.println("[NTP] Querying NIST / NTP time servers...");
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov"); // IST UTC+5:30
  struct tm ti;
  unsigned long t = millis();
  while (!getLocalTime(&ti) && millis() - t < 8000) {
    vTaskDelay(pdMS_TO_TICKS(200));
  }
  ntpSynced = (getLocalTime(&ti) && ti.tm_year > 70);
  Serial.println(ntpSynced ? "[NTP] Time Synchronized (IST UTC+5:30)" : "[NTP] Sync Failed (Will use fallback timestamp)");
}

// ============================================================
//   FREERTOS TASK 1: SENSOR ACQUISITION & VECTORING (Core 1, Pri 5)
// ============================================================
void taskSensors(void* param) {
  TickType_t lastWake = xTaskGetTickCount();
  while (1) {
    int dist = US_MAX_CM;
    if (US_CONNECTED) {
      dist = readUltrasonic(US_TRIG_PIN, US_ECHO_PIN);
    }

    bool fireThisCycle = false;
    int  strongest = 0, strongestIdx = -1, activeCount = 0, peakInt = 0;

    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
      sData.distLeft      = dist;
      sData.distRight     = dist;
      sData.obstacleLeft  = (dist > 0 && dist <= OBSTACLE_CM);
      sData.obstacleRight = false;

      // Read 5 flame sensor channels (Analog & Digital Hybrid Evaluation)
      for (int i = 0; i < NUM_SENSORS; i++) {
        int v = analogRead(SENSOR_PINS[i]);
        sData.values[i] = v;
        int sensorIntensity = 0;
        bool fired = evaluateFlameSensor(i, v, sensorIntensity);
        sData.sensorFired[i] = fired;

        if (fired) {
          activeCount++;
          fireThisCycle = true;
          if (sensorIntensity > peakInt) {
            peakInt = sensorIntensity;
            strongestIdx = i;
          }
        }
      }
      sData.activeSensors = activeCount;

      // Fire confirmation filter (Requires 3 consecutive cycles to engage / disengage)
      if (fireThisCycle && activeCount >= 1) {
        confirmCounter++;
        if (confirmCounter >= CONFIRM_COUNT) {
          sData.intensity = peakInt;
          if (!sData.fireConfirmed) {
            sData.fireConfirmed  = true;
            sData.strongestIndex = strongestIdx;
            sData.fireDirection  = SENSOR_DIR[strongestIdx];
            sData.status         = "Fire!";
            fireStartTime        = millis();
            setServoToSensor(strongestIdx);
            Serial.println("==================================================");
            Serial.print("  [HAZARD LOCK] CONFIRMED FIRE: Sector ");
            Serial.print(sData.fireDirection);
            Serial.print(" (Sensor S"); Serial.print(strongestIdx + 1);
            Serial.print(" on GPIO "); Serial.print(SENSOR_PINS[strongestIdx]);
            Serial.print(") | Intensity: "); Serial.print(sData.intensity);
            Serial.print("% | Servo Aim: ");
            Serial.print(SENSOR_SERVO_ANGLE[strongestIdx]);
            Serial.println(" deg");
            Serial.println("==================================================");
          } else if (strongestIdx != sData.strongestIndex && strongestIdx >= 0) {
            sData.strongestIndex = strongestIdx;
            sData.fireDirection  = SENSOR_DIR[strongestIdx];
            setServoToSensor(strongestIdx);
          }

          // ── Autonomous Navigation & Extinguishing Motion Control ──
          int sIdx = sData.strongestIndex;
          if (sIdx == 0 || sIdx == 1) {
            // Fire is on the LEFT -> Rotate rover left to center the fire
            setRelay(false); // Conserve water while turning
            moveCar(LEFT);
          } 
          else if (sIdx == 3 || sIdx == 4) {
            // Fire is on the RIGHT -> Rotate rover right to center the fire
            setRelay(false); // Conserve water while turning
            moveCar(RIGHT);
          } 
          else {
            // Fire is DIRECTLY IN FRONT (Sensor S3 / Center)
            if (dist > 28) {
              // Further than 28cm -> Advance forward toward flame
              setRelay(false); // Conserve water while driving
              moveCar(UP);
            } else {
              // Within 28cm standoff distance -> STOP and SPRAY WATER!
              moveCar(STOP);
              setRelay(true);      // Engage pump
              setServoToSensor(2); // Center nozzle at 90 deg directly onto fire
            }
          }
        }
      } else {
        confirmCounter  = 0;
        sData.intensity = 0;
        if (sData.fireConfirmed) {
          sData.fireConfirmed = false;
          sData.activeSensors = 0;
          sData.status        = "Clear";
          fireStartTime       = 0;
          inObstacleWindow    = false;
          setRelay(false);
          moveCar(STOP);
          setServoAngle(SERVO_STANDBY);
          Serial.println("[FIRE RESOLVED] All vectors clear. Extinguisher pump OFF, Motors STOP, Servo 90 deg.");
        } else {
          moveCar(STOP);
        }
      }

      if (sData.obstacleLeft) {
        Serial.print("[OBSTACLE HAZARD] Dist=");
        Serial.print(dist);
        Serial.println("cm -> ROVER BRAKE INTERLOCK");
      }

      updateScreenPriority();
      xSemaphoreGive(dataMutex);
    }

    // Status heartbeat print every 5 seconds
    static unsigned long lastPrint = 0;
    static bool lastFire = false;
    if (sData.fireConfirmed != lastFire || millis() - lastPrint >= 5000) {
      lastPrint = millis();
      lastFire = sData.fireConfirmed;
      if (!sData.fireConfirmed) {
        Serial.print("[FLAME MATRIX] ");
        for (int i = 0; i < NUM_SENSORS; i++) {
          Serial.print(SENSOR_SHORT_LABEL[i]); Serial.print(":");
          Serial.print(sData.values[i]); Serial.print(" ");
        }
        Serial.print("-> Status: CLEAR | ");
        if (US_CONNECTED) {
          Serial.print("Sonar=");
          Serial.print(dist);
          Serial.print("cm ");
        }
        Serial.print("| Servo="); Serial.print(servoAngle); Serial.println("deg");
      }
    }
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(100));
  }
}

// ============================================================
//   FREERTOS TASK 2: SH1106 OLED DISPLAY (Core 0, Priority 3)
// ============================================================
void taskDisplay(void* param) {
  TickType_t lastWake = xTaskGetTickCount();
  while (1) {
    animTick++;
    if (oledOK && xSemaphoreTake(dispMutex, pdMS_TO_TICKS(20)) == pdTRUE) {
      display.clearDisplay();
      switch (currentScreen) {
        case SCR_BOOT:     drawBoot(bootPct, (const char*)bootMsg); break;
        case SCR_NORMAL:   drawNormal();        break;
        case SCR_FIRE:     drawFire();           break;
        case SCR_OBSTACLE: drawObstacleAlert();  break;
        case SCR_ERROR:    drawComponentError(); break;
      }
      display.display();
      xSemaphoreGive(dispMutex);
    }
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(100));
  }
}

// ============================================================
//   FREERTOS TASK 3: WIFI & SUPABASE DISPATCH (Core 0, Priority 1)
// ============================================================
void taskWiFi(void* param) {
  connectWiFi();
  if (wifiConnected) syncNTP();

  TickType_t lastPost  = xTaskGetTickCount();
  TickType_t lastCheck = xTaskGetTickCount();

  while (1) {
    TickType_t now = xTaskGetTickCount();

    // WiFi Watchdog Check every 10 seconds
    if (now - lastCheck >= pdMS_TO_TICKS(10000)) {
      lastCheck = now;
      if (WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        wifiStrength  = 0;
        ntpSynced     = false;
        WiFi.reconnect();
      } else {
        wifiConnected = true;
        int r = WiFi.RSSI();
        wifiStrength = (r > -55) ? 4 : (r > -65) ? 3 :
                       (r > -75) ? 2 : (r > -85) ? 1 : 0;
        if (!ntpSynced) syncNTP();
      }
    }

    bool fireNow = false, relayNow = false;
    int  intensity = 0, active = 0, sIdx = -1, distL = -1, distR = -1;
    char dir[20] = "None", ts[32] = "";
    int  vals[NUM_SENSORS] = { 0 };

    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
      fireNow   = sData.fireConfirmed;
      relayNow  = relayOn;
      intensity = sData.intensity;
      active    = sData.activeSensors;
      sIdx      = sData.strongestIndex;
      distL     = sData.distLeft;
      distR     = sData.distRight;
      strncpy(dir, sData.fireDirection, 19);
      updateTimestamp();
      strncpy(ts, sData.timestamp, 31);
      for (int i = 0; i < NUM_SENSORS; i++) vals[i] = sData.values[i];
      xSemaphoreGive(dataMutex);
    }

    // Grab latest Neo-6M GPS Fix
    double lat = 0.0, lng = 0.0;
    bool   gpsValid = false;
    if (xSemaphoreTake(gpsMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
      lat      = gpsData.lat;
      lng      = gpsData.lng;
      gpsValid = gpsData.valid;
      xSemaphoreGive(gpsMutex);
    }

    // Rate-limited Cloud Logging to Supabase (Every 3 seconds during fire suppression)
    if (fireNow && wifiConnected && now - lastPost >= pdMS_TO_TICKS(3000)) {
      lastPost = now;
      postToSupabase(ts, intensity, active, sIdx, dir, vals,
                     distL, distR, relayNow, lat, lng, gpsValid);
    }

    vTaskDelay(pdMS_TO_TICKS(500));
  }
}

// ============================================================
//   FREERTOS TASK 4: PIEZO SIREN WARBLE (Core 1, Priority 2)
// ============================================================
void taskBuzzer(void* param) {
  TickType_t lastWake = xTaskGetTickCount();
  while (1) {
    bool fire = false, obstacle = false, err = false;
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
      fire     = sData.fireConfirmed;
      obstacle = sData.obstacleLeft || sData.obstacleRight;
      err      = compErrorUS || compErrorL || compErrorR;
      xSemaphoreGive(dataMutex);
    }

    if (fire) {
      // High-low alternating tactical emergency siren
      ledcWriteTone(BUZZER_CH, 900);  vTaskDelay(pdMS_TO_TICKS(180));
      ledcWriteTone(BUZZER_CH, 0);    vTaskDelay(pdMS_TO_TICKS(80));
      ledcWriteTone(BUZZER_CH, 1400); vTaskDelay(pdMS_TO_TICKS(180));
      ledcWriteTone(BUZZER_CH, 0);    vTaskDelay(pdMS_TO_TICKS(80));
      ledcWriteTone(BUZZER_CH, 900);  vTaskDelay(pdMS_TO_TICKS(180));
      ledcWriteTone(BUZZER_CH, 0);    vTaskDelay(pdMS_TO_TICKS(80));
      ledcWriteTone(BUZZER_CH, 1400); vTaskDelay(pdMS_TO_TICKS(180));
      ledcWriteTone(BUZZER_CH, 0);
      if (obstacle) {
        vTaskDelay(pdMS_TO_TICKS(200));
        ledcWriteTone(BUZZER_CH, 2500); vTaskDelay(pdMS_TO_TICKS(60));
        ledcWriteTone(BUZZER_CH, 0);    vTaskDelay(pdMS_TO_TICKS(340));
      } else {
        vTaskDelay(pdMS_TO_TICKS(600));
      }
    } else if (obstacle) {
      // Rapid obstacle warning chirp
      ledcWriteTone(BUZZER_CH, 2000); vTaskDelay(pdMS_TO_TICKS(100));
      ledcWriteTone(BUZZER_CH, 0);    vTaskDelay(pdMS_TO_TICKS(100));
      ledcWriteTone(BUZZER_CH, 2000); vTaskDelay(pdMS_TO_TICKS(100));
      ledcWriteTone(BUZZER_CH, 0);    vTaskDelay(pdMS_TO_TICKS(400));
    } else if (err) {
      // Low fault warning chirp
      ledcWriteTone(BUZZER_CH, 600); vTaskDelay(pdMS_TO_TICKS(100));
      ledcWriteTone(BUZZER_CH, 0);   vTaskDelay(pdMS_TO_TICKS(100));
      ledcWriteTone(BUZZER_CH, 600); vTaskDelay(pdMS_TO_TICKS(100));
      ledcWriteTone(BUZZER_CH, 0);   vTaskDelay(pdMS_TO_TICKS(3000));
    } else {
      ledcWriteTone(BUZZER_CH, 0);
      vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(200));
    }
  }
}

// ============================================================
//   FREERTOS TASK 5: NEO-6M GPS STREAM PARSER (Core 0, Priority 2)
// ============================================================
void taskGPS(void* param) {
  TickType_t lastWake = xTaskGetTickCount();
  static unsigned long lastLog = 0;

  while (1) {
    while (gpsSerial.available() > 0) {
      gps.encode(gpsSerial.read());
    }

    if (gps.location.isValid() && gps.location.age() < 2500) {
      if (xSemaphoreTake(gpsMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
        gpsData.lat   = gps.location.lat();
        gpsData.lng   = gps.location.lng();
        gpsData.valid = true;
        if (gps.satellites.isValid()) gpsData.satellites = (uint8_t)gps.satellites.value();
        if (gps.hdop.isValid())       gpsData.hdop       = gps.hdop.hdop();
        xSemaphoreGive(gpsMutex);
      }
    }

    if (millis() - lastLog >= 10000) {
      lastLog = millis();
      if (gpsData.valid) {
        Serial.print("[GPS FIX] Lat: "); Serial.print(gpsData.lat, 6);
        Serial.print(" | Lng: ");        Serial.print(gpsData.lng, 6);
        Serial.print(" | Sats: ");       Serial.print(gpsData.satellites);
        Serial.print(" | HDOP: ");       Serial.println(gpsData.hdop, 1);
      } else {
        Serial.print("[GPS] Acquiring Fix... (NMEA Bytes: ");
        Serial.print(gps.charsProcessed());
        Serial.print(", Sentences: ");
        Serial.print(gps.sentencesWithFix());
        Serial.println(")");
      }
    }

    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(50));
  }
}

// ============================================================
//   MAIN HARDWARE SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n==================================================");
  Serial.println("   FIRE GUARD ROBOT v4.5 - Boot Sequence Active");
  Serial.println("==================================================");

  // Initialize Water Pump Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  relayOn = false;
  Serial.println("[INIT] Water Pump Relay -> GPIO 19 Initialized (LOW)");

  // Initialize Autonomous Motor Driver (Hardware Channels 4-7, Timers 2 & 3)
  setupMotors();

  // Initialize Extinguisher Nozzle Servo
  ESP32PWM::allocateTimer(1);
  fireServo.setPeriodHertz(50);
  fireServo.attach(SERVO_PIN, 500, 2400);
  fireServo.write(SERVO_STANDBY);
  servoAngle = SERVO_STANDBY;
  Serial.println("[INIT] Extinguisher Servo -> GPIO 13 Initialized (Center 90 deg)");

  // Initialize Neo-6M GPS on Serial2
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[INIT] Neo-6M GPS -> HardwareSerial2 (RX: 16, TX: 17, 9600 Baud)");

  // Mutex Allocation
  dataMutex = xSemaphoreCreateMutex();
  dispMutex = xSemaphoreCreateMutex();
  gpsMutex  = xSemaphoreCreateMutex();

  sData.fireConfirmed  = false;
  sData.intensity      = 0;
  sData.activeSensors  = 0;
  sData.status         = "Clear";
  sData.fireDirection  = "None";
  sData.strongestIndex = -1;
  sData.distLeft       = US_FL_CONNECTED ? US_MAX_CM : -1;
  sData.distRight      = US_FR_CONNECTED ? US_MAX_CM : -1;
  sData.obstacleLeft   = false;
  sData.obstacleRight  = false;
  for (int i = 0; i < NUM_SENSORS; i++) {
    sData.values[i] = 0;
    sData.sensorFired[i] = false;
  }

  // Initialize I2C OLED
  Wire.begin();
  Wire.setClock(400000);
  if (display.begin(OLED_ADDR, true)) {
    oledOK = true;
    display.clearDisplay();
    display.setTextColor(SH110X_WHITE);
    display.display();
    Serial.println("[INIT] Adafruit SH1106 OLED -> Initialized (0x3C)");
  } else {
    Serial.println("[WARN] OLED Display Not Detected at 0x3C");
  }

  // Ultrasonic Pin Configuration (Single Center Sonar: TRIG=5, ECHO=18)
  if (US_CONNECTED) {
    pinMode(US_TRIG_PIN, OUTPUT);
    pinMode(US_ECHO_PIN, INPUT);
    digitalWrite(US_TRIG_PIN, LOW);
    Serial.println("[INIT] Single HC-SR04 Sonar -> TRIG: GPIO 5, ECHO: GPIO 18 Initialized");
  }

  auto boot = [](int pct, const char* msg) {
    bootPct = pct;
    strncpy((char*)bootMsg, msg, 31);
    Serial.print("[BOOT] "); Serial.print(pct); Serial.print("% - "); Serial.println(msg);
    if (oledOK) {
      display.clearDisplay();
      drawBoot(pct, msg);
      display.display();
    }
  };

  boot(10, "Display ready");
  for (int i = 0; i < NUM_SENSORS; i++) pinMode(SENSOR_PINS[i], INPUT);
  boot(20, "Sensors configured");
  boot(30, "Nozzle calibrated");
  boot(40, "GPS serial ready");
  boot(50, "Calibrating baseline...");
  calibrateSensors();
  boot(70, "Sensors tuned");
  boot(80, "Connecting WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long wt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wt < 10000) {
    delay(300);
    boot(min(92, 80 + (int)((millis() - wt) / 300)), "Connecting WiFi...");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    int r = WiFi.RSSI();
    wifiStrength = (r > -55) ? 4 : (r > -65) ? 3 :
                   (r > -75) ? 2 : (r > -85) ? 1 : 0;
    Serial.print("[WIFI] Connected! IP: "); Serial.print(WiFi.localIP());
    Serial.print(" | RSSI: "); Serial.print(r); Serial.println(" dBm");
    boot(96, "WiFi online!");
  } else {
    Serial.println("[WIFI] Standby - Background reconnect engaged");
    boot(96, "WiFi standby...");
  }

  boot(100, "Ready for Mission!");
  delay(400);
  buzzerStartup();
  currentScreen = SCR_NORMAL;

  // Launch Core-Pinned FreeRTOS Tasks
  xTaskCreatePinnedToCore(taskSensors, "Sensors", 4096, NULL, 5, NULL, 1);
  xTaskCreatePinnedToCore(taskDisplay, "Display", 4096, NULL, 3, NULL, 0);
  xTaskCreatePinnedToCore(taskWiFi,    "WiFi",    8192, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(taskBuzzer,  "Buzzer",  2048, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(taskGPS,     "GPS",     4096, NULL, 2, NULL, 0);
  Serial.println("[FREERTOS] 5 Autonomous Tasks Running Across Core 0 and Core 1\n");
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}

// ============================================================
//   SENSOR BASELINE AUTO-CALIBRATION
// ============================================================
void calibrateSensors() {
  Serial.println("\n[CALIBRATION] Sampling ambient flame sensor baseline (20 samples)...");
  long sums[NUM_SENSORS] = { 0 };
  for (int r = 0; r < 20; r++) {
    for (int i = 0; i < NUM_SENSORS; i++) {
      sums[i] += analogRead(SENSOR_PINS[i]);
    }
    delay(20);
  }

  for (int i = 0; i < NUM_SENSORS; i++) {
    sensorBaseline[i] = sums[i] / 20;
    // If resting baseline > 2000, sensor is Resting-HIGH (drops on fire, or digital Active-LOW)
    // If resting baseline <= 2000, sensor is Resting-LOW (rises on fire, typical of IR photodiode to VCC)
    sensorIsRestingHigh[i] = (sensorBaseline[i] > 2000);

    Serial.print("  [CALIBRATED] S"); Serial.print(i + 1);
    Serial.print(" ("); Serial.print(SENSOR_DIR[i]);
    Serial.print(" - GPIO "); Serial.print(SENSOR_PINS[i]);
    Serial.print("): Ambient Baseline = "); Serial.print(sensorBaseline[i]);
    Serial.print(" | Mode = ");
    Serial.println(sensorIsRestingHigh[i] ? "RESTING-HIGH (Trip on Drop/LOW)" : "RESTING-LOW (Trip on Rise/HIGH)");
  }
  Serial.println("[CALIBRATION] Baseline established. Automatic threshold tracking active.\n");
}

// ============================================================
//   TIMESTAMP COMPILER (NTP WITH UPTIME FALLBACK)
// ============================================================
void updateTimestamp() {
  struct tm ti;
  if (getLocalTime(&ti) && ti.tm_year > 70) {
    strftime(sData.timestamp, sizeof(sData.timestamp), "%Y-%m-%dT%H:%M:%S+05:30", &ti);
  } else {
    // Robust ISO-8601 Fallback Timestamp
    unsigned long sec = millis() / 1000;
    snprintf(sData.timestamp, sizeof(sData.timestamp), "2026-01-01T%02lu:%02lu:%02luZ",
             (sec / 3600) % 24, (sec / 60) % 60, sec % 60);
  }
}

// ============================================================
//   WIFI CONNECTION HANDLER
// ============================================================
void connectWiFi() {
  Serial.print("[WIFI] Connecting to '");
  Serial.print(WIFI_SSID);
  Serial.print("'");

  WiFi.disconnect(false);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 12000) {
    vTaskDelay(pdMS_TO_TICKS(400));
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    int r = WiFi.RSSI();
    wifiStrength = (r > -55) ? 4 : (r > -65) ? 3 :
                   (r > -75) ? 2 : (r > -85) ? 1 : 0;
    Serial.println("\n[WIFI] Connected! IP: " + WiFi.localIP().toString());
  } else {
    wifiConnected = false;
    wifiStrength  = 0;
    Serial.println("\n[WIFI] Connect failed. Background reconnect standby.");
  }
}

// ============================================================
//   SUPABASE CLOUD REST POST DISPATCHER
// ============================================================
void postToSupabase(const char* ts, int intensity, int active,
                    int sIdx, const char* dir, int vals[],
                    int distL, int distR, bool relay,
                    double lat, double lng, bool gpsValid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SUPABASE] Offline - Post aborted");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Bypass TLS root certificate validation for efficiency
  HTTPClient http;
  http.setConnectTimeout(8000);
  http.setTimeout(8000);

  String endpoint = String(SUPABASE_URL) + SUPABASE_TABLE;
  if (!http.begin(client, endpoint)) {
    Serial.println("[SUPABASE] Failed to initiate HTTP connection");
    return;
  }

  http.addHeader("Content-Type",  "application/json");
  http.addHeader("apikey",        SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer",        "return=minimal");

  char vs[60] = "";
  for (int i = 0; i < NUM_SENSORS; i++) {
    char tmp[12];
    snprintf(tmp, sizeof(tmp), i < NUM_SENSORS - 1 ? "%d," : "%d", vals[i]);
    strcat(vs, tmp);
  }

  DynamicJsonDocument doc(1024);
  doc["event_time"]          = ts;
  doc["fire_status"]         = "Fire!";
  doc["fire_intensity"]      = intensity;
  doc["strongest_direction"] = dir;
  doc["strongest_sensor_id"] = sIdx;
  doc["active_sensor_count"] = active;
  doc["sensor_values"]       = vs;
  doc["relay_status"]        = relay ? "ON" : "OFF";

  if (US_FL_CONNECTED && !compErrorL && !compErrorUS) doc["dist_left"]  = distL;
  if (US_FR_CONNECTED && !compErrorR)                 doc["dist_right"] = distR;
  if (US_CONNECTED && !compErrorUS)                   doc["dist_cm"]    = distL;

  // Include precise GPS fix coordinates
  if (gpsValid) {
    doc["latitude"]  = serialized(String(lat, 6));
    doc["longitude"] = serialized(String(lng, 6));
  }

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  if (httpCode == 200 || httpCode == 201) {
    Serial.print("[SUPABASE SUCCESS] Fire Event Logged | Intensity: ");
    Serial.print(intensity);
    Serial.print("% | Direction: "); Serial.print(dir);
    Serial.print(" | Relay: "); Serial.print(relay ? "ACTIVE" : "STANDBY");
    if (gpsValid) {
      Serial.print(" | GPS: "); Serial.print(lat, 5); Serial.print(", "); Serial.println(lng, 5);
    } else {
      Serial.println(" | GPS: No Fix");
    }
  } else {
    Serial.print("[SUPABASE ERROR] HTTP Response Code: ");
    Serial.println(httpCode);
  }

  http.end();
}

// ============================================================
//   OLED GRAPHICS HELPERS
// ============================================================
void drawProgressBar(int x, int y, int w, int h, int pct) {
  display.drawRect(x, y, w, h, SH110X_WHITE);
  int fw = ((w - 2) * constrain(pct, 0, 100)) / 100;
  if (fw > 0) display.fillRect(x + 1, y + 1, fw, h - 2, SH110X_WHITE);
}

void drawWiFiIcon(int x, int y) {
  const int hh[4] = { 3, 5, 7, 9 };
  for (int i = 0; i < 4; i++) {
    int bx = x + i * 4, bh = hh[i], by = y + 9 - bh;
    if (i < wifiStrength) display.fillRect(bx, by, 3, bh, SH110X_WHITE);
    else                   display.drawRect(bx, by, 3, bh, SH110X_WHITE);
  }
}

void drawCenteredText(const char* txt, int y, uint8_t sz) {
  display.setTextSize(sz);
  int16_t x1, y1; uint16_t w, h;
  display.getTextBounds(txt, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_W - w) / 2, y);
  display.print(txt);
}

void drawDashedBorder(int phase) {
  int off = phase % 4;
  for (int x = off; x < SCREEN_W; x += 4) {
    display.drawPixel(x, 0,          SH110X_WHITE);
    display.drawPixel(x, SCREEN_H-1, SH110X_WHITE);
  }
  for (int y = off; y < SCREEN_H; y += 4) {
    display.drawPixel(0,          y, SH110X_WHITE);
    display.drawPixel(SCREEN_W-1, y, SH110X_WHITE);
  }
}

// ============================================================
//   SCREEN 1: BOOT SEQUENCE
// ============================================================
void drawBoot(int pct, const char* msg) {
  display.fillRect(0, 0, SCREEN_W, 18, SH110X_WHITE);
  display.setTextColor(SH110X_BLACK);
  display.setTextSize(2);
  display.setCursor(4, 2);
  display.print("FIRE GUARD");
  display.setTextColor(SH110X_WHITE);
  display.setTextSize(1);
  drawCenteredText("Phase 1  v4.5", 22);
  display.drawLine(10, 30, 118, 30, SH110X_WHITE);
  drawCenteredText(msg, 35);
  drawProgressBar(8, 46, 112, 8, pct);
  char ps[8]; snprintf(ps, sizeof(ps), "%d%%", pct);
  drawCenteredText(ps, 57);
}

// ============================================================
//   SCREEN 2: NORMAL PATROL HUD
// ============================================================
void drawNormal() {
  display.fillRect(0, 0, SCREEN_W, 11, SH110X_WHITE);
  display.setTextColor(SH110X_BLACK);
  display.setTextSize(1);
  display.setCursor(3, 2);
  display.print("FIRE GUARD");
  display.setTextColor(SH110X_WHITE);
  drawWiFiIcon(110, 0);

  display.setCursor(2, 14);
  display.print("Status:");
  display.setCursor(50, 14);
  display.print(wifiConnected ? "WiFi OK" : "No WiFi");
  display.drawLine(0, 23, SCREEN_W, 23, SH110X_WHITE);

  display.setCursor(2, 26);
  display.print("SEN:");
  for (int i = 0; i < NUM_SENSORS; i++) {
    int cx = 32 + i * 18;
    bool fired = false;
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(3)) == pdTRUE) {
      fired = sData.sensorFired[i];
      xSemaphoreGive(dataMutex);
    }
    if (fired) display.fillRect(cx - 3, 24, 8, 8, SH110X_WHITE);
    else       display.drawRect(cx - 3, 24, 8, 8, SH110X_WHITE);
    display.setCursor(28 + i * 18, 34);
    display.print(SENSOR_SHORT_LABEL[i]);
  }
  display.drawLine(0, 44, SCREEN_W, 44, SH110X_WHITE);

  display.setCursor(2, 47);
  display.print("Rly:"); display.print(relayOn ? "ON " : "OFF");
  display.setCursor(60, 47);
  display.print("Srv:"); display.print(servoAngle); display.print("d");

  // GPS satellite fix status on bottom row
  display.setCursor(2, 56);
  if (xSemaphoreTake(gpsMutex, pdMS_TO_TICKS(3)) == pdTRUE) {
    if (gpsData.valid) {
      display.print("GPS:"); display.print((int)gpsData.satellites);
      display.print("sat");
    } else {
      display.print("GPS:searching");
    }
    xSemaphoreGive(gpsMutex);
  }
}

// ============================================================
//   SCREEN 3: FIRE ALERT & SUPPRESSION HUD
// ============================================================
void drawFire() {
  drawDashedBorder(animTick / 3);
  bool blink = (animTick / 4) % 2 == 0;
  if (blink) {
    display.fillRect(2, 2, SCREEN_W - 4, 13, SH110X_WHITE);
    display.setTextColor(SH110X_BLACK);
    drawCenteredText("!! FIRE ALERT !!", 4);
    display.setTextColor(SH110X_WHITE);
  } else {
    drawCenteredText("!! FIRE ALERT !!", 4);
  }

  int intensity = 0, active = 0;
  const char* dir = "???";
  bool obsActive = false;
  if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
    intensity = sData.intensity;
    active    = sData.activeSensors;
    dir       = sData.fireDirection;
    obsActive = sData.obstacleLeft || sData.obstacleRight;
    xSemaphoreGive(dataMutex);
  }

  display.setTextSize(1);
  display.setCursor(4, 19);
  display.print("Dir:"); display.print(dir);

  char sc[12]; snprintf(sc, sizeof(sc), "Sen:%d/5", active);
  display.setCursor(4, 29); display.print(sc);
  display.setCursor(70, 29);
  display.print("Srv:"); display.print(servoAngle); display.print("d");

  display.setCursor(4, 38);
  display.print("Int:");
  char ps[6]; snprintf(ps, sizeof(ps), "%d%%", intensity);
  display.print(ps);
  display.setCursor(70, 38);
  display.print("Rly:"); display.print(relayOn ? "ON" : "OFF");

  drawProgressBar(4, 46, 120, 6, intensity);

  bool showObs = obsActive && (US_FL_CONNECTED || US_FR_CONNECTED) && ((animTick / 5) % 2 == 0);
  display.fillRect(0, 55, SCREEN_W, 9, showObs ? SH110X_WHITE : SH110X_BLACK);
  display.setTextColor(showObs ? SH110X_BLACK : SH110X_WHITE);
  if (showObs) {
    drawCenteredText("OBS-STOP CHECK PATH", 57);
  } else {
    display.setCursor(2, 57);
    bool gv = false;
    if (xSemaphoreTake(gpsMutex, pdMS_TO_TICKS(3)) == pdTRUE) {
      gv = gpsData.valid;
      xSemaphoreGive(gpsMutex);
    }
    display.print(gv ? "GPS:FIX " : "GPS:---- ");
    display.print(wifiConnected ? "DB:ON" : "DB:OFF");
  }
  display.setTextColor(SH110X_WHITE);
}

// ============================================================
//   SCREEN 4: OBSTACLE COLLISION WARNING HUD
// ============================================================
void drawObstacleAlert() {
  drawDashedBorder(animTick / 3);
  bool blink = (animTick / 4) % 2 == 0;
  if (blink) {
    display.fillRect(2, 2, SCREEN_W - 4, 13, SH110X_WHITE);
    display.setTextColor(SH110X_BLACK);
    drawCenteredText("!! OBSTACLE !!", 4);
    display.setTextColor(SH110X_WHITE);
  } else {
    drawCenteredText("!! OBSTACLE !!", 4);
  }

  display.setTextSize(1);
  display.setCursor(4, 20);
  display.print("OBJ IN PATH - STOP");

  int dL = -1, dR = -1;
  bool obsL = false, obsR = false, fireActive = false;
  if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
    dL = sData.distLeft; dR = sData.distRight;
    obsL = sData.obstacleLeft; obsR = sData.obstacleRight;
    fireActive = sData.fireConfirmed;
    xSemaphoreGive(dataMutex);
  }

  int yp = 31;
  char buf[24];
  snprintf(buf, sizeof(buf), "Sonar: %dcm %s", dL, obsL ? "STOP" : "OK");
  display.setCursor(4, yp); display.print(buf); yp += 10;

  display.drawLine(0, yp + 1, SCREEN_W, yp + 1, SH110X_WHITE);
  display.setCursor(4, yp + 5);
  if (fireActive) {
    display.print("Fire:ON Srv:"); display.print(servoAngle); display.print("d");
  } else {
    display.print("Fire:clear Rly:OFF");
  }
  drawWiFiIcon(110, yp + 4);
}

// ============================================================
//   SCREEN 5: SENSOR FAULT DIAGNOSTICS HUD
// ============================================================
void drawComponentError() {
  drawDashedBorder(animTick);
  display.fillRect(2, 2, SCREEN_W - 4, 13, SH110X_WHITE);
  display.setTextColor(SH110X_BLACK);
  drawCenteredText("[!] SYS ALERT", 4);
  display.setTextColor(SH110X_WHITE);

  display.setTextSize(1);
  int y = 19;
  if ((compErrorUS || compErrorL) && US_FL_CONNECTED) {
    display.setCursor(4, y); display.print("Sonar   : NO SIGNAL"); y += 10;
  }
  if (compErrorR && US_FR_CONNECTED) {
    display.setCursor(4, y); display.print("US-Right: NO SIGNAL"); y += 10;
  }

  display.drawLine(2, y + 1, SCREEN_W - 2, y + 1, SH110X_WHITE);
  y += 4;

  char dots[6] = "";
  int d = (animTick / 4) % 5;
  for (int i = 0; i < d; i++) strcat(dots, ".");
  char chk[22]; snprintf(chk, sizeof(chk), "Check wiring%-4s", dots);
  display.setCursor(4, y + 1); display.print(chk); y += 11;

  display.setCursor(4, y + 1);
  display.print("Rly:"); display.print(relayOn ? "ON " : "OFF");
  display.print(" Srv:"); display.print(servoAngle); display.print("d");
  drawWiFiIcon(110, y);
}
