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
  StopAlarm,
  SetFightMode,
  SetCatMode,
  SetStikmanMode,
  SetKacauMode,
  ScanWifi,
  SetWifiCredentials,
  SetWifiMode
};

struct RoomAction {
  RoomActionType type = RoomActionType::None;
  bool enabled = false;
  bool hasTime = false;
  RgbColor color;
  uint8_t hour = 0;
  uint8_t minute = 0;
  String ssid;
  String password;
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
      if (state == "fight" || state == "animation") {
        action.type = RoomActionType::SetFightMode;
        action.enabled = true;
        return true;
      }
      if (state == "cat" || state == "kucing") {
        action.type = RoomActionType::SetCatMode;
        action.enabled = true;
        return true;
      }
      if (state == "stikman" || state == "stickman") {
        action.type = RoomActionType::SetStikmanMode;
        action.enabled = true;
        return true;
      }
      if (state == "kacau" || state == "kicau" || state == "chaos") {
        action.type = RoomActionType::SetKacauMode;
        action.enabled = true;
        return true;
      }
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
      action.hasTime = doc.containsKey("hour") && doc.containsKey("minute");
      action.hour = doc["hour"] | 6;
      action.minute = doc["minute"] | 0;
      return true;
    }

    if (device == "wifi" || device == "network") {
      if (state == "scan" || state == "check" || state == "cek") {
        action.type = RoomActionType::ScanWifi;
        return true;
      }
      if (state == "hotspot" || state == "ap" || state == "setup") {
        action.type = RoomActionType::SetWifiMode;
        action.enabled = true;
        return true;
      }
      if (state == "wifi" || state == "sta" || state == "station") {
        action.type = RoomActionType::SetWifiMode;
        action.enabled = false;
        return true;
      }
      if (state == "connect" || state == "set" || doc.containsKey("ssid")) {
        action.type = RoomActionType::SetWifiCredentials;
        action.ssid = String(doc["ssid"] | "");
        action.password = String(doc["password"] | "");
        return action.ssid.length() > 0;
      }
    }

    if (device == "buzzer" && state == "off") {
      action.type = RoomActionType::StopAlarm;
      return true;
    }

    return false;
  }

  bool parseNaturalLanguage(String text, RoomAction& action) {
    text.toLowerCase();

    if (text == "cat" || hasAny(text, "animasi cat", "cat animation", "kucing", "mode cat")) {
      action.type = RoomActionType::SetCatMode;
      action.enabled = true;
      return true;
    }

    if (text == "stikman" || hasAny(text, "animasi stikman", "animasi stickman", "mode stikman", "mode stickman")) {
      action.type = RoomActionType::SetStikmanMode;
      action.enabled = true;
      return true;
    }

    if (text == "kacau" || text == "kicau" || hasAny(text, "animasi kacau", "animasi kicau", "mode kacau", "mode kicau", "chaos animation", "mode chaos")) {
      action.type = RoomActionType::SetKacauMode;
      action.enabled = true;
      return true;
    }

    if (hasAny(text, "scan wifi", "cek wifi", "wifi terkuat", "jaringan terkuat")) {
      action.type = RoomActionType::ScanWifi;
      return true;
    }

    if (hasAny(text, "mode hotspot", "hotspot mode", "nyalakan hotspot", "setup hotspot")) {
      action.type = RoomActionType::SetWifiMode;
      action.enabled = true;
      return true;
    }

    if (hasAny(text, "mode wifi", "wifi mode", "pakai wifi", "matikan hotspot")) {
      action.type = RoomActionType::SetWifiMode;
      action.enabled = false;
      return true;
    }

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

    if (hasAny(text, "bangun", "alarm", "ingatkan", "wake")) {
      uint8_t hour = 0;
      uint8_t minute = 0;
      if (parseTime(text, hour, minute)) {
        action.type = RoomActionType::SetAlarm;
        action.enabled = true;
        action.hasTime = true;
        action.hour = hour;
        action.minute = minute;
        return true;
      }
    }

    return false;
  }

private:
  bool parseTime(const String& text, uint8_t& hour, uint8_t& minute) {
    int start = -1;
    for (int i = 0; i < text.length(); i++) {
      if (isDigit(text[i])) {
        start = i;
        break;
      }
    }

    if (start < 0) {
      return false;
    }

    int endHour = start;
    while (endHour < text.length() && isDigit(text[endHour])) {
      endHour++;
    }

    int h = text.substring(start, endHour).toInt();
    int m = 0;

    if (endHour < text.length() && (text[endHour] == ':' || text[endHour] == '.')) {
      int startMinute = endHour + 1;
      int endMinute = startMinute;
      while (endMinute < text.length() && isDigit(text[endMinute])) {
        endMinute++;
      }
      m = text.substring(startMinute, endMinute).toInt();
    }

    if ((text.indexOf("malam") >= 0 || text.indexOf("pm") >= 0) && h >= 1 && h <= 11) {
      h += 12;
    }

    if (h < 0 || h > 23 || m < 0 || m > 59) {
      return false;
    }

    hour = static_cast<uint8_t>(h);
    minute = static_cast<uint8_t>(m);
    return true;
  }

  bool hasAny(const String& text, const char* a, const char* b, const char* c = nullptr, const char* d = nullptr, const char* e = nullptr, const char* f = nullptr) {
    return text.indexOf(a) >= 0 ||
           text.indexOf(b) >= 0 ||
           (c && text.indexOf(c) >= 0) ||
           (d && text.indexOf(d) >= 0) ||
           (e && text.indexOf(e) >= 0) ||
           (f && text.indexOf(f) >= 0);
  }
};
