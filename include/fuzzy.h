#pragma once

/**
 * @file fuzzy.h
 * @brief Interface do controlador fuzzy.
*/

/**
 * @brief Controlador fuzzy incremental que recebe erro e variação do erro.
 * 
 * @param e Erro atual (RPM)
 * @param de Variação do erro (RPM/s)
 * @return Incremento do PWM em pontos percentuais por ciclo
 */
float fuzzyController(float e, float de);
