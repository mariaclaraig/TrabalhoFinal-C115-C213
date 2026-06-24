(function () {
  "use strict";



  const TERMS = ["NG", "NP", "ZE", "PP", "PG"];
  const CENTERS = [-1, -0.5, 0, 0.5, 1];
  const RPM_MAX = 200;

  // Calcula os graus de pertinencia usados no painel visual do controlador.
  function memberships(xnorm) {
    const x = Math.max(-1, Math.min(1, xnorm));
    return CENTERS.map((c, i) => {
      let mu = 1 - Math.abs(x - c) / 0.5;
      mu = Math.max(0, mu);
      if (i === 0 && x < c) mu = 1;
      if (i === 4 && x > c) mu = 1;
      return mu;
    });
  }

  // Replica no dashboard a mesma matriz de regras implementada no firmware.
  function ruleOut(eIdx, deIdx) {
    const s = (eIdx - 2) + (deIdx - 2);
    return Math.max(-2, Math.min(2, s)) + 2;
  }

  const Fuzzy = {
    TERMS, CENTERS, memberships, ruleOut,
    RPM_MAX,
    SCALE_E: RPM_MAX,
    SCALE_DE: 500,
    SCALE_DU: 10,
  };


  function DataEngine(opts) {
    opts = opts || {};
    this.url = opts.url || "ws://localhost:9001";
    this.topics = {
      telemetry: "motor/telemetry",
      setpoint: "motor/setpoint",
      cmd: "motor/cmd",
    };
    this.onSample = null;
    this.onStatus = null;
    this.client = null;
    this._connected = false;
    this._lastMsg = 0;
    this._statusTimer = null;
  }

  DataEngine.prototype.start = function () {
    // Inicia a conexao MQTT e atualiza periodicamente o estado mostrado na tela.
    this._connectMqtt();

    this._statusTimer = setInterval(() => this._emitStatus(), 800);
  };

  DataEngine.prototype._emitStatus = function () {
    // Diferencia conexao ativa, conexao sem telemetria recente e modo offline.
    let s;
    if (this._connected && performance.now() - this._lastMsg < 3000) s = "connected";
    else if (this._connected) s = "connected-idle";
    else if (this.client) s = "reconnecting";
    else s = "offline";
    if (this.onStatus) this.onStatus(s);
  };

  DataEngine.prototype._connectMqtt = function () {
    if (typeof mqtt === "undefined") { this._emitStatus(); return; }
    try {
      // O dashboard se conecta ao broker por WebSocket para rodar direto no navegador.
      const client = mqtt.connect(this.url, {
        reconnectPeriod: 2500,
        connectTimeout: 4000,
        clientId: "dash-mix-" + Math.random().toString(16).slice(2, 8),
      });
      this.client = client;
      client.on("connect", () => {
        this._connected = true;
        client.subscribe(this.topics.telemetry);
        this._emitStatus();
      });
      client.on("reconnect", () => { this._connected = false; this._emitStatus(); });
      client.on("close",     () => { this._connected = false; this._emitStatus(); });
      client.on("offline",   () => { this._connected = false; this._emitStatus(); });
      client.on("error",     () => {});
      client.on("message", (topic, payload) => {
        if (topic !== this.topics.telemetry) return;
        let m;
        try { m = JSON.parse(payload.toString()); } catch (e) { return; }
        this._lastMsg = performance.now();

        // Normaliza a telemetria recebida antes de entregar ao React.
        const sample = {
          t: m.t,
          sp: m.sp,
          rpm: m.rpm,
          err: m.err != null ? m.err : (m.sp - m.rpm),
          de: m.de != null ? m.de : 0,
          du: m.du != null ? m.du : 0,
          u: m.u,
          mp: m.mp != null ? m.mp : null,
          ts: m.ts != null ? m.ts : null,
          ess: m.ess != null ? m.ess : null,
          wall: performance.now(),
        };
        if (this.onSample) this.onSample(sample);
        this._emitStatus();
      });
    } catch (e) {
      this._emitStatus();
    }
  };


  DataEngine.prototype.setSetpoint = function (v) {
    // Publica a nova referencia em RPM no mesmo topico assinado pelo ESP32.
    v = Math.max(0, Math.min(RPM_MAX, Math.round(v)));
    if (this.client && this.client.connected) {
      this.client.publish(this.topics.setpoint, String(v), { retain: true });
    }
  };

  DataEngine.prototype.setRunning = function (on) {
    // Envia comando simples para habilitar ou parar a atuacao do motor.
    if (this.client && this.client.connected) {
      this.client.publish(this.topics.cmd, on ? "start" : "stop");
    }
  };


  window.Fuzzy = Fuzzy;
  window.DataEngine = DataEngine;
})();
