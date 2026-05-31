#pragma once

// Copy this file to Config.h, then fill in your real values.

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Keep Groq/Tavily API keys on a backend gateway, not inside ESP32 firmware.
// Example local gateway: http://192.168.1.10:8787
// Example Vercel gateway: https://your-smart-room-gateway.vercel.app
#define AI_GATEWAY_URL "https://your-smart-room-gateway.vercel.app"

#define ROOM_NAME "Smart Room AI System"
#define TIMEZONE_OFFSET_SECONDS 25200
#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"

// Enable this first when wiring new hardware.
// 1 = test every component in sequence from Serial Monitor.
// 0 = run full smart room dashboard system.
#define SMART_ROOM_HARDWARE_TEST 1

// Smart door servo calibration.
// Smart door servo calibration.
#define DOOR_CLOSED_ANGLE 45
#define DOOR_OPEN_ANGLE 90

// 1 = common-anode RGB, 0 = common-cathode RGB.
#define RGB_COMMON_ANODE 1
