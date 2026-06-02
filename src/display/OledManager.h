#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include "CatAnimationFrames.h"
#include "StikmanAnimationFrames.h"
#include "KacauAnimationFrames.h"
#include "KenzieAnimationFrames.h"
#include "WalkAnimationFrames.h"
#include "StartupLogoBitmap.h"
#include "../SmartRoomState.h"

class OledManager {
public:
  OledManager() : _display(128, 64, &Wire, -1) {}

  void begin(uint8_t sda, uint8_t scl) {
    Wire.begin(sda, scl);

    if (!_display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
      _available = false;
      Serial.println("OLED not detected at 0x3C.");
      return;
    }

    _available = true;
    Serial.println("OLED ready at 0x3C.");
    _display.clearDisplay();
    _display.setTextColor(SSD1306_WHITE);
    _display.display();
  }

  void loop(const SmartRoomState& state) {
    if (!_available) {
      return;
    }

    const uint8_t oledMode = currentOledMode(state);
    if (oledMode == 0) {
      _activeOledMode = 0;
      _splashActive = false;
    } else if (oledMode != _activeOledMode) {
      _activeOledMode = oledMode;
      _animationFrame = 0;
      _splashActive = !state.alarm.ringing;
      _splashStartedAt = millis();
      if (_splashActive) {
        renderStartupLogo();
        _lastRenderAt = millis();
        _lastTvOn = true;
        return;
      }
    }

    if (_splashActive) {
      if (millis() - _splashStartedAt < OledStartupLogo::SPLASH_MS) {
        return;
      }
      _splashActive = false;
      _lastRenderAt = 0;
    }

    // PRIORITAS 1: mode animasi khusus (harus di paling atas)
    if (state.catMode) {
      if (millis() - _lastRenderAt < OledCatAnimation::FRAME_DELAY_MS) return;
      renderCatScene(_animationFrame++);
      _lastRenderAt = millis();
      _lastTvOn = true;
      return;
    }

    if (state.stikmanMode) {
      if (millis() - _lastRenderAt < OledStikmanAnimation::FRAME_DELAY_MS) return;
      renderStikmanScene(_animationFrame++);
      _lastRenderAt = millis();
      _lastTvOn = true;
      return;
    }

    if (state.kacauMode) {
      if (millis() - _lastRenderAt < OledKacauAnimation::FRAME_DELAY_MS) return;
      renderKacauScene(_animationFrame++);
      _lastRenderAt = millis();
      _lastTvOn = true;
      return;
    }

    if (state.kenzieMode) {
      if (millis() - _lastRenderAt < OledKenzieAnimation::FRAME_DELAY_MS) return;
      renderKenzieScene(_animationFrame++);
      _lastRenderAt = millis();
      _lastTvOn = true;
      return;
    }

    if (state.fightMode) {
      if (millis() - _lastRenderAt < OledWalkAnimation::FRAME_DELAY_MS) return;
      renderFightScene(_animationFrame++);
      _lastRenderAt = millis();
      _lastTvOn = true; // Paksa status TV on agar tidak tertutup logika lain
      return;
    }

    if (state.tvOn != _lastTvOn) {
      _lastTvOn = state.tvOn;
      if (state.tvOn) {
        if (!state.alarm.ringing) {
          renderMochiStill("HELLO!", 0);
          _lastMochiAt = millis();
        }
      } else {
        _display.clearDisplay();
        _display.display();
      }
      _lastRenderAt = millis();
      return;
    }

    if (state.tvOn && !state.alarm.ringing && state.doorOpen != _lastDoorOpen) {
      _lastDoorOpen = state.doorOpen;
      renderDoorStill(state.doorOpen);
      _lastRenderAt = millis();
      return;
    }

    if (!state.tvOn || millis() - _lastRenderAt < 800) {
      return;
    }

    _lastRenderAt = millis();

    char timeText[16] = "--:--:--";
    struct tm now;
    if (getLocalTime(&now, 10)) {
      snprintf(timeText, sizeof(timeText), "%02d:%02d:%02d", now.tm_hour, now.tm_min, now.tm_sec);
    }

    _display.clearDisplay();
    _display.setTextSize(1);
    _display.drawRect(0, 0, 128, 54, SSD1306_WHITE);
    _display.fillRect(28, 55, 72, 2, SSD1306_WHITE);
    _display.drawLine(52, 57, 44, 63, SSD1306_WHITE);
    _display.drawLine(76, 57, 84, 63, SSD1306_WHITE);
    _display.setCursor(34, 4);
    _display.print("SMART TV");
    _display.setCursor(4, 16);
    _display.print(timeText);
    _display.setCursor(4, 28);
    _display.print("Lamp:");
    _display.print(state.deskLampOn ? "ON " : "OFF");
    _display.setCursor(4, 40);
    _display.print("Door:");
    _display.print(state.doorOpen ? "OPEN " : "CLOSE");
    _display.setCursor(4, 48);
    _display.print("RGB:");
    _display.print(state.rgbOn ? "ON " : "OFF");
    _display.print(" Alarm ");
    _display.printf("%02d:%02d", state.alarm.hour, state.alarm.minute);
    _display.display();
  }

private:
  Adafruit_SSD1306 _display;
  bool _available = false;
  bool _lastTvOn = false;
  bool _lastDoorOpen = false;
  uint8_t _mochiScene = 0;
  uint8_t _animationFrame = 0;
  uint8_t _activeOledMode = 0;
  bool _splashActive = false;
  unsigned long _lastRenderAt = 0;
  unsigned long _lastMochiAt = 0;
  unsigned long _splashStartedAt = 0;

