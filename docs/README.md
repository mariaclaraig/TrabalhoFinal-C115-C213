# Documentação

Esta pasta reúne a documentação final dos trabalhos de **C115 (IoT)** e **C213 (Sistemas Embarcados)**.

## C115 - IoT

- [IoT - Misturador Industrial](iot-misturador-industrial.md): documentação da solução IoT, mercado, benefícios, viabilidade, MQTTX, simulação e protótipo funcional.
- [Apresentação C115](Apresenta%C3%A7%C3%A3oC115.pptx): slides finais da parte de IoT do projeto.

## C213 - Sistemas Embarcados

- [Embarcados - Controle Fuzzy](embarcados-controle-fuzzy.md): documentação técnica do firmware, planta, controle fuzzy, ESP32, dashboard e testes.
- [Relatório técnico em PDF](Relatorio_Tecnico_C213_Misturador_Fuzzy.pdf): relatório final do misturador industrial com controle fuzzy embarcado.
- [Apresentação C213](Apresenta%C3%A7%C3%A3oC213.pptx): slides finais da parte de Sistemas Embarcados do projeto.
- [Vídeo da apresentação C213](https://www.youtube.com/watch?v=g1zKja6By0g): gravação da apresentação e demonstração do trabalho.

## Visão geral

O projeto propõe um **Misturador Industrial IoT** capaz de controlar a rotação de um motor DC por meio de um controlador fuzzy embarcado em ESP32. A velocidade é medida por encoder Hall, a atuação é feita por PWM no driver L298N e a comunicação com ferramentas externas ocorre via MQTT.

A solução combina:

- controle local em malha fechada no ESP32;
- telemetria em tempo real por MQTT;
- dashboard web para supervisão;
- MQTTX como ferramenta de demonstração e simulação;
- relatório técnico em PDF e apresentações finais;
- documentação técnica separada por disciplina.
