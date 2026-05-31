#pragma once

#include <Arduino.h>
#include <time.h>
#include "../SmartRoomState.h"
#include "CommandParser.h"

struct ScheduleItem {
  bool enabled = false;
  uint8_t hour = 0;
  uint8_t minute = 0;
  RoomAction action;
  int lastRunDay = -1;
};

class Scheduler {
public:
  using ActionCallback = void (*)(const RoomAction& action, void* context);

  void begin(ActionCallback callback, void* context) {
    _callback = callback;
    _context = context;
  }

  bool addDaily(uint8_t hour, uint8_t minute, const RoomAction& action) {
    for (auto& item : _items) {
      if (!item.enabled) {
        item.enabled = true;
        item.hour = hour;
        item.minute = minute;
        item.action = action;
        item.lastRunDay = -1;
        return true;
      }
    }
    return false;
  }

  void loop() {
    if (!_callback) {
      return;
    }

    struct tm now;
    if (!getLocalTime(&now, 20)) {
      return;
    }

    for (auto& item : _items) {
      if (!item.enabled) {
        continue;
      }

      if (item.hour == now.tm_hour && item.minute == now.tm_min && item.lastRunDay != now.tm_yday) {
        item.lastRunDay = now.tm_yday;
        _callback(item.action, _context);
      }
    }
  }

private:
  ScheduleItem _items[12];
  ActionCallback _callback = nullptr;
  void* _context = nullptr;
};