  uint8_t currentOledMode(const SmartRoomState& state) const {
    if (!state.tvOn) return 0;
    if (state.catMode) return 1;
    if (state.stikmanMode) return 2;
    if (state.kacauMode) return 3;
    if (state.kenzieMode) return 4;
    if (state.fightMode) return 5;
    return 7;
  }

  const char* mochiLabel(uint8_t scene) {
    switch (scene) {
      case 0:
        return "MOCHI HAPPY";
      case 1:
        return "MOCHI BLINK";
      case 2:
        return "MOCHI SLEEP";
      default:
        return "MOCHI WOW";
    }
  }

  void renderMochiStill(const char* label, uint8_t scene) {
    _display.clearDisplay();
    drawMochiFace(64, 34, scene, scene);
    _display.setTextSize(1);
    _display.setCursor(34, 4);
    _display.print(label);
    _display.display();
  }

  void renderDoorStill(bool open) {
    _display.clearDisplay();
    drawDoorScene(open ? 4 : 0);
    _display.display();
  }

  void renderStartupLogo() {
    _display.clearDisplay();
    _display.drawBitmap(0, 0, OledStartupLogo::LOGO,
                        OledStartupLogo::WIDTH,
                        OledStartupLogo::HEIGHT,
                        SSD1306_WHITE);
    _display.display();
  }

  void drawMochiFace(uint8_t x, uint8_t y, uint8_t scene, uint8_t frame) {
    _display.fillRoundRect(x - 22, y - 14, 44, 31, 13, SSD1306_WHITE);
    if (scene == 1 && frame % 2) {
      _display.drawLine(x - 13, y - 3, x - 5, y - 3, SSD1306_BLACK);
      _display.drawLine(x + 5, y - 3, x + 13, y - 3, SSD1306_BLACK);
    } else if (scene == 2) {
      _display.drawLine(x - 13, y - 3, x - 5, y - 1, SSD1306_BLACK);
      _display.drawLine(x + 5, y - 1, x + 13, y - 3, SSD1306_BLACK);
      _display.setCursor(x + 24, y - 13);
      _display.print("Z");
    } else {
      _display.fillCircle(x - 9, y - 4, scene == 3 ? 3 : 2, SSD1306_BLACK);
      _display.fillCircle(x + 9, y - 4, scene == 3 ? 3 : 2, SSD1306_BLACK);
    }

    if (scene == 0) {
      _display.drawLine(x - 6, y + 6, x - 2, y + 9, SSD1306_BLACK);
      _display.drawLine(x - 2, y + 9, x + 4, y + 8, SSD1306_BLACK);
      _display.drawLine(x + 4, y + 8, x + 7, y + 5, SSD1306_BLACK);
    } else if (scene == 3) {
      _display.drawCircle(x, y + 7, 4, SSD1306_BLACK);
    } else {
      _display.drawLine(x - 4, y + 7, x + 4, y + 7, SSD1306_BLACK);
    }

    _display.drawLine(x - 24, y + 1, x - 34, y + (frame % 2 ? -6 : 7), SSD1306_WHITE);
    _display.drawLine(x + 24, y + 1, x + 34, y + (frame % 2 ? 7 : -6), SSD1306_WHITE);
    _display.drawLine(x - 11, y + 18, x - 16, y + 23, SSD1306_WHITE);
    _display.drawLine(x + 11, y + 18, x + 16, y + 23, SSD1306_WHITE);
  }

