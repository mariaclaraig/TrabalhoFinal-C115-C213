#pragma once

/**
 * @file comms.h
 * @brief Interface da camada de comunicação MQTT.
*/

/**
 * @brief Setup da comunicação Wi-Fi e MQTT. 
 */
void commsSetup();

/**
 * @brief Loop de manutenção da comunicação.
 */
void commsLoop();

/**
 * @brief Verifica se a conexão MQTT está ativa.
 * @return true se conectado, false caso contrário.
 */
bool commsConnected();

/**
 * @brief Publica dados de telemetria e métricas no tópico MQTT;
 * se a conexão não estiver ativa, retorna sem publicar.
 * 
 * @param t Tempo atual (s)
 * @param sp Set point atual (RPM)
 * @param rpm RPM atual
 * @param err Erro atual (RPM)
 * @param de Variação do erro usada pelo fuzzy (RPM/s)
 * @param du Incremento de PWM calculado pelo fuzzy (% por ciclo)
 * @param u Sinal de controle atual (%)
 * @param mp Sobressinal (%)
 * @param ts Tempo de acomodação (s)
 * @param ess Erro em regime (RPM)
 */
void publishTelemetry(float t, float sp, float rpm, float err, float de,
                      float du, float u,
                      float mp, float ts, float ess);
