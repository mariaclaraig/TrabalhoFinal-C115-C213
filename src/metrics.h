#pragma once
// ============================================================
//  Métricas de desempenho do controle (Req. 4.11)
//  Calculadas no ESP32 e publicadas por MQTT.
//  Resetam automaticamente a cada troca de set point.
//    mp  = sobressinal (%)
//    ts  = tempo de acomodação (s)
//    ess = erro em regime (RPM)
// ============================================================
#include "config.h"

struct Metrics {
  float peak;      // maior RPM desde a última troca de SP
  float tStart;    // instante da última troca de SP (s)
  float tLastOut;  // último instante fora da faixa de acomodação (s)
  float lastSp;    // SP anterior (detecta troca)

  float buf[METRICS_AVG_N];  // janela p/ erro em regime
  int   idx, count;

  // saídas
  float mp;        // sobressinal (%)
  float ts;        // tempo de acomodação (s)
  float ess;       // erro em regime (RPM)
  bool  settled;   // está dentro da faixa agora?
};

void metricsInit(Metrics* m);
void metricsUpdate(Metrics* m, float sp, float rpm, float t);
