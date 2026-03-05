// ==UserScript==
// @name         GeoFS PA Announcer
// @namespace    geofs-pa-announcer
// @version      1.0
// @description  Passenger Address system for GeoFS. Press Shift+J to toggle the PA panel.
// @author       GeoFS Addon
// @match        https://www.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @match        https://www.geo-fs.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Wait for page body to be ready before injecting
  function waitForGeoFS(cb) {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (document.body) { clearInterval(check); cb(); }
      if (attempts > 20)  { clearInterval(check); cb(); } // fallback after ~10s
    }, 500);
  }

  function init() {
    if (document.getElementById('pa-overlay')) return;

    // ── Fonts
    if (!document.getElementById('pa-fonts')) {
      const f = document.createElement('link');
      f.id = 'pa-fonts'; f.rel = 'stylesheet';
      f.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700&family=Rajdhani:wght@500;600&display=swap';
      document.head.appendChild(f);
    }

    // ── CSS
    const style = document.createElement('style');
    style.id = 'pa-style';
    style.textContent = `
      #pa-overlay *, #pa-overlay *::before, #pa-overlay *::after { box-sizing: border-box; margin: 0; padding: 0; }
      #pa-overlay {
        --amber:#ffb300; --amber-dim:#c47d00; --amber-faint:rgba(255,179,0,0.07);
        --panel-bg:#0b0e12; --panel-border:#1f2630; --panel-mid:#111620;
        --text-main:#e8d8a0; --text-dim:#7a6a40; --text-muted:#3d3520;
        --green:#39ff86; --red:#ff3a3a;
        position: fixed; top: 0; right: 0;
        z-index: 999999;
        display: flex; align-items: flex-start; justify-content: flex-end;
        padding: 10px;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s ease;
        font-family: 'Rajdhani', sans-serif;
      }
      #pa-overlay.pa-open { opacity: 1; pointer-events: all; }
      #pa-overlay .pa-panel {
        width: 300px;
        background: var(--panel-bg);
        border: 1px solid var(--panel-border); border-radius: 5px;
        box-shadow: 0 0 0 1px #0a0d11, 0 10px 40px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.04);
        transform: translateY(-8px) scale(0.96);
        transition: transform 0.22s cubic-bezier(0.34,1.4,0.64,1), opacity 0.2s ease;
        opacity: 0; overflow: hidden; position: relative;
      }
      #pa-overlay.pa-open .pa-panel { transform: translateY(0) scale(1); opacity: 1; }
      #pa-overlay .screws { position:absolute; width:100%; height:100%; pointer-events:none; top:0; left:0; }
      #pa-overlay .screw {
        position:absolute; width:7px; height:7px;
        background:radial-gradient(circle at 35% 35%,#2a3545,#111820);
        border-radius:50%; border:1px solid #0d1018;
      }
      #pa-overlay .screw::after {
        content:''; position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%) rotate(45deg);
        width:4px; height:1px; background:#0a0d10;
      }
      #pa-overlay .screw.tl{top:8px;left:8px} #pa-overlay .screw.tr{top:8px;right:8px}
      #pa-overlay .screw.bl{bottom:8px;left:8px} #pa-overlay .screw.br{bottom:8px;right:8px}
      #pa-overlay .pa-header {
        background:linear-gradient(180deg,#0f1318,#0b0e12);
        border-bottom:1px solid var(--panel-border);
        padding:9px 22px 8px;
        display:flex; align-items:center; gap:9px; position:relative;
      }
      #pa-overlay .pa-header::after {
        content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
        background:linear-gradient(90deg,transparent,var(--amber-dim),transparent); opacity:0.4;
      }
      #pa-overlay .header-icon {
        width:26px; height:26px;
        background:radial-gradient(circle,rgba(255,179,0,0.15),transparent);
        border:1px solid var(--amber-dim); border-radius:3px;
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      #pa-overlay .header-icon svg{width:14px;height:14px}
      #pa-overlay .header-text{flex:1}
      #pa-overlay .header-title {
        font-family:'Orbitron',monospace; font-size:10px; font-weight:700;
        color:var(--amber); letter-spacing:0.12em; text-transform:uppercase; line-height:1;
      }
      #pa-overlay .header-sub {
        font-family:'Share Tech Mono',monospace; font-size:8px;
        color:var(--text-dim); letter-spacing:0.06em; margin-top:3px;
      }
      #pa-overlay .header-badge {
        display:flex; align-items:center; gap:4px;
        background:var(--amber-faint); border:1px solid rgba(255,179,0,0.2);
        border-radius:3px; padding:3px 7px;
        font-family:'Share Tech Mono',monospace; font-size:8px;
        color:var(--amber-dim); letter-spacing:0.08em; white-space:nowrap;
      }
      #pa-overlay .badge-dot {
        width:5px; height:5px; border-radius:50%;
        background:var(--amber); box-shadow:0 0 5px var(--amber);
        animation:pa-pulse 2s ease-in-out infinite;
      }
      @keyframes pa-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      #pa-overlay .close-btn {
        width:20px; height:20px;
        background:rgba(255,58,58,0.08); border:1px solid rgba(255,58,58,0.25);
        border-radius:3px; color:rgba(255,58,58,0.55); font-size:11px; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition:all 0.15s; font-family:'Share Tech Mono',monospace; line-height:1;
      }
      #pa-overlay .close-btn:hover{background:rgba(255,58,58,0.18);color:var(--red);border-color:rgba(255,58,58,0.5)}
      #pa-overlay .pa-body{padding:12px 14px 10px}
      #pa-overlay .status-row{display:flex;gap:5px;margin-bottom:10px}
      #pa-overlay .status-chip {
        flex:1; background:var(--panel-mid); border:1px solid var(--panel-border);
        border-radius:3px; padding:5px 7px;
      }
      #pa-overlay .chip-label {
        font-family:'Share Tech Mono',monospace; font-size:8px;
        color:var(--text-muted); letter-spacing:0.08em; text-transform:uppercase;
      }
      #pa-overlay .chip-value {
        font-family:'Share Tech Mono',monospace; font-size:9px;
        color:var(--text-dim); letter-spacing:0.04em; margin-top:2px;
      }
      #pa-overlay .chip-value.live{color:var(--green)} #pa-overlay .chip-value.warn{color:var(--amber)}
      #pa-overlay .section-label {
        font-family:'Share Tech Mono',monospace; font-size:8px; color:var(--text-dim);
        letter-spacing:0.1em; text-transform:uppercase; margin-bottom:6px;
        display:flex; align-items:center; gap:6px;
      }
      #pa-overlay .section-label::after{content:'';flex:1;height:1px;background:var(--panel-border)}
      #pa-overlay .presets-list{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
      #pa-overlay .preset-btn {
        width:100%; background:var(--panel-mid); border:1px solid var(--panel-border);
        border-radius:3px; padding:7px 10px;
        display:flex; align-items:center; gap:8px;
        cursor:pointer; transition:all 0.15s; text-align:left;
      }
      #pa-overlay .preset-btn:hover:not(:disabled){background:var(--amber-faint);border-color:rgba(255,179,0,0.3)}
      #pa-overlay .preset-btn:disabled{opacity:0.4;cursor:not-allowed}
      #pa-overlay .preset-btn.speaking{
        background:rgba(57,255,134,0.06);border-color:rgba(57,255,134,0.3);
        animation:pa-speak 1s ease-in-out infinite;
      }
      #pa-overlay .preset-label{
        font-family:'Orbitron',monospace;font-size:8px;font-weight:700;
        color:var(--amber);letter-spacing:0.1em;text-transform:uppercase;
        white-space:nowrap;flex-shrink:0;min-width:62px;
      }
      #pa-overlay .preset-btn.speaking .preset-label{color:var(--green)}
      #pa-overlay .preset-preview{
        font-family:'Share Tech Mono',monospace;font-size:8px;
        color:var(--text-muted);white-space:nowrap;overflow:hidden;
        text-overflow:ellipsis;flex:1;min-width:0;
      }
      #pa-overlay .preset-btn.speaking .preset-preview{color:rgba(57,255,134,0.55)}
      #pa-overlay .preset-icon{flex-shrink:0;display:flex;align-items:center;gap:2px;height:10px}
      #pa-overlay .preset-icon .bar{width:2px;background:var(--text-muted);border-radius:1px}
      #pa-overlay .preset-btn.speaking .preset-icon .bar{
        background:var(--green);animation:pa-wave 0.6s ease-in-out infinite;
      }
      #pa-overlay .preset-icon .bar:nth-child(1){height:4px;animation-delay:0s}
      #pa-overlay .preset-icon .bar:nth-child(2){height:8px;animation-delay:0.1s}
      #pa-overlay .preset-icon .bar:nth-child(3){height:5px;animation-delay:0.2s}
      #pa-overlay .preset-icon .bar:nth-child(4){height:9px;animation-delay:0.15s}
      #pa-overlay .preset-icon .bar:nth-child(5){height:3px;animation-delay:0.05s}
      @keyframes pa-wave{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1)}}
      @keyframes pa-speak{0%,100%{box-shadow:none}50%{box-shadow:0 0 10px rgba(57,255,134,0.15)}}
      #pa-overlay .voice-controls{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px}
      #pa-overlay .control-group{display:flex;flex-direction:column;gap:4px}
      #pa-overlay .control-label{
        font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-muted);
        letter-spacing:0.08em;text-transform:uppercase;display:flex;justify-content:space-between;
      }
      #pa-overlay .control-label span{color:var(--text-dim)}
      #pa-overlay .pa-range{
        -webkit-appearance:none;appearance:none;width:100%;height:3px;
        background:var(--panel-mid);border-radius:2px;outline:none;border:1px solid var(--panel-border);
      }
      #pa-overlay .pa-range::-webkit-slider-thumb{
        -webkit-appearance:none;width:11px;height:11px;border-radius:2px;
        background:var(--amber);cursor:pointer;box-shadow:0 0 6px rgba(255,179,0,0.4);
        border:1px solid var(--amber-dim);
      }
      #pa-overlay .pa-select{
        background:#070a0e;border:1px solid var(--panel-border);border-radius:3px;
        color:var(--text-main);font-family:'Share Tech Mono',monospace;font-size:9px;
        padding:5px 24px 5px 8px;outline:none;width:100%;cursor:pointer;
        -webkit-appearance:none;appearance:none;grid-column:span 2;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%237a6a40' stroke-width='1.2' fill='none'/%3E%3C/svg%3E");
        background-repeat:no-repeat;background-position:right 8px center;
      }
      #pa-overlay .pa-select option{background:#0b0e12;color:var(--text-main)}
      #pa-overlay .stop-row{display:flex;justify-content:flex-end}
      #pa-overlay .btn-stop{
        background:transparent;border:1px solid rgba(255,58,58,0.2);border-radius:3px;
        color:rgba(255,58,58,0.5);font-family:'Share Tech Mono',monospace;font-size:9px;
        padding:5px 12px;cursor:pointer;transition:all 0.15s;
        display:none;align-items:center;gap:4px;
      }
      #pa-overlay .btn-stop.visible{display:flex}
      #pa-overlay .btn-stop:hover{background:rgba(255,58,58,0.1);color:var(--red);border-color:rgba(255,58,58,0.45)}
      #pa-overlay .pa-footer{
        background:var(--panel-mid);border-top:1px solid var(--panel-border);
        padding:5px 14px;display:flex;align-items:center;justify-content:space-between;
      }
      #pa-overlay .shortcut-hint{
        font-family:'Share Tech Mono',monospace;font-size:8px;
        color:var(--text-muted);letter-spacing:0.05em;display:flex;align-items:center;gap:4px;
      }
      #pa-overlay .kbd{
        background:var(--panel-bg);border:1px solid var(--panel-border);
        border-radius:2px;padding:1px 5px;font-size:8px;color:var(--text-dim);
      }
      #pa-overlay .pa-status-text{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-muted)}
      #pa-overlay .pa-status-text.active{color:var(--green)}
      #pa-overlay .pa-status-text.error{color:var(--red)}
      #pa-toast{
        position:fixed;bottom:20px;right:14px;
        background:#0b0e12;border:1px solid #1f2630;border-radius:3px;
        padding:7px 14px;font-family:'Share Tech Mono',monospace;font-size:10px;
        color:#7a6a40;letter-spacing:0.06em;opacity:0;
        transition:all 0.2s ease;pointer-events:none;z-index:9999999;white-space:nowrap;
        transform:translateY(6px);
      }
      #pa-toast.show{opacity:1;transform:translateY(0)}
      #pa-toast.success{border-color:rgba(57,255,134,0.3);color:#39ff86}
      #pa-toast.error{border-color:rgba(255,58,58,0.3);color:#ff3a3a}
    `;
    document.head.appendChild(style);

    // ── Presets data
    const PRESETS = [
      { label: 'Boarding',   text: 'Ladies and gentlemen, welcome aboard. Please fasten your seatbelts and prepare for departure.' },
      { label: 'Cruise',     text: 'Ladies and gentlemen, we have reached our cruising altitude of thirty-five thousand feet. You are now free to move about the cabin.' },
      { label: 'Descent',    text: 'Attention passengers, we are now beginning our descent. Please return to your seats and fasten your seatbelts.' },
      { label: 'Landing',    text: 'We have landed. Welcome to your destination. Please remain seated until the aircraft has come to a complete stop.' },
      { label: 'Turbulence', text: 'Attention, we are experiencing turbulence. Please return to your seats and fasten your seatbelts immediately.' },
      { label: 'Captain',    text: 'This is your captain speaking. On behalf of the entire crew, thank you for flying with us today.' },
    ];

    // ── HTML
    const overlay = document.createElement('div');
    overlay.id = 'pa-overlay';
    overlay.innerHTML = `
      <div class="pa-panel">
        <div class="screws">
          <div class="screw tl"></div><div class="screw tr"></div>
          <div class="screw bl"></div><div class="screw br"></div>
        </div>
        <div class="pa-header">
          <div class="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffb300" stroke-width="1.5">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          </div>
          <div class="header-text">
            <div class="header-title">PA System</div>
            <div class="header-sub">PASSENGER ADDRESS · GEOFS ADDON v1.0</div>
          </div>
          <div class="header-badge" id="pa-badge"><div class="badge-dot"></div>STANDBY</div>
          <button class="close-btn" id="pa-closeBtn">✕</button>
        </div>
        <div class="pa-body">
          <div class="status-row">
            <div class="status-chip"><div class="chip-label">System</div><div class="chip-value live">TTS READY</div></div>
            <div class="status-chip"><div class="chip-label">Channel</div><div class="chip-value warn">CABIN ALL</div></div>
            <div class="status-chip"><div class="chip-label">Last Sent</div><div class="chip-value" id="pa-lastSent">—</div></div>
          </div>
          <div class="section-label">Announcements</div>
          <div class="presets-list" id="pa-presets"></div>
          <div class="section-label">Voice</div>
          <div class="voice-controls">
            <div class="control-group">
              <div class="control-label">Rate <span id="pa-rateVal">0.85×</span></div>
              <input type="range" class="pa-range" id="pa-rate" min="0.5" max="1.5" step="0.05" value="0.85">
            </div>
            <div class="control-group">
              <div class="control-label">Pitch <span id="pa-pitchVal">0.95</span></div>
              <input type="range" class="pa-range" id="pa-pitch" min="0.5" max="1.5" step="0.05" value="0.95">
            </div>
            <select class="pa-select" id="pa-voiceSelect"><option value="">Loading voices...</option></select>
          </div>
          <div class="stop-row">
            <button class="btn-stop" id="pa-stopBtn"><span>■</span> STOP</button>
          </div>
        </div>
        <div class="pa-footer">
          <div class="shortcut-hint">Toggle: <kbd class="kbd">Shift+J</kbd> &nbsp;·&nbsp; <kbd class="kbd">Esc</kbd> stop</div>
          <div class="pa-status-text" id="pa-footerStatus">READY</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const toast = document.createElement('div');
    toast.id = 'pa-toast';
    document.body.appendChild(toast);

    // ── Build preset buttons dynamically
    const presetsList = document.getElementById('pa-presets');
    let activeBtn = null;

    PRESETS.forEach(({ label, text }) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.innerHTML = `
        <span class="preset-label">${label}</span>
        <span class="preset-preview">${text}</span>
        <span class="preset-icon">
          <span class="bar"></span><span class="bar"></span><span class="bar"></span>
          <span class="bar"></span><span class="bar"></span>
        </span>
      `;
      btn.addEventListener('click', () => announce(text, btn));
      presetsList.appendChild(btn);
    });

    // ── Refs
    const stopBtn      = document.getElementById('pa-stopBtn');
    const voiceSelect  = document.getElementById('pa-voiceSelect');
    const rateSlider   = document.getElementById('pa-rate');
    const pitchSlider  = document.getElementById('pa-pitch');
    const rateVal      = document.getElementById('pa-rateVal');
    const pitchVal     = document.getElementById('pa-pitchVal');
    const lastSent     = document.getElementById('pa-lastSent');
    const footerStatus = document.getElementById('pa-footerStatus');
    const badge        = document.getElementById('pa-badge');

    let isOpen = false, isSpeaking = false;

    function openPanel()   { isOpen = true;  overlay.classList.add('pa-open'); }
    function closePanel()  { isOpen = false; overlay.classList.remove('pa-open'); }
    function togglePanel() { isOpen ? closePanel() : openPanel(); }

    // ── Keyboard
    document.addEventListener('keydown', function paKey(e) {
      if (!document.getElementById('pa-overlay')) { document.removeEventListener('keydown', paKey); return; }
      if (e.key === 'J' && e.shiftKey) { e.preventDefault(); togglePanel(); }
      if (e.key === 'Escape') { isSpeaking ? stopSpeech() : (isOpen && closePanel()); }
    });

    document.getElementById('pa-closeBtn').addEventListener('click', closePanel);

    // ── Voices
    function populateVoices() {
      const v = speechSynthesis.getVoices();
      if (!v.length) return;
      voiceSelect.innerHTML = '';
      const en = v.filter(x => x.lang.startsWith('en'));
      const rest = v.filter(x => !x.lang.startsWith('en'));
      [...en, ...rest].forEach((voice, i) => {
        const o = document.createElement('option');
        o.value = i; o.textContent = `${voice.name} (${voice.lang})`;
        if (/daniel|karen|victoria|google uk/i.test(voice.name)) o.selected = true;
        voiceSelect.appendChild(o);
      });
    }
    speechSynthesis.addEventListener('voiceschanged', populateVoices);
    populateVoices();

    rateSlider.addEventListener('input', () => rateVal.textContent = parseFloat(rateSlider.value).toFixed(2) + '×');
    pitchSlider.addEventListener('input', () => pitchVal.textContent = parseFloat(pitchSlider.value).toFixed(2));

    stopBtn.addEventListener('click', stopSpeech);

    function stopSpeech() { speechSynthesis.cancel(); setSpeaking(false, null); }

    function setSpeaking(s, btn) {
      isSpeaking = s;
      if (activeBtn) { activeBtn.classList.remove('speaking'); activeBtn.disabled = false; }
      activeBtn = s ? btn : null;
      if (activeBtn) activeBtn.classList.add('speaking');
      presetsList.querySelectorAll('.preset-btn').forEach(b => { b.disabled = s && b !== activeBtn; });
      stopBtn.classList.toggle('visible', s);
      footerStatus.textContent = s ? 'TRANSMITTING' : 'READY';
      footerStatus.className = 'pa-status-text' + (s ? ' active' : '');
      badge.innerHTML = `<div class="badge-dot" style="${s ? 'background:#39ff86;box-shadow:0 0 6px #39ff86' : ''}"></div>${s ? 'ON AIR' : 'STANDBY'}`;
    }

    function announce(text, btn) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate  = parseFloat(rateSlider.value);
      u.pitch = parseFloat(pitchSlider.value);
      u.volume = 1;
      const idx = parseInt(voiceSelect.value);
      const allV = speechSynthesis.getVoices();
      const sorted = [...allV.filter(x => x.lang.startsWith('en')), ...allV.filter(x => !x.lang.startsWith('en'))];
      if (!isNaN(idx) && sorted[idx]) u.voice = sorted[idx];
      u.onstart = () => { setSpeaking(true, btn); showToast('Broadcasting…', 'success'); };
      u.onend   = () => { setSpeaking(false, null); lastSent.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); showToast('Broadcast complete.', 'success'); };
      u.onerror = (e) => { if (e.error !== 'interrupted') { setSpeaking(false, null); showToast('Error: ' + e.error, 'error'); } };
      speechSynthesis.speak(u);
    }

    let toastTimer;
    function showToast(msg, type = '') {
      clearTimeout(toastTimer);
      toast.textContent = msg;
      toast.className = 'show' + (type ? ' ' + type : '');
      toastTimer = setTimeout(() => toast.className = '', 2500);
    }

    console.log('%c PA Announcer loaded! Press Shift+J to toggle.', 'color:#ffb300;font-family:monospace');
  }

  waitForGeoFS(init);

})();
