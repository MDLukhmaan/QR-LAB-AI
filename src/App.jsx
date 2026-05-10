import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

const HistoryContext = createContext(null);
const useHistory = () => useContext(HistoryContext);

// ═══════════════════════════════════════════════════════════════
//  QR GENERATOR — uses qrcode-generator for reliable output
// ═══════════════════════════════════════════════════════════════
function loadQRLib() {
  return new Promise((resolve) => {
    if (window.qrcode) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = resolve; s.onerror = resolve;
    document.head.appendChild(s);
  });
}

// Load qrcode-generator (a different, more reliable lib for raw matrix access)
function loadQRGen() {
  return new Promise((resolve, reject) => {
    if (window.qrcodegen) { resolve(); return; }
    const s = document.createElement("script");
    // qrcode-generator lib — gives us raw boolean matrix
    s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    s.onload = () => {
      // The lib exposes window.qrcode (different from QRCode class)
      resolve();
    };
    s.onerror = () => reject(new Error("QR lib load failed"));
    document.head.appendChild(s);
  });
}

async function generateQR(text, opts = {}) {
  const {
    fg = "#000000",
    bg = "#ffffff",
    size = 300,
    shape = "square",
    logo = null,
    bgImage = null,
    bgOpacity = 0.35,
  } = opts;

  // Try qrcode-generator first (gives raw matrix)
  try {
    await loadQRGen();

    // qrcode-generator API: qrcode(typeNumber, errorCorrectionLevel)
    const qr = window.qrcode(0, "H");
    qr.addData(text || "https://qrlab.ai");
    qr.make();

    const moduleCount = qr.getModuleCount(); // e.g. 21, 25, 29...
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext("2d");

    // Fill background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Draw background image if provided
    if (bgImage) {
      await new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const ar = img.width / img.height;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (ar > 1) { sw = img.height; sx = (img.width - sw) / 2; }
          else { sh = img.width; sy = (img.height - sh) / 2; }
          ctx.globalAlpha = bgOpacity;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
          ctx.globalAlpha = 1;
          res();
        };
        img.onerror = res;
        img.src = bgImage;
      });
    }

    // Cell size with 1px quiet zone padding on each side
    const padding = Math.floor(size * 0.04);
    const drawSize = size - padding * 2;
    const cellSize = drawSize / moduleCount;

    ctx.fillStyle = fg;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!qr.isDark(row, col)) continue;

        const x = padding + col * cellSize;
        const y = padding + row * cellSize;
        const w = cellSize;
        const h = cellSize;

        if (shape === "dots") {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, w * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === "rounded") {
          const r = w * 0.28;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(x, y, w, h);
        }
      }
    }

    // Draw logo overlay
    if (logo) {
      await new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const ls = size * 0.2;
          const lx = (size - ls) / 2;
          const ly = (size - ls) / 2;
          ctx.fillStyle = bg;
          ctx.fillRect(lx - 4, ly - 4, ls + 8, ls + 8);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(lx, ly, ls, ls, 6);
          ctx.clip();
          ctx.drawImage(img, lx, ly, ls, ls);
          ctx.restore();
          res();
        };
        img.onerror = res;
        img.src = logo;
      });
    }

    return cv.toDataURL("image/png");
  } catch (err) {
    console.error("QR generation error:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
const injectStyles = () => {
  if (document.getElementById("qls")) return;
  const s = document.createElement("style"); s.id = "qls";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    :root{--au:#f5a623;--ad:#c8821a;--ag:rgba(245,166,35,.35);--ag2:rgba(245,166,35,.12);--bg:#09090e;--sf:rgba(255,255,255,.04);--br:rgba(255,255,255,.08);--tx:#eeeef8;--mu:#7878a0;--gn:#22c55e}
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);overflow-x:hidden;min-height:100vh}
    body.lm{--bg:#f0f0f6;--sf:rgba(255,255,255,.88);--br:rgba(0,0,0,.1);--tx:#0d0d1c;--mu:#60607a}
    body.lm .card{background:rgba(255,255,255,.9)!important;border-color:rgba(0,0,0,.09)!important}
    body.lm h1,body.lm h2,body.lm h3,body.lm h4{color:#0d0d1c!important}
    body.lm .gtext{background:linear-gradient(135deg,var(--au),#111)!important;-webkit-background-clip:text!important;-webkit-text-fill-color:transparent!important;background-clip:text!important}
    body.lm input,body.lm textarea{background:#fff!important;border-color:rgba(0,0,0,.18)!important;color:#0d0d1c!important}
    body.lm input::placeholder,body.lm textarea::placeholder{color:#aaa!important}
    body.lm .ghost:not(header .ghost):not(footer .ghost){border-color:rgba(0,0,0,.15)!important;color:#0d0d1c!important}
    body.lm .ghost:not(header .ghost):not(footer .ghost):hover{border-color:var(--au)!important;color:var(--au)!important}
    body.lm .step-card{background:rgba(255,255,255,.9)!important;border-color:rgba(0,0,0,.09)!important}
    header{background:#09090e!important;border-bottom:1px solid rgba(255,255,255,.08)!important;position:fixed;top:0;left:0;right:0;z-index:1000;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
    header *{color:#eeeef8!important}
    .h-logo{display:flex;align-items:center;gap:9px;cursor:pointer;flex-shrink:0}
    .h-logo-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--au),var(--ad));display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px var(--ag);font-family:'Syne',sans-serif;font-weight:800;font-size:.9rem;color:#080808!important;flex-shrink:0}
    .h-logo-txt{font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem;background:linear-gradient(135deg,var(--au),#eeeef8 80%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .h-nav{display:flex;gap:2px;align-items:center}
    .h-nl{color:#7878a0!important;font-weight:600;font-size:.9rem;cursor:pointer;padding:6px 12px;border-radius:8px;transition:all .22s;white-space:nowrap;background:transparent;border:none;font-family:'Syne',sans-serif;letter-spacing:.01em}
    .h-nl:hover,.h-nl.on{color:var(--au)!important;background:rgba(245,166,35,.1)!important}
    .h-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}
    .h-btn{height:34px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#eeeef8!important;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:500;cursor:pointer;transition:all .22s;display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
    .h-btn:hover{border-color:var(--au)!important;color:var(--au)!important;box-shadow:0 0 10px var(--ag)}
    .h-btn-primary{background:linear-gradient(135deg,var(--au),var(--ad))!important;border-color:transparent!important;color:#080808!important;font-family:'Syne',sans-serif;font-weight:700;box-shadow:0 0 14px var(--ag)}
    .h-btn-primary:hover{transform:translateY(-1px);box-shadow:0 0 24px var(--ag)!important;color:#080808!important}
    .h-cnt{background:linear-gradient(135deg,var(--au),var(--ad));color:#080808!important;border-radius:50%;width:16px;height:16px;font-size:.6rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Syne',sans-serif}
    .h-divider{width:1px;height:22px;background:rgba(255,255,255,.1);margin:0 4px;flex-shrink:0}
    .mob-menu{position:fixed;top:64px;left:0;right:0;background:#09090e;border-bottom:1px solid rgba(255,255,255,.08);padding:12px 16px;z-index:999;animation:slideUp .2s ease}
    .mob-menu .h-nl{display:block;padding:11px 14px;font-size:.93rem;width:100%;text-align:left}
    footer{background:#09090e!important;border-top:1px solid rgba(255,255,255,.07)!important;position:relative;z-index:1}
    footer *{color:#eeeef8!important}
    footer .mu{color:#7878a0!important}
    footer .social-btn{width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .25s;font-weight:700;font-size:.8rem;flex-shrink:0}
    footer .social-btn:hover{background:rgba(245,166,35,.14)!important;border-color:var(--au)!important;color:var(--au)!important;transform:translateY(-2px)}
    footer .foot-link{font-size:1rem;margin-bottom:11px;cursor:pointer;transition:color .2s;display:block;color:#7878a0!important;line-height:1.5}
    footer .foot-link:hover{color:var(--au)!important}
    footer .foot-head{font-family:'Syne',sans-serif;font-weight:700;margin-bottom:18px;font-size:.85rem;text-transform:uppercase;letter-spacing:.12em;color:var(--au)!important}
    .fab-wrap{position:fixed;left:20px;bottom:24px;z-index:998;display:flex;flex-direction:column;gap:10px;animation:fabIn .5s ease .3s forwards;opacity:0}
    .fab{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .28s;box-shadow:0 4px 20px rgba(0,0,0,.4);position:relative}
    .fab:hover{transform:translateY(-3px) scale(1.08)}
    .fab-gen{background:linear-gradient(135deg,var(--au),var(--ad));box-shadow:0 4px 20px var(--ag)}
    .fab-scan{background:linear-gradient(135deg,#f5a623,#c8821a);box-shadow:0 4px 20px rgba(245,166,35,.4)}
    .fab-tip{position:absolute;left:58px;background:#09090e;border:1px solid rgba(255,255,255,.12);color:#eeeef8;font-size:.75rem;font-weight:600;padding:4px 10px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s;font-family:'DM Sans',sans-serif}
    .fab:hover .fab-tip{opacity:1}
    h1,h2,h3,h4{font-family:'Syne',sans-serif;color:var(--tx);line-height:1.1}
    .mu{color:var(--mu)!important}
    .gtext{background:linear-gradient(135deg,var(--au) 0%,#eeeef8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#09090e}::-webkit-scrollbar-thumb{background:var(--ad);border-radius:3px}
    .card{background:var(--sf);border:1px solid var(--br);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
    .gbtn{background:linear-gradient(135deg,var(--au),var(--ad));color:#080808!important;font-family:'Syne',sans-serif;font-weight:700;border:none;cursor:pointer;transition:all .28s;box-shadow:0 0 16px var(--ag)}
    .gbtn:hover{transform:translateY(-2px);box-shadow:0 0 32px var(--ag),0 8px 24px rgba(0,0,0,.3)}
    .gbtn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .ghost{background:transparent;border:1px solid var(--br);color:var(--tx);font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .28s}
    .ghost:hover{border-color:var(--au);color:var(--au)!important;box-shadow:0 0 10px var(--ag)}
    .tb{padding:6px 12px;border-radius:8px;border:1px solid var(--br);background:transparent;color:var(--mu);font-size:.77rem;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:'DM Sans',sans-serif}
    .tb:hover{color:var(--tx);border-color:var(--au)}
    .tb.on{background:linear-gradient(135deg,var(--au),var(--ad));color:#080808!important;border-color:transparent;font-weight:700}
    input,textarea{background:var(--sf);border:1px solid var(--br);color:var(--tx);font-family:'DM Sans',sans-serif;font-size:.95rem;padding:11px 14px;border-radius:10px;width:100%;outline:none;transition:border-color .25s}
    input:focus,textarea:focus{border-color:var(--au);box-shadow:0 0 0 3px var(--ag)}
    .badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:100px;font-size:.71rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;background:rgba(245,166,35,.13);border:1px solid rgba(245,166,35,.28);color:var(--au)!important}
    .dz{border:2px dashed var(--br);border-radius:11px;padding:13px;text-align:center;cursor:pointer;transition:all .25s}
    .dz:hover,.dz.ov{border-color:var(--au);background:rgba(245,166,35,.05)}
    .sw{width:23px;height:23px;border-radius:5px;cursor:pointer;border:2px solid transparent;transition:all .18s;flex-shrink:0}
    .sw:hover{transform:scale(1.15)}.sw.on{border-color:var(--au);box-shadow:0 0 8px var(--ag)}
    .fr-none{}.fr-simple{padding:9px;background:#fff;border-radius:8px}.fr-round{padding:13px;background:#fff;border-radius:22px}.fr-shadow{padding:11px;background:#fff;border-radius:12px;box-shadow:0 12px 48px rgba(0,0,0,.5)}.fr-gold{padding:11px;background:#fff;border-radius:12px;border:3px solid var(--au);box-shadow:0 0 18px var(--ag)}
    .sc{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--au),var(--ad));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem;color:#080808!important;box-shadow:0 0 20px var(--ag);flex-shrink:0;margin:0 auto 12px}
    .gtop{position:fixed;bottom:24px;right:20px;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--au),var(--ad));border:none;color:#080808!important;font-size:.95rem;cursor:pointer;z-index:999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px var(--ag);transition:all .25s}
    .gtop:hover{transform:translateY(-3px) scale(1.1)}
    .spin{width:16px;height:16px;border:2px solid rgba(0,0,0,.2);border-top-color:#080808;border-radius:50%;animation:spinning .7s linear infinite;display:inline-block;flex-shrink:0}
    .hist-badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:6px;font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:rgba(245,166,35,.12);border:1px solid rgba(245,166,35,.22);color:var(--au)!important}
    .range-inp{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:var(--br);outline:none;padding:0;border:none!important;box-shadow:none!important}
    .range-inp::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;border-radius:50%;background:linear-gradient(135deg,var(--au),var(--ad));cursor:pointer}
    .range-inp::-moz-range-thumb{width:17px;height:17px;border-radius:50%;background:linear-gradient(135deg,var(--au),var(--ad));cursor:pointer;border:none}
    .steps-row{display:grid;grid-template-columns:1fr 28px 1fr 28px 1fr 28px 1fr;align-items:stretch}
    .step-card{background:var(--sf);border:1px solid var(--br);border-radius:20px;padding:28px 18px;text-align:center;transition:border-color .3s,box-shadow .3s,transform .3s;backdrop-filter:blur(20px);display:flex;flex-direction:column;align-items:center;height:100%}
    .step-card:hover{border-color:var(--au)!important;box-shadow:0 0 0 1px var(--au),0 0 28px var(--ag),0 18px 40px rgba(0,0,0,.25);transform:translateY(-5px)}
    .step-arrow{display:flex;align-items:center;justify-content:center;color:var(--au);font-size:1.3rem;opacity:.65}
    @keyframes spinning{to{transform:rotate(360deg)}}
    @keyframes flt{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
    @keyframes sup{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fin{from{opacity:0}to{opacity:1}}
    @keyframes pop{0%{opacity:0;transform:scale(.75)}70%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
    @keyframes scl{0%{top:0;opacity:1}100%{top:100%;opacity:.2}}
    @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes footReveal{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fabIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
    .flt{animation:flt 4s ease-in-out infinite}
    .pop{animation:pop .42s cubic-bezier(.34,1.56,.64,1)}
    .slide-up{animation:slideUp .32s ease forwards;opacity:0}
    .foot-col{opacity:0;animation:footReveal .55s ease forwards}
    @media(max-width:1024px){.steps-row{grid-template-columns:1fr 1fr!important;gap:12px}.step-arrow{display:none!important}.two-col{grid-template-columns:1fr!important}}
    @media(max-width:768px){.h-nav{display:none!important}.h-desk-only{display:none!important}.two-col{grid-template-columns:1fr!important}.steps-row{grid-template-columns:1fr!important;gap:10px}.step-arrow{display:none!important}.hero-grid{grid-template-columns:1fr!important}.hero-qr-wrap{display:none!important}.foot-grid{grid-template-columns:1fr 1fr!important;gap:24px!important}.foot-brand{grid-column:1/-1!important}section{padding-left:16px!important;padding-right:16px!important}.page-wrap{padding-left:16px!important;padding-right:16px!important}.fab-wrap{left:14px;bottom:18px}.fab{width:46px;height:46px}.gtop{right:14px;bottom:18px}}
    @media(max-width:480px){.foot-grid{grid-template-columns:1fr!important}.foot-brand{grid-column:auto!important}.btn-grid{grid-template-columns:1fr 1fr!important}}
  `;
  document.head.appendChild(s);
};

// ═══════════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════════
const Particles = () => {
  const r = useRef(null);
  useEffect(() => {
    const cv = r.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const mouse = { x: -9999, y: -9999 };
    const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
    resize();
    const COUNT = 90;
    const mkP = () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      s: Math.random() * 2.5 + 0.6, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      o: Math.random() * 0.16 + 0.04, type: ["dot","sq","sq","sq"][Math.floor(Math.random()*4)],
      pulse: Math.random() * Math.PI * 2,
    });
    const P = Array.from({ length: COUNT }, mkP);
    let id;
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < P.length; i++) {
        for (let j = i + 1; j < P.length; j++) {
          const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) { ctx.save(); ctx.globalAlpha = (1-dist/120)*0.08; ctx.strokeStyle="#f5a623"; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(P[i].x,P[i].y); ctx.lineTo(P[j].x,P[j].y); ctx.stroke(); ctx.restore(); }
        }
      }
      const t = Date.now() / 1000;
      P.forEach(p => {
        const pO = p.o * (0.7 + 0.3 * Math.sin(t * 1.4 + p.pulse));
        ctx.save(); ctx.globalAlpha = pO; ctx.fillStyle = "#f5a623";
        if (p.type === "dot") { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); }
        else { const sz = p.s * 2.2; ctx.fillRect(p.x-sz/2, p.y-sz/2, sz, sz); }
        ctx.restore();
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.sqrt(dx*dx+dy*dy);
        if (d < 140) { p.vx += (dx/d)*0.01; p.vy += (dy/d)*0.01; }
        const spd = Math.sqrt(p.vx*p.vx+p.vy*p.vy);
        if (spd > 1.1) { p.vx *= 0.96; p.vy *= 0.96; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = cv.width+10; if (p.x > cv.width+10) p.x = -10;
        if (p.y < -10) p.y = cv.height+10; if (p.y > cv.height+10) p.y = -10;
      });
      id = requestAnimationFrame(draw);
    };
    const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY + scrollY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    draw();
    addEventListener("resize", resize); addEventListener("mousemove", onMove); addEventListener("mouseleave", onLeave);
    return () => { cancelAnimationFrame(id); removeEventListener("resize",resize); removeEventListener("mousemove",onMove); removeEventListener("mouseleave",onLeave); };
  }, []);
  return <canvas ref={r} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
};

// ═══════════════════════════════════════════════════════════════
//  HERO QR animation
// ═══════════════════════════════════════════════════════════════
const QR_MATRIX = [
  [1,1,1,1,1,1,1,0,1,1,0,0,1,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,0,0,1,1,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
  [1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0],[0,1,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,0,1,1,0,1,1,0,1,0,1],[1,1,0,0,1,0,0,0,1,1,1,0,0,1,1,0,0,1,1,0,0],
  [0,1,1,1,0,1,1,0,0,0,1,0,1,0,0,1,0,1,1,1,0],[0,0,0,0,0,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1],
  [1,1,1,1,1,1,1,0,0,0,1,0,1,0,1,0,1,0,0,0,1],[1,0,0,0,0,0,1,0,1,1,0,1,0,1,1,0,1,1,0,1,0],
  [1,0,1,1,1,0,1,0,0,0,1,0,1,0,1,1,0,0,1,0,1],[1,0,1,1,1,0,1,0,1,0,0,1,0,1,0,0,1,0,0,1,1],
  [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,0,1,1,0,0],[1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,1,1,0,0,1,0],
  [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,0,1,0,1,1],
];

const HeroQR = () => {
  const GRID=21, CELL=11, GAP=1, TOTAL_SIZE=GRID*(CELL+GAP), TOTAL_CELLS=GRID*GRID;
  const allCells = QR_MATRIX.flatMap((row,r)=>row.map((dark,c)=>({id:r*GRID+c,dark:dark===1,isCorner:(r<7&&c<7)||(r<7&&c>=GRID-7)||(r>=GRID-7&&c<7),r,c})));
  const revealOrder = allCells.slice().sort((a,b)=>a.r!==b.r?a.r-b.r:a.c-b.c).map(cell=>cell.id);
  const [visibleCount,setVisibleCount]=useState(0);
  const [phase,setPhase]=useState("building");
  const animRef=useRef(null); const countRef=useRef(0);
  useEffect(()=>{
    clearTimeout(animRef.current);
    if(phase==="building"){countRef.current=0;setVisibleCount(0);const step=()=>{countRef.current+=1;setVisibleCount(countRef.current);if(countRef.current>=TOTAL_CELLS){setPhase("complete");return;}animRef.current=setTimeout(step,12);};animRef.current=setTimeout(step,12);}
    else if(phase==="complete"){animRef.current=setTimeout(()=>setPhase("resetting"),3000);}
    else if(phase==="resetting"){setVisibleCount(0);countRef.current=0;animRef.current=setTimeout(()=>setPhase("building"),400);}
    return()=>clearTimeout(animRef.current);
  },[phase]);
  const visibleSet=new Set(revealOrder.slice(0,visibleCount));
  const scanRow=phase==="building"&&visibleCount<TOTAL_CELLS?Math.floor(visibleCount/GRID):-1;
  return(
    <div className="flt" style={{display:"inline-block"}}>
      <div style={{borderRadius:22,padding:20,display:"flex",flexDirection:"column",alignItems:"center",background:"rgba(255,255,255,.04)",border:"1px solid rgba(245,166,35,.22)",boxShadow:"0 0 55px rgba(245,166,35,.18),0 20px 55px rgba(0,0,0,.42)",position:"relative",overflow:"hidden",backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:10,fontSize:".72rem",fontWeight:800,letterSpacing:".12em",fontFamily:"Syne,sans-serif",color:phase==="complete"?"#22c55e":"#f5a623",transition:"color 0.4s",width:"100%",textAlign:"center"}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:phase==="complete"?"#22c55e":"#f5a623",display:"inline-block",flexShrink:0,boxShadow:phase==="complete"?"0 0 8px #22c55e":"0 0 8px #f5a623"}}/>
          {phase==="complete"?"READY":phase==="resetting"?"···":"GENERATING…"}
        </div>
        <div style={{position:"relative",display:"inline-block"}}>
          {scanRow>=0&&<div style={{position:"absolute",left:0,right:0,top:scanRow*(CELL+GAP)+CELL/2-1,height:3,background:"linear-gradient(90deg,transparent,#f5a623cc,#fff,#f5a623cc,transparent)",boxShadow:"0 0 14px #f5a623",borderRadius:2,zIndex:10,pointerEvents:"none",transition:`top 12ms linear`}}/>}
          <div style={{display:"grid",gridTemplateColumns:`repeat(${GRID},${CELL}px)`,gap:`${GAP}px`,width:TOTAL_SIZE,height:TOTAL_SIZE}}>
            {allCells.map(cell=>{const on=cell.dark&&visibleSet.has(cell.id);return(<div key={cell.id} style={{width:CELL,height:CELL,borderRadius:cell.isCorner?2:1,background:on?(cell.isCorner?"linear-gradient(135deg,#f5a623,#c8821a)":"#f5a623"):"transparent",opacity:on?1:0,transform:on?"scale(1)":"scale(0.05)",transition:on?"opacity 0.1s ease,transform 0.13s cubic-bezier(.34,1.56,.64,1)":"opacity 0.05s,transform 0.05s"}}/>);})}
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:10,color:phase==="complete"?"#22c55e":"#f5a623",fontSize:".7rem",fontWeight:700,letterSpacing:".14em",fontFamily:"Syne,sans-serif",transition:"color 0.4s",width:"100%"}}>{phase==="complete"?"✓ SCAN ME":"▲ SCAN ME ▲"}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  HEADER
// ═══════════════════════════════════════════════════════════════
const Header = ({page,nav,dark,setDark}) => {
  const {history}=useHistory();
  const [mob,setMob]=useState(false);
  const cnt=history.length;
  const NavLink=({id,icon,lbl})=>(<button className={`h-nl ${page===id?"on":""}`} onClick={()=>{nav(id);setMob(false);}}>{icon&&<span style={{marginRight:3}}>{icon}</span>}{lbl}{id==="history"&&cnt>0&&<span className="h-cnt" style={{marginLeft:4}}>{cnt}</span>}</button>);
  return(
    <>
      <header>
        <div className="h-logo" onClick={()=>nav("home")}><div className="h-logo-icon">Q</div><span className="h-logo-txt">QR LAB AI</span></div>
        <div className="h-actions">
          <nav className="h-nav" style={{marginRight:6}}>
            <NavLink id="home" lbl="Home"/><NavLink id="generate" lbl="Generate"/><NavLink id="scan" lbl="Scan"/><NavLink id="history" lbl="History"/>
          </nav>
          <div className="h-divider h-desk-only"/>
          <button className="h-btn" onClick={()=>setDark(d=>!d)}>{dark?"☀️":"🌙"}</button>
          <button className="h-btn h-btn-primary h-desk-only" onClick={()=>nav("generate")}>✦ Generate</button>
          <button className="h-btn" id="mob-tog" style={{display:"none"}} onClick={()=>setMob(v=>!v)}>{mob?"✕":"☰"}</button>
          <style>{`@media(max-width:768px){#mob-tog{display:flex!important}}`}</style>
        </div>
      </header>
      {mob&&<div className="mob-menu"><NavLink id="home" icon="🏠" lbl="Home"/><NavLink id="generate" icon="⚡" lbl="Generate QR"/><NavLink id="scan" icon="📷" lbl="Scan"/><NavLink id="history" icon="📋" lbl="History"/></div>}
    </>
  );
};

const StickyFABs = ({nav}) => (
  <div className="fab-wrap">
    <button className="fab fab-scan" onClick={()=>nav("scan")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 7 4"/><polyline points="17 4 20 4 20 7"/><polyline points="4 17 4 20 7 20"/><polyline points="17 20 20 20 20 17"/><line x1="4" y1="12" x2="20" y2="12"/></svg><span className="fab-tip">Scan QR</span></button>
    <button className="fab fab-gen" onClick={()=>nav("generate")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/><line x1="21" y1="14" x2="21" y2="21"/></svg><span className="fab-tip">Generate QR</span></button>
  </div>
);

const Lbl = ({t}) => <label style={{fontSize:".71rem",color:"var(--mu)",fontWeight:600,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".06em"}}>{t}</label>;

const BgImagePicker = ({bgImage,setBgImage,bgOpacity,setBgOpacity}) => {
  const [ov,setOv]=useState(false); const ref=useRef(null);
  const handleFile=f=>{if(!f?.type.startsWith("image/"))return;const r=new FileReader();r.onload=e=>setBgImage(e.target.result);r.readAsDataURL(f);};
  return(
    <div>
      <Lbl t="QR Background Image (Optional)"/>
      <div className={`dz ${ov?"ov":""}`} style={{padding:"11px"}} onDragOver={e=>{e.preventDefault();setOv(true);}} onDragLeave={()=>setOv(false)} onDrop={e=>{e.preventDefault();setOv(false);handleFile(e.dataTransfer.files[0]);}} onClick={()=>ref.current?.click()}>
        {bgImage?<div style={{display:"flex",alignItems:"center",gap:9}}><img src={bgImage} style={{width:46,height:46,objectFit:"cover",borderRadius:7,border:"1px solid var(--br)",flexShrink:0}} alt=""/><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:".83rem"}}>Background set ✓</div><div className="mu" style={{fontSize:".71rem"}}>Blended behind QR • click to change</div></div><button onClick={e=>{e.stopPropagation();setBgImage(null);}} style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.28)",color:"#ef4444",borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:".71rem",flexShrink:0}}>✕</button></div>
        :<div><div style={{fontSize:"1.3rem",marginBottom:3}}>🌄</div><div className="mu" style={{fontSize:".82rem"}}>Drag & drop or click — shown as QR background</div><div className="mu" style={{fontSize:".7rem",marginTop:2}}>PNG · JPG · WebP</div></div>}
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
      </div>
      {bgImage&&<div style={{marginTop:9}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><span style={{fontSize:".7rem",color:"var(--mu)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>Image Visibility</span><span style={{fontSize:".78rem",color:"var(--au)",fontWeight:700}}>{Math.round(bgOpacity*100)}%</span></div><input type="range" className="range-inp" min="0.1" max="0.75" step="0.01" value={bgOpacity} onChange={e=>setBgOpacity(parseFloat(e.target.value))}/><div style={{display:"flex",justifyContent:"space-between",marginTop:2}}><span className="mu" style={{fontSize:".66rem"}}>Subtle</span><span className="mu" style={{fontSize:".66rem"}}>Full Visible</span></div></div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════════════════════════
const Home = ({nav}) => {
  const steps=[{n:"1",t:"Input",d:"Enter your URL, text, contact info, WiFi credentials, or any content to encode.",ic:"✏️"},{n:"2",t:"Encode",d:"Your data is encoded with Reed-Solomon error correction for maximum scan reliability.",ic:"⚙️"},{n:"3",t:"Design",d:"Pick shape, colors, upload a background image and add a logo overlay for branding.",ic:"🎨"},{n:"4",t:"Export",d:"Download PNG or SVG. Share via link — ready for print, digital, or social media.",ic:"⬇️"}];
  const [cUrl,setCUrl]=useState("https://qrlab.ai");
  const [cFg,setCFg]=useState("#000000");const[cBg,setCBg]=useState("#ffffff");
  const [cShape,setCShape]=useState("square");const[cFrame,setCFrame]=useState("round");
  const [cLogo,setCLogo]=useState(null);const[cBgImg,setCBgImg]=useState(null);const[cBgOp,setCBgOp]=useState(0.35);
  const [cQR,setCQR]=useState(null);const[cBusy,setCBusy]=useState(false);
  const logoRef=useRef(null);const[logOv,setLogOv]=useState(false);
  const fgPal=["#000000","#1a1a2e","#0f3460","#7c3aed","#ef4444","#f5a623","#16a34a","#0ea5e9","#ec4899","#78350f"];
  const bgPal=["#ffffff","#fffde7","#e8f5e9","#e3f2fd","#fce4ec","#0a0a0f","#fff7ed","#f0fdf4","#f5f5f5","#fdf4ff"];
  const shapes=[{id:"square",ic:"◼",l:"Square"},{id:"rounded",ic:"▢",l:"Rounded"},{id:"dots",ic:"⬡",l:"Dots"}];
  const frames=[{id:"none",l:"None"},{id:"simple",l:"Simple"},{id:"round",l:"Rounded"},{id:"shadow",l:"Shadow"},{id:"gold",l:"Gold"}];
  const build=useCallback(async()=>{const txt=cUrl.trim();if(!txt)return;setCBusy(true);try{setCQR(await generateQR(txt,{size:280,fg:cFg,bg:cBg,shape:cShape,logo:cLogo,bgImage:cBgImg,bgOpacity:cBgOp}));}catch(e){console.error(e);}setCBusy(false);},[cUrl,cFg,cBg,cShape,cLogo,cBgImg,cBgOp]);
  const initRef=useRef(true);
  useEffect(()=>{if(initRef.current){initRef.current=false;build();return;}build();},[cFg,cBg,cShape]);
  const handleLogoFile=f=>{if(!f?.type.startsWith("image/"))return;const r=new FileReader();r.onload=e=>{setCLogo(e.target.result);setTimeout(build,100);};r.readAsDataURL(f);};
  return(
    <div>
      <section style={{minHeight:"100vh",display:"flex",alignItems:"center",padding:"90px 40px 56px",position:"relative",zIndex:1,background:"radial-gradient(ellipse at 60% 50%,rgba(245,166,35,.1) 0%,transparent 64%)"}}>
        <div className="hero-grid" style={{maxWidth:1160,margin:"0 auto",width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:52,alignItems:"center"}}>
          <div style={{animation:"sup .8s ease forwards",opacity:0}}>
            <div className="badge" style={{marginBottom:18}}>✦ AI-Powered QR Platform</div>
            <h1 style={{fontSize:"clamp(2.5rem,6vw,4.8rem)",fontWeight:800,marginBottom:18}}><span className="gtext">AI QR</span><br/>GENERATOR</h1>
            <p className="mu" style={{fontSize:"1.05rem",lineHeight:1.72,marginBottom:30,maxWidth:400}}>Create stunning QR codes instantly. Custom shapes, colors, background images, logos — everything your brand needs.</p>
            <div style={{display:"flex",gap:11,flexWrap:"wrap"}}>
              <button className="gbtn" style={{borderRadius:12,padding:"12px 30px",fontSize:".96rem"}} onClick={()=>nav("generate")}>⚡ Generate QR</button>
              <button className="ghost" style={{borderRadius:12,padding:"12px 22px",fontSize:".96rem"}} onClick={()=>nav("scan")}>📷 Scan Code</button>
            </div>
          </div>
          <div className="hero-qr-wrap" style={{display:"flex",justifyContent:"center",animation:"fin 1s ease .35s forwards",opacity:0}}><HeroQR/></div>
        </div>
      </section>
      <section style={{padding:"72px 40px",position:"relative",zIndex:1}}>
        <div style={{maxWidth:1160,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <div className="badge" style={{display:"inline-flex",marginBottom:12}}>🎨 Live Customizer</div>
            <h2 style={{fontSize:"clamp(1.7rem,4vw,2.6rem)",fontWeight:800,marginBottom:8}}>Design Your QR <span className="gtext">Live</span></h2>
            <p className="mu" style={{maxWidth:460,margin:"0 auto"}}>Tweak colors, shapes, background images & frames in real-time.</p>
          </div>
          <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div className="card" style={{borderRadius:20,padding:22,display:"flex",flexDirection:"column",gap:14}}>
              <div><Lbl t="Content / URL"/><div style={{display:"flex",gap:7}}><input value={cUrl} onChange={e=>setCUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&build()} placeholder="https://yoursite.com"/><button className="gbtn" style={{borderRadius:10,padding:"0 14px",fontSize:".86rem",whiteSpace:"nowrap",flexShrink:0}} onClick={build} disabled={cBusy}>{cBusy?<div className="spin"/>:"↻"}</button></div></div>
              <div><Lbl t="Shape"/><div style={{display:"flex",gap:6}}>{shapes.map(s=><button key={s.id} onClick={()=>setCShape(s.id)} style={{flex:1,padding:"8px 4px",borderRadius:9,cursor:"pointer",fontSize:".74rem",border:`1px solid ${cShape===s.id?"var(--au)":"var(--br)"}`,background:cShape===s.id?"rgba(245,166,35,.13)":"transparent",color:cShape===s.id?"var(--au)":"var(--mu)",fontWeight:cShape===s.id?700:400,transition:"all .2s"}}><div style={{fontSize:"1rem",marginBottom:2}}>{s.ic}</div>{s.l}</button>)}</div></div>
              <div><Lbl t="Frame"/><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{frames.map(f=><button key={f.id} onClick={()=>setCFrame(f.id)} style={{padding:"6px 11px",borderRadius:8,cursor:"pointer",fontSize:".75rem",border:`1px solid ${cFrame===f.id?"var(--au)":"var(--br)"}`,background:cFrame===f.id?"rgba(245,166,35,.13)":"transparent",color:cFrame===f.id?"var(--au)":"var(--mu)",fontWeight:cFrame===f.id?700:400,transition:"all .2s"}}>{f.l}</button>)}</div></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><Lbl t="QR Color"/><div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>{fgPal.map(c=><div key={c} className={`sw ${cFg===c?"on":""}`} style={{background:c}} onClick={()=>setCFg(c)}/>)}<input type="color" value={cFg} onChange={e=>setCFg(e.target.value)} style={{width:23,height:23,padding:1,borderRadius:4,cursor:"pointer",border:"2px solid var(--br)"}}/></div></div>
                <div><Lbl t="BG Color"/><div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>{bgPal.map(c=><div key={c} className={`sw ${cBg===c?"on":""}`} style={{background:c,border:"2px solid rgba(150,150,150,.18)"}} onClick={()=>setCBg(c)}/>)}<input type="color" value={cBg} onChange={e=>setCBg(e.target.value)} style={{width:23,height:23,padding:1,borderRadius:4,cursor:"pointer",border:"2px solid var(--br)"}}/></div></div>
              </div>
              <BgImagePicker bgImage={cBgImg} setBgImage={v=>{setCBgImg(v);setTimeout(build,60);}} bgOpacity={cBgOp} setBgOpacity={v=>{setCBgOp(v);setTimeout(build,60);}}/>
              <div><Lbl t="Logo (Optional)"/><div className={`dz ${logOv?"ov":""}`} style={{padding:"11px"}} onDragOver={e=>{e.preventDefault();setLogOv(true);}} onDragLeave={()=>setLogOv(false)} onDrop={e=>{e.preventDefault();setLogOv(false);handleLogoFile(e.dataTransfer.files[0]);}} onClick={()=>logoRef.current?.click()}>{cLogo?<div style={{display:"flex",alignItems:"center",gap:9}}><img src={cLogo} style={{width:36,height:36,objectFit:"contain",borderRadius:6}} alt=""/><div style={{flex:1}}><div style={{fontWeight:600,fontSize:".83rem"}}>Logo set ✓</div><div className="mu" style={{fontSize:".71rem"}}>Click to change</div></div><button onClick={e=>{e.stopPropagation();setCLogo(null);}} style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.28)",color:"#ef4444",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:".71rem"}}>✕</button></div>:<div><div style={{fontSize:"1rem",marginBottom:2}}>🖼️</div><div className="mu" style={{fontSize:".81rem"}}>Drag & drop or click to add logo</div></div>}<input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleLogoFile(e.target.files[0])}/></div></div>
            </div>
            <div className="card" style={{borderRadius:20,padding:22,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,minHeight:460}}>
              <p style={{fontSize:".7rem",color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>Live Preview</p>
              <div className={cQR?"pop":""}>
                {cQR?<div className={`fr-${cFrame}`} style={{position:"relative",display:"inline-block"}}><img src={cQR} alt="QR" style={{display:"block",width:200,height:200,imageRendering:"pixelated",borderRadius:cFrame==="none"?0:5}}/>{cLogo&&<img src={cLogo} alt="" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:42,height:42,objectFit:"contain",borderRadius:7,background:"#fff",padding:3,boxShadow:"0 2px 9px rgba(0,0,0,.28)"}}/>}</div>
                :<div style={{width:200,height:200,borderRadius:12,background:"var(--sf)",border:"1px solid var(--br)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}><div style={{fontSize:"2.8rem",opacity:.12}}>▦</div><p className="mu" style={{fontSize:".8rem"}}>Enter URL above</p></div>}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                {[["Shape",cShape],["Frame",cFrame]].map(([k,v])=><div key={k} style={{padding:"3px 9px",borderRadius:100,background:"rgba(245,166,35,.09)",border:"1px solid rgba(245,166,35,.18)",fontSize:".69rem"}}><span className="mu">{k}: </span><span style={{color:"var(--au)",fontWeight:600}}>{v}</span></div>)}
                {cBgImg&&<div style={{padding:"3px 9px",borderRadius:100,background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.22)",fontSize:".69rem",color:"var(--gn)"}}>🌄 {Math.round(cBgOp*100)}%</div>}
              </div>
              <div style={{display:"flex",gap:8,width:"100%"}}>
                <button className="gbtn" style={{flex:1,borderRadius:10,padding:"10px",fontSize:".86rem"}} onClick={()=>nav("generate")}>Open Full Editor ↗</button>
                {cQR&&<button className="ghost" style={{borderRadius:10,padding:"10px 13px",fontSize:".86rem"}} onClick={()=>{const a=document.createElement("a");a.href=cQR;a.download="qrlab-preview.png";a.click();}}>⬇</button>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section style={{padding:"80px 40px",position:"relative",zIndex:1}}>
        <div style={{maxWidth:1060,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}><div className="badge" style={{display:"inline-flex",marginBottom:14}}>✦ How it works</div><h2 style={{fontSize:"clamp(1.9rem,4vw,2.9rem)",fontWeight:800,marginBottom:12}}>QR Generation <span className="gtext">Workflow</span></h2><p className="mu" style={{maxWidth:460,margin:"0 auto",fontSize:".97rem",lineHeight:1.6}}>From content to scannable QR code in seconds.</p></div>
          <div className="steps-row">{steps.map((s,i)=>(<React.Fragment key={s.n}><div className="step-card" style={{animation:`sup .55s ease ${i*.13}s forwards`,opacity:0}}><div style={{fontSize:"2rem",marginBottom:12}}>{s.ic}</div><div className="sc">{s.n}</div><h3 style={{fontWeight:700,marginBottom:9,fontSize:"1rem"}}>{s.t}</h3><p className="mu" style={{fontSize:".85rem",lineHeight:1.68,flex:1}}>{s.d}</p></div>{i<3&&<div className="step-arrow">→</div>}</React.Fragment>))}</div>
        </div>
      </section>
      <section style={{padding:"72px 40px",position:"relative",zIndex:1}}>
        <div style={{maxWidth:680,margin:"0 auto"}}>
          <div className="card" style={{borderRadius:26,padding:"clamp(32px,6vw,60px) clamp(22px,5vw,48px)",textAlign:"center",boxShadow:"0 0 72px rgba(245,166,35,.09)",border:"1px solid rgba(245,166,35,.11)",position:"relative",overflow:"hidden"}}>
            <div className="badge" style={{display:"inline-flex",marginBottom:16}}>✦ Free to Start</div>
            <h2 style={{fontSize:"clamp(1.8rem,4.5vw,2.9rem)",fontWeight:800,marginBottom:12}}>Ready to go <span className="gtext">QR?</span></h2>
            <p className="mu" style={{fontSize:".97rem",lineHeight:1.62,maxWidth:380,margin:"0 auto 26px"}}>Start creating beautiful, scannable QR codes — free, no sign-up needed.</p>
            <div style={{display:"flex",gap:11,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="gbtn" style={{borderRadius:13,padding:"13px 38px",fontSize:"1rem"}} onClick={()=>nav("generate")}>Start Generating ✦</button>
              <button className="ghost" style={{borderRadius:13,padding:"13px 24px",fontSize:"1rem"}} onClick={()=>nav("scan")}>Try Scanner →</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  GENERATE
// ═══════════════════════════════════════════════════════════════
const Generate = () => {
  const {addToHistory}=useHistory();
  const [tab,setTab]=useState("Link");const[text,setText]=useState("");
  const [qr,setQr]=useState(null);const[busy,setBusy]=useState(false);const[err,setErr]=useState(null);
  const [fg,setFg]=useState("#000000");const[bg,setBg]=useState("#ffffff");
  const [shape,setShape]=useState("square");const[frame,setFrame]=useState("simple");
  const [logo,setLogo]=useState(null);const[bgImage,setBgImage]=useState(null);const[bgOpacity,setBgOpacity]=useState(0.35);
  const [cp,setCp]=useState(false);
  const fRef=useRef(null);const[logD,setLogD]=useState(false);
  const tabs=["Link","Text","Email","Call","SMS","WiFi","WhatsApp","VCard","PDF","App"];
  const shapes=[{id:"square",ic:"◼",l:"Square"},{id:"rounded",ic:"▢",l:"Rounded"},{id:"dots",ic:"⬡",l:"Dots"}];
  const frames=[{id:"none",l:"None"},{id:"simple",l:"Simple"},{id:"round",l:"Rounded"},{id:"shadow",l:"Shadow"},{id:"gold",l:"Gold"}];
  const fgPal=["#000000","#1a1a2e","#0f3460","#7c3aed","#ef4444","#f5a623","#16a34a","#0ea5e9"];
  const bgPal=["#ffffff","#fffde7","#e8f5e9","#e3f2fd","#fce4ec","#f3e5f5","#fff7ed","#f8f8f8"];
  const hints={Link:"https://yourwebsite.com",Text:"Enter your message…",Email:"user@example.com",Call:"+1 234 567 8900",SMS:"+1 234 567 8900",WiFi:"SSID:password",WhatsApp:"+1 234 567 8900",VCard:"Name: John Doe\nPhone: +1234",PDF:"https://example.com/file.pdf",App:"https://apps.apple.com/…"};
  const gen=useCallback(async()=>{
    setErr(null);
    const t=text.trim()||(tab==="Link"?"https://qrlab.ai":`${tab}: demo`);
    setBusy(true);
    try{
      const url=await generateQR(t,{size:300,fg,bg,shape,logo,bgImage,bgOpacity});
      setQr(url);
      addToHistory({id:Date.now(),type:tab,content:t,dataURL:url,date:new Date().toLocaleString(),shape,frame,hasBgImage:!!bgImage});
    }catch(e){setErr("Generation failed: "+e.message);}
    setBusy(false);
  },[text,fg,bg,shape,tab,logo,bgImage,bgOpacity,addToHistory,frame]);
  const dlPNG=()=>{if(!qr)return;const a=document.createElement("a");a.href=qr;a.download="qrlab.png";a.click();};
  const dlSVG=()=>{if(!qr)return;const sv=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="300"><image href="${qr}" width="300" height="300"/></svg>`;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([sv],{type:"image/svg+xml"}));a.download="qrlab.svg";a.click();};
  const logF=f=>{if(!f?.type.startsWith("image/"))return;const r=new FileReader();r.onload=e=>setLogo(e.target.result);r.readAsDataURL(f);};
  return(
    <div style={{minHeight:"100vh",paddingTop:80,paddingBottom:56,position:"relative",zIndex:1}}>
      <div className="page-wrap" style={{maxWidth:1160,margin:"0 auto",padding:"0 22px"}}>
        <div style={{textAlign:"center",marginBottom:34}}><div className="badge" style={{display:"inline-flex",marginBottom:10}}>⚡ QR Generator</div><h1 style={{fontSize:"clamp(1.8rem,5vw,2.9rem)",fontWeight:800,marginBottom:7}}>Create Your <span className="gtext">QR Code</span></h1><p className="mu" style={{fontSize:".93rem"}}>Colors, shapes, background images, logos — fully customizable & scannable.</p></div>
        <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          <div className="card" style={{borderRadius:20,padding:20,display:"flex",flexDirection:"column",gap:13}}>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{tabs.map(t=><button key={t} className={`tb ${tab===t?"on":""}`} onClick={()=>setTab(t)}>{t}</button>)}</div>
            <div><Lbl t="Content"/><textarea value={text} onChange={e=>setText(e.target.value)} placeholder={hints[tab]} rows={3} style={{resize:"vertical"}}/></div>
            <div><Lbl t="Shape"/><div style={{display:"flex",gap:6}}>{shapes.map(s=><button key={s.id} onClick={()=>setShape(s.id)} style={{flex:1,padding:"7px 4px",borderRadius:9,cursor:"pointer",fontSize:".73rem",border:`1px solid ${shape===s.id?"var(--au)":"var(--br)"}`,background:shape===s.id?"rgba(245,166,35,.12)":"transparent",color:shape===s.id?"var(--au)":"var(--mu)",fontWeight:shape===s.id?700:400,transition:"all .2s"}}><div style={{fontSize:".95rem",marginBottom:2}}>{s.ic}</div>{s.l}</button>)}</div></div>
            <div><Lbl t="Frame"/><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{frames.map(f=><button key={f.id} onClick={()=>setFrame(f.id)} style={{padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:".74rem",border:`1px solid ${frame===f.id?"var(--au)":"var(--br)"}`,background:frame===f.id?"rgba(245,166,35,.12)":"transparent",color:frame===f.id?"var(--au)":"var(--mu)",fontWeight:frame===f.id?700:400,transition:"all .2s"}}>{f.l}</button>)}</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
              <div><Lbl t="QR Color"/><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{fgPal.map(c=><div key={c} className={`sw ${fg===c?"on":""}`} style={{background:c}} onClick={()=>setFg(c)}/>)}<input type="color" value={fg} onChange={e=>setFg(e.target.value)} style={{width:23,height:23,padding:1,borderRadius:4,cursor:"pointer"}}/></div></div>
              <div><Lbl t="BG Color"/><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{bgPal.map(c=><div key={c} className={`sw ${bg===c?"on":""}`} style={{background:c,border:"2px solid rgba(150,150,150,.18)"}} onClick={()=>setBg(c)}/>)}<input type="color" value={bg} onChange={e=>setBg(e.target.value)} style={{width:23,height:23,padding:1,borderRadius:4,cursor:"pointer"}}/></div></div>
            </div>
            <BgImagePicker bgImage={bgImage} setBgImage={setBgImage} bgOpacity={bgOpacity} setBgOpacity={setBgOpacity}/>
            <div><Lbl t="Logo (Optional)"/><div className={`dz ${logD?"ov":""}`} style={{padding:"11px"}} onDragOver={e=>{e.preventDefault();setLogD(true);}} onDragLeave={()=>setLogD(false)} onDrop={e=>{e.preventDefault();setLogD(false);logF(e.dataTransfer.files[0]);}} onClick={()=>fRef.current?.click()}>{logo?<div style={{display:"flex",alignItems:"center",gap:9}}><img src={logo} style={{width:38,height:38,objectFit:"contain",borderRadius:6}} alt=""/><div style={{flex:1}}><div style={{fontWeight:600,fontSize:".83rem"}}>Logo uploaded ✓</div><div className="mu" style={{fontSize:".71rem"}}>Click to change</div></div><button onClick={e=>{e.stopPropagation();setLogo(null);}} style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.28)",color:"#ef4444",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:".71rem"}}>Remove</button></div>:<div><div style={{fontSize:"1.1rem",marginBottom:2}}>⬆️</div><div className="mu" style={{fontSize:".81rem"}}>Drag & drop or click to upload logo</div></div>}<input ref={fRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>logF(e.target.files[0])}/></div></div>
            {err&&<div style={{background:"rgba(239,68,68,.09)",border:"1px solid rgba(239,68,68,.28)",borderRadius:8,padding:"10px 12px",color:"#ef4444",fontSize:".83rem"}}>⚠️ {err}</div>}
            <button className="gbtn" style={{width:"100%",borderRadius:12,padding:12,fontSize:".97rem",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={gen} disabled={busy}>{busy?<><div className="spin"/>Generating…</>:"⚡ Generate QR Code"}</button>
          </div>
          <div className="card" style={{borderRadius:20,padding:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,gap:14}}>
            <p style={{fontSize:".7rem",color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>Preview</p>
            {!qr?<div style={{textAlign:"center"}}><div style={{fontSize:"4.5rem",opacity:.09,marginBottom:8}}>▦</div><p className="mu" style={{fontSize:".85rem"}}>Your QR code will appear here</p></div>
            :<div className="pop"><div className={`fr-${frame}`} style={{position:"relative",display:"inline-block"}}><img src={qr} alt="QR" style={{display:"block",maxWidth:250,imageRendering:"pixelated",borderRadius:frame==="none"?0:6}}/>{logo&&<img src={logo} alt="" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:48,height:48,objectFit:"contain",borderRadius:7,background:"#fff",padding:3,boxShadow:"0 2px 9px rgba(0,0,0,.28)"}}/>}</div></div>}
            {qr&&<>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
                <div style={{padding:"3px 9px",borderRadius:100,background:"rgba(245,166,35,.09)",border:"1px solid rgba(245,166,35,.18)",fontSize:".69rem"}}><span className="mu">Shape: </span><span style={{color:"var(--au)",fontWeight:600}}>{shape}</span></div>
                <div style={{padding:"3px 9px",borderRadius:100,background:"rgba(245,166,35,.09)",border:"1px solid rgba(245,166,35,.18)",fontSize:".69rem"}}><span className="mu">Frame: </span><span style={{color:"var(--au)",fontWeight:600}}>{frame}</span></div>
                {bgImage&&<div style={{padding:"3px 9px",borderRadius:100,background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",fontSize:".69rem",color:"var(--gn)"}}>🌄 {Math.round(bgOpacity*100)}%</div>}
              </div>
              <div className="btn-grid" style={{width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                <button className="gbtn" style={{borderRadius:10,padding:10,fontSize:".85rem"}} onClick={dlPNG}>⬇ PNG</button>
                <button className="ghost" style={{borderRadius:10,padding:10,fontSize:".85rem"}} onClick={dlSVG}>⬇ SVG</button>
                <button className="ghost" style={{borderRadius:10,padding:10,fontSize:".85rem"}} onClick={()=>{navigator.clipboard.writeText(text||"https://qrlab.ai");setCp(true);setTimeout(()=>setCp(false),2000);}}>{cp?"✓ Copied!":"🔗 Copy Link"}</button>
                <button className="ghost" style={{borderRadius:10,padding:10,fontSize:".85rem"}} onClick={()=>{if(navigator.share)navigator.share({title:"QR Code",url:text||"https://qrlab.ai"});else navigator.clipboard.writeText(text||"https://qrlab.ai");}}>↗ Share</button>
              </div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  SCAN — fixed: reliable jsQR loading + stable video rendering
// ═══════════════════════════════════════════════════════════════
const Scan = () => {
  const videoRef = useRef(null);        // actual <video> element via ref
  const canvasRef = useRef(null);       // offscreen canvas ref
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const fileRef = useRef(null);

  const [phase, setPhase] = useState("idle");   // idle | loading | scanning | result | error
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load jsQR with multiple CDN fallbacks
  const loadJsQR = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.jsQR) { resolve(); return; }
      const urls = [
        "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.3.1/jsQR.min.js",
      ];
      let idx = 0;
      const tryNext = () => {
        if (idx >= urls.length) { reject(new Error("jsQR could not be loaded")); return; }
        const sc = document.createElement("script");
        sc.src = urls[idx++];
        sc.onload = () => window.jsQR ? resolve() : tryNext();
        sc.onerror = tryNext;
        document.head.appendChild(sc);
      };
      tryNext();
    });
  }, []);

  const stopScan = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const startScan = useCallback(async () => {
    stopScan();
    setErr(null); setResult(null); setPhase("loading");

    try { await loadJsQR(); }
    catch(e) { setErr("Could not load QR library. Check your connection."); setPhase("error"); return; }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch(e1) {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      catch(e2) { setErr("Camera denied or unavailable. Please grant camera permission."); setPhase("error"); return; }
    }

    streamRef.current = stream;

    // Give React a tick to render the <video> element before assigning srcObject
    setPhase("scanning");

    // Use setTimeout to ensure the video element is mounted
    setTimeout(() => {
      const video = videoRef.current;
      if (!video) { stopScan(); setPhase("idle"); return; }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;

      video.play().catch(() => {});

      // Wait for video to have real frame data
      const waitForFrames = () => {
        if (video.readyState >= 2 && video.videoWidth > 0) {
          startDecoding(video);
        } else {
          setTimeout(waitForFrames, 120);
        }
      };
      waitForFrames();
    }, 100);
  }, [loadJsQR, stopScan]);

  const startDecoding = (video) => {
    const canvas = canvasRef.current || document.createElement("canvas");
    intervalRef.current = setInterval(() => {
      if (!video || !window.jsQR) return;
      if (!video.videoWidth || video.paused || video.ended) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      let imgData;
      try { imgData = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch(_) { return; }
      const qr = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });
      if (qr && qr.data) {
        clearInterval(intervalRef.current); intervalRef.current = null;
        stopScan();
        setResult(qr.data);
        setPhase("result");
      }
    }, 300);
  };

  const reset = useCallback(() => { stopScan(); setPhase("idle"); setResult(null); setErr(null); }, [stopScan]);

  const scanFile = useCallback(async (file) => {
    if (!file) return;
    setErr(null); setResult(null);
    try { await loadJsQR(); } catch(e) { setErr("Could not load QR library."); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const qr = window.jsQR(id.data, id.width, id.height, { inversionAttempts: "attemptBoth" });
      if (qr && qr.data) { setResult(qr.data); setPhase("result"); }
      else setErr("No QR code found in this image. Try a clearer photo with good lighting.");
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => setErr("Could not read image file.");
    img.src = URL.createObjectURL(file);
  }, [loadJsQR]);

  const isLoading  = phase === "loading";
  const isScanning = phase === "scanning";
  const hasResult  = phase === "result";

  return (
    <div style={{minHeight:"100vh",paddingTop:80,paddingBottom:56,position:"relative",zIndex:1}}>
      <div className="page-wrap" style={{maxWidth:520,margin:"0 auto",padding:"0 18px"}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div className="badge" style={{display:"inline-flex",marginBottom:10}}>📷 QR Scanner</div>
          <h1 style={{fontSize:"clamp(1.8rem,5vw,2.7rem)",fontWeight:800,marginBottom:8}}>Scan <span className="gtext">QR Code</span></h1>
          <p className="mu">Point your camera at a QR code to decode it instantly.</p>
        </div>
        <div className="card" style={{borderRadius:20,padding:20,textAlign:"center"}}>
          {/* Video viewport — always rendered, shown/hidden via CSS */}
          <div style={{position:"relative",borderRadius:12,overflow:"hidden",background:"#060608",minHeight:290,marginBottom:14}}>

            {/* The actual video element — always in DOM when scanning */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width:"100%", height:"100%", minHeight:290,
                objectFit:"cover", display: isScanning ? "block" : "none",
                borderRadius:12,
              }}
            />

            {/* Idle state */}
            {phase === "idle" && (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:290,gap:10}}>
                <div style={{fontSize:"3rem"}}>📷</div>
                <p style={{color:"#7878a0",fontSize:".9rem"}}>Camera will appear here</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:290,gap:12}}>
                <div style={{width:42,height:42,border:"3px solid rgba(245,166,35,.2)",borderTopColor:"var(--au)",borderRadius:"50%",animation:"spinning .7s linear infinite"}}/>
                <p style={{color:"var(--au)",fontWeight:600,fontSize:".9rem"}}>Starting camera…</p>
              </div>
            )}

            {/* Scan overlay corners + sweep line */}
            {isScanning && (
              <>
                <div style={{position:"absolute",left:0,right:0,height:2,top:0,background:"linear-gradient(90deg,transparent,var(--au),#fff,var(--au),transparent)",boxShadow:"0 0 10px var(--au)",animation:"scl 1.8s ease-in-out infinite",zIndex:10}}/>
                {[["left","top"],["right","top"],["left","bottom"],["right","bottom"]].map(([h,v],i)=>(
                  <div key={i} style={{position:"absolute",[h]:12,[v]:12,width:28,height:28,zIndex:11,
                    borderTop:v==="top"?"3px solid var(--au)":"none",borderBottom:v==="bottom"?"3px solid var(--au)":"none",
                    borderLeft:h==="left"?"3px solid var(--au)":"none",borderRight:h==="right"?"3px solid var(--au)":"none"}}/>
                ))}
                <div style={{position:"absolute",bottom:10,left:0,right:0,textAlign:"center",zIndex:11}}>
                  <span style={{background:"rgba(0,0,0,.65)",color:"var(--au)",fontSize:".7rem",fontWeight:700,padding:"3px 12px",borderRadius:100,letterSpacing:".07em"}}>● SCANNING…</span>
                </div>
              </>
            )}

            {/* Result */}
            {hasResult && (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:290,gap:10,padding:20}}>
                <div style={{fontSize:"2.8rem"}}>✅</div>
                <div style={{color:"var(--gn)",fontWeight:800,fontSize:"1rem",letterSpacing:".04em"}}>QR DETECTED!</div>
                <div style={{color:"#ccc",wordBreak:"break-all",fontSize:".82rem",lineHeight:1.6,textAlign:"center"}}>{result}</div>
              </div>
            )}

            {/* Error state */}
            {phase === "error" && (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:290,gap:10,padding:20}}>
                <div style={{fontSize:"2.5rem"}}>⚠️</div>
                <p style={{color:"#ef4444",fontSize:".88rem",textAlign:"center"}}>{err}</p>
              </div>
            )}
          </div>

          {/* Error below viewport (for file scan errors) */}
          {err && phase !== "error" && (
            <div style={{background:"rgba(239,68,68,.09)",border:"1px solid rgba(239,68,68,.27)",borderRadius:10,padding:"11px 13px",color:"#ef4444",marginBottom:12,fontSize:".83rem",lineHeight:1.5,textAlign:"left"}}>⚠️ {err}</div>
          )}

          {/* Actions */}
          {hasResult ? (
            <div style={{display:"grid",gap:8}}>
              <div className="card" style={{borderRadius:10,padding:"12px 14px",wordBreak:"break-all",textAlign:"left",fontSize:".84rem",lineHeight:1.55}}>
                <p style={{color:"#7878a0",fontSize:".68rem",marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>Decoded content</p>
                {result}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                {result.startsWith("http") && (
                  <button className="gbtn" style={{borderRadius:10,padding:10,fontSize:".85rem"}} onClick={()=>window.open(result,"_blank")}>🔗 Open Link</button>
                )}
                <button className="ghost" style={{borderRadius:10,padding:10,fontSize:".85rem",gridColumn:result.startsWith("http")?"auto":"1/-1"}} onClick={()=>{navigator.clipboard.writeText(result);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?"✓ Copied!":"📋 Copy"}</button>
                <button className="ghost" style={{borderRadius:10,padding:10,fontSize:".85rem",gridColumn:"1/-1"}} onClick={reset}>🔄 Scan Again</button>
              </div>
            </div>
          ) : (
            <div style={{display:"grid",gap:8}}>
              <button
                className={isScanning ? "ghost" : "gbtn"}
                style={{width:"100%",borderRadius:12,padding:"13px",fontSize:".96rem",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                onClick={isScanning ? () => { stopScan(); setPhase("idle"); } : startScan}
                disabled={isLoading}
              >
                {isLoading ? <><div className="spin"/>Starting…</> : isScanning ? "⏹ Stop Camera" : "▶ Start Camera Scan"}
              </button>
              <div style={{display:"flex",alignItems:"center",gap:10,margin:"2px 0"}}>
                <div style={{flex:1,height:1,background:"var(--br)"}}/>
                <span style={{color:"var(--mu)",fontSize:".73rem",fontWeight:600}}>OR</span>
                <div style={{flex:1,height:1,background:"var(--br)"}}/>
              </div>
              <button className="ghost" style={{width:"100%",borderRadius:12,padding:"12px",fontSize:".9rem",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>fileRef.current?.click()}>
                🖼️ Upload Image to Scan
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{scanFile(e.target.files[0]);e.target.value="";}}/>
              <p style={{color:"var(--mu)",fontSize:".73rem",textAlign:"center"}}>Works on mobile & desktop · PNG / JPG / WebP</p>
            </div>
          )}
        </div>
      </div>
      {/* Hidden canvas for decoding */}
      <canvas ref={canvasRef} style={{display:"none"}}/>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════════════════
const History = ({nav}) => {
  const {history,clearHistory,removeFromHistory}=useHistory();
  const [cp,setCp]=useState(null);const[filter,setFilter]=useState("All");
  const types=["All",...Array.from(new Set(history.map(h=>h.type)))];
  const filtered=filter==="All"?history:history.filter(h=>h.type===filter);
  const dl=(item,fmt)=>{const a=document.createElement("a");if(fmt==="png"){a.href=item.dataURL;a.download=`qr-${item.type}-${item.id}.png`;}else{const sv=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="300"><image href="${item.dataURL}" width="300" height="300"/></svg>`;a.href=URL.createObjectURL(new Blob([sv],{type:"image/svg+xml"}));a.download=`qr-${item.type}-${item.id}.svg`;}a.click();};
  const copy=(item)=>{navigator.clipboard.writeText(item.content);setCp(item.id);setTimeout(()=>setCp(null),2000);};
  return(
    <div style={{minHeight:"100vh",paddingTop:80,paddingBottom:56,position:"relative",zIndex:1}}>
      <div className="page-wrap" style={{maxWidth:1060,margin:"0 auto",padding:"0 18px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:10}}>
          <div><div className="badge" style={{marginBottom:8}}>📋 History</div><h1 style={{fontSize:"clamp(1.8rem,5vw,2.6rem)",fontWeight:800}}>QR <span className="gtext">History</span></h1><p className="mu" style={{marginTop:5,fontSize:".85rem"}}>{history.length} QR code{history.length!==1?"s":""} this session</p></div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
            {history.length>0&&<button className="ghost" style={{borderRadius:10,padding:"8px 15px",color:"#ef4444",borderColor:"rgba(239,68,68,.28)",fontSize:".83rem"}} onClick={clearHistory}>🗑 Clear All</button>}
            <button className="gbtn" style={{borderRadius:10,padding:"8px 16px",fontSize:".83rem"}} onClick={()=>nav("generate")}>+ New QR</button>
          </div>
        </div>
        {history.length===0
          ?<div className="card" style={{borderRadius:20,padding:"56px 30px",textAlign:"center"}}><div style={{fontSize:"3.6rem",marginBottom:12}}>📭</div><h3 style={{fontWeight:700,marginBottom:7,fontSize:"1.2rem"}}>No QR codes yet</h3><p className="mu" style={{marginBottom:20,fontSize:".9rem"}}>Generate your first QR code — it'll appear here instantly.</p><button className="gbtn" style={{borderRadius:12,padding:"11px 28px",fontSize:".93rem"}} onClick={()=>nav("generate")}>⚡ Generate QR Code</button></div>
          :<>
            {types.length>2&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>{types.map(t=><button key={t} className={`tb ${filter===t?"on":""}`} onClick={()=>setFilter(t)}>{t}{t!=="All"&&<span style={{marginLeft:3,opacity:.7,fontSize:".68rem"}}>({history.filter(h=>h.type===t).length})</span>}</button>)}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(265px,1fr))",gap:13}}>
              {filtered.map((item,idx)=>(
                <div key={item.id} className="card slide-up" style={{borderRadius:16,padding:15,display:"flex",flexDirection:"column",gap:10,animationDelay:`${idx*.04}s`}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    {item.dataURL&&<div style={{flexShrink:0,background:"#fff",borderRadius:8,padding:4,boxShadow:"0 2px 10px rgba(0,0,0,.16)"}}><img src={item.dataURL} alt="qr" style={{width:58,height:58,display:"block",borderRadius:4}}/></div>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}><span className="hist-badge">{item.type}</span>{item.hasBgImage&&<span style={{fontSize:".68rem"}}>🌄</span>}</div>
                      <div style={{fontSize:".8rem",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{item.content}</div>
                      <div className="mu" style={{fontSize:".7rem"}}>{item.date}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button className="ghost" style={{flex:1,borderRadius:7,padding:"6px 0",fontSize:".72rem"}} onClick={()=>dl(item,"png")}>⬇ PNG</button>
                    <button className="ghost" style={{flex:1,borderRadius:7,padding:"6px 0",fontSize:".72rem"}} onClick={()=>dl(item,"svg")}>⬇ SVG</button>
                    <button className="ghost" style={{flex:1,borderRadius:7,padding:"6px 0",fontSize:".72rem",color:cp===item.id?"var(--gn)":"inherit"}} onClick={()=>copy(item)}>{cp===item.id?"✓":"📋"}</button>
                    <button className="ghost" style={{borderRadius:7,padding:"6px 9px",fontSize:".72rem",color:"#ef4444",borderColor:"rgba(239,68,68,.22)"}} onClick={()=>removeFromHistory(item.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        }
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  FOOTER
// ═══════════════════════════════════════════════════════════════
const Footer = ({nav}) => {
  const footRef=useRef(null);const[vis,setVis]=useState(false);
  useEffect(()=>{const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting)setVis(true);},{threshold:.1});if(footRef.current)obs.observe(footRef.current);return()=>obs.disconnect();},[]);
  const delay=(n)=>({animationDelay:`${n}s`,animationPlayState:vis?"running":"paused"});
  const socials=[{ic:"𝕏",l:"X/Twitter"},{ic:"in",l:"LinkedIn"},{ic:"f",l:"Facebook"},{ic:"▶",l:"YouTube"}];
  return(
    <footer ref={footRef} style={{padding:"52px 24px 26px",marginTop:36}}>
      <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(245,166,35,.28),transparent)",marginBottom:48}}/>
      <div style={{maxWidth:1140,margin:"0 auto"}}>
        <div className="foot-grid" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:40,marginBottom:44}}>
          <div className="foot-brand foot-col" style={delay(0)}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,cursor:"pointer"}} onClick={()=>nav("home")}>
              <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,var(--au),var(--ad))",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:".9rem",color:"#080808",flexShrink:0}}>Q</div>
              <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"1.18rem",background:"linear-gradient(135deg,var(--au),#eeeef8 80%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>QR LAB AI</span>
            </div>
            <p style={{color:"#7878a0",fontSize:"1rem",lineHeight:1.75,maxWidth:255,marginBottom:18}}>Create • Scan • Share QR Codes. The AI-powered QR platform for modern businesses and creators worldwide.</p>
            <div style={{display:"flex",gap:8}}>{socials.map(({ic,l})=><button key={l} className="social-btn" title={l}>{ic}</button>)}</div>
          </div>
          <div className="foot-col" style={delay(.1)}>
            <p className="foot-head">Product</p>
            {[["⚡ Generate QR","generate"],["📷 Scan QR","scan"],["📋 History","history"],["ℹ️ About","about"]].map(([lbl,pg])=>(
              <span key={lbl} className="foot-link" onClick={()=>nav(pg)}>{lbl}</span>
            ))}
          </div>
          <div className="foot-col" style={delay(.18)}>
            <p className="foot-head">Use Cases</p>
            {["Business Cards","Restaurant Menus","Event Tickets","Marketing Campaigns","Product Packaging","WiFi Sharing"].map(t=>(
              <span key={t} className="foot-link mu">{t}</span>
            ))}
          </div>
          <div className="foot-col" style={delay(.26)}>
            <p className="foot-head">Company</p>
            {[["About Us","about"],["Contact Us","contact"],["Privacy Policy","privacy"],["Terms of Service","terms"]].map(([lbl,pg])=>(
              <span key={lbl} className="foot-link" onClick={()=>nav(pg)}>{lbl}</span>
            ))}
          </div>
        </div>
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)",marginBottom:20}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{color:"#7878a0",fontSize:".9rem"}}>© 2026 QR LAB AI. All rights reserved.</div>
          <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{color:"#7878a0",fontSize:".9rem"}}>Made by lukhmaan ✦ for creators</div>
            <div style={{display:"flex",gap:2}}>
              {[["Privacy","privacy"],["Terms","terms"],["Contact","contact"]].map(([t,pg])=>(
                <span key={t} style={{color:"#7878a0",fontSize:".88rem",cursor:"pointer",padding:"2px 7px",borderRadius:5,transition:"all .2s"}} onClick={()=>nav(pg)} onMouseOver={e=>e.target.style.color="var(--au)"} onMouseOut={e=>e.target.style.color="#7878a0"}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ═══════════════════════════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const [dark, setDark] = useState(true);
  const [top, setTop] = useState(false);

  const [history, setHistory] = useState(() => {
    try { const s = localStorage.getItem("qrlab_history"); return s ? JSON.parse(s) : []; }
    catch(_) { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem("qrlab_history", JSON.stringify(history)); } catch(_) {}
  }, [history]);

  const addToHistory = useCallback((item) => setHistory(prev => [item,...prev].slice(0,100)),[]);
  const removeFromHistory = useCallback((id) => setHistory(prev => prev.filter(h=>h.id!==id)),[]);
  const clearHistory = useCallback(() => { setHistory([]); try { localStorage.removeItem("qrlab_history"); } catch(_) {} },[]);

  useEffect(()=>{injectStyles();},[]);
  useEffect(()=>{document.body.classList.toggle("lm",!dark);},[dark]);
  useEffect(()=>{scrollTo({top:0,behavior:"smooth"});},[page]);
  useEffect(()=>{const fn=()=>setTop(scrollY>400);addEventListener("scroll",fn);return()=>removeEventListener("scroll",fn);},[]);

  return(
    <HistoryContext.Provider value={{history,addToHistory,removeFromHistory,clearHistory}}>
      <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--tx)",position:"relative"}}>
        <Particles/>
        <Header page={page} nav={setPage} dark={dark} setDark={setDark}/>
        <main style={{position:"relative",zIndex:1,animation:"fin .32s ease"}} key={page}>
          {page==="home"     && <Home nav={setPage}/>}
          {page==="generate" && <Generate/>}
          {page==="scan"     && <Scan/>}
          {page==="history"  && <History nav={setPage}/>}
        </main>
        <Footer nav={setPage}/>
        <StickyFABs nav={setPage}/>
        {top&&<button className="gtop" onClick={()=>scrollTo({top:0,behavior:"smooth"})}>↑</button>}
      </div>
    </HistoryContext.Provider>
  );
}