  void drawDoorScene(uint8_t frame) {
    uint8_t doorRight = 72 + (frame * 5);
    _display.setTextSize(1);
    _display.setCursor(33, 4);
    _display.print(frame > 2 ? "DOOR OPEN" : "DOOR CLOSE");
    _display.drawRect(68, 16, 28, 40, SSD1306_WHITE);
    _display.drawLine(68, 16, doorRight, 20, SSD1306_WHITE);
    _display.drawLine(68, 56, doorRight, 52, SSD1306_WHITE);
    _display.drawLine(doorRight, 20, doorRight, 52, SSD1306_WHITE);
    _display.fillCircle(doorRight - 4, 38, 1, SSD1306_WHITE);
    drawStickman(35, 39, frame);
  }

  void renderFightScene(uint8_t frame) {
    const uint8_t frameIndex = frame % OledWalkAnimation::FRAME_COUNT;
    _display.clearDisplay();
    _display.drawBitmap(32, 0, OledWalkAnimation::WALK_FRAMES[frameIndex],
                        OledWalkAnimation::FRAME_WIDTH,
                        OledWalkAnimation::FRAME_HEIGHT,
                        SSD1306_WHITE);
    _display.display();
  }

  void renderCatScene(uint8_t frame) {
    const uint8_t frameIndex = frame % OledCatAnimation::FRAME_COUNT;
    _display.clearDisplay();
    _display.drawBitmap(0, 0, OledCatAnimation::CAT_FRAMES[frameIndex],
                        OledCatAnimation::FRAME_WIDTH,
                        OledCatAnimation::FRAME_HEIGHT,
                        SSD1306_WHITE);
    _display.display();
  }

  void renderStikmanScene(uint8_t frame) {
    const uint8_t frameIndex = frame % OledStikmanAnimation::FRAME_COUNT;
    _display.clearDisplay();
    _display.drawBitmap(0, 0, OledStikmanAnimation::STIKMAN_FRAMES[frameIndex],
                        OledStikmanAnimation::FRAME_WIDTH,
                        OledStikmanAnimation::FRAME_HEIGHT,
                        SSD1306_WHITE);
    _display.display();
  }

  void renderKacauScene(uint8_t frame) {
    const uint8_t frameIndex = frame % OledKacauAnimation::FRAME_COUNT;
    _display.clearDisplay();
    _display.drawBitmap(0, 0, OledKacauAnimation::KACAU_FRAMES[frameIndex],
                        OledKacauAnimation::FRAME_WIDTH,
                        OledKacauAnimation::FRAME_HEIGHT,
                        SSD1306_WHITE);
    _display.display();
  }

  void renderKenzieScene(uint8_t frame) {
    const uint8_t frameIndex = frame % OledKenzieAnimation::FRAME_COUNT;
    _display.clearDisplay();
    _display.drawBitmap(0, 0, OledKenzieAnimation::KENZIE_FRAMES[frameIndex],
                        OledKenzieAnimation::FRAME_WIDTH,
                        OledKenzieAnimation::FRAME_HEIGHT,
                        SSD1306_WHITE);
    _display.display();
  }

  void drawStickmanPose(int16_t x, int16_t y, int8_t hX, int8_t hY, int8_t aLX, int8_t aLY, int8_t aRX, int8_t aRY, int8_t lLX, int8_t lLY, int8_t lRX, int8_t lRY) {
    _display.drawCircle(x + hX, y + hY, 3, SSD1306_WHITE); // Head
    _display.drawLine(x + hX, y + hY + 3, x, y + 4, SSD1306_WHITE); // Neck
    _display.drawLine(x, y + 4, x, y + 12, SSD1306_WHITE); // Torso
    _display.drawLine(x, y + 5, x + aLX, y + 5 + aLY, SSD1306_WHITE); // Arm L
    _display.drawLine(x, y + 5, x + aRX, y + 5 + aRY, SSD1306_WHITE); // Arm R
    _display.drawLine(x, y + 12, x + lLX, y + 12 + lLY, SSD1306_WHITE); // Leg L
    _display.drawLine(x, y + 12, x + lRX, y + 12 + lRY, SSD1306_WHITE); // Leg R
  }

  void drawStickman(uint8_t x, uint8_t y, uint8_t frame) {
    _display.drawCircle(x, y - 15, 5, SSD1306_WHITE);
    _display.drawLine(x, y - 10, x, y + 8, SSD1306_WHITE);
    _display.drawLine(x, y - 4, x + 18, y - 10 + frame, SSD1306_WHITE);
    _display.drawLine(x, y - 3, x - 10, y + 2, SSD1306_WHITE);
    _display.drawLine(x, y + 8, x - 9, y + 20, SSD1306_WHITE);
    _display.drawLine(x, y + 8, x + 9, y + 20, SSD1306_WHITE);
  }
};
