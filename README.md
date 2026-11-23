# 🔥 Fire Guard Robot (Dual-ESP32 Autonomous Firefighting & Telemetry Rover)

An advanced, dual-microcontroller autonomous firefighting and tactical optical reconnaissance rover engineered for rapid interior hazard mitigation and industrial telemetry surveillance.

The system decouples high-priority autonomous suppression and environmental hazard sensing (**Controller 1**) from physical locomotion, acoustic audio vortex suppression, and pan-tilt optical reconnaissance (**Controller 2**).

---

## 🏗️ System Architecture

`
                                      +------------------------------------+
                                      |      Cloud Telemetry Server        |
                                      |   (Supabase Realtime PostgreSQL)   |
                                      +-----------------+------------------+
                                                        ^
                                                        | HTTPS REST (WiFi Station)
                                                        |
+------------------------------------+        +---------+--------------------------+
|       Operator Web Console         |        |   Controller 1: Autonomous Guard   |
|   (React 18 / Vite / Tailwind)     |        |              (ESP32 #1)            |
+-----------------+------------------+        +-----------------+------------------+
                  |                                             |
                  | WebSocket / SoftAP                          | Extinguisher Vectoring
                  v                                             v
+-----------------+------------------+        +-----------------+------------------+
|    Controller 2: Chassis & RC      |        | 5x IR Photodiode Flame Array       |
|            (ESP32 #2)              |        | Dual HC-SR04 Sonar Profiler        |
+-----------------+------------------+        | u-blox Neo-6M GPS Receiver         |
                  |                           | 12V Submersible Pump Driver        |
                  | 4WD PWM Locomotion        | Piezo Warble Siren Alarm           |
                  v                           +------------------------------------+
+-----------------+------------------+
| L298N H-Bridge + 4x DC Geared Motors
| TPA3116D2 Acoustic Flame Cannon (DAC2)
| 2-Axis Pan/Tilt Camera Gimbal
| 20-LED NeoPixel Tactical Lightbar
+------------------------------------+
`

---

## 📁 Repository Directory Structure

`
├── FIRE-Automatic code/
│   └── fireauto/
│       └── fireauto.ino          # Firmware for Controller 1 (Suppression, GPS, Flame Array)
│
├── FIRE-Manual code/
│   └── fire/
│       ├── fire.ino              # Firmware for Controller 2 (Chassis Motors, Audio, Gimbal)
│       ├── html_page.h           # Embedded Web Server UI
│       └── robot_status.h        # Telemetry State Enumerations
│
├── website/
│   ├── src/                      # React 18 + TypeScript Web Command Dashboard
│   ├── tests/                    # 32 Comprehensive Verification Tests (0 failures)
│   ├── hardware/                 # Mirror backups of firmware & header files
│   └── PROJECT_REPORT.md         # Full Technical & Engineering Documentation
│
├── .gitignore                    # Git Exclusion Rules
└── README.md                     # Project Overview
`

---

## 🔌 Hardware Pinout Overview

### Controller 1: Autonomous Suppression Payload (ESP32 #1)
| Peripheral Module | GPIO Pin | Signal Type | Description |
| :--- | :---: | :--- | :--- |
| **Center Flame Sensor** | GPIO 35 | Analog (ADC1) | Direct line-of-sight hearth detection |
| **Left / Far-Left Flame** | GPIO 32, 33 | Analog (ADC1) | Left-flank spatial triangulation |
| **Right / Far-Right Flame** | GPIO 34, 39 | Analog (ADC1) | Right-flank spatial triangulation |
| **Water Pump Relay** | GPIO 19 | Digital Output | Active-LOW 12V pump relay |
| **Nozzle Vectoring Servo** | GPIO 13 | PWM (50 Hz) | 30° to 150° azimuth nozzle sweep |
| **Neo-6M GPS Module** | GPIO 16, 17 | UART2 (RX2/TX2) | 9600 baud NMEA satellite tracking |
| **Piezo Siren Buzzer** | GPIO 12 | LEDC PWM (CH 0) | Dynamic multi-tone acoustic alarm |

### Controller 2: Chassis & RC Surveillance (ESP32 #2)
| Peripheral Module | GPIO Pin | Signal Type | Description |
| :--- | :---: | :--- | :--- |
| **Right Motors (IN1 / IN2)** | GPIO 14, 27 | LEDC PWM (CH 4, 5) | 1 kHz smooth PWM motor drive |
| **Left Motors (IN1 / IN2)** | GPIO 19, 25 | LEDC PWM (CH 6, 7) | DAC1 decoupled; 1 kHz PWM drive |
| **Acoustic Audio Cannon** | GPIO 26 | DAC2 | Vortex-shedding acoustic wave generation |
| **Camera Pan / Tilt Servos** | GPIO 32, 33 | PWM (50 Hz) | 2-axis optical surveillance gimbal |
| **NeoPixel Lightbar** | GPIO 12 | Digital Output | 20-LED tactical status indicator |
| **Ultrasonic Distance** | GPIO 5, 18 | TRIG / ECHO | Obstacle detection & ranging |

---

## 💻 Web Command Dashboard

Built with React 18, TypeScript, Tailwind CSS, and Vite:
- **Warm Cream Aesthetic**: Ergonomic #FAF7F2 theme designed for long-shift operations.
- **Real-Time Telemetry**: Live battery, signal, temperature, heading, and GPS coordinate tracking.
- **Interactive OpenStreetMap**: Clean map rendering with dynamic robot location markers.
- **Anime / Mecha Sonar HUD**: Polar radar visualization with expanding acoustic wave animations.
- **Automated Safety Interlocks**: Software E-Stop latch and fluid conservation cutoffs.

### Running the Web Dashboard Locally
`ash
cd website
npm install
npm test       # Runs the 32-test unit & integration suite
npm run dev    # Starts the local development server
`

---

## 📄 Full Engineering Documentation
For complete mathematical modeling, electrical schematics, firmware bug fixes, and safety interlocks, see [PROJECT_REPORT.md](website/PROJECT_REPORT.md).
