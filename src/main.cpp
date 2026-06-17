#include <Arduino.h>
#include "../include/config.h"
#include "../include/fuzzy.h"
#include "../include/metrics.h"
#include "../include/comms.h"


volatile float g_setpoint = SP1;
volatile bool  g_running  = true;
static float u    = 0.0f;
static float ePrev = 0.0f;
static float rpmFilt = 0.0f;
static Metrics metrics;


static volatile long encCount = 0;
static void IRAM_ATTR onEncA() { encCount++; }


#if USE_SIMULATED_PLANT
static float simRpm = 0.0f;

static float plantStep(float u_pct, float dt_s) {
  simRpm += (SIM_K * u_pct - simRpm) / SIM_TAU * dt_s;
  if (simRpm < 0) simRpm = 0;
  return simRpm;
}
#endif


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


  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, HIGH);
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES_BITS);
  ledcAttachPin(PIN_ENA, PWM_CHANNEL);


  pinMode(PIN_ENC_A, INPUT_PULLUP);
  pinMode(PIN_ENC_B, INPUT_PULLUP);
#if !USE_SIMULATED_PLANT
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), onEncA, RISING);
#endif

  metricsInit(&metrics);
  commsSetup();

  Serial.println("Controle Fuzzy de Motor DC iniciado.");
#if USE_SIMULATED_PLANT
  Serial.println("Modo: simulado.");
#else
  Serial.println("Modo: motor e encoder reais.");
#endif
  Serial.println("Digite 1/2/3 para SP1/SP2/SP3.");
}

void loop() {
  commsLoop();
  readSerialSetpoint();


  static unsigned long tPrev = 0;
  unsigned long now = millis();
  if (now - tPrev < (unsigned long)DT_MS) return;
  float dt = (now - tPrev) / 1000.0f;
  tPrev = now;


  float rpm;
#if USE_SIMULATED_PLANT
  rpm = plantStep(u, dt);
#else
  noInterrupts();
  long pulses = encCount; encCount = 0;
  interrupts();
  rpm = (pulses / PULSES_PER_REV) / dt * 60.0f;
#endif

  rpmFilt = RPM_FILTER_A * rpm + (1.0f - RPM_FILTER_A) * rpmFilt;


  float e  = g_setpoint - rpmFilt;
  float de = (e - ePrev) / dt;
  ePrev = e;


  float du = fuzzyController(e, de);
  u += du;
  if (u < 0.0f)   u = 0.0f;
  if (u > 100.0f) u = 100.0f;
  if (!g_running) u = 0.0f;


  int duty = (int)(u * PWM_MAX_DUTY / 100.0f + 0.5f);
  ledcWrite(PWM_CHANNEL, duty);


  float tsec = now / 1000.0f;
  metricsUpdate(&metrics, g_setpoint, rpmFilt, tsec);


  Serial.printf("SP:%.1f,RPM:%.1f,u:%.1f,mp:%.1f,ts:%.1f,ess:%.1f\n",
                g_setpoint, rpmFilt, u, metrics.mp, metrics.ts, metrics.ess);
  publishTelemetry(tsec, g_setpoint, rpmFilt, e, u,
                   metrics.mp, metrics.ts, metrics.ess);
}
