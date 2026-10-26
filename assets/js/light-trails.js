/*
  Light-trail engine + click-to-play video.

  Each prop has a parametric path. Tracing it over time with additive blending draws
  the figure that prop makes in a long-exposure photo. The hero accumulates live;
  section plates and video cards are drawn once.

  Videos load nothing from YouTube until someone presses play, then swap in a
  privacy-enhanced (youtube-nocookie) player in place.
*/
(function () {
  "use strict";

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var HUES = { sky: [92, 200, 250], flux: [234, 134, 251], ember: [255, 154, 77], spike: [110, 231, 160] };

  function fit(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  // Unit-space paths centred on 0. One [x, y] per lit head.
  var PATHS = {
    poi: function (t) { // two heads on opposite ends of orbiting circles
      var R = 0.56, r = 0.3, m = -3;
      return [
        [R * Math.cos(t) + r * Math.cos(m * t), R * Math.sin(t) + r * Math.sin(m * t)],
        [R * Math.cos(t + Math.PI) + r * Math.cos(m * t + Math.PI),
         R * Math.sin(t + Math.PI) + r * Math.sin(m * t + Math.PI)]
      ];
    },
    poi5: function (t) { // five-petal antispin flower
      var R = 0.5, r = 0.34, m = -4;
      return [
        [R * Math.cos(t) + r * Math.cos(m * t), R * Math.sin(t) + r * Math.sin(m * t)],
        [R * Math.cos(t + Math.PI) + r * Math.cos(m * t + Math.PI),
         R * Math.sin(t + Math.PI) + r * Math.sin(m * t + Math.PI)]
      ];
    },
    doublestaff: function (t) { // two rotating bars whose centres orbit
      var out = [], c = 0.42, L = 0.4, spin = 5;
      for (var s = 0; s < 2; s++) {
        var ph = s * Math.PI;
        var cx = c * Math.cos(t + ph), cy = c * Math.sin(t + ph) * 0.62;
        for (var e = 0; e < 2; e++) {
          var ang = spin * t + ph + e * Math.PI;
          out.push([cx + L * Math.cos(ang), cy + L * Math.sin(ang)]);
        }
      }
      return out;
    },
    dragonstaff: function (t) { // long bar, slow precession
      var L = 0.78, ang = 4 * t, tilt = 0.21 * t;
      var ca = Math.cos(tilt), sa = Math.sin(tilt), out = [];
      for (var e = 0; e < 2; e++) {
        var x = L * Math.cos(ang + e * Math.PI), y = L * 0.34 * Math.sin(ang + e * Math.PI);
        out.push([x * ca - y * sa, x * sa + y * ca]);
      }
      return out;
    },
    ropedart: function (t) { // radius breathes: long whipping arcs
      var r = 0.36 + 0.46 * Math.abs(Math.sin(t * 0.73));
      var ang = t * 2.4 + 1.1 * Math.sin(t * 0.47);
      return [[r * Math.cos(ang), r * Math.sin(ang) * 0.82]];
    },
    sword: function (t) { // single blade, slow wide sweeps
      var ang = 1.85 * t + 0.55 * Math.sin(t * 0.52);
      var rr = 0.74 * (0.62 + 0.38 * Math.cos(t * 0.33));
      return [[rr * Math.cos(ang), rr * Math.sin(ang) * 0.7]];
    },
    contact: function (t) { // lemniscate rolled across the body
      var d = 1 + Math.sin(t) * Math.sin(t);
      return [[0.8 * Math.cos(t) / d, 0.8 * Math.sin(t) * Math.cos(t) / d * 1.5]];
    },
    circuit: function (t) {
      var r = 0.52 + 0.26 * Math.cos(t * 0.6);
      return [[r * Math.cos(t * 1.7), r * Math.sin(t * 2.3) * 0.5]];
    },
    lattice: function (t) {
      var out = [];
      for (var s = 0; s < 3; s++) {
        var ph = (s * 2 * Math.PI) / 3, r = 0.5 + 0.22 * Math.sin(t * 1.3 + ph);
        out.push([r * Math.cos(t * 1.1 + ph), r * Math.sin(t * 2 + ph) * 0.46]);
      }
      return out;
    },
    toolpath: function (t) { // CNC pocketing pass: a rounded-rectangle spiral stepping inward
      var T = 2 * Math.PI * 7;                 // seven passes from outside wall to centre
      var u = ((t * 3.15) % T + T) % T;
      var r = 0.95 - 0.8 * (u / T);
      var c = Math.cos(u), s = Math.sin(u);
      return [[r * Math.sign(c) * Math.pow(Math.abs(c), 0.33),
               r * Math.sign(s) * Math.pow(Math.abs(s), 0.33) * 0.62]];
    },
    flame: function (t) {
      var r = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8));
      return [[r * Math.cos(t * 2.1), r * Math.sin(t * 1.4) * 0.5]];
    }
  };

  function trace(ctx, w, h, kind, rgb, steps, t0, dt, sxf, syf, alpha) {
    var fn = PATHS[kind] || PATHS.poi;
    var cx = w / 2, cy = h / 2, SX = w * sxf, SY = h * syf, prev = null;
    var glow = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha * 0.155 + ")";
    var core = "rgba(255,248,238," + alpha * 0.58 + ")";
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (var i = 0; i < steps; i++) {
      var pts = fn(t0 + i * dt);
      if (prev && prev.length === pts.length) {
        for (var j = 0; j < pts.length; j++) {
          var x0 = cx + prev[j][0] * SX, y0 = cy + prev[j][1] * SY;
          var x1 = cx + pts[j][0] * SX, y1 = cy + pts[j][1] * SY;
          ctx.strokeStyle = glow; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.strokeStyle = core; ctx.lineWidth = 1.15;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
      }
      prev = pts;
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // ---------- static plates ----------
  var statics = [];
  [].forEach.call(document.querySelectorAll(".plate canvas"), function (cv) {
    // Plates are wide bands: keep the figure tall enough to read and sparse enough not to wash out.
    statics.push({ cv: cv, kind: cv.dataset.plate, rgb: HUES[cv.dataset.hue] || HUES.sky, sxf: 0.2, syf: 0.78, steps: 1150, seed: 0, alpha: 0.75 });
  });
  [].forEach.call(document.querySelectorAll(".card-art canvas"), function (cv) {
    var seed = +(cv.dataset.seed || 0);
    var kind = cv.dataset.prop === "poi" && seed % 2 ? "poi5" : cv.dataset.prop; // odd seed: five-petal flower
    statics.push({ cv: cv, kind: kind, rgb: HUES.ember, sxf: 0.3, syf: 0.44, steps: 950, seed: seed, alpha: 0.62 });
  });
  function paintStatics() {
    statics.forEach(function (s) {
      if (!s.cv.isConnected) return; // replaced by a video player
      var f = fit(s.cv);
      f.ctx.fillStyle = "#050507";
      f.ctx.fillRect(0, 0, f.w, f.h);
      trace(f.ctx, f.w, f.h, s.kind, s.rgb, s.steps, s.seed, 0.012, s.sxf, s.syf, s.alpha);
    });
  }
  paintStatics();

  // ---------- hero field ----------
  var hero = document.getElementById("heroTrails");
  var H = null, t = 0, raf = null;
  var ACTORS = [
    { kind: "circuit", rgb: HUES.sky,   dx: -0.31, dy: -0.07, sxf: 0.145, syf: 0.27, sp: 1.00 },
    { kind: "lattice", rgb: HUES.flux,  dx: -0.07, dy:  0.19, sxf: 0.125, syf: 0.23, sp: 0.78 },
    { kind: "poi",     rgb: HUES.ember, dx:  0.35, dy: -0.05, sxf: 0.135, syf: 0.25, sp: 1.35 }
  ];
  function heroFrame(from, steps) {
    ACTORS.forEach(function (a) {
      H.ctx.save();
      H.ctx.translate(a.dx * H.w, a.dy * H.h);
      trace(H.ctx, H.w, H.h, a.kind, a.rgb, steps, from * a.sp, 0.013 * a.sp, a.sxf, a.syf, 0.95);
      H.ctx.restore();
    });
  }
  function setupHero() {
    if (!hero) return;
    H = fit(hero);
    H.ctx.fillStyle = "#07070A";
    H.ctx.fillRect(0, 0, H.w, H.h);
    heroFrame(0, 2400);               // a fully composed still before the first paint
    t = 2400 * 0.013;
  }
  function tick() {
    H.ctx.globalCompositeOperation = "source-over";
    H.ctx.fillStyle = "rgba(7,7,10,0.040)";
    H.ctx.fillRect(0, 0, H.w, H.h);
    heroFrame(t, 7);
    t += 7 * 0.013;
    raf = window.requestAnimationFrame(tick);
  }
  var visible = !document.hidden, onscreen = true;
  function sync() {
    var run = hero && visible && onscreen && !reduce;
    if (run && raf === null) raf = window.requestAnimationFrame(tick);
    else if (!run && raf !== null) { window.cancelAnimationFrame(raf); raf = null; }
  }
  setupHero();
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; sync(); });
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { onscreen = es[0].isIntersecting; sync(); }).observe(hero);
  }
  sync();

  var rt = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(rt);
    rt = window.setTimeout(function () {
      if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; }
      setupHero(); paintStatics(); sync();
    }, 220);
  });

  // ---------- click-to-play video ----------
  // Without JavaScript each card is a plain link to YouTube.
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a.yt[data-yt]");
    if (!a || a.classList.contains("playing")) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return; // let "open in new tab" work
    ev.preventDefault();

    var id = a.getAttribute("data-yt");
    var frame = document.createElement("iframe");
    frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0&modestbranding=1";
    frame.title = a.getAttribute("data-title") || "YouTube video";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";

    // Swap the link for a plain container so the player isn't nested inside an <a>.
    var box = document.createElement("div");
    box.className = a.className + " playing";
    box.appendChild(frame);
    a.replaceWith(box);
    frame.focus();
  });
})();
