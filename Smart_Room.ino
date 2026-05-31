#include <Arduino.h>

#if __has_include("Config.h")
#include "Config.h"
#else
#include "Config.example.h"
#endif

#if SMART_ROOM_HARDWARE_TEST
#include "src/testing/HardwareTest.h"

HardwareTest hardwareTest;
#else
#include "src/SmartRoomSystem.h"

SmartRoomSystem smartRoom;
#endif

void setup() {
  Serial.begin(115200);
  delay(300);

#if SMART_ROOM_HARDWARE_TEST
  hardwareTest.begin();
#else
  smartRoom.begin();
#endif
}

void loop() {
#if SMART_ROOM_HARDWARE_TEST
  hardwareTest.loop();
#else
  smartRoom.loop();
#endif
}
