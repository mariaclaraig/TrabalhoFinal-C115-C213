#pragma once
// ============================================================
//  Configuração do projeto — Controle Fuzzy de Velocidade
//  de Motor DC (ESP32 + L298N + encoder Hall)
//  Veja .dont_commit/01-projeto-geral.md
// ============================================================

// ---------------- Pinos (ESP32 DevKit v1) ------------------
// L298N — canal A (sentido fixo: IN1=LOW, IN2=HIGH)
#define PIN_IN1   17   // L298N IN1 (TX2)  -> manter em LOW
#define PIN_IN2    5   // L298N IN2 (D5)   -> manter em HIGH
#define PIN_ENA   16   // L298N ENA (RX2)  -> PWM (LEDC)

// Encoder de efeito Hall do motor
#define PIN_ENC_A 18   // Sinal Hall A (D18) -> interrupção
#define PIN_ENC_B 19   // Sinal Hall B (D19) -> quadratura / sentido

// ---------------- PWM (LEDC) -------------------------------
#define PWM_CHANNEL   0       // canal LEDC (API core ESP32 Arduino 2.x)
#define PWM_FREQ      20000   // 20 kHz (inaudível)
#define PWM_RES_BITS  8       // 8 bits -> duty 0..255
#define PWM_MAX_DUTY  255     // (1 << PWM_RES_BITS) - 1

// ---------------- Controle ---------------------------------
#define DT_MS         100.0f  // período do laço de controle (ms) -> 10 Hz

// ---------------- Planta / encoder (MEDIR/CALIBRAR) --------
#define RPM_MAX        200.0f // RPM máx nominal do eixo (malha aberta, sem carga)
#define GEAR_RATIO      34.0f // reducao aproximada do 25GA370 usado no projeto
#define PULSES_PER_REV (11.0f * GEAR_RATIO) // canal A, borda de subida, no eixo de saida
#define RPM_FILTER_A    0.30f // peso do filtro passa-baixa do RPM (0..1; menor = mais suave)

// ---------------- Set points (RPM) -------------------------
#define SP1  (0.30f * RPM_MAX)   // 30% -> 60 RPM
#define SP2  (0.60f * RPM_MAX)   // 60% -> 120 RPM
#define SP3  (0.90f * RPM_MAX)   // 90% -> 180 RPM

// ---------------- Modo de teste sem hardware ---------------
// 1 = usa planta simulada de 1ª ordem (não lê o encoder, não aciona o motor de verdade)
// 0 = usa o motor/encoder reais
#define USE_SIMULATED_PLANT  0
#define SIM_K    (RPM_MAX / 100.0f)  // ganho: RPM por % de PWM
#define SIM_TAU  0.30f               // constante de tempo (s)

// ---------------- Métricas de desempenho -------------------
// Calculadas no ESP32 (resetam a cada troca de set point) e publicadas por MQTT.
#define METRICS_BAND   0.02f   // faixa de acomodação (±2 %·SP)
#define METRICS_AVG_N  20      // janela (amostras) p/ erro em regime

// ---------------- Wi-Fi (PREENCHER) ------------------------
#define WIFI_SSID  "SuaRede"
#define WIFI_PASS  "SuaSenha"

// ---------------- MQTT -------------------------------------
#define MQTT_HOST      "192.168.0.123"   // IP do PC que roda o Mosquitto
#define MQTT_PORT      1883
#define MQTT_CLIENTID  "esp32-motor"
#define TOP_SETPOINT   "motor/setpoint"  // assina (set point vindo do dashboard)
#define TOP_CMD        "motor/cmd"        // assina (start/stop)
#define TOP_TELEMETRY  "motor/telemetry"  // publica (telemetria + métricas)
