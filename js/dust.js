/* ------------------------------------------------------------------
   Gold dust — a few slow ambient motes, plus the burst when the seal breaks.
   ------------------------------------------------------------------ */
(function () {
  const canvas = document.querySelector(".dust");
  const c = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, dpr = 1, running = true;
  const motes = [], sparks = [];
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function mote(anywhere) {
    return {
      x: rand(0, w), y: anywhere ? rand(0, h) : h + 10,
      r: rand(0.35, 1.25), vy: rand(-0.06, -0.18), vx: rand(-0.04, 0.04),
      a: rand(0.06, 0.32), t: rand(0, Math.PI * 2), tw: rand(0.004, 0.012)
    };
  }

  function burst(cx, cy, height) {
    if (reduced) return;
    for (let i = 0; i < 64; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const life = rand(110, 240);
      sparks.push({
        x: cx + rand(-3, 3), y: cy + rand(-height / 2, height / 2),
        vx: dir * rand(0.15, 1.4), vy: rand(-0.7, 0.15),
        r: rand(0.4, 1.6), a: rand(0.45, 0.95), life, max: life,
        glint: Math.random() < 0.18
      });
    }
  }

  function frame() {
    if (!running) return;
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";

    for (const m of motes) {
      m.x += m.vx; m.y += m.vy; m.t += m.tw;
      if (m.y < -10) Object.assign(m, mote(false));
      const a = m.a * (0.55 + 0.45 * Math.sin(m.t));
      c.fillStyle = `rgba(214,182,128,${a})`;
      c.beginPath(); c.arc(m.x, m.y, m.r, 0, 6.283); c.fill();
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vx *= 0.982; s.vy = s.vy * 0.985 + 0.009;
      s.x += s.vx; s.y += s.vy; s.life--;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      const k = s.life / s.max;
      const a = s.a * k * (s.glint ? 0.6 + 0.4 * Math.sin(s.life * 0.3) : 1);
      c.fillStyle = `rgba(232,204,150,${a})`;
      c.beginPath(); c.arc(s.x, s.y, s.r * (0.6 + 0.4 * k), 0, 6.283); c.fill();
    }
    requestAnimationFrame(frame);
  }

  resize();
  addEventListener("resize", resize);
  const count = reduced ? 0 : Math.round(Math.min(26, (w * h) / 16000));
  for (let i = 0; i < count; i++) motes.push(mote(true));
  document.addEventListener("visibilitychange", () => {
    const was = running;
    running = !document.hidden;
    if (running && !was) requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);

  window.NADER_DUST = { burst };
})();
