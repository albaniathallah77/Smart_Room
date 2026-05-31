# Wiring Smart Room AI System

## ESP32 pin map

| Komponen | Pin ESP32 | Catatan |
|---|---:|---|
| LED lampu meja | GPIO 25 | Pakai resistor 220-330 ohm |
| Relay kipas | GPIO 26 | Modul relay aktif LOW secara default |
| Passive buzzer | GPIO 27 | Buzzer ke GPIO dan GND |
| RGB merah | GPIO 16 | Common anode, pakai resistor |
| RGB hijau | GPIO 17 | Common anode, pakai resistor |
| RGB biru | GPIO 18 | Common anode, pakai resistor |
| OLED SDA | GPIO 21 | I2C |
| OLED SCL | GPIO 22 | I2C |
| OLED VCC | 3V3 atau 5V | Sesuaikan modul |
| OLED GND | GND | Common ground |

## LED biasa

- GPIO 25 -> resistor 220-330 ohm -> anoda LED
- katoda LED -> GND

## RGB common anode

- kaki common anode -> 3V3
- kaki R -> resistor 220-330 ohm -> GPIO 16
- kaki G -> resistor 220-330 ohm -> GPIO 17
- kaki B -> resistor 220-330 ohm -> GPIO 18

Common-anode berarti logikanya terbalik: GPIO/PWM LOW menyala, HIGH mati. Firmware sudah mengatur inversi ini.

## Relay dan dinamo mini

Sisi kontrol relay:

- IN relay -> GPIO 26
- VCC relay -> 5V eksternal atau 5V ESP32 jika modul kecil
- GND relay -> GND bersama ESP32

Sisi beban:

- sumber + motor -> COM relay
- NO relay -> + dinamo
- - dinamo -> - power supply motor

Tambahkan diode flyback paralel pada motor DC jika modul tidak menyediakannya. Pasang kapasitor 100nF di terminal motor untuk mengurangi noise.

## Buzzer passive

- GPIO 27 -> kaki +
- GND -> kaki -

Jika buzzer butuh arus besar, gunakan transistor NPN dan resistor basis 1k.

## OLED I2C

- VCC -> 3V3
- GND -> GND
- SDA -> GPIO 21
- SCL -> GPIO 22

Alamat umum OLED adalah `0x3C`.

## Power recommendation

USB laptop cukup untuk ESP32, LED kecil, OLED, dan buzzer kecil. Untuk relay dan dinamo, gunakan adaptor 5V eksternal minimal 1A. Motor tidak disarankan mengambil arus dari pin 5V USB ESP32 karena noise dan lonjakan arus bisa membuat ESP32 reset.

Pembagian power terbaik:

- ESP32 via USB atau adaptor 5V stabil.
- Motor/relay via adaptor 5V terpisah.
- Semua GND harus tersambung bersama: GND ESP32, GND relay, dan GND power motor.
- Jangan pernah memberi 5V langsung ke GPIO ESP32.

## Noise and safety

- Gunakan resistor untuk semua LED.
- Gunakan relay module yang cocok dengan sinyal 3.3V ESP32.
- Pisahkan kabel motor dari kabel I2C OLED.
- Tambahkan kapasitor 470uF-1000uF di rail 5V motor.
- Tambahkan kapasitor 100nF dekat VCC/GND OLED dan modul relay.
- Pastikan arus motor tidak melewati breadboard kecil jika motor cukup besar.
