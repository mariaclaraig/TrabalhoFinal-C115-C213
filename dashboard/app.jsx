const { useState, useEffect, useRef, useCallback } = React;

const SP_PRESETS = [60, 120, 180];
const MAX_SAMPLES = 800;


const CFG = {
  accent: "#f5a524",
  trace: "#36d6c3",
  showFuzzy: true,
  showKpis: true,
  windowSec: 40,
  title: "Misturador Industrial",
};

const GearIcon = ({ spin }) => (
  <svg className={"gear" + (spin ? " spin" : "")} viewBox="0 0 24 24" fill="none">
    <path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" stroke="currentColor" strokeWidth="1.4" />
    <path d="M12 2.5l1.2 2.2 2.4-.6.4 2.5 2.3 1-1 2.3 1.6 1.9-1.9 1.6 1 2.3-2.3 1 .4 2.5-2.4-.6L12 21.5l-1.2-2.2-2.4.6-.4-2.5-2.3-1 1-2.3L4.2 12l1.9-1.6-1-2.3 2.3-1-.4-2.5 2.4.6L12 2.5z"
          stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const PlayIco = () => <svg className="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>;
const StopIco = () => <svg className="ico" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>;

const STATUS_MAP = {
  connected:        { cls: "connected",    txt: "CONECTADO" },
  "connected-idle": { cls: "reconnecting", txt: "SEM TELEMETRIA" },
  reconnecting:     { cls: "reconnecting", txt: "RECONECTANDO…" },
  offline:          { cls: "offline",      txt: "OFFLINE" },
};

function App() {
  const t = CFG;

  const [sp, setSp] = useState(120);
  const [running, setRunning] = useState(true);
  const [load, setLoad] = useState(false);
  const [status, setStatus] = useState("offline");
  const [hasData, setHasData] = useState(false);

  const [latest, setLatest] = useState({ rpm: 0, sp: 120, err: 0, u: 0, derr: 0 });
  const [samples, setSamples] = useState([]);
  const [events, setEvents] = useState([]);
  const [kpi, setKpi] = useState({ tset: null, over: null, ess: null });

  const engineRef = useRef(null);
  const prevErrRef = useRef(0);


  useEffect(() => {
    const mqttUrl = window.DASHBOARD_MQTT_URL || "ws://localhost:9001";
    const eng = new window.DataEngine({ url: mqttUrl });
    engineRef.current = eng;
    window.dashboardEngine = eng;
    eng.onStatus = (s) => setStatus(s);
    eng.onSample = (smp) => {
      const derr = smp.err - prevErrRef.current;
      prevErrRef.current = smp.err;
      setHasData(true);
      setLatest({ rpm: smp.rpm, sp: smp.sp, err: smp.err, u: smp.u, derr });
      setSamples((prev) => {
        const next = prev.length >= MAX_SAMPLES ? prev.slice(prev.length - MAX_SAMPLES + 1) : prev.slice();
        next.push(smp);
        return next;
      });

      setKpi({ tset: smp.ts, over: smp.mp, ess: smp.ess });
    };
    eng.start();
    return () => { clearInterval(eng._statusTimer); if (eng.client) eng.client.end(true); };
  }, []);


  const applySp = useCallback((v) => {
    v = Math.max(0, Math.round(v));
    setSp(v);
    engineRef.current.setSetpoint(v);
    setEvents((prev) => [...prev.slice(-12), { wall: performance.now(), type: "sp", label: "SP " + v }]);
  }, []);

  const toggleRun = useCallback(() => {
    setRunning((r) => {
      const nr = !r;
      engineRef.current.setRunning(nr);
      return nr;
    });
  }, []);

  const toggleLoad = useCallback(() => {
    setLoad((l) => {
      const nl = !l;
      engineRef.current.setLoad(nl);

      setEvents((prev) => [...prev.slice(-12), { wall: performance.now(), type: "load", label: nl ? "CARGA" : "ALÍVIO" }]);
      return nl;
    });
  }, []);


  const onTarget = sp > 0 && hasData && Math.abs(latest.err) <= sp * 0.02 && running;
  const saturated = hasData && latest.u >= 99;
  const stView = STATUS_MAP[status] || STATUS_MAP.offline;

  const fmt = (v, d) => (hasData ? (d ? v.toFixed(d) : Math.round(v)) : "—");


  useEffect(() => {
    document.documentElement.style.setProperty("--amber", t.accent);
    document.documentElement.style.setProperty("--cyan", t.trace);
  }, []);

  return (
    <div className="app">

      <header className="hdr">
        <div className="brand">
          <GearIcon spin={running && hasData} />
          <div>
            <h1>{t.title}</h1>
            <div className="sub">Controle Fuzzy de Velocidade · SCADA</div>
          </div>
        </div>
        <div className="spacer"></div>
        <div className={"status " + stView.cls}>
          <span className="dot"></span>
          <div>
            <div className="txt">{stView.txt}</div>
            <div className="url">broker · {window.DASHBOARD_MQTT_URL || "ws://localhost:9001"}</div>
          </div>
        </div>
      </header>


      <div className="main">

        <div className="col">
          <div className="card framed">
            <div className="card-h">
              <span className="label">Velocidade do Eixo</span>
              <span className="tag">motor/telemetry</span>
            </div>
            <Tachometer rpm={hasData ? latest.rpm : 0} sp={sp} max={240} onTarget={onTarget} />
          </div>

          <div className="card framed">
            <div className="card-h">
              <span className="label">Atuação</span>
              <span className="tag">motor/cmd</span>
            </div>
            <div className="run-row">
              <button className={"btn " + (running ? "run active" : "run")} onClick={toggleRun}>
                {running ? <StopIco /> : <PlayIco />}{running ? "Parar" : "Iniciar"}
              </button>
            </div>
          </div>

          <div className="card framed">
            <div className="card-h">
              <span className="label">Set Point</span>
              <span className="tag">motor/setpoint</span>
            </div>
            <div className="sp-grid">
              {SP_PRESETS.map((v, i) => (
                <button key={v} className={"sp-btn" + (sp === v ? " on" : "")} onClick={() => applySp(v)}>
                  <div className="n">{v}</div>
                  <div className="k">SP{i + 1} · rpm</div>
                </button>
              ))}
            </div>
            <div className="slider-wrap">
              <div className="slider-top">
                <span className="lbl">Ajuste livre</span>
                <span className="val">{sp} <span style={{ color: "var(--muted)", fontSize: 11 }}>rpm</span></span>
              </div>
              <input className="rng" type="range" min="0" max="240" step="1" value={sp}
                     style={{ "--fill": (sp / 240 * 100) + "%" }}
                     onChange={(e) => applySp(+e.target.value)} />
            </div>
          </div>
        </div>


        <div className="col col-chart">
          <div className="card framed">
            <div className="card-h">
              <span className="label">Resposta Temporal · RPM × t</span>
              <button className={"load-btn" + (load ? " on" : "")} onClick={toggleLoad}>
                <span className="led"></span>{load ? "Carga aplicada" : "Aplicar carga"}
              </button>
            </div>
            <ResponseChart samples={samples} events={events} ymax={240} windowSec={t.windowSec} />
            <div className="chart-legend" style={{ marginTop: 10 }}>
              <span><i style={{ borderColor: "var(--cyan-2)" }}></i>Velocidade (rpm)</span>
              <span><i className="dash" style={{ borderColor: "var(--amber)" }}></i>Set point</span>
              <span><i className="dash" style={{ borderColor: "var(--red)" }}></i>Perturbação</span>
              <span style={{ color: "var(--muted-2)" }}>Banda ±2%</span>
            </div>
          </div>
        </div>


        <div className="col">
          <div className="card framed">
            <div className="card-h"><span className="label">Leituras ao Vivo</span></div>
            <div className="readout">
              <div className="ro rpm">
                <span className="accent"></span>
                <div className="ro-l">Velocidade atual</div>
                <div className="ro-v"><b>{fmt(latest.rpm)}</b><span>rpm</span></div>
              </div>
              <div className="ro err">
                <span className="accent"></span>
                <div className="ro-l">Erro (SP − RPM)</div>
                <div className="ro-v"><b style={{ color: hasData && Math.abs(latest.err) <= sp * 0.02 ? "var(--green)" : "var(--text)" }}>
                  {hasData ? (latest.err >= 0 ? "+" : "") + Math.round(latest.err) : "—"}</b><span>rpm</span></div>
              </div>
              <div className="ro pwm">
                <span className="accent"></span>
                <div className="ro-l">Saída do controlador · PWM</div>
                <div className="ro-v"><b>{fmt(latest.u)}</b><span>%</span></div>
                <div className={"satbar" + (saturated ? " sat" : "")}>
                  <div className="fill" style={{ width: (hasData ? Math.max(0, Math.min(100, latest.u)) : 0) + "%" }}></div>
                </div>
                <div className={"sat-flag" + (saturated ? " on" : "")}>▲ ATUADOR SATURADO (100%)</div>
              </div>
            </div>
          </div>

          {t.showKpis && (
            <div className="card framed">
              <div className="card-h">
                <span className="label">Métricas de Controle</span>
                <span className="tag">motor/telemetry</span>
              </div>
              <div className="kpis">
                <div className={"kpi" + (kpi.tset != null && kpi.tset < 4 ? " good" : "")}>
                  <div className="kl">T. Acomodação</div>
                  <div className="kv">{kpi.tset != null ? kpi.tset.toFixed(1) : "—"}<small>s</small></div>
                </div>
                <div className={"kpi" + (kpi.over != null && kpi.over > 12 ? " warn" : kpi.over != null ? " good" : "")}>
                  <div className="kl">Sobressinal</div>
                  <div className="kv">{kpi.over != null ? kpi.over.toFixed(0) : "—"}<small>%</small></div>
                </div>
                <div className={"kpi" + (kpi.ess != null && Math.abs(kpi.ess) <= Math.max(1, sp * 0.02) ? " good" : "")}>
                  <div className="kl">Erro Regime</div>
                  <div className="kv">{kpi.ess != null ? Math.round(kpi.ess) : "—"}<small>rpm</small></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {t.showFuzzy && (
        <div className="card framed" style={{ padding: "16px 16px 18px" }}>
          <div className="card-h" style={{ marginBottom: 14 }}>
            <span className="label" style={{ fontSize: 12 }}>Lógica Fuzzy · O Controlador "Pensando"</span>
            <span className="tag">e &amp; Δe → termo linguístico → Δu</span>
          </div>
          <FuzzyPanel err={hasData ? latest.err : 0} derr={hasData ? latest.derr : 0} />
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
