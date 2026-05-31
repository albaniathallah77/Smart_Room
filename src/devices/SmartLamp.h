#pragma once

#include <Arduino.h>

class SmartLamp {
public:
  void begin(uint8_t pin) {
    _pin = pin;
    pinMode(_pin, OUTPUT);
    set(false);
  }

  void set(bool on) {
    _on = on;
    digitalWrite(_pin, _on ? HIGH : LOW);
  }

  bool isOn() const {
    return _on;
  }

private:
  uint8_t _pin = 255;
  bool _on = false;
};
