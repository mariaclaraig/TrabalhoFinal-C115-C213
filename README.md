# TrabalhoFinal-C115-C213
Repositório dedicado aos projetos de C115 (IoT) e C213 (Sistemas Embarcados).

Alunos:
- Christian Salles
- Maria Clara Ignácio
- Samuel Ralise

## Script de apresentação MQTT

Use o script `scripts/presentation-mqtt.ps1` para configurar rapidamente o projeto na rede usada durante a apresentação.

Ele gera os arquivos locais:

- `include/project_config.h`: usado pelo firmware do ESP32.
- `dashboard/config.js`: usado pelo dashboard web.

Esses arquivos ficam fora do Git.

Exemplo de uso:

```powershell
.\scripts\presentation-mqtt.ps1 `
  -BrokerHost "10.46.4.131" `
  -MqttPort 1884 `
  -WebSocketPort 9001 `
  -WifiSsid "SUA_REDE" `
  -WifiPass "SUA_SENHA"
```

O Mosquitto precisa estar com as duas portas ativas:

```conf
listener 1884
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true
```

Para demonstrar no MQTTX:

- Protocol: `MQTT`
- Host: mesmo valor usado em `-BrokerHost`
- Port: mesmo valor usado em `-MqttPort`
- Subscribe: `motor/telemetry`
- Publish: `motor/setpoint` ou `motor/cmd`

Para demonstrar no dashboard:

- Abra `dashboard/index.html`.
- O dashboard usa `ws://BROKER_HOST:WEBSOCKET_PORT`, gerado em `dashboard/config.js`.

Se alterar Wi-Fi, IP do broker ou porta MQTT do ESP32, rode o script novamente e regrave o firmware. Se mudar apenas a porta WebSocket do dashboard, basta rodar o script e recarregar a página.
