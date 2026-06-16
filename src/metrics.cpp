// ============================================================
//  Métricas de desempenho — implementação
//  Custo desprezível para o ESP32: max, média móvel e um par
//  de comparações por ciclo. O reset por troca de SP é a parte
//  que exige estado (por isso fica num módulo dedicado).
// ============================================================
#include <math.h>
#include "../include/metrics.h"

static void resetWindow(Metrics* m) { m->idx = 0; m->count = 0; }

void metricsInit(Metrics* m) {
  m->peak = 0.0f; m->tStart = 0.0f; m->tLastOut = 0.0f; m->lastSp = -1.0f;
  resetWindow(m);
  m->mp = 0.0f; m->ts = 0.0f; m->ess = 0.0f; m->settled = false;
}

void metricsUpdate(Metrics* m, float sp, float rpm, float t) {
  // Reset ao trocar o set point
  if (sp != m->lastSp) {
    m->lastSp   = sp;
    m->peak     = rpm;
    m->tStart   = t;
    m->tLastOut = t;
    resetWindow(m);
  }

  // Sobressinal: pico de RPM desde a troca (válido p/ degraus crescentes)
  if (rpm > m->peak) m->peak = rpm;
  m->mp = (sp > 0.0f) ? fmaxf(0.0f, (m->peak - sp) / sp * 100.0f) : 0.0f;

  // Tempo de acomodação: último instante fora da faixa ±BAND·SP
  float band = METRICS_BAND * sp;
  m->settled = (fabsf(sp - rpm) <= band);
  if (!m->settled) m->tLastOut = t;
  m->ts = m->tLastOut - m->tStart;

  // Erro em regime: SP - média(RPM) na janela móvel
  m->buf[m->idx] = rpm;
  m->idx = (m->idx + 1) % METRICS_AVG_N;
  if (m->count < METRICS_AVG_N) m->count++;
  float sum = 0.0f;
  for (int i = 0; i < m->count; i++) sum += m->buf[i];
  m->ess = sp - (sum / m->count);
}
