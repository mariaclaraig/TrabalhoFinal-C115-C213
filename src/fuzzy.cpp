#include <math.h>
#include "../include/config.h"
#include "../include/fuzzy.h"

typedef struct { float a, b, c, d; } MF;

static float clampValue(float value, float minValue, float maxValue) {
  return fmaxf(minValue, fminf(maxValue, value));
}

static float mfEval(MF m, float x) {
  float rise = (m.b > m.a) ? (x - m.a) / (m.b - m.a) : (x >= m.a ? 1.0f : 0.0f);
  float fall = (m.d > m.c) ? (m.d - x) / (m.d - m.c) : (x <= m.d ? 1.0f : 0.0f);
  float mu = fminf(rise, fall);
  if (mu < 0.0f) mu = 0.0f;
  if (mu > 1.0f) mu = 1.0f;
  return mu;
}

static const MF eMF[5] = {
  {-FUZZY_E_MAX,-FUZZY_E_MAX,-FUZZY_E_MAX,-FUZZY_E_MAX / 2},
  {-FUZZY_E_MAX,-FUZZY_E_MAX / 2,-FUZZY_E_MAX / 2,0},
  {-FUZZY_E_MAX / 2,0,0,FUZZY_E_MAX / 2},
  {0,FUZZY_E_MAX / 2,FUZZY_E_MAX / 2,FUZZY_E_MAX},
  {FUZZY_E_MAX / 2,FUZZY_E_MAX,FUZZY_E_MAX,FUZZY_E_MAX}
};

static const MF deMF[5] = {
  {-FUZZY_DE_MAX,-FUZZY_DE_MAX,-FUZZY_DE_MAX,-FUZZY_DE_MAX / 2},
  {-FUZZY_DE_MAX,-FUZZY_DE_MAX / 2,-FUZZY_DE_MAX / 2,0},
  {-FUZZY_DE_MAX / 2,0,0,FUZZY_DE_MAX / 2},
  {0,FUZZY_DE_MAX / 2,FUZZY_DE_MAX / 2,FUZZY_DE_MAX},
  {FUZZY_DE_MAX / 2,FUZZY_DE_MAX,FUZZY_DE_MAX,FUZZY_DE_MAX}
};

static const MF uMF[5] = {
  {-FUZZY_DU_MAX,-FUZZY_DU_MAX,-FUZZY_DU_MAX,-FUZZY_DU_MAX / 2},
  {-FUZZY_DU_MAX,-FUZZY_DU_MAX / 2,-FUZZY_DU_MAX / 2,0},
  {-FUZZY_DU_MAX / 2,0,0,FUZZY_DU_MAX / 2},
  {0,FUZZY_DU_MAX / 2,FUZZY_DU_MAX / 2,FUZZY_DU_MAX},
  {FUZZY_DU_MAX / 2,FUZZY_DU_MAX,FUZZY_DU_MAX,FUZZY_DU_MAX}
};

typedef struct { int e, de, out; } Rule;
static Rule rules[25];
static int  NUM_RULES = 0;

static void buildRules() {
  if (NUM_RULES) return;
  for (int ie = 0; ie < 5; ie++) {
    for (int id = 0; id < 5; id++) {
      // Matriz propria: soma os indices linguisticos centrados e satura
      // em NG..PG. Ela e mais agressiva quando erro e tendencia apontam
      // na mesma direcao.
      int s = (ie - 2) + (id - 2);
      if (s < -2) s = -2;
      if (s >  2) s =  2;
      rules[NUM_RULES++] = { ie, id, s + 2 };
    }
  }
}

float fuzzyController(float e, float de) {
  buildRules();

  e = clampValue(e, -FUZZY_E_MAX, FUZZY_E_MAX);
  de = clampValue(de, -FUZZY_DE_MAX, FUZZY_DE_MAX);

  float muE[5], muDe[5];
  for (int i = 0; i < 5; i++) {
    muE[i]  = mfEval(eMF[i],  e);
    muDe[i] = mfEval(deMF[i], de);
  }

  float w[25];
  for (int r = 0; r < NUM_RULES; r++)
    w[r] = fminf(muE[rules[r].e], muDe[rules[r].de]);

  const int   N    = 101;
  const float xmin = -FUZZY_DU_MAX, xmax = FUZZY_DU_MAX;
  float num = 0.0f, den = 0.0f;

  for (int k = 0; k < N; k++) {
    float x   = xmin + (xmax - xmin) * k / (N - 1);
    float agg = 0.0f;
    for (int r = 0; r < NUM_RULES; r++) {
      float clipped = fminf(w[r], mfEval(uMF[rules[r].out], x));
      agg = fmaxf(agg, clipped);
    }
    num += agg * x;
    den += agg;
  }

  if (den == 0.0f) return 0.0f;
  return num / den;
}
