#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>
#include <time.h>
#include "PinMap.h"
#include "SmartRoomState.h"
#include "devices/SmartLamp.h"
#include "devices/RgbRoomLight.h"
#include "devices/SmartDoor.h"
#include "devices/SmartBuzzer.h"
#include "display/OledManager.h"
#include "core/CommandParser.h"
#include "core/Scheduler.h"
#include "web/WebServerManager.h"
#include "cloud/CloudCommandClient.h"

#ifndef WIFI_SETUP_AP_SSID
#define WIFI_SETUP_AP_SSID "SmartRoom-Setup"
#endif

#ifndef WIFI_SETUP_AP_PASSWORD
#define WIFI_SETUP_AP_PASSWORD "smartroom2008"
#endif

class SmartRoomSystem {
public:
  void begin() {
    connectWifi();
    configTime(TIMEZONE_OFFSET_SECONDS, 0, NTP_SERVER_1, NTP_SERVER_2);

    _lamp.begin(PinMap::DeskLamp);
    _rgb.begin(PinMap::RgbRed, PinMap::RgbGreen, PinMap::RgbBlue);
    _door.begin(PinMap::DoorServo);
    _buzzer.begin(PinMap::Buzzer);
    _oled.begin(PinMap::I2cSda, PinMap::I2cScl);

    _scheduler.begin(handleScheduledAction, this);
    _web.begin(handleCommandPayload, this);
    _cloud.begin(handleCommandPayload, this);

    addDefaultSchedules();
    Serial.println("Smart Room AI System ready");
    Serial.print("Dashboard: http://");
    Serial.println(WiFi.localIP());
  }

  void loop() {
    maintainWifi();
    _web.loop(_state);
    _cloud.updateState(_state);
    _cloud.loop();
    refreshWifiTelemetry();
    _door.loop();
    updateDoorAutoClose();
    updateAlarm();
    _scheduler.loop();
    _buzzer.loop();
    _oled.loop(_state);
  }

private:
  SmartRoomState _state;
  SmartLamp _lamp;
  RgbRoomLight _rgb;
  SmartDoor _door;
  SmartBuzzer _buzzer;
  OledManager _oled;
  CommandParser _parser;
  Scheduler _scheduler;
  WebServerManager _web;
  CloudCommandClient _cloud;
  Preferences _prefs;
  String _wifiSsid = WIFI_SSID;
  String _wifiPassword = WIFI_PASSWORD;
  unsigned long _doorOpenedAt = 0;
  unsigned long _lastWifiReconnectAt = 0;
  unsigned long _lastWifiStateAt = 0;
  bool _wifiWasConnected = false;
  bool _setupApActive = false;

