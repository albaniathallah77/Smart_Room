#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "../SmartRoomState.h"

#ifndef AI_GATEWAY_URL
#define AI_GATEWAY_URL ""
#endif

#ifndef CLOUD_DEVICE_TOKEN
#define CLOUD_DEVICE_TOKEN ""
#endif

class CloudCommandClient {
public:
  using CommandCallback = void (*)(const String& payload, void* context);

  void begin(CommandCallback callback, void* context) {
    _callback = callback;
    _context = context;
    
    if (isConfigured()) {
      xTaskCreatePinnedToCore(
        CloudCommandClient::taskFunction,
        "CloudTask",
        8192,
        this,
        1,
        &_taskHandle,
        0 // Jalankan di Core 0 agar tidak mengganggu Core 1 (Main Loop)
      );
    }
  }

  void loop() {
    String pending = "";
    portENTER_CRITICAL(&_mux);
    if (_pendingPayload.length() > 0) {
      pending = _pendingPayload;
      _pendingPayload = "";
    }
    portEXIT_CRITICAL(&_mux);

    if (pending.length() > 0 && _callback) {
      _callback(pending, _context);
    }
  }

  void updateState(const SmartRoomState& state) {
    StaticJsonDocument<512> doc;
    doc["lamp"] = state.deskLampOn;
    doc["rgb"] = state.rgbOn;
    doc["r"] = state.rgbColor.r;
    doc["g"] = state.rgbColor.g;
    doc["b"] = state.rgbColor.b;
    doc["door"] = state.doorOpen;
    doc["tv"] = state.tvOn;
    doc["alarmEnabled"] = state.alarm.enabled;
    doc["alarmRinging"] = state.alarm.ringing;
    doc["alarmHour"] = state.alarm.hour;
    doc["alarmMinute"] = state.alarm.minute;
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["maxHeap"] = ESP.getHeapSize();

    String stateText;
    serializeJson(doc, stateText);

    portENTER_CRITICAL(&_mux);
    _latestState = stateText;
    portEXIT_CRITICAL(&_mux);
  }

private:
  CommandCallback _callback = nullptr;
  void* _context = nullptr;
  TaskHandle_t _taskHandle = NULL;
  String _pendingPayload = "";
  String _latestState = "{}";
  portMUX_TYPE _mux = portMUX_INITIALIZER_UNLOCKED;
  unsigned long _lastErrorLogAt = 0;
  uint8_t _consecutiveErrors = 0;
  bool _cloudConnected = false;

  static void taskFunction(void* parameter) {
    CloudCommandClient* client = (CloudCommandClient*)parameter;
    while (true) {
      if (WiFi.status() == WL_CONNECTED) {
        client->pollCommands();
      }
      vTaskDelay(800 / portTICK_PERIOD_MS); // Dipercepat kembali ke 800ms untuk respon lebih cepat
    }
  }

  bool isConfigured() const {
    return strlen(AI_GATEWAY_URL) > 0 && strlen(CLOUD_DEVICE_TOKEN) > 0;
  }

  String endpoint(const char* path) const {
    String base = AI_GATEWAY_URL;
    if (base.endsWith("/")) {
      base.remove(base.length() - 1);
    }
    return base + path;
  }

  void pollCommands() {
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(8000); 
    if (!http.begin(client, endpoint("/device/poll"))) {
      logError("[Cloud] Error: Unable to begin HTTP connection to Vercel");
      return;
    }

    http.addHeader("Content-Type", "application/json");
    String stateText;
    portENTER_CRITICAL(&_mux);
    stateText = _latestState;
    portEXIT_CRITICAL(&_mux);

    String request = String("{\"token\":\"") + CLOUD_DEVICE_TOKEN + "\",\"state\":" + stateText + "}";
    int status = http.POST(request);
    String response = status > 0 ? http.getString() : "";
    http.end();

    if (status != 200 || response.length() == 0) {
      if (status < 0) {
        String message = String("[Cloud] Poll failed. HTTP Error: ") + http.errorToString(status);
        logError(message);
      } else if (status != 200) {
        String message = String("[Cloud] Poll rejected. Status: ") + status + ", Response: " + response;
        logError(message);
      }
      return;
    }

    markSuccess();

    StaticJsonDocument<2048> doc;
    if (deserializeJson(doc, response)) {
      return;
    }

    JsonArray commands = doc["commands"].as<JsonArray>();
    for (JsonObject command : commands) {
      const char* id = command["id"] | "";
      JsonVariant payload = command["payload"];
      if (!id[0] || payload.isNull()) {
        continue;
      }

      String payloadText;
      if (payload.is<const char*>()) {
        payloadText = payload.as<const char*>();
      } else {
        serializeJson(payload, payloadText);
      }
      
      portENTER_CRITICAL(&_mux);
      _pendingPayload = payloadText;
      portEXIT_CRITICAL(&_mux);
      
      ackCommand(id);
    }
  }

  void ackCommand(const char* id) {
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(5000);
    if (!http.begin(client, endpoint("/device/ack"))) {
      return;
    }

    http.addHeader("Content-Type", "application/json");
    String request = String("{\"token\":\"") + CLOUD_DEVICE_TOKEN + "\",\"id\":\"" + id + "\"}";
    http.POST(request);
    http.end();
  }

  void logError(const String& message) {
    unsigned long now = millis();
    _consecutiveErrors++;

    if (now < 20000 || _consecutiveErrors < 3) {
      return;
    }

    if (now - _lastErrorLogAt < 15000) {
      return;
    }
    _lastErrorLogAt = now;
    _cloudConnected = false;
    Serial.println(message);
  }

  void markSuccess() {
    if (!_cloudConnected && millis() > 20000) {
      Serial.println("[Cloud] Connected");
    }
    _cloudConnected = true;
    _consecutiveErrors = 0;
  }
};
