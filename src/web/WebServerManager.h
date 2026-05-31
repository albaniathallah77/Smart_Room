#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include "../SmartRoomState.h"
#include "../core/CommandParser.h"

#ifndef AI_GATEWAY_URL
#define AI_GATEWAY_URL ""
#endif

class WebServerManager {
public:
  using CommandCallback = void (*)(const String& payload, void* context);

  WebServerManager() : _server(80), _ws("/ws") {}

  void begin(CommandCallback callback, void* context) {
    _callback = callback;
    _context = context;

    _ws.onEvent([this](AsyncWebSocket* server, AsyncWebSocketClient* client, AwsEventType type, void* arg, uint8_t* data, size_t len) {
      handleWsEvent(server, client, type, arg, data, len);
    });

    _server.addHandler(&_ws);

    _server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
      request->send(200, "text/html", dashboardHtml());
    });

    _server.on("/api/command", HTTP_POST, [this](AsyncWebServerRequest* request) {}, nullptr,
      [this](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
        String payload;
        for (size_t i = 0; i < len; i++) {
          payload += static_cast<char>(data[i]);
        }
        if (_callback) {
          _callback(payload, _context);
        }
        request->send(200, "application/json", "{\"ok\":true}");
      }
    );

    _server.begin();
  }

  void loop(const SmartRoomState& state) {
    _ws.cleanupClients();
    if (millis() - _lastBroadcastAt < 250) {
      return;
    }

    _lastBroadcastAt = millis();
    StaticJsonDocument<512> doc;
    doc["lamp"] = state.deskLampOn;
    doc["rgb"] = state.rgbOn;
    doc["r"] = state.rgbColor.r;
    doc["g"] = state.rgbColor.g;
    doc["b"] = state.rgbColor.b;
    doc["door"] = state.doorOpen;
    doc["tv"] = state.tvOn;
    doc["aiOnline"] = state.aiOnline;
    doc["aiStatus"] = state.lastAiStatus;
    doc["alarmEnabled"] = state.alarm.enabled;
    doc["alarmRinging"] = state.alarm.ringing;
    doc["alarmHour"] = state.alarm.hour;
    doc["alarmMinute"] = state.alarm.minute;

    String payload;
    serializeJson(doc, payload);
    _ws.textAll(payload);
  }

