const TERM_COLOR = {
  NG: "#ff5468", NP: "#ff8a4d", ZE: "#8294a8", PP: "#5fe9d8", PG: "#3ddc84",
};

function TermBars({ title, sub, mus, activeIdx }) {
  const TERMS = window.Fuzzy.TERMS;
  return (
    <div className="card framed">
      <div className="card-h">
        <span className="label">{title}</span>
        <span className="tag">{sub}</span>
      </div>
      <div className="terms">
        {TERMS.map((t, i) => (
          <div className={"term-row" + (i === activeIdx ? " active" : "")} key={t}>
            <span className="tn">{t}</span>
            <span className="tbar">
              <span className="tf" style={{ width: (mus[i] * 100).toFixed(0) + "%", background: TERM_COLOR[t] }}></span>
            </span>
            <span className="tv">{mus[i].toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleMatrix({ eIdx, deIdx }) {
  const TERMS = window.Fuzzy.TERMS;
  const ruleOut = window.Fuzzy.ruleOut;
  return (
    <div className="card framed matrix-card">
      <div className="card-h">
        <span className="label">Base de Regras 5×5</span>
        <span className="tag">Δu = f(e, Δe)</span>
      </div>
      <div className="matrix">
        <div className="mh corner"><span>e ↓</span><span>Δe →</span></div>
        {TERMS.map((t) => <div className="mh" key={"h" + t}>{t}</div>)}
        {TERMS.map((te, i) => (
          <React.Fragment key={"r" + te}>
            <div className="mh">{te}</div>
            {TERMS.map((td, j) => {
              const out = TERMS[ruleOut(i, j)];
              const active = i === eIdx && j === deIdx;
              return (
                <div className={"mc" + (active ? " active" : "")} key={te + td}
                     style={active ? { background: TERM_COLOR[out] } : {
                       color: TERM_COLOR[out], borderColor: "rgba(150,175,205,0.12)",
                     }}>
                  {out}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="matrix-axis">
        <span>célula acesa = regra dominante agora</span>
      </div>
    </div>
  );
}

function FuzzyPanel({ err, derr }) {
  const F = window.Fuzzy;
  const en = Math.max(-1, Math.min(1, err / F.SCALE_E));
  const den = Math.max(-1, Math.min(1, derr / F.SCALE_DE));
  const me = F.memberships(en);
  const mde = F.memberships(den);
  const eIdx = me.indexOf(Math.max(...me));
  const deIdx = mde.indexOf(Math.max(...mde));
  const outIdx = F.ruleOut(eIdx, deIdx);
  const outTerm = F.TERMS[outIdx];
  const duNorm = F.defuzz(en, den);
  const sgn = (v, d) => { const n = +v.toFixed(d); return (n > 0 ? "+" : "") + n.toFixed(d); };

  return (
    <div className="fuzzy">
      <div className="col">
        <TermBars title="Erro (e)" sub={sgn(err, 0) + " rpm"} mus={me} activeIdx={eIdx} />
      </div>
      <div className="col">
        <TermBars title="Variação do erro (Δe)" sub={sgn(derr, 1)} mus={mde} activeIdx={deIdx} />
        <div className="card framed">
          <div className="fz-out" style={{ borderTop: "none", paddingTop: 0 }}>
            <span className="ol">Ação fuzzy (Δu)</span>
            <span className="ochip" style={{ background: TERM_COLOR[outTerm] + "22", color: TERM_COLOR[outTerm], borderColor: TERM_COLOR[outTerm] }}>
              {outTerm}
            </span>
            <span className="odu">Δu&nbsp;sugerido&nbsp;<b>{(duNorm >= 0 ? "+" : "") + (duNorm * 100).toFixed(0)}%</b></span>
          </div>
        </div>
      </div>
      <RuleMatrix eIdx={eIdx} deIdx={deIdx} />
    </div>
  );
}

window.FuzzyPanel = FuzzyPanel;
