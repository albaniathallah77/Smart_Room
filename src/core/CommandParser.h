#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "../SmartRoomState.h"

enum class RoomActionType {
  None,
  SetDeskLamp,
  SetRgbPower,
  SetRgbColor,
  SetDoor,
  SetTvPower,
  SetAlarm,
  StopAlarm
};

struct RoomAction {
  RoomActionType type = RoomActionType::None;
  bool enabled = false;
  RgbColor color;
  uint8_t hour = 0;
  uint8_t minute = 0;
};

class CommandParser {
public:
  bool parseJson(const String& payload, RoomAction& action) {
    StaticJsonDocument<384> doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (error) {
      return parseNaturalLanguage(payload, action);
    }

    String device = doc["device"] | "";
    String state = doc["state"] | "";
    device.toLowerCase();
    state.toLowerCase();

    if (device == "lamp" || device == "desk_lamp") {
      action.type = RoomActionType::SetDeskLamp;
      action.enabled = state == "on" || doc["enabled"] == true;
      return true;
    }

    if (device == "door" || device == "smart_door" || device == "pintu") {
      action.type = RoomActionType::SetDoor;
      action.enabled = state == "open" || state == "unlock" || state == "on" || doc["open"] == true || doc["enabled"] == true;
      return true;
    }

    if (device == "tv" || device == "oled" || device == "smart_tv") {
      action.type = RoomActionType::SetTvPower;
      action.enabled = state == "on" || doc["enabled"] == true;
      return true;
    }

    if (device == "rgb") {
      if (doc.containsKey("r") || doc.containsKey("color")) {
        action.type = RoomActionType::SetRgbColor;
        action.color.r = doc["r"] | 90;
        action.color.g = doc["g"] | 160;
        action.color.b = doc["b"] | 255;
        action.enabled = true;
        return true;
      }

      action.type = RoomActionType::SetRgbPower;
      action.enabled = state == "on" || doc["enabled"] == true;
      return true;
    }

    if (device == "alarm") {
      action.type = RoomActionType::SetAlarm;
      action.enabled = doc["enabled"] | true;
      action.hour = doc["hour"] | 6;
      action.minute = doc["minute"] | 0;
      return true;
    }

    if (device == "buzzer" && state == "off") {
      action.type = RoomActionType::StopAlarm;
      return true;
    }

    return false;
  }

  bool parseNaturalLanguage(String text, RoomAction& action) {
    text.toLowerCase();

    if (hasAny(text, "lampu meja", "desk lamp", "lamp")) {
      action.type = RoomActionType::SetDeskLamp;
      action.enabled = hasAny(text, "nyala", "hidup", "on");
      return hasAny(text, "nyala", "hidup", "on", "mati", "off");
    }

    if (hasAny(text, "pintu", "door", "smart door")) {
      action.type = RoomActionType::SetDoor;
      action.enabled = hasAny(text, "buka", "open", "unlock", "nyala", "on");
      return hasAny(text, "buka", "open", "unlock", "tutup", "close", "lock");
    }

    if (hasAny(text, "smart tv", "televisi", "tv", "oled")) {
      action.type = RoomActionType::SetTvPower;
      action.enabled = hasAny(text, "nyala", "hidup", "on");
      return hasAny(text, "nyala", "hidup", "on", "mati", "off");
    }

    if (hasAny(text, "rgb", "lampu ruangan", "room light")) {
      action.type = RoomActionType::SetRgbPower;
      action.enabled = hasAny(text, "nyala", "hidup", "on");

      if (text.indexOf("merah") >= 0 || text.indexOf("red") >= 0) {
        action.type = RoomActionType::SetRgbColor;
        action.color = RgbColor(255, 20, 20);
      } else if (text.indexOf("hijau") >= 0 || text.indexOf("green") >= 0) {
        action.type = RoomActionType::SetRgbColor;
        action.color = RgbColor(20, 255, 80);
      } else if (text.indexOf("biru") >= 0 || text.indexOf("blue") >= 0) {
        action.type = RoomActionType::SetRgbColor;
        action.color = RgbColor(40, 120, 255);
      }

      return true;
    }

    if (hasAny(text, "stop alarm", "matikan alarm", "buzzer mati")) {
      action.type = RoomActionType::StopAlarm;
      return true;
    }

    return false;
  }

private:
  bool hasAny(const String& text, const char* a, const char* b, const char* c = nullptr, const char* d = nullptr, const char* e = nullptr, const char* f = nullptr) {
    return text.indexOf(a) >= 0 ||
           text.indexOf(b) >= 0 ||
           (c && text.indexOf(c) >= 0) ||
           (d && text.indexOf(d) >= 0) ||
           (e && text.indexOf(e) >= 0) ||
           (f && text.indexOf(f) >= 0);
  }
};
