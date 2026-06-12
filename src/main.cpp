// ============================================================
//  Controle Fuzzy de Velocidade de Motor DC — ESP32 + L298N
//  Laço de controle a 10 Hz:
//    leitura (encoder) -> erro/Δerro -> fuzzy (Δu) -> atuação (PWM) -> telemetria
//
//  USE_SIMULATED_PLANT (config.h):
//    1 -> roda SEM hardware (planta de 1ª ordem) p/ ver no Serial Plotter
//    0 -> usa motor + encoder reais
//
//  Set point: digite 1/2/3 no Serial Monitor para SP1/SP2/SP3.
//  Veja .dont_commit/01-projeto-geral.md e 03-controlador-fuzzy.md
// ============================================================
#include <Arduino.h>
#include "config.h"
#include "fuzzy.h"

// ------------------- Estado do controlador -----------------
static float g_setpoint = SP1;     // RPM desejado
static float u    = 0.0f;          // saída acumulada do controlador (0..100 %)
static float ePrev = 0.0f;         // erro anterior (para Δe)
static float rpmFilt = 0.0f;       // RPM filtrado

// ------------------- Encoder (modo real) -------------------
static volatile long encCount = 0;
static void IRAM_ATTR onEncA() { encCount++; }   // conta bordas de subida do canal A

// ------------------- Planta simulada -----------------------
#if USE_SIMULATED_PLANT
static float simRpm = 0.0f;
// Modelo de 1ª ordem: rpm += (K*u - rpm)/tau * dt
static float plantStep(float u_pct, float dt_s) {
  simRpm += (SIM_K * u_pct - simRpm) / SIM_TAU * dt_s;
  if (simRpm < 0) simRpm = 0;
  return simRpm;
}
#endif

// ------------------- Leitura do set point ------------------
static void readSerialSetpoint() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '1') g_setpoint = SP1;
    else if (c == '2') g_setpoint = SP2;
    else if (c == '3') g_setpoint = SP3;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  // L298N — sentido fixo (IN1=LOW, IN2=HIGH) e PWM em ENA
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, HIGH);
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES_BITS);  // core ESP32 Arduino 2.x
  ledcAttachPin(PIN_ENA, PWM_CHANNEL);

  // Encoder
  pinMode(PIN_ENC_A, INPUT_PULLUP);
  pinMode(PIN_ENC_B, INPUT_PULLUP);
#if !USE_SIMULATED_PLANT
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), onEncA, RISING);
#endif

  Serial.println("Controle Fuzzy de Motor DC iniciado.");
  Serial.println("Digite 1/2/3 para SP1/SP2/SP3.");
}

void loop() {
  readSerialSetpoint();

  // Temporização do laço de controle (10 Hz)
  static unsigned long tPrev = 0;
  unsigned long now = millis();
  if (now - tPrev < (unsigned long)DT_MS) return;
  float dt = (now - tPrev) / 1000.0f;
  tPrev = now;

  // 1) Medição do RPM
  float rpm;
#if USE_SIMULATED_PLANT
  rpm = plantStep(u, dt);
#else
  noInterrupts();
  long pulses = encCount; encCount = 0;
  interrupts();
  rpm = (pulses / PULSES_PER_REV) / dt * 60.0f;
#endif
  // Filtro passa-baixa de 1ª ordem
  rpmFilt = RPM_FILTER_A * rpm + (1.0f - RPM_FILTER_A) * rpmFilt;

  // 2) Erro e variação do erro
  float e  = g_setpoint - rpmFilt;
  float de = (e - ePrev) / dt;
  ePrev = e;

  // 3) Controlador fuzzy -> incremento de PWM (ação integral)
  float du = fuzzyController(e, de);
  u += du;
  if (u < 0.0f)   u = 0.0f;       // saturação no limite físico
  if (u > 100.0f) u = 100.0f;

  // 4) Atuação (PWM 0..PWM_MAX_DUTY)
  int duty = (int)(u * PWM_MAX_DUTY / 100.0f + 0.5f);
  ledcWrite(PWM_CHANNEL, duty);

  // 5) Telemetria (formato do Serial Plotter)
  Serial.printf("SP:%.1f,RPM:%.1f,u:%.1f\n", g_setpoint, rpmFilt, u);

  // ---- Gancho MQTT (ver .dont_commit/02-comunicacao-mqtt.md) ----
  // Substitua a leitura serial do SP por 'motor/setpoint' e esta linha
  // de telemetria por publishTelemetry(now/1000.0f, g_setpoint, rpmFilt, e, u);
}
