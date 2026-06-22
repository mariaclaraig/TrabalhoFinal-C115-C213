#pragma once

/**
 * @file config.h
 * @brief Configurações gerais do projeto, incluindo pinos, parâmetros de controle e
 * métricas. Inclui também as configurações de rede e MQTT a partir de project_config.h.
*/

#define PIN_IN1   17
#define PIN_IN2    5
#define PIN_ENA   16

#define PIN_ENC_A 18
#define PIN_ENC_B 19

#define PWM_CHANNEL   0
#define PWM_FREQ      20000
#define PWM_RES_BITS  8
#define PWM_MAX_DUTY  255

#define DT_MS         100.0f

#define RPM_MAX        200.0f
#define GEAR_RATIO      34.0f
#define PULSES_PER_REV (11.0f * GEAR_RATIO)
#define RPM_FILTER_A    0.30f

#define SETPOINT_MIN     0.0f
#define SETPOINT_MAX     RPM_MAX
#define FUZZY_E_MAX      RPM_MAX
#define FUZZY_DE_MAX     500.0f
#define FUZZY_DU_MAX      10.0f

#define SP1  (0.30f * RPM_MAX)
#define SP2  (0.60f * RPM_MAX)
#define SP3  (0.90f * RPM_MAX)

#define USE_SIMULATED_PLANT  0
#define SIM_K    (RPM_MAX / 100.0f)
#define SIM_TAU  0.30f

#define METRICS_BAND   0.02f
#define METRICS_AVG_N  20

#include "project_config.h"

#define TOP_SETPOINT   "motor/setpoint"
#define TOP_CMD        "motor/cmd"
#define TOP_TELEMETRY  "motor/telemetry"
