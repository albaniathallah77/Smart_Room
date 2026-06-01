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

constexpr uint8_t MAX_WIFI_SCAN_RESULTS = 8;

struct WifiScanNetwork {
  String ssid = "";
  int rssi = 0;
  bool secure = false;
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
  bool stikmanMode = false;
  bool kacauMode = false;
  bool kenzieMode = false;
  bool jokenMode = false;
  bool wifiConnected = false;
  bool wifiSetupApActive = false;
  String wifiSsid = "";
  String wifiIp = "";
  String wifiSetupIp = "";
  String wifiMode = "wifi";
  int wifiRssi = 0;
  String strongestWifiSsid = "";
  int strongestWifiRssi = 0;
  uint8_t wifiScanCount = 0;
  WifiScanNetwork wifiNetworks[MAX_WIFI_SCAN_RESULTS];
  String lastAiStatus = "idle";
  AlarmState alarm;
  unsigned long lastCommandAt = 0;
};
