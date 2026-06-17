#pragma once

/**
 * @file metrics.h
 * @brief Interface das métricas de desempenho do controle.
*/

#include "config.h"

/**
 * @brief Estrutura que armazena esrados necessários para cálculo das
 * métricas de desempenho.
 */
struct Metrics {
  float peak;
  float tStart;
  float tLastOut;
  float lastSp;

  float buf[METRICS_AVG_N];
  int   idx, count;

  float mp;
  float ts;
  float ess;
  bool  settled;
};

/**
 * @brief Inicializa a estrutura de métricas.
 * 
 * @param m Ponteiro para a estrutura de métricas a ser inicializada.
 */
void metricsInit(Metrics* m);

/**
 * @brief Atualiza as métricas de desempenho com base nos parâmetros.
 * 
 * @param m Ponteiro para a estrutura de métricas a ser atualizada.
 * @param sp Set point atual (RPM)
 * @param rpm RPM atual
 * @param t Tempo atual (s)
 */
void metricsUpdate(Metrics* m, float sp, float rpm, float t);
