/* ============================================================
   engine.js — Camada de dados do dashboard (somente MQTT)
   - Conecta no broker MQTT via WebSocket (mqtt.js)
   - NÃO simula nada: só exibe dados reais de motor/telemetry
   - Expõe helpers de lógica fuzzy (para o painel "pensando")
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Lógica fuzzy (visualização do controlador) ----------
     Replica a base de regras do firmware (5 termos, PI incremental).
     SCALE_E / SCALE_DE normalizam o erro e a variação do erro para [-1,1]
     de acordo com os universos usados no ESP (e: ±200 rpm, de: ±500 rpm/s).
     derr chega por amostra (10 Hz) -> de/dt = derr*10 -> /500 = derr/50.        */
  const TERMS = ["NG", "NP", "ZE", "PP", "PG"];
  const CENTERS = [-1, -0.5, 0, 0.5, 1];

  function memberships(xnorm) {
    const x = Math.max(-1, Math.min(1, xnorm));
    return CENTERS.map((c, i) => {
      let mu = 1 - Math.abs(x - c) / 0.5;
      mu = Math.max(0, mu);
      if (i === 0 && x < c) mu = 1; // ombro inferior
      if (i === 4 && x > c) mu = 1; // ombro superior
      return mu;
    });
  }

  function ruleOut(eIdx, deIdx) {
    const s = (eIdx - 2) + (deIdx - 2);
    return Math.max(-2, Math.min(2, s)) + 2;
  }

  function defuzz(en, den) {
    const me = memberships(en);
    const mde = memberships(den);
    let num = 0, denw = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const w = Math.min(me[i], mde[j]);
        if (w <= 0) continue;
        num += w * CENTERS[ruleOut(i, j)];
        denw += w;
      }
    }
    return denw > 0 ? num / denw : 0;
  }

  const Fuzzy = {
    TERMS, CENTERS, memberships, ruleOut, defuzz,
    SCALE_E: 200,  // erro (rpm) que satura a entrada normalizada (universo do ESP)
    SCALE_DE: 50,  // Δerro (rpm/amostra) que satura a entrada normalizada
  };

  /* ---------- Engine (somente MQTT) ---------- */
  function DataEngine(opts) {
    opts = opts || {};
    this.url = opts.url || "ws://localhost:9001";
    this.topics = {
      telemetry: "motor/telemetry",
      setpoint: "motor/setpoint",
      cmd: "motor/cmd",
    };
    this.onSample = null;   // (sample) => void
    this.onStatus = null;   // (status) => void  status: connected|connected-idle|reconnecting|offline
    this.client = null;
    this._connected = false;
    this._lastMsg = 0;
    this._statusTimer = null;
  }

  DataEngine.prototype.start = function () {
    this._connectMqtt();
    // Watchdog de status: detecta broker conectado porém sem telemetria fluindo
    this._statusTimer = setInterval(() => this._emitStatus(), 800);
  };

  DataEngine.prototype._emitStatus = function () {
    let s;
    if (this._connected && performance.now() - this._lastMsg < 3000) s = "connected";
    else if (this._connected) s = "connected-idle";   // broker ok, mas sem telemetria recente
    else if (this.client) s = "reconnecting";
    else s = "offline";
    if (this.onStatus) this.onStatus(s);
  };

  DataEngine.prototype._connectMqtt = function () {
    if (typeof mqtt === "undefined") { this._emitStatus(); return; }
    try {
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
        const sample = {
          t: m.t,
          sp: m.sp,
          rpm: m.rpm,
          err: m.err != null ? m.err : (m.sp - m.rpm),
          u: m.u,
          mp: m.mp != null ? m.mp : null,    // sobressinal (%) — calculado no ESP
          ts: m.ts != null ? m.ts : null,    // tempo de acomodação (s)
          ess: m.ess != null ? m.ess : null, // erro em regime (rpm)
          wall: performance.now(),
        };
        if (this.onSample) this.onSample(sample);
        this._emitStatus();
      });
    } catch (e) {
      this._emitStatus();
    }
  };

  /* ---------- Comandos ---------- */
  DataEngine.prototype.setSetpoint = function (v) {
    v = Math.max(0, Math.round(v));
    if (this.client && this.client.connected) {
      this.client.publish(this.topics.setpoint, String(v), { retain: true });
    }
  };

  DataEngine.prototype.setRunning = function (on) {
    if (this.client && this.client.connected) {
      this.client.publish(this.topics.cmd, on ? "start" : "stop");
    }
  };

  // A carga é uma perturbação FÍSICA (segurar o eixo). O botão só marca o
  // instante no gráfico — não publica nada (o firmware trata cmd ≠ "start" como stop).
  DataEngine.prototype.setLoad = function (on) { /* no-op no MQTT */ };

  window.Fuzzy = Fuzzy;
  window.DataEngine = DataEngine;
})();
