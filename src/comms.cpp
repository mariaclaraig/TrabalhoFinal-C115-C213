// ============================================================
//  Camada de comunicação MQTT — implementação
//  Não-bloqueante: o Wi-Fi/MQTT conectam em segundo plano; se
//  caírem, publishTelemetry() simplesmente não envia (o controle
//  e a telemetria serial seguem funcionando).
// ============================================================
#include <WiFi.h>
#include <PubSubClient.h>
#include <stdio.h>
#include "../include/config.h"
#include "../include/comms.h"

// Estado partilhado com o laço de controle (definido em main.cpp)
extern volatile float g_setpoint;   // RPM desejado
extern volatile bool  g_running;    // start/stop da atuação

static WiFiClient   wifiClient;
static PubSubClient mqtt(wifiClient);

static void onMessage(char* topic, byte* payload, unsigned int len) {
  String msg; msg.reserve(len);
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];

  if (String(topic) == TOP_SETPOINT) {
    g_setpoint = msg.toFloat();            // novo set point (RPM)
  } else if (String(topic) == TOP_CMD) {
    g_running = (msg == "start");          // liga/desliga atuação
  }
}

void commsSetup() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);        // não-bloqueante; conclui no loop
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

static void reconnect() {
  if (mqtt.connected()) return;
  if (WiFi.status() != WL_CONNECTED) return;
  static unsigned long last = 0;
  unsigned long now = millis();
  if (now - last < 2000) return;           // tenta reconectar a cada 2 s
  last = now;
  if (mqtt.connect(MQTT_CLIENTID)) {
    mqtt.subscribe(TOP_SETPOINT, 1);
    mqtt.subscribe(TOP_CMD, 1);
  }
}

void commsLoop() { reconnect(); mqtt.loop(); }

bool commsConnected() { return mqtt.connected(); }

void publishTelemetry(float t, float sp, float rpm, float err, float u,
                      float mp, float ts, float ess) {
  if (!mqtt.connected()) return;
  char buf[192];
  int n = snprintf(buf, sizeof(buf),
    "{\"t\":%.1f,\"sp\":%.1f,\"rpm\":%.1f,\"err\":%.1f,\"u\":%.1f,"
    "\"mp\":%.1f,\"ts\":%.1f,\"ess\":%.1f}",
    t, sp, rpm, err, u, mp, ts, ess);
  if (n > 0) mqtt.publish(TOP_TELEMETRY, (const uint8_t*)buf, (unsigned int)n, false);
}
