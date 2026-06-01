import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabaseConfig = getSupabaseConfig();
const supabase = createSupabaseClient();

app.use(cors());
app.use(express.json());
app.use('/assets', express.static(new URL('./public/assets', import.meta.url).pathname));

app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Room Cloud</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800&family=Share+Tech+Mono&family=Inter:wght@400;600;800;900&display=swap');
          :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; --bg:#080b11; --panel:#15191f; --panel2:#10141a; --line:#2b3645; --cyan:#10d8ff; --blue:#159bff; --muted:#9aa3b2; --text:#edf2ff; --danger:#ff4d75; --good:#35e886; background:var(--bg); color:var(--text); }
          * { box-sizing:border-box; }
          body { margin:0; min-height:100vh; overflow:hidden; background:radial-gradient(circle at 74% -8%,#08222e 0,#080b11 36%,#05070b 76%), linear-gradient(90deg,#070a0f,#0b1018 45%,#06080d); }
          body::before { content:""; position:fixed; inset:0; pointer-events:none; background:linear-gradient(90deg,rgba(255,255,255,.018),transparent 18%,transparent 82%,rgba(16,216,255,.025)), repeating-linear-gradient(0deg,rgba(255,255,255,.016),rgba(255,255,255,.016) 1px,transparent 1px,transparent 5px); opacity:.45; mix-blend-mode:screen; }
          main { margin:0; padding:0; }
          h1 { margin:0; font-size:clamp(38px,5vw,68px); letter-spacing:-2px; line-height:.95; font-weight:900; text-shadow:0 2px #000, 0 0 24px rgba(120,205,255,.18); }
          h2 { margin:0; font-size:clamp(24px,3vw,38px); letter-spacing:-1px; }
          .sub { color:#9be6ff; margin-top:8px; font-size:14px; line-height:1.35; }
          .mono { font-family:"Share Tech Mono", ui-monospace, monospace; letter-spacing:1px; text-transform:uppercase; }
          .pill { border:1px solid #244151; color:#b7dcff; padding:10px 12px; border-radius:7px; background:linear-gradient(180deg,#101923,#0a1118); white-space:nowrap; font-size:13px; font-family:"Share Tech Mono", ui-monospace, monospace; box-shadow:inset 0 1px rgba(255,255,255,.04); }
          .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; }
          .card { border:1px solid var(--line); background:linear-gradient(120deg,rgba(28,33,41,.96),rgba(14,18,24,.96)); border-radius:8px; padding:18px; box-shadow:0 20px 44px #0009, inset 0 1px rgba(255,255,255,.04); }
          button, input { border:1px solid #2a394a; background:#0b1119; color:var(--text); border-radius:7px; padding:12px 14px; font:inherit; min-height:44px; outline:none; }
          input:focus { border-color:#68cfff; box-shadow:0 0 0 3px rgba(16,216,255,.13); }
          button { cursor:pointer; width:100%; margin-top:8px; font-weight:900; letter-spacing:.4px; transition:transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease; }
          button:hover { transform:translateY(-1px); border-color:#79caff; }
          .primary { background:linear-gradient(135deg,#12e6ff,#168bff); border-color:#33e8ff; color:#02070b; box-shadow:0 14px 32px rgba(10,157,255,.26), inset 0 1px rgba(255,255,255,.35); }
          .blue { background:linear-gradient(135deg,#147dff,#1c5dff); border-color:#48a8ff; color:white; box-shadow:0 12px 28px rgba(24,124,255,.24); }
          .dark { background:#090d12; border-color:#334457; color:#edf6ff; }
          .row { display:flex; gap:8px; align-items:center; }
          .row > * { flex:1; min-width:0; }
          input[type=color] { height:42px; padding:2px; }
          #cmd { width:100%; }
          #reply { min-height:18px; margin-top:10px; color:#7fefff; font-size:13px; line-height:1.35; }
          .locked main { filter:blur(16px); pointer-events:none; user-select:none; }
          .lock { position:fixed; inset:0; z-index:10; display:grid; place-items:center; padding:18px; background:radial-gradient(circle at 50% 36%,rgba(12,57,76,.74) 0,rgba(8,15,25,.94) 32%,#080b11 78%); }
          .lock.hidden { display:none; }
          .panel { width:min(430px,100%); border:0; background:transparent; padding:10px; text-align:center; }
          .panel h1 { font-family:Orbitron, Inter, sans-serif; text-align:center; font-size:30px; letter-spacing:4px; color:#a9d6ff; text-shadow:0 0 18px rgba(82,190,255,.45); }
          .panel p { text-align:center; color:#d4d8e3; margin:8px 0 24px; }
          .lock-logo { width:122px; height:122px; border-radius:12px; display:block; object-fit:cover; margin:0 auto 24px; padding:14px; background:linear-gradient(180deg,#141c25,#0c1219); border:1px solid #253444; box-shadow:0 24px 60px #000a, 0 0 48px rgba(16,216,255,.16); }
          .dots { display:flex; justify-content:center; gap:26px; margin:14px 0 28px; }
          .dots span { width:20px; height:20px; border-radius:50%; border:1px solid #496071; background:#101821; box-shadow:inset 0 1px #ffffff12; }
          .dots span.on { background:#9ad9ff; border-color:#9ad9ff; box-shadow:0 0 18px #1bbfff; }
          #pin { position:absolute; opacity:0; pointer-events:none; width:1px; height:1px; }
          .pad { display:grid; grid-template-columns:repeat(3,104px); justify-content:center; gap:20px; margin-top:0; }
          .pad button { margin:0; min-height:104px; font-size:40px; border-radius:14px; background:linear-gradient(180deg,#142231,#0d1824); border-color:#263949; box-shadow:inset 0 1px rgba(255,255,255,.05), 0 16px 34px #0008; font-weight:900; }
          .pad button.primary { font-size:18px; background:linear-gradient(135deg,#12e6ff,#168bff); border-color:#33e8ff; color:#02070b; }
          #error { min-height:18px; margin-top:12px; text-align:center; color:#ff8b8b; font-size:13px; }
          .app-shell { width:100%; height:100vh; display:grid; grid-template-columns:288px minmax(0,1fr); gap:0; padding:0; }
          .sidebar { border-right:1px solid #202833; background:linear-gradient(90deg,#11151b 0,#0d1117 72%,#070a0f 100%); padding:28px 18px; display:flex; flex-direction:column; gap:20px; box-shadow:18px 0 60px #0008; }
          .brand-row { display:flex; align-items:center; gap:14px; padding:0 10px 24px; }
          .brand-row b { display:block; font-size:29px; line-height:.95; color:#b4dbff; text-shadow:0 0 18px rgba(68,175,255,.22); }
          .logo-mark { width:52px; height:52px; border-radius:11px; display:grid; place-items:center; overflow:hidden; background:#111a23; border:1px solid #2b3b4c; box-shadow:0 0 24px rgba(16,216,255,.28); }
          .logo-mark img { width:100%; height:100%; object-fit:cover; }
          .nav-item { padding:16px 18px; border-radius:7px; color:#858b97; background:transparent; border:0; text-align:left; margin:0; min-height:0; font-weight:800; font-size:17px; letter-spacing:.2px; }
          .nav-item.active, .nav-item:hover { background:linear-gradient(90deg,#1d222a,#15191f); color:#a8d6ff; box-shadow:inset 3px 0 #90cfff; }
          .side-bottom { margin-top:auto; display:grid; gap:10px; border-top:1px solid #202833; padding-top:18px; }
          .chat-pane { display:grid; grid-template-rows:80px 1fr; min-width:0; background:radial-gradient(circle at 80% 0,rgba(18,70,94,.24),transparent 28%), #080b11; }
          .topbar { height:80px; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:0 40px; border-bottom:1px solid #202833; background:linear-gradient(90deg,rgba(14,19,26,.8),rgba(8,11,17,.96)); }
          .topbar b { font-family:Orbitron, Inter, sans-serif; font-size:28px; color:#c9eeff; }
          .page { display:none; min-height:0; overflow:auto; padding:42px 48px; }
          .page.active { display:block; }
          .chat-page.active { display:grid; grid-template-rows:1fr auto; padding:0; overflow:hidden; }
          .chat-log { overflow:auto; padding:52px max(24px,9vw) 24px; display:flex; flex-direction:column; gap:26px; }
          .bubble { max-width:820px; line-height:1.6; padding:18px 20px; border-radius:8px; white-space:pre-wrap; box-shadow:0 18px 40px #0007; }
          .bubble.assistant { align-self:flex-start; background:#0b0f15; border:1px solid #26384c; color:#e8edf7; box-shadow:0 18px 40px #0007, inset 0 1px rgba(255,255,255,.04); }
          .bubble.assistant::first-line { color:#9ad3ff; }
          .bubble.user { align-self:flex-end; background:#2a2d33; border:1px solid #343943; }
          .composer { margin:0 max(18px,10vw) 28px; background:#10151d; border:1px solid #2b394b; border-radius:8px; padding:10px; display:grid; grid-template-columns:1fr auto auto; gap:9px; align-items:center; box-shadow:0 22px 44px #0009; }
          .composer input { border:0; background:transparent; min-height:44px; font-size:16px; }
          .icon-btn { width:48px; min-width:48px; border-radius:7px; margin:0; padding:0; }
          .tools-page-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin:0 0 34px; }
          .tools-page-head h2 { margin:0 0 6px; font-size:clamp(38px,5vw,64px); }
          .tools-grid { display:grid; grid-template-columns:repeat(2,minmax(260px,1fr)); gap:24px; max-width:1180px; }
          .tool-card.device-card { min-height:250px; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(110deg,rgba(28,33,41,.96),rgba(16,22,30,.96)); border-color:#26384b; }
          .tool-card.device-card:first-child { grid-column:span 2; min-height:250px; }
          .tool-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:20px; }
          .tool-identity { display:flex; gap:16px; align-items:center; min-width:0; }
          .device-icon { width:58px; height:58px; border-radius:16px; display:grid; place-items:center; flex:0 0 auto; color:#13d7ff; font-size:14px; font-weight:950; background:#102337; border:1px solid #0e5a7c; box-shadow:inset 0 1px rgba(255,255,255,.06); }
          .device-icon.blue-icon, .device-icon.green-icon, .device-icon.gold-icon { background:#2b2d36; border-color:#343946; color:#dbe5f7; box-shadow:none; }
          .tool-copy b { display:block; font-size:26px; margin-bottom:8px; letter-spacing:-.5px; }
          .tool-desc { color:#b8bdc7; font-size:13px; line-height:1.45; text-transform:uppercase; letter-spacing:1px; }
          .control-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
          .color-control { display:grid; grid-template-columns:96px 1fr; gap:12px; margin-bottom:12px; }
          .color-control input[type=color] { width:100%; }
          .mobile-nav { display:none; }
          .alarm-page { max-width:960px; margin:0 auto; padding-top:80px; }
          .alarm-hero { border:1px solid #0a5974; background:radial-gradient(circle at 76% 0,rgba(16,216,255,.14),transparent 26%), linear-gradient(120deg,#0b1119,#061018); border-radius:18px; padding:40px; box-shadow:0 28px 80px #000b, 0 0 40px rgba(16,216,255,.11), inset 0 1px rgba(255,255,255,.06); }
          .alarm-picker { display:grid; grid-template-columns:1fr 1fr; gap:22px; margin:34px 0 28px; }
          .picker-column { background:#05080d; color:#e9fbff; border:1px solid #0b88ad; border-radius:12px; padding:16px 14px; min-width:0; box-shadow:inset 0 1px #52eaff18, 0 18px 46px #0009; }
          .picker-label { text-align:center; color:#00e3ff; font-family:Orbitron, Inter, sans-serif; font-size:14px; font-weight:800; margin-bottom:14px; }
          .picker-list { height:210px; overflow:auto; scroll-snap-type:y mandatory; display:grid; gap:10px; padding:0 4px; scrollbar-width:none; }
          .picker-list::-webkit-scrollbar { display:none; }
          .picker-option { min-height:52px; margin:0; border:0; background:transparent; color:#5d6672; border-radius:8px; font-family:Orbitron, Inter, sans-serif; font-size:28px; font-weight:800; scroll-snap-align:center; transition:background .16s ease, color .16s ease, transform .16s ease, box-shadow .16s ease; }
          .picker-option.active { color:#00080d; background:#18d9f4; transform:scale(1.02); box-shadow:0 0 26px rgba(16,216,255,.42); }
          .alarm-hidden { display:none; }
          .alarm-settings { border-top:1px solid #26343b; padding-top:24px; display:grid; gap:18px; }
          .alarm-actions { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
          .settings-list { display:grid; grid-template-columns:1fr 1fr; gap:24px; max-width:1120px; }
          .settings-row { border:1px solid #293846; background:linear-gradient(120deg,#11161d,#0a0f15); border-radius:12px; padding:26px; display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:150px; box-shadow:0 18px 44px #0008; }
          .tools-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
          .tool-card { border:1px solid #273647; background:linear-gradient(110deg,#171b22,#0f141b); border-radius:8px; padding:24px; margin-bottom:10px; transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
          .tool-card:hover { transform:translateY(-2px); border-color:#49718e; box-shadow:0 18px 46px #0008; }
          .tool-title { display:flex; justify-content:space-between; align-items:center; gap:8px; font-weight:900; margin-bottom:9px; font-size:28px; }
          .state-chip { font-size:12px; color:#a7bbca; border:1px solid #34475b; border-radius:999px; padding:5px 10px; background:#111a24; font-family:"Share Tech Mono", ui-monospace, monospace; text-transform:uppercase; }
          .state-chip.on { color:#001015; background:#13e0ff; border-color:#13e0ff; box-shadow:0 0 18px rgba(16,216,255,.32); }
          .tool-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
          .alarm-display { font-size:34px; letter-spacing:2px; margin:8px 0 10px; color:#e9fbff; }
          .modal { position:fixed; inset:0; z-index:8; display:none; place-items:end center; background:#0009; padding:18px; }
          .modal.open { display:grid; }
          .sheet { width:min(520px,100%); background:#202124; border:1px solid #34383d; border-radius:8px; padding:18px; box-shadow:0 20px 60px #000c; }
          .time-row { display:flex; justify-content:center; align-items:center; gap:12px; font-size:54px; margin:8px 0 18px; }
          .time-row input { width:88px; text-align:center; font-size:44px; padding:4px; border:0; background:#111; }
          .days { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin:12px 0; }
          .days span { text-align:center; color:#8b93a0; font-size:15px; padding:13px 0; border-radius:8px; background:#0b1118; border:1px solid #273647; font-weight:900; }
          .days span.active { color:#001015; background:#10ddea; border-color:#10ddea; font-weight:900; box-shadow:0 0 22px rgba(16,216,255,.25); }
          .field { display:grid; gap:8px; margin:12px 0; color:#b9c1cc; }
          .field input { width:100%; }
          @media (max-width:980px) { body { overflow:auto; padding-bottom:86px; } .app-shell { height:auto; min-height:100vh; grid-template-columns:1fr; } .sidebar { display:none; } .chat-pane { min-height:100vh; grid-template-rows:72px 1fr; } .page { padding:24px 18px; } .topbar { height:72px; padding:0 18px; } .topbar b { font-size:22px; } .tools-grid { grid-template-columns:1fr; } .tool-card.device-card:first-child { grid-column:auto; } .settings-list { grid-template-columns:1fr; } .alarm-page { padding-top:20px; } .mobile-nav { position:fixed; left:12px; right:12px; bottom:12px; z-index:7; display:grid; grid-template-columns:repeat(4,1fr); gap:6px; padding:7px; border:1px solid #26465a; border-radius:12px; background:#0a0f15e8; backdrop-filter:blur(12px); box-shadow:0 18px 46px #000c; } .mobile-nav button { min-height:48px; margin:0; padding:8px 4px; font-size:12px; border-radius:8px; } .mobile-nav button.active { background:#10ddea; color:#001015; border-color:#10ddea; } .locked .mobile-nav { display:none; } }
          @media (max-width:560px) { h1 { font-size:38px; } .pad { grid-template-columns:repeat(3,92px); gap:12px; } .pad button { min-height:92px; font-size:34px; } .pill { width:100%; text-align:center; } .composer { grid-template-columns:1fr auto; margin:0 12px 16px; } .composer .primary { grid-column:1 / -1; width:100%; border-radius:7px; } .tools-page-head { align-items:stretch; flex-direction:column; margin-bottom:20px; } .tools-page-head h2 { font-size:38px; } .tools-page-head button { max-width:none !important; } .tools-grid { grid-template-columns:1fr; gap:14px; } .tool-card.device-card { min-height:210px; padding:18px; } .tool-copy b { font-size:22px; } .control-row { gap:8px; } .color-control { grid-template-columns:76px 1fr; } .time-row { font-size:42px; } .time-row input { width:72px; font-size:36px; } .alarm-hero { padding:22px; border-radius:14px; } .alarm-actions { grid-template-columns:1fr; } .alarm-picker { gap:12px; } .picker-list { height:168px; } .picker-option { font-size:24px; } .settings-row { min-height:unset; flex-direction:column; align-items:flex-start; } }
        </style>
      </head>
      <body class="locked">
        <div class="lock" id="lock">
          <section class="panel">
            <img class="lock-logo" src="/assets/logo.png" alt="Smart Room logo">
            <h1>SYSTEM CORE</h1>
            <p>Authentication Required</p>
            <div class="dots" id="dots"><span></span><span></span><span></span><span></span></div>
            <input id="pin" inputmode="numeric" maxlength="8" type="password" placeholder="PIN">
            <div class="pad">
              <button onclick="press('1')">1</button><button onclick="press('2')">2</button><button onclick="press('3')">3</button>
              <button onclick="press('4')">4</button><button onclick="press('5')">5</button><button onclick="press('6')">6</button>
              <button onclick="press('7')">7</button><button onclick="press('8')">8</button><button onclick="press('9')">9</button>
              <button onclick="back()">DEL</button><button onclick="press('0')">0</button><button class="primary" onclick="unlock()">ENTER</button>
            </div>
            <div id="error"></div>
          </section>
        </div>
        <main class="app-shell">
          <aside class="sidebar">
            <div class="brand-row"><div class="logo-mark"><img src="/assets/logo.png" alt="Smart Room logo"></div><div><b>KEMI OS</b><div class="sub mono">Online</div></div></div>
            <button class="nav-item active" data-page="chat" onclick="showPage('chat')">AI Assistant</button>
            <button class="nav-item" data-page="tools" onclick="showPage('tools')">Devices</button>
            <button class="nav-item" data-page="alarm" onclick="showPage('alarm')">Scheduler</button>
            <button class="nav-item" data-page="settings" onclick="showPage('settings')">Settings</button>
            <div class="side-bottom">
              <div class="pill" id="espStatus" style="border-color:#551111;color:#ff5555;background:#1a0505;">ESP Offline</div>
              <div class="pill" id="status">Cloud ready</div>
              <button class="dark" onclick="lockAgain()">LOCK</button>
            </div>
          </aside>
          <section class="chat-pane">
            <div class="topbar"><div><b id="pageTitle">AI Assistant</b><div class="sub" id="pageSubtitle">Command terminal and voice control</div></div><button class="dark mono" id="clearButton" onclick="clearPending()" style="max-width:170px;margin:0">CLEAR PENDING</button></div>
            <section class="page chat-page active" id="chatPage">
              <div class="chat-log" id="chatLog">
                <div class="bubble assistant">&gt; Smart Room AI online.
Halo, aku siap bantu kontrol Smart Room. Kamu bisa ketik atau tekan voice untuk memberi perintah.</div>
              </div>
              <div class="composer">
                <input id="cmd" placeholder="Ask anything or command your room">
                <button class="icon-btn blue" onclick="voiceAi()" title="Voice AI">MIC</button>
                <button class="icon-btn primary" onclick="askAi()" title="Send">GO</button>
              </div>
              <div id="reply" style="display:none">Gateway ready</div>
            </section>
            <section class="page" id="toolsPage">
              <div class="tools-page-head"><div><h2>Environment Control</h2><div class="sub">4 active nodes in primary room zone.</div></div><button class="dark mono" onclick="checkEspStatus()" style="max-width:140px;margin:0">REFRESH</button></div>
              <div class="tools-grid">
                <article class="tool-card device-card">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon">LOCK</div><div class="tool-copy"><b>Desk Lamp</b><div class="tool-desc">Main desk light control</div></div></div><span class="state-chip" id="lampState">OFF</span></div></div>
                  <div class="control-row"><button class="primary" onclick="queue({device:'lamp',state:'on'})">ON</button><button class="dark" onclick="queue({device:'lamp',state:'off'})">OFF</button></div>
                </article>
                <article class="tool-card device-card">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon blue-icon">RGB</div><div class="tool-copy"><b>RGB Room</b><div class="tool-desc">Mood light and room color</div></div></div><span class="state-chip" id="rgbState">OFF</span></div><div class="color-control"><input id="color" type="color" value="#10ddea"><button class="blue" onclick="rgbColor()">SET COLOR</button></div></div>
                  <div class="control-row"><button class="primary" onclick="queue({device:'rgb',state:'on'})">ON</button><button class="dark" onclick="queue({device:'rgb',state:'off'})">OFF</button></div>
                </article>
                <article class="tool-card device-card">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon green-icon">DR</div><div class="tool-copy"><b>Main Entrance</b><div class="tool-desc">Smart lock servo with auto close</div></div></div><span class="state-chip" id="doorState">CLOSED</span></div></div>
                  <div class="control-row"><button class="primary" onclick="queue({device:'door',state:'open'})">OPEN</button><button class="dark" onclick="queue({device:'door',state:'close'})">CLOSE</button></div>
                </article>
                <article class="tool-card device-card">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon blue-icon">TV</div><div class="tool-copy"><b>Smart TV</b><div class="tool-desc">OLED screen and animation</div></div></div><span class="state-chip" id="tvState">OFF</span></div></div>
                  <div class="control-row"><button class="primary" onclick="queue({device:'tv',state:'on'})">ON</button><button class="dark" onclick="queue({device:'tv',state:'off'})">OFF</button></div>
                </article>
                <article class="tool-card device-card">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon gold-icon">DM</div><div class="tool-copy"><b>Demo Mode</b><div class="tool-desc">RGB, Smart TV, then door sequence</div></div></div><span class="state-chip on">EXPO</span></div></div>
                  <button class="primary" onclick="demoMode()">RUN DEMO</button>
                </article>
              </div>
            </section>
            <section class="page alarm-page" id="alarmPage">
              <div class="alarm-hero">
                <div class="tool-title">Scheduler <span class="state-chip" id="alarmState">OFF</span></div>
                <input class="alarm-hidden" id="alarmHour" type="number" min="0" max="23" value="06">
                <input class="alarm-hidden" id="alarmMinute" type="number" min="0" max="59" value="00">
                <div class="alarm-picker">
                  <div class="picker-column"><div class="picker-label">JAM</div><div class="picker-list" id="hourPicker"></div></div>
                  <div class="picker-column"><div class="picker-label">MENIT</div><div class="picker-list" id="minutePicker"></div></div>
                </div>
                <div class="alarm-settings">
                  <div class="days"><span class="active">M</span><span class="active">T</span><span class="active">W</span><span class="active">T</span><span class="active">F</span><span>S</span><span>S</span></div>
                  <label class="field mono">Routine Designation <input id="alarmName" value="Smart Room Alarm"></label>
                  <div class="alarm-actions"><button class="primary" onclick="saveAlarm()">SAVE</button><button class="primary" onclick="enableAlarm()">ON</button><button class="dark" onclick="disableAlarm()">OFF</button><button class="dark" onclick="queue({device:'buzzer',state:'off'})">STOP</button></div>
                </div>
              </div>
            </section>
            <section class="page" id="settingsPage">
              <div class="settings-list">
                <div class="settings-row"><div><b>Remote Dashboard</b><div class="sub">Vercel remote control from inside or outside network</div></div><span class="state-chip on">SYNC ACTIVE</span></div>
                <div class="settings-row"><div><b>Telemetry Polling</b><div class="sub">ESP checks cloud about every 2 seconds</div></div><span class="state-chip on">2 SEC</span></div>
                <div class="settings-row"><div><b>Local Edge Dashboard</b><div class="sub">IP address shows firmware dashboard, so upload sketch after local UI changes</div></div><span class="state-chip">LOCAL</span></div>
                <button class="dark mono" onclick="clearPending()">CLEAR PENDING COMMANDS</button>
              </div>
            </section>
          </section>
        </main>
        <nav class="mobile-nav">
          <button class="active" data-page="chat" onclick="showPage('chat')">Chat</button>
          <button data-page="tools" onclick="showPage('tools')">Tools</button>
          <button data-page="alarm" onclick="showPage('alarm')">Alarm</button>
          <button data-page="settings" onclick="showPage('settings')">Settings</button>
        </nav>
        <div class="modal" id="alarmModal">
          <section class="sheet">
            <div class="tools-head"><h2 style="margin:0">Alarm</h2><button class="dark" onclick="closeAlarmSheet()" style="max-width:82px;margin:0">CLOSE</button></div>
            <div class="time-row"><input id="alarmHourSheet" type="number" min="0" max="23" value="06"><span>:</span><input id="alarmMinuteSheet" type="number" min="0" max="59" value="00"></div>
            <div class="days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
            <label class="field">Alarm name <input id="alarmNameSheet" value="Smart Room Alarm"></label>
            <button class="primary" onclick="saveAlarmSheet()">SAVE ALARM</button>
          </section>
        </div>
        <script>
          const AUTH = 'smart_room_cloud_pin';
          const unlocked = () => sessionStorage.getItem(AUTH) === '1';
          const pinValue = () => sessionStorage.getItem('smart_room_pin') || '';
          let alarmEditing = false;
          let pickerScrollTimer = 0;
          function redraw() {
            const isOpen = unlocked();
            document.body.classList.toggle('locked', !isOpen);
            lock.classList.toggle('hidden', isOpen);
            [...dots.children].forEach((dot, i) => dot.classList.toggle('on', i < pin.value.length));
            if (!isOpen) setTimeout(() => pin.focus(), 80);
          }
          function press(n) { pin.value = (pin.value + n).slice(0, 4); error.textContent = ''; redraw(); if (pin.value.length === 4) unlock(); }
          function back() { pin.value = pin.value.slice(0, -1); error.textContent = ''; redraw(); }
          async function unlock() {
            const value = pin.value;
            const response = await fetch('/auth', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({pin:value})});
            if (response.ok) {
              sessionStorage.setItem(AUTH, '1');
              sessionStorage.setItem('smart_room_pin', value);
              pin.value = '';
              redraw();
            } else {
              error.textContent = 'PIN salah';
              pin.value = '';
              redraw();
            }
          }
          function lockAgain() { sessionStorage.removeItem(AUTH); sessionStorage.removeItem('smart_room_pin'); redraw(); }
          pin.addEventListener('input', () => { pin.value = pin.value.replace(/\\D/g, '').slice(0, 4); redraw(); });
          pin.addEventListener('keydown', (event) => { if (event.key === 'Enter') unlock(); });
          const pageMeta = {
            chat: ['AI Assistant', 'Command terminal and voice control'],
            tools: ['Environment Control', 'Realtime device nodes and room status'],
            alarm: ['Scheduler', 'Set routine, alarm, and stop buzzer'],
            settings: ['System Configurations', 'Cloud, realtime, and local dashboard info']
          };
          function showPage(name) {
            const meta = pageMeta[name] || pageMeta.chat;
            pageTitle.textContent = meta[0];
            pageSubtitle.textContent = meta[1];
            clearButton.style.display = name === 'chat' || name === 'settings' ? 'block' : 'none';
            document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
            document.getElementById(name + 'Page').classList.add('active');
            document.querySelectorAll('[data-page]').forEach((item) => item.classList.toggle('active', item.dataset.page === name));
            if (name !== 'chat') checkEspStatus();
          }
          function setStatus(text) {
            document.getElementById('status').textContent = text;
          }
          function addBubble(role, text) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble ' + role;
            bubble.textContent = text;
            chatLog.appendChild(bubble);
            chatLog.scrollTop = chatLog.scrollHeight;
          }
          function setChip(element, isOn, onText, offText) {
            element.textContent = isOn ? onText : offText;
            element.classList.toggle('on', Boolean(isOn));
          }
          function two(number) {
            return String(Math.max(0, Math.min(99, Number(number) || 0))).padStart(2, '0');
          }
          function setAlarmPicker(part, value) {
            alarmEditing = true;
            if (part === 'hour') {
              alarmHour.value = two(value);
            } else {
              alarmMinute.value = two(value);
            }
            renderAlarmPicker();
          }
          function syncPickerFromScroll(part) {
            const list = part === 'hour' ? hourPicker : minutePicker;
            const buttons = [...list.querySelectorAll('.picker-option')];
            const listCenter = list.getBoundingClientRect().top + list.clientHeight / 2;
            let closest = buttons[0];
            let closestDistance = Infinity;
            buttons.forEach((button) => {
              const rect = button.getBoundingClientRect();
              const distance = Math.abs((rect.top + rect.height / 2) - listCenter);
              if (distance < closestDistance) {
                closestDistance = distance;
                closest = button;
              }
            });
            if (closest) setAlarmPicker(part, Number(closest.dataset.value));
          }
          function onPickerScroll(part) {
            alarmEditing = true;
            clearTimeout(pickerScrollTimer);
            pickerScrollTimer = setTimeout(() => syncPickerFromScroll(part), 180);
          }
          function renderAlarmPicker() {
            const selectedHour = Number(alarmHour.value) || 0;
            const selectedMinute = Number(alarmMinute.value) || 0;
            hourPicker.innerHTML = '';
            minutePicker.innerHTML = '';
            for (let hour = 0; hour < 24; hour++) {
              const button = document.createElement('button');
              button.className = 'picker-option' + (hour === selectedHour ? ' active' : '');
              button.dataset.value = String(hour);
              button.textContent = two(hour);
              button.onclick = () => setAlarmPicker('hour', hour);
              hourPicker.appendChild(button);
            }
            for (let minute = 0; minute < 60; minute++) {
              const button = document.createElement('button');
              button.className = 'picker-option' + (minute === selectedMinute ? ' active' : '');
              button.dataset.value = String(minute);
              button.textContent = two(minute);
              button.onclick = () => setAlarmPicker('minute', minute);
              minutePicker.appendChild(button);
            }
            requestAnimationFrame(() => {
              hourPicker.querySelector('.active')?.scrollIntoView({ block:'center' });
              minutePicker.querySelector('.active')?.scrollIntoView({ block:'center' });
            });
          }
          function clampAlarmInputs(source = 'page') {
            const hourInput = source === 'sheet' ? alarmHourSheet : alarmHour;
            const minuteInput = source === 'sheet' ? alarmMinuteSheet : alarmMinute;
            const hour = Math.max(0, Math.min(23, Number(hourInput.value) || 0));
            const minute = Math.max(0, Math.min(59, Number(minuteInput.value) || 0));
            hourInput.value = two(hour);
            minuteInput.value = two(minute);
            if (source === 'page') renderAlarmPicker();
            return { hour, minute };
          }
          function rgbToHex(r, g, b) {
            return '#' + [r, g, b].map((value) => {
              const n = Math.max(0, Math.min(255, Number(value) || 0));
              return n.toString(16).padStart(2, '0');
            }).join('');
          }
          function updateToolStatus(state = {}) {
            setChip(lampState, state.lamp === true, 'ON', 'OFF');
            setChip(rgbState, state.rgb === true, 'ON', 'OFF');
            setChip(doorState, state.door === true, 'OPEN', 'CLOSED');
            setChip(tvState, state.tv === true, 'ON', 'OFF');
            setChip(alarmState, state.alarmRinging === true || state.alarmEnabled === true, state.alarmRinging ? 'RINGING' : 'ON', 'OFF');
            if (!alarmEditing && Number.isFinite(Number(state.alarmHour)) && Number.isFinite(Number(state.alarmMinute))) {
              alarmHour.value = two(state.alarmHour);
              alarmMinute.value = two(state.alarmMinute);
              alarmHourSheet.value = two(state.alarmHour);
              alarmMinuteSheet.value = two(state.alarmMinute);
              renderAlarmPicker();
            }
            if (Number.isFinite(Number(state.r)) && Number.isFinite(Number(state.g)) && Number.isFinite(Number(state.b))) {
              color.value = rgbToHex(state.r, state.g, state.b);
            }
          }
          async function queue(command) {
            if (!unlocked()) return;
            setStatus('Sending...');
            const response = await fetch('/remote/command', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({pin:pinValue(), command})
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok && result.ok) {
              setStatus('Queued');
              const id = result.queued?.[0]?.id;
              if (id) trackCommand(id);
            } else {
              setStatus(result.error || 'Failed');
            }
          }
          function trackCommand(id) {
            let checks = 0;
            const timer = setInterval(async () => {
              checks++;
              try {
                const response = await fetch('/remote/status', {
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({pin:pinValue(), id})
                });
                const result = await response.json();
                if (result.status === 'done') {
                  setStatus('Sent to ESP / Done');
                  clearInterval(timer);
                } else if (checks > 12) {
                  setStatus('Queued, waiting ESP');
                  clearInterval(timer);
                }
              } catch (error) {
                if (checks > 12) clearInterval(timer);
              }
            }, 1500);
          }
          function demoMode() {
            queue({device:'rgb', r:0, g:220, b:255});
            setTimeout(() => queue({device:'tv', state:'on'}), 700);
            setTimeout(() => queue({device:'door', state:'open'}), 1400);
          }
          function rgbColor() {
            const hex = color.value.slice(1);
            queue({device:'rgb', r:parseInt(hex.slice(0,2),16), g:parseInt(hex.slice(2,4),16), b:parseInt(hex.slice(4,6),16)});
          }
          function openAlarmSheet() {
            alarmHourSheet.value = alarmHour.value;
            alarmMinuteSheet.value = alarmMinute.value;
            alarmNameSheet.value = alarmName.value;
            alarmModal.classList.add('open');
            alarmEditing = true;
            alarmHourSheet.focus();
          }
          function closeAlarmSheet() {
            alarmModal.classList.remove('open');
            alarmEditing = false;
          }
          function saveAlarm() {
            const { hour, minute } = clampAlarmInputs('page');
            alarmEditing = false;
            queue({device:'alarm', enabled:true, hour, minute});
          }
          function enableAlarm() {
            saveAlarm();
          }
          function disableAlarm() {
            alarmEditing = false;
            queue({device:'alarm', enabled:false});
          }
          function saveAlarmSheet() {
            const { hour, minute } = clampAlarmInputs('sheet');
            alarmHour.value = two(hour);
            alarmMinute.value = two(minute);
            alarmName.value = alarmNameSheet.value;
            renderAlarmPicker();
            queue({device:'alarm', enabled:true, hour, minute});
            closeAlarmSheet();
          }
          async function askAi() {
            if (!unlocked() || !cmd.value.trim()) return;
            const message = cmd.value.trim();
            cmd.value = '';
            addBubble('user', message);
            addBubble('assistant', 'AI thinking...');
            const loadingBubble = chatLog.lastElementChild;
            const response = await fetch('/chat', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({pin:pinValue(), message, queue:true})
            });
            const result = await response.json().catch(() => ({}));
            loadingBubble.textContent = result.reply || result.error || 'AI failed';
            if (result.reply) speak(result.reply);
            setStatus(response.ok && result.ok ? 'AI command queued' : 'AI failed');
            const id = result.queued?.[0]?.id;
            if (id) trackCommand(id);
          }
          function speak(text) {
            if (!('speechSynthesis' in window) || !text) return;
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            utterance.rate = 1;
            speechSynthesis.speak(utterance);
          }
          function voiceAi() {
            if (!unlocked()) return;
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
              addBubble('assistant', 'Voice belum didukung browser ini.');
              return;
            }
            const rec = new SpeechRecognition();
            rec.lang = 'id-ID';
            rec.interimResults = false;
            rec.maxAlternatives = 1;
            setStatus('Listening...');
            rec.onresult = (event) => {
              const text = event.results[0][0].transcript;
              cmd.value = text;
              askAi();
            };
            rec.onerror = () => { addBubble('assistant', 'Voice gagal. Coba lagi.'); setStatus('Voice failed'); };
            rec.onend = () => { if (document.getElementById('status').textContent === 'Listening...') setStatus('Voice done'); };
            rec.start();
          }
          async function clearPending() {
            if (!unlocked()) return;
            setStatus('Clearing...');
            const response = await fetch('/remote/clear', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({pin:pinValue()})
            });
            const result = await response.json().catch(() => ({}));
            setStatus(response.ok && result.ok ? 'Pending cleared' : (result.error || 'Clear failed'));
          }
          
          async function checkEspStatus() {
            if (!unlocked()) return;
            try {
              const res = await fetch('/device/status');
              const data = await res.json();
              if (data.online) {
                espStatus.textContent = 'ESP Online';
                espStatus.style.background = '#021a0f';
                espStatus.style.color = '#10ea7a';
                espStatus.style.borderColor = '#0a522b';
              } else {
                espStatus.textContent = 'ESP Offline';
                espStatus.style.background = '#1a0505';
                espStatus.style.color = '#ff5555';
                espStatus.style.borderColor = '#551111';
              }
              updateToolStatus(data.state || {});
            } catch (e) {}
          }
          cmd.addEventListener('keydown', (event) => { if (event.key === 'Enter') askAi(); });
          [alarmHour, alarmMinute, alarmName].forEach((input) => {
            input.addEventListener('focus', () => { alarmEditing = true; });
            input.addEventListener('input', () => { alarmEditing = true; });
            input.addEventListener('blur', () => { if (input !== alarmName) clampAlarmInputs('page'); });
            input.addEventListener('keydown', (event) => { if (event.key === 'Enter') saveAlarm(); });
          });
          [alarmHourSheet, alarmMinuteSheet, alarmNameSheet].forEach((input) => {
            input.addEventListener('focus', () => { alarmEditing = true; });
            input.addEventListener('input', () => { alarmEditing = true; });
            input.addEventListener('blur', () => { if (input !== alarmNameSheet) clampAlarmInputs('sheet'); });
          });
          hourPicker.addEventListener('scroll', () => onPickerScroll('hour'));
          minutePicker.addEventListener('scroll', () => onPickerScroll('minute'));
          alarmModal.addEventListener('click', (event) => { if (event.target === alarmModal) closeAlarmSheet(); });
          renderAlarmPicker();
          setInterval(checkEspStatus, 2000);
          checkEspStatus();
          
          redraw();
        </script>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'smart-room-ai-gateway',
    groq: Boolean(process.env.GROQ_API_KEY),
    supabase: Boolean(supabase),
    supabaseHost: supabaseConfig.host,
    supabaseKeyPrefix: supabaseConfig.keyPrefix
  });
});

app.get('/debug', async (req, res) => {
  const info = {
    supabaseUrl: supabaseConfig.url || '(not set)',
    supabaseHost: supabaseConfig.host || '(not set)',
    supabaseKeyPrefix: supabaseConfig.keyPrefix || '(not set)',
    supabaseClientCreated: Boolean(supabase),
    nodeVersion: process.version,
    fetchTest: null,
    supabaseTest: null
  };

  // Test 1: basic fetch
  try {
    const r = await fetch('https://example.com', { method: 'HEAD' });
    info.fetchTest = `ok (status ${r.status})`;
  } catch (err) {
    info.fetchTest = `FAILED: ${err.message}`;
  }

  // Test 2: fetch Supabase URL directly
  if (supabaseConfig.url) {
    try {
      const r = await fetch(`${supabaseConfig.url}/rest/v1/`, {
        method: 'GET',
        headers: { 'apikey': supabaseConfig.key || '' }
      });
      info.supabaseTest = `ok (status ${r.status})`;
    } catch (err) {
      info.supabaseTest = `FAILED: ${err.message} | cause: ${err.cause?.message || err.cause || 'none'}`;
    }
  } else {
    info.supabaseTest = 'skipped (no url)';
  }

  // Test 3: actual supabase client query
  if (supabase) {
    try {
      const { data, error } = await supabase.from('user_memory').select('id').limit(1);
      info.supabaseQueryTest = error ? `ERROR: ${error.message} | code: ${error.code}` : `ok (rows: ${data?.length ?? 0})`;
    } catch (err) {
      info.supabaseQueryTest = `THREW: ${err.message}`;
    }
  } else {
    info.supabaseQueryTest = 'skipped (no client)';
  }

  res.json(info);
});

async function searchRealtime(query) {
  if (!process.env.TAVILY_API_KEY) {
    return null;
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 5
    })
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  return response.json();
}

function cleanEnv(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

function getSupabaseConfig() {
  const url = cleanEnv(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
  const key = cleanEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let host = '';
  try {
    host = url ? new URL(url).host : '';
  } catch (error) {
    host = 'invalid-url';
  }

  return {
    url,
    key,
    host,
    keyPrefix: key ? key.slice(0, 16) : ''
  };
}

function createSupabaseClient() {
  const { url, key, host } = supabaseConfig;
  if (!url || !key || host === 'invalid-url') {
    return null;
  }

  return url && key ? createClient(url, key) : null;
}

function getMessageText(body) {
  return String(body.message || body.prompt || body.text || '').trim();
}

function validateDashboardPin(pin) {
  return String(pin || '') === String(process.env.DASHBOARD_PIN || '2407');
}

function validateDeviceToken(token) {
  const expected = String(process.env.DEVICE_TOKEN || '').trim();
  return expected && String(token || '').trim() === expected;
}

function getDeviceToken(req) {
  const header = String(req.get('authorization') || '');
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return String(req.body.token || req.query.token || '').trim();
}

function extractTeachMemory(message, teachMode = false) {
  const text = message.trim().replace(/\s+/g, ' ');
  const explicit = text.match(/^(?:ajarkan|ajari|ingat|ingat ya|simpan)\s*:?\s+(.{3,240})$/i);
  if (explicit?.[1]) {
    return `Ajaran user: ${explicit[1].replace(/[.!?]+$/g, '').trim()}`;
  }

  if (teachMode) {
    return `Ajaran user: ${text.replace(/[.!?]+$/g, '').trim()}`;
  }

  const patterns = [
    {
      regex: /(?:nama\s+(?:saya|aku|gua|gw|ku)|namaku|nama ku)\s*(?:adalah|itu|:)?\s+(.{2,60})/i,
      format: (value) => `Nama user adalah ${value}`
    },
    {
      regex: /(?:panggil\s+(?:saya|aku|gua|gw)|panggil aja)\s+(.{2,60})/i,
      format: (value) => `Panggilan user adalah ${value}`
    },
    {
      regex: /(?:saya|aku|gua|gw)\s+suka\s+(.{2,80})/i,
      format: (value) => `User suka ${value}`
    }
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match?.[1]) {
      return pattern.format(match[1].replace(/[.!?]+$/g, '').trim());
    }
  }

  return '';
}

function promptKeywords(message) {
  const stopWords = new Set([
    'yang', 'dan', 'atau', 'ini', 'itu', 'saya', 'aku', 'gua', 'gw', 'kamu',
    'anda', 'tolong', 'coba', 'apa', 'siapa', 'kapan', 'dimana', 'berapa',
    'bagaimana', 'adalah', 'dengan', 'untuk', 'dari', 'ke', 'di'
  ]);

  return message
    .toLowerCase()
    .split(/[^a-z0-9\u00c0-\u024f]+/i)
    .filter((word) => word.length >= 4 && !stopWords.has(word));
}

function pickRelevantMemories(message, memories = []) {
  const keywords = promptKeywords(message);
  return memories
    .map((memory, index) => {
      const text = memory.memory_text || '';
      const lower = text.toLowerCase();
      const matches = keywords.filter((word) => lower.includes(word)).length;
      const identityBoost = /^(Nama user|Panggilan user)/i.test(text) ? 4 : 0;
      const teachBoost = lower.startsWith('ajaran user:') ? 1 : 0;
      return { ...memory, score: matches * 3 + identityBoost + teachBoost - index * 0.01 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function formatMemories(memories = [], maxChars = 1200) {
  const selected = [];
  let used = 0;
  for (const memory of memories) {
    const text = String(memory.memory_text || '').trim();
    if (!text || used + text.length > maxChars) continue;
    selected.push(text);
    used += text.length + 2;
  }
  return selected.join(', ');
}

async function loadAiContext(message) {
  if (!supabase) {
    return { history: [], memories: [], memoryText: '', deviceText: '' };
  }

  const [{ data: historyData }, { data: memoryData }, { data: statusData }] = await Promise.all([
    supabase
      .from('conversation')
      .select('role, content')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('user_memory')
      .select('memory_text')
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('device_status')
      .select('state,last_seen')
      .eq('id', 'esp32')
      .maybeSingle()
  ]);

  const history = (historyData || [])
    .reverse()
    .filter((item) => item.role && item.content)
    .map((item) => ({ role: item.role, content: item.content }));
  const memories = pickRelevantMemories(message, memoryData || []);

  return { history, memories, memoryText: formatMemories(memories), deviceText: formatDeviceState(statusData?.state, statusData?.last_seen) };
}

function formatDeviceState(state = {}, lastSeen = '') {
  if (!state || typeof state !== 'object') {
    return '';
  }

  const alarmTime = `${String(state.alarmHour ?? 6).padStart(2, '0')}:${String(state.alarmMinute ?? 0).padStart(2, '0')}`;
  const parts = [
    `lampu meja ${state.lamp ? 'nyala' : 'mati'}`,
    `RGB ${state.rgb ? 'nyala' : 'mati'} warna ${state.r ?? 90},${state.g ?? 160},${state.b ?? 255}`,
    `pintu ${state.door ? 'terbuka' : 'tertutup'}`,
    `smart TV/OLED ${state.tv ? 'nyala' : 'mati'}`,
    `alarm ${state.alarmEnabled ? 'aktif' : 'mati'} jam ${alarmTime}`,
    state.alarmRinging ? 'alarm sedang berbunyi' : 'alarm tidak berbunyi'
  ];

  return `${parts.join(', ')}${lastSeen ? `. Last seen: ${lastSeen}` : ''}`;
}

async function saveConversation(role, content) {
  if (!supabase || !content) return;
  await supabase.from('conversation').insert([{ role, content }]);
}

async function saveMemory(memoryText) {
  const clean = String(memoryText || '').replace(/[.!?]+$/g, '').trim();
  if (!supabase || !clean) return;
  await supabase.from('user_memory').insert([{ memory_text: clean }]);
}

async function saveDeviceEvent(message, commands) {
  if (!supabase) return;
  const rows = commands.map((command) => ({
    device: command.device,
    action: command.state || (command.enabled === false ? 'off' : 'set'),
    payload: command,
    source: 'ai',
    message
  }));
  if (rows.length) await supabase.from('device_events').insert(rows);
}

async function queueCommands(commands, source = 'remote', message = '') {
  if (!supabase) {
    throw new Error('Supabase env belum lengkap.');
  }

  const rows = commands.map((command) => ({
    payload: command,
    source,
    message
  }));

  if (!rows.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('commands')
    .insert(rows)
    .select('id, payload');

  if (error) throw error;
  await saveDeviceEvent(message, commands);
  return data || [];
}

async function deleteCommandIds(ids) {
  const cleanIds = ids.filter(Boolean);
  if (!cleanIds.length) {
    return;
  }

  const { error } = await supabase
    .from('commands')
    .delete()
    .in('id', cleanIds);

  if (error) throw error;
}

function normalizeQueuedCommand(row) {
  let payload = row.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (error) {
      payload = null;
    }
  }

  return { ...row, payload };
}

app.post('/auth', (req, res) => {
  if (!validateDashboardPin(req.body.pin)) {
    res.status(401).json({ ok: false, error: 'PIN salah' });
    return;
  }

  res.json({ ok: true });
});

app.post('/search', async (req, res) => {
  const query = String(req.body.query || '').trim();
  if (!query) {
    res.status(400).json({ ok: false, error: 'query is required' });
    return;
  }

  const result = await searchRealtime(query);
  res.json({ ok: true, result });
});

app.get('/memory', async (req, res) => {
  if (!supabase) {
    res.status(500).json({ ok: false, error: 'Supabase env belum lengkap.' });
    return;
  }

  const { data, error } = await supabase
    .from('user_memory')
    .select('id, memory_text, created_at')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.json({ ok: true, memories: data || [] });
});

app.delete('/memory', async (req, res) => {
  if (!supabase) {
    res.status(500).json({ ok: false, error: 'Supabase env belum lengkap.' });
    return;
  }

  const id = String(req.body.id || '').trim();
  if (!id) {
    res.status(400).json({ ok: false, error: 'memory id is required' });
    return;
  }

  const { error } = await supabase.from('user_memory').delete().eq('id', id);
  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.json({ ok: true });
});

app.post('/remote/command', async (req, res) => {
  try {
    if (!validateDashboardPin(req.body.pin)) {
      res.status(401).json({ ok: false, error: 'PIN salah' });
      return;
    }

    const command = normalizeCommand(req.body.command || req.body);
    if (!command) {
      res.status(400).json({ ok: false, error: 'Command tidak dikenal.' });
      return;
    }

    const queued = await queueCommands([command], 'remote', 'remote dashboard');
    res.json({ ok: true, queued });
  } catch (error) {
    console.error('Remote command failed:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/remote/clear', async (req, res) => {
  try {
    if (!validateDashboardPin(req.body.pin)) {
      res.status(401).json({ ok: false, error: 'PIN salah' });
      return;
    }
    if (!supabase) {
      res.status(500).json({ ok: false, error: 'Supabase env belum lengkap.' });
      return;
    }

    const { data, error } = await supabase
      .from('commands')
      .select('id, payload, executed')
      .limit(200);

    if (error) throw error;

    const deleteIds = (data || [])
      .map(normalizeQueuedCommand)
      .filter((row) => row.executed === true || row.payload?.device !== 'alarm')
      .map((row) => row.id);

    await deleteCommandIds(deleteIds);
    res.json({ ok: true, deleted: deleteIds.length });
  } catch (error) {
    console.error('Remote clear failed:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/remote/status', async (req, res) => {
  try {
    if (!validateDashboardPin(req.body.pin)) {
      res.status(401).json({ ok: false, error: 'PIN salah' });
      return;
    }
    if (!supabase) {
      res.status(500).json({ ok: false, error: 'Supabase env belum lengkap.' });
      return;
    }

    const id = String(req.body.id || '').trim();
    if (!id) {
      res.status(400).json({ ok: false, error: 'command id is required' });
      return;
    }

    const { data, error } = await supabase
      .from('commands')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    res.json({ ok: true, status: data ? 'queued' : 'done' });
  } catch (error) {
    console.error('Remote status failed:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/device/poll', async (req, res) => {
  try {
    if (!validateDeviceToken(getDeviceToken(req))) {
      res.status(401).json({ ok: false, error: 'DEVICE_TOKEN salah atau belum diset.' });
      return;
    }
    if (!supabase) {
      res.status(500).json({ ok: false, error: 'Supabase env belum lengkap.' });
      return;
    }

    const state = req.body.state && typeof req.body.state === 'object' ? req.body.state : {};
    const p1 = supabase.from('device_status').upsert({
      id: 'esp32',
      state,
      last_seen: new Date().toISOString()
    });
    const p2 = supabase
      .from('commands')
      .select('id, payload, source, message, created_at')
      .eq('executed', false)
      .order('created_at', { ascending: true })
      .limit(5);

    const [statusRes, { data, error }] = await Promise.all([p1, p2]);

    if (error) throw error;
    const commands = (data || [])
      .map(normalizeQueuedCommand)
      .filter((row) => row.payload && typeof row.payload === 'object');

    res.json({ ok: true, commands });
  } catch (error) {
    console.error('Device poll failed:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/device/status', async (req, res) => {
  if (!supabase) {
    res.json({ online: false, error: 'no supabase' });
    return;
  }
  try {
    const { data } = await supabase.from('device_status').select('last_seen,state').eq('id', 'esp32').single();
    if (!data) {
      res.json({ online: false });
      return;
    }
    const lastSeen = new Date(data.last_seen).getTime();
    const now = Date.now();
    res.json({ online: (now - lastSeen) < 15000, lastSeen: data.last_seen, state: data.state || {} });
  } catch (err) {
    res.json({ online: false, error: err.message });
  }
});

app.post('/device/ack', async (req, res) => {
  try {
    if (!validateDeviceToken(getDeviceToken(req))) {
      res.status(401).json({ ok: false, error: 'DEVICE_TOKEN salah atau belum diset.' });
      return;
    }
    const id = String(req.body.id || '').trim();
    if (!id) {
      res.status(400).json({ ok: false, error: 'command id is required' });
      return;
    }

    await deleteCommandIds([id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Device ack failed:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/chat', async (req, res) => {
  const userMessage = getMessageText(req.body);
  if (!userMessage) {
    res.status(400).json({ ok: false, error: 'message is required' });
    return;
  }

  const shouldSearch = Boolean(req.body.search) || /terbaru|hari ini|sekarang|internet|berita|cari/i.test(userMessage);
  const realtime = shouldSearch ? await searchRealtime(userMessage) : null;

  try {
    if (!process.env.GROQ_API_KEY) {
      res.status(500).json({ ok: false, reply: 'GROQ_API_KEY belum diisi di server.', commands: [] });
      return;
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const teachMemory = extractTeachMemory(userMessage, Boolean(req.body.teachMode));
    const { history, memoryText, deviceText } = await loadAiContext(userMessage);

    await saveConversation('user', userMessage);

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.15,
      messages: [
        {
          role: 'system',
          content: [
            'You are the Smart Room AI System assistant. Reply in concise Indonesian.',
            'Return only valid JSON with this shape:',
            '{"reply":"short response","commands":[]}',
            'commands must be an array. Use [] if no hardware action is needed.',
            'Supported commands only:',
            '{"device":"lamp","state":"on|off"}',
            '{"device":"rgb","state":"on|off"}',
            '{"device":"rgb","r":0-255,"g":0-255,"b":0-255}',
            '{"device":"door","state":"open|close"}',
            '{"device":"tv","state":"on|off"}',
            '{"device":"alarm","enabled":true,"hour":0-23,"minute":0-59}',
            '{"device":"alarm","enabled":false}',
            '{"device":"buzzer","state":"off"}',
            'Do not use fan or relay commands.',
            'If user gives a name, preference, or rule to remember, include "memory":"short memory text" in the JSON.',
            'For "mode tidur", turn lamp/rgb/tv off and optionally set alarm if user asks.',
            'For "buka pintu", use {"device":"door","state":"open"}.',
            'If user says they want to wake up at a time, set the alarm to that time. Example: "gua mau bangun jam 04.00" => {"device":"alarm","enabled":true,"hour":4,"minute":0}.',
            'When setting an alarm, keep reply short and mention the selected time.',
            deviceText ? `Current device state: ${deviceText}` : '',
            memoryText ? `Relevant long-term memories: ${memoryText}` : '',
            realtime ? `Realtime search context: ${JSON.stringify(realtime).slice(0, 3500)}` : ''
          ].join('\n')
        },
        ...history,
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices[0]?.message?.content || '{"reply":"Tidak ada respons.","commands":[]}';
    const parsed = JSON.parse(raw);
    let commands = normalizeCommands(parsed.commands || parsed.command);
    const alarmIntent = extractAlarmIntent(userMessage);
    if (alarmIntent && !hasAlarmCommand(commands)) {
      commands.push(alarmIntent);
    }
    const reply = String(parsed.reply || 'Siap.');
    const memoryToSave = teachMemory || parsed.memory || '';
    let queued = [];

    if (req.body.queue === true) {
      if (!validateDashboardPin(req.body.pin)) {
        res.status(401).json({ ok: false, reply: 'PIN salah.', commands: [] });
        return;
      }
      queued = await queueCommands(commands, 'ai', userMessage);
    }

    if (commands.length && process.env.ESP32_BASE_URL) {
      for (const command of commands) {
        await sendCommandToEsp32(command);
      }
    }

    await Promise.all([
      saveConversation('assistant', reply),
      saveMemory(memoryToSave),
      saveDeviceEvent(userMessage, commands)
    ]);

    res.json({ ok: true, reply, commands, queued, memorySaved: Boolean(memoryToSave) });
  } catch (error) {
    console.error('AI chat failed:', error);
    res.status(500).json({ ok: false, reply: 'AI gateway sedang bermasalah.', commands: [], error: error.message });
  }
});

function normalizeCommands(value) {
  const input = Array.isArray(value) ? value : value ? [value] : [];
  return input.map(normalizeCommand).filter(Boolean);
}

function extractAlarmIntent(message) {
  const text = String(message || '').toLowerCase();
  if (!/(bangun|alarm|ingatkan|wake|jadwal)/i.test(text)) {
    return null;
  }

  const match = text.match(/(?:jam|pukul|at)?\s*(\d{1,2})(?:[.:](\d{1,2}))?/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (/(malam|pm)/i.test(text) && hour >= 1 && hour <= 11) {
    hour += 12;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { device: 'alarm', enabled: true, hour, minute };
}

function hasAlarmCommand(commands = []) {
  return commands.some((command) => command.device === 'alarm');
}

function normalizeCommand(command) {
  if (!command || typeof command !== 'object') {
    return null;
  }

  const device = String(command.device || '').toLowerCase();
  const state = command.state === undefined ? undefined : String(command.state).toLowerCase();

  if (device === 'lamp') {
    return state === 'on' || state === 'off' ? { device, state } : null;
  }

  if (device === 'door' || device === 'smart_door' || device === 'pintu') {
    if (state === 'open' || state === 'unlock' || command.open === true) return { device: 'door', state: 'open' };
    if (state === 'close' || state === 'closed' || state === 'lock' || command.open === false) return { device: 'door', state: 'close' };
    return null;
  }

  if (device === 'tv' || device === 'oled' || device === 'smart_tv') {
    return state === 'on' || state === 'off' ? { device: 'tv', state } : null;
  }

  if (device === 'buzzer') {
    return state === 'off' ? { device, state: 'off' } : null;
  }

  if (device === 'rgb') {
    if (state === 'on' || state === 'off') {
      return { device, state };
    }

    const r = clampColor(command.r);
    const g = clampColor(command.g);
    const b = clampColor(command.b);
    if (r !== null && g !== null && b !== null) {
      return { device, r, g, b };
    }
  }

  if (device === 'alarm') {
    const hour = Number(command.hour);
    const minute = Number(command.minute);
    if (command.enabled === false && (command.hour === undefined || command.minute === undefined)) {
      return { device, enabled: false };
    }
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(minute) && minute >= 0 && minute <= 59) {
      return { device, enabled: command.enabled !== false, hour, minute };
    }
  }

  return null;
}

function clampColor(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Math.max(0, Math.min(255, Math.round(number)));
}

async function sendCommandToEsp32(command) {
  const response = await fetch(`${process.env.ESP32_BASE_URL}/api/command`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error(`ESP32 command failed: ${response.status}`);
  }
}

const port = Number(process.env.PORT || 8787);
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Smart Room AI Gateway listening on http://localhost:${port}`);
  });
}

export default app;
