#pragma once

#include <Arduino.h>

namespace PinMap {
constexpr uint8_t DeskLamp = 25;
constexpr uint8_t Buzzer = 27;
constexpr uint8_t DoorServo = 19;

// Common-anode RGB LED: PWM LOW = bright, HIGH = off.
constexpr uint8_t RgbRed = 16;
constexpr uint8_t RgbGreen = 17;
constexpr uint8_t RgbBlue = 18;

constexpr uint8_t I2cSda = 21;
constexpr uint8_t I2cScl = 22;
}
