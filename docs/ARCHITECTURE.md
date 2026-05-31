# Smart Room AI System Architecture

## Target

Smart Room AI System adalah sistem ESP32 untuk simulasi kamar pintar modern. Kontrol utama dilakukan lewat web dashboard, WebSocket realtime, command parser, scheduler, OLED, dan AI gateway.

## Prinsip desain

- ESP32 fokus pada hardware control, realtime state, local dashboard, dan fail-safe.
- API key Groq/Tavily tidak disimpan di ESP32. Key disimpan di backend gateway.
- Semua device punya modul sendiri agar wiring, logic, dan debugging tidak bercampur.
- State device disimpan di satu `SmartRoomState` lalu disiarkan via WebSocket.
- Scheduler berjalan lokal memakai NTP agar device tetap bisa otomatis tanpa internet API setiap saat.

## Layer

1. Hardware device layer
   - `SmartLamp`
   - `RgbRoomLight`
   - `SmartFan`
   - `SmartBuzzer`
   - `OledManager`

2. Core layer
   - `SmartRoomState`
   - `CommandParser`
   - `Scheduler`
   - `SmartRoomSystem`

3. Realtime/web layer
   - HTTP dashboard di ESP32
   - WebSocket `/ws`
   - REST command endpoint `/api/command`

4. AI/backend layer
- Groq chat completion
- Tavily realtime search
- AI command extraction ke format JSON:

```json
{"device":"lamp","state":"on"}
{"device":"rgb","r":40,"g":120,"b":255}
{"device":"fan","state":"off"}
{"device":"alarm","enabled":true,"hour":6,"minute":30}
```

## Recommended data flow

Dashboard button:

`Browser -> WebSocket -> ESP32 CommandParser -> Device -> SmartRoomState -> WebSocket broadcast`

AI chat:

`Browser -> AI Gateway -> Groq/Tavily -> command JSON -> ESP32 /api/command -> Device state`

Realtime search:

`Browser -> AI Gateway /chat or /search -> Tavily /search -> Groq summary -> Browser`

Voice command:

`Browser SpeechRecognition -> AI Gateway or local parser -> ESP32 command`

Scheduler:

`NTP time -> Scheduler -> RoomAction -> Device state`

## Arduino libraries

- `ArduinoJson`
- `ESPAsyncWebServer`
- `AsyncTCP`
- `Adafruit SSD1306`
- `Adafruit GFX Library`

## AI model recommendation

Gunakan `llama-3.1-8b-instant` untuk command realtime karena latensinya rendah. Gunakan `llama-3.3-70b-versatile` jika butuh jawaban lebih kuat. Untuk web search built-in dari Groq, opsi modernnya adalah `groq/compound` atau `groq/compound-mini`; untuk Tavily, tetap panggil Tavily dari backend gateway.

## Why AI gateway is recommended

Memanggil Groq/Tavily langsung dari ESP32 memang mungkin, tetapi tidak ideal karena API key akan tertanam di firmware, TLS lebih berat, error handling lebih sulit, dan rate limit lebih susah dikontrol. Arsitektur profesional: ESP32 menjadi controller lokal, backend menjadi otak AI dan internet search.