private:
  AsyncWebServer _server;
  AsyncWebSocket _ws;
  CommandCallback _callback = nullptr;
  void* _context = nullptr;
  unsigned long _lastBroadcastAt = 0;

  void handleWsEvent(AsyncWebSocket*, AsyncWebSocketClient*, AwsEventType type, void*, uint8_t* data, size_t len) {
    if (type != WS_EVT_DATA || !_callback) {
      return;
    }

    String payload;
    for (size_t i = 0; i < len; i++) {
      payload += static_cast<char>(data[i]);
    }
    _callback(payload, _context);
  }

  static const char* dashboardHtml() {
    return R"HTML(
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Smart Room AI</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; background:#02070b; color:#e9fbff; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; background:radial-gradient(circle at 24% 8%,#07323b 0,#02070b 38%), linear-gradient(135deg,#02070b,#061019); }
    main { width:min(1040px, calc(100% - 28px)); margin:auto; padding:22px 0 30px; }
    header { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:18px; border-bottom:1px solid #103848; padding-bottom:16px; }
    .brand { display:flex; align-items:center; gap:12px; min-width:0; }
    .logo { width:72px; height:72px; flex:0 0 auto; object-fit:contain; filter:drop-shadow(0 0 16px #10ddea88); }
    h1 { font-size:clamp(24px,5vw,42px); margin:0; letter-spacing:0; line-height:1; }
    .sub { color:#7fefff; margin-top:6px; font-size:14px; }
    #net { border:1px solid #126172; color:#7ff7ff; padding:8px 10px; border-radius:7px; background:#061a22; white-space:nowrap; font-size:13px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; }
    .card { border:1px solid #115468; background:linear-gradient(180deg,#08202a,#061018); border-radius:8px; padding:15px; box-shadow:0 12px 28px #0008, inset 0 1px #22e6ff22; min-height:142px; }
    h2 { margin:0 0 13px; font-size:17px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .state { color:#20f3ff; font-weight:800; font-size:13px; border:1px solid #126172; border-radius:999px; padding:3px 8px; background:#021016; }
    .state.warn { color:#ffd36a; border-color:#5f4a12; background:#191202; }
    button, input { border:1px solid #177189; background:#071822; color:#e9fbff; border-radius:7px; padding:11px 12px; font:inherit; min-height:42px; }
    button { cursor:pointer; width:100%; margin-top:8px; font-weight:800; }
    button.primary { background:#08cfe3; border-color:#14efff; color:#001015; }
    button.blue { background:#087cff; border-color:#3295ff; color:white; }
    button.dark { background:#020507; border-color:#1a3944; }
    button:disabled { opacity:.45; cursor:not-allowed; }
    .row { display:flex; gap:8px; align-items:center; }
    .row > * { flex:1; min-width:0; }
    input[type=color] { height:42px; padding:2px; }
    #cmd { width:100%; }
    .ai-reply { min-height:18px; margin-top:10px; color:#7fefff; font-size:13px; line-height:1.35; }
    @media (max-width:560px) { header { align-items:flex-start; flex-direction:column; } #net { width:100%; text-align:center; } .logo { width:56px; height:62px; } }
  </style>
</head>
<body>
<main>
  <header>
    <div class="brand">
      <img class="logo" alt="Smart Room logo" src="data:image/webp;base64,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">
      <div>
        <h1>Smart Room</h1>
        <div class="sub">AI control dashboard</div>
      </div>
    </div>
    <div id="net">Connecting...</div>
  </header>
  <section class="grid">
    <article class="card"><h2>Desk Lamp <span class="state" id="lamp">--</span></h2><button class="primary" onclick="send({device:'lamp',state:'on'})">ON</button><button class="dark" onclick="send({device:'lamp',state:'off'})">OFF</button></article>
    <article class="card"><h2>RGB Room <span class="state" id="rgb">--</span></h2><div class="row"><input id="color" type="color" value="#10ddea"><button class="blue" onclick="rgbColor()">SET</button></div><button class="primary" onclick="send({device:'rgb',state:'on'})">ON</button><button class="dark" onclick="send({device:'rgb',state:'off'})">OFF</button></article>
    <article class="card"><h2>Smart Door <span class="state" id="door">--</span></h2><button class="primary" onclick="send({device:'door',state:'open'})">OPEN</button><button class="dark" onclick="send({device:'door',state:'close'})">CLOSE</button></article>
    <article class="card"><h2>Smart TV <span class="state" id="tv">--</span></h2><button class="primary" onclick="send({device:'tv',state:'on'})">ON</button><button class="dark" onclick="send({device:'tv',state:'off'})">OFF</button></article>
    <article class="card"><h2>Alarm <span class="state" id="alarm">--</span></h2><div class="row"><input id="alarmTime" type="time" value="06:00"><button class="blue" onclick="setAlarm()">SET</button></div><button class="dark" onclick="send({device:'buzzer',state:'off'})">STOP</button></article>
    <article class="card"><h2>AI Command</h2><input id="cmd" placeholder="mode tidur"><button class="primary" onclick="askAi()">ASK AI</button><button class="dark" onclick="sendText()">LOCAL</button><div class="ai-reply" id="aiReply">Gateway ready</div></article>
  </section>
</main>
<script>
  const AI_GATEWAY = ")HTML" AI_GATEWAY_URL R"HTML(";
  let ws;
  function connectWs() {
    ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = () => net.textContent = 'Realtime online';
    ws.onclose = () => {
      net.textContent = 'Realtime reconnecting';
      setTimeout(connectWs, 1200);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = handleState;
  }
  function handleState(event) {
    const s = JSON.parse(event.data);
    lamp.textContent = s.lamp ? 'ON' : 'OFF';
    rgb.textContent = s.rgb ? 'ON' : 'OFF';
    door.textContent = s.door ? 'OPEN' : 'CLOSED';
    tv.textContent = s.tv ? 'ON' : 'OFF';
    alarm.textContent = s.alarmRinging ? 'RINGING' : `${String(s.alarmHour).padStart(2,'0')}:${String(s.alarmMinute).padStart(2,'0')}`;
  }
  connectWs();
  function send(payload) {
    const body = JSON.stringify(payload);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(body);
      return;
    }
    fetch('/api/command', {method:'POST', headers:{'Content-Type':'application/json'}, body});
  }
  function sendText() { if (cmd.value.trim()) sendTextPayload(cmd.value); cmd.value = ''; }
  function sendTextPayload(text) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(text);
      return;
    }
    fetch('/api/command', {method:'POST', headers:{'Content-Type':'text/plain'}, body:text});
  }
  async function askAi() {
    const message = cmd.value.trim();
    if (!message) return;
    cmd.value = '';
    aiReply.textContent = 'AI thinking...';
    if (!AI_GATEWAY) {
      aiReply.textContent = 'Gateway belum diset, pakai local command.';
      sendTextPayload(message);
      return;
    }
    try {
      const response = await fetch(`${AI_GATEWAY}/chat`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message})
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.reply || result.error || 'AI failed');
      aiReply.textContent = result.reply || 'Siap.';
      const commands = Array.isArray(result.commands) ? result.commands : (result.command ? [result.command] : []);
      for (const command of commands) send(command);
    } catch (error) {
      aiReply.textContent = 'AI offline, pakai local command.';
      sendTextPayload(message);
    }
  }
  function rgbColor() {
    const hex = color.value.slice(1);
    send({device:'rgb', r:parseInt(hex.slice(0,2),16), g:parseInt(hex.slice(2,4),16), b:parseInt(hex.slice(4,6),16)});
  }
  function setAlarm() {
    const [hour, minute] = alarmTime.value.split(':').map(Number);
    send({device:'alarm', enabled:true, hour, minute});
  }
</script>
</body>
</html>
)HTML";
  }
};
