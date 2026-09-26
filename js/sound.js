/* ------------------------------------------------------------------
   Sound — synthesised with Web Audio, no files, never autoplays.
   A generative piece in Dastgah-e Shur on D (with the true koron
   quarter-tone): a slowly changing pad under sparse, santur-like
   phrases, all inside a large, dark reverb. Never repeats exactly.
   ------------------------------------------------------------------ */
(function () {
  let ctx = null, master = null, bus = null, verb = null, echo = null;
  let enabled = false, unlocked = false, started = false;
  let melodyTimer = null, padTimer = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const hz = (semisFromD4) => 293.66 * Math.pow(2, semisFromD4 / 12);

  // Shur on D: D · E-koron · F · G · A · B♭ · C · D  (koron ≈ 1.5 semitones above D)
  const SHUR = [0, 1.5, 3, 5, 7, 8, 10];
  const degree = (d) => {                     // scale degree → semitones (any octave)
    const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
    return SHUR[i] + 12 * o;
  };

  /* ---------- graph ---------- */
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
    comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    // everything musical goes into `bus`: dry + reverb + echo
    bus = ctx.createGain();
    bus.connect(master);

    verb = ctx.createConvolver();
    verb.buffer = impulse(4.2, 2.6);
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.55;
    verb.connect(verbGain).connect(master);

    echo = ctx.createDelay(2);
    echo.delayTime.value = 0.46;
    const fb = ctx.createGain(); fb.gain.value = 0.34;
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2000;
    echo.connect(tone).connect(fb).connect(echo);
    const echoOut = ctx.createGain(); echoOut.gain.value = 0.28;
    tone.connect(echoOut).connect(master);
    echoOut.connect(verb);
  }

  // Send a node into the space: dry + reverb (+ optional echo)
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

  /* ---------- instruments ---------- */
  // Santur-like pluck: bright hammer transient, two slightly detuned strings, long ring.
  function pluck(freq, when, level = 0.1, ring = 2.6) {
    const t = when || ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(level, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = rand(-0.35, 0.35); out.connect(pan); }
    place(pan || out, { dry: 0.8, wet: 0.7, delay: 0.5 });

    const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(freq * 9, 9000), t);
    lp.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.9);
    lp.connect(out);

    [[1, "triangle", 0.7, 0], [1, "sine", 0.6, 3.5], [2, "sine", 0.18, -2], [3.01, "sine", 0.06, 0]].forEach(([m, type, a, cents]) => {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.value = freq * m; o.detune.value = cents;
      const g = ctx.createGain(); g.gain.value = a;
      if (m > 1) { g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ring / (m * 1.3)); }
      o.connect(g).connect(lp);
      o.start(t); o.stop(t + ring + 0.1);
    });

    // hammer "tick"
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.03);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(freq * 5, 8000); bp.Q.value = 2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(bp).connect(ng).connect(out); n.start(t);
  }

  // Warm pad voice with a slow swell and a breathing filter.
  function padChord(semis, dur) {
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(1, t + dur * 0.35);
    out.gain.setValueAtTime(1, t + dur * 0.6);
    out.gain.linearRampToValueAtTime(0.0001, t + dur * 1.25);
    place(out, { dry: 0.7, wet: 0.9 });

    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(380, t);
    lp.frequency.linearRampToValueAtTime(rand(900, 1500), t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(420, t + dur * 1.2);
    lp.connect(out);

    semis.forEach((s, i) => {
      [-6, 6].forEach((cents) => {
        const o = ctx.createOscillator(); o.type = i === 0 ? "triangle" : "sawtooth";
        o.frequency.value = hz(s); o.detune.value = cents;
        const g = ctx.createGain(); g.gain.value = (i === 0 ? 0.036 : 0.008);
        o.connect(g).connect(lp);
        o.start(t); o.stop(t + dur * 1.3);
      });
    });
  }

  /* ---------- the generative piece ---------- */
  // Chords drawn from Shur's natural colours (semitones from D4, bass voiced low)
  const CHORDS = [
    [-24, -17, -12, -5],   // D  A  D  A      — home
    [-26, -19, -14, -7],   // C  G  C  G
    [-28, -21, -16, -9],   // B♭ F  B♭ F
    [-19, -12, -7, -2],    // G  D  G  C      — suspended, leaning to Shahnaz colour
    [-24, -17, -9, -5],    // D  A  F  A
  ];
  let chordIndex = 0, melodyDeg = 7; // start on D5 area

  function nextPad() {
    if (!enabled) return;
    const dur = rand(9, 13);
    padChord(CHORDS[chordIndex], dur);
    // wander, but return home often
    chordIndex = Math.random() < 0.35 ? 0 : (chordIndex + 1 + Math.floor(Math.random() * 2)) % CHORDS.length;
    padTimer = setTimeout(nextPad, dur * 1000 * 0.72);
  }

  function nextPhrase() {
    if (!enabled) return;
    const t0 = ctx.currentTime + 0.05;
    const kind = Math.random();
    let t = t0;

    if (kind < 0.14) {
      // santur tremolo (riz): a single note rolled softly
      const f = hz(degree(melodyDeg));
      const count = Math.floor(rand(8, 14));
      for (let i = 0; i < count; i++) {
        const swell = Math.sin((i / count) * Math.PI);
        pluck(f, t, 0.03 + swell * 0.08, 1.1);
        t += 0.075;
      }
    } else {
      // a short descending-leaning phrase, Shur-style, gravitating to D and G
      const notes = Math.floor(rand(2, 6));
      for (let i = 0; i < notes; i++) {
        const step = pick([-1, -1, -2, 1, 1, 2, -1, 0]);
        melodyDeg = Math.max(3, Math.min(11, melodyDeg + step));
        if (Math.random() < 0.18) melodyDeg = pick([7, 3, 10]); // D5, G4, G5 anchors
        const f = hz(degree(melodyDeg));
        pluck(f, t, rand(0.11, 0.17), rand(2.2, 3.4));
        if (Math.random() < 0.25) pluck(f / 2, t, 0.06, 3); // octave doubling
        t += pick([0.32, 0.32, 0.48, 0.64, 0.24]);
      }
      if (Math.random() < 0.3) pluck(hz(degree(0)), t + 0.2, 0.09, 3.6); // resolve to D4
    }

    const gap = (t - t0) * 1000 + rand(1800, 4200);
    melodyTimer = setTimeout(nextPhrase, gap);
  }

  function startMusic() {
    if (started) return;
    started = true;
    // faint air of a large room underneath everything
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(4); n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.5;
    const ng = ctx.createGain(); ng.gain.value = 0.008;
    n.connect(bp).connect(ng).connect(bus); n.start();
  }

  function schedule(on, firstPhraseIn = 1400) {
    clearTimeout(melodyTimer); clearTimeout(padTimer);
    if (!on) return;
    nextPad();
    melodyTimer = setTimeout(nextPhrase, firstPhraseIn);
  }

  /* ---------- ceremonial cues ---------- */
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
    setTimeout(() => bell(293.66, 0.16, 6), 300);
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
    bell(146.83, 0.14, 7);
  }

  // A rising Shur gesture for arrivals: D – E(koron) – F – A
  function flourish() {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime + 0.02;
    [0, 1.5, 3, 7, 12].forEach((s, i) => pluck(hz(s), t + i * 0.16, 0.12, 3));
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
    schedule(on, quiet ? 3200 : 1400); // after the seal, let the melody enter as the doors open
    if (on && !quiet) setTimeout(flourish, 60); // immediate, gentle confirmation
    return true;
  }

  // pause the piece while the tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !enabled) return;
    if (document.hidden) { schedule(false); ctx.suspend(); }
    else { ctx.resume(); schedule(true); }
  });

  window.NADER_SOUND = {
    setEnabled,
    get enabled() { return enabled; },
    seal, doors, flourish,
    chime: () => pluck(hz(12), 0, 0.07, 3),
    resonance: () => bell(196, 0.13, 7)
  };
})();
