/* ------------------------------------------------------------------
   Sound — synthesised with Web Audio, no files, never autoplays.

   A small generative piece in Dastgah-e Shur on D (true koron E):
   · santur voice — Karplus-Strong physical model, three detuned
     strings per note (the santur's courses), rendered once and cached
   · melody built from real Shur idioms, moving low → middle → high
     (Shahnaz) → back to the tonic, with grace notes and riz (tremolo)
   · a soft breathing drone on the tonic and fifth instead of chords
   · everything placed in a large, dark hall
   ------------------------------------------------------------------ */
(function () {
  let ctx = null, master = null, bus = null, verb = null, echo = null, drone = null;
  let enabled = false, unlocked = false, started = false;
  let melodyTimer = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const D4 = 293.66;
  const hz = (semis) => D4 * Math.pow(2, semis / 12);

  // Shur on D: D · E-koron · F · G · A · B♭ · C   (koron ≈ ¾ tone above D)
  const SHUR = [0, 1.5, 3, 5, 7, 8, 10];
  const semisOf = (deg) => {
    const o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
    return SHUR[i] + 12 * o;
  };

  /* ================= audio graph ================= */
  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iOS: route Web Audio as media playback so the silent switch doesn't mute it
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    ctx = new AC();

    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.3;
    master.connect(comp).connect(ctx.destination);

    bus = ctx.createGain();
    bus.connect(master);

    verb = ctx.createConvolver();
    verb.buffer = impulse(4.6, 2.8);
    const verbTone = ctx.createBiquadFilter(); verbTone.type = "lowpass"; verbTone.frequency.value = 5200;
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.5;
    verb.connect(verbTone).connect(verbGain).connect(master);

    echo = ctx.createDelay(2);
    echo.delayTime.value = 0.52;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 1900;
    echo.connect(tone).connect(fb).connect(echo);
    const echoOut = ctx.createGain(); echoOut.gain.value = 0.22;
    tone.connect(echoOut).connect(master);
    echoOut.connect(verb);
  }

  // dry + reverb (+ optional echo)
  function place(node, { dry = 1, wet = 0.6, delay = 0 } = {}) {
    const d = ctx.createGain(); d.gain.value = dry; node.connect(d).connect(bus);
    const w = ctx.createGain(); w.gain.value = wet; node.connect(w).connect(verb);
    if (delay) { const e = ctx.createGain(); e.gain.value = delay; node.connect(e).connect(echo); }
  }

  // Older iOS: a (silent) media element played inside the tap un-mutes Web Audio.
  function unlockIOS() {
    if (unlocked) return;
    unlocked = true;
    try {
      const rate = 8000, n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt ");
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true);
      v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
      const a = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
      a.setAttribute("playsinline", ""); a.loop = true; a.volume = 0.01;
      a.play().catch(() => {});
    } catch (e) {}
  }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ================= santur: Karplus-Strong ================= */
  // One struck string. A first-order allpass supplies the fractional delay,
  // which keeps the koron quarter-tones in tune even on short (high) strings.
  function ksString(out, freq, sr, t60, detuneCents, strikePos) {
    const f = freq * Math.pow(2, detuneCents / 1200);
    const S = 0.22;                           // loop lowpass: small = bright, metallic
    const period = sr / f;
    const L = Math.max(2, Math.floor(period - S - 0.1));
    const d = period - L - S;                 // allpass fractional delay, 0.1…1.1
    const C = (1 - d) / (1 + d);
    const rho = Math.exp(Math.log(0.001) / (f * t60));

    // hammer excitation: bright noise burst, comb-filtered by strike position
    const line = new Float32Array(L);
    const raw = new Float32Array(L);
    let lpState = 0;
    for (let i = 0; i < L; i++) { lpState = lpState * 0.35 + (Math.random() * 2 - 1) * 0.65; raw[i] = lpState; }
    const off = Math.max(1, Math.floor(strikePos * L));
    for (let i = 0; i < L; i++) line[i] = raw[i] - raw[(i + off) % L];

    let idx = 0, prev = 0, apx = 0, apy = 0;
    for (let n = 0; n < out.length; n++) {
      const x = line[idx];
      out[n] += x;
      const lp = rho * ((1 - S) * x + S * prev);
      prev = x;
      const ap = C * lp + apx - C * apy;
      apx = lp; apy = ap;
      line[idx] = ap;
      idx = idx + 1 === L ? 0 : idx + 1;
    }
  }

  const noteCache = new Map();
  function santurBuffer(semis) {
    const key = Math.round(semis * 2) / 2;
    if (noteCache.has(key)) return noteCache.get(key);
    const sr = ctx.sampleRate;
    const f = hz(key);
    const t60 = f < 250 ? 6.5 : f < 500 ? 5.2 : 4;
    const len = Math.floor(sr * Math.min(4.5, t60 * 0.75));
    const data = new Float32Array(len);
    const pos = rand(0.11, 0.16);
    // a santur course: several strings a hair apart → the characteristic shimmer
    [-2.2, 0.4, 2.8].forEach((c) => ksString(data, f, sr, t60, c, pos));
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(data[i]));
    const g = peak ? 0.9 / peak : 1;
    const fadeOut = Math.floor(sr * 0.3);
    for (let i = 0; i < len; i++) {
      data[i] *= g;
      if (i > len - fadeOut) data[i] *= (len - i) / fadeOut;
    }
    const buf = ctx.createBuffer(1, len, sr);
    buf.getChannelData(0).set(data);
    noteCache.set(key, buf);
    return buf;
  }

  // Render the whole range in small slices so nothing stutters on a phone.
  function prewarm() {
    const todo = [];
    for (let deg = -5; deg <= 11; deg++) todo.push(semisOf(deg));
    todo.push(-12, -24);
    const step = () => {
      const s = todo.shift();
      if (s === undefined) return;
      santurBuffer(s);
      setTimeout(step, 24);
    };
    setTimeout(step, 120); // start after the tap's own frame has painted
  }

  function strike(semis, when, vel = 0.5, { ring = null, pan = null } = {}) {
    const t = Math.max(when || 0, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = santurBuffer(semis);
    const g = ctx.createGain();
    g.gain.value = vel;
    if (ring) { // damped (used inside a riz)
      g.gain.setValueAtTime(vel, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    }
    // softer strikes are also darker, like a real mallet
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass";
    tone.frequency.value = 2200 + vel * 9000;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(tone).connect(g);
    if (p) { p.pan.value = pan ?? Math.max(-0.5, Math.min(0.5, semis / 34)); g.connect(p); }
    place(p || g, { dry: 0.85, wet: 0.65, delay: 0.35 });
    src.start(t);
    src.stop(t + (ring ? ring + 0.05 : src.buffer.duration));
  }

  // riz: the santur's tremolo — rapid alternating strokes that swell and fade
  function riz(semis, when, dur, vel) {
    const hits = Math.max(6, Math.floor(dur / 0.068));
    for (let i = 0; i < hits; i++) {
      const k = i / (hits - 1);
      const swell = Math.sin(Math.min(1, k * 1.25) * Math.PI * 0.5) * (1 - 0.55 * k * k);
      const v = vel * (0.28 + 0.5 * swell) * (i % 2 ? 0.82 : 1); // two mallets, slightly uneven
      strike(semis, when + i * 0.068 + rand(-0.006, 0.006), v, { ring: i === hits - 1 ? 2.2 : 0.32 });
    }
  }

  /* ================= drone ================= */
  function startDrone() {
    const out = ctx.createGain(); out.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.9; lp.frequency.value = 520;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.035;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt).connect(lp.frequency); lfo.start();
    lp.connect(out);
    place(out, { dry: 0.8, wet: 0.9 });

    const voices = [
      { f: hz(-12), type: "triangle", level: 0.034 },     // D3
      { f: hz(-5), type: "triangle", level: 0.016 },      // A3 — leans to G3 in the middle register
      { f: hz(0), type: "sine", level: 0.008 },           // D4
      { f: hz(-24), type: "sine", level: 0.02 }           // D2 body
    ].map((v, i) => {
      const g = ctx.createGain(); g.gain.value = v.level;
      const breath = ctx.createOscillator(); breath.frequency.value = 0.05 + i * 0.021;
      const bAmt = ctx.createGain(); bAmt.gain.value = v.level * 0.45;
      breath.connect(bAmt).connect(g.gain); breath.start();
      const oscs = [-3, 3].map((c) => {
        const o = ctx.createOscillator(); o.type = v.type;
        o.frequency.value = v.f; o.detune.value = c;
        o.connect(g); o.start();
        return o;
      });
      g.connect(lp);
      return oscs;
    });

    out.gain.linearRampToValueAtTime(1, ctx.currentTime + 6);
    drone = {
      lean(toG) {
        const f = toG ? hz(-7) : hz(-5);
        voices[1].forEach((o) => o.frequency.setTargetAtTime(f, ctx.currentTime, 2.5));
      }
    };
  }

  /* ================= melody: Shur idioms ================= */
  // degrees: 0 = D4, 1 = E-koron, 2 = F, 3 = G, 4 = A, 5 = B♭, 6 = C, 7 = D5 … ; -1 = C4, -2 = B♭3
  // durations in beats; the last note of a phrase is held (and may become a riz)
  const PHRASES = {
    low: [
      { n: [3, 2, 1, 0], d: [1, 1, 1.5, 3] },                          // the Shur cadence
      { n: [0, 1, 2, 1, 0], d: [1, .5, 1.5, 1, 3] },
      { n: [-2, -1, 0, 1, 0], d: [1, 1, 1.5, .5, 3] },
      { n: [2, 1, 2, 3, 2, 1, 0], d: [.5, .5, 1, 1, .5, .5, 3] },
      { n: [0, 0, 1, 2, 1], d: [.75, .25, 1, 1.5, 2.5] }               // open ending, on koron
    ],
    mid: [
      { n: [2, 3, 4, 3, 2, 3], d: [1, .5, 1.5, .5, .5, 2.5] },
      { n: [4, 3, 2, 3, 2, 1, 0], d: [1.5, .5, .5, 1, .5, .5, 3] },
      { n: [3, 4, 5, 4, 3, 4], d: [1, .5, 1, .5, 1, 2.5] },
      { n: [4, 5, 4, 3, 2, 3, 2, 1], d: [1, .5, .5, 1, .5, .5, 1, 2.5] }
    ],
    high: [                                                             // Shahnaz register
      { n: [7, 6, 5, 4, 3], d: [2, .5, .5, 1, 3] },
      { n: [5, 6, 7, 8, 7, 6, 5, 4], d: [.5, .5, 1, 1.5, .5, .5, .5, 2.5] },
      { n: [7, 7, 8, 9, 8, 7], d: [.75, .25, 1, 1.5, 1, 3] },
      { n: [4, 5, 7, 6, 5, 4, 3], d: [1, .5, 1.5, .5, .5, 1, 3] }
    ],
    home: [
      { n: [4, 3, 2, 1, 0], d: [1, 1, 1, 1.5, 4] },
      { n: [3, 2, 1, 2, 1, 0], d: [1, .5, .5, 1, 1, 4] }
    ]
  };
  // the arc of an improvisation: settle low, rise, touch the top, come home
  const ARC = ["low", "low", "mid", "mid", "high", "high", "mid", "home"];
  let arcPos = 0;

  function playPhrase() {
    const register = ARC[arcPos % ARC.length];
    arcPos++;
    drone && drone.lean(register === "mid");

    const ph = pick(PHRASES[register]);
    const beat = rand(0.3, 0.38);                   // a slightly different breath each time
    let t = ctx.currentTime + 0.08;
    const count = ph.n.length;

    // low anchor on the tonic at the start of some phrases
    if (Math.random() < 0.45) strike(pick([-12, -12, -24]), t, 0.22, { pan: -0.3 });

    ph.n.forEach((deg, i) => {
      const semis = semisOf(deg);
      const k = i / Math.max(1, count - 1);
      const vel = (0.32 + 0.26 * Math.sin(k * Math.PI)) * rand(0.88, 1.05);  // arched dynamics
      const dur = ph.d[i] * beat * rand(0.93, 1.1);                          // rubato
      const last = i === count - 1;

      // grace note from above (tekiyeh), a Persian ornament
      if (!last && ph.d[i] >= 1 && Math.random() < 0.22) strike(semisOf(deg + 1), t - 0.07, vel * 0.45);

      if (last && dur > 0.8 && Math.random() < 0.55) riz(semis, t, Math.min(dur * 0.9, 1.6), vel);
      else strike(semis, t, vel);

      // octave doubling on some long notes
      if (ph.d[i] >= 1.5 && Math.random() < 0.3) strike(semis - 12, t + 0.012, vel * 0.4);
      t += dur;
    });

    const tail = register === "home" ? rand(4.5, 6.5) : rand(1.4, 3.2);
    const nextIn = (t - ctx.currentTime + tail) * 1000;
    melodyTimer = setTimeout(() => { if (enabled) playPhrase(); }, nextIn);
  }

  function startMusic() {
    if (started) return;
    started = true;
    prewarm();
    startDrone();
    // faint air of a large room
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(4); n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.5;
    const ng = ctx.createGain(); ng.gain.value = 0.006;
    n.connect(bp).connect(ng).connect(bus); n.start();
  }

  function schedule(on, firstPhraseIn = 1400) {
    clearTimeout(melodyTimer);
    if (!on) return;
    melodyTimer = setTimeout(() => { if (enabled) playPhrase(); }, firstPhraseIn);
  }

  /* ================= ceremonial cues ================= */
  function bell(freq = 294, level = 0.2, decay = 5) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = 1;
    place(out, { dry: 0.9, wet: 0.8, delay: 0.25 });
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(([m, a]) => {
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.value = freq * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level * a, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay / Math.sqrt(m));
      o.connect(g).connect(out);
      o.start(t); o.stop(t + decay + 0.1);
    });
  }

  function seal() {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain(); place(out, { dry: 1, wet: 0.5 });
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.4);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    n.connect(bp).connect(g).connect(out); n.start(t);
    const o = ctx.createOscillator(); o.type = "triangle";
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.4);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.25, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(og).connect(out); o.start(t); o.stop(t + 0.6);
    setTimeout(() => bell(293.66, 0.14, 6), 300);
  }

  function doors() {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain(); place(out, { dry: 0.8, wet: 0.8 });
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(3.5);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1300, t + 1.6); lp.frequency.linearRampToValueAtTime(350, t + 3.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
    n.connect(lp).connect(g).connect(out); n.start(t);
    bell(146.83, 0.12, 7);
  }

  // rising Shur gesture for arrivals: D – E(koron) – F – A – D
  function flourish() {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime + 0.03;
    [0, 1.5, 3, 7, 12].forEach((s, i) => strike(s, t + i * 0.17, 0.3 + i * 0.05));
  }

  function setEnabled(on, { quiet = false } = {}) {
    init();
    if (!ctx) return false;
    if (on) unlockIOS();
    enabled = on;
    if (ctx.state !== "running") ctx.resume();
    if (on) startMusic();
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(on ? 1 : 0, t + (on ? (quiet ? 0.01 : 0.4) : 0.6));
    schedule(on, quiet ? 3200 : 1600); // after the seal, the santur enters as the doors open
    if (on && !quiet) setTimeout(flourish, 60);
    return true;
  }

  document.addEventListener("visibilitychange", () => {
    if (!ctx || !enabled) return;
    if (document.hidden) { schedule(false); ctx.suspend(); }
    else { ctx.resume(); schedule(true); }
  });

  window.NADER_SOUND = {
    setEnabled,
    get enabled() { return enabled; },
    seal, doors, flourish,
    chime: () => { if (enabled && ctx) strike(12, 0, 0.3); },
    resonance: () => bell(196, 0.12, 7)
  };
})();
