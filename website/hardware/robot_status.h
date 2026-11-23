#ifndef ROBOT_STATUS_H
#define ROBOT_STATUS_H

#include <Arduino.h>

// ── Professional Multi-Status NeoPixel Engine ──
enum RobotStatus {
  STATUS_WIFI_DISCONNECTED,  // Wi-Fi SoftAP ready, waiting for client phone/laptop to connect
  STATUS_CONNECTED_STANDBY,   // Client connected, robot ready in manual standby
  STATUS_MOVING,              // Robot actively driving (Forward, Backward, Left, Right)
  STATUS_WATER_ACTIVE,        // Firefighting Water pump / valve ACTIVE
  STATUS_SONIC_ACTIVE,        // Acoustic Sonic Wave Suppressor ACTIVE
  STATUS_GAS_ACTIVE = STATUS_SONIC_ACTIVE, // Alias for compatibility
  STATUS_AUTO_MODE            // Autonomous mode engaged (scanning / sweeping)
};

// Explicit function prototype declaration
RobotStatus getSystemStatus();

#endif // ROBOT_STATUS_H
