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
          .pill.busy { color:#031018; border-color:#13e0ff; background:linear-gradient(135deg,#13e0ff,#168bff); box-shadow:0 0 24px rgba(16,216,255,.28); }
          .pill.busy::before { content:""; display:inline-block; width:10px; height:10px; margin-right:8px; border-radius:50%; border:2px solid rgba(3,16,24,.28); border-top-color:#031018; vertical-align:-1px; animation:spin .75s linear infinite; }
          .pill.done { color:#00150c; border-color:#35e886; background:#35e886; }
          .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; }
          .card { border:1px solid var(--line); background:linear-gradient(120deg,rgba(28,33,41,.96),rgba(14,18,24,.96)); border-radius:8px; padding:18px; box-shadow:0 20px 44px #0009, inset 0 1px rgba(255,255,255,.04); }
          button, input { border:1px solid #2a394a; background:#0b1119; color:var(--text); border-radius:7px; padding:12px 14px; font:inherit; min-height:44px; outline:none; }
          input:focus { border-color:#68cfff; box-shadow:0 0 0 3px rgba(16,216,255,.13); }
          button { cursor:pointer; width:100%; margin-top:8px; font-weight:900; letter-spacing:.4px; transition:transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease; }
          button:hover { transform:translateY(-1px); border-color:#79caff; }
          button.loading { position:relative; color:transparent !important; pointer-events:none; opacity:.94; }
          button.loading::after { content:""; position:absolute; left:50%; top:50%; width:18px; height:18px; margin:-9px 0 0 -9px; border-radius:50%; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation:spin .75s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
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
          .app-shell { width:100%; height:100vh; display:grid; grid-template-columns:300px minmax(0,1fr); gap:0; padding:0; }
          .sidebar { border-right:1px solid #202833; background:linear-gradient(90deg,#11151b 0,#0d1117 72%,#070a0f 100%); padding:28px 18px; display:flex; flex-direction:column; gap:16px; box-shadow:18px 0 60px #0008; }
          .brand-row { display:flex; align-items:center; gap:14px; padding:0 10px 24px; }
          .brand-row b { display:block; font-size:29px; line-height:.95; color:#b4dbff; text-shadow:0 0 18px rgba(68,175,255,.22); }
          .logo-mark { width:52px; height:52px; border-radius:11px; display:grid; place-items:center; overflow:hidden; background:#111a23; border:1px solid #2b3b4c; box-shadow:0 0 24px rgba(16,216,255,.28); }
          .logo-mark img { width:100%; height:100%; object-fit:cover; }
          .nav-item { padding:16px 18px; border-radius:7px; color:#858b97; background:transparent; border:0; text-align:left; margin:0; min-height:0; font-weight:800; font-size:17px; letter-spacing:.2px; }
          .nav-item.active, .nav-item:hover { background:linear-gradient(90deg,#1d222a,#15191f); color:#a8d6ff; box-shadow:inset 3px 0 #90cfff; }
          .side-bottom { margin-top:auto; display:grid; gap:8px; border-top:1px solid #202833; padding-top:18px; }
          .ram-stat { font-family:"Share Tech Mono", monospace; font-size:12px; color:#10d8ff; background:rgba(16,216,255,0.05); border:1px solid rgba(16,216,255,0.1); padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; }
          .ram-stat b { color: #fff; }
          .chat-pane { display:grid; grid-template-rows:72px 1fr; min-width:0; background:#111318; height: 100vh; }
          .topbar { height:72px; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:0 34px; border-bottom:1px solid #252a31; background:#111318; flex-shrink: 0; }
          .topbar b { font-family:Inter, system-ui, sans-serif; font-size:20px; color:#f4f7fb; letter-spacing:0; }
          .mobile-menu-toggle { display:none; }
          .mobile-top-logo { display:none; }
          .page { display:none; min-height:0; overflow:auto; padding:42px 48px; }
          .page.active { display:block; }
          .chat-page.active { display:flex; flex-direction:column; padding:0; overflow:hidden; height:100%; }
          .chat-log { flex: 1; overflow-y:auto; width:min(900px,100%); margin:0 auto; padding:48px 24px 24px; display:flex; flex-direction:column; gap:24px; min-height:0; scroll-behavior:smooth; }
          .bubble { max-width:100%; line-height:1.65; padding:12px 14px; border-radius:18px; white-space:pre-wrap; box-shadow:none; font-size:16px; }
          .bubble.assistant { position:relative; align-self:stretch; background:transparent; border:0; color:#eef4ff; padding-left:54px; }
          .bubble.assistant::before { content:""; position:absolute; left:4px; top:12px; width:34px; height:34px; border-radius:9px; background:url('/assets/logo.png') center/cover no-repeat, #111a23; border:1px solid #2b3b4c; box-shadow:0 0 16px rgba(16,216,255,.2); }
          .bubble.assistant::first-line { color:#eef4ff; }
          .bubble.user { align-self:flex-end; max-width:72%; background:#2c3037; border:1px solid #3a404a; }
          .composer { position:relative; width:min(900px,calc(100% - 48px)); margin:0 auto 18px; background:#24272d; border:1px solid #3a404a; border-radius:28px; padding:10px 12px; display:grid; grid-template-columns:1fr auto auto; gap:8px; align-items:center; box-shadow:0 18px 42px #0009; flex-shrink: 0; }
          .composer input { border:0; background:transparent; min-height:44px; font-size:16px; }
          .icon-btn { width:46px; min-width:46px; height:46px; min-height:46px; border-radius:999px; margin:0; padding:0; }
          .voice-status { position:absolute; left:18px; right:18px; bottom:calc(100% + 10px); display:none; align-items:center; gap:10px; color:#dceaff; background:#20242b; border:1px solid #3a4452; border-radius:999px; padding:10px 14px; width:max-content; max-width:calc(100% - 36px); box-shadow:0 18px 36px #0009; }
          .voice-status.show { display:flex; }
          .voice-dot { width:10px; height:10px; border-radius:50%; background:#ff4d75; box-shadow:0 0 0 0 rgba(255,77,117,.65); animation:pulse-record 1.1s infinite; }
          @keyframes pulse-record { 70% { box-shadow:0 0 0 12px rgba(255,77,117,0); } 100% { box-shadow:0 0 0 0 rgba(255,77,117,0); } }
          .tools-page-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin:0 0 34px; }
          .tools-page-head h2 { margin:0 0 6px; font-size:clamp(38px,5vw,64px); }
          .tools-grid { display:grid; grid-template-columns:repeat(2,minmax(260px,1fr)); gap:24px; max-width:1180px; }
          .tool-card.device-card { min-height:250px; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(110deg,rgba(28,33,41,.96),rgba(16,22,30,.96)); border-color:#26384b; position:relative; overflow:hidden; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
          .tool-card.device-card.active-glow { border-color: #10d8ff; box-shadow: 0 0 30px rgba(16, 216, 255, 0.15), inset 0 0 20px rgba(16, 216, 255, 0.05); }
          .tool-card.device-card.active-glow::after { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at center, rgba(16, 216, 255, 0.08) 0%, transparent 70%); pointer-events: none; }
          .device-icon.active-anim { animation: icon-pulse 2s infinite; color: #10d8ff; border-color: #10d8ff; box-shadow: 0 0 15px rgba(16, 216, 255, 0.4); }
          @keyframes icon-pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
          
          .system-log-container { grid-column: span 2; background: #05080c; border: 1px solid #1a2632; border-radius: 12px; padding: 16px; font-family: "Share Tech Mono", monospace; height: 180px; display: flex; flex-direction: column; gap: 8px; }
          .log-title { color: #10d8ff; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; display: flex; justify-content: space-between; }
          .log-content { flex: 1; overflow-y: auto; font-size: 13px; color: #858b97; scrollbar-width: none; }
          .log-line { margin-bottom: 4px; border-left: 2px solid #1a2632; padding-left: 8px; animation: log-entry 0.3s ease-out; }
          .log-line.cmd { color: #edf2ff; border-color: #10d8ff; }
          .log-line.success { color: #35e886; border-color: #35e886; }
          @keyframes log-entry { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

          .routine-grid { grid-column: span 2; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
          .routine-btn { background: rgba(16, 155, 255, 0.05); border: 1px solid rgba(16, 155, 255, 0.2); color: #159bff; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .routine-btn:hover { background: rgba(16, 155, 255, 0.1); border-color: #159bff; transform: translateY(-2px); }
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
          .mobile-drawer-brand, .mobile-drawer-bottom { display:none; }
          .alarm-page { display:none; padding:0; height: 100%; }
          .alarm-page.active { display:grid; place-items:center; height:100%; width:100%; padding:48px; }
          .alarm-hero { width:100%; max-width:1200px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
          .alarm-hero > .tool-title { grid-column: 1 / -1; font-size:52px; margin-bottom:32px; display:flex; justify-content:space-between; align-items:center; font-family:Orbitron, sans-serif; letter-spacing:2px; color:#10d8ff; text-shadow:0 0 24px rgba(16,216,255,0.3); }
          .alarm-picker { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin:0; }
          .picker-column { background:rgba(5, 8, 12, 0.8); border:1px solid rgba(16, 216, 255, 0.2); border-radius:24px; padding:32px; position:relative; overflow:hidden; backdrop-filter:blur(20px); box-shadow:0 24px 60px #000a; }
          .picker-label { text-align:center; color:#10d8ff; font-family:Orbitron, sans-serif; font-size:18px; font-weight:800; margin-bottom:24px; letter-spacing:4px; opacity: 0.8; }
          .picker-list { height:380px; overflow-y:auto; scroll-snap-type:y mandatory; display:grid; gap:12px; padding:150px 4px; scrollbar-width:none; scroll-behavior:smooth; }
          .picker-option { min-height:80px; border:0; background:transparent; color:#3d4652; border-radius:16px; font-family:Orbitron, sans-serif; font-size:46px; font-weight:800; scroll-snap-align:center; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer; width:100%; display:grid; place-items:center; }
          .picker-option.active { color:#00080d; background:linear-gradient(135deg,#10d8ff,#168bff); transform:scale(1.1); box-shadow:0 0 50px rgba(16,216,255,0.6); }
          .alarm-settings { border:0; padding:42px; display:flex; flex-direction:column; gap:32px; background:rgba(15, 23, 30, 0.6); border-radius:24px; border:1px solid rgba(255, 255, 255, 0.05); backdrop-filter:blur(20px); align-self: center; box-shadow:0 24px 60px #000a; }
          .days { display:grid; grid-template-columns:repeat(7,1fr); gap:12px; }
          .days span { text-align:center; color:#5d6672; font-size:16px; padding:20px 0; border-radius:12px; background:#111a24; border:1px solid #1a2632; font-weight:800; cursor:pointer; transition:all 0.2s; }
          .days span.active { color:#00080d; background:#10d8ff; border-color:#10d8ff; box-shadow:0 0 25px rgba(16,216,255,0.4); }
          .field { display:grid; gap:14px; color:#9aa3b2; font-family:"Share Tech Mono", monospace; text-transform:uppercase; font-size:14px; letter-spacing:1px; }
          .field input { width:100%; background:#05080c; border:1px solid #1a2632; border-radius:12px; padding:20px; color:var(--text); font-family:Inter, sans-serif; font-size:18px; }
          .alarm-actions { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
          .alarm-actions button { min-height:64px; font-size:16px; font-weight:900; letter-spacing:1px; text-transform:uppercase; border-radius:12px; transition:all 0.2s; }
          
          @media (max-width:1100px) {
            .app-shell { grid-template-columns: 240px minmax(0, 1fr); }
            .tools-grid { grid-template-columns: 1fr; }
            .system-log-container, .routine-grid { grid-column: span 1; }
          }
          
          @media (max-width:980px) { 
            body { overflow:auto; padding-bottom:0; } 
            .app-shell { height:auto; min-height:100vh; grid-template-columns:1fr; } 
            .sidebar { display:none; } 
            .chat-pane { min-height:100vh; grid-template-rows:72px 1fr; background:#111318; } 
            .page { padding:24px 16px; } 
            .tools-grid { grid-template-columns: 1fr !important; gap: 20px; width: 100%; padding-bottom: 40px; }
            .tool-card.device-card { grid-column: auto !important; width: 100% !important; min-height: unset; padding: 20px; border-radius: 16px; }
            .tool-top { margin-bottom: 16px; }
            .device-icon { width: 48px; height: 48px; border-radius: 12px; }
            .tool-copy b { font-size: 20px; margin-bottom: 4px; }
            .tool-desc { font-size: 11px; }
            .control-row { gap: 10px; }
            .control-row button { min-height: 50px; font-size: 14px; }
            .color-control { grid-template-columns: 60px 1fr; gap: 10px; margin-top: 12px; }
            .color-control button { min-height: 44px; font-size: 13px; }
            .routine-grid { grid-column: auto !important; grid-template-columns: repeat(2, 1fr) !important; gap: 12px; width: 100%; margin-bottom: 20px; }
            .routine-grid button:last-child { grid-column: span 2 !important; }
            .system-log-container { grid-column: auto !important; height: 220px; width: 100%; }
            .topbar { position:sticky; top:0; z-index:6; height:72px; padding:0 16px; justify-content:flex-start; background:#111318f2; backdrop-filter:blur(16px); } 
            .topbar b { font-family:Inter, system-ui, sans-serif; font-size:18px; color:#f4f7fb; }
            .mobile-menu-toggle { display:grid; place-items:center; width:44px; height:44px; border-radius:10px; background:#1a212c; border:1px solid #2c3b4c; color:#10d8ff; margin-right: 12px; }
            .mobile-top-logo { display:block; width:34px; height:34px; border-radius:9px; object-fit:cover; border:1px solid #2b3b4c; box-shadow:0 0 18px rgba(16,216,255,.24); margin-right: 12px; }
            #clearButton { display:none !important; }
            
            .alarm-page.active { padding: 20px; }
            .alarm-hero { grid-template-columns: 1fr !important; gap: 32px; padding: 0; }
            .alarm-hero > .tool-title { font-size: 32px; margin-bottom: 0; }
            .alarm-settings { align-self: stretch !important; padding: 24px; gap: 24px; }
            .picker-list { height: 220px !important; padding: 80px 4px !important; }
            .picker-option { min-height: 58px !important; font-size: 32px !important; }

            .settings-list { grid-template-columns: 1fr; }
            .settings-row { min-height: unset; flex-direction: column; align-items: flex-start; gap: 12px; }

            .mobile-nav { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.5); display:none; backdrop-filter:blur(8px); }
            .mobile-nav.open { display:block; }
            .mobile-nav .drawer { width:280px; height:100%; background:#080b11; border-right:1px solid #1a2632; padding:32px 20px; display:flex; flex-direction:column; gap:16px; animation: slide-in 0.3s ease-out; }
            @keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
            .mobile-nav button { text-align:left; padding:14px 18px; border-radius:8px; font-weight:800; color:#858b97; background:transparent; border:0; font-size:16px; }
            .mobile-nav button.active { background:linear-gradient(90deg,#1d222a,#15191f); color:#10d8ff; box-shadow:inset 3px 0 #10d8ff; }
            .mobile-drawer-brand { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
            .mobile-drawer-bottom { margin-top:auto; display:flex; flex-direction:column; gap:10px; border-top:1px solid #1a2632; padding-top:20px; }
          }
          .settings-list { display:grid; grid-template-columns:1fr 1fr; gap:24px; max-width:1120px; }
          .settings-row { border:1px solid #293846; background:linear-gradient(120deg,#11161d,#0a0f15); border-radius:12px; padding:26px; display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:150px; box-shadow:0 18px 44px #0008; }
          .settings-shell { display:grid; grid-template-columns:220px minmax(0,1fr); gap:24px; max-width:1180px; min-height:620px; }
          .settings-menu { border:1px solid #242d38; border-radius:18px; background:linear-gradient(180deg,rgba(25,29,36,.92),rgba(12,16,22,.92)); padding:14px; box-shadow:0 26px 60px #0008; align-self:start; position:sticky; top:20px; }
          .settings-tab { width:100%; margin:0 0 8px; min-height:46px; display:flex; align-items:center; gap:12px; padding:0 14px; border:0; border-radius:11px; background:transparent; color:#a6adbb; font-weight:850; letter-spacing:0; text-align:left; }
          .settings-tab.active, .settings-tab:hover { background:#2a2d33; color:#fff; transform:none; }
          .settings-tab span:first-child { width:24px; text-align:center; color:#c8f4ff; }
          .settings-content { border:1px solid #242d38; border-radius:18px; background:linear-gradient(145deg,rgba(25,29,36,.75),rgba(9,12,17,.86)); box-shadow:0 28px 70px #0009; overflow:hidden; }
          .settings-titlebar { padding:22px 28px; border-bottom:1px solid #2a3038; display:flex; align-items:center; justify-content:space-between; gap:14px; }
          .settings-titlebar h2 { font-size:22px; letter-spacing:0; }
          .settings-group { padding:10px 28px 28px; }
          .settings-alert { margin:12px 0 10px; border:1px solid #26313c; border-radius:16px; padding:20px; background:#020304; display:flex; justify-content:space-between; gap:18px; align-items:flex-start; }
          .settings-alert b { display:block; margin-bottom:8px; }
          .settings-alert .sub { color:#e8eef8; max-width:620px; font-size:15px; }
          .settings-list { display:block; max-width:none; }
          .settings-row { min-height:0; border:0; border-radius:0; background:transparent; box-shadow:none; padding:20px 0; border-bottom:1px solid #262c34; display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:24px; }
          .settings-row:last-child { border-bottom:0; }
          .settings-row b { font-size:16px; }
          .settings-row input { width:100%; margin-top:10px; background:#111821; border-color:#303b49; }
          .settings-actions { min-width:190px; display:grid; gap:8px; }
          .settings-actions button { margin:0; }
          .settings-chips { display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; }
          .settings-danger { margin-top:18px; border:1px solid rgba(255,77,117,.42); border-radius:15px; padding:18px; background:linear-gradient(120deg,rgba(70,12,26,.24),rgba(8,10,15,.78)); display:grid; grid-template-columns:1fr 220px; align-items:center; gap:18px; }
          .settings-danger button { margin:0; border-color:#ff4d75; color:#ffd4de; }
          .wifi-network-list { display:grid; gap:8px; margin-top:12px; }
          @media (max-width:980px) {
            .settings-shell { grid-template-columns:1fr; gap:14px; min-height:0; }
            .settings-menu { position:static; display:grid; grid-template-columns:repeat(2,1fr); gap:8px; padding:10px; }
            .settings-tab { margin:0; min-height:42px; padding:0 12px; font-size:14px; }
            .settings-content { border-radius:16px; }
            .settings-titlebar { padding:18px 20px; }
            .settings-group { padding:8px 20px 22px; }
            .settings-alert { flex-direction:column; padding:18px; }
            .settings-row { grid-template-columns:1fr; gap:12px; padding:18px 0; }
            .settings-actions { width:100%; min-width:0; }
            .settings-chips { justify-content:flex-start; }
            .settings-danger { grid-template-columns:1fr; padding:18px; }
          }
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
          @media (max-width:980px) { 
            body { overflow:auto; padding-bottom:0; } 
            .app-shell { height:auto; min-height:100vh; grid-template-columns:1fr; } 
            .sidebar { display:none; } 
            .chat-pane { min-height:100vh; grid-template-rows:72px 1fr; background:#111318; } 
            .page { padding:20px 16px; } 
            .tools-grid { grid-template-columns: 1fr; gap: 16px; }
            .routine-grid { grid-template-columns: repeat(2, 1fr); }
            .routine-grid button:last-child { grid-column: span 2; }
            .system-log-container { grid-column: span 1; }
            .topbar { position:sticky; top:0; z-index:6; height:72px; padding:0 16px; justify-content:flex-start; background:#111318f2; backdrop-filter:blur(16px); } .topbar b { font-family:Inter, system-ui, sans-serif; font-size:20px; letter-spacing:0; color:#f4f7fb; } .topbar > div { min-width:0; flex:1; } .mobile-top-logo { display:block; width:34px; height:34px; border-radius:9px; object-fit:cover; border:1px solid #2b3b4c; box-shadow:0 0 18px rgba(16,216,255,.24); } #clearButton { display:none !important; } .mobile-menu-toggle { display:grid; place-items:center; flex:0 0 auto; width:48px; min-width:48px; height:48px; min-height:48px; margin:0; padding:0; border-radius:12px; font-size:28px; line-height:1; background:#101823; border-color:#2c4358; color:#c9eeff; box-shadow:0 10px 24px #0008; } .chat-page.active { min-height:calc(100vh - 72px); grid-template-rows:1fr auto; } .chat-log { width:100%; padding:22px 16px 18px; gap:18px; } .bubble { max-width:88%; box-shadow:none; font-size:15px; line-height:1.55; } .bubble.assistant { align-self:flex-start; padding:8px 6px 8px 48px; } .bubble.assistant::before { left:0; top:8px; } .bubble.user { align-self:flex-end; background:#2b2f36; border:1px solid #3a404a; border-radius:18px; padding:12px 14px; } .composer { position:sticky; bottom:0; width:100%; margin:0; padding:12px 14px; border-radius:0; border-width:1px 0 0; background:#111318f2; backdrop-filter:blur(16px); grid-template-columns:1fr auto auto; box-shadow:0 -18px 40px #0008; } .composer input { min-height:48px; padding:0 2px; font-size:15px; } .icon-btn { width:46px; min-width:46px; height:46px; min-height:46px; border-radius:999px; font-size:12px; } .tools-grid { grid-template-columns:1fr; } .tool-card.device-card:first-child { grid-column:auto; } .settings-list { grid-template-columns:1fr; } .alarm-page { width:min(100%,420px); padding:18px 12px 40px; } .alarm-hero { padding:22px 20px; border-radius:16px; } .alarm-picker { gap:14px; margin:28px 0 22px; } .picker-column { padding:14px 10px; } .picker-list { height:188px; scroll-behavior:smooth; } .picker-option { min-height:48px; font-size:24px; } .alarm-settings { gap:16px; } .mobile-nav { position:fixed; inset:0 auto 0 0; z-index:7; display:flex; flex-direction:column; gap:14px; width:min(320px,84vw); padding:28px 18px; border-right:1px solid #202833; border-radius:0; background:linear-gradient(90deg,#11151b 0,#0d1117 72%,#070a0f 100%); box-shadow:18px 0 60px #000c; opacity:1; transform:translateX(-104%); pointer-events:none; transition:transform .24s ease; } .mobile-nav.open { transform:translateX(0); pointer-events:auto; } .mobile-drawer-brand { display:flex; align-items:center; gap:14px; padding:0 10px 24px; } .mobile-drawer-brand b { display:block; font-size:29px; line-height:.95; color:#b4dbff; text-shadow:0 0 18px rgba(68,175,255,.22); } .mobile-drawer-bottom { display:grid; gap:10px; margin-top:auto; border-top:1px solid #202833; padding-top:18px; } .mobile-nav button { min-height:0; margin:0; padding:16px 18px; font-size:17px; border-radius:7px; text-align:left; color:#858b97; background:transparent; border:0; } .mobile-nav button.active { background:linear-gradient(90deg,#1d222a,#15191f); color:#a8d6ff; box-shadow:inset 3px 0 #90cfff; } .mobile-drawer-bottom button { text-align:center; color:#edf6ff; border:1px solid #334457; background:#090d12; } .locked .mobile-nav, .locked .mobile-menu-toggle, .locked .mobile-top-logo { display:none; } }
          @media (max-width:560px) { 
            h1 { font-size:32px; } 
            .pad { grid-template-columns:repeat(3,88px); gap:12px; } 
            .pad button { min-height:88px; font-size:32px; } 
            .tools-page-head h2 { font-size:32px; } 
            .tool-card.device-card { padding: 16px; }
            .tool-copy b { font-size: 18px; }
            .control-row button { min-height: 46px; font-size: 13px; }
            .time-row { font-size:38px; } 
            .time-row input { width:64px; font-size:32px; } 
          }
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
              <div class="ram-stat"><span>ESP HEAP</span><b id="ramValSidebar">-- KB</b></div>
              <div class="pill" id="espStatus" style="border-color:#551111;color:#ff5555;background:#1a0505;">ESP Offline</div>
              <div class="pill" id="status">Cloud ready</div>
              <button class="dark" onclick="lockAgain()">LOCK</button>
            </div>
          </aside>
          <section class="chat-pane">
            <div class="topbar"><button class="mobile-menu-toggle" onclick="toggleMobileNav()" aria-label="Open navigation">≡</button><img class="mobile-top-logo" src="/assets/logo.png" alt="Smart Room logo"><div><b id="pageTitle">AI Assistant</b><div class="sub" id="pageSubtitle">Command terminal and voice control</div></div><button class="dark mono" id="clearButton" onclick="clearPending()" style="max-width:170px;margin:0">CLEAR PENDING</button></div>
            <section class="page chat-page active" id="chatPage">
              <div class="chat-log" id="chatLog">
                <div class="bubble assistant">&gt; Smart Room AI online.
Halo, aku siap bantu kontrol Smart Room. Kamu bisa ketik atau tekan voice untuk memberi perintah.</div>
              </div>
              <div class="composer">
                <div class="voice-status" id="voiceStatus"><span class="voice-dot"></span><span>Sedang merekam...</span></div>
                <input id="cmd" placeholder="Ask anything or command your room">
                <button class="icon-btn blue" onclick="voiceAi()" title="Voice AI">MIC</button>
                <button class="icon-btn primary" onclick="askAi()" title="Send">GO</button>
              </div>
              <div id="reply" style="display:none">Gateway ready</div>
            </section>
            <section class="page" id="toolsPage">
              <div class="tools-page-head"><div><h2>Environment Control</h2><div class="sub">4 active nodes in primary room zone.</div></div><button class="dark mono" onclick="checkEspStatus()" style="max-width:140px;margin:0">REFRESH</button></div>
              <div class="tools-grid">
                <div class="routine-grid">
                  <button class="routine-btn" onclick="runRoutine('sleep')">🌙 SLEEP MODE</button>
                  <button class="routine-btn" onclick="runRoutine('study')">📚 STUDY MODE</button>
                  <button class="routine-btn" onclick="runRoutine('leave')">🚪 LEAVE HOME</button>
                </div>
                <article class="tool-card device-card" id="card-lamp">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon" id="icon-lamp">LOCK</div><div class="tool-copy"><b>Desk Lamp</b><div class="tool-desc">Main desk light control</div></div></div><span class="state-chip" id="lampState">OFF</span></div></div>
                  <div class="control-row"><button class="primary" onclick="queue({device:'lamp',state:'on'})">ON</button><button class="dark" onclick="queue({device:'lamp',state:'off'})">OFF</button></div>
                </article>
                <article class="tool-card device-card" id="card-rgb">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon blue-icon" id="icon-rgb">RGB</div><div class="tool-copy"><b>RGB Room</b><div class="tool-desc">Mood light and room color</div></div></div><span class="state-chip" id="rgbState">OFF</span></div><div class="color-control"><input id="color" type="color" value="#10ddea"><button class="blue" onclick="rgbColor()">SET COLOR</button></div></div>
                  <div class="control-row"><button class="primary" onclick="queue({device:'rgb',state:'on'})">ON</button><button class="dark" onclick="queue({device:'rgb',state:'off'})">OFF</button></div>
                </article>
                <article class="tool-card device-card" id="card-door">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon green-icon" id="icon-door">DR</div><div class="tool-copy"><b>Main Entrance</b><div class="tool-desc">Smart lock servo with auto close</div></div></div><span class="state-chip" id="doorState">CLOSED</span></div></div>
                  <div class="control-row"><button class="primary" onclick="queue({device:'door',state:'open'})">OPEN</button><button class="dark" onclick="queue({device:'door',state:'close'})">CLOSE</button></div>
                </article>
                <article class="tool-card device-card" id="card-tv">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon blue-icon" id="icon-tv">TV</div><div class="tool-copy"><b>Smart TV</b><div class="tool-desc">OLED screen and animation</div></div></div><span class="state-chip" id="tvState">OFF</span></div></div>
                  <div class="control-row" style="grid-template-columns: 1fr 1fr 1fr;">
                    <button class="primary" onclick="queue({device:'tv',state:'on'})">ON</button>
                    <button class="blue" onclick="queue({device:'tv',state:'fight'})">FIGHT</button>
                  </div>
                  <div class="control-row" style="grid-template-columns: 1fr 1fr;">
                    <button class="blue" onclick="queue({device:'tv',state:'cat'})">CAT</button>
                    <button class="blue" onclick="queue({device:'tv',state:'stikman'})">STIKMAN</button>
                  </div>
                  <div class="control-row">
                    <button class="blue" onclick="queue({device:'tv',state:'kacau'})">KACAU</button>
                    <button class="blue" onclick="queue({device:'tv',state:'kenzie'})">KENZIE</button>
                  </div>
                  <div class="control-row">
                    <button class="blue" onclick="queue({device:'tv',state:'happy'})">HAPPY</button>
                    <button class="dark" onclick="queue({device:'tv',state:'off'})">OFF</button>
                  </div>
                </article>
                <article class="tool-card device-card">
                  <div><div class="tool-top"><div class="tool-identity"><div class="device-icon gold-icon">DM</div><div class="tool-copy"><b>Demo Mode</b><div class="tool-desc">RGB, Smart TV, then door sequence</div></div></div><span class="state-chip on">EXPO</span></div></div>
                  <button class="primary" onclick="demoMode()">RUN DEMO</button>
                </article>
                <div class="system-log-container">
                  <div class="log-title"><span>System Activity Log</span><span id="log-status" style="font-size:10px;opacity:0.6">Streaming...</span></div>
                  <div class="log-content" id="systemLog">
                    <div class="log-line">System initialized and ready for simulation.</div>
                  </div>
                </div>
              </div>
            </section>
            <section class="page alarm-page" id="alarmPage">
              <div class="alarm-hero">
                <div class="tool-title">Scheduler <span class="state-chip" id="alarmState">OFF</span></div>
                <input class="alarm-hidden" id="alarmHour" type="number" min="0" max="23" value="06" style="display:none">
                <input class="alarm-hidden" id="alarmMinute" type="number" min="0" max="59" value="00" style="display:none">
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
              <div class="settings-shell">
                <aside class="settings-menu">
                  <button class="settings-tab active"><span>⚙</span> General</button>
                  <button class="settings-tab"><span>☁</span> Cloud</button>
                  <button class="settings-tab"><span>⌁</span> Network</button>
                  <button class="settings-tab"><span>▣</span> Local Edge</button>
                  <button class="settings-tab"><span>!</span> Maintenance</button>
                </aside>
                <div class="settings-content">
                  <div class="settings-titlebar">
                    <h2>General</h2>
                    <span class="state-chip on">SYSTEM READY</span>
                  </div>
                  <div class="settings-group">
                    <div class="settings-alert">
                      <div>
                        <b>Secure your Smart Room</b>
                        <div class="sub">PIN protects the cloud dashboard. Device token and private API keys stay hidden on the server.</div>
                      </div>
                      <span class="state-chip on">PIN ACTIVE</span>
                    </div>
                    <div class="settings-list">
                      <div class="settings-row"><div><b>Remote Dashboard</b><div class="sub">Vercel remote control from inside or outside network</div></div><span class="state-chip on">SYNC ACTIVE</span></div>
                      <div class="settings-row"><div><b>Telemetry Polling</b><div class="sub">ESP checks cloud about every 500ms</div></div><span class="state-chip on">0.5 SEC</span></div>
                      <div class="settings-row"><div><b>WiFi Station</b><div class="sub" id="wifiCloudInfo">Waiting ESP telemetry</div><div class="sub" id="wifiStrongestInfo">Strongest network: -</div><div class="sub" id="wifiApInfo">Hotspot: off</div></div><div class="settings-chips"><span class="state-chip" id="wifiCloudState">OFFLINE</span><span class="state-chip" id="wifiModeState">WIFI</span></div></div>
                      <div class="settings-row"><div><b>Change WiFi</b><div class="sub">Pick a scanned network from ESP, or type SSID manually.</div><input id="cloudWifiSsid" placeholder="SSID"><input id="cloudWifiPass" type="password" placeholder="Password"><div id="cloudWifiList" class="wifi-network-list"></div></div><div class="settings-actions"><button class="primary" id="scanWifiButton" onclick="scanWifiCloud()">SCAN</button><button class="dark" id="stopWifiScanButton" onclick="stopWifiScanCloud()">STOP SCAN</button><button class="blue" id="connectWifiButton" onclick="connectWifiCloud()">CONNECT</button><button class="dark" onclick="setWifiModeCloud('wifi')">WIFI MODE</button><button class="dark" onclick="setWifiModeCloud('hotspot')">HOTSPOT MODE</button></div></div>
                      <div class="settings-row"><div><b>Local Edge Dashboard</b><div class="sub">IP address shows firmware dashboard, so upload sketch after local UI changes</div></div><span class="state-chip">LOCAL</span></div>
                    </div>
                    <div class="settings-danger">
                      <div><b>Clear Pending Commands</b><div class="sub">Use this if a command queue gets stuck or an old command keeps repeating.</div></div>
                      <button class="dark mono" onclick="clearPending()">CLEAR PENDING</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </main>
        <nav class="mobile-nav" id="mobileNav">
          <div class="drawer">
            <div class="mobile-drawer-brand"><div class="logo-mark"><img src="/assets/logo.png" alt="Smart Room logo"></div><div><b>KEMI OS</b><div class="sub mono">Online</div></div></div>
            <button class="active" data-page="chat" onclick="showPage('chat')">AI Assistant</button>
            <button data-page="tools" onclick="showPage('tools')">Devices</button>
            <button data-page="alarm" onclick="showPage('alarm')">Scheduler</button>
            <button data-page="settings" onclick="showPage('settings')">Settings</button>
            <div class="mobile-drawer-bottom">
              <div class="ram-stat"><span>ESP HEAP</span><b id="ramValMobile">-- KB</b></div>
              <div class="pill" id="espStatusMob" style="border-color:#551111;color:#ff5555;background:#1a0505;">ESP Offline</div>
              <div class="pill" id="statusMob">Cloud ready</div>
              <button class="dark" onclick="lockAgain()">LOCK</button>
            </div>
          </div>
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
          let pickerRendering = false;
          let pickerWarping = false;
          function redraw() {
            const isOpen = unlocked();
            document.body.classList.toggle('locked', !isOpen);
            lock.classList.toggle('hidden', isOpen);
            [...dots.children].forEach((dot, i) => dot.classList.toggle('on', i < pin.value.length));
            if (!isOpen) setTimeout(() => pin.focus(), 80);
            if (isOpen) {
              const activePage = document.querySelector('.page.active');
              if (activePage && activePage.id === 'alarmPage') {
                renderAlarmPicker();
              }
            }
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
          function toggleMobileNav() {
            mobileNav.classList.toggle('open');
          }
          function setVoiceRecording(isRecording) {
            voiceStatus.classList.toggle('show', Boolean(isRecording));
          }
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
            mobileNav.classList.remove('open');
            if (name === 'alarm') {
              renderAlarmPicker();
            }
            if (name !== 'chat') checkEspStatus();
          }
          function setStatus(text, mode = '') {
            const inferred = mode || (/sending|queued|switching|scan|clearing|merekam|waiting/i.test(text) ? 'busy' : (/done|ready|cleared|online|connected/i.test(text) ? 'done' : ''));
            [document.getElementById('status'), document.getElementById('statusMob')].filter(Boolean).forEach((item) => {
              item.textContent = text;
              item.classList.remove('busy', 'done');
              if (inferred) item.classList.add(inferred);
            });
          }
          function activeButtonFallback() {
            return document.activeElement && document.activeElement.tagName === 'BUTTON' ? document.activeElement : null;
          }
          function setButtonLoading(button, loading, text = 'SENDING') {
            if (!button) return;
            if (loading) {
              button.dataset.originalText = button.dataset.originalText || button.textContent;
              button.textContent = text;
              button.disabled = true;
              button.classList.add('loading');
            } else {
              button.disabled = false;
              button.classList.remove('loading');
              if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
              }
            }
          }
          function scrollToBottom(force = false) {
            const threshold = 150;
            const isNearBottom = chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < threshold;
            if (force || isNearBottom) {
              requestAnimationFrame(() => {
                chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' });
              });
            }
          }
          function addBubble(role, text) {
            while (chatLog.children.length > 30) {
              chatLog.removeChild(chatLog.firstChild);
            }
            const bubble = document.createElement('div');
            bubble.className = 'bubble ' + role;
            bubble.textContent = text;
            chatLog.appendChild(bubble);
            scrollToBottom(true);
          }
          function setChip(element, isOn, onText, offText) {
            element.textContent = isOn ? onText : offText;
            element.classList.toggle('on', Boolean(isOn));
          }
          function two(number) {
            return String(Math.max(0, Math.min(99, Number(number) || 0))).padStart(2, '0');
          }
          function setAlarmPicker(part, value, fromScroll = false) {
            alarmEditing = true;
            const limit = part === 'hour' ? 24 : 60;
            value = ((Number(value) % limit) + limit) % limit;
            if (part === 'hour') {
              alarmHour.value = two(value);
            } else {
              alarmMinute.value = two(value);
            }
            if (!fromScroll) renderAlarmPicker('force_scroll');
            else updatePickerActiveOnly(part, value);
          }
          function updatePickerActiveOnly(part, value) {
            const list = part === 'hour' ? hourPicker : minutePicker;
            list.querySelectorAll('.picker-option').forEach(opt => {
              opt.classList.toggle('active', Number(opt.dataset.value) === value);
            });
          }
          function syncPickerFromScroll(part) {
            const list = part === 'hour' ? hourPicker : minutePicker;
            if (pickerRendering || pickerWarping) return;
            const buttons = [...list.querySelectorAll('.picker-option')];
            const listCenter = list.getBoundingClientRect().top + list.clientHeight / 2;
            let closest = null;
            let closestDistance = Infinity;
            buttons.forEach((button) => {
              const rect = button.getBoundingClientRect();
              const distance = Math.abs((rect.top + rect.height / 2) - listCenter);
              if (distance < closestDistance) {
                closestDistance = distance;
                closest = button;
              }
            });
            if (closest) setAlarmPicker(part, Number(closest.dataset.value), true);
          }
          function onPickerScroll(part) {
            if (pickerRendering || pickerWarping) return;
            alarmEditing = true;
            normalizePickerLoop(part);
            syncPickerFromScroll(part);
          }
          function normalizePickerLoop(part) {
            const list = part === 'hour' ? hourPicker : minutePicker;
            const count = part === 'hour' ? 24 : 60;
            const option = list.querySelector('.picker-option');
            if (!option) return;
            const row = option.offsetHeight + 10;
            const span = row * count;
            if (list.scrollTop < span * 0.4 || list.scrollTop > span * 1.6) {
              pickerWarping = true;
              list.scrollTop = list.scrollTop < span ? list.scrollTop + span : list.scrollTop - span;
              requestAnimationFrame(() => { pickerWarping = false; });
            }
          }
          function renderAlarmPicker() {
            const selectedHour = Number(alarmHour.value) || 0;
            const selectedMinute = Number(alarmMinute.value) || 0;
            const isInitial = hourPicker.children.length === 0;
            
            if (!isInitial) {
              updatePickerActiveOnly('hour', selectedHour);
              updatePickerActiveOnly('minute', selectedMinute);
              if (arguments[0] === 'force_scroll') {
                const hOpt = hourPicker.querySelector('.picker-option[data-loop="' + (selectedHour + 24) + '"]');
                const mOpt = minutePicker.querySelector('.picker-option[data-loop="' + (selectedMinute + 60) + '"]');
                if (hOpt) hOpt.scrollIntoView({ block:'center', behavior:'smooth' });
                if (mOpt) mOpt.scrollIntoView({ block:'center', behavior:'smooth' });
              }
              return;
            }

            pickerRendering = true;
            hourPicker.innerHTML = '';
            minutePicker.innerHTML = '';
            for (let index = 0; index < 72; index++) {
              const hour = index % 24;
              const button = document.createElement('button');
              button.className = 'picker-option' + (hour === selectedHour ? ' active' : '');
              button.dataset.value = String(hour);
              button.dataset.loop = String(index);
              button.textContent = two(hour);
              button.onclick = () => { setAlarmPicker('hour', hour); };
              hourPicker.appendChild(button);
            }
            for (let index = 0; index < 180; index++) {
              const minute = index % 60;
              const button = document.createElement('button');
              button.className = 'picker-option' + (minute === selectedMinute ? ' active' : '');
              button.dataset.value = String(minute);
              button.dataset.loop = String(index);
              button.textContent = two(minute);
              button.onclick = () => { setAlarmPicker('minute', minute); };
              minutePicker.appendChild(button);
            }
            requestAnimationFrame(() => {
              const hOpt = hourPicker.querySelector('.picker-option[data-loop="' + (selectedHour + 24) + '"]');
              const mOpt = minutePicker.querySelector('.picker-option[data-loop="' + (selectedMinute + 60) + '"]');
              if (hOpt) hOpt.scrollIntoView({ block:'center', behavior:'auto' });
              if (mOpt) mOpt.scrollIntoView({ block:'center', behavior:'auto' });
              requestAnimationFrame(() => { pickerRendering = false; });
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
            const get = (id) => document.getElementById(id);
            const lampState = get('lampState');
            const rgbState = get('rgbState');
            const doorState = get('doorState');
            const tvState = get('tvState');
            const alarmState = get('alarmState');

            if (lampState) setChip(lampState, state.lamp === true, 'ON', 'OFF');
            if (rgbState) setChip(rgbState, state.rgb === true, 'ON', 'OFF');
            if (doorState) setChip(doorState, state.door === true, 'OPEN', 'CLOSED');
            if (tvState) {
              const tvLabel = state.happyMode === true ? 'HAPPY' : (state.kenzieMode === true ? 'KENZIE' : (state.kacauMode === true ? 'KACAU' : (state.stikmanMode === true ? 'STIKMAN' : (state.catMode === true ? 'CAT' : (state.fightMode === true ? 'FIGHT' : 'ON')))));
              setChip(tvState, state.tv === true, tvLabel, 'OFF');
            }
            if (alarmState) setChip(alarmState, state.alarmEnabled === true, 'ACTIVE', 'OFF');

            // Visual enhancements for device cards
            get('card-lamp')?.classList.toggle('active-glow', state.lamp === true);
            get('icon-lamp')?.classList.toggle('active-anim', state.lamp === true);
            get('card-rgb')?.classList.toggle('active-glow', state.rgb === true);
            get('icon-rgb')?.classList.toggle('active-anim', state.rgb === true);
            get('card-door')?.classList.toggle('active-glow', state.door === true);
            get('icon-door')?.classList.toggle('active-anim', state.door === true);
            get('card-tv')?.classList.toggle('active-glow', state.tv === true);
            get('icon-tv')?.classList.toggle('active-anim', state.tv === true);

            if (state.freeHeap && state.maxHeap) {
              const free = Math.round(state.freeHeap / 1024);
              const total = Math.round(state.maxHeap / 1024);
              const text = free + ' / ' + total + ' KB';
              const rvSidebar = get('ramValSidebar');
              const rvMobile = get('ramValMobile');
              if (rvSidebar) rvSidebar.textContent = text;
              if (rvMobile) rvMobile.textContent = text;
            }

            const wifiCloudState = get('wifiCloudState');
            const wifiModeState = get('wifiModeState');
            const wifiCloudInfo = get('wifiCloudInfo');
            const wifiStrongestInfo = get('wifiStrongestInfo');
            const wifiApInfo = get('wifiApInfo');
            const wifiList = get('cloudWifiList');
            if (wifiCloudState) setChip(wifiCloudState, state.wifiConnected === true, 'ONLINE', 'OFFLINE');
            if (wifiModeState) setChip(wifiModeState, state.wifiMode !== 'hotspot', state.wifiMode === 'offline' ? 'OFFLINE' : 'WIFI', 'HOTSPOT');
            if (wifiCloudInfo) wifiCloudInfo.textContent = (state.wifiSsid || '-') + ' | ' + (state.wifiIp || '0.0.0.0') + ' | ' + (state.wifiRssi || 0) + ' dBm';
            if (wifiStrongestInfo) wifiStrongestInfo.textContent = 'Strongest network: ' + (state.strongestWifiSsid || '-') + ' ' + (state.strongestWifiRssi || '') + ' (' + (state.wifiScanCount || 0) + ' found)';
            if (wifiApInfo) wifiApInfo.textContent = state.wifiSetupApActive ? ('Hotspot: SmartRoom-Setup at ' + (state.wifiSetupIp || '192.168.4.1')) : 'Hotspot: off in normal WiFi mode';
            if (wifiList && Array.isArray(state.wifiNetworks)) {
              wifiList.innerHTML = '';
              state.wifiNetworks.forEach((network) => {
                if (!network?.ssid) return;
                const button = document.createElement('button');
                button.className = 'dark';
                button.style.margin = '0';
                button.textContent = network.ssid + '  ' + network.rssi + ' dBm' + (network.secure ? '  LOCK' : '  OPEN');
                button.onclick = () => {
                  const ssidInput = document.getElementById('cloudWifiSsid');
                  if (ssidInput) ssidInput.value = network.ssid;
                };
                wifiList.appendChild(button);
              });
            }

            if (!alarmEditing && Number.isFinite(Number(state.alarmHour)) && Number.isFinite(Number(state.alarmMinute))) {
              const ah = get('alarmHour');
              const am = get('alarmMinute');
              const ahs = get('alarmHourSheet');
              const ams = get('alarmMinuteSheet');
              if (ah) ah.value = two(state.alarmHour);
              if (am) am.value = two(state.alarmMinute);
              if (ahs) ahs.value = two(state.alarmHour);
              if (ams) ams.value = two(state.alarmMinute);
            }
            if (Number.isFinite(Number(state.r)) && Number.isFinite(Number(state.g)) && Number.isFinite(Number(state.b))) {
              const hex = rgbToHex(state.r, state.g, state.b);
              const colorEl = get('color');
              if (colorEl) colorEl.value = hex;
            }
          }
          function addLog(text, type = '') {
            const logContent = document.getElementById('systemLog');
            if (!logContent) return;
            const line = document.createElement('div');
            line.className = 'log-line ' + type;
            const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            line.textContent = '[' + time + '] ' + text;
            logContent.insertBefore(line, logContent.firstChild);
            if (logContent.children.length > 50) logContent.removeChild(logContent.lastChild);
          }

          async function queue(command, button = null, loadingText = 'SENDING') {
            if (!unlocked()) return;
            const commandButton = button || activeButtonFallback();
            setButtonLoading(commandButton, true, loadingText);
            addLog('QUEUING: ' + (command.device || 'sys') + ' -> ' + (command.state || 'action'), 'cmd');
            setStatus('Sending...');
            try {
              const response = await fetch('/remote/command', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({pin:pinValue(), command})
              });
              const result = await response.json().catch(() => ({}));
              if (response.ok && result.ok) {
                setStatus('Queued');
                const id = result.queued?.[0]?.id;
                if (id) {
                  addLog('COMMAND ISSUED: ID ' + id.substring(0,8) + '...', 'success');
                  trackCommand(id, commandButton);
                } else {
                  setButtonLoading(commandButton, false);
                }
              } else {
                addLog('ERROR: ' + (result.error || 'Failed'), 'error');
                setStatus(result.error || 'Failed');
                setButtonLoading(commandButton, false);
              }
            } catch (error) {
              addLog('ERROR: Network failed', 'error');
              setStatus('Send failed');
              setButtonLoading(commandButton, false);
            }
          }

          async function scanWifiCloud() {
            const button = document.getElementById('scanWifiButton');
            const strongest = document.getElementById('wifiStrongestInfo');
            if (button) {
              setButtonLoading(button, true, 'SCANNING');
            }
            if (strongest) strongest.textContent = 'Scan requested. Waiting ESP result...';
            setStatus('WiFi scan queued');
            await queue({device:'wifi', state:'scan'}, button, 'SCANNING');
            [1500, 3500, 6000].forEach((delay) => setTimeout(checkEspStatus, delay));
            setTimeout(() => {
              setButtonLoading(button, false);
            }, 6500);
          }

          async function stopWifiScanCloud() {
            const button = document.getElementById('stopWifiScanButton') || activeButtonFallback();
            const strongest = document.getElementById('wifiStrongestInfo');
            setButtonLoading(button, true, 'STOPPING');
            setStatus('Stopping scan...');
            addLog('STOP REQUESTED: clearing pending WiFi scan commands', 'cmd');
            try {
              const response = await fetch('/remote/clear', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({pin:pinValue()})
              });
              const result = await response.json().catch(() => ({}));
              if (response.ok && result.ok) {
                setStatus('Scan stopped');
                addLog('PENDING COMMANDS CLEARED: ' + (result.deleted || 0), 'success');
                if (strongest) strongest.textContent = 'Scan stopped. Press SCAN once to refresh.';
              } else {
                setStatus(result.error || 'Stop failed');
                addLog('ERROR: ' + (result.error || 'Stop failed'), 'error');
              }
            } catch (error) {
              setStatus('Stop failed');
              addLog('ERROR: Stop scan network failed', 'error');
            } finally {
              setButtonLoading(button, false);
              checkEspStatus();
            }
          }

          async function connectWifiCloud() {
            const ssid = document.getElementById('cloudWifiSsid')?.value.trim();
            const password = document.getElementById('cloudWifiPass')?.value || '';
            const button = document.getElementById('connectWifiButton');
            if (!ssid) {
              addLog('ERROR: SSID is required', 'error');
              return;
            }
            if (button) {
              setButtonLoading(button, true, 'CONNECTING');
            }
            setStatus('WiFi switch queued');
            await queue({device:'wifi', state:'connect', ssid, password}, button, 'CONNECTING');
            [2500, 6000, 10000].forEach((delay) => setTimeout(checkEspStatus, delay));
            setTimeout(() => {
              setButtonLoading(button, false);
            }, 10000);
          }

          async function setWifiModeCloud(mode) {
            const state = mode === 'hotspot' ? 'hotspot' : 'wifi';
            setStatus(state === 'hotspot' ? 'Switching to hotspot' : 'Switching to WiFi');
            await queue({device:'wifi', state}, activeButtonFallback(), 'SWITCHING');
            [1500, 3500, 6000].forEach((delay) => setTimeout(checkEspStatus, delay));
          }

          function runRoutine(name) {
             addLog('ROUTINE TRIGGERED: ' + name.toUpperCase(), 'cmd');
             if (name === 'sleep') {
               queue({device:'lamp', state:'off'});
               setTimeout(function() { queue({device:'rgb', state:'off'}) }, 800);
               setTimeout(function() { queue({device:'tv', state:'off'}) }, 1600);
               setTimeout(function() { queue({device:'door', state:'close'}) }, 2400);
             } else if (name === 'study') {
               queue({device:'lamp', state:'on'});
               setTimeout(function() { queue({device:'rgb', state:'on', r:255, g:255, b:255}) }, 800);
             } else if (name === 'leave') {
               queue({device:'door', state:'open'});
               setTimeout(function() { queue({device:'lamp', state:'off'}) }, 1200);
               setTimeout(function() { queue({device:'rgb', state:'off'}) }, 1800);
               setTimeout(function() { queue({device:'tv', state:'off'}) }, 2400);
             }
           }
          function trackCommand(id, button = null) {
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
                  addLog('ESP32 ACKNOWLEDGED: Command executed successfully', 'success');
                  setStatus('Sent to ESP / Done');
                  setButtonLoading(button, false);
                  clearInterval(timer);
                  checkEspStatus();
                } else if (checks > 20) {
                  addLog('TIMEOUT: ESP32 did not respond in time', 'error');
                  setStatus('Queued, waiting ESP');
                  setButtonLoading(button, false);
                  clearInterval(timer);
                }
              } catch (error) {
                if (checks > 20) {
                  setButtonLoading(button, false);
                  clearInterval(timer);
                }
              }
            }, 800);
          }
          function demoMode() {
            queue({device:'rgb', state:'color', r:0, g:220, b:255});
            setTimeout(() => queue({device:'tv', state:'on'}), 700);
            setTimeout(() => queue({device:'door', state:'open'}), 1400);
          }
          function rgbColor() {
            const colorEl = document.getElementById('color');
            if (!colorEl) return;
            const hex = colorEl.value.slice(1);
            queue({device:'rgb', state:'color', color:colorEl.value, r:parseInt(hex.slice(0,2),16), g:parseInt(hex.slice(2,4),16), b:parseInt(hex.slice(4,6),16)});
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
            const ah = document.getElementById('alarmHour');
            const am = document.getElementById('alarmMinute');
            const an = document.getElementById('alarmName');
            const ans = document.getElementById('alarmNameSheet');
            if (ah) ah.value = two(hour);
            if (am) am.value = two(minute);
            if (an && ans) an.value = ans.value;
            renderAlarmPicker();
            queue({device:'alarm', enabled:true, hour, minute});
            closeAlarmSheet();
          }
          async function askAi() {
            const cmdEl = document.getElementById('cmd');
            if (!unlocked() || !cmdEl || !cmdEl.value.trim()) return;
            const message = cmdEl.value.trim();
            cmdEl.value = '';
            addBubble('user', message);
            addBubble('assistant', 'AI thinking...');
            const chatLogEl = document.getElementById('chatLog');
            const loadingBubble = chatLogEl ? chatLogEl.lastElementChild : null;
            const response = await fetch('/chat', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({pin:pinValue(), message, queue:true})
            });
            const result = await response.json().catch(() => ({}));
            if (loadingBubble) loadingBubble.textContent = result.reply || result.error || 'AI failed';
            scrollToBottom(true);
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
            setStatus('Sedang merekam...');
            setVoiceRecording(true);
            rec.onresult = (event) => {
              const text = event.results[0][0].transcript;
              cmd.value = text;
              askAi();
            };
            rec.onerror = () => { setVoiceRecording(false); addBubble('assistant', 'Voice gagal. Coba lagi.'); setStatus('Voice failed'); };
            rec.onend = () => { setVoiceRecording(false); if (document.getElementById('status').textContent === 'Sedang merekam...') setStatus('Voice done'); };
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
              const setPill = (id, online, error) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (online) {
                  el.textContent = 'ESP Online';
                  el.style.background = '#021a0f';
                  el.style.color = '#10ea7a';
                  el.style.borderColor = '#0a522b';
                  el.title = 'Connected via Supabase';
                } else {
                  el.textContent = 'ESP Offline';
                  el.style.background = '#1a0505';
                  el.style.color = '#ff5555';
                  el.style.borderColor = '#551111';
                  el.title = error || 'Device not seen in the last 60 seconds';
                }
              };
              setPill('espStatus', data.online, data.error);
              setPill('espStatusMob', data.online, data.error);
              
              const statusLog = document.getElementById('log-status');
              if (statusLog) {
                if (data.online) {
                  statusLog.textContent = 'Live Sync';
                  statusLog.style.color = '#35e886';
                } else {
                  statusLog.textContent = data.error ? 'Error: ' + data.error : 'Offline';
                  statusLog.style.color = '#ff4d75';
                }
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
          setInterval(checkEspStatus, 800);
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

  await deleteSupersededCommands(commands);

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

async function deleteSupersededCommands(commands) {
  const devicesToReplace = new Set(
    commands
      .filter((command) => command.device === 'wifi' || command.device === 'network')
      .map(() => 'wifi')
  );

  if (!devicesToReplace.size) {
    return;
  }

  const { data, error } = await supabase
    .from('commands')
    .select('id, payload, executed')
    .eq('executed', false)
    .limit(100);

  if (error) throw error;

  const deleteIds = (data || [])
    .map(normalizeQueuedCommand)
    .filter((row) => devicesToReplace.has(String(row.payload?.device || '').toLowerCase()))
    .map((row) => row.id);

  await deleteCommandIds(deleteIds);
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
      .limit(25);

    const [statusRes, { data, error }] = await Promise.all([p1, p2]);

    if (error) throw error;
    let commands = (data || [])
      .map(normalizeQueuedCommand)
      .filter((row) => row.payload && typeof row.payload === 'object');

    commands = await compactWifiCommands(commands);

    res.json({ ok: true, commands });
  } catch (error) {
    console.error('Device poll failed:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function compactWifiCommands(commands) {
  const wifiRows = commands.filter((row) => {
    const device = String(row.payload?.device || '').toLowerCase();
    return device === 'wifi' || device === 'network';
  });

  if (wifiRows.length <= 1) {
    return commands.slice(0, 5);
  }

  const keep = wifiRows[wifiRows.length - 1];
  const deleteIds = wifiRows.filter((row) => row.id !== keep.id).map((row) => row.id);
  await deleteCommandIds(deleteIds);

  return commands
    .filter((row) => {
      const device = String(row.payload?.device || '').toLowerCase();
      return device !== 'wifi' && device !== 'network';
    })
    .concat(keep)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .slice(0, 5);
}

app.get('/device/status', async (req, res) => {
  const status = {
    online: false,
    supabase: Boolean(supabase),
    lastSeen: null,
    error: null,
    state: {}
  };

  if (!supabase) {
    status.error = 'Supabase client not initialized. Check Vercel Env Variables.';
    res.json(status);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('device_status')
      .select('last_seen,state')
      .eq('id', 'esp32')
      .maybeSingle();

    if (error) {
      status.error = 'Database error: ' + error.message;
    } else if (!data) {
      status.error = 'No device data found in database. ESP32 has never polled.';
    } else {
      const lastSeen = new Date(data.last_seen).getTime();
      const now = Date.now();
      status.lastSeen = data.last_seen;
      status.online = (now - lastSeen) < 60000; // Online if seen in last 60s
      status.state = data.state || {};
      if (!status.online) {
        status.error = 'ESP32 was last seen ' + Math.round((now - lastSeen) / 1000) + 's ago.';
      }
    }
    res.json(status);
  } catch (err) {
    status.error = err.message;
    res.json(status);
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
            '{"device":"tv","state":"on|off|fight|cat|stikman|kacau|kenzie|happy"}',
            '{"device":"wifi","state":"scan"}',
            '{"device":"wifi","state":"connect","ssid":"network name","password":"network password"}',
            '{"device":"alarm","enabled":true,"hour":0-23,"minute":0-59}',
            '{"device":"alarm","enabled":false}',
            '{"device":"buzzer","state":"off"}',
            'IMPORTANT: For RGB colors, do NOT use "state":"blue", use R,G,B values instead. Default blue is {"r":90,"g":160,"b":255}.',
            'For fight animation, use {"device":"tv","state":"fight"}. For cat animation, use {"device":"tv","state":"cat"}. For stikman animation, use {"device":"tv","state":"stikman"}. For kacau/kicau animation, use {"device":"tv","state":"kacau"}. For kenzie OLED image, use {"device":"tv","state":"kenzie"}. For happy animation, use {"device":"tv","state":"happy"}.',
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

  if (device === 'lamp' || device === 'lampu' || device === 'desk_lamp') {
    if (state === 'on' || state === 'nyala' || state === 'hidup' || state === 'on') return { device: 'lamp', state: 'on' };
    if (state === 'off' || state === 'mati' || state === 'off') return { device: 'lamp', state: 'off' };
    return null;
  }

  if (device === 'door' || device === 'smart_door' || device === 'pintu') {
    if (state === 'open' || state === 'unlock' || state === 'buka' || state === 'nyala' || state === 'on' || command.open === true) return { device: 'door', state: 'open' };
    if (state === 'close' || state === 'closed' || state === 'lock' || state === 'tutup' || state === 'mati' || state === 'off' || command.open === false) return { device: 'door', state: 'close' };
    return null;
  }

  if (device === 'tv' || device === 'oled' || device === 'smart_tv') {
    if (state === 'fight' || state === 'animation') return { device: 'tv', state: 'fight' };
    if (state === 'cat' || state === 'kucing') return { device: 'tv', state: 'cat' };
    if (state === 'stikman' || state === 'stickman') return { device: 'tv', state: 'stikman' };
    if (state === 'kacau' || state === 'kicau' || state === 'chaos') return { device: 'tv', state: 'kacau' };
    if (state === 'kenzie') return { device: 'tv', state: 'kenzie' };
    if (state === 'happy' || state === 'senang') return { device: 'tv', state: 'happy' };
    if (state === 'on' || state === 'nyala' || state === 'hidup') return { device: 'tv', state: 'on' };
    if (state === 'off' || state === 'mati') return { device: 'tv', state: 'off' };
    return null;
  }

  if (device === 'wifi' || device === 'network') {
    if (state === 'scan' || state === 'check' || state === 'cek') return { device: 'wifi', state: 'scan' };
    if (state === 'hotspot' || state === 'ap' || state === 'setup') return { device: 'wifi', state: 'hotspot' };
    if (state === 'wifi' || state === 'sta' || state === 'station') return { device: 'wifi', state: 'wifi' };
    if (state === 'connect' || state === 'set' || command.ssid) {
      const ssid = String(command.ssid || '').trim();
      if (!ssid) return null;
      return { device: 'wifi', state: 'connect', ssid, password: String(command.password || '') };
    }
    return null;
  }

  if (device === 'buzzer') {
    return state === 'off' || state === 'mati' || state === 'stop' ? { device: 'buzzer', state: 'off' } : null;
  }

  if (device === 'rgb' || device === 'lampu_kamar') {
    const color = parseHexColor(command.color);
    if (color) {
      return { device: 'rgb', state: 'color', color: command.color, ...color };
    }

    const r = clampColor(command.r);
    const g = clampColor(command.g);
    const b = clampColor(command.b);

    if (r !== null && g !== null && b !== null) {
      return { device: 'rgb', state: 'color', r, g, b };
    }

    if (state === 'on' || state === 'nyala' || state === 'hidup') return { device: 'rgb', state: 'on' };
    if (state === 'off' || state === 'mati') return { device: 'rgb', state: 'off' };
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

function parseHexColor(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  const number = Number.parseInt(hex, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function clampColor(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Math.max(0, Math.min(255, Math.round(number)));
}

const port = Number(process.env.PORT || 8787);
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Smart Room AI Gateway listening on http://localhost:${port}`);
  });
}

export default app;
