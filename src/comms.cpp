#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include "../include/config.h"
#include "../include/comms.h"

extern volatile float g_setpoint;
extern volatile bool  g_running;

static WiFiClient   wifiClient;
static PubSubClient mqtt(wifiClient);
static unsigned long lastStatusLog = 0;

static void onMessage(char* topic, byte* payload, unsigned int len) {
  String msg; msg.reserve(len);
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];

  Serial.printf("[MQTT] recebido %s = %s\n", topic, msg.c_str());

  if (String(topic) == TOP_SETPOINT) {
    msg.trim();
    char* end = nullptr;
    const char* start = msg.c_str();
    float requested = strtof(start, &end);

    if (end == start || *end != '\0' || !isfinite(requested)) {
      Serial.printf("[MQTT] setpoint invalido ignorado: %s\n", msg.c_str());
      return;
    }

    g_setpoint = fmaxf(SETPOINT_MIN, fminf(SETPOINT_MAX, requested));
    Serial.printf("[MQTT] setpoint aplicado: %.1f RPM\n", g_setpoint);
  } else if (String(topic) == TOP_CMD) {
    g_running = (msg == "start");
  }
}

void commsSetup() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  Serial.printf("[MQTT] broker configurado: %s:%d\n", MQTT_HOST, MQTT_PORT);
}

static void reconnect() {
  if (mqtt.connected()) return;
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastStatusLog >= 3000) {
      lastStatusLog = now;
      Serial.printf("[WiFi] conectando... status=%d\n", WiFi.status());
    }
    return;
  }

  static bool wifiLogged = false;
  if (!wifiLogged) {
    wifiLogged = true;
    Serial.print("[WiFi] conectado. IP: ");
    Serial.println(WiFi.localIP());
  }

  static unsigned long last = 0;
  unsigned long now = millis();
  if (now - last < 2000) return;
  last = now;
  if (mqtt.connect(MQTT_CLIENTID)) {
    Serial.printf("[MQTT] conectado como %s\n", MQTT_CLIENTID);
    mqtt.subscribe(TOP_SETPOINT, 1);
    mqtt.subscribe(TOP_CMD, 1);
    Serial.printf("[MQTT] assinando: %s, %s\n", TOP_SETPOINT, TOP_CMD);
  } else if (now - lastStatusLog >= 3000) {
    lastStatusLog = now;
    Serial.printf("[MQTT] falha ao conectar. state=%d\n", mqtt.state());
  }
}

void commsLoop() { reconnect(); mqtt.loop(); }

bool commsConnected() { return mqtt.connected(); }

void publishTelemetry(float t, float sp, float rpm, float err, float de,
                      float du, float u,
                      float mp, float ts, float ess) {
  if (!mqtt.connected()) return;
  char buf[224];
  int n = snprintf(buf, sizeof(buf),
    "{\"t\":%.1f,\"sp\":%.1f,\"rpm\":%.1f,\"err\":%.1f,"
    "\"de\":%.1f,\"du\":%.2f,\"u\":%.1f,"
    "\"mp\":%.1f,\"ts\":%.1f,\"ess\":%.1f}",
    t, sp, rpm, err, de, du, u, mp, ts, ess);
  if (n > 0 && n < (int)sizeof(buf))
    mqtt.publish(TOP_TELEMETRY, (const uint8_t*)buf, (unsigned int)n, false);
}
