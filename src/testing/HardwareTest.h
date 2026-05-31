#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "../PinMap.h"
#include "../devices/SmartLamp.h"
#include "../devices/RgbRoomLight.h"
#include "../devices/SmartDoor.h"
#include "../devices/SmartBuzzer.h"

class HardwareTest {
public:
  HardwareTest() : _display(128, 64, &Wire, -1) {}

  void begin() {
    Serial.println();
    Serial.println("SMART ROOM HARDWARE TEST");
    Serial.println("Open Serial Monitor at 115200 baud.");
    Serial.println("Commands: 1 lamp, 2 rgb, 4 buzzer, 5 oled, 6 door, 7 door sweep, r rgb off, R/G/B colors, s safe test");

    _lamp.begin(PinMap::DeskLamp);
    _rgb.begin(PinMap::RgbRed, PinMap::RgbGreen, PinMap::RgbBlue);
    _door.begin(PinMap::DoorServo);
    _buzzer.begin(PinMap::Buzzer);

    Wire.begin(PinMap::I2cSda, PinMap::I2cScl);
    _oledAvailable = _display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
    if (_oledAvailable) {
      renderOled("Hardware Test", "OLED OK");
    } else {
      Serial.println("OLED not detected at 0x3C.");
    }
  }

  void loop() {
    _buzzer.loop();

    if (!Serial.available()) {
      return;
    }

    char command = Serial.read();
    switch (command) {
      case '1':
        testLamp();
        break;
      case '2':
        testRgb();
        break;
      case '4':
        testBuzzer();
        break;
      case '5':
        testOled();
        break;
      case '6':
        testDoor();
        break;
      case '7':
        testDoorSweep();
        break;
      case 'r':
        Serial.println("RGB forced OFF.");
        _rgb.set(false);
        break;
      case 'R':
        Serial.println("RGB RED.");
        _rgb.setColor(RgbColor(255, 0, 0));
        _rgb.set(true);
        break;
      case 'G':
        Serial.println("RGB GREEN.");
        _rgb.setColor(RgbColor(0, 255, 0));
        _rgb.set(true);
        break;
      case 'B':
        Serial.println("RGB BLUE.");
        _rgb.setColor(RgbColor(0, 0, 255));
        _rgb.set(true);
        break;
      case 's':
      case 'S':
        testSafeDevices();
        break;
      case 'a':
      case 'A':
        testSafeDevices();
        break;
      default:
        break;
    }
  }

private:
  SmartLamp _lamp;
  RgbRoomLight _rgb;
  SmartDoor _door;
  SmartBuzzer _buzzer;
  Adafruit_SSD1306 _display;
  bool _oledAvailable = false;

  void testLamp() {
    Serial.println("Testing desk lamp on GPIO 25.");
    _lamp.set(true);
    delay(1000);
    _lamp.set(false);
    delay(400);
    Serial.println("Desk lamp test done.");
  }

  void testRgb() {
    Serial.println("Testing RGB common-anode on GPIO 16/17/18.");
    _rgb.set(true);
    _rgb.setColor(RgbColor(255, 0, 0));
    delay(800);
    _rgb.setColor(RgbColor(0, 255, 0));
    delay(800);
    _rgb.setColor(RgbColor(0, 0, 255));
    delay(800);
    _rgb.setColor(RgbColor(90, 160, 255));
    delay(800);
    _rgb.set(false);
    Serial.println("RGB test done.");
  }

  void testDoor() {
    Serial.println("Testing smart door servo on GPIO 19.");
    Serial.print("Closed angle: ");
    Serial.println(DOOR_CLOSED_ANGLE);
    Serial.print("Open angle: ");
    Serial.println(DOOR_OPEN_ANGLE);
    Serial.println("Door OPEN.");
    _door.set(true);
    Serial.println("Waiting 5 seconds before closing.");
    delay(5000);
    Serial.println("Door CLOSED.");
    _door.set(false);
    delay(800);
    Serial.println("Smart door test done.");
  }

  void testDoorSweep() {
    Serial.println("Door calibration sweep. Watch which angle clears the casing.");
    const uint8_t angles[] = {150, 135, 120, 105, 90, 75, 60, 45, 30, 15, 0};
    for (uint8_t i = 0; i < sizeof(angles); i++) {
      Serial.print("Servo angle: ");
      Serial.println(angles[i]);
      _door.writeAngle(angles[i]);
      delay(1200);
    }
    Serial.println("Door sweep done. Servo stays at the last angle.");
  }

  void testSafeDevices() {
    Serial.println("Testing LED, RGB, buzzer, and OLED only.");
    testLamp();
    testRgb();
    testBuzzer();
    testOled();
    Serial.println("Safe hardware tests done.");
  }

  void testBuzzer() {
    Serial.println("Testing passive buzzer on GPIO 27.");
    _buzzer.startAlarm();
    unsigned long startedAt = millis();
    while (millis() - startedAt < 2200) {
      _buzzer.loop();
      delay(10);
    }
    _buzzer.stop();
    Serial.println("Buzzer test done.");
  }

  void testOled() {
    Serial.println("Testing OLED on I2C SDA 21 / SCL 22.");
    if (!_oledAvailable) {
      Serial.println("OLED not available. Check VCC, GND, SDA, SCL, and address 0x3C.");
      return;
    }

    renderOled("Smart Room AI", "OLED display OK");
    delay(1000);
    Serial.println("OLED test done.");
  }

  void renderOled(const char* line1, const char* line2) {
    if (!_oledAvailable) {
      return;
    }

    _display.clearDisplay();
    _display.setTextColor(SSD1306_WHITE);
    _display.setTextSize(1);
    _display.setCursor(0, 0);
    _display.print(line1);
    _display.setCursor(0, 18);
    _display.print(line2);
    _display.setCursor(0, 42);
    _display.print("GPIO test ready");
    _display.display();
  }
};
