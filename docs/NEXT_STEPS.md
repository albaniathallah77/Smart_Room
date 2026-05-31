# Next Steps

## 1. Buat Config.h

Copy `Config.example.h` menjadi `Config.h`, lalu isi WiFi:

```cpp
#define WIFI_SSID "nama_wifi_kamu"
#define WIFI_PASSWORD "password_wifi_kamu"
```

Untuk tahap awal, biarkan:

```cpp
#define SMART_ROOM_HARDWARE_TEST 1
```

## 2. Install library Arduino

Install lewat Arduino IDE Library Manager:

- `ArduinoJson`
- `Adafruit SSD1306`
- `Adafruit GFX Library`
- `ESPAsyncWebServer`
- `AsyncTCP`

## 3. Upload hardware test

Buka `Smart_Room.ino`, pilih board ESP32, upload, lalu buka Serial Monitor `115200`.

Ketik command:

| Command | Test |
|---|---|
| `1` | LED lampu meja |
| `2` | RGB common-anode |
| `4` | buzzer |
| `5` | OLED |
| `s` | LED, RGB, buzzer, OLED tanpa relay |
| `a` | sama seperti `s`, relay dilewati |

Relay/fan sengaja dilewati dulu sampai wiring power eksternal sudah siap.

Kalau semua komponen sudah benar, ubah:

```cpp
#define SMART_ROOM_HARDWARE_TEST 0
```

Lalu upload ulang untuk masuk ke mode dashboard.

## 4. Jalankan dashboard ESP32

Setelah mode test dimatikan, buka Serial Monitor. ESP32 akan menampilkan IP:

```text
Dashboard: http://192.168.1.xxx
```

Buka alamat itu dari browser HP/laptop yang ada di WiFi yang sama.

## 5. Jalankan AI gateway

Masuk folder `gateway`, buat file `.env` dari `.env.example`, lalu isi API key.

```bash
npm install
npm run dev
```

Gunakan gateway untuk Groq chat, Tavily realtime search, dan command forwarding ke ESP32.
