#pragma once

#include <Arduino.h>
#include <WiFi.h>
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
  unsigned long _doorOpenedAt = 0;
  unsigned long _lastWifiReconnectAt = 0;
  bool _wifiWasConnected = false;

  void connectWifi() {
    WiFi.mode(WIFI_STA);
    WiFi.persistent(false);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
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
      Serial.print("WiFi connected: ");
      Serial.println(WiFi.localIP());
    } else {
      _wifiWasConnected = false;
      Serial.println("WiFi failed, dashboard will start after reconnect");
    }
  }

  void maintainWifi() {
    if (WiFi.status() == WL_CONNECTED) {
      if (!_wifiWasConnected) {
        _wifiWasConnected = true;
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
      Serial.println("WiFi lost, reconnecting in background");
    }

    unsigned long now = millis();
    if (now - _lastWifiReconnectAt < 10000) {
      return;
    }

    _lastWifiReconnectAt = now;
    WiFi.disconnect(false);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
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
        Serial.print("Smart TV/OLED ");
        Serial.println(action.enabled ? "ON" : "OFF");
        break;
      case RoomActionType::SetFightMode:
        _state.tvOn = true;
        _state.fightMode = action.enabled;
        _state.catMode = false;
        Serial.println("Stickman Fight Animation ACTIVE");
        break;
      case RoomActionType::SetCatMode:
        _state.tvOn = true;
        _state.fightMode = false;
        _state.catMode = action.enabled;
        Serial.println("Cat Animation ACTIVE");
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
