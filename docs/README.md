# Documentação

Esta pasta reúne a documentação final dos trabalhos de **C115 (IoT)** e **C213 (Sistemas Embarcados)**.

## Arquivos

- [IoT - Misturador Industrial](iot-misturador-industrial.md): documentação da solução IoT, mercado, benefícios, viabilidade, MQTTX, simulação e protótipo funcional.
- [Embarcados - Controle Fuzzy](embarcados-controle-fuzzy.md): documentação técnica do firmware, planta, controle fuzzy, ESP32, dashboard e testes.

## Visão geral

O projeto propõe um **Misturador Industrial IoT** capaz de controlar a rotação de um motor DC por meio de um controlador fuzzy embarcado em ESP32. A velocidade é medida por encoder Hall, a atuação é feita por PWM no driver L298N e a comunicação com ferramentas externas ocorre via MQTT.

A solução combina:

- controle local em malha fechada no ESP32;
- telemetria em tempo real por MQTT;
- dashboard web para supervisão;
- MQTTX como ferramenta de demonstração e simulação;
- documentação técnica separada por disciplina.
