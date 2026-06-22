# C213 - Controle Fuzzy Embarcado

## 1. Visão geral

O projeto de Sistemas Embarcados implementa uma malha fechada de controle de velocidade para um motor DC que representa o eixo de um misturador industrial.

O ESP32 executa localmente:

- leitura do encoder Hall;
- cálculo de RPM;
- filtro passa-baixa;
- cálculo do erro e da variação do erro;
- controlador fuzzy Mamdani incremental;
- atuação por PWM no driver L298N;
- cálculo de métricas de desempenho;
- publicação MQTT da telemetria.

## 2. Planta e malha de controle

A planta controlada é o conjunto motor DC, carga mecânica e eixo de mistura. A variável controlada é a velocidade em RPM. A variável manipulada é o percentual de PWM aplicado ao motor.

```text
SP de RPM -> erro -> controlador fuzzy -> PWM -> L298N -> motor/eixo -> RPM
     ^                                                          |
     |                                                          |
     +---------------------- encoder Hall ----------------------+
```

A perturbação principal é a variação de carga no eixo, equivalente a uma mudança de viscosidade ou densidade do material misturado.

## 3. Hardware e pinos

Configuração principal definida em `include/config.h`:

| Item | Valor |
|---|---|
| Placa | ESP32 DevKit v1 (`esp32doit-devkit-v1`) |
| Framework | Arduino via PlatformIO |
| Driver do motor | L298N |
| PWM | LEDC, canal `0`, 20 kHz, 8 bits |
| `PIN_IN1` | GPIO 17 |
| `PIN_IN2` | GPIO 5 |
| `PIN_ENA` | GPIO 16 |
| `PIN_ENC_A` | GPIO 18 |
| `PIN_ENC_B` | GPIO 19 |

O sentido do motor é fixado no `setup()`:

```cpp
digitalWrite(PIN_IN1, LOW);
digitalWrite(PIN_IN2, HIGH);
```

A velocidade é controlada pelo duty cycle em `PIN_ENA`.

## 4. Variáveis e faixas

| Variável | Símbolo | Papel | Faixa usada |
|---|---|---|---|
| Velocidade | `rpm` | variável controlada | `0` a `RPM_MAX` |
| Set point | `g_setpoint` | referência | `60`, `120`, `180` RPM |
| Erro | `e` | entrada fuzzy | aproximadamente `-200` a `200` RPM |
| Variação do erro | `de` | entrada fuzzy | aproximadamente `-500` a `500` RPM/s |
| Atuação | `u` | variável manipulada | `0` a `100` % |
| Incremento fuzzy | `du` | saída fuzzy | `-10` a `10` % por ciclo |

Constantes principais:

```cpp
#define DT_MS        100.0f
#define RPM_MAX      200.0f
#define GEAR_RATIO    34.0f
#define PULSES_PER_REV (11.0f * GEAR_RATIO)
#define RPM_FILTER_A   0.30f
```

Set points:

| Set point | Percentual de `RPM_MAX` | RPM |
|---|---:|---:|
| SP1 | 30% | 60 |
| SP2 | 60% | 120 |
| SP3 | 90% | 180 |

## 5. Leitura de RPM

No modo real, o canal A do encoder é contado por interrupção:

```cpp
static volatile long encCount = 0;
static void IRAM_ATTR onEncA() { encCount++; }
```

A cada ciclo de controle, o firmware lê e zera o contador:

```cpp
rpm = (pulses / PULSES_PER_REV) / dt * 60.0f;
```

Em seguida aplica filtro passa-baixa:

```cpp
rpmFilt = RPM_FILTER_A * rpm + (1.0f - RPM_FILTER_A) * rpmFilt;
```

## 6. Planta simulada

O firmware possui uma planta simulada ativável por `USE_SIMULATED_PLANT`.

Modelo:

```cpp
simRpm += (SIM_K * u_pct - simRpm) / SIM_TAU * dt_s;
```

Constantes:

```cpp
#define SIM_K    (RPM_MAX / 100.0f)
#define SIM_TAU  0.30f
```

Esse modo permite testar o controlador, o monitor serial e a telemetria MQTT sem motor físico.

## 7. Controlador fuzzy

O controlador está em `src/fuzzy.cpp` e segue o modelo Mamdani.

Entradas:

- `e = setpoint - rpmFilt`;
- `de = (e - ePrev) / dt`, saturado em `-500` a `500` RPM/s antes da fuzzificação.

Saída:

- `du`, incremento de PWM acumulado em `u`.

O uso incremental transforma o controlador em uma estrutura semelhante a um PI fuzzy:

```cpp
float du = fuzzyController(e, de);
u += du;
if (u < 0.0f)   u = 0.0f;
if (u > 100.0f) u = 100.0f;
```

Termos linguísticos:

| Sigla | Significado |
|---|---|
| NG | Negativo Grande |
| NP | Negativo Pequeno |
| ZE | Zero |
| PP | Positivo Pequeno |
| PG | Positivo Grande |

Universos implementados:

| Variável | Universo |
|---|---|
| Erro `e` | `-200` a `200` RPM |
| Variação `de` | `-500` a `500` RPM/s |
| Saída `du` | `-10` a `10` % |

Entradas que ultrapassam os universos são saturadas nos limites. Assim, os
termos extremos continuam ativos durante partidas, mudanças bruscas de setpoint
e picos de medição.

## 8. Funções de pertinência

As funções de pertinência são trapezoidais/triangulares, definidas por quatro pontos `{a, b, c, d}`.

