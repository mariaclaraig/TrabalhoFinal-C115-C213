const { useRef: chartRef, useEffect: chartEffect } = React;

function ResponseChart({ samples, events, ymax = 240, windowSec = 40 }) {
  const canvasRef = chartRef(null);

  chartEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = cv.parentElement.getBoundingClientRect();
    const W = Math.max(320, rect.width), H = Math.max(240, rect.height);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const padL = 42, padR = 14, padT = 12, padB = 24;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    // Converte tempo e RPM para coordenadas do canvas.
    const now = samples.length ? samples[samples.length - 1].wall : performance.now();
    const tMin = now - windowSec * 1000;
    const xOf = (wall) => padL + ((wall - tMin) / (windowSec * 1000)) * plotW;
    const yOf = (v) => padT + plotH - (Math.max(0, Math.min(ymax, v)) / ymax) * plotH;

    ctx.strokeStyle = "rgba(150,175,205,0.10)";
    ctx.fillStyle = "rgba(130,148,168,0.85)";
    ctx.lineWidth = 1;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    // Desenha grade horizontal e rotulos do eixo de RPM.
    for (let v = 0; v <= ymax; v += 60) {
      const y = yOf(v);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText(String(v), padL - 8, y);
    }

    ctx.textAlign = "center"; ctx.textBaseline = "top";
    // Desenha a escala temporal da janela visivel.
    for (let s = 0; s <= windowSec; s += 10) {
      const wall = now - (windowSec - s) * 1000;
      const x = xOf(wall);
      ctx.strokeStyle = "rgba(150,175,205,0.06)";
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
      ctx.fillStyle = "rgba(95,112,136,0.9)";
      ctx.fillText("-" + (windowSec - s) + "s", x, padT + plotH + 6);
    }

    const vis = samples.filter((s) => s.wall >= tMin - 200);

    // Marca eventos de troca de set point no grafico.
    (events || []).forEach((ev) => {
      if (ev.wall < tMin) return;
      const x = xOf(ev.wall);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(245,165,36,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#ffc04d";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(ev.label, x + 4, padT + 3);
    });

    if (vis.length > 1) {

      const spNow = vis[vis.length - 1].sp;
      if (spNow > 0) {
        // Faixa de +/-2% usada como criterio visual de acomodacao.
        const yb1 = yOf(spNow * 1.02), yb2 = yOf(spNow * 0.98);
        ctx.fillStyle = "rgba(245,165,36,0.07)";
        ctx.fillRect(padL, yb1, plotW, yb2 - yb1);
      }

      // Linha tracejada do set point.
      ctx.strokeStyle = "#f5a524";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      vis.forEach((s, i) => {
        const x = xOf(s.wall), y = yOf(s.sp);
        if (i === 0) ctx.moveTo(x, y);
        else { ctx.lineTo(x, yOf(vis[i - 1].sp)); ctx.lineTo(x, y); }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Curva preenchida com a velocidade medida em RPM.
      const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
      grad.addColorStop(0, "rgba(54,214,195,0.28)");
      grad.addColorStop(1, "rgba(54,214,195,0.02)");
      ctx.beginPath();
      vis.forEach((s, i) => {
        const x = xOf(s.wall), y = yOf(s.rpm);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      const lastX = xOf(vis[vis.length - 1].wall);
      ctx.lineTo(lastX, padT + plotH);
      ctx.lineTo(xOf(vis[0].wall), padT + plotH);
      ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      ctx.strokeStyle = "#5fe9d8";
      ctx.lineWidth = 2.4;
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(54,214,195,0.5)";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      vis.forEach((s, i) => {
        const x = xOf(s.wall), y = yOf(s.rpm);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      const last = vis[vis.length - 1];
      ctx.fillStyle = "#5fe9d8";
      ctx.beginPath(); ctx.arc(xOf(last.wall), yOf(last.rpm), 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }, [samples, events, ymax, windowSec]);

  return (
    <div className="chart-host">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

window.ResponseChart = ResponseChart;
