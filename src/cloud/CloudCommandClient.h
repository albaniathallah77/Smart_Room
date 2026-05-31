#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

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
  }

  void loop() {
    if (!_callback || WiFi.status() != WL_CONNECTED || !isConfigured()) {
      return;
    }

    const unsigned long now = millis();
    if (_busy || now - _lastPollAt < 3000) {
      return;
    }

    _busy = true;
    _lastPollAt = now;
    pollCommands();
    _busy = false;
  }

private:
  CommandCallback _callback = nullptr;
  void* _context = nullptr;
  unsigned long _lastPollAt = 0;
  bool _busy = false;

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
    http.setTimeout(2500);
    if (!http.begin(client, endpoint("/device/poll"))) {
      return;
    }

    http.addHeader("Content-Type", "application/json");
    String request = String("{\"token\":\"") + CLOUD_DEVICE_TOKEN + "\"}";
    int status = http.POST(request);
    String response = status > 0 ? http.getString() : "";
    http.end();

    if (status != 200 || response.length() == 0) {
      return;
    }

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
      serializeJson(payload, payloadText);
      _callback(payloadText, _context);
      ackCommand(id);
    }
  }

  void ackCommand(const char* id) {
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(2000);
    if (!http.begin(client, endpoint("/device/ack"))) {
      return;
    }

    http.addHeader("Content-Type", "application/json");
    String request = String("{\"token\":\"") + CLOUD_DEVICE_TOKEN + "\",\"id\":\"" + id + "\"}";
    http.POST(request);
    http.end();
  }
};
