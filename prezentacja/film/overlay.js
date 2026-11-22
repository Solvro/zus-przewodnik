// Warstwa reżyserska filmu (wstrzykiwana przez Playwright addInitScript na każdej stronie).
// Napisy lektora, kursor, zoom i przejścia. Nie modyfikuje aplikacji.
(() => {
  if (window.__demo) return;
  const C = { heading: "#12352A", primary: "#007834", mint: "#8CC5A1", pale: "#CDE6D6", accent: "#FAB856", paper: "#FBF7F0" };


  const css = `
  html { background: ${C.paper}; }
  body.__demo-zoom { transition: transform 1000ms cubic-bezier(.65,0,.35,1); will-change: transform; }
  .__demo-hide { opacity: 0 !important; transition: opacity 250ms ease !important; }
  #__demo { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font-family: Lato, "Helvetica Neue", Arial, sans-serif; }
  #__demo .fade { position: absolute; inset: 0; background: ${C.paper}; opacity: 0; transition: opacity 450ms ease; }
  #__demo .fade.on { opacity: 1; }
  #__demo .cap { position: absolute; left: 50%; bottom: 34px; transform: translate(-50%, 14px); opacity: 0;
    transition: opacity 380ms ease, transform 380ms ease; display: flex; align-items: center; }
  #__demo .cap.on { opacity: 1; transform: translate(-50%, 0); }
  #__demo .pill { position: relative; background: ${C.heading}; color: ${C.paper}; font-weight: 700; font-size: 22px; line-height: 1.3;
    padding: 13px 28px 14px; border-radius: 999px; white-space: nowrap; letter-spacing: .005em;
    box-shadow: 0 0 0 1.5px rgba(251,247,240,.38), 0 18px 40px -18px rgba(18,53,42,.55); }
  #__demo .pill b { color: ${C.accent}; font-weight: 900; }
  #__demo .cur { position: absolute; left: 0; top: 0; width: 26px; height: 26px; transform: translate(-100px,-100px);
    filter: drop-shadow(0 2px 3px rgba(0,0,0,.25)); }
  #__demo .ring { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
    border: 3px solid ${C.accent}; opacity: 0; transform: scale(.4); }
  #__demo .ring.go { animation: dring 520ms ease-out forwards; }
  @keyframes dring { 0% { opacity: .95; transform: scale(.4); } 100% { opacity: 0; transform: scale(1.35); } }
  @media (prefers-reduced-motion: reduce) { #__demo * { animation: none !important; } }
  `;

  // trwa przejście między stronami → zasłoń stronę od pierwszej klatki (zanim zamontuje się warstwa)
  function preCover() {
    try {
      if (document.documentElement && sessionStorage.getItem("__demoFade") === "1" && !document.getElementById("__demo-pre")) {
        const pre = document.createElement("style"); pre.id = "__demo-pre";
        pre.textContent = `html { background: ${C.paper} !important; } body { opacity: 0 !important; }`;
        document.documentElement.appendChild(pre);
      }
    } catch {}
  }
  preCover();
  // hydratacja Reacta usuwa obce węzły z <html> → przywracamy warstwę od razu (przed odmalowaniem klatki)
  new MutationObserver(() => {
    preCover();
    if (document.readyState !== "loading" && !(document.getElementById("__demo") && document.getElementById("__demo-css"))) mount();
  }).observe(document, { childList: true, subtree: true });

  let listening = false;
  function mount() {
    if (!document.getElementById("__demo-css")) {
      const st = document.createElement("style"); st.id = "__demo-css"; st.textContent = css;
      document.documentElement.appendChild(st);
    }
    if (document.getElementById("__demo")) return;
    const root = document.createElement("div"); root.id = "__demo";
    root.innerHTML = `
      <div class="cap"><div class="pill"><span class="txt"></span></div></div>
      <div class="ring"></div>
      <svg class="cur" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15.5 L12.5 22.5 L15.6 21 L12.2 14.2 L19 14 Z" fill="#12352A" stroke="#FBF7F0" stroke-width="1.6" stroke-linejoin="round"/></svg>
      <div class="fade"></div>`;
    document.documentElement.appendChild(root);
    try { if (sessionStorage.getItem("__demoFade") === "1") root.querySelector(".fade").classList.add("on"); } catch {}
    try {
      const c = sessionStorage.getItem("__demoCap");
      if (c) { root.querySelector(".txt").innerHTML = c; root.querySelector(".cap").classList.add("on"); }
    } catch {}
    try {
      const p = JSON.parse(sessionStorage.getItem("__demoCursor") || "null");
      if (p) root.querySelector(".cur").style.transform = `translate(${p.x - 4}px, ${p.y - 2}px)`;
    } catch {}
    if (listening) return;
    listening = true;
    document.addEventListener("mousemove", (e) => {
      const c = document.querySelector("#__demo .cur");
      if (c) c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`;
      try { sessionStorage.setItem("__demoCursor", JSON.stringify({ x: e.clientX, y: e.clientY })); } catch {}
    }, true);
    document.addEventListener("mousedown", (e) => {
      const r = document.querySelector("#__demo .ring"); if (!r) return;
      r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      r.classList.remove("go"); void r.offsetWidth; r.classList.add("go");
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  const $ = (s) => document.querySelector("#__demo " + s);
  const pinned = () => [...document.body.querySelectorAll("header, nav, [class*=sticky], [class*=fixed]")]
    .filter((e) => { const p = getComputedStyle(e).position; return p === "sticky" || p === "fixed"; });
  const hidePinned = (on) => pinned().forEach((e) => e.classList.toggle("__demo-hide", on));
  window.__demo = {
    caption(html) {
      const cap = $(".cap"), txt = $(".txt");
      try { html ? sessionStorage.setItem("__demoCap", html) : sessionStorage.removeItem("__demoCap"); } catch {}
      if (!html) { cap.classList.remove("on"); return; }
      if (cap.classList.contains("on")) {
        cap.classList.remove("on");
        setTimeout(() => { txt.innerHTML = html; cap.classList.add("on"); }, 330);
      } else { txt.innerHTML = html; cap.classList.add("on"); }
    },
    fadeOut() { $(".fade").classList.add("on"); try { sessionStorage.setItem("__demoFade", "1"); } catch {} },
    fadeIn() {
      document.getElementById("__demo-pre")?.remove();
      $(".fade").classList.remove("on"); try { sessionStorage.removeItem("__demoFade"); } catch {}
    },
    zoom(sel, scale = 1.6) {
      const el = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (!el) return false;
      const b = document.body; b.classList.add("__demo-zoom");
      hidePinned(true);
      b.style.transform = "none";
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 + scrollX, cy = r.top + r.height / 2 + scrollY;
      const vx = scrollX + innerWidth / 2, vy = scrollY + innerHeight / 2 - 20;
      b.style.transformOrigin = `${cx}px ${cy}px`;
      requestAnimationFrame(() => { b.style.transform = `translate(${vx - cx}px, ${vy - cy}px) scale(${scale})`; });
      return true;
    },
    zoomRect(x, y, w, h, scale = 1.6) {
      const b = document.body; b.classList.add("__demo-zoom"); hidePinned(true);
      const cx = x + w / 2 + scrollX, cy = y + h / 2 + scrollY;
      const vx = scrollX + innerWidth / 2, vy = scrollY + innerHeight / 2 - 20;
      b.style.transformOrigin = `${cx}px ${cy}px`;
      b.style.transform = `translate(${vx - cx}px, ${vy - cy}px) scale(${scale})`;
    },
    unzoom() { document.body.style.transform = "translate(0,0) scale(1)"; setTimeout(() => hidePinned(false), 650); },
  };
})();
