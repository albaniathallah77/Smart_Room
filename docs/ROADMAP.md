# Roadmap Step-by-Step

## Phase 1 - Hardware sanity test

- Test LED biasa.
- Test RGB common-anode.
- Test relay tanpa motor, lalu dengan motor.
- Test passive buzzer.
- Test OLED I2C.
- Catat pin final di `src/PinMap.h`.
- Pakai `SMART_ROOM_HARDWARE_TEST 1` saat wiring pertama kali.

## Phase 2 - Firmware modular

- Pakai `Smart_Room.ino` hanya sebagai entrypoint.
- Device logic tetap di `src/devices`.
- Semua status ada di `SmartRoomState`.
- Command masuk lewat `CommandParser`.

## Phase 3 - Dashboard lokal

- ESP32 host dashboard di `/`.
- WebSocket `/ws` untuk status realtime.
- Button dashboard mengirim command JSON.
- Semua perubahan device dibroadcast kembali ke dashboard.

## Phase 4 - Realtime clock and scheduler

- ESP32 sync NTP saat WiFi aktif.
- Scheduler lokal menjalankan daily automation.
- Tambahkan endpoint untuk membuat, melihat, dan menghapus schedule.
- Simpan schedule ke NVS/Preferences agar tidak hilang saat restart.

## Phase 5 - AI gateway

- Buat backend kecil di laptop/server/Raspberry Pi.
- Backend menyimpan `GROQ_API_KEY` dan `TAVILY_API_KEY`.
- Browser mengirim chat/voice ke backend.
- Backend mengembalikan jawaban AI dan command JSON.
- Backend meneruskan command ke ESP32.

## Phase 6 - Voice command

- Gunakan Web Speech API di browser untuk speech-to-text.
- Text dikirim ke AI gateway.
- Jika command sederhana, bisa langsung ke ESP32.
- Jika command kompleks, Groq mengubah intent menjadi JSON command.

## Phase 7 - Production hardening

- Tambahkan reconnect WiFi.
- Tambahkan health check.
- Tambahkan watchdog.
- Tambahkan OTA update.
- Tambahkan persistent state.
- Tambahkan logging ring buffer di dashboard.

## Suggested project structure

```text
Smart_Room/
  Smart_Room.ino
  Config.example.h
  Config.h
  .gitignore
  src/
    PinMap.h
    SmartRoomState.h
    SmartRoomSystem.h
    core/
      CommandParser.h
      Scheduler.h
    devices/
      SmartLamp.h
      RgbRoomLight.h
      SmartFan.h
      SmartBuzzer.h
    display/
      OledManager.h
    web/
      WebServerManager.h
    testing/
      HardwareTest.h
  gateway/
    server.js
    package.json
    .env.example
  docs/
    ARCHITECTURE.md
    WIRING.md
    ROADMAP.md
    NEXT_STEPS.md
```
