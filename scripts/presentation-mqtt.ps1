param(
    [ValidateSet("all", "mqttx", "dashboard")]
    [string]$Mode = "all",
    [string]$BrokerHost = "localhost",
    [int]$MqttPort = 1883,
    [int]$WebSocketPort = 9001,
    [string]$WifiSsid = "nome_da_rede",
    [string]$WifiPass = "senha_da_rede",
    [string]$ClientId = "esp32-motor"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectConfigPath = Join-Path $repoRoot "include/project_config.h"
$dashboardConfigPath = Join-Path $repoRoot "dashboard/config.js"
$dashboardUrl = "ws://$BrokerHost`:$WebSocketPort"

$projectConfig = @"
#pragma once

#define WIFI_SSID  "$WifiSsid"
#define WIFI_PASS  "$WifiPass"

#define MQTT_HOST  "$BrokerHost"
#define MQTT_PORT  $MqttPort
#define MQTT_CLIENTID  "$ClientId"
"@

$dashboardConfig = @"
window.DASHBOARD_MQTT_URL = "$dashboardUrl";
"@

Set-Content -LiteralPath $projectConfigPath -Value $projectConfig -Encoding UTF8
Set-Content -LiteralPath $dashboardConfigPath -Value $dashboardConfig -Encoding UTF8

Write-Host ""
Write-Host "Arquivos atualizados:"
Write-Host "  include/project_config.h"
Write-Host "  dashboard/config.js"
Write-Host ""

if ($Mode -eq "all" -or $Mode -eq "mqttx") {
    Write-Host "MQTTX:"
    Write-Host "  Protocol: MQTT"
    Write-Host "  Host: $BrokerHost"
    Write-Host "  Port: $MqttPort"
    Write-Host "  Client ID: mqttx-demo"
    Write-Host "  Subscribe: motor/telemetry"
    Write-Host "  Publish setpoint: motor/setpoint"
    Write-Host "  Publish command: motor/cmd"
    Write-Host ""
}

if ($Mode -eq "all" -or $Mode -eq "dashboard") {
    Write-Host "Dashboard:"
    Write-Host "  Broker WebSocket: $dashboardUrl"
    Write-Host "  Arquivo: dashboard/index.html"
    Write-Host ""
}

Write-Host "Mosquitto precisa expor MQTT TCP em $MqttPort e WebSocket em $WebSocketPort."
