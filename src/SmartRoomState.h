#pragma once

#include <Arduino.h>

struct RgbColor {
  uint8_t r;
  uint8_t g;
  uint8_t b;

  RgbColor(uint8_t red = 0, uint8_t green = 0, uint8_t blue = 0)
      : r(red), g(green), b(blue) {}
};

struct AlarmState {
  bool enabled = false;
  uint8_t hour = 6;
  uint8_t minute = 0;
  bool ringing = false;
};

struct SmartRoomState {
  bool deskLampOn = false;
  bool rgbOn = false;
  RgbColor rgbColor = RgbColor(90, 160, 255);
  bool doorOpen = false;
  bool tvOn = false;
  bool aiOnline = false;
  bool fightMode = false;
  bool catMode = false;
  String lastAiStatus = "idle";
  AlarmState alarm;
  unsigned long lastCommandAt = 0;
};
