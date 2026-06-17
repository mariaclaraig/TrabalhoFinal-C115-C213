#pragma once

/**
 * @file fuzzy.h
 * @brief Interface do controlador fuzzy.
*/

/**
 * @brief Controlador fuzzy que recebe o erro e variação do erro.
 * 
 * @param e Erro atual (RPM)
 * @param de Variação do erro (RPM/s)
 * @return Sinal de controle (PWM %)
 */
float fuzzyController(float e, float de);
