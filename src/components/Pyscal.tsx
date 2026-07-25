// @ts-nocheck
const escHtml = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
import { useState, useMemo, useCallback, useEffect, useRef, useId } from "react";
import { Pin } from "lucide-react";
import logoUrl from "@/assets/logo-pyscal.webp";
import { OnboardingTour } from "@/components/pyscal/OnboardingTour";
import { getTickSize, ceilTick, computeRows } from "@/lib/compute";
import { n, nDec, nShort, fmtPct, fmtPL, fmtTime } from "@/lib/format";
import {
  validateBid, validateLot, validateTargetTicks, validateTargetProfit,
  validateExistingAvg, validateExistingLot,
} from "@/lib/validation";
import {
  isInstallAvailable, isStandalone, subscribeInstallPrompt, triggerInstall, detectPlatform,
} from "@/lib/pwa";
import {
  DEFAULT_SHORTCUTS,
  DEFAULT_STATE,
  loadShortcutsVersioned,
  loadStateVersioned,
  loadHistory,
  loadPresets,
  saveState,
  saveShortcuts,
  saveHistory,
  savePresets,
  shortcutToString,
  eventMatchesShortcut,
} from "@/lib/storage";

/* ==================== ICONS ==================== */
function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      <span>Mode offline — kalkulator tetap jalan, data tersimpan lokal.</span>
    </div>
  );
}

const BoltIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const GearIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const XIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CopyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const SunIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const BookmarkIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const HistoryIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="12 7 12 12 16 14"/></svg>;
const InfoIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const KeyboardIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="6" y1="14" x2="18" y2="14"/></svg>;
const LockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const UnlockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;


/* ==================== STYLES ==================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Funnel+Display:wght@500;600;700;800&family=Funnel+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* a11y: visible focus ring on keyboard nav */
.pyscal :focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.pyscal button:focus-visible,.pyscal input:focus-visible,.pyscal a:focus-visible,.pyscal [tabindex]:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
/* sr-only, becomes visible when focused (for skip link) */
.pyscal-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.pyscal-sr-only:focus,.pyscal-sr-only:focus-visible{position:fixed;top:8px;left:8px;width:auto;height:auto;clip:auto;clip-path:none;padding:8px 14px;background:var(--brand);color:var(--brand-text);font-weight:700;z-index:9999}
/* validation field state — clear red border + tint + inner glow.
   Focus ring stays brand-colored with a larger offset so keyboard focus
   remains contrasted against the red error border in both themes. */
.if[aria-invalid="true"]{
  border-color:var(--red)!important;border-width:2px!important;
  background:var(--red-d)!important;
  box-shadow:inset 0 0 0 1px var(--red), 0 0 0 3px var(--red-d);
}
.if[aria-invalid="true"]:focus-visible,
.if[aria-invalid="true"]:focus{
  outline:2px solid var(--brand)!important;outline-offset:3px!important;
  border-color:var(--red)!important;
}
.field-hint{font-size:11px;margin-top:6px;line-height:1.35;font-family:'Funnel Sans',sans-serif;
  display:flex;align-items:flex-start;gap:6px;padding:4px 8px;border-radius:3px;
  border-left:3px solid transparent;background:transparent}
.field-hint.error{color:var(--red);font-weight:600;
  border-left-color:var(--red);background:var(--red-d)}
.field-hint.warning{color:var(--brand);opacity:.9;
  border-left-color:var(--brand);background:var(--brand-d)}
/* (?) help icon next to label */
.il-wrap{display:flex;align-items:center;gap:6px}
.il-help{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid var(--border);background:transparent;color:var(--text-m);font-size:10px;font-weight:700;cursor:help;border-radius:50%;line-height:1;padding:0}
.il-help:hover,.il-help:focus-visible{color:var(--brand);border-color:var(--brand)}
.il-help-tip{position:absolute;background:var(--surface);color:var(--text);border:1px solid var(--border-strong);padding:8px 10px;font-size:11px;line-height:1.4;max-width:240px;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-radius:4px;font-weight:400}

.pyscal[data-theme="dark"]{
  --bg:#0A0A0A;--surface:#141414;--surface-hover:#1C1C1C;--border:#262626;--border-strong:#404040;
  --text:#FAFAFA;--text2:#D4D4D4;--text-m:#737373;--text-d:#525252;
  --inp-bg:#0A0A0A;--brand:#EAB308;--brand-h:#FACC15;--brand-d:rgba(234,179,8,0.12);--brand-text:#0A0A0A;
  --green:#22C55E;--green-d:rgba(34,197,94,0.12);--red:#EF4444;--red-d:rgba(239,68,68,0.12);
  --modal-bg:rgba(0,0,0,0.7);
}
.pyscal[data-theme="light"]{
  --bg:#FAFAFA;--surface:#FFFFFF;--surface-hover:#F5F5F5;--border:#E5E5E5;--border-strong:#D4D4D4;
  --text:#0A0A0A;--text2:#262626;--text-m:#737373;--text-d:#A3A3A3;
  --inp-bg:#FFFFFF;--brand:#CA8A04;--brand-h:#A16207;--brand-d:rgba(202,138,4,0.10);--brand-text:#FFFFFF;
  --green:#16A34A;--green-d:rgba(22,163,74,0.10);--red:#DC2626;--red-d:rgba(220,38,38,0.08);
  --modal-bg:rgba(0,0,0,0.4);
}
/* PYSCAL palette: navy + white */
.pyscal[data-theme="dark"]{
  --bg:#0B1220;--surface:#111A2E;--surface-hover:#17223B;--border:#1F2B47;--border-strong:#2E3D60;
  --text:#FFFFFF;--text2:#E5E9F0;--text-m:#A6B0C3;--text-d:#8892A6;
  --inp-bg:#0B1220;--brand:#FFFFFF;--brand-h:#E5E9F0;--brand-d:rgba(255,255,255,0.10);--brand-text:#0B1220;
  --green:#4ADE80;--green-d:rgba(74,222,128,0.16);--red:#F87171;--red-d:rgba(248,113,113,0.16);
  --modal-bg:rgba(5,10,20,0.7);
}
.pyscal[data-theme="light"]{
  --bg:#FFFFFF;--surface:#F7F8FB;--surface-hover:#EEF1F6;--border:#E2E6EE;--border-strong:#C9D0DC;
  --text:#0B1220;--text2:#1F2B47;--text-m:#4B5566;--text-d:#6B7488;
  --inp-bg:#FFFFFF;--brand:#0B1220;--brand-h:#1F2B47;--brand-d:rgba(11,18,32,0.08);--brand-text:#FFFFFF;
  --green:#15803D;--green-d:rgba(21,128,61,0.10);--red:#B91C1C;--red-d:rgba(185,28,28,0.08);
  --modal-bg:rgba(11,18,32,0.4);
}

.pyscal{font-family:'Funnel Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);
  min-height:100vh;-webkit-font-smoothing:antialiased;transition:background .25s,color .25s;
  -webkit-text-size-adjust:100%;text-size-adjust:100%;text-rendering:optimizeLegibility}
.pyscal button,.pyscal a,.pyscal [role="button"]{touch-action:manipulation}
/* mobile a11y: enforce 44x44 min tap target for interactive controls */
@media (max-width:700px) and (pointer:coarse){
  .pyscal button,.pyscal a[role="button"],.pyscal .gear-btn,.pyscal .mode-toggle button,
  .pyscal .btn,.pyscal .il-toggle,.pyscal .history-item,.pyscal input[type="checkbox"],
  .pyscal input[type="radio"]{min-height:44px}
  .pyscal .gear-btn,.pyscal .modal-close{min-width:48px}
  /* Larger, comfortable tap targets on touch mobile */
  .pyscal .gear-btn{width:48px;height:48px}
  .pyscal .hdr-r{gap:8px}
  .pyscal .mode-toggle button{min-height:48px;padding:14px 12px;font-size:14px}
  /* Keep focus indicator clearly visible on the larger targets */
  .pyscal .gear-btn:focus,.pyscal .gear-btn:focus-visible,
  .pyscal .mode-toggle button:focus,.pyscal .mode-toggle button:focus-visible{
    outline:2px solid var(--brand)!important;outline-offset:3px!important;
    box-shadow:0 0 0 3px var(--brand-d)!important;z-index:1;position:relative}
}
/* offline notice banner */
.offline-banner{position:sticky;top:0;z-index:100;background:var(--red);color:#fff;
  font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:600;
  padding:8px 14px;text-align:center;letter-spacing:.2px;
  box-shadow:0 2px 6px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;gap:8px}
.offline-banner .dot{width:8px;height:8px;border-radius:50%;background:#fff;
  box-shadow:0 0 0 3px rgba(255,255,255,0.25);animation:pyOfflinePulse 1.6s ease-in-out infinite}
@keyframes pyOfflinePulse{0%,100%{opacity:.6}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){
  .offline-banner .dot{animation:none}
  .pyscal *,.pyscal *::before,.pyscal *::after{animation-duration:.001ms!important;transition-duration:.001ms!important}
}
.pyscal-inner{min-height:0;padding:24px 16px 16px}
.ctn{max-width:880px;margin:0 auto}

/* header */
.hdr{display:flex;align-items:center;gap:12px;margin-bottom:20px;position:relative}
.logo{width:42px;height:42px;background:var(--brand);display:flex;align-items:center;justify-content:center;
  color:var(--brand-text);flex-shrink:0}
.brand h1{font-family:'Funnel Display',sans-serif;font-size:22px;font-weight:800;color:var(--text);
  letter-spacing:-1px;line-height:1}
.brand span{font-size:12px;color:var(--text-m);font-weight:500;display:block;margin-top:2px}
.hdr-r{margin-left:auto;display:flex;gap:6px;position:relative}
.gear-btn{width:38px;height:38px;border:1px solid var(--border);background:var(--surface);
  color:var(--text-m);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s,color .15s,background-color .15s,box-shadow .15s}
.gear-btn:hover,.gear-btn.active{border-color:var(--brand);color:var(--brand)}
/* a11y: ensure keyboard/programmatic focus outline is always drawn */
.gear-btn:focus,.gear-btn:focus-visible{outline:2px solid var(--brand)!important;outline-offset:2px!important;box-shadow:0 0 0 2px var(--brand-d)!important}

/* mode toggle */
.mode-toggle{display:flex;background:var(--surface);border:1px solid var(--border);margin-bottom:14px}
.mode-toggle button{flex:1;background:none;border:none;color:var(--text-m);
  font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:600;padding:11px 14px;
  cursor:pointer;transition:all .15s;letter-spacing:0.2px}
.mode-toggle button.active{background:var(--brand);color:var(--brand-text)}
.mode-toggle button:hover:not(.active){background:var(--surface-hover);color:var(--text)}

/* settings panel */
/* === Onboarding hint === */
.onboarding{position:relative;background:var(--surface);border:1px solid var(--border);
  border-left:3px solid var(--brand);padding:18px 20px;margin-bottom:14px;
  animation:si .25s ease}
.onboarding-close{position:absolute;top:10px;right:10px;background:transparent;border:none;
  color:var(--text-d);cursor:pointer;padding:8px;display:flex;align-items:center;justify-content:center;
  min-width:32px;min-height:32px;transition:color .15s}
.onboarding-close:hover{color:var(--red)}
.onboarding-title{font-family:'Funnel Display',sans-serif;font-size:16px;font-weight:700;
  color:var(--text);letter-spacing:-0.3px;margin-bottom:4px;padding-right:32px}
.onboarding-sub{font-family:'Funnel Sans',sans-serif;font-size:13px;color:var(--text-m);
  line-height:1.45;margin-bottom:14px}
.onboarding-steps{list-style:none;padding:0;margin:0 0 14px 0;display:flex;flex-direction:column;gap:10px}
.onboarding-steps li{display:flex;gap:12px;align-items:flex-start;
  font-family:'Funnel Sans',sans-serif;font-size:13px;color:var(--text);line-height:1.5}
.onboarding-steps strong{color:var(--text);font-weight:700}
.ob-num{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--brand);
  color:var(--brand-text);font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;
  display:flex;align-items:center;justify-content:center;margin-top:1px}
.ob-kbd{display:inline-block;margin-left:8px;padding:2px 7px;font-family:'JetBrains Mono',monospace;
  font-size:11px;font-weight:600;background:var(--inp-bg);border:1px solid var(--border);
  color:var(--text-m);border-radius:3px;white-space:nowrap}
.onboarding-actions{display:flex;justify-content:flex-end}
.btn-primary-pyscal{background:var(--brand);color:var(--brand-text);border:none;
  font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:700;padding:10px 18px;
  cursor:pointer;transition:opacity .15s;letter-spacing:0.2px;min-height:40px}
.btn-primary-pyscal:hover{opacity:.88}
@media(max-width:700px){
  .onboarding{padding:16px}
  .onboarding-title{font-size:15px}
  .onboarding-steps li{font-size:13px}
  .ob-kbd{display:block;margin:6px 0 0 0;width:fit-content}
  .btn-primary-pyscal{width:100%;min-height:44px}
}

.settings-panel{position:absolute;top:calc(100% + 8px);right:0;width:360px;max-width:calc(100vw - 32px);
  background:var(--surface);border:1px solid var(--border);z-index:50;
  animation:si .15s ease;box-shadow:0 8px 32px rgba(0,0,0,0.12);max-height:80vh;overflow-y:auto}
