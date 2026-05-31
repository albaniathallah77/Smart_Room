#pragma once

#include <Arduino.h>
#include <ESP32Servo.h>

#ifndef DOOR_CLOSED_ANGLE
#define DOOR_CLOSED_ANGLE 90
#endif

#ifndef DOOR_OPEN_ANGLE
#define DOOR_OPEN_ANGLE 135
#endif

class SmartDoor {
public:
  void begin(uint8_t pin, uint8_t closedAngle = DOOR_CLOSED_ANGLE, uint8_t openAngle = DOOR_OPEN_ANGLE) {
    _pin = pin;
    _closedAngle = closedAngle;
    _openAngle = openAngle;

    _servo.setPeriodHertz(50);
  }

  void set(bool open) {
    _open = open;
    moveTo(_open ? _openAngle : _closedAngle);
  }

  void writeAngle(uint8_t angle) {
    moveTo(angle);
  }

  void loop() {
    if (_detachAt != 0 && static_cast<long>(millis() - _detachAt) >= 0) {
      detach();
      _detachAt = 0;
    }
  }

  bool isOpen() const {
    return _open;
  }

private:
  Servo _servo;
  uint8_t _pin = 255;
  uint8_t _closedAngle = DOOR_CLOSED_ANGLE;
  uint8_t _openAngle = DOOR_OPEN_ANGLE;
  bool _open = false;
  unsigned long _detachAt = 0;

  void moveTo(uint8_t angle) {
    attach();
    _servo.write(angle);
    _detachAt = millis() + 1000;
  }

  void attach() {
    if (!_servo.attached()) {
      _servo.attach(_pin, 500, 2400);
    }
  }

  void detach() {
    if (_servo.attached()) {
      _servo.detach();
    }
  }
};
