// ============================================================
//  Controlador Fuzzy (Mamdani) — Velocidade de Motor DC
//  Adaptado do material C213 (exemplo térmico) para RPM.
//  5 termos por variável (NG, NP, ZE, PP, PG); saída = Δu (incremento de PWM).
//  Etapas: fuzzificação -> inferência (min) -> agregação (max) -> centroide.
// ============================================================
#include <math.h>
#include "../include/fuzzy.h"

// ------------------------------------------------------------
// 1) Função de pertinência trapezoidal (a <= b <= c <= d)
//    Triângulo: b == c | Ombro esq.: a == b | Ombro dir.: c == d
// ------------------------------------------------------------
typedef struct { float a, b, c, d; } MF;

static float mfEval(MF m, float x) {
  float rise = (m.b > m.a) ? (x - m.a) / (m.b - m.a) : (x >= m.a ? 1.0f : 0.0f);
  float fall = (m.d > m.c) ? (m.d - x) / (m.d - m.c) : (x <= m.d ? 1.0f : 0.0f);
  float mu = fminf(rise, fall);
  if (mu < 0.0f) mu = 0.0f;
  if (mu > 1.0f) mu = 1.0f;
  return mu;
}

// ------------------------------------------------------------
// 2) Variáveis linguísticas (índices: 0=NG 1=NP 2=ZE 3=PP 4=PG)
// ------------------------------------------------------------
// Entrada 1: erro e (universo -200..200 RPM)
static const MF eMF[5] = {
  {-200,-200,-200,-100}, {-200,-100,-100,   0}, {-100,   0,   0, 100},
  {   0, 100, 100, 200}, { 100, 200, 200, 200}
};
// Entrada 2: variação do erro de (universo -500..500 RPM/s)
static const MF deMF[5] = {
  {-500,-500,-500,-250}, {-500,-250,-250,   0}, {-250,   0,   0, 250},
  {   0, 250, 250, 500}, { 250, 500, 500, 500}
};
// Saída: incremento de PWM Δu (universo -10..10 %)
static const MF uMF[5] = {
  {-10,-10,-10, -5}, {-10, -5, -5,  0}, { -5,  0,  0,  5},
  {  0,  5,  5, 10}, {  5, 10, 10, 10}
};

// ------------------------------------------------------------
// 3) Base de regras 5x5: idx(out) = sat(idx(e)+idx(de), 0..4)
//    (regra diagonal clássica do fuzzy-PI)
// ------------------------------------------------------------
typedef struct { int e, de, out; } Rule;
static Rule rules[25];
static int  NUM_RULES = 0;

static void buildRules() {
  if (NUM_RULES) return;                 // monta a tabela só uma vez
  for (int ie = 0; ie < 5; ie++) {
    for (int id = 0; id < 5; id++) {
      int s = (ie - 2) + (id - 2);       // soma dos índices centrados em ZE
      if (s < -2) s = -2;
      if (s >  2) s =  2;
      rules[NUM_RULES++] = { ie, id, s + 2 };
    }
  }
}

// ------------------------------------------------------------
// 4) Inferência Mamdani + defuzzificação por centroide
// ------------------------------------------------------------
float fuzzyController(float e, float de) {
  buildRules();

  // 4.1 Fuzzificação
  float muE[5], muDe[5];
  for (int i = 0; i < 5; i++) {
    muE[i]  = mfEval(eMF[i],  e);
    muDe[i] = mfEval(deMF[i], de);
  }

  // 4.2 Força de cada regra (E = min)
  float w[25];
  for (int r = 0; r < NUM_RULES; r++)
    w[r] = fminf(muE[rules[r].e], muDe[rules[r].de]);

  // 4.3 Centroide sobre o universo de Δu discretizado
  const int   N    = 101;                // passo de 0,2 %
  const float xmin = -10.0f, xmax = 10.0f;
  float num = 0.0f, den = 0.0f;

  for (int k = 0; k < N; k++) {
    float x   = xmin + (xmax - xmin) * k / (N - 1);
    float agg = 0.0f;
    for (int r = 0; r < NUM_RULES; r++) {
      float clipped = fminf(w[r], mfEval(uMF[rules[r].out], x)); // implicação
      agg = fmaxf(agg, clipped);                                 // agregação
    }
    num += agg * x;
    den += agg;
  }

  if (den == 0.0f) return 0.0f;          // nenhuma regra ativada
  return num / den;                      // Δu crisp (-10..10 %)
}
