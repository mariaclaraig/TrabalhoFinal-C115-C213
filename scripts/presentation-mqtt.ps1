param(
    [ValidateSet("all", "mqttx", "dashboard")]
    [string]$Mode = "all",
    [string]$BrokerHost = "",
    [int]$MqttPort = 1884,
    [int]$WebSocketPort = 9001,
    [string]$WifiSsid = "nome_da_rede",
    [string]$WifiPass = "senha_da_rede",
    [string]$ClientId = "esp32-motor",
    [string]$BrokerBindAddress = "0.0.0.0",
    [switch]$StartBroker,
    [string]$MosquittoPath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectConfigPath = Join-Path $repoRoot "include/project_config.h"
$dashboardConfigPath = Join-Path $repoRoot "dashboard/config.js"
$mosquittoConfigPath = Join-Path $repoRoot ".dont_commit/mosquitto-local.conf"

function Get-DefaultBrokerHost {
    $ip = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown" -and
            $_.InterfaceAlias -notmatch "VirtualBox|VMware|Hyper-V|vEthernet|Loopback"
        } |
        Sort-Object -Property @{
            Expression = { if ($_.InterfaceAlias -match "Wi-?Fi|Wireless") { 0 } else { 1 } }
        }, InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress

    if (-not $ip) { return "localhost" }
    return $ip
}

function Resolve-MosquittoPath {
    param([string]$ConfiguredPath)

    if ($ConfiguredPath) { return $ConfiguredPath }

    $cmd = Get-Command mosquitto -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = @(
        "$env:ProgramFiles\mosquitto\mosquitto.exe",
        "${env:ProgramFiles(x86)}\mosquitto\mosquitto.exe"
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return $candidate
        }
    }

    return ""
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Value
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Value, $encoding)
}

if (-not $BrokerHost) {
    $BrokerHost = Get-DefaultBrokerHost
}

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

$mosquittoConfig = @"
listener $MqttPort $BrokerBindAddress
protocol mqtt
allow_anonymous true

listener $WebSocketPort $BrokerBindAddress
protocol websockets
allow_anonymous true
"@

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $mosquittoConfigPath) | Out-Null
Write-Utf8NoBom -Path $projectConfigPath -Value $projectConfig
Write-Utf8NoBom -Path $dashboardConfigPath -Value $dashboardConfig
Write-Utf8NoBom -Path $mosquittoConfigPath -Value $mosquittoConfig

Write-Host ""
Write-Host "Arquivos atualizados:"
Write-Host "  include/project_config.h"
Write-Host "  dashboard/config.js"
Write-Host "  .dont_commit/mosquitto-local.conf"
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

$tcpPortBusy = Get-NetTCPConnection -LocalPort $MqttPort -State Listen -ErrorAction SilentlyContinue
$wsPortBusy = Get-NetTCPConnection -LocalPort $WebSocketPort -State Listen -ErrorAction SilentlyContinue

if ($tcpPortBusy -or $wsPortBusy) {
    Write-Host "Aviso: uma das portas configuradas ja esta em uso."
    if ($tcpPortBusy) { Write-Host "  Porta MQTT $MqttPort em uso por PID(s): $($tcpPortBusy.OwningProcess -join ', ')" }
    if ($wsPortBusy) { Write-Host "  Porta WebSocket $WebSocketPort em uso por PID(s): $($wsPortBusy.OwningProcess -join ', ')" }
    Write-Host ""
}

Write-Host "Mosquitto:"
Write-Host "  Config: .dont_commit/mosquitto-local.conf"
Write-Host "  Comando: mosquitto -c `"$mosquittoConfigPath`" -v"

if ($StartBroker) {
    $resolvedMosquitto = Resolve-MosquittoPath -ConfiguredPath $MosquittoPath
    if (-not $resolvedMosquitto) {
        throw "Mosquitto nao encontrado. Instale o Mosquitto ou passe -MosquittoPath `"C:\caminho\mosquitto.exe`"."
    }

    if ($tcpPortBusy -or $wsPortBusy) {
        throw "Nao iniciei o Mosquitto porque a porta $MqttPort ou $WebSocketPort ja esta em uso. Feche o broker antigo e rode de novo."
    }

    Start-Process `
        -FilePath $resolvedMosquitto `
        -ArgumentList @("-c", $mosquittoConfigPath, "-v") `
        -WorkingDirectory (Split-Path -Parent $resolvedMosquitto) `
        -WindowStyle Hidden
    Start-Sleep -Seconds 1
    Write-Host ""
    Write-Host "Broker iniciado com a configuracao local."
}