.sp-section{padding:18px;border-bottom:1px solid var(--border)}
.sp-section:last-child{border-bottom:none}
.sp-title{font-family:'Funnel Sans',sans-serif;font-size:11px;font-weight:700;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.sp-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sp-input{width:100%;background:var(--inp-bg);border:1px solid var(--border);color:var(--text);
  font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;padding:10px 12px;outline:none;transition:border-color .15s}
.sp-input:focus{border-color:var(--brand)}
.sp-label{font-size:10px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px}

.theme-pill{display:flex;gap:4px;background:var(--inp-bg);padding:3px;border:1px solid var(--border)}
.theme-pill button{flex:1;background:transparent;border:none;padding:7px 10px;cursor:pointer;
  color:var(--text-m);font-family:'Funnel Sans',sans-serif;font-size:12px;font-weight:600;
  display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s}
.theme-pill button.active{background:var(--brand);color:var(--brand-text)}

.sp-presets{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;max-height:180px;overflow-y:auto}
.sp-preset-item{display:flex;align-items:stretch;border:1px solid var(--border);background:var(--inp-bg);border-radius:6px;overflow:hidden}
.sp-preset-load{flex:1;background:none;border:none;color:var(--text);text-align:left;
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;padding:8px 12px;cursor:pointer;transition:background .15s}
.sp-preset-load:hover{background:var(--surface-hover)}
.sp-preset-x{background:none;border:none;border-left:1px solid var(--border);color:var(--text-m);
  cursor:pointer;padding:0 12px;min-width:40px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.sp-preset-x:hover,.sp-preset-x:focus-visible{background:var(--red);color:#fff;border-color:var(--red)}
.sp-preset-x svg{width:14px;height:14px}
.sp-preset-save{display:flex;border:1px solid var(--border)}
.sp-preset-save input{flex:1;background:var(--inp-bg);border:none;outline:none;
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text);padding:10px 12px;min-width:0}
.sp-preset-save input::placeholder{color:var(--text-d)}
.sp-preset-save button{background:var(--brand);border:none;color:var(--brand-text);
  padding:0 16px;cursor:pointer;font-family:'Funnel Sans',sans-serif;font-size:12px;font-weight:700;transition:background .15s}
.sp-preset-save button:hover{background:var(--brand-h)}
.sp-preset-save button:disabled{opacity:.4;cursor:default}
.sp-empty{font-size:12px;color:var(--text-d);padding:8px 0;font-style:italic}

.sp-import-export{display:flex;gap:6px;margin-top:8px}
.sp-ie-btn{flex:1;background:transparent;border:1px solid var(--border);color:var(--text-m);
  font-family:'Funnel Sans',sans-serif;font-size:11px;font-weight:600;padding:8px 10px;cursor:pointer;
  transition:all .15s;letter-spacing:0.3px}
.sp-ie-btn:hover{border-color:var(--brand);color:var(--brand)}

.sp-ios-install{margin-top:6px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface-2,rgba(255,255,255,0.02))}
.sp-ios-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px;letter-spacing:0.3px;text-transform:uppercase}
.sp-ios-steps{margin:0;padding-left:18px;font-size:12px;color:var(--text-m);line-height:1.65}
.sp-ios-steps li{margin-bottom:4px}
.sp-ios-steps b{color:var(--text);font-weight:600}
.sp-ios-ico{display:inline-block;padding:0 4px;border:1px solid var(--border);border-radius:3px;font-size:11px;line-height:1.4;margin:0 1px}
.sp-ios-warn{margin-top:8px;font-size:11px;color:var(--text-d);font-style:italic;line-height:1.5}

/* shortcut list in settings */
.kbd-list{display:flex;flex-direction:column;gap:6px}
.kbd-row{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:8px 0;font-size:12px;color:var(--text-m)}
.kbd-row label{flex:1;color:var(--text2)}
.kbd-input{background:var(--inp-bg);border:1px solid var(--border);color:var(--text);
  font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;padding:5px 8px;width:120px;
  text-align:center;outline:none;cursor:pointer;transition:all .15s;text-transform:uppercase;letter-spacing:0.5px}
.kbd-input:focus,.kbd-input.recording{border-color:var(--brand);background:var(--brand-d);color:var(--brand)}
.kbd-reset{background:none;border:none;color:var(--text-d);cursor:pointer;font-size:11px;
  font-family:'Funnel Sans',sans-serif;text-decoration:underline;padding:2px 4px}
.kbd-reset:hover{color:var(--brand)}

/* settings actions */
.sp-action-btn{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--inp-bg);
  border:1px solid var(--border);color:var(--text);cursor:pointer;width:100%;text-align:left;
  font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:600;transition:all .15s;margin-bottom:6px}
.sp-action-btn:last-child{margin-bottom:0}
.sp-action-btn:hover{border-color:var(--brand);color:var(--brand)}

/* caution */
.caution{display:flex;align-items:center;gap:12px;padding:14px 18px;
  background:var(--brand-d);border:1px solid var(--brand);border-left:4px solid var(--brand);
  margin-bottom:16px;font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:500;
  color:var(--text);line-height:1.5;animation:si .2s ease}
.caution-icon{color:var(--brand);font-size:16px;flex-shrink:0;font-weight:700}
.caution-text{flex:1}
.caution-val{font-weight:700;color:var(--brand)}
.caution-red{background:var(--red-d);border-color:var(--red);border-left-color:var(--red)}
.caution-red .caution-icon,.caution-red .caution-val{color:var(--red)}

/* preset chips */
.preset-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;align-items:center}
.preset-chip{background:var(--surface);border:1px solid var(--border);color:var(--text);
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;
  padding:8px 14px;cursor:pointer;transition:all .15s}
.preset-chip:hover{border-color:var(--brand);color:var(--brand)}
.preset-chip.active{background:var(--brand);color:var(--brand-text);border-color:var(--brand)}

/* card */
.card{background:var(--surface);border:1px solid var(--border);padding:24px;margin-bottom:16px}
.ig{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.ig-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)}
.il{font-family:'Funnel Sans',sans-serif;font-size:11px;font-weight:600;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
.if{width:100%;background:var(--inp-bg);border:1px solid var(--border);color:var(--text);
  font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;padding:13px 14px;
  outline:none;transition:border-color .15s;letter-spacing:-0.3px}
.if:focus{border-color:var(--brand)}

/* papan bar */
.papan-bar{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)}
.papan-label{font-family:'Funnel Sans',sans-serif;font-size:12px;font-weight:700;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.5px}
.papan-actions{display:flex;align-items:center;gap:8px}
.ibtn{width:34px;height:34px;border:1px solid var(--border);background:var(--surface);color:var(--text-m);
  display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.ibtn:hover{border-color:var(--brand);color:var(--brand)}
.ibtn:active{transform:scale(0.94)}
.ibtn.primary{border-color:var(--brand);background:var(--brand);color:var(--brand-text)}
.ibtn.primary:hover{background:var(--brand-h);border-color:var(--brand-h)}
.ibtn.danger:hover{border-color:var(--red);color:var(--red);background:var(--red-d)}
.ibtn.success{color:var(--green);border-color:var(--green)}
.ibtn-active-amber{background:var(--brand)!important;color:var(--brand-text)!important;border-color:var(--brand)!important}
.ibtn-active-amber:hover{background:var(--brand-h)!important;border-color:var(--brand-h)!important}

/* custom lot badge */
.papan-label-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.custom-lot-badge{font-family:'Funnel Sans',sans-serif;font-size:9px;font-weight:700;
  letter-spacing:0.8px;color:var(--brand-text);background:var(--brand);padding:3px 7px;
  border:1px solid var(--brand);animation:badgePulse 2s ease-in-out infinite}
@keyframes badgePulse{0%,100%{opacity:1}50%{opacity:0.72}}

/* lot-edit inputs (custom lot mode) */
.lot-edit{background:var(--inp-bg);border:1px solid var(--brand);color:var(--text);
  font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;letter-spacing:-0.3px;
  padding:6px 8px;width:80px;text-align:right;outline:none;transition:border-color .15s,background-color .15s;-moz-appearance:textfield}
.lot-edit::-webkit-outer-spin-button,.lot-edit::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.lot-edit:focus{border-color:var(--brand-h);background:var(--brand-d)}
.lot-edit:focus,.lot-edit:focus-visible,.lot-edit-m:focus,.lot-edit-m:focus-visible{outline-style:solid!important;outline-width:2px!important;outline-color:var(--brand)!important;outline-offset:2px!important}
.lot-edit-m{border-color:var(--brand)!important}

/* table */
.dt{overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.dt::-webkit-scrollbar{display:none}
table{width:100%;border-collapse:collapse;min-width:560px}
thead th{font-family:'Funnel Sans',sans-serif;font-size:10px;font-weight:700;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.6px;padding:14px 14px;text-align:right;
  border-bottom:1px solid var(--border);white-space:nowrap}
thead th:first-child{text-align:center;width:1%;padding:14px 8px}
thead th:last-child{width:1%;padding:14px 8px}
tbody tr{transition:background .12s;animation:rs .25s ease both}
tbody tr:hover{background:var(--surface-hover)}
tbody td{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;padding:14px 14px;
  text-align:right;border-bottom:1px solid var(--border);color:var(--text);letter-spacing:-0.3px;white-space:nowrap}
tbody td:first-child{text-align:center;color:var(--text-d);font-family:'Funnel Sans',sans-serif;
  font-weight:600;font-size:11px;padding:14px 8px;width:1%}
tbody td:last-child{padding:14px 8px;width:1%}

/* existing row in position mode - border-left instead of bg */
.row-existing td{border-left:none}
.row-existing td:first-child{color:var(--text-m)!important;font-style:italic;font-size:10px;
  border-left:2px solid var(--text-m)}
.row-existing .c-bid-static{color:var(--text);font-weight:700}

/* bid - primary text, no color */
.c-bid{color:var(--text)!important;font-weight:700!important}
.bid-edit{background:transparent;border:1px solid transparent;color:var(--text);
  font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;letter-spacing:-0.3px;
  padding:6px 8px;width:80px;text-align:right;outline:none;transition:border-color .15s,background-color .15s;
  -moz-appearance:textfield}
.bid-edit::-webkit-outer-spin-button,.bid-edit::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.bid-edit:hover{border-color:var(--border)}
.bid-edit:focus{border-color:var(--brand);background:var(--inp-bg)}
.bid-edit:focus,.bid-edit:focus-visible{outline-style:solid!important;outline-width:2px!important;outline-color:var(--brand)!important;outline-offset:2px!important}
.bid-edit-w{color:var(--text-m)!important;opacity:.8}
/* grid inputs — clear error state, distinct from focus ring */
.bid-edit[aria-invalid="true"],.lot-edit[aria-invalid="true"]{
  border-color:var(--red)!important;background:var(--red-d)!important;
  color:var(--red)!important;box-shadow:inset 0 0 0 1px var(--red)}
.bid-edit[aria-invalid="true"]:focus,.bid-edit[aria-invalid="true"]:focus-visible,
.lot-edit[aria-invalid="true"]:focus,.lot-edit[aria-invalid="true"]:focus-visible{
  outline:2px solid var(--brand)!important;outline-offset:3px!important;
  border-color:var(--red)!important}

/* bid step buttons - show on hover/focus */
.bid-step-wrap{display:inline-flex;align-items:center;position:relative}
.bid-step-btns{display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .12s;
  margin-left:2px;justify-content:center;gap:1px}
.bid-step-wrap:hover .bid-step-btns,.bid-step-wrap.focused .bid-step-btns{opacity:1;pointer-events:auto}
.bid-step-btn{background:var(--surface);border:1px solid var(--border);color:var(--text-m);
  width:16px;height:14px;display:flex;align-items:center;justify-content:center;
  font-size:8px;line-height:1;cursor:pointer;padding:0;transition:all .12s;user-select:none;
  font-family:'Funnel Sans',sans-serif}
.bid-step-btn:hover{background:var(--brand);color:var(--brand-text);border-color:var(--brand)}
.bid-step-btn:active{transform:scale(0.88);transition:transform .08s ease}
.bid-step-btn.is-disabled,.bid-step-btn:disabled{opacity:0.3;cursor:not-allowed;pointer-events:none}
.bid-step-btn.is-disabled:hover,.bid-step-btn:disabled:hover{background:var(--surface);color:var(--text-m);border-color:var(--border)}

/* mobile variant: buttons always visible, bigger */
.bid-step-mobile{display:flex;align-items:center}
.bid-step-mobile .bid-step-btns{opacity:1;pointer-events:auto;margin-left:4px;gap:2px}
.bid-step-mobile .bid-step-btn{width:22px;height:18px;font-size:10px}

/* lot, sell - primary text bold. avg, cost - muted */
.c-lot{color:var(--text)!important;font-weight:700!important}
.c-avg{color:var(--text-m)!important;font-weight:500!important}
.c-sell{color:var(--text)!important;font-weight:700!important}
.c-cost{color:var(--text-m)!important;font-weight:500!important;font-size:13px!important}

/* profit & % - ONLY semantic color in the table */
.c-plp{color:var(--green)!important;font-weight:700!important}
.c-pln{color:var(--red)!important;font-weight:700!important}
.pp{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;display:inline-block}
.pp-g{color:var(--green)}
.pp-r{color:var(--red)}
.pp-u{color:var(--text-m);display:inline-flex;align-items:center;gap:4px;font-weight:600}
.pp-icon{font-size:10px;line-height:1;color:var(--brand)}

/* under-target - subtle border-left accent */
.row-under td:first-child{border-left:2px solid var(--brand)}
.row-under:hover{background:var(--surface-hover)}

.row-x{background:transparent;border:none;color:var(--text-d);cursor:pointer;padding:4px;
  display:flex;align-items:center;margin-left:auto;transition:color .15s}
.row-x:hover{color:var(--red)}
.row-x:focus,.row-x:focus-visible{outline-style:solid!important;outline-width:2px!important;outline-color:var(--brand)!important;outline-offset:2px!important;color:var(--red);border-radius:4px}
.m-remove:focus,.m-remove:focus-visible{outline-style:solid!important;outline-width:2px!important;outline-color:var(--brand)!important;outline-offset:2px!important;border-radius:6px}

.total-row td{border-top:1px solid var(--border-strong)!important;border-bottom:none!important;
  font-weight:700!important;color:var(--text)!important;padding-top:16px!important;font-size:14px!important;
  background:color-mix(in oklab, var(--brand) 8%, transparent)!important}
.total-label{font-family:'Funnel Sans',sans-serif!important;font-size:11px!important;
  text-transform:uppercase;letter-spacing:0.6px;color:var(--text-m)!important;font-weight:600!important}
/* TOAST */
.toast-container{position:fixed;bottom:20px;right:20px;z-index:200;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--brand);
  padding:12px 16px;min-width:240px;max-width:380px;display:flex;align-items:center;gap:10px;
  font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:500;color:var(--text);
  box-shadow:0 4px 20px rgba(0,0,0,0.15);animation:toastIn .25s ease;pointer-events:auto}
.toast.toast-out{animation:toastOut .25s ease forwards}
.toast-icon{color:var(--brand);flex-shrink:0;display:flex;align-items:center}
.toast-success .toast-icon{color:var(--green)}
.toast-success{border-left-color:var(--green)}
.toast-error .toast-icon{color:var(--red)}
.toast-error{border-left-color:var(--red)}
.toast-text{flex:1;line-height:1.4}
.toast-text strong{font-weight:700;color:var(--text)}
.toast-action{background:transparent;border:1px solid var(--brand);color:var(--brand);
  font-family:'Funnel Sans',sans-serif;font-size:11px;font-weight:700;padding:5px 12px;cursor:pointer;
  letter-spacing:0.5px;text-transform:uppercase;flex-shrink:0;transition:all .15s}
.toast-action:hover{background:var(--brand);color:var(--brand-text)}
@keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(40px)}}

