# Trabalho Final C115/C213

Repositório dos projetos finais de **C115 (IoT)** e **C213 (Sistemas Embarcados)**.

O projeto implementa um **Misturador Industrial IoT** com controle fuzzy de velocidade em ESP32, comunicação MQTT e dashboard web para supervisão em tempo real.

## Equipe

- Christian Salles
- Maria Clara Ignácio
- Samuel Ralise

## Documentação

O índice completo dos documentos está em [docs/README.md](docs/README.md).

### C115 - IoT

- [Documentação IoT - Misturador Industrial](docs/iot-misturador-industrial.md)
- [Apresentação C115](docs/Apresenta%C3%A7%C3%A3oC115.pptx)

### C213 - Sistemas Embarcados

- [Documentação técnica - Controle Fuzzy Embarcado](docs/embarcados-controle-fuzzy.md)
- [Relatório técnico em PDF - Controle Fuzzy](docs/Relatorio_Tecnico_C213_Misturador_Fuzzy.pdf)
- [Apresentação C213](docs/Apresenta%C3%A7%C3%A3oC213.pptx)

## Estrutura do projeto

```text
.
├── dashboard/                 # Dashboard web SCADA com MQTT via WebSocket
├── docs/                      # Documentação e entregas dos trabalhos C115 e C213
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

## Tópicos MQTT

| Tópico | Direção | Payload |
|---|---|---|
| `motor/telemetry` | ESP32 -> dashboard/MQTTX | JSON com `t`, `sp`, `rpm`, `err`, `de`, `du`, `u`, `mp`, `ts`, `ess` |
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
