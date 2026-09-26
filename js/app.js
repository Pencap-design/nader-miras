/* ------------------------------------------------------------------
   Nader · Miras — scene director
   seal → reveal → details → final   (3 interactions to the end)
   ------------------------------------------------------------------ */
(function () {
  const C = window.NADER_CONFIG;
  const M = window.NADER_MOTIFS;
  const S = window.NADER_SOUND;
  const D = window.NADER_DUST;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pace = reduced ? 0.35 : 1;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * pace));
  const get = (path) => path.split(".").reduce((o, k) => o && o[k], { ...C.copy, event: C.event });

  const stage = $("#stage");
  const ORDER = ["seal", "reveal", "details", "final"];
  let current = null, canAdvance = false, busy = false;

  /* ---------- Build DOM from config ---------- */
  function hydrate() {
    // absolute URLs — a url() inside a custom property resolves against the stylesheet
    const abs = (p) => new URL(p, document.baseURI).href;
    document.documentElement.style.setProperty("--texture", `url("${abs(C.assets.texture)}")`);
    document.documentElement.style.setProperty("--logo-mask", `url("${abs(C.assets.logoMask)}")`);
    document.documentElement.style.setProperty(
      "--door-art", `url("data:image/svg+xml,${encodeURIComponent(M.doorArt())}")`);

    $$("[data-copy]").forEach((el) => { el.textContent = get(el.dataset.copy); });
    $$("[data-lines]").forEach((el) => {
      el.innerHTML = "";
      get(el.dataset.lines).forEach((line) => {
        const s = document.createElement("span");
        s.className = "line"; s.textContent = line;
        el.appendChild(s);
      });
    });

    const logoHTML = `<img src="${C.assets.logo}" alt="${C.event.brand}" draggable="false"><span class="logo__sheen" aria-hidden="true"></span>`;
    $$("[data-logo]").forEach((el) => { el.innerHTML = logoHTML; });
    $$("[data-seal-face]").forEach((el, i) => {
      el.innerHTML = M.sealRings() + `<span class="seal__logo logo">${logoHTML}</span>`;
      if (i > 0) el.querySelector("img").alt = "";
    });
    $("[data-seal]").setAttribute("aria-label", `${C.copy.breakSeal} — ${C.event.brand}`);

    $("[data-relief]").innerHTML = M.relief();
    $$("[data-glyph]").forEach((el) => { el.innerHTML = M.glyphs[el.dataset.glyph]; });

    // crack geometry (percent of the seal box)
    const crack = [[50, 0], [48, 9], [51.5, 18], [49, 27], [52.5, 37], [48.5, 48], [51.5, 58], [49, 69], [52, 80], [49.5, 90], [50, 100]];
    const pts = (a) => a.map((p) => p.join(",")).join(" ");
    $("[data-crack]").setAttribute("points", pts(crack));
    $("[data-crack-branch-a]").setAttribute("points", pts([[52.5, 37], [57, 34], [62, 35.5]]));
    $("[data-crack-branch-b]").setAttribute("points", pts([[49, 69], [44.5, 72.5], [40, 71.5]]));
    const poly = (edge) => `polygon(${[[edge, 0], ...crack, [edge, 100]].map(([x, y]) => `${x}% ${y}%`).join(",")})`;
    $(".seal__body--l").style.clipPath = poly(0);
    $(".seal__body--r").style.clipPath = poly(100);

    $("[data-route]").href = C.links.map;
    document.title = `${C.event.brand} · ${C.event.title}`;
  }

  /* ---------- Engraved card frame follows the card size ---------- */
  function sizeFrame() {
    const card = $(".card"), svg = $("[data-frame]");
    const { width, height } = card.getBoundingClientRect();
    if (!width) return;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = M.frame(width, height);
  }

  function sizeTrace() {
    const btn = $(".cta--primary"), rect = $(".cta__trace rect");
    const { width, height } = btn.getBoundingClientRect();
    if (!width) return;
    rect.setAttribute("width", width - 1);
    rect.setAttribute("height", height - 1);
  }

  /* ---------- Helpers ---------- */
  const show = (el) => el && el.classList.add("is-in");
  const hint = $("[data-advance]");
  function offerAdvance() {
    canAdvance = true;
    hint.classList.add("is-visible");
  }

  async function go(name) {
    const prev = current && $(`.scene--${current}`);
    const next = $(`.scene--${name}`);
    canAdvance = false;
    hint.classList.remove("is-visible");
    if (prev) {
      prev.classList.add("is-leaving");
      await wait(650);
      prev.classList.remove("is-active");
    }
    current = name;
    stage.dataset.scene = name;
    next.classList.add("is-active");
    scenes[name](next);
  }

  function advance() {
    if (!canAdvance || busy) return;
    const i = ORDER.indexOf(current);
    if (i > 0 && i < ORDER.length - 1) go(ORDER[i + 1]);
  }

  /* ---------- Scenes ---------- */
  const scenes = {
    async seal(el) {
      await wait(250);
      show($(".seal", el));
      await wait(900);
      show($(".seal__invite", el));
      await wait(900);
      show($(".seal__cta", el));
      el.classList.add("is-ready");
    },

    async reveal(el) {
      const doors = $(".doors", el);
      await wait(80);
      doors.classList.add("is-lit");
      S.doors();
      await wait(600);
      doors.classList.add("is-open");
      await wait(800);
      show($(".reveal__brand", el));
      await wait(600);
      for (const line of $$(".reveal__lines .line", el)) { show(line); await wait(420); }
      await wait(1100);
      el.classList.add("is-hero");
      show($(".reveal__divider", el));
      await wait(350);
      show($(".reveal__unveil", el));
      await wait(450);
      show($(".reveal__miras", el));
      show($(".relief", el));
      S.resonance();
      await wait(900);
      show($(".reveal__latin", el));
      await wait(1200);
      offerAdvance();
    },

    async details(el) {
      sizeFrame();
      await wait(120);
      show($(".card", el));
      await wait(500);
      S.chime();
      show($(".card__title", el));
      const seq = $$(".card__item, .card .rule", el);
      for (const item of seq) { await wait(item.classList.contains("rule") ? 250 : 420); show(item); }
      await wait(1200);
      offerAdvance();
    },

    async final(el) {
      await wait(450);
      show($(".final__line--1", el));
      await wait(1900);
      show($(".final__line--2", el));
      await wait(1000);
      show($(".final__logo", el));
      S.flourish();
      await wait(800);
      sizeTrace();
      show($(".final__actions", el));
    }
  };

  /* ---------- Seal interaction ---------- */
  async function breakSeal() {
    const scene = $(".scene--seal");
    if (busy || current !== "seal" || !scene.classList.contains("is-ready")) return;
    busy = true;
    const seal = $(".seal");
    S.seal();
    if (navigator.vibrate) navigator.vibrate([10, 60, 18]);
    seal.classList.add("is-cracking");
    scene.classList.add("is-breaking");
    await wait(420);
    seal.classList.add("is-broken");
    const r = seal.getBoundingClientRect();
    D.burst(r.left + r.width / 2, r.top + r.height / 2, r.height * 0.9);
    await wait(750);
    busy = false;
    go("reveal");
  }

  /* ---------- Input ---------- */
  function bindInput() {
    $("[data-seal]").addEventListener("click", breakSeal);
    hint.addEventListener("click", (e) => { e.stopPropagation(); advance(); });

    // tap anywhere on reveal/details once the scene has settled
    stage.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      if (current === "reveal" || current === "details") advance();
    });

    let y0 = null;
    addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    addEventListener("touchend", (e) => {
      if (y0 == null) return;
      const dy = y0 - e.changedTouches[0].clientY;
      y0 = null;
      if (dy > 40) advance();
    }, { passive: true });

    let wheelLock = 0;
    addEventListener("wheel", (e) => {
      const now = Date.now();
      if (e.deltaY > 12 && now > wheelLock) { wheelLock = now + 1200; advance(); }
    }, { passive: true });

    addEventListener("keydown", (e) => {
      if (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        if (current === "seal" && document.activeElement === $("[data-seal]")) return; // button handles it
        if (current === "reveal" || current === "details") { e.preventDefault(); advance(); }
      }
    });

    // primary CTA — the thin gold border illuminates, then acts
    const rsvp = $("[data-rsvp]");
    rsvp.addEventListener("pointerdown", () => rsvp.classList.add("is-touched"));
    rsvp.addEventListener("click", async (e) => {
      e.preventDefault();
      if (rsvp.classList.contains("is-done")) return;
      rsvp.classList.add("is-touched", "is-lit");
      S.chime();
      await wait(1100);
      if (C.links.rsvp) {
        window.open(C.links.rsvp, "_blank", "noopener");
        rsvp.classList.remove("is-lit");
      } else {
        const label = $(".cta__label", rsvp);
        label.classList.add("is-swapping");
        await wait(500);
        label.textContent = C.copy.rsvpDone;
        label.classList.remove("is-swapping");
        rsvp.classList.add("is-done");
        rsvp.setAttribute("aria-disabled", "true");
      }
    });

    // sound toggle
    const sb = $("[data-sound]"), sl = $("[data-sound-label]");
    const syncSound = () => {
      sb.setAttribute("aria-pressed", String(S.enabled));
      sb.classList.toggle("is-on", S.enabled);
      sl.textContent = S.enabled ? C.copy.soundOff : C.copy.soundOn;
      sb.setAttribute("aria-label", sl.textContent);
    };
    sb.addEventListener("click", (e) => { e.stopPropagation(); S.setEnabled(!S.enabled); syncSound(); });
    syncSound();

    addEventListener("resize", () => { if (current === "details") sizeFrame(); sizeTrace(); });
  }

  /* ---------- Boot ---------- */
  hydrate();
  bindInput();
  const start = new URLSearchParams(location.search).get("s");
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    document.body.classList.add("is-loaded");
    go(ORDER.includes(start) ? start : "seal");
  });
})();