/* SWIPEABLE CARD */
.swipe-wrap{position:relative;overflow:hidden}
.swipe-bg{position:absolute;top:0;right:0;bottom:0;width:100%;background:var(--red);
  display:flex;align-items:center;justify-content:flex-end;padding:0 24px;
  font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:700;color:#fff;letter-spacing:0.5px}

/* PRESET CHIP FLASH */
@keyframes chipFlash{0%{background:var(--brand);color:var(--brand-text);transform:scale(1)}
  40%{background:var(--brand-h);transform:scale(1.05)}
  100%{background:var(--brand);color:var(--brand-text);transform:scale(1)}}
.preset-chip.flash{animation:chipFlash .5s ease}

@media(max-width:700px){
  .toast-container{right:12px;left:12px;bottom:16px;align-items:stretch}
  .toast{min-width:0;max-width:none;font-size:12px;padding:11px 14px}
}

.util{color:var(--text-m);font-size:12px;font-weight:500;margin-left:4px}

/* mobile cards - 2-row compact layout */
.mc{display:none}
.mk{background:var(--surface);border:1px solid var(--border);padding:14px 14px;
  position:relative;animation:rs .3s ease both}
.mk-under{border-left:2px solid var(--brand)}
.mk-existing{border-left:2px solid var(--text-m)}
.mk-existing::before{content:'EXISTING';position:absolute;top:10px;right:14px;
  font-family:'Funnel Sans',sans-serif;font-size:9px;font-weight:700;color:var(--text-m);
  letter-spacing:0.8px;font-style:italic}
.mk-existing{padding-top:28px}
.m-remove{position:absolute;top:0;right:0;background:transparent;border:none;color:var(--text-d);
  cursor:pointer;padding:6px;display:flex;align-items:center;transition:color .15s;z-index:2}
.m-remove:hover{color:var(--red)}

/* Row 1: Bid, Lot, Sell */
.mh{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.mhi{min-width:0}
.mhi label{font-family:'Funnel Sans',sans-serif;font-size:9px;font-weight:600;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px}
.mhi span{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:17px;letter-spacing:-0.5px;display:block;color:var(--text);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mhi-inp{background:transparent;border:1px solid var(--border);color:var(--text);
  font-family:'JetBrains Mono',monospace;font-weight:700;font-size:17px;letter-spacing:-0.5px;
  padding:3px 7px;width:100%;max-width:82px;outline:none;-moz-appearance:textfield}
.mhi-inp::-webkit-outer-spin-button,.mhi-inp::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.mhi-inp:focus{border-color:var(--brand)}

/* Row 2: Avg, Cost, Profit, % - 4 cols compact */
.mg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.mgi{min-width:0}
.mgi label{font-family:'Funnel Sans',sans-serif;font-size:9px;font-weight:600;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:3px}
.mgi span{font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:500;color:var(--text-m);
  letter-spacing:-0.3px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mgi-profit span{color:var(--text)!important;font-weight:700}
.mgi-pct span{font-weight:700}

.mt{background:color-mix(in oklab, var(--brand) 8%, transparent);border-top:1px solid var(--border-strong);padding:14px 16px;
  display:flex;align-items:center;justify-content:space-between}
.mt-label{font-family:'Funnel Sans',sans-serif;font-size:10px;font-weight:600;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.6px}
.mt-val{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:700;color:var(--text);
  letter-spacing:-0.5px;margin-top:2px}
.util-m{color:var(--text-m);font-size:12px;font-weight:500;margin-left:6px}

/* modal */
.modal-overlay{position:fixed;inset:0;background:var(--modal-bg);z-index:100;
  display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto;
  animation:fadeIn .2s ease;backdrop-filter:blur(4px)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--bg);border:1px solid var(--border);width:100%;max-width:720px;
  animation:si .25s ease}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border)}
.modal-title{font-family:'Funnel Display',sans-serif;font-size:18px;font-weight:700;color:var(--text);letter-spacing:-0.3px}
.modal-close{background:transparent;border:none;color:var(--text-m);cursor:pointer;padding:6px;
  display:flex;align-items:center;transition:color .15s}
.modal-close:hover{color:var(--red)}
.modal-body{padding:20px}

/* INFO MODAL */
.info-body{display:flex;flex-direction:column;gap:14px}
.info-sec{background:var(--surface-2,var(--surface));border:1px solid var(--border);
  border-radius:10px;padding:14px 16px}
.info-h{font-family:'Funnel Sans',sans-serif;margin:0 0 8px;font-size:11px;font-weight:700;
  color:var(--text-m);text-transform:uppercase;letter-spacing:0.8px}
.info-p{margin:0;font-size:14px;line-height:1.6;color:var(--text)}
.info-ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;
  color:var(--text);font-size:14px;line-height:1.55}
.info-kbd{margin-left:6px}
.btn-secondary{background:transparent;border:1px solid var(--border);color:var(--text);
  font-family:'Funnel Sans',sans-serif;font-size:13px;font-weight:600;padding:10px 18px;cursor:pointer;transition:all .15s}
.btn-secondary:hover{border-color:var(--brand);color:var(--brand)}

/* history list - avg-as-title */
.history-list{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto}
.history-item{background:var(--surface);border:1px solid var(--border);padding:14px 16px;cursor:pointer;
  display:flex;align-items:center;gap:12px;transition:all .15s}
.history-item:hover{border-color:var(--brand)}
.history-info{flex:1;min-width:0}
.history-avg{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--text);
  letter-spacing:-0.3px;margin-bottom:4px}
.history-meta{font-family:'Funnel Sans',sans-serif;font-size:12px;color:var(--text-m);margin-bottom:3px;line-height:1.4}
.history-time{font-family:'Funnel Sans',sans-serif;font-size:11px;color:var(--text-d)}
.history-del{background:transparent;border:none;color:var(--text-d);cursor:pointer;padding:6px;
  display:flex;align-items:center;transition:color .15s;flex-shrink:0}
.history-del:hover{color:var(--red)}
.history-empty{text-align:center;padding:40px 20px;color:var(--text-d);font-style:italic}

.history-search{margin-bottom:12px}
.history-actions{display:flex;align-items:center;gap:2px;flex-shrink:0}
.history-act{background:transparent;border:none;color:var(--text-d);cursor:pointer;
  padding:8px;display:flex;align-items:center;justify-content:center;
  font-size:14px;line-height:1;transition:color .15s,background .15s;min-width:32px;min-height:32px}
.history-act:hover{color:var(--brand);background:var(--surface-hover)}
.history-act[aria-pressed="true"]{color:var(--brand)}
.history-item.pinned{border-left:3px solid var(--brand)}

.history-detail{padding:0}
.hd-section{padding:18px 20px;border-bottom:1px solid var(--border)}
.hd-section:last-child{border-bottom:none}
.hd-section-title{font-family:'Funnel Sans',sans-serif;font-size:11px;font-weight:700;color:var(--text-m);
  text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px}
.hd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.hd-field label{font-size:10px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px}
.hd-field span{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:var(--text);display:block}
.hd-mini-table{font-size:12px;color:var(--text-m);font-family:'JetBrains Mono',monospace}
.hd-mini-table div{padding:6px 0;display:flex;justify-content:space-between;border-bottom:1px solid var(--border)}
.hd-mini-table div:last-child{border-bottom:none}

@media(max-width:700px){
  .pyscal-inner{padding:20px 12px 48px}
  .dt{display:none}
  .mc{display:flex;flex-direction:column;gap:10px}
  .ig{grid-template-columns:1fr 1fr;gap:12px}
  .ig > div:nth-child(odd):last-child{grid-column:span 2}
  .ig-2{grid-template-columns:1fr 1fr}
  .hdr{margin-bottom:18px}
  .logo{width:38px;height:38px}
  .brand h1{font-size:19px;letter-spacing:-0.5px}
  .brand span{font-size:11px}
  .card{padding:16px}
  .if{font-size:16px;padding:13px}
  .il{font-size:10px;letter-spacing:0.4px;margin-bottom:6px}
  .mode-toggle button{font-size:13px;padding:12px 10px}
  .preset-bar{margin-bottom:12px}
  .preset-chip{font-size:12px;padding:7px 12px}
  .caution{padding:12px 14px;font-size:12px;gap:10px;line-height:1.45}
  .papan-bar{padding:14px 14px}
  .papan-label{font-size:11px}

  /* === Bottom-sheet: Settings === */
  .settings-panel{
    position:fixed;left:0;right:0;bottom:0;top:auto;
    width:100%;max-width:100%;
    max-height:85vh;overflow-y:auto;
    border:none;border-top:1px solid var(--border);
    border-radius:16px 16px 0 0;
    box-shadow:0 -8px 32px rgba(0,0,0,0.18);
    padding-bottom:env(safe-area-inset-bottom,0);
    animation:sheetUp .22s cubic-bezier(.2,.8,.2,1);
    z-index:90;
  }
  .settings-panel::before{
    content:'';display:block;width:40px;height:4px;border-radius:2px;
    background:var(--border);margin:10px auto 4px;
  }
  .sp-section{padding:16px 18px}

  /* === Bottom-sheet: History modal === */
  .modal-overlay{padding:0;align-items:flex-end}
  .modal{
    max-width:100%;width:100%;
    max-height:92vh;display:flex;flex-direction:column;
    border:none;border-top:1px solid var(--border);
    border-radius:16px 16px 0 0;
    box-shadow:0 -8px 32px rgba(0,0,0,0.18);
    padding-bottom:env(safe-area-inset-bottom,0);
    animation:sheetUp .25s cubic-bezier(.2,.8,.2,1);
  }
  .modal::before{
    content:'';display:block;width:40px;height:4px;border-radius:2px;
    background:var(--border);margin:10px auto 0;flex-shrink:0;
  }
  .modal-header{padding:14px 18px}
  .modal-body{padding:16px;overflow-y:auto;flex:1;min-height:0}
  .modal-close{padding:10px;min-width:44px;min-height:44px;justify-content:center}
  .hd-grid{grid-template-columns:1fr}
  .history-list{max-height:none}
  .history-item{padding:16px;min-height:44px}
  .history-del{padding:10px;min-width:44px;min-height:44px;justify-content:center}
}
@keyframes sheetUp{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}

