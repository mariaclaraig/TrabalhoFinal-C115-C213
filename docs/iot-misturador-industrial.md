# C115 - Misturador Industrial IoT

## 1. Produto e ideia de implementação

O produto proposto é um **Misturador Industrial IoT** para monitoramento e controle de rotação de um eixo de mistura. Ele representa processos comuns em indústrias alimentícias, químicas, farmacêuticas e de laboratório, onde a velocidade do agitador precisa permanecer próxima de um valor definido mesmo quando a carga mecânica muda.

Em uma mistura real, a viscosidade, densidade ou quantidade de material pode variar durante o processo. Quando a carga aumenta, o motor tende a perder RPM. A solução usa um ESP32 para medir a velocidade por encoder, calcular o erro em relação ao set point e ajustar automaticamente o PWM do motor por meio de um controlador fuzzy.

Além do controle local, o sistema publica telemetria por MQTT e permite comandos remotos por dashboard web ou MQTTX.

Fluxo geral:

```text
Misturador -> motor DC + encoder -> ESP32 -> MQTT broker -> dashboard / MQTTX
                         |
                         +-> controle fuzzy local -> PWM -> L298N -> motor
```

## 2. Dispositivos e sensores

Componentes implementados ou previstos no protótipo:

| Item | Função |
|---|---|
| ESP32 DevKit v1 | Controlador embarcado, Wi-Fi e cliente MQTT |
| Motor DC com caixa de redução | Representa o eixo do misturador |
| Encoder Hall | Mede pulsos do eixo para cálculo de RPM |
| Driver L298N | Aciona o motor por PWM |
| Fonte externa do motor | Alimenta a carga de potência |
| Broker Mosquitto | Intermedia mensagens MQTT |
| Dashboard web | Supervisão da solução em tempo real |
| MQTTX | Ferramenta para simulação, inspeção e comandos MQTT |

Sensores recomendados para uma versão industrial:

- sensor de corrente do motor para estimar carga;
- sensor de torque no eixo;
- sensor de vibração para manutenção preditiva;
- sensor de temperatura do motor;
- sensor de temperatura do produto;
- sensor de nível do tanque;
- sensor de tampa aberta e botão de emergência;
- sensor ou inferência de viscosidade por potência consumida.

## 3. Comunicação MQTT

O ESP32 publica telemetria e recebe comandos por MQTT. O dashboard usa MQTT via WebSocket, enquanto MQTTX usa a porta MQTT TCP tradicional.

| Tópico | Direção | Payload |
|---|---|---|
| `motor/telemetry` | ESP32 -> dashboard/MQTTX | JSON com telemetria e métricas |
| `motor/setpoint` | dashboard/MQTTX -> ESP32 | rotação desejada em RPM |
| `motor/cmd` | dashboard/MQTTX -> ESP32 | `start` ou `stop` |

Exemplo de telemetria:

```json
{
  "t": 12.5,
  "sp": 120.0,
  "rpm": 116.8,
  "err": 3.2,
  "de": -8.4,
  "du": 0.65,
  "u": 64.5,
  "mp": 4.1,
  "ts": 2.8,
  "ess": 1.5
}
```

Campos:

- `t`: tempo de execução em segundos;
- `sp`: set point atual em RPM;
- `rpm`: velocidade medida/filtrada;
- `err`: erro entre set point e RPM;
- `de`: variação do erro usada pelo controlador, em RPM/s;
- `du`: incremento de PWM calculado pelo fuzzy, em percentual por ciclo;
- `u`: atuação do controlador em percentual de PWM;
- `mp`: sobressinal percentual;
- `ts`: tempo de acomodação;
- `ess`: erro em regime permanente.

## 4. Aplicação móvel ou ferramenta similar

O requisito de aplicação móvel/ferramenta similar é atendido com **MQTTX**, que permite acompanhar tópicos, publicar comandos e simular mensagens MQTT durante a demonstração.

Configuração no MQTTX:

- Protocol: `MQTT`;
- Host: IP do broker;
- Port: porta MQTT configurada no Mosquitto;
- Client ID: `mqttx-demo`.

Widgets/ações equivalentes:

| Ação | Tópico | Mensagem |
|---|---|---|
| Assinar telemetria | `motor/telemetry` | subscribe |
| Aplicar SP1 | `motor/setpoint` | `60` |
| Aplicar SP2 | `motor/setpoint` | `120` |
| Aplicar SP3 | `motor/setpoint` | `180` |
| Iniciar motor | `motor/cmd` | `start` |
| Parar motor | `motor/cmd` | `stop` |

O dashboard web complementa o MQTTX com uma interface visual de supervisão, incluindo tacômetro, gráfico temporal, set point, KPIs e painel fuzzy.

## 5. Simulação de envio e recebimento

A troca de mensagens pode ser simulada sem depender da apresentação completa do hardware.

Com Mosquitto:

```powershell
mosquitto_sub -h localhost -p 1883 -t "motor/telemetry" -v
```

Em outro terminal:

```powershell
mosquitto_pub -h localhost -p 1883 -t "motor/setpoint" -m "120"
mosquitto_pub -h localhost -p 1883 -t "motor/cmd" -m "start"
mosquitto_pub -h localhost -p 1883 -t "motor/telemetry" -m "{\"t\":1,\"sp\":120,\"rpm\":118,\"err\":2,\"de\":-5,\"du\":0.4,\"u\":47,\"mp\":0,\"ts\":0,\"ess\":2}"
```

## 6. Produtos existentes no mercado

Soluções relacionadas já existem no mercado, principalmente em forma de misturadores industriais com controle de velocidade, painéis de controle, inversores de frequência, CLPs, sensores de potência e plataformas de monitoramento.

Exemplos de referências comerciais e técnicas:

- A OEM Panels descreve painéis de controle para agitadores/misturadores com funções de ligar, desligar, controlar processo, monitorar status e alarmes: [Agitator Mixer Control Panels](https://www.oempanels.com/agitator-mixer-control-panels).
- A Load Controls apresenta monitoramento de agitadores por sensor de potência para acompanhar mudanças de viscosidade e desvios de processo: [Agitators and Mixers: Profiling a Process](https://www.loadcontrols.com/industries-and-applications/agitators-and-mixers-profiling-a-process/).
- A Ascon Tecnologic apresenta o AT MIXER como sistema de controle para misturadores e misturadores planetários: [AT MIXER](https://www.ascontecnologic.com/mixers-and-planetary-mixers/?lang=en).
- Casos industriais de agitadores costumam combinar VFD e CLP para controle em malha fechada, como no exemplo da Consyst: [Closed-Loop Control Optimization for Industrial Agitators](https://consyst.biz/closed-loop-control-optimization-a-case-study-in-design-and-integration-of-industrial-agitator-system/).

O diferencial do projeto acadêmico é entregar uma versão didática e de baixo custo com ESP32, MQTT, dashboard e controle fuzzy embarcado.

## 7. Melhorias possíveis

Melhorias para aproximar o protótipo de uma solução comercial:

- substituir o L298N por driver mais eficiente ou VFD adequado à potência real;
- adicionar sensor de corrente, torque e vibração;
- registrar histórico em banco de dados;
- implementar alarmes de travamento, sobrecarga e superaquecimento;
- usar autenticação MQTT e TLS;
- integrar com Node-RED, Grafana ou SCADA;
- criar perfis de mistura por receita;
- adicionar botão físico de emergência;
- implementar gabinete e proteção elétrica adequados ao ambiente industrial.

## 8. Benefícios

Benefícios obtidos com o produto IoT:

- manutenção automática da velocidade de mistura;
- maior repetibilidade entre lotes;
- monitoramento remoto;
- redução de intervenção manual;
- apoio à manutenção preditiva;
- detecção de perda de desempenho;
- integração com sistemas de supervisão;
- base para análise histórica de processo;
- demonstração prática de IoT, MQTT, sistemas embarcados e controle inteligente.

## 9. Viabilidade comercial

A solução possui viabilidade como produto didático, bancada de laboratório, protótipo de automação e solução de baixo custo para processos simples de mistura.

Pontos favoráveis:

- ESP32 possui baixo custo e Wi-Fi integrado;
- MQTT é leve e amplamente usado em IoT;
- controle fuzzy é adequado para sistemas com comportamento não linear;
- o dashboard já demonstra supervisão em tempo real;
- a arquitetura é expansível para sensores adicionais.

Limitações para uso industrial direto:

- o L298N é adequado para protótipo, não para cargas industriais;
- não há sensores reais de torque/corrente no protótipo atual;
- a segurança física industrial precisa de componentes dedicados;
- a comunicação de produção exigiria autenticação, TLS e política de acesso;
- seria necessário validar robustez elétrica, mecânica e térmica.

## 10. Integração com outras soluções IoT

A arquitetura pode ser integrada com:

- Node-RED para regras e automações;
- InfluxDB para armazenamento de séries temporais;
- Grafana para dashboards históricos;
- Home Assistant ou outra plataforma MQTT;
- API REST para sistemas externos;
- SCADA/CLP em ambiente industrial;
- alertas por e-mail, Telegram ou WhatsApp;
- modelos de manutenção preditiva.

Arquitetura expandida:

```text
ESP32 + misturador
      |
      MQTT
      |
Broker Mosquitto / EMQX / HiveMQ
      |
      +--> Dashboard web
      +--> MQTTX
      +--> Node-RED
      +--> Banco de dados
      +--> Grafana / relatórios / alertas
```

## 11. Protótipo funcional

O protótipo funcional é composto por:

- ESP32 DevKit v1;
- motor DC com encoder Hall;
- driver L298N;
- fonte compatível com o motor;
- broker MQTT;
- dashboard web;
- MQTTX para demonstração e simulação.

Teste recomendado:

1. Configurar o broker e rodar `scripts/presentation-mqtt.ps1`.
2. Gravar o firmware no ESP32.
3. Abrir o MQTTX e assinar `motor/telemetry`.
4. Enviar `start` em `motor/cmd`.
5. Alternar set points em `motor/setpoint`: `60`, `120`, `180`.
6. Abrir o dashboard e observar RPM, PWM, erro e métricas.
7. Aplicar uma perturbação mecânica no eixo e observar a reação do controle.
