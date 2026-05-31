#pragma once

#include <Arduino.h>

class SmartBuzzer {
public:
  void begin(uint8_t pin) {
    _pin = pin;
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
  }

  void startAlarm() {
    _ringing = true;
    _beepOn = false;
    _pinHigh = false;
    _lastBeepToggleAt = 0;
    _lastWaveToggleAt = micros();
  }

  void stop() {
    _ringing = false;
    _beepOn = false;
    _pinHigh = false;
    digitalWrite(_pin, LOW);
  }

  void loop() {
    if (!_ringing) {
      return;
    }

    unsigned long now = millis();
    if (now - _lastBeepToggleAt >= 450) {
      _lastBeepToggleAt = now;
      _beepOn = !_beepOn;
      if (!_beepOn) {
        _pinHigh = false;
        digitalWrite(_pin, LOW);
      }
    }

    if (!_beepOn) {
      return;
    }

    unsigned long waveNow = micros();
    if (waveNow - _lastWaveToggleAt >= 500) {
      _lastWaveToggleAt = waveNow;
      _pinHigh = !_pinHigh;
      digitalWrite(_pin, _pinHigh ? HIGH : LOW);
    }
  }

  bool isRinging() const {
    return _ringing;
  }

private:
  uint8_t _pin = 255;
  bool _ringing = false;
  bool _beepOn = false;
  bool _pinHigh = false;
  unsigned long _lastBeepToggleAt = 0;
  unsigned long _lastWaveToggleAt = 0;
};