@media(max-width:700px){

  /* Mobile result cards */
  .mk{padding:16px 14px}
  .mb{width:26px;height:26px;font-size:11px;top:12px;right:12px}
  .m-remove{top:0;right:0}
  .mh{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;padding-bottom:12px;align-items:end}
  .mhi{min-width:0}
  .mhi label{font-size:9px;letter-spacing:0.5px;margin-bottom:4px}
  .mhi span{font-size:16px;letter-spacing:-0.4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mhi-inp{font-size:16px;width:100%;max-width:72px;padding:3px 6px}
  .mg{grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
  .mgi label{font-size:9px;letter-spacing:0.4px}
  .mgi span{font-size:13px}
  .mt{padding:14px 16px}
  .mt-label{font-size:10px}
  .mt-val{font-size:16px}
}

@media(max-width:420px){
  .pyscal-inner{padding:16px 10px 40px}
  .card{padding:14px}
  .hdr{gap:10px}
  .logo{width:36px;height:36px}
  .brand h1{font-size:18px}
  .brand span{font-size:10px}
  .ibtn{width:32px;height:32px}
  .ig{gap:10px}
  .if{font-size:16px;padding:12px}
  .mode-toggle button{font-size:12px;padding:11px 8px}
  .preset-chip{font-size:12px;padding:6px 10px}
  .caution{padding:11px 12px;font-size:11.5px}
  .papan-bar{padding:12px 12px}
  .papan-label{font-size:10.5px}
  .papan-actions{gap:6px}
  .mk{padding:14px 12px}
  .mh{gap:8px}
  .mhi label{font-size:9px}
  .mhi span{font-size:15px}
  .mhi-inp{font-size:15px;max-width:66px;padding:3px 5px}
  .mg{gap:8px}
  .mgi label{font-size:8.5px}
  .mgi span{font-size:12.5px}
  .total-row td{padding:14px 8px!important;font-size:12.5px!important}
}

@keyframes rs{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
@keyframes onb-fade{from{opacity:0}to{opacity:1}}
@keyframes onb-rise{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}

.onb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;
  display:flex;align-items:flex-end;justify-content:center;padding:16px;
  animation:onb-fade .22s ease-out both}
.onb-card{position:relative;background:var(--surface);color:var(--text-d);border:1px solid var(--border);
  border-radius:14px;padding:64px 16px 14px;width:100%;max-width:420px;
  box-shadow:0 20px 60px rgba(0,0,0,.35);animation:rs .25s ease}
.onb-close{position:absolute;top:8px;right:8px;z-index:2;background:transparent;border:none;
  color:var(--text-m);font-size:12px;font-weight:600;padding:8px 12px;min-height:44px;
  min-width:44px;border-radius:8px;cursor:pointer;line-height:1}
.onb-close:hover{color:var(--text-d);background:var(--surface-hover)}
.onb-close:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.onb-hint{font-size:11px;color:var(--brand);font-weight:700;letter-spacing:.3px;
  text-transform:uppercase;margin-bottom:6px}
.onb-title{font-size:16px;font-weight:800;color:var(--text-d);margin-bottom:6px}
.onb-body{font-size:13px;line-height:1.5;color:var(--text-m);margin-bottom:12px}
.onb-progress{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.onb-count{font-size:11px;font-weight:700;color:var(--text-m);
  font-variant-numeric:tabular-nums;letter-spacing:.4px;min-width:34px}
.onb-bar{position:relative;flex:1;height:4px;background:var(--border);
  border-radius:999px;overflow:hidden}
.onb-bar-fill{display:block;height:100%;background:var(--brand);border-radius:999px;
  transition:width .35s cubic-bezier(.22,.61,.36,1)}
.onb-dots{display:flex;gap:8px;justify-content:center;margin-bottom:12px;align-items:center}
.onb-dot{width:10px;height:10px;padding:0;border-radius:50%;background:var(--border);
  border:none;cursor:pointer;transition:background .15s,width .15s}
.onb-dot.active{background:var(--brand);width:22px;border-radius:5px}
.onb-dot:focus-visible{outline:2px solid var(--brand);outline-offset:3px}
.onb-actions{display:flex;gap:8px;justify-content:space-between;align-items:center}
@media (prefers-reduced-motion: reduce){
  .onb-overlay{animation:none}
  .onb-card{animation:none}
  .onb-bar-fill{transition:none}
  .onb-dot{transition:none}
}
.onb-skip{background:transparent;border:none;color:var(--text-m);font-size:13px;
  padding:10px 12px;min-height:44px;cursor:pointer;border-radius:8px}
.onb-skip:hover{color:var(--text-d)}
.onb-skip:disabled{opacity:.4;cursor:not-allowed}
.onb-skip:disabled:hover{color:var(--text-m)}
.onb-next{background:var(--brand);color:#fff;border:none;font-size:13px;font-weight:700;
  padding:10px 18px;min-height:44px;border-radius:10px;cursor:pointer;flex:1;max-width:180px}
.onb-next:hover{filter:brightness(1.05)}
.onb-skip:focus-visible,.onb-next:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
`;

/* ==================== TOAST COMPONENT ==================== */
/* ==================== FIELD HINT + HELP TIP ==================== */
function InstallAppRow() {
  const [available, setAvailable] = useState(isInstallAvailable());
  const [standalone] = useState(isStandalone());
  const [info] = useState(() => detectPlatform());
  useEffect(() => subscribeInstallPrompt(() => setAvailable(isInstallAvailable())), []);

  if (standalone) {
    return <div className="sp-empty">App sudah ter-install ✓</div>;
  }

  // In-app browser (IG/FB/Line/TikTok): A2HS jarang jalan.
  if (info.isInAppBrowser) {
    return (
      <div className="sp-empty">
        Kamu sedang di in-app browser. Tap menu ⋯ → "Open in {info.platform === "ios" ? "Safari" : "Chrome"}",
        lalu install dari sana.
      </div>
    );
  }

  // iOS: tidak ada beforeinstallprompt. Wajib manual A2HS via Safari.
  if (info.platform === "ios") {
    return (
      <div className="sp-ios-install">
        <div className="sp-ios-title">Install di iOS (Safari)</div>
        <ol className="sp-ios-steps">
          <li>Pastikan kamu buka di <b>Safari</b> (bukan Chrome/in-app).</li>
          <li>Tap ikon <b>Share</b> <span className="sp-ios-ico">⬆︎</span> di bawah.</li>
          <li>Scroll, pilih <b>Add to Home Screen</b> <span className="sp-ios-ico">＋</span>.</li>
          <li>Tap <b>Add</b>. Icon PYSCAL muncul di home screen.</li>
        </ol>
        {!info.isSafari && (
          <div className="sp-ios-warn">
            ⚠ Browser saat ini bukan Safari. Add to Home Screen hanya bekerja penuh di Safari iOS.
          </div>
        )}
      </div>
    );
  }

  // Android tanpa event (Chrome belum siap atau browser non-Chromium): instruksi manual.
  if (info.platform === "android" && !available) {
    return (
      <div className="sp-ios-install">
        <div className="sp-ios-title">Install di Android</div>
        <ol className="sp-ios-steps">
          <li>Pastikan buka di <b>Chrome</b> (bukan in-app browser).</li>
          <li>Tap menu <b>⋮</b> di pojok kanan atas.</li>
          <li>Pilih <b>Install app</b> atau <b>Add to Home screen</b>.</li>
        </ol>
        <div className="sp-ios-warn">
          Tip: prompt otomatis kadang muncul setelah beberapa detik di halaman — coba scroll/interaksi sebentar.
        </div>
      </div>
    );
  }

  // Desktop tanpa event: arahkan ke icon address bar.
  if (info.platform === "desktop" && !available) {
    return (
      <div className="sp-empty">
        Buka di Chrome/Edge/Brave, lalu klik ikon <b>Install</b> di pojok kanan address bar
        (atau menu ⋮ → Install PYSCAL).
      </div>
    );
  }

  // beforeinstallprompt tersedia → tombol langsung.
  return (
    <div className="sp-import-export">
      <button className="sp-ie-btn" onClick={() => triggerInstall()}>
        ↓ Install PYSCAL {info.platform === "android" ? "(Android)" : "(Desktop)"}
      </button>
    </div>
  );
}

function FieldHint({ status, id }) {
  if (!status || (!status.error && !status.warning)) return null;
  const isErr = !!status.error;
  return (
    <div
      id={id}
      className={`field-hint ${isErr ? 'error' : 'warning'}`}
      role={isErr ? 'alert' : 'status'}
      aria-live={isErr ? 'assertive' : 'polite'}
    >
      {isErr ? '✕ ' : '⚠ '}{status.error || status.warning}
    </div>
  );
}

/**
 * Cari input pertama yang menandai dirinya invalid (aria-invalid=true) di
 * dalam DOM, scroll ke tengah viewport, lalu fokus. Fallback ke elemen yang
 * di-`describe` oleh #pyscal-hint-* dengan .field-hint.error saat aria-invalid
 * tidak dipasang di elemen input (mis. FieldHint sibling).
 * Return true kalau ada elemen invalid yang di-fokus, false kalau semua bersih.
 */
function focusFirstInvalidInput(): boolean {
  if (typeof document === 'undefined') return false;
  // 1) Prefer eksplisit aria-invalid="true" di input aktif (visible + enabled).
  const invalids = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-invalid="true"]')
  ).filter((el) => {
    if ((el as HTMLInputElement).disabled) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false; // hidden
    return true;
  });
  let target: HTMLElement | undefined = invalids[0];
  // 2) Fallback: cari FieldHint .field-hint.error yang visible, resolve ke
  //    input via aria-describedby lookup.
  if (!target) {
    const hints = Array.from(
      document.querySelectorAll<HTMLElement>('.field-hint.error')
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    for (const hint of hints) {
      const id = hint.id;
      if (!id) continue;
      const owner = document.querySelector<HTMLElement>(
        `[aria-describedby~="${CSS.escape(id)}"]`
      );
      if (owner) { target = owner; break; }
    }
  }
  if (!target) return false;
  try {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } catch {
    target.scrollIntoView();
  }
  // Focus setelah scroll agar SR pindah reading cursor ke error tsb.
  requestAnimationFrame(() => {
    try { target!.focus({ preventScroll: true }); } catch { target!.focus(); }
    if ((target as HTMLInputElement).select) {
      try { (target as HTMLInputElement).select(); } catch {}
    }
  });
  return true;
}
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" role="region" aria-label="Notifikasi" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type ? 'toast-' + t.type : ''} ${t.leaving ? 'toast-out' : ''}`}
          role={t.type === 'error' ? 'alert' : 'status'}
          onAnimationEnd={() => { if (t.leaving) onRemove(t.id); }}>
          <span className="toast-icon">
            {t.type === 'success' && <CheckIcon />}
            {t.type === 'error' && '⚠'}
            {!t.type && '•'}
          </span>
          <span className="toast-text">{renderToastText(t.text)}</span>
          {t.action && (
            <button className="toast-action" onClick={() => { t.action.handler(); onRemove(t.id); }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Safely render toast text: only <strong>…</strong> is honored as JSX;
// everything else is text. Entities from escHtml() are decoded so user
// content displays correctly.
function renderToastText(text) {
  if (text == null) return null;
  const str = String(text);
  const decode = (s) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
     .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const parts = [];
  const re = /<strong>([\s\S]*?)<\/strong>/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(decode(str.slice(last, m.index)));
    parts.push(<strong key={i++}>{decode(m[1])}</strong>);
    last = re.lastIndex;
  }
  if (last < str.length) parts.push(decode(str.slice(last)));
  return parts;
}

/* ==================== BID STEP INPUT ==================== */
// Grid-cell keyboard navigation helpers (Enter / Shift+Enter / Alt+Arrows)
function focusGridCell(row, col) {
  if (row == null || col == null) return false;
  const el = document.querySelector(`[data-grid-row="${row}"][data-grid-col="${col}"]`);
  if (el && typeof el.focus === 'function') {
    el.focus();
    if (typeof el.select === 'function') { try { el.select(); } catch {} }
    return true;
  }
  return false;
}
function handleGridNavKey(e, row, col) {
  const r = Number(row);
  if (Number.isNaN(r) || !col) return false;
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      if (!focusGridCell(r - 1, col)) focusGridCell(0, col);
    } else if (!focusGridCell(r + 1, col)) {
      // wrap to opposite column on same row when at end
      focusGridCell(r, col === 'bid' ? 'lot' : 'bid');
    }
    return true;
  }
  if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); focusGridCell(r + 1, col); return true; }
  if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); focusGridCell(r - 1, col); return true; }
  if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); focusGridCell(r, col === 'bid' ? 'lot' : 'bid'); return true; }
  if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); focusGridCell(r, col === 'lot' ? 'bid' : 'lot'); return true; }
  return false;
}
// Enter / Shift+Enter navigation across setup-panel inputs (data-kbdnav="setup")
function handleSetupEnter(e) {
  if (e.key !== 'Enter') return;
  const nodes = Array.from(document.querySelectorAll('[data-kbdnav="setup"]'));
  const i = nodes.indexOf(e.currentTarget);
  if (i < 0) return;
  const next = e.shiftKey ? nodes[i - 1] : nodes[i + 1];
  if (next) {
    e.preventDefault();
    next.focus();
    if (typeof next.select === 'function') { try { next.select(); } catch {} }
  }
}

