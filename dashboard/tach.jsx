const { useMemo: tachMemo } = React;

function Tachometer({ rpm, sp, max = 240, onTarget }) {
  const cx = 150, cy = 150, R = 122;
  const A0 = -225, A1 = 45;
  const sweep = A1 - A0;

  // Funcoes auxiliares para converter RPM em angulo e coordenadas SVG.
  const toRad = (d) => (d * Math.PI) / 180;
  const pt = (ang, r) => [cx + r * Math.cos(toRad(ang)), cy + r * Math.sin(toRad(ang))];
  const angOf = (v) => A0 + (Math.max(0, Math.min(max, v)) / max) * sweep;

  const ticks = tachMemo(() => {
    // Marcas do tacometro recalculadas apenas quando o limite maximo muda.
    const arr = [];
    const step = 30;
    for (let v = 0; v <= max; v += step) {
      const a = angOf(v);
      const major = v % 60 === 0;
      const [x1, y1] = pt(a, R);
      const [x2, y2] = pt(a, R - (major ? 16 : 9));
      const [lx, ly] = pt(a, R - 30);
      arr.push({ v, a, x1, y1, x2, y2, lx, ly, major });
    }
    return arr;
  }, [max]);


  const arcPath = (vStart, vEnd, r) => {
    // Gera o caminho SVG de um arco entre dois valores de RPM.
    const a0 = angOf(vStart), a1 = angOf(vEnd);
    const [sx, sy] = pt(a0, r), [ex, ey] = pt(a1, r);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };

  const needleAng = angOf(rpm);
  const [nx, ny] = pt(needleAng, R - 26);
  const [ntx, nty] = pt(needleAng + 180, 20);

  const spAng = angOf(sp);
  const [m1x, m1y] = pt(spAng, R + 2);
  const [m2x, m2y] = pt(spAng, R - 20);
  const [mlx, mly] = pt(spAng, R + 14);

  return (
    <div className="tach">
      <svg viewBox="0 0 300 300" aria-label="Tacômetro">
        <defs>
          <linearGradient id="needleG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cyan-2)" />
            <stop offset="100%" stopColor="var(--cyan)" />
          </linearGradient>
          <radialGradient id="hubG" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#2b3a4d" />
            <stop offset="100%" stopColor="#0c1118" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.4" /></filter>
        </defs>


        {/* Arco de fundo e arco preenchido com a velocidade atual. */}
        <path d={arcPath(0, max, R)} fill="none" stroke="rgba(150,175,205,0.14)" strokeWidth="10" strokeLinecap="round" />

        <path d={arcPath(0, Math.max(0.1, rpm), R)} fill="none"
              stroke={onTarget ? "var(--green)" : "var(--cyan)"} strokeWidth="10" strokeLinecap="round"
              opacity="0.9" filter="url(#glow)" />
        <path d={arcPath(0, Math.max(0.1, rpm), R)} fill="none"
              stroke={onTarget ? "var(--green)" : "var(--cyan)"} strokeWidth="6" strokeLinecap="round" />


        {/* Marcacoes numericas do tacometro. */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke={t.major ? "rgba(231,238,246,0.75)" : "rgba(150,175,205,0.4)"}
                  strokeWidth={t.major ? 2 : 1} strokeLinecap="round" />
            {t.major && (
              <text x={t.lx} y={t.ly} fill="var(--muted)" fontSize="12"
                    fontFamily="var(--font-mono)" textAnchor="middle" dominantBaseline="middle">
                {t.v}
              </text>
            )}
          </g>
        ))}


        {/* Marcador vermelho do set point atual. */}
        <line x1={m1x} y1={m1y} x2={m2x} y2={m2y} stroke="var(--red)" strokeWidth="3.5" strokeLinecap="round" />
        <polygon
          points={`${mlx},${mly} ${mlx - 6},${mly - 9} ${mlx + 6},${mly - 9}`}
          fill="var(--red)" transform={`rotate(${spAng + 90} ${mlx} ${mly})`} />


        {/* Ponteiro da velocidade medida. */}
        <line x1={ntx} y1={nty} x2={nx} y2={ny} stroke="url(#needleG)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow)" />
        <line x1={ntx} y1={nty} x2={nx} y2={ny} stroke="url(#needleG)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="13" fill="url(#hubG)" stroke="var(--line-2)" />
        <circle cx={cx} cy={cy} r="3.5" fill={onTarget ? "var(--green)" : "var(--cyan-2)"} />


        <text x={cx} y={cy + 52} textAnchor="middle" fill="var(--text)"
              fontFamily="var(--font-mono)" fontSize="40" fontWeight="700" letterSpacing="-1">
          {Math.round(rpm)}
        </text>
        <text x={cx} y={cy + 72} textAnchor="middle" fill="var(--muted)"
              fontFamily="var(--font-disp)" fontSize="11" letterSpacing="3">
          RPM · EIXO
        </text>
      </svg>
      <div className="legend">
        <span><i style={{ background: "var(--cyan)" }}></i>Velocidade</span>
        <span><i style={{ background: "var(--red)" }}></i>Set point</span>
        {onTarget && <span style={{ color: "var(--green)" }}><i style={{ background: "var(--green)" }}></i>No alvo</span>}
      </div>
    </div>
  );
}

window.Tachometer = Tachometer;
