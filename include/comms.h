#pragma once
// ============================================================
//  Camada de comunicação MQTT (Wi-Fi + PubSubClient)
//  Veja .dont_commit/02-comunicacao-mqtt.md
//  Assina:  motor/setpoint, motor/cmd  -> escreve g_setpoint / g_running
//  Publica: motor/telemetry (telemetria + métricas) em JSON
// ============================================================

void commsSetup();
void commsLoop();          // chamar com frequência (mantém Wi-Fi/MQTT vivos)
bool commsConnected();

void publishTelemetry(float t, float sp, float rpm, float err, float u,
                      float mp, float ts, float ess);