function BidStepInput({ value, onChange, onFocus, disabled, className = '', variant = 'desktop', label, warning, error, gridRow, gridCol, ...rest }) {
  const inputRef = useRef(null);
  const reactId = useId();
  const inputId = rest.id || `bid-input-${reactId}`;
  const hintId = `${inputId}-hint`;
  const [focused, setFocused] = useState(false);

  const haptic = () => {
    // Haptic feedback only for touch interaction (mobile devices)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10); } catch {}
    }
  };

  const stepUp = (fromTouch = false) => {
    const tick = getTickSize(value || 1);
    const next = Math.max(1, (value || 0) + tick);
    onChange(next);
    if (fromTouch) haptic();
  };
  const stepDown = (fromTouch = false) => {
    if ((value || 0) <= 1) return; // already at min
    const tick = getTickSize(value || 1);
    const next = Math.max(1, (value || 0) - tick);
    onChange(next);
    if (fromTouch) haptic();
  };

  const handleKeyDown = (e) => {
    if (handleGridNavKey(e, gridRow, gridCol)) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepUp(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepDown(false);
    }
  };

  const downDisabled = (value || 0) <= 1;
  const restNoId = { ...rest };
  delete restNoId.id;

  return (
    <div className={`bid-step-wrap ${variant === 'mobile' ? 'bid-step-mobile' : ''} ${focused ? 'focused' : ''}`}>
      {label ? (
        <label htmlFor={inputId} className="pyscal-sr-only">{label}</label>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="number"
        inputMode="decimal"
        enterKeyHint="done"
        className={className}
        value={value}
        min={1}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={(error || warning) ? hintId : undefined}
        data-grid-row={gridRow}
        data-grid-col={gridCol}
        onChange={e => onChange(+e.target.value)}
        onFocus={e => { setFocused(true); e.target.select(); if (onFocus) onFocus(e); }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        {...restNoId}
      />
      {(error || warning) ? (
        <span
          id={hintId}
          role="alert"
          aria-live={error ? "assertive" : "polite"}
          className="pyscal-sr-only"
        >
          {error || warning}
        </span>
      ) : null}
    </div>
  );
}

/**
 * LotInput — number input untuk kolom lot (per-papan atau lot dasar) dengan
 * validasi format ketat. Menampilkan pesan error/warning ke screen reader via
 * aria-describedby → <span role="alert">, dan menandai aria-invalid saat error.
 */
function LotInput({ value, onChange, className = '', label, gridRow, gridCol, onKeyDown, ...rest }) {
  const reactId = useId();
  const inputId = rest.id || `lot-input-${reactId}`;
  const hintId = `${inputId}-hint`;
  const status = validateLot(Number(value));
  const message = status.error || status.warning || '';
  const restNoId = { ...rest }; delete restNoId.id;
  return (
    <>
      <input
        id={inputId}
        type="number"
        className={className}
        value={value}
        min={1}
        step={100}
        inputMode="numeric"
        enterKeyHint="done"
        aria-label={label}
        aria-invalid={status.error ? true : undefined}
        aria-describedby={message ? hintId : undefined}
        data-grid-row={gridRow}
        data-grid-col={gridCol}
        onChange={e => onChange(+e.target.value)}
        onFocus={e => e.target.select()}
        onKeyDown={onKeyDown}
        {...restNoId}
      />
      {message ? (
        <span
          id={hintId}
          role="alert"
          aria-live={status.error ? "assertive" : "polite"}
          className="pyscal-sr-only"
        >
          {message}
        </span>
      ) : null}
    </>
  );
}

/* ==================== SWIPEABLE CARD ==================== */
function SwipeableCard({ children, canSwipe, onDelete, className = '', style = {} }) {
  const [translate, setTranslate] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const axisRef = useRef(null); // 'x' | 'y' | null
  const cardRef = useRef(null);

  const reset = () => {
    setTranslate(0);
    setSwiping(false);
    axisRef.current = null;
  };

  const handleTouchStart = (e) => {
    if (!canSwipe) return;
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    lastXRef.current = t.clientX;
    axisRef.current = null;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!canSwipe || !swiping) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;

    // Detect dominant axis on first significant movement (>8px)
    if (axisRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    if (axisRef.current === 'y') return; // user is scrolling vertically, don't intercept

    // Horizontal swipe - only allow leftward (negative dx)
    e.preventDefault();
    lastXRef.current = t.clientX;
    setTranslate(Math.min(0, dx));
  };

  const handleTouchEnd = () => {
    if (!canSwipe || !swiping) { reset(); return; }
    if (axisRef.current !== 'x') { reset(); return; }

    const cardWidth = cardRef.current ? cardRef.current.offsetWidth : 300;
    const threshold = cardWidth * 0.5;
    if (Math.abs(translate) > threshold) {
      // Animate out then delete
      setTranslate(-cardWidth);
      setTimeout(() => { onDelete(); reset(); }, 180);
    } else {
      reset();
    }
  };

  return (
    <div className="swipe-wrap" ref={cardRef}>
      {canSwipe && translate < -10 && (
        <div className="swipe-bg">
          <span>Hapus</span>
        </div>
      )}
      <div
        className={className}
        style={{
          ...style,
          transform: `translateX(${translate}px)`,
          transition: swiping ? 'none' : 'transform 0.18s ease-out',
          touchAction: canSwipe ? 'pan-y' : 'auto',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => reset()}
      >
        {children}
      </div>
    </div>
  );
}

/* ==================== MAIN COMPONENT ==================== */
export default function PYSCAL() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    // Prefer the value the pre-hydration script already applied to <html>,
    // then fall back to localStorage, then to system preference.
    try {
      const attr = document.documentElement.dataset.pyscalTheme;
      if (attr === 'dark' || attr === 'light') return attr;
      const saved = localStorage.getItem('pyscal_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    try {
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {}
    return 'light';
  });
  const initial = loadStateVersioned();

  const [baseLot, setBaseLot] = useState(initial.baseLot);
  const [targetTicks, setTargetTicks] = useState(initial.targetTicks);
  const [targetProfit, setTargetProfit] = useState(initial.targetProfit);
  const [feeBuy, setFeeBuy] = useState(initial.feeBuy);
  const [feeSell, setFeeSell] = useState(initial.feeSell);
  const [balance, setBalance] = useState(initial.balance);
  const [bids, setBids] = useState(initial.bids);
  const [mode, setMode] = useState(initial.mode);
  const [existingAvg, setExistingAvg] = useState(initial.existingAvg);
  const [existingLot, setExistingLot] = useState(initial.existingLot);
  const [customLot, setCustomLot] = useState(initial.customLot || false); // Custom Lot Override mode
  const [customLots, setCustomLots] = useState(initial.customLots || []); // array matching bids, lot per papan

  const [showSettings, setShowSettings] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [viewingTradeId, setViewingTradeId] = useState(null);
  const [showHint, setShowHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('pyscal_onboarded') !== '1'; } catch { return false; }
  });
  const dismissHint = useCallback(() => {
    setShowHint(false);
    try { localStorage.setItem('pyscal_onboarded', '1'); } catch {}
  }, []);
  const settingsRef = useRef(null);
  const bidAwalRef = useRef(null);

  // Undo/Redo (memory only, cap 50)
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const debounceTimerRef = useRef(null);
  const lastSnapshotRef = useRef(null);

  // Toast system
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((text, type = 'success', opts = {}) => {
    const id = ++toastIdRef.current;
    const { action = null, timeout = 2500 } = opts;
    setToasts(prev => [...prev, { id, text, type, leaving: false, action }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    }, timeout);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Surface storage errors dispatched from lib/storage.ts (quota / privacy mode).
  useEffect(() => {
    const onStorageErr = (e) => {
      const kind = e?.detail?.kind;
      if (kind === 'quota') {
        showToast('Storage browser penuh. Hapus history lama atau export backup.', 'error', { timeout: 5000 });
      } else {
        showToast('Data tidak bisa disimpan (mode private / storage diblokir).', 'error', { timeout: 5000 });
      }
    };
    window.addEventListener('pyscal:storage-error', onStorageErr);
    return () => window.removeEventListener('pyscal:storage-error', onStorageErr);
  }, [showToast]);

  // Flashing preset (load feedback)
  const [flashingPreset, setFlashingPreset] = useState(null);

  // Auto-save
  useEffect(() => {
    const state = { baseLot, targetTicks, targetProfit, feeBuy, feeSell, bids, balance, mode, existingAvg, existingLot, customLot, customLots };
    saveState(state);
  }, [baseLot, targetTicks, targetProfit, feeBuy, feeSell, bids, balance, mode, existingAvg, existingLot, customLot, customLots]);

  useEffect(() => {
    try { localStorage.setItem('pyscal_theme', theme); } catch {}
  }, [theme]);

  // Click outside settings
  useEffect(() => {
    if (!showSettings) return;
    const onClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showSettings]);

  // Presets
  const [presets, setPresets] = useState(() => {
    return loadPresets();
  });
  const [presetName, setPresetName] = useState("");
  const [activePreset, setActivePreset] = useState(null);

  const persistPresets = (next) => {
    setPresets(next);
    savePresets(next);
  };

  const savePreset = () => {
    const name = presetName.trim().toUpperCase();
    if (!name) return;
    const isUpdate = presets.some(p => p.name === name);
    const preset = { name, baseLot, targetTicks, targetProfit, bids: [...bids], balance, mode, existingAvg, existingLot };
    persistPresets([...presets.filter(p => p.name !== name), preset]);
    setPresetName("");
    setActivePreset(name);
    showToast(`Preset <strong>${escHtml(name)}</strong> ${isUpdate ? 'diupdate' : 'tersimpan'}`);
  };

  const loadPreset = (p) => {
    setBaseLot(p.baseLot);
    setTargetTicks(p.targetTicks);
    setTargetProfit(p.targetProfit);
    setBids(p.bids && p.bids.length ? [...p.bids] : [100]);
    if (p.balance !== undefined) setBalance(p.balance);
    if (p.mode) setMode(p.mode);
    if (p.existingAvg !== undefined) setExistingAvg(p.existingAvg);
    if (p.existingLot !== undefined) setExistingLot(p.existingLot);
    setActivePreset(p.name);
    // Flash animation
    setFlashingPreset(p.name);
    setTimeout(() => setFlashingPreset(null), 500);
  };

  const deletePreset = (name) => {
    persistPresets(presets.filter(p => p.name !== name));
    if (activePreset === name) setActivePreset(null);
    showToast(`Preset <strong>${escHtml(name)}</strong> dihapus`);
  };

  const exportPresets = useCallback(() => {
    if (presets.length === 0) {
      showToast('Belum ada preset untuk di-export', 'error');
      return;
    }
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      presets: presets,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `pyscal-presets-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${presets.length} preset di-export`);
  }, [presets, showToast]);

  const importPresets = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const payload = JSON.parse(e.target.result);
        if (!payload.presets || !Array.isArray(payload.presets)) {
          showToast('Format file invalid', 'error');
          return;
        }
        const valid = payload.presets.filter(p => p.name && typeof p.name === 'string');
        if (valid.length === 0) {
          showToast('Tidak ada preset valid dalam file', 'error');
          return;
        }
        const hasConflict = valid.some(p => presets.some(existing => existing.name === p.name));
        if (hasConflict) {
          if (!confirm(`Import ${valid.length} preset. Nama yang sama akan di-overwrite. Lanjutkan?`)) return;
        }
        // Merge: incoming overrides existing by name
        const byName = new Map();
        presets.forEach(p => byName.set(p.name, p));
        valid.forEach(p => byName.set(p.name, p));
        const merged = Array.from(byName.values());
        persistPresets(merged);
        showToast(`${valid.length} preset di-import`);
      } catch (err) {
        showToast('File tidak bisa dibaca (bukan JSON valid)', 'error');
      }
    };
    reader.readAsText(file);
  }, [presets, showToast]);

  // Shortcuts state
  const [shortcuts, setShortcuts] = useState(loadShortcutsVersioned);
  const persistShortcuts = (next) => {
    setShortcuts(next);
    saveShortcuts(next);
  };
  const [recordingShortcut, setRecordingShortcut] = useState(null);

  // History
  const [history, setHistory] = useState(() => {
    return loadHistory();
  });
  const persistHistory = (next) => {
    setHistory(next);
    saveHistory(next);
  };

  // ==================== FULL BACKUP / RESTORE ====================
  // Export all data: state + presets + history + shortcuts + theme
  const exportAll = useCallback(() => {
    const state = { baseLot, targetTicks, targetProfit, feeBuy, feeSell, bids, balance, mode, existingAvg, existingLot, customLot, customLots };
    const payload = {
      app: 'pyscal',
      schema: 1,
      exported_at: new Date().toISOString(),
      state,
      presets,
      history,
      shortcuts,
      theme,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
    a.href = url;
    a.download = `pyscal-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup lengkap di-export');
  }, [baseLot, targetTicks, targetProfit, feeBuy, feeSell, bids, balance, mode, existingAvg, existingLot, customLot, customLots, presets, history, shortcuts, theme, showToast]);

  const importAll = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const payload = JSON.parse(e.target.result);
        if (payload.app !== 'pyscal' || !payload.state) {
          showToast('Bukan file backup PYSCAL', 'error');
          return;
        }
        if (!confirm('Restore akan MENGGANTI semua data saat ini (state, preset, history, shortcut). Lanjutkan?')) return;
        const s = payload.state || {};
        const merged = { ...DEFAULT_STATE, ...s };
        setBaseLot(merged.baseLot);
        setTargetTicks(merged.targetTicks);
        setTargetProfit(merged.targetProfit);
        setFeeBuy(merged.feeBuy);
        setFeeSell(merged.feeSell);
        setBids(Array.isArray(merged.bids) && merged.bids.length ? merged.bids : [100]);
        setBalance(merged.balance || 0);
        setMode(merged.mode || 'entry');
        setExistingAvg(merged.existingAvg || 0);
        setExistingLot(merged.existingLot || 0);
        setCustomLot(!!merged.customLot);
        setCustomLots(Array.isArray(merged.customLots) ? merged.customLots : []);
        if (Array.isArray(payload.presets)) persistPresets(payload.presets);
        if (Array.isArray(payload.history)) persistHistory(payload.history);
        if (payload.shortcuts && typeof payload.shortcuts === 'object') persistShortcuts({ ...DEFAULT_SHORTCUTS, ...payload.shortcuts });
        if (payload.theme === 'dark' || payload.theme === 'light') setTheme(payload.theme);
        showToast('Backup berhasil di-restore');
      } catch {
        showToast('File tidak bisa dibaca (bukan JSON valid)', 'error');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  // ==================== UNDO / REDO ====================
  // Snapshot captures the undo-able state shape
  const makeSnapshot = useCallback(() => ({
    baseLot, targetTicks, targetProfit, bids: [...bids], mode, existingAvg, existingLot,
    customLot, customLots: [...customLots],
  }), [baseLot, targetTicks, targetProfit, bids, mode, existingAvg, existingLot, customLot, customLots]);

  const applySnapshot = useCallback((snap) => {
    // Set lastSnapshotRef BEFORE state changes so the change-tracker effect
    // sees no diff and skips push (more robust than timing flag)
    lastSnapshotRef.current = snap;
    setBaseLot(snap.baseLot);
    setTargetTicks(snap.targetTicks);
    setTargetProfit(snap.targetProfit);
    setBids([...snap.bids]);
    setMode(snap.mode);
    setExistingAvg(snap.existingAvg);
    setExistingLot(snap.existingLot);
    if (snap.customLot !== undefined) setCustomLot(snap.customLot);
    if (snap.customLots !== undefined) setCustomLots([...snap.customLots]);
  }, []);

  // Push snapshot (with optional debounce for input edits)
  const pushSnapshot = useCallback((debounce = false) => {
    const snap = makeSnapshot();
    // Dedupe: don't push if identical to last
    const last = undoStackRef.current[undoStackRef.current.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return;

    if (debounce) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        undoStackRef.current.push(snap);
        if (undoStackRef.current.length > 50) undoStackRef.current.shift();
        redoStackRef.current = [];
      }, 800);
    } else {
      undoStackRef.current.push(snap);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
  }, [makeSnapshot]);

  // Initialize: push first snapshot on mount
  useEffect(() => {
    if (undoStackRef.current.length === 0) {
      undoStackRef.current.push(makeSnapshot());
      lastSnapshotRef.current = makeSnapshot();
    }
    // eslint-disable-next-line
  }, []);

  // Track changes: decide debounce based on what changed
  useEffect(() => {
    const current = makeSnapshot();
    const last = lastSnapshotRef.current;
    if (!last) { lastSnapshotRef.current = current; return; }

    // If applySnapshot just ran, lastSnapshotRef === current snapshot,
    // so dedupe in pushSnapshot will skip. No flag needed.
    if (JSON.stringify(last) === JSON.stringify(current)) return;

    // Detect what changed
    const structuralChange = last.mode !== current.mode ||
                              last.bids.length !== current.bids.length ||
                              last.customLot !== current.customLot;

    // Immediate push for structural changes; debounced for input edits
    if (structuralChange) {
      pushSnapshot(false);
    } else {
      pushSnapshot(true);
    }
    lastSnapshotRef.current = current;
  }, [baseLot, targetTicks, targetProfit, bids, mode, existingAvg, existingLot, customLot, customLots, makeSnapshot, pushSnapshot]);

  const undo = useCallback(() => {
    // Flush any pending debounced push first
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      const snap = makeSnapshot();
      const last = undoStackRef.current[undoStackRef.current.length - 1];
      if (!last || JSON.stringify(last) !== JSON.stringify(snap)) {
        undoStackRef.current.push(snap);
      }
    }
    if (undoStackRef.current.length <= 1) {
      showToast('Tidak ada yang bisa di-undo', 'error');
      return;
    }
    const popped = undoStackRef.current.pop();
    redoStackRef.current.push(popped);
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    applySnapshot(prev);
    lastSnapshotRef.current = prev;
  }, [applySnapshot, makeSnapshot, showToast]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      showToast('Tidak ada yang bisa di-redo', 'error');
      return;
    }
    const snap = redoStackRef.current.pop();
    undoStackRef.current.push(snap);
    applySnapshot(snap);
    lastSnapshotRef.current = snap;
  }, [applySnapshot, showToast]);

  // Compute
  const data = useMemo(() => {
    if (!bids.length || bids[0] <= 0 || baseLot < 1) return null;
    const existing = mode === 'position' && existingAvg > 0 && existingLot > 0
      ? { avg: existingAvg, lot: existingLot }
      : null;
    const customArr = customLot ? customLots : null;
    return computeRows(bids, baseLot, targetTicks, targetProfit, feeBuy / 100, feeSell / 100, existing, customArr);
  }, [bids, baseLot, targetTicks, targetProfit, feeBuy, feeSell, mode, existingAvg, existingLot, customLot, customLots]);

  // Handlers
  const setBidAt = useCallback((i, v) => {
    setBids(prev => { const next = [...prev]; next[i] = v; return next; });
  }, []);

  const setLotAt = useCallback((i, v) => {
    setCustomLots(prev => {
      const next = [...prev];
      next[i] = Math.max(1, v || 0);
      return next;
    });
  }, []);

  const addPapan = useCallback(() => {
    setBids(prev => {
      const lastBid = prev[prev.length - 1];
      const tick = getTickSize(prev[0] || 100);
      const newBid = Math.max(1, lastBid - tick);
      return [...prev, newBid];
    });
    setCustomLots(prev => {
      // In custom mode, seed new papan with last lot value (or baseLot fallback)
      if (prev.length === 0) return prev;
      return [...prev, prev[prev.length - 1]];
    });
  }, []);

  const removePapan = useCallback((i) => {
    if (i === 0) return;
    let removedBid, removedLot;
    setBids(prev => {
      removedBid = prev[i];
      return prev.filter((_, idx) => idx !== i);
    });
    setCustomLots(prev => {
      removedLot = prev[i];
      return prev.filter((_, idx) => idx !== i);
    });
    // Toast with undo action
    showToast(`Papan ${i + 1} dihapus`, 'success', {
      timeout: 4000,
      action: {
        label: 'Undo',
        handler: () => {
          setBids(prev => {
            const next = [...prev];
            next.splice(i, 0, removedBid);
            return next;
          });
          setCustomLots(prev => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next.splice(i, 0, removedLot !== undefined ? removedLot : prev[prev.length - 1] || 100);
            return next;
          });
        },
      },
    });
  }, [showToast]);

  const resetPapan = useCallback(() => {
    setBids(prev => [prev[0]]);
    setCustomLots(prev => prev.length > 0 ? [prev[0]] : []);
  }, []);

  // Toggle custom lot mode (no confirm - instant lock/unlock)
  const toggleCustomLot = useCallback(() => {
    if (customLot) {
      // Turn OFF: clear customLots, recompute auto
      setCustomLot(false);
      setCustomLots([]);
      showToast('Custom Lot dimatikan');
    } else {
      // Turn ON: seed customLots from current computed lots
      if (data && data.results.length) {
        const currentLots = data.results
          .filter(r => !r.isExisting)
          .map(r => r.lot);
        setCustomLots(currentLots);
      }
      setCustomLot(true);
      showToast('Custom Lot aktif');
    }
  }, [customLot, data, showToast]);

  // Safety: sync customLots length to bids.length
  useEffect(() => {
    if (!customLot) return;
    setCustomLots(prev => {
      if (prev.length === bids.length) return prev;
      if (prev.length > bids.length) {
        // Trim
        return prev.slice(0, bids.length);
      }
      // Pad with last value or 100
      const pad = prev.length > 0 ? prev[prev.length - 1] : 100;
      const next = [...prev];
      while (next.length < bids.length) next.push(pad);
      return next;
    });
  }, [bids.length, customLot]);

  // Validation
  const bidRiseWarnings = useMemo(() => {
    const warns = [];
    for (let i = 1; i < bids.length; i++) {
      if (bids[i] >= bids[i - 1]) warns.push(i + 1);
    }
    return warns;
  }, [bids]);

  // Filter results to only buy rows for under-target check
  const buyRows = data ? data.results.filter(r => !r.isExisting) : [];
  const underTarget = buyRows.filter(r => r.pct < targetProfit - 0.001);

  const totalLot = data ? data.results.reduce((s, r) => s + r.lot, 0) : 0;
  const totalBuyLot = buyRows.reduce((s, r) => s + r.lot, 0);
  const totalBuyCost = buyRows.reduce((s, r) => s + r.cost, 0);

  // Live region summary — announces final avg/sell/PL when results change,
  // debounced so rapid input changes don't spam assistive tech.
  const [liveSummary, setLiveSummary] = useState('');
  useEffect(() => {
    if (!data || !data.results.length) { setLiveSummary(''); return; }
    const last = data.results[data.results.length - 1];
    const t = setTimeout(() => {
      setLiveSummary(
        `${data.results.length} papan, total ${n(totalBuyLot)} lot. ` +
        `Avg final ${last.avg.toFixed(2)}, sell target ${last.sell}, ` +
        `estimasi P/L ${nDec(last.pl)} (${last.pct.toFixed(2)}%).`
      );
    }, 500);
    return () => clearTimeout(t);
  }, [data, totalBuyLot]);

  // Copy
  const [copyState, setCopyState] = useState('idle');
  const copyResults = useCallback(() => {
    if (!data || !data.results.length) return;
    const lines = [];
    lines.push(`📊 PYSCAL · ${mode === 'position' ? 'Position Mode' : 'Entry Mode'} · ${bids.length} papan`);
    if (mode === 'position' && existingAvg > 0) {
      lines.push(`Existing: ${existingLot} lot @ avg ${existingAvg}`);
    }
    lines.push(`Bid Awal: ${bids[0]} · Lot: ${baseLot} · Target: +${targetTicks} tick · Min profit: ${targetProfit}%`);
    lines.push('');
    data.results.forEach(r => {
      const label = r.isExisting ? 'EXISTING' : `${r.layer}.`;
      lines.push(`${label} Bid ${r.bid} × ${n(r.lot)} lot → Avg ${r.avg.toFixed(2)}, Sell ${r.sell}, P/L ${nDec(r.pl)} (${r.pct.toFixed(2)}%)`);
    });
    lines.push('');
    lines.push(`Total beli: ${n(totalBuyLot)} lot · Cost ${nShort(totalBuyCost)}`);
    if (balance > 0) lines.push(`Balance util: ${Math.round(totalBuyCost / balance * 100)}%`);
    const text = lines.join('\n');

    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else fallback();
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 1500);
  }, [data, bids, baseLot, targetTicks, targetProfit, totalBuyLot, totalBuyCost, balance, mode, existingAvg, existingLot]);

  // Save trade - 1 click, no modal
  const saveTrade = useCallback(() => {
    if (!data || !data.results.length) return;
    // Blokir simpan kalau masih ada field invalid; scroll + fokus ke error pertama
    // agar user keyboard/SR tahu letak persisnya.
    if (focusFirstInvalidInput()) {
      showToast('Ada input yang belum valid. Fokus dipindah ke input bermasalah.', 'error');
      return;
    }
    const trade = {
      id: 'tr_' + Date.now(),
      timestamp: Date.now(),
      mode,
      baseLot, targetTicks, targetProfit, feeBuy, feeSell, balance,
      bids: [...bids], existingAvg, existingLot,
      customLot, customLots: [...customLots],
      planned: {
        totalLot: totalBuyLot,
        totalCost: totalBuyCost,
        avgFinal: data.results.length ? data.results[data.results.length - 1].avg : 0,
        sellFinal: data.results.length ? data.results[data.results.length - 1].sell : 0,
        plFinal: data.results.length ? data.results[data.results.length - 1].pl : 0,
      },
    };
    const next = [trade, ...history].slice(0, 500);
    persistHistory(next);
    showToast(`Avg <strong>${escHtml(trade.planned.avgFinal.toFixed(2))}</strong> tersimpan di History`);
  }, [data, bids, baseLot, targetTicks, targetProfit, feeBuy, feeSell, balance, mode, existingAvg, existingLot, customLot, customLots, totalBuyLot, totalBuyCost, history, showToast]);

  // Recall a saved trade back into the calculator state (undo-able).
  const recallTrade = useCallback((t) => {
    if (!t) return;
    if (!confirm('Muat papan ini ke kalkulator? State saat ini akan ter-replace (bisa di-undo).')) return;
    const snap = {
      baseLot: t.baseLot ?? baseLot,
      targetTicks: t.targetTicks ?? targetTicks,
      targetProfit: t.targetProfit ?? targetProfit,
      bids: Array.isArray(t.bids) && t.bids.length ? [...t.bids] : [...bids],
      mode: t.mode || 'entry',
      existingAvg: t.existingAvg ?? 0,
      existingLot: t.existingLot ?? 0,
      customLot: !!t.customLot,
      customLots: Array.isArray(t.customLots) ? [...t.customLots] : [],
    };
    applySnapshot(snap);
    setShowHistory(false);
    setViewingTradeId(null);
    showToast(`Recalled: <strong>${escHtml(t.note ? t.note : 'Avg ' + t.planned.avgFinal.toFixed(2))}</strong>`);
  }, [bids, baseLot, targetTicks, targetProfit, applySnapshot, showToast]);

  const deleteTrade = (id) => {
    const t = history.find(x => x.id === id);
    persistHistory(history.filter(t => t.id !== id));
    if (viewingTradeId === id) setViewingTradeId(null);
    if (t) showToast(`Trade ${fmtTime(t.timestamp)} dihapus`);
  };

  const renameTrade = (id, note) => {
    const trimmed = (note || '').slice(0, 80);
    persistHistory(history.map(t => t.id === id ? { ...t, note: trimmed } : t));
  };

  const togglePinTrade = (id) => {
    persistHistory(history.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  };

  /* ==================== KEYBOARD HANDLER ==================== */
  useEffect(() => {
    const onKeyDown = (e) => {
      // Esc handling
      if (e.key === 'Escape') {
        if (showInfo) { setShowInfo(false); return; }
        if (viewingTradeId) { setViewingTradeId(null); return; }
        if (showHistory) { setShowHistory(false); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (recordingShortcut) { setRecordingShortcut(null); return; }
        return;
      }

      // Recording shortcut
      if (recordingShortcut) {
        e.preventDefault();
        // Skip standalone modifier keys
        if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return;
        const newShortcut = {
          key: e.key.toLowerCase(),
          mod: e.ctrlKey || e.metaKey,
          shift: e.shiftKey,
          alt: e.altKey,
          label: shortcuts[recordingShortcut].label,
        };
        persistShortcuts({ ...shortcuts, [recordingShortcut]: newShortcut });
        setRecordingShortcut(null);
        return;
      }

      // Match shortcuts - redo checked BEFORE undo (shift variant must come first)
      if (eventMatchesShortcut(e, shortcuts.redo)) {
        e.preventDefault(); redo(); return;
      }
      if (eventMatchesShortcut(e, shortcuts.undo)) {
        e.preventDefault(); undo(); return;
      }
      if (eventMatchesShortcut(e, shortcuts.toggleSettings)) {
        e.preventDefault(); setShowSettings(v => !v); return;
      }
      if (eventMatchesShortcut(e, shortcuts.addPapan)) {
        e.preventDefault(); addPapan(); return;
      }
      if (eventMatchesShortcut(e, shortcuts.copyResults)) {
        e.preventDefault(); copyResults(); return;
      }
      if (eventMatchesShortcut(e, shortcuts.resetPapan)) {
        e.preventDefault(); if (bids.length > 1) resetPapan(); return;
      }
      if (eventMatchesShortcut(e, shortcuts.saveTrade)) {
        e.preventDefault(); saveTrade(); return;
      }
      if (eventMatchesShortcut(e, shortcuts.showHistory)) {
        e.preventDefault(); setShowHistory(true); return;
      }
      if (eventMatchesShortcut(e, shortcuts.focusBidAwal)) {
        e.preventDefault();
        if (bidAwalRef.current) { bidAwalRef.current.focus(); bidAwalRef.current.select(); }
        return;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, recordingShortcut, addPapan, copyResults, resetPapan, saveTrade, bids.length, viewingTradeId, showHistory, showSettings, undo, redo]);

  /* ==================== RENDER ==================== */
  return (
    <>
      <style>{CSS}</style>
      <div className="pyscal" data-theme={theme}>
        <OfflineBanner />
        <OnboardingTour />
        <div className="pyscal-inner">
          <div className="ctn">

            {/* Header */}
            <div className="hdr">
              <div className="brand">
                <h1>PYSCAL</h1>
                <span>Pyramid Bid Calculator</span>
              </div>
              <div className="hdr-r" ref={settingsRef}>
                <button className="gear-btn" onClick={() => setShowInfo(true)} aria-label="Cara pakai">
                  <InfoIcon />
                </button>
                <button className="gear-btn" onClick={() => setShowHistory(true)} aria-label="Buka History">
                  <HistoryIcon />
                </button>
                <button className={`gear-btn ${showSettings ? 'active' : ''}`}
                  onClick={() => setShowSettings(v => !v)}
                  aria-label="Buka Settings"

                  aria-expanded={showSettings}
                >
                  <GearIcon />
                </button>
                {showSettings && (
                  <SettingsPanel {...{
                    theme, setTheme, balance, setBalance,
                    feeBuy, setFeeBuy, feeSell, setFeeSell,
                    presets, presetName, setPresetName, savePreset, deletePreset, loadPreset,
                    exportPresets, importPresets,
                    exportAll, importAll,
                    shortcuts, setShortcuts: persistShortcuts,
                    recordingShortcut, setRecordingShortcut,
                  }} />

                )}
              </div>
            </div>

            {/* Mode toggle */}
            <div className="mode-toggle">
              <button
                className={mode === 'entry' ? 'active' : ''}
                onClick={() => setMode('entry')}
                aria-pressed={mode === 'entry'}
                aria-label="Mode entry (New)"
              >
                New
              </button>
              <button
                className={mode === 'position' ? 'active' : ''}
                onClick={() => setMode('position')}
                aria-pressed={mode === 'position'}
                aria-label="Mode existing position"
              >
                Existing
              </button>
            </div>

            {/* First-run hint */}
            {showHint && (
              <div className="onboarding" role="region" aria-label="Petunjuk singkat">
                <button
                  className="onboarding-close"
                  onClick={dismissHint}
                  aria-label="Tutup petunjuk"

                ><XIcon /></button>
                <div className="onboarding-title">Selamat datang di PYSCAL</div>
                <div className="onboarding-sub">
                  Kalkulator pyramid bid untuk avg-down terukur. 4 hal yang perlu kamu tahu:
                </div>
                <ol className="onboarding-steps">
                  <li>
                    <span className="ob-num">1</span>
                    <div>
                      <strong>Isi Bid Awal &amp; Lot</strong> di kartu di bawah, lalu atur target
                      tick &amp; min profit. Hasil hitung otomatis muncul.
                    </div>
                  </li>
                  <li>
                    <span className="ob-num">2</span>
                    <div>
                      <strong>Tambah papan</strong> untuk simulasi avg-down per layer.
                      <span className="ob-kbd">{shortcutToString(shortcuts.addPapan)}</span>
                    </div>
                  </li>
                  <li>
                    <span className="ob-num">3</span>
                    <div>
                      <strong>Simpan ke History</strong> kalau plan sudah pas — bisa di-rename &amp; di-pin nanti.
                      <span className="ob-kbd">{shortcutToString(shortcuts.saveTrade)}</span>
                    </div>
                  </li>
                  <li>
                    <span className="ob-num">4</span>
                    <div>
                      <strong>Settings</strong> untuk fee broker, balance, preset, theme &amp; backup JSON.
                      <span className="ob-kbd">{shortcutToString(shortcuts.toggleSettings)}</span>
                    </div>
                  </li>
                </ol>
                <div className="onboarding-actions">
                  <button className="btn-primary-pyscal" onClick={dismissHint}>
                    Mengerti, mulai pakai
                  </button>
                </div>
              </div>
            )}

            {/* Preset chips */}
            {presets.length > 0 && (
              <div className="preset-bar">
                {presets.map(p => (
                  <button key={p.name}
                    className={`preset-chip ${activePreset === p.name ? 'active' : ''} ${flashingPreset === p.name ? 'flash' : ''}`}
                    onClick={() => loadPreset(p)}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Input card */}
            <div className="card">
              {mode === 'position' && (
                <div className="ig-2">
                  <div>
                    <div className="il il-wrap">Avg Existing (inc fee)
                      <span className="fld-help" tabIndex={0} role="img"
                        aria-label="Harga rata-rata posisi existing, sudah termasuk fee. Dipakai untuk hitung blended average."
                        title="Harga rata-rata posisi existing (inc fee). Dipakai untuk blended average dengan pembelian baru.">?</span>
                    </div>
                    <input className="if" type="number" value={existingAvg || ''} min={0} step={0.01}
                      inputMode="decimal" enterKeyHint="next"
                      aria-label="Avg Existing (termasuk fee)"
                      aria-invalid={!!validateExistingAvg(existingAvg, mode).error}
                      aria-describedby="pyscal-hint-existing-avg"
                      onChange={e => setExistingAvg(+e.target.value || 0)}
                      data-kbdnav="setup" onKeyDown={handleSetupEnter} />
                    <FieldHint id="pyscal-hint-existing-avg" status={validateExistingAvg(existingAvg, mode)} />
                  </div>
                  <div>
                    <div className="il il-wrap">Lot Existing
                      <span className="fld-help" tabIndex={0} role="img"
                        aria-label="Jumlah lot posisi existing yang sudah kamu punya."
                        title="Jumlah lot posisi existing yang sudah kamu punya (1 lot = 100 lembar).">?</span>
                    </div>
                    <input className="if" type="number" value={existingLot || ''} min={0}
                      inputMode="numeric" enterKeyHint="next"
                      aria-label="Lot Existing"
                      aria-invalid={!!validateExistingLot(existingLot, mode).error}
                      aria-describedby="pyscal-hint-existing-lot"
                      onChange={e => setExistingLot(+e.target.value || 0)}
                      data-kbdnav="setup" onKeyDown={handleSetupEnter} />
                    <FieldHint id="pyscal-hint-existing-lot" status={validateExistingLot(existingLot, mode)} />
                  </div>
                </div>
              )}
              <div className="ig">
                <div>
                  <div className="il il-wrap">{mode === 'position' ? 'Bid Awal (beli baru)' : 'Bid Awal'}
                    <span className="fld-help" tabIndex={0} role="img"
                      aria-label="Harga limit order pertama. Sistem akan turunkan otomatis untuk averaging-down berikutnya."
                      title="Harga limit order pertama. Bid berikutnya akan diturunkan untuk averaging-down.">?</span>
                  </div>
                  <input ref={bidAwalRef} className="if" type="number" value={bids[0] || ''} min={1}
                    inputMode="decimal" enterKeyHint="next"
                    aria-label={mode === 'position' ? 'Bid Awal beli baru' : 'Bid Awal'}
                    aria-invalid={!!validateBid(bids[0]).error}
                    aria-describedby="pyscal-hint-bid-awal"
                    onChange={e => setBidAt(0, +e.target.value)}
                    data-kbdnav="setup" onKeyDown={handleSetupEnter} />
                  <FieldHint id="pyscal-hint-bid-awal" status={validateBid(bids[0])} />
                </div>
                <div>
                  <div className="il il-wrap">Lot
                    <span className="fld-help" tabIndex={0} role="img"
                      aria-label="Jumlah lot dasar per papan. Lot berikutnya di-scale menurut aturan pyramid."
                      title="Jumlah lot dasar per papan (1 lot = 100 lembar).">?</span>
                  </div>
                  <input className="if" type="number" value={baseLot} min={1}
                    inputMode="numeric" enterKeyHint="next"
                    aria-label="Lot dasar"
                    aria-invalid={!!validateLot(baseLot).error}
                    aria-describedby="pyscal-hint-base-lot"
                    onChange={e => setBaseLot(+e.target.value)}
                    data-kbdnav="setup" onKeyDown={handleSetupEnter} />
                  <FieldHint id="pyscal-hint-base-lot" status={validateLot(baseLot)} />
                </div>
                <div>
                  <div className="il il-wrap">Target Tick
                    <span className="fld-help" tabIndex={0} role="img"
                      aria-label="Jumlah tick di atas average price sebagai target jual."
                      title="Berapa tick di atas average price sebagai target jual. > 10 sudah tergolong agresif.">?</span>
                  </div>
                  <input className="if" type="number" value={targetTicks} min={1} max={20}
                    inputMode="numeric" enterKeyHint="next"
                    aria-label="Target tick"
                    aria-invalid={!!validateTargetTicks(targetTicks).error}
                    aria-describedby="pyscal-hint-target-ticks"
                    onChange={e => setTargetTicks(+e.target.value)}
                    data-kbdnav="setup" onKeyDown={handleSetupEnter} />
                  <FieldHint id="pyscal-hint-target-ticks" status={validateTargetTicks(targetTicks)} />
                </div>
                <div>
                  <div className="il il-wrap">Min Profit %
                    <span className="fld-help" tabIndex={0} role="img"
                      aria-label="Persentase profit minimum yang harus tercapai setelah dikurangi fee buy dan sell."
                      title="Target profit minimum setelah dikurangi fee buy + sell.">?</span>
                  </div>
                  <input className="if" type="number" value={targetProfit} min={0} step={0.1}
                    inputMode="decimal" enterKeyHint="done"
                    aria-label="Minimum profit persen"
                    aria-invalid={!!validateTargetProfit(targetProfit).error}
                    aria-describedby="pyscal-hint-target-profit"
                    onChange={e => setTargetProfit(+e.target.value)}
                    data-kbdnav="setup" onKeyDown={handleSetupEnter} />
                  <FieldHint id="pyscal-hint-target-profit" status={validateTargetProfit(targetProfit)} />
                </div>
              </div>
            </div>

            {/* Banners */}
            {mode === 'position' && (existingAvg <= 0 || existingLot <= 0) && (
              <div className="caution">
                <span className="caution-icon">⚠</span>
                <div className="caution-text">
                  Isi <span className="caution-val">avg existing</span> dan <span className="caution-val">lot existing</span> dulu untuk hitung pyramid avg-down.
                </div>
              </div>
            )}
            {balance > 0 && totalBuyCost > balance && (
              <div className="caution caution-red">
                <span className="caution-icon">⚠</span>
                <div className="caution-text">
                  Total cost beli baru <span className="caution-val">Rp{nShort(totalBuyCost)}</span> melebihi balance <span className="caution-val">Rp{nShort(balance)}</span>.
                </div>
              </div>
            )}
            {underTarget.length > 0 && (
              <div className="caution">
                <span className="caution-icon">⚠</span>
                <div className="caution-text">
                  Target <span className="caution-val">{targetProfit}%</span> tidak tercapai di <span className="caution-val">{underTarget.length} papan</span>.
                  Turunkan min profit atau naikkan target tick.
                </div>
              </div>
            )}
            {bidRiseWarnings.length > 0 && (
              <div className="caution">
                <span className="caution-icon">⚠</span>
                <div className="caution-text">
                  Papan <span className="caution-val">{bidRiseWarnings.join(', ')}</span> bid-nya naik (bukan avg down).
                </div>
              </div>
            )}

            {/* Results */}
            {data && data.results.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div className="papan-bar">
                  <div className="papan-label-wrap">
                    <span className="papan-label">Papan · {bids.length}</span>
                    {customLot && <span className="custom-lot-badge">CUSTOM LOT</span>}
                  </div>
                  <div className="papan-actions">
                    <button className={`ibtn ${customLot ? 'ibtn-active-amber' : ''}`}
                      onClick={toggleCustomLot}
                      aria-label={customLot ? 'Matikan Custom Lot' : 'Aktifkan Custom Lot'}
                      aria-pressed={customLot}
>
                      {customLot ? <UnlockIcon /> : <LockIcon />}
                    </button>
                    <button className="ibtn" onClick={saveTrade} aria-label="Simpan ke History">
                      <BookmarkIcon />
                    </button>
                    <button className={`ibtn ${copyState === 'copied' ? 'success' : ''}`}
                      onClick={copyResults} aria-label="Copy hasil">
                      {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
                    </button>
                    {bids.length > 1 && (
                      <button className="ibtn danger" onClick={resetPapan} aria-label="Reset semua papan">
                        <RefreshIcon />
                      </button>
                    )}
                    <button className="ibtn primary" onClick={addPapan} aria-label="Tambah papan">
                      <PlusIcon />
                    </button>
                  </div>
                </div>

                <ResultsTable
                  results={data.results}
                  bidRiseWarnings={bidRiseWarnings}
                  targetProfit={targetProfit}
                  totalLot={totalBuyLot}
                  totalCost={totalBuyCost}
                  balance={balance}
                  setBidAt={setBidAt}
                  setLotAt={setLotAt}
                  customLot={customLot}
                  removePapan={removePapan}
                  bidsCount={bids.length}
                />
                <div
                  className="pyscal-sr-only"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {liveSummary}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* History Modal */}
        {showHistory && (
          <HistoryModal
            history={history} viewingId={viewingTradeId} setViewingId={setViewingTradeId}
            onClose={() => { setShowHistory(false); setViewingTradeId(null); }}
            onDelete={deleteTrade}
            onRename={renameTrade}
            onTogglePin={togglePinTrade}
            onRecall={recallTrade}
          />
        )}

        {/* Info Modal */}
        {showInfo && <InfoModal onClose={() => setShowInfo(false)} shortcuts={shortcuts} />}

        {/* Toast */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </>
  );
}

/* ==================== SETTINGS PANEL ==================== */
function SettingsPanel({
  theme, setTheme, balance, setBalance, feeBuy, setFeeBuy, feeSell, setFeeSell,
  presets, presetName, setPresetName, savePreset, deletePreset, loadPreset,
  exportPresets, importPresets,
  exportAll, importAll,
  shortcuts, setShortcuts, recordingShortcut, setRecordingShortcut,
}) {
  const fileInputRef = useRef(null);
  const fullBackupInputRef = useRef(null);
  return (

    <div className="settings-panel">
      <div className="sp-section">
        <div className="sp-title">Tampilan</div>
        <div className="theme-pill">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
            <SunIcon /> Light
          </button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
            <MoonIcon /> Dark
          </button>
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Trading Balance</div>
        <input className="sp-input" type="number" value={balance || ''} min={0}
          placeholder="Kosongkan jika tidak dibutuhkan"
          inputMode="numeric" enterKeyHint="done"
          onChange={e => setBalance(+e.target.value || 0)} />
      </div>

      <div className="sp-section">
        <div className="sp-title">Fee Broker</div>
        <div className="sp-row">
          <div>
            <div className="sp-label">Buy Fee %</div>
            <input className="sp-input" type="number" value={feeBuy} step={0.01}
              inputMode="decimal" enterKeyHint="next"
              onChange={e => setFeeBuy(+e.target.value)} />
          </div>
          <div>
            <div className="sp-label">Sell Fee %</div>
            <input className="sp-input" type="number" value={feeSell} step={0.01}
              inputMode="decimal" enterKeyHint="done"
              onChange={e => setFeeSell(+e.target.value)} />
          </div>
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Preset</div>

        {presets.length > 0 ? (
          <div className="sp-presets">
            {presets.map(p => (
              <div key={p.name} className="sp-preset-item">
                <button className="sp-preset-load" onClick={() => loadPreset(p)} title={`Muat preset ${p.name}`}>{p.name}</button>
                <button className="sp-preset-x" onClick={() => deletePreset(p.name)} aria-label={`Hapus preset ${p.name}`} title="Hapus preset" type="button"><XIcon /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="sp-empty">Belum ada preset</div>
        )}
        <div className="sp-preset-save">
          <input placeholder="Scalping" value={presetName} maxLength={8}
            onChange={e => setPresetName(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') savePreset(); }} />
          <button onClick={savePreset} disabled={!presetName.trim()}>Simpan</button>
        </div>
        <div className="sp-import-export">
          <button className="sp-ie-btn" onClick={exportPresets}>↓ Export</button>
          <button className="sp-ie-btn" onClick={() => fileInputRef.current?.click()}>↑ Import</button>
          <input ref={fileInputRef} type="file" accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importPresets(file);
              e.target.value = '';
            }} />
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Backup Lengkap</div>
        <div className="sp-empty" style={{ marginBottom: 6 }}>
          State, preset, history, shortcut, tema dalam 1 file JSON. Untuk pindah device atau jaga-jaga.
        </div>
        <div className="sp-import-export">
          <button className="sp-ie-btn" onClick={exportAll}>↓ Export Semua</button>
          <button className="sp-ie-btn" onClick={() => fullBackupInputRef.current?.click()}>↑ Restore</button>
          <input ref={fullBackupInputRef} type="file" accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importAll(file);
              e.target.value = '';
            }} />
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Install App</div>
        <InstallAppRow />
      </div>

      <div className="sp-section">
        <div className="sp-title"><KeyboardIcon /> Shortcut</div>
        <div className="kbd-list">
          {Object.entries(shortcuts).map(([key, s]) => (
            <div key={key} className="kbd-row">
              <label>{s.label}</label>
              <input
                className={`kbd-input ${recordingShortcut === key ? 'recording' : ''}`}
                value={recordingShortcut === key ? 'TEKAN...' : shortcutToString(s)}
                readOnly
                onFocus={() => setRecordingShortcut(key)}
                onBlur={() => setRecordingShortcut(null)}
              />
            </div>
          ))}
          <button className="kbd-reset" onClick={() => setShortcuts(DEFAULT_SHORTCUTS)}>
            Reset ke default
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== RESULTS TABLE ==================== */
function ResultsTable({ results, bidRiseWarnings, targetProfit, totalLot, totalCost, balance, setBidAt, setLotAt, customLot, removePapan, bidsCount }) {
  const layerIndex = (r, idx) => r.isExisting ? -1 : idx - (results[0]?.isExisting ? 1 : 0);

  return (
    <>
      {/* Desktop */}
      <div className="dt">
        <table>
          <thead>
            <tr>
              {["#","Bid","Lot","Avg","Sell","Cost","Profit","%",""].map((h,i) => <th key={i}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const li = layerIndex(r, i);
              const isWarn = !r.isExisting && bidRiseWarnings.includes(li + 1);
              const isUnder = !r.isExisting && r.pct < targetProfit - 0.001;
              const bidErr = !r.isExisting ? validateBid(Number(r.bid)).error : '';
              return (
                <tr key={i} className={r.isExisting ? "row-existing" : (isUnder ? "row-under" : "")} style={{ animationDelay: `${i * 50}ms` }}>
                  <td>{r.layer}</td>
                  <td className="c-bid">
                    {r.isExisting ? (
                      <span className="c-bid-static">{r.bid}</span>
                    ) : (
                      <BidStepInput
                        className={`bid-edit ${isWarn ? 'bid-edit-w' : ''} ${bidErr ? 'bid-edit-e' : ''}`}
                        value={r.bid}
                        onChange={v => setBidAt(li, v)}
                        label={`Bid papan ${r.layer}`}
                        error={bidErr || ''}
                        warning={isWarn ? `Bid papan ${r.layer} tidak lebih rendah dari papan sebelumnya, bukan averaging down.` : ''}
                        gridRow={li}
                        gridCol="bid"
                      />
                    )}
                  </td>
                  <td className="c-lot">
                    {customLot && !r.isExisting ? (
                      <LotInput
                        className="lot-edit"
                        value={r.lot}
                        onChange={v => setLotAt(li, v)}
                        label={`Lot papan ${r.layer}`}
                        gridRow={li}
                        gridCol="lot"
                        onKeyDown={e => handleGridNavKey(e, li, 'lot')}
                      />
                    ) : n(r.lot)}
                  </td>
                  <td className="c-avg">{r.avg.toFixed(2)}</td>
                  <td className="c-sell">{r.sell}</td>
                  <td className="c-cost">{n(r.cost)}</td>
                  <td className={r.pl >= 0 ? "c-plp" : "c-pln"}>{fmtPL(r.pl)}</td>
                  <td>
                    <span className={`pp ${isUnder ? "pp-u" : (r.pct >= 0 ? "pp-g" : "pp-r")}`}>
                      {isUnder && <span className="pp-icon">⚠</span>}
                      {fmtPct(r.pct)}
                    </span>
                  </td>
                  <td>
                    {!r.isExisting && li > 0 && (
                      <button
                        className="row-x"
                        onClick={() => removePapan(li)}
                        aria-label={`Hapus papan ${r.layer}`}
                        title={`Hapus papan ${r.layer}`}
                      ><XIcon /></button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td className="total-label">Total Beli</td><td></td>
              <td className="c-lot">{n(totalLot)}</td><td></td><td></td>
              <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {nShort(totalCost)}
                {balance > 0 && <span className="util"> ({Math.round(totalCost / balance * 100)}%)</span>}
              </td>
              <td></td><td></td><td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="mc">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px" }}>
          {results.map((r, i) => {
            const li = layerIndex(r, i);
            const isUnder = !r.isExisting && r.pct < targetProfit - 0.001;
            const isWarn = !r.isExisting && bidRiseWarnings.includes(li + 1);
            const bidErr = !r.isExisting ? validateBid(Number(r.bid)).error : '';
            const canSwipe = !r.isExisting && li > 0;
            return (
              <SwipeableCard
                key={i}
                canSwipe={canSwipe}
                onDelete={() => removePapan(li)}
                className={`mk ${r.isExisting ? 'mk-existing' : (isUnder ? 'mk-under' : '')}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {!r.isExisting && li > 0 && (
                  <button
                    className="m-remove"
                    onClick={() => removePapan(li)}
                    aria-label={`Hapus papan ${r.layer}`}
                    title={`Hapus papan ${r.layer}`}
                  ><XIcon /></button>
                )}
                <div className="mh">
                  <div className="mhi">
                    <label>Bid</label>
                    {r.isExisting ? (
                      <span>{r.bid}</span>
                    ) : (
                      <BidStepInput
                        className="mhi-inp"
                        variant="mobile"
                        value={r.bid}
                        onChange={v => setBidAt(li, v)}
                        label={`Bid papan ${r.layer}`}
                        error={bidErr || ''}
                        warning={isWarn ? `Bid papan ${r.layer} tidak lebih rendah dari papan sebelumnya, bukan averaging down.` : ''}
                        gridRow={li}
                        gridCol="bid"
                      />
                    )}
                  </div>
                  <div className="mhi">
                    <label>Lot</label>
                    {customLot && !r.isExisting ? (
                      <LotInput
                        className="mhi-inp lot-edit-m"
                        value={r.lot}
                        onChange={v => setLotAt(li, v)}
                        label={`Lot papan ${r.layer}`}
                        gridRow={li}
                        gridCol="lot"
                        onKeyDown={e => handleGridNavKey(e, li, 'lot')}
                      />
                    ) : <span>{n(r.lot)}</span>}
                  </div>
                  <div className="mhi"><label>Sell</label><span>{r.sell}</span></div>
                </div>
                <div className="mg">
                  <div className="mgi"><label>Avg</label><span>{r.avg.toFixed(2)}</span></div>
                  <div className="mgi"><label>Cost</label><span>{n(r.cost)}</span></div>
                  <div className="mgi mgi-profit">
                    <label>Profit</label>
                    <span style={{ color: r.pl >= 0 ? "var(--green)" : "var(--red)" }}>{fmtPL(r.pl)}</span>
                  </div>
                  <div className="mgi mgi-pct">
                    <label>%</label>
                    <span style={{ color: isUnder ? "var(--brand)" : (r.pct >= 0 ? "var(--green)" : "var(--red)") }}>
                      {isUnder && '⚠ '}{fmtPct(r.pct)}
                    </span>
                  </div>
                </div>
              </SwipeableCard>
            );
          })}
          <div className="mt">
            <div>
              <div className="mt-label">Total Cost Beli</div>
              <div className="mt-val">
                {nShort(totalCost)}
                {balance > 0 && <span className="util-m"> {Math.round(totalCost / balance * 100)}%</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mt-label">Total Lot Beli</div>
              <div className="mt-val">{n(totalLot)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ==================== HISTORY MODAL ==================== */
function HistoryModal({ history, viewingId, setViewingId, onClose, onDelete, onRename, onTogglePin, onRecall }) {
  const trade = viewingId ? history.find(t => t.id === viewingId) : null;
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? history.filter(t => {
          const note = (t.note || '').toLowerCase();
          const avg = String(t.planned?.avgFinal?.toFixed?.(2) ?? '');
          const date = new Date(t.timestamp).toLocaleDateString('id-ID');
          return note.includes(q) || avg.includes(q) || date.toLowerCase().includes(q);
        })
      : history.slice();
    return list.sort((a, b) => {
      const pa = a.pinned ? 1 : 0, pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.timestamp - a.timestamp;
    });
  }, [history, query]);

  const startRename = (t) => {
    setRenamingId(t.id);
    setRenameDraft(t.note || '');
  };
  const commitRename = () => {
    if (renamingId) onRename(renamingId, renameDraft);
    setRenamingId(null);
    setRenameDraft('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
        <div className="modal-header">
          <div className="modal-title" id="history-modal-title">
            {trade ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="modal-close" onClick={() => setViewingId(null)} style={{ padding: '4px' }} aria-label="Kembali ke daftar">←</button>
                {trade.note ? trade.note : `Avg ${trade.planned.avgFinal.toFixed(2)}`}
                <span style={{ fontSize: '12px', color: 'var(--text-m)', fontWeight: 500 }}>{fmtTime(trade.timestamp)}</span>
              </span>
            ) : `History · ${history.length} trade`}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup"><XIcon /></button>
        </div>
        <div className="modal-body">
          {trade ? (
            <TradeDetail trade={trade} onDelete={() => { onDelete(trade.id); }} onRecall={() => onRecall && onRecall(trade)} />
          ) : history.length === 0 ? (
            <div className="history-empty">
              <div style={{ fontStyle: 'normal', color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
                Belum ada trade tersimpan
              </div>
              <div style={{ fontSize: 12 }}>
                Hitung pyramid dulu, lalu klik <strong>tombol bookmark</strong> di header papan
                — atau tekan <kbd style={{ fontFamily: 'JetBrains Mono,monospace', background: 'var(--inp-bg)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 3 }}>Ctrl + Shift + S</kbd>
              </div>
            </div>
          ) : (
            <>
              <div className="history-search">
                <input
                  className="sp-input"
                  type="search"
                  inputMode="search"
                  placeholder="Cari nama / avg / tanggal…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Cari trade"
                />
              </div>
              {filtered.length === 0 ? (
                <div className="history-empty">Tidak ada trade cocok "{query}"</div>
              ) : (
                <div className="history-list">
                  {filtered.map(t => {
                    const isRenaming = renamingId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`history-item${t.pinned ? ' pinned' : ''}`}
                        onClick={() => { if (!isRenaming) setViewingId(t.id); }}
                      >
                        <div className="history-info">
                          <div className="history-avg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {t.pinned && <Pin size={12} strokeWidth={2.25} aria-label="Ter-pin" style={{ color: 'var(--brand)', fill: 'currentColor' }} />}
                            {isRenaming ? (
                              <input
                                autoFocus
                                className="sp-input"
                                style={{ fontSize: 14, padding: '6px 8px', flex: 1 }}
                                value={renameDraft}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                                  if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); setRenameDraft(''); }
                                }}
                                placeholder="Beri nama trade…"
                                maxLength={80}
                                aria-label="Nama trade"
                              />
                            ) : (
                              <span>{t.note ? t.note : `Avg ${t.planned.avgFinal.toFixed(2)}`}</span>
                            )}
                          </div>
                          <div className="history-meta">
                            {t.bids.length} papan · {n(t.planned.totalLot)} lot · {nShort(t.planned.totalCost)} · {t.mode === 'position' ? 'Existing' : 'New'}
                          </div>
                          <div className="history-time">{fmtTime(t.timestamp)}</div>
                        </div>
                        <div className="history-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="history-act"
                            onClick={() => onRecall && onRecall(t)}
                            aria-label="Recall trade"

                          >↻</button>
                          <button
                            className="history-act"
                            onClick={() => onTogglePin(t.id)}
                            aria-pressed={!!t.pinned}
                            aria-label={t.pinned ? 'Lepas pin' : 'Pin trade'}

                          ><Pin size={14} strokeWidth={2.25} style={t.pinned ? { fill: 'currentColor' } : undefined} /></button>
                          <button
                            className="history-act"
                            onClick={() => isRenaming ? commitRename() : startRename(t)}
                            aria-label={isRenaming ? 'Simpan nama' : 'Rename trade'}

                          >{isRenaming ? '✓' : '✎'}</button>
                          <button className="history-del" onClick={() => onDelete(t.id)} aria-label="Hapus trade">
                            <XIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== TRADE DETAIL ==================== */
function TradeDetail({ trade, onDelete, onRecall }) {
  return (
    <div className="history-detail">
      <div className="hd-section">
        <div className="hd-section-title">Plan Snapshot</div>
        <div className="hd-grid">
          <div className="hd-field"><label>Mode</label><span>{trade.mode === 'position' ? 'Existing' : 'New'}</span></div>
          <div className="hd-field"><label>Bid Awal</label><span>{trade.bids[0]}</span></div>
          <div className="hd-field"><label>Papan</label><span>{trade.bids.length}</span></div>
          <div className="hd-field"><label>Target Tick</label><span>+{trade.targetTicks}</span></div>
          <div className="hd-field"><label>Min Profit</label><span>{trade.targetProfit}%</span></div>
          <div className="hd-field"><label>Total Lot Beli</label><span>{n(trade.planned.totalLot)}</span></div>
          <div className="hd-field"><label>Total Cost</label><span>{nShort(trade.planned.totalCost)}</span></div>
          <div className="hd-field"><label>Avg Final</label><span>{trade.planned.avgFinal.toFixed(2)}</span></div>
          <div className="hd-field"><label>Sell Target</label><span>{trade.planned.sellFinal}</span></div>
          <div className="hd-field"><label>Est. Profit</label><span style={{ color: trade.planned.plFinal >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPL(trade.planned.plFinal)}</span></div>
        </div>
        {trade.mode === 'position' && trade.existingAvg > 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-m)' }}>
            Existing: {n(trade.existingLot)} lot @ {trade.existingAvg}
          </div>
        )}
        <div className="hd-mini-table" style={{ marginTop: '14px' }}>
          {trade.bids.map((b, i) => (
            <div key={i}><span>Papan {i + 1}</span><span style={{ color: 'var(--text)', fontWeight: 700 }}>Bid {b}</span></div>
          ))}
        </div>
      </div>

      <div className="hd-section" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button className="btn-primary-pyscal" onClick={() => onRecall && onRecall()}
          style={{ padding: '8px 14px' }}>
          ↻ Recall ke Kalkulator
        </button>
        <button className="btn-secondary" onClick={() => { if (confirm(`Hapus trade ini?`)) onDelete(); }}
          style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          Hapus Trade
        </button>
      </div>
    </div>
  );
}

/* ==================== INFO MODAL ==================== */
function InfoModal({ onClose, shortcuts }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="info-modal-title">
        <div className="modal-header">
          <div className="modal-title" id="info-modal-title">Tentang PYSCAL</div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup"><XIcon /></button>
        </div>
        <div className="modal-body info-body">
          <section className="info-sec">
            <h3 className="info-h">Apa itu PYSCAL?</h3>
            <p className="info-p">
              Kalkulator <strong>pyramid bid</strong> (averaging-down berlapis) untuk trader saham{' '}
              <strong>IDX / BEI</strong>. Rencanakan bid berjenjang, hitung <em>average price</em>,
              alokasi modal, dan lot per layer sesuai <em>tick size</em> dan fee broker Indonesia.
              Semua data disimpan lokal di browser — tanpa signup, tanpa server, aman dipakai offline.
            </p>
          </section>

          <section className="info-sec">
            <h3 className="info-h">Untuk siapa?</h3>
            <p className="info-p">
              Trader IDX yang pakai strategi <em>staggered buy</em>, <em>pyramid averaging</em>,
              atau siap-siap DCA di area support. PYSCAL memastikan tiap layer sesuai{' '}
              <strong>fraksi harga (tick size) BEI</strong> dan menghitung <em>break-even</em>{' '}
              setelah fee jual-beli otomatis.
            </p>
          </section>

          <section className="info-sec">
            <h3 className="info-h">Cara pakai</h3>
            <ol className="info-ol">
              <li>
                Masukkan <strong>bid awal</strong>, target profit / tick, dan fee beli–jual broker Anda.
              </li>
              <li>
                Tambah <strong>papan bid</strong> berikutnya — harga turun berlapis untuk averaging-down.
                <span className="ob-kbd info-kbd">{shortcutToString(shortcuts.addPapan)}</span>
              </li>
              <li>
                PYSCAL menghitung <strong>average price</strong>, total lot, modal terpakai, dan target jual otomatis.
              </li>
              <li>
                Simpan hasil ke <strong>History</strong>, atau simpan skema ke <strong>Preset</strong> per ticker lewat Settings.
                <span className="ob-kbd info-kbd">{shortcutToString(shortcuts.saveTrade)}</span>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
