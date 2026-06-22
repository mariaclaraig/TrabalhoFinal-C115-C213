const TERM_COLOR = {
  NG: "#ff5468", NP: "#ff8a4d", ZE: "#8294a8", PP: "#5fe9d8", PG: "#3ddc84",
};

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

function FuzzyPanel({ err, de }) {
  const F = window.Fuzzy;
  const en = Math.max(-1, Math.min(1, err / F.SCALE_E));
  const den = Math.max(-1, Math.min(1, de / F.SCALE_DE));
  const me = F.memberships(en);
  const mde = F.memberships(den);
  const eIdx = me.indexOf(Math.max(...me));
  const deIdx = mde.indexOf(Math.max(...mde));

  return (
    <div className="fuzzy">
      <RuleMatrix eIdx={eIdx} deIdx={deIdx} />
    </div>
  );
}

window.FuzzyPanel = FuzzyPanel;