  void connectWifi() {
    loadWifiCredentials();
    WiFi.mode(WIFI_STA);
    WiFi.persistent(false);
    WiFi.setAutoReconnect(true);
    WiFi.begin(_wifiSsid.c_str(), _wifiPassword.c_str());
    Serial.print("Connecting WiFi");

    uint8_t attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
      delay(250);
      Serial.print(".");
      attempts++;
    }

    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
      _wifiWasConnected = true;
      stopSetupAccessPoint();
      updateWifiState();
      Serial.print("WiFi connected: ");
      Serial.println(WiFi.localIP());
    } else {
      _wifiWasConnected = false;
      startSetupAccessPoint();
      updateWifiState();
      Serial.println("WiFi failed, dashboard will start after reconnect");
    }
  }

  void startSetupAccessPoint() {
    if (_setupApActive) {
      return;
    }

    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(WIFI_SETUP_AP_SSID, WIFI_SETUP_AP_PASSWORD);
    _setupApActive = true;
    Serial.print("WiFi setup AP: ");
    Serial.print(WIFI_SETUP_AP_SSID);
    Serial.print(" at http://");
    Serial.println(WiFi.softAPIP());
  }

  void stopSetupAccessPoint() {
    if (!_setupApActive) {
      return;
    }

    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    _setupApActive = false;
    Serial.println("WiFi setup AP stopped; using STA WiFi only");
  }

  void maintainWifi() {
    if (WiFi.status() == WL_CONNECTED) {
      stopSetupAccessPoint();
      if (!_wifiWasConnected) {
        _wifiWasConnected = true;
        updateWifiState();
        configTime(TIMEZONE_OFFSET_SECONDS, 0, NTP_SERVER_1, NTP_SERVER_2);
        Serial.print("WiFi reconnected: ");
        Serial.println(WiFi.localIP());
        Serial.print("Dashboard: http://");
        Serial.println(WiFi.localIP());
      }
      return;
    }

    if (_wifiWasConnected) {
      _wifiWasConnected = false;
      startSetupAccessPoint();
      updateWifiState();
      Serial.println("WiFi lost, reconnecting in background");
    }

    unsigned long now = millis();
    if (now - _lastWifiReconnectAt < 10000) {
      return;
    }

    _lastWifiReconnectAt = now;
    if (!_setupApActive) {
      startSetupAccessPoint();
    }
    WiFi.disconnect(false);
    WiFi.begin(_wifiSsid.c_str(), _wifiPassword.c_str());
  }

  void refreshWifiTelemetry() {
    unsigned long now = millis();
    if (now - _lastWifiStateAt < 2000) {
      return;
    }
    _lastWifiStateAt = now;
    updateWifiState();
  }

  void loadWifiCredentials() {
    _prefs.begin("smart-room", true);
    String savedSsid = _prefs.getString("wifi_ssid", "");
    String savedPassword = _prefs.getString("wifi_pass", "");
    _prefs.end();

    if (savedSsid.length() > 0) {
      _wifiSsid = savedSsid;
      _wifiPassword = savedPassword;
      return;
    }

    _wifiSsid = WIFI_SSID;
    _wifiPassword = WIFI_PASSWORD;
  }

  void saveWifiCredentials(const String& ssid, const String& password) {
    _prefs.begin("smart-room", false);
    _prefs.putString("wifi_ssid", ssid);
    _prefs.putString("wifi_pass", password);
    _prefs.end();
  }

  bool tryWifiCredentials(const String& ssid, const String& password) {
    if (ssid.length() == 0) {
      return false;
    }

    String previousSsid = _wifiSsid;
    String previousPassword = _wifiPassword;
    _wifiSsid = ssid;
    _wifiPassword = password;

    WiFi.disconnect(false);
    WiFi.begin(_wifiSsid.c_str(), _wifiPassword.c_str());
    Serial.print("Switching WiFi to ");
    Serial.println(_wifiSsid);

    uint8_t attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(250);
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      saveWifiCredentials(_wifiSsid, _wifiPassword);
      _wifiWasConnected = true;
      stopSetupAccessPoint();
      updateWifiState();
      Serial.print("WiFi switched: ");
      Serial.println(WiFi.localIP());
      return true;
    }

    Serial.println("WiFi switch failed, restoring previous network");
    _wifiSsid = previousSsid;
    _wifiPassword = previousPassword;
    WiFi.disconnect(false);
    WiFi.begin(_wifiSsid.c_str(), _wifiPassword.c_str());
    startSetupAccessPoint();
    updateWifiState();
    return false;
  }

  void updateWifiState() {
    _state.wifiConnected = WiFi.status() == WL_CONNECTED;
    _state.wifiSetupApActive = _setupApActive;
    _state.wifiSsid = _state.wifiConnected ? WiFi.SSID() : _wifiSsid;
    _state.wifiIp = _state.wifiConnected ? WiFi.localIP().toString() : "0.0.0.0";
    _state.wifiSetupIp = _setupApActive ? WiFi.softAPIP().toString() : "";
    _state.wifiMode = _state.wifiConnected ? "wifi" : (_setupApActive ? "hotspot" : "offline");
    _state.wifiRssi = _state.wifiConnected ? WiFi.RSSI() : 0;
  }

  void scanWifiStrength() {
    int count = WiFi.scanNetworks(false, true);
    _state.wifiScanCount = count > 0 ? static_cast<uint8_t>(min(count, 255)) : 0;
    _state.strongestWifiSsid = "";
    _state.strongestWifiRssi = -127;

    for (int i = 0; i < count; i++) {
      int rssi = WiFi.RSSI(i);
      if (i == 0 || rssi > _state.strongestWifiRssi) {
        _state.strongestWifiSsid = WiFi.SSID(i);
        _state.strongestWifiRssi = rssi;
      }
    }

    WiFi.scanDelete();
    updateWifiState();
    Serial.print("WiFi scan done. Strongest: ");
    Serial.print(_state.strongestWifiSsid);
    Serial.print(" ");
    Serial.println(_state.strongestWifiRssi);
  }

  void addDefaultSchedules() {
    RoomAction lampOff;
    lampOff.type = RoomActionType::SetDeskLamp;
    lampOff.enabled = false;
    _scheduler.addDaily(4, 0, lampOff);
  }

  void applyAction(const RoomAction& action) {
    _state.lastCommandAt = millis();

    switch (action.type) {
      case RoomActionType::SetDeskLamp:
        _lamp.set(action.enabled);
        _state.deskLampOn = action.enabled;
        break;
      case RoomActionType::SetRgbPower:
        _rgb.set(action.enabled);
        _state.rgbOn = action.enabled;
        Serial.print("RGB ");
        Serial.println(action.enabled ? "ON" : "OFF");
        break;
      case RoomActionType::SetRgbColor:
        _rgb.setColor(action.color);
        _rgb.set(true);
        _state.rgbColor = action.color;
        _state.rgbOn = true;
        Serial.print("RGB color ");
        Serial.print(action.color.r);
        Serial.print(",");
        Serial.print(action.color.g);
        Serial.print(",");
        Serial.println(action.color.b);
        break;
      case RoomActionType::SetDoor:
        _door.set(action.enabled);
        _state.doorOpen = action.enabled;
        _doorOpenedAt = action.enabled ? millis() : 0;
        Serial.print("Smart Door ");
        Serial.println(action.enabled ? "OPEN" : "CLOSED");
        break;
      case RoomActionType::SetTvPower:
        _state.tvOn = action.enabled;
        _state.fightMode = false;
        _state.catMode = false;
        _state.stikmanMode = false;
        Serial.print("Smart TV/OLED ");
        Serial.println(action.enabled ? "ON" : "OFF");
        break;
      case RoomActionType::SetFightMode:
        _state.tvOn = true;
        _state.fightMode = action.enabled;
        _state.catMode = false;
        _state.stikmanMode = false;
        Serial.println("Stickman Fight Animation ACTIVE");
        break;
      case RoomActionType::SetCatMode:
        _state.tvOn = true;
        _state.fightMode = false;
        _state.catMode = action.enabled;
        _state.stikmanMode = false;
        Serial.println("Cat Animation ACTIVE");
        break;
      case RoomActionType::SetStikmanMode:
        _state.tvOn = true;
        _state.fightMode = false;
        _state.catMode = false;
        _state.stikmanMode = action.enabled;
        Serial.println("Stikman Animation ACTIVE");
        break;
      case RoomActionType::SetAlarm:
        _state.alarm.enabled = action.enabled;
        if (action.hasTime) {
          _state.alarm.hour = action.hour;
          _state.alarm.minute = action.minute;
        }
        _state.alarm.ringing = false;
        _buzzer.stop();
        break;
      case RoomActionType::StopAlarm:
        _state.alarm.ringing = false;
        _buzzer.stop();
        break;
      case RoomActionType::ScanWifi:
        scanWifiStrength();
        break;
      case RoomActionType::SetWifiCredentials:
        tryWifiCredentials(action.ssid, action.password);
        break;
      case RoomActionType::None:
        break;
    }
  }

  void updateAlarm() {
    if (!_state.alarm.enabled || _state.alarm.ringing) {
      return;
    }

    struct tm now;
    if (!getLocalTime(&now, 20)) {
      return;
    }

    if (now.tm_hour == _state.alarm.hour && now.tm_min == _state.alarm.minute && now.tm_sec < 2) {
      _state.alarm.ringing = true;
      _buzzer.startAlarm();
    }
  }

  void updateDoorAutoClose() {
    if (!_state.doorOpen || _doorOpenedAt == 0) {
      return;
    }

    if (millis() - _doorOpenedAt >= 5000) {
      _door.set(false);
      _state.doorOpen = false;
      _doorOpenedAt = 0;
      Serial.println("Smart Door auto-closed after 5 seconds");
    }
  }

  static void handleCommandPayload(const String& payload, void* context) {
    SmartRoomSystem* self = static_cast<SmartRoomSystem*>(context);
    RoomAction action;
    if (self->_parser.parseJson(payload, action)) {
      self->applyAction(action);
    } else {
      Serial.print("Unknown command: ");
      Serial.println(payload);
    }
  }

  static void handleScheduledAction(const RoomAction& action, void* context) {
    static_cast<SmartRoomSystem*>(context)->applyAction(action);
  }
};
