#pragma once

#include <Arduino.h>
#if __has_include(<esp_arduino_version.h>)
#include <esp_arduino_version.h>
#endif
#include "../SmartRoomState.h"

#ifndef RGB_COMMON_ANODE
#define RGB_COMMON_ANODE 1
#endif

class RgbRoomLight {
public:
  void begin(uint8_t redPin, uint8_t greenPin, uint8_t bluePin) {
    _redPin = redPin;
    _greenPin = greenPin;
    _bluePin = bluePin;

    ensurePwmAttached();

    setColor(RgbColor(90, 160, 255));
    set(false);
  }

  void set(bool on) {
    _on = on;
    if (_on) {
      ensurePwmAttached();
    }
    write();
  }

  void setColor(RgbColor color) {
    _color = color;
    if (_on) {
      ensurePwmAttached();
    }
    write();
  }

  bool isOn() const {
    return _on;
  }

  RgbColor color() const {
    return _color;
  }

private:
  uint8_t _redPin = 255;
  uint8_t _greenPin = 255;
  uint8_t _bluePin = 255;
  uint8_t _redChannel = 8;
  uint8_t _greenChannel = 9;
  uint8_t _blueChannel = 10;
  uint32_t _pwmFrequency = 5000;
  uint8_t _pwmResolution = 8;
  bool _on = false;
  bool _pwmAttached = false;
  RgbColor _color;

  void attachPwm(uint8_t pin, uint8_t channel) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttachChannel(pin, _pwmFrequency, _pwmResolution, channel);
#else
    ledcSetup(channel, _pwmFrequency, _pwmResolution);
    ledcAttachPin(pin, channel);
#endif
    _pwmAttached = true;
  }

  void ensurePwmAttached() {
    if (_pwmAttached) {
      return;
    }

    attachPwm(_redPin, _redChannel);
    attachPwm(_greenPin, _greenChannel);
    attachPwm(_bluePin, _blueChannel);
    _pwmAttached = true;
  }

  void detachPwm() {
    if (!_pwmAttached) {
      return;
    }

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcDetach(_redPin);
    ledcDetach(_greenPin);
    ledcDetach(_bluePin);
#else
    ledcDetachPin(_redPin);
    ledcDetachPin(_greenPin);
    ledcDetachPin(_bluePin);
#endif
    _pwmAttached = false;
  }

  void writeChannel(uint8_t pin, uint8_t channel, uint8_t value) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
#if RGB_COMMON_ANODE
    ledcWrite(pin, 255 - value);
#else
    ledcWrite(pin, value);
#endif
#else
#if RGB_COMMON_ANODE
    ledcWrite(channel, 255 - value);
#else
    ledcWrite(channel, value);
#endif
#endif
  }

  void write() {
    if (!_on) {
      forceOffLevel();
      return;
    }

    ensurePwmAttached();
    writeChannel(_redPin, _redChannel, _color.r);
    writeChannel(_greenPin, _greenChannel, _color.g);
    writeChannel(_bluePin, _blueChannel, _color.b);
  }

  void forceOffLevel() {
    detachPwm();
    pinMode(_redPin, OUTPUT);
    pinMode(_greenPin, OUTPUT);
    pinMode(_bluePin, OUTPUT);
#if RGB_COMMON_ANODE
    digitalWrite(_redPin, HIGH);
    digitalWrite(_greenPin, HIGH);
    digitalWrite(_bluePin, HIGH);
#else
    digitalWrite(_redPin, LOW);
    digitalWrite(_greenPin, LOW);
    digitalWrite(_bluePin, LOW);
#endif
  }
};
