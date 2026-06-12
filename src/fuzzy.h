#pragma once
// ============================================================
//  Controlador Fuzzy Mamdani (5 termos) — saída incremental
//  Entradas:  e  = erro de velocidade  (RPMref - RPM)
//             de = variação do erro     (de/dt)
//  Saída:     Δu = INCREMENTO de PWM em pontos percentuais
//             (fuzzy-PI: acumular u += Δu e saturar 0..100 no chamador)
//  Veja .dont_commit/03-controlador-fuzzy.md
// ============================================================

float fuzzyController(float e, float de);