Erro:

| Termo | Pontos |
|---|---|
| NG | `{-200,-200,-200,-100}` |
| NP | `{-200,-100,-100,0}` |
| ZE | `{-100,0,0,100}` |
| PP | `{0,100,100,200}` |
| PG | `{100,200,200,200}` |

Variação do erro:

| Termo | Pontos |
|---|---|
| NG | `{-500,-500,-500,-250}` |
| NP | `{-500,-250,-250,0}` |
| ZE | `{-250,0,0,250}` |
| PP | `{0,250,250,500}` |
| PG | `{250,500,500,500}` |

Saída `du`:

| Termo | Pontos |
|---|---|
| NG | `{-10,-10,-10,-5}` |
| NP | `{-10,-5,-5,0}` |
| ZE | `{-5,0,0,5}` |
| PP | `{0,5,5,10}` |
| PG | `{5,10,10,10}` |

## 9. Base de regras

A base possui 25 regras. A regra é gerada pela soma saturada dos índices linguísticos:

```cpp
int s = (ie - 2) + (id - 2);
```

Matriz equivalente:

| `e \ de` | NG | NP | ZE | PP | PG |
|---|---|---|---|---|---|
| NG | NG | NG | NG | NP | ZE |
| NP | NG | NG | NP | ZE | PP |
| ZE | NG | NP | ZE | PP | PG |
| PP | NP | ZE | PP | PG | PG |
| PG | ZE | PP | PG | PG | PG |

Interpretação:

- se o motor está muito abaixo do alvo e o erro aumenta, o PWM deve subir forte;
- se o motor está acima do alvo e se afastando, o PWM deve reduzir forte;
- se erro e variação se compensam, a atuação muda pouco.

## 10. Defuzzificação

A defuzzificação usa centroide sobre 101 pontos no universo de saída `[-10, 10]`.

Fluxo:

```text
fuzzificação -> ativação por mínimo -> agregação por máximo -> centroide
```

Caso nenhuma regra seja ativada, a saída é `0`.

## 11. Comunicação MQTT

A camada MQTT está em `src/comms.cpp`.

Funções:

- `commsSetup()`: configura Wi-Fi, broker MQTT e callback;
- `commsLoop()`: mantém conexão e processa mensagens;
- `commsConnected()`: informa estado da conexão;
- `publishTelemetry()`: publica o JSON de telemetria.

O payload inclui `de` e `du`, exatamente como calculados no ciclo de controle.
O dashboard usa esses campos em vez de recalcular o comportamento fuzzy.

Tópicos:

| Tópico | Uso no ESP32 |
|---|---|
| `motor/telemetry` | publica |
| `motor/setpoint` | assina |
| `motor/cmd` | assina |

O callback interpreta:

- `motor/setpoint`: converte o payload para `float` e atualiza `g_setpoint`;
- `motor/cmd`: `start` mantém o controle ativo, outros valores param a atuação.

## 12. Métricas de desempenho

As métricas ficam em `src/metrics.cpp`.

| Métrica | Campo MQTT | Como é calculada |
|---|---|---|
| Sobressinal | `mp` | maior pico acima do set point |
| Tempo de acomodação | `ts` | tempo desde a troca de SP até a última saída da banda |
| Erro em regime | `ess` | diferença entre SP e média móvel da RPM |

Parâmetros:

```cpp
#define METRICS_BAND   0.02f
#define METRICS_AVG_N  20
```

A banda de acomodação é de 2% do set point.

## 13. Dashboard

O dashboard web em `dashboard/` permite:

- visualizar RPM em tacômetro;
- alterar set point com presets e slider;
- enviar start/stop;
- acompanhar gráfico RPM x tempo;
- visualizar erro, PWM e KPIs;
- observar os graus de pertinência e a matriz de regras fuzzy.

O dashboard consome `motor/telemetry` e publica em `motor/setpoint` e `motor/cmd`.

## 14. Testes recomendados

### Teste 1: comunicação MQTT

1. Subir o broker Mosquitto.
2. Rodar `scripts/presentation-mqtt.ps1`.
3. Gravar o firmware.
4. Assinar `motor/telemetry` no MQTTX.
5. Enviar `start` em `motor/cmd`.
6. Enviar `120` em `motor/setpoint`.

Resultado esperado: o ESP32 publica telemetria com `sp`, `rpm`, `err`, `de`, `du`, `u`, `mp`, `ts` e `ess`.

### Teste 2: set points

Aplicar:

- SP1 = 60 RPM;
- SP2 = 120 RPM;
- SP3 = 180 RPM.

Para cada caso, observar:

- tempo de acomodação;
- sobressinal;
- erro em regime permanente;
- estabilidade do PWM.

### Teste 3: perturbação de carga

Com o motor estabilizado, aplicar resistência mecânica no eixo.

Resultado esperado:

- RPM cai inicialmente;
- erro aumenta;
- controlador eleva `u`;
- RPM retorna para perto do set point.

### Teste 4: parada e retomada

1. Publicar `stop` em `motor/cmd`.
2. Verificar `u = 0`.
3. Publicar `start`.
4. Confirmar retorno da atuação.

## 15. Conclusão técnica

O projeto atende ao ciclo completo de um sistema embarcado de controle: aquisição, processamento, controle fuzzy, atuação, comunicação e supervisão.

O controle roda localmente no ESP32, portanto a estabilidade básica da malha não depende do dashboard. O MQTT atua como camada de supervisão e comando, permitindo integração com ferramentas externas e análise em tempo real.
