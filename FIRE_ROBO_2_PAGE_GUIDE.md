# 🔥 Fire Fighting Robot — Complete 2-Page Beginner's Guide

> **Target Audience:** Anyone with zero programming or electronics knowledge (Examiners, Teammates, Beginners).  
> **Robot Mission:** Detect fire autonomously, drive toward it safely, extinguish it with water, and report live data to a web dashboard.

---

# 📄 PAGE 1: Hardware & System Architecture

## 1. What Is This Project?
Imagine a smart mini-firefighter car that does not put human lives at risk:
1. **Finds Fire Automatically:** Uses 5 infrared "eyes" to detect fire direction and strength.
2. **Navigates Safely:** Uses an ultrasonic "sonar" to avoid hitting walls or obstacles.
3. **Puts Out Fire:** Uses a motorized water nozzle (servo) and high-power water pump to spray water directly at the flame.
4. **Dual Control Modes:**
   - **Autonomous Mode:** Robot acts on its own using internal logic.
   - **Manual Mode:** A human drives the robot using a phone or laptop over Wi-Fi.
5. **Smart Cloud Dashboard:** Live GPS location, fire history, and robot status stored in the cloud (Supabase) and viewed on a website.

```
       [ 5 Flame Sensors ]      [ Ultrasonic Sonar ]
                 \                      /
                  v                    v
              ┌────────────────────────────┐
              │      ESP32 Brain Chip      │
              └────────────────────────────┘
                 /           |          \
                v            v           v
          [ 4 Motors ]  [ Water Pump ]  [ OLED Display ]
```

---

## 2. Hardware Components & Simple Pin Map
The **ESP32** microcontroller acts as the robot's brain. Here is what connects to each pin:

| Component | ESP32 Pin | What It Does (In Simple Words) |
|---|---|---|
| **Left Motor (Forward)** | **GPIO 23** (Mirror: **19**) | Spins left wheels forward |
| **Left Motor (Backward)**| **GPIO 25** | Spins left wheels backward |
| **Right Motor (Forward)**| **GPIO 14** | Spins right wheels forward |
| **Right Motor (Backward)**| **GPIO 27** | Spins right wheels backward |
| **Water Pump Relay** | **GPIO 19 & 16** | Turns the water pump motor ON/OFF |
| **Nozzle Servo Motor** | **GPIO 13** | Aims the water pipe left/right (30° to 150°) |
| **Ultrasonic Distance Sensor** | **TRIG: 5, ECHO: 18** | Measures distance to walls/obstacles |
| **5 Flame Sensors** | **GPIO 33, 32, 35, 34, 39** | Detects fire from Left (-45°) to Right (+45°) |
| **OLED Screen (1.3")** | **SDA: 21, SCL: 22** | Displays status, GPS, and distances locally |
| **GPS Module (NEO-6M)** | **RX: 16, TX: 17** | Gets real-time satellite coordinates |
| **Safety Buzzer** | **GPIO 4** | Beeps when fire or system error is detected |

---

## 3. How the Robot Detects Fire & Distance
- **Flame Detection (5 Sensors):**
  - **S1 (GPIO 33):** Far Left
  - **S2 (GPIO 32):** Front Left
  - **S3 (GPIO 35):** Center (Straight ahead)
  - **S4 (GPIO 34):** Front Right
  - **S5 (GPIO 39):** Far Right
  - *Logic:* The sensor reading the lowest analog voltage (highest infrared radiation) indicates the exact direction of the fire!
- **Obstacle Sonar (HC-SR04):**
  - Sends an inaudible sound pulse every 100 ms.
  - Measures the echo return time. If distance $\le 30\text{ cm}$, the robot immediately stops to prevent a collision.
  - Digital filter ignores noise so the robot never stutters or jerks.

---

# 📄 PAGE 2: Software Modes & Cloud Dashboard

## 4. Automatic Mode (`fireauto.ino`)
In Auto Mode, the robot runs on **FreeRTOS** (multitasking operating system inside ESP32) with 5 independent tasks running at the same time:

```mermaid
flowchart TD
    Start([Robot Powered ON]) --> Scan[Scan 5 Flame Sensors + Ultrasonic Sonar]
    Scan --> CheckFire{Is Fire Present?}
    CheckFire -- No Fire --> Idle[Motors STOP | Sonar Scans Path | OLED: Clear]
    CheckFire -- Yes --> FindDir[Determine Strongest Sensor: S1 to S5]
    FindDir --> AimServo[Aim Water Nozzle Servo to Fire Angle]
    AimServo --> TurnRobot{Is Fire Centered?}
    TurnRobot -- Fire on Left --> TurnL[Rotate Motors LEFT]
    TurnRobot -- Fire on Right --> TurnR[Rotate Motors RIGHT]
    TurnRobot -- Fire Straight Ahead --> CheckDist{Distance to Fire > 28cm?}
    CheckDist -- Yes --> DriveFwd[Drive Motors FORWARD toward Fire]
    CheckDist -- No: Safe Distance <= 28cm --> Extinguish[STOP Motors + Turn Pump ON + Spray Water]
    Extinguish --> Resolved{Fire Out?}
    Resolved -- Yes --> Off[Pump OFF | Servo to 90° | Report to Cloud]
    TurnL --> Scan
    TurnR --> Scan
    DriveFwd --> Scan
```

* **Safety Override:** If an obstacle is detected in front ($\le 30\text{ cm}$), the robot halts automatically and displays `!! OBSTACLE !!` on screen.
* **Auto Cloud Log:** Sends fire alerts and GPS coordinates to the cloud database within 2 seconds of detection.

---

## 5. Manual Mode (`fire.ino`)
When the robot needs human intervention:
1. ESP32 creates its own Wi-Fi hotspot named **`RNS ROBOT`** (Password: `12345678`).
2. The user connects their smartphone or computer and opens `http://192.168.4.1`.
3. A touchscreen control cockpit appears:
   - **Virtual Joystick / D-Pad:** Forward, Reverse, Left, Right.
   - **Speed Slider:** Adjust motor speed (135–255 PWM).
   - **Water Pump Switch:** Instant manual water jet activation.
   - **Live Sonar Readout:** Displays live distance (e.g. `18 cm`) right beside the Sonar Sweep slider.
   - **Smart Collision Shield:** If you drive forward toward a wall $\le 25\text{ cm}$, the robot halts itself to prevent human error crashes!

---

## 6. The Website & Cloud Dashboard (`/website`)
A web interface built with React, Tailwind CSS, and Leaflet Maps:
- **Live Fleet Tracking:** Shows the robot's real-time position on a satellite map using the onboard GPS.
- **Incident History:** Logs every fire event with timestamp, duration, sector direction, and extinguish status.
- **Remote Telemetry:** Monitors battery percentage, water tank reserve, sensor health, and system alerts.
- **Database Backend:** Connected to Supabase for secure cloud storage and real-time syncing.

---

## 7. Fast 60-Second Presentation Summary (Viva Cheat Sheet)

> *"Our Fire Fighting Robot is a hybrid autonomous and remote-controlled disaster response vehicle. It uses an ESP32 chip running FreeRTOS. In Auto Mode, a 5-sensor infrared matrix triangulates flame direction, steers the 4-wheel drive system toward the fire, stops at a 28 cm safe standoff distance using an ultrasonic sensor, and uses a servo-guided water pump to extinguish it. In Manual Mode, it creates a Wi-Fi dashboard with an active collision avoidance safety brake. All incident telemetry and GPS coordinates are synced in real time to our cloud website."*
