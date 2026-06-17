# Trabalho Final C115/C213

Repositório dos projetos finais de **C115 (IoT)** e **C213 (Sistemas Embarcados)**.

O projeto implementa um **Misturador Industrial IoT** com controle fuzzy de velocidade em ESP32, comunicação MQTT e dashboard web para supervisão em tempo real.

## Equipe

- Christian Salles
- Maria Clara Ignácio
- Samuel Ralise

## Documentação

- [Documentação IoT - C115](docs/iot-misturador-industrial.md)
- [Documentação Embarcados - C213](docs/embarcados-controle-fuzzy.md)
- [Índice da documentação](docs/README.md)

## Estrutura do projeto

```text
.
├── dashboard/                 # Dashboard web SCADA com MQTT via WebSocket
├── docs/                      # Documentação dos trabalhos C115 e C213
├── include/                   # Headers e configurações do firmware
├── scripts/                   # Scripts de apoio para apresentação
├── src/                       # Firmware ESP32 em C/C++
├── platformio.ini             # Configuração PlatformIO
└── README.md
```

## Firmware ESP32

O firmware roda em um **ESP32 DevKit v1** usando Arduino/PlatformIO. Ele lê o encoder Hall do motor, calcula a velocidade em RPM, executa o controlador fuzzy incremental, aciona o motor por PWM e publica telemetria via MQTT.

Dependência principal:

```ini
knolleary/PubSubClient@^2.8
```

Para compilar e gravar:

```powershell
pio run
pio run --target upload
pio device monitor
```

## Configuração MQTT da apresentação

Use o script `scripts/presentation-mqtt.ps1` para configurar rapidamente o firmware e o dashboard na rede usada durante a demonstração.

Exemplo:

```powershell
.\scripts\presentation-mqtt.ps1 `
  -BrokerHost "10.46.4.131" `
  -MqttPort 1884 `
  -WebSocketPort 9001 `
  -WifiSsid "SUA_REDE" `
  -WifiPass "SUA_SENHA"
```

O broker Mosquitto deve expor MQTT TCP para o ESP32 e WebSocket para o dashboard:

```conf
listener 1884
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true
```

## Tópicos MQTT

| Tópico | Direção | Payload |
|---|---|---|
| `motor/telemetry` | ESP32 -> dashboard/MQTTX | JSON com `t`, `sp`, `rpm`, `err`, `u`, `mp`, `ts`, `ess` |
| `motor/setpoint` | dashboard/MQTTX -> ESP32 | número em RPM, por exemplo `120` |
| `motor/cmd` | dashboard/MQTTX -> ESP32 | `start` ou `stop` |

## Demonstração com MQTTX

No MQTTX, crie uma conexão com:

- Protocol: `MQTT`
- Host: mesmo valor usado em `-BrokerHost`
- Port: mesmo valor usado em `-MqttPort`
- Client ID: `mqttx-demo`

Assine `motor/telemetry` para acompanhar a telemetria. Publique em `motor/setpoint` para mudar a velocidade desejada e em `motor/cmd` para iniciar ou parar a atuação.

Exemplos de mensagens:

```text
motor/setpoint -> 60
motor/setpoint -> 120
motor/setpoint -> 180
motor/cmd      -> start
motor/cmd      -> stop
```

## Dashboard web

O dashboard fica em `dashboard/` e apresenta tacômetro, gráfico temporal, set point, comando start/stop, KPIs de controle e painel visual da lógica fuzzy.

Para abrir:

```powershell
python -m http.server 8080 --directory dashboard
```

Depois acesse:

```text
http://localhost:8080
```

O dashboard consome a URL MQTT WebSocket gerada pelo script de apresentação.
