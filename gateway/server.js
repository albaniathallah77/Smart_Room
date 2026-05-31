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
          :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; background:#02070b; color:#e9fbff; }
          * { box-sizing:border-box; }
          body { margin:0; min-height:100vh; background:radial-gradient(circle at 24% 8%,#07323b 0,#02070b 38%), linear-gradient(135deg,#02070b,#061019); }
          main { width:min(980px, calc(100% - 28px)); margin:auto; padding:24px 0 32px; }
          header { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:16px; border-bottom:1px solid #103848; padding-bottom:16px; }
          h1 { margin:0; font-size:clamp(26px,5vw,42px); line-height:1; }
          .sub { color:#7fefff; margin-top:7px; font-size:14px; }
          .pill { border:1px solid #126172; color:#7ff7ff; padding:8px 10px; border-radius:7px; background:#061a22; white-space:nowrap; font-size:13px; }
          .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; }
          .card { border:1px solid #115468; background:linear-gradient(180deg,#08202a,#061018); border-radius:8px; padding:15px; box-shadow:0 12px 28px #0008, inset 0 1px #22e6ff22; min-height:142px; }
          h2 { margin:0 0 13px; font-size:17px; display:flex; justify-content:space-between; gap:8px; }
          button, input { border:1px solid #177189; background:#071822; color:#e9fbff; border-radius:7px; padding:11px 12px; font:inherit; min-height:42px; }
          button { cursor:pointer; width:100%; margin-top:8px; font-weight:800; }
          .primary { background:#08cfe3; border-color:#14efff; color:#001015; }
          .blue { background:#087cff; border-color:#3295ff; color:white; }
          .dark { background:#020507; border-color:#1a3944; }
          .row { display:flex; gap:8px; align-items:center; }
          .row > * { flex:1; min-width:0; }
          input[type=color] { height:42px; padding:2px; }
          #cmd { width:100%; }
          #reply { min-height:18px; margin-top:10px; color:#7fefff; font-size:13px; line-height:1.35; }
          .locked main { filter:blur(12px); pointer-events:none; user-select:none; }
          .lock { position:fixed; inset:0; z-index:10; display:grid; place-items:center; padding:18px; background:radial-gradient(circle at 50% 18%,#0b7185 0,#03151c 34%,#02070b 72%); }
          .lock.hidden { display:none; }
          .panel { width:min(420px,100%); border:1px solid #20e8ff66; background:linear-gradient(180deg,#08232e,#030b10); border-radius:8px; padding:24px; box-shadow:0 24px 70px #000b, 0 0 46px #10ddea33, inset 0 1px #69f6ff33; }
          .panel h1 { text-align:center; font-size:28px; }
          .panel p { text-align:center; color:#7fefff; }
          .lock-logo { width:76px; height:76px; border-radius:50%; display:block; object-fit:cover; margin:0 auto 14px; box-shadow:0 0 28px #10ddea66; }
          .dots { display:flex; justify-content:center; gap:9px; margin:12px 0 16px; }
          .dots span { width:13px; height:13px; border-radius:50%; border:1px solid #21e9ff99; background:#03131a; }
          .dots span.on { background:#10ddea; box-shadow:0 0 16px #10ddea; }
          #pin { width:100%; text-align:center; font-size:22px; letter-spacing:8px; font-weight:800; }
          .pad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:12px; }
          .pad button { margin:0; min-height:48px; font-size:18px; }
          #error { min-height:18px; margin-top:12px; text-align:center; color:#ff8b8b; font-size:13px; }
          .app-shell { width:min(1440px,100%); height:100vh; display:grid; grid-template-columns:260px minmax(0,1fr); gap:0; padding:0; }
          .sidebar { border-right:1px solid #103848; background:#020609; padding:18px 14px; display:flex; flex-direction:column; gap:14px; }
          .brand-row { display:flex; align-items:center; gap:11px; padding:4px 6px 14px; border-bottom:1px solid #103848; }
          .logo-mark { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; overflow:hidden; background:#10ddea; box-shadow:0 0 22px #10ddea77; }
          .logo-mark img { width:100%; height:100%; object-fit:cover; }
          .nav-item { padding:12px; border-radius:8px; color:#e9fbff; background:transparent; border:0; text-align:left; margin:0; min-height:0; font-weight:700; }
          .nav-item.active, .nav-item:hover { background:#16242b; }
          .side-bottom { margin-top:auto; display:grid; gap:8px; }
          .chat-pane { display:grid; grid-template-rows:auto 1fr; min-width:0; background:#05090d; }
          .topbar { height:62px; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 22px; border-bottom:1px solid #12222b; }
          .page { display:none; min-height:0; overflow:auto; padding:24px; }
          .page.active { display:block; }
          .chat-page.active { display:grid; grid-template-rows:1fr auto; padding:0; overflow:hidden; }
          .chat-log { overflow:auto; padding:28px max(22px,8vw); display:flex; flex-direction:column; gap:18px; }
          .bubble { max-width:760px; line-height:1.55; padding:14px 16px; border-radius:8px; white-space:pre-wrap; }
          .bubble.assistant { align-self:flex-start; background:transparent; border-left:2px solid #10ddea; }
          .bubble.user { align-self:flex-end; background:#2c2d30; }
          .composer { margin:0 max(16px,8vw) 22px; background:#202124; border:1px solid #33383d; border-radius:8px; padding:10px; display:grid; grid-template-columns:1fr auto auto; gap:8px; align-items:center; }
          .composer input { border:0; background:transparent; min-height:44px; font-size:16px; }
          .icon-btn { width:48px; min-width:48px; border-radius:50%; margin:0; padding:0; }
          .tools-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:14px; }
          .alarm-page { max-width:760px; margin:0 auto; }
          .alarm-hero { border:1px solid #174a5a; background:radial-gradient(circle at 50% 0,#0a3140 0,#07131a 42%,#03080c 100%); border-radius:8px; padding:24px; box-shadow:0 24px 70px #0008, inset 0 1px #5befff22; }
          .alarm-time { display:flex; align-items:center; justify-content:center; gap:12px; margin:26px 0 30px; }
          .alarm-time input { width:clamp(110px,22vw,190px); text-align:center; border:0; background:transparent; color:#e9fbff; font-size:clamp(64px,12vw,118px); line-height:1; padding:0; min-height:0; font-weight:700; }
          .alarm-time span { color:#e9fbff; font-size:clamp(58px,10vw,96px); line-height:1; transform:translateY(-6px); }
          .alarm-time input:focus { outline:1px solid #14efff; background:#061a22; border-radius:8px; }
          .alarm-settings { border-top:1px solid #26343b; padding-top:16px; display:grid; gap:14px; }
          .alarm-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
          .settings-list { display:grid; gap:12px; max-width:760px; }
          .settings-row { border:1px solid #173746; background:#07131a; border-radius:8px; padding:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
          .tools-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
          .tool-card { border:1px solid #173746; background:#07131a; border-radius:8px; padding:13px; margin-bottom:10px; transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
          .tool-card:hover { transform:translateY(-1px); border-color:#1b6e82; box-shadow:0 12px 30px #0007; }
          .tool-title { display:flex; justify-content:space-between; align-items:center; gap:8px; font-weight:900; margin-bottom:9px; }
          .state-chip { font-size:12px; color:#8fb6c0; border:1px solid #234b58; border-radius:999px; padding:3px 8px; }
          .state-chip.on { color:#001015; background:#10ddea; border-color:#10ddea; }
          .tool-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
          .alarm-display { font-size:34px; letter-spacing:2px; margin:8px 0 10px; color:#e9fbff; }
          .modal { position:fixed; inset:0; z-index:8; display:none; place-items:end center; background:#0009; padding:18px; }
          .modal.open { display:grid; }
          .sheet { width:min(520px,100%); background:#202124; border:1px solid #34383d; border-radius:8px; padding:18px; box-shadow:0 20px 60px #000c; }
          .time-row { display:flex; justify-content:center; align-items:center; gap:12px; font-size:54px; margin:8px 0 18px; }
          .time-row input { width:88px; text-align:center; font-size:44px; padding:4px; border:0; background:#111; }
          .days { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin:12px 0; }
          .days span { text-align:center; color:#aaa; font-size:13px; padding:8px 0; border-radius:8px; background:#071822; border:1px solid #173746; }
          .days span.active { color:#001015; background:#10ddea; border-color:#10ddea; font-weight:900; }
          .field { display:grid; gap:6px; margin:12px 0; color:#aaa; }
          .field input { width:100%; }
          @media (max-width:980px) { .app-shell { height:auto; min-height:100vh; grid-template-columns:1fr; } .sidebar { display:none; } .chat-pane { min-height:100vh; } }
          @media (max-width:560px) { header { align-items:flex-start; flex-direction:column; } .pill { width:100%; text-align:center; } .composer { grid-template-columns:1fr auto; } .composer .primary { grid-column:1 / -1; width:100%; border-radius:7px; } .time-row { font-size:42px; } .time-row input { width:72px; font-size:36px; } .alarm-actions { grid-template-columns:1fr; } .alarm-time { gap:4px; } .alarm-time input { width:118px; } }
        </style>
      </head>
      <body class="locked">
        <div class="lock" id="lock">
          <section class="panel">
            <img class="lock-logo" src="/assets/logo.png" alt="Smart Room logo">
            <h1>Smart Room</h1>
            <p>Enter PIN to control from cloud</p>
            <div class="dots" id="dots"><span></span><span></span><span></span><span></span></div>
            <input id="pin" inputmode="numeric" maxlength="8" type="password" placeholder="PIN">
            <div class="pad">
              <button onclick="press('1')">1</button><button onclick="press('2')">2</button><button onclick="press('3')">3</button>
              <button onclick="press('4')">4</button><button onclick="press('5')">5</button><button onclick="press('6')">6</button>
              <button onclick="press('7')">7</button><button onclick="press('8')">8</button><button onclick="press('9')">9</button>
              <button onclick="back()">DEL</button><button onclick="press('0')">0</button><button class="primary" onclick="unlock()">OK</button>
            </div>
            <div id="error"></div>
          </section>
        </div>
        <main class="app-shell">
          <aside class="sidebar">
            <div class="brand-row"><div class="logo-mark"><img src="/assets/logo.png" alt="Smart Room logo"></div><div><b>Smart Room</b><div class="sub">AI Cloud</div></div></div>
            <button class="nav-item active" data-page="chat" onclick="showPage('chat')">Chat AI</button>
            <button class="nav-item" data-page="tools" onclick="showPage('tools')">Tools</button>
            <button class="nav-item" data-page="alarm" onclick="showPage('alarm')">Alarm</button>
            <button class="nav-item" data-page="settings" onclick="showPage('settings')">Settings</button>
            <div class="side-bottom">
              <div class="pill" id="espStatus" style="border-color:#551111;color:#ff5555;background:#1a0505;">ESP Offline</div>
              <div class="pill" id="status">Cloud ready</div>
              <button class="dark" onclick="lockAgain()">LOCK</button>
            </div>
          </aside>
          <section class="chat-pane">
            <div class="topbar"><div><b id="pageTitle">Smart Room AI</b><div class="sub" id="pageSubtitle">Ask, command, or use voice</div></div><button class="dark" id="clearButton" onclick="clearPending()" style="max-width:150px;margin:0">CLEAR PENDING</button></div>
            <section class="page chat-page active" id="chatPage">
              <div class="chat-log" id="chatLog">
                <div class="bubble assistant">Halo, aku siap bantu kontrol Smart Room. Kamu bisa ketik atau tekan voice untuk memberi perintah.</div>
              </div>
              <div class="composer">
                <input id="cmd" placeholder="Ask anything or command your room">
                <button class="icon-btn blue" onclick="voiceAi()" title="Voice AI">🎙</button>
                <button class="icon-btn primary" onclick="askAi()" title="Send">➜</button>
              </div>
              <div id="reply" style="display:none">Gateway ready</div>
            </section>
            <section class="page" id="toolsPage">
              <div class="tools-head"><h2 style="margin:0">Device Tools</h2><button class="dark" onclick="checkEspStatus()" style="max-width:96px;margin:0">REFRESH</button></div>
              <div class="tools-grid">
                <article class="tool-card"><div class="tool-title">Desk Lamp <span class="state-chip" id="lampState">OFF</span></div><div class="tool-actions"><button class="primary" onclick="queue({device:'lamp',state:'on'})">ON</button><button class="dark" onclick="queue({device:'lamp',state:'off'})">OFF</button></div></article>
                <article class="tool-card"><div class="tool-title">RGB Room <span class="state-chip" id="rgbState">OFF</span></div><div class="row"><input id="color" type="color" value="#10ddea"><button class="blue" onclick="rgbColor()">SET COLOR</button></div><div class="tool-actions"><button class="primary" onclick="queue({device:'rgb',state:'on'})">ON</button><button class="dark" onclick="queue({device:'rgb',state:'off'})">OFF</button></div></article>
                <article class="tool-card"><div class="tool-title">Smart Door <span class="state-chip" id="doorState">CLOSED</span></div><div class="tool-actions"><button class="primary" onclick="queue({device:'door',state:'open'})">OPEN</button><button class="dark" onclick="queue({device:'door',state:'close'})">CLOSE</button></div></article>
                <article class="tool-card"><div class="tool-title">Smart TV <span class="state-chip" id="tvState">OFF</span></div><div class="tool-actions"><button class="primary" onclick="queue({device:'tv',state:'on'})">ON</button><button class="dark" onclick="queue({device:'tv',state:'off'})">OFF</button></div></article>
              </div>
            </section>
            <section class="page alarm-page" id="alarmPage">
              <div class="alarm-hero">
                <div class="tool-title">Alarm <span class="state-chip" id="alarmState">OFF</span></div>
                <div class="alarm-time"><input id="alarmHour" type="number" min="0" max="23" value="06"><span>:</span><input id="alarmMinute" type="number" min="0" max="59" value="00"></div>
                <div class="alarm-settings">
                  <div class="days"><span class="active">M</span><span class="active">T</span><span class="active">W</span><span class="active">T</span><span class="active">F</span><span>S</span><span>S</span></div>
                  <label class="field">Alarm name <input id="alarmName" value="Smart Room Alarm"></label>
                  <div class="alarm-actions"><button class="primary" onclick="saveAlarm()">SAVE ALARM</button><button class="dark" onclick="queue({device:'buzzer',state:'off'})">STOP BUZZER</button></div>
                </div>
              </div>
            </section>
            <section class="page" id="settingsPage">
              <div class="settings-list">
                <div class="settings-row"><div><b>Cloud Gateway</b><div class="sub">Vercel remote control</div></div><span class="state-chip on">ACTIVE</span></div>
                <div class="settings-row"><div><b>Realtime Polling</b><div class="sub">ESP checks cloud about every 2 seconds</div></div><span class="state-chip on">2 SEC</span></div>
                <div class="settings-row"><div><b>Local ESP Dashboard</b><div class="sub">IP address shows firmware dashboard, so upload sketch after local UI changes</div></div><span class="state-chip">LOCAL</span></div>
                <button class="dark" onclick="clearPending()">CLEAR PENDING COMMANDS</button>
              </div>
            </section>
          </section>
        </main>
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
            chat: ['Smart Room AI', 'Ask, command, or use voice'],
            tools: ['Tools', 'Control each device and see realtime status'],
            alarm: ['Alarm', 'Set schedule and stop buzzer'],
            settings: ['Settings', 'Cloud, realtime, and local dashboard info']
          };
          function showPage(name) {
            const meta = pageMeta[name] || pageMeta.chat;
            pageTitle.textContent = meta[0];
            pageSubtitle.textContent = meta[1];
            clearButton.style.display = name === 'chat' || name === 'settings' ? 'block' : 'none';
            document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
            document.getElementById(name + 'Page').classList.add('active');
            document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === name));
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
          function clampAlarmInputs(source = 'page') {
            const hourInput = source === 'sheet' ? alarmHourSheet : alarmHour;
            const minuteInput = source === 'sheet' ? alarmMinuteSheet : alarmMinute;
            const hour = Math.max(0, Math.min(23, Number(hourInput.value) || 0));
            const minute = Math.max(0, Math.min(59, Number(minuteInput.value) || 0));
            hourInput.value = two(hour);
            minuteInput.value = two(minute);
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
            setStatus(response.ok && result.ok ? 'Command queued' : (result.error || 'Failed'));
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
          function saveAlarmSheet() {
            const { hour, minute } = clampAlarmInputs('sheet');
            alarmHour.value = two(hour);
            alarmMinute.value = two(minute);
            alarmName.value = alarmNameSheet.value;
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
          alarmModal.addEventListener('click', (event) => { if (event.target === alarmModal) closeAlarmSheet(); });
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
    return { history: [], memories: [], memoryText: '' };
  }

  const [{ data: historyData }, { data: memoryData }] = await Promise.all([
    supabase
      .from('conversation')
      .select('role, content')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('user_memory')
      .select('memory_text')
      .order('created_at', { ascending: false })
      .limit(80)
  ]);

  const history = (historyData || [])
    .reverse()
    .filter((item) => item.role && item.content)
    .map((item) => ({ role: item.role, content: item.content }));
  const memories = pickRelevantMemories(message, memoryData || []);

  return { history, memories, memoryText: formatMemories(memories) };
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
    const { history, memoryText } = await loadAiContext(userMessage);

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
            '{"device":"buzzer","state":"off"}',
            'Do not use fan or relay commands.',
            'If user gives a name, preference, or rule to remember, include "memory":"short memory text" in the JSON.',
            'For "mode tidur", turn lamp/rgb/tv off and optionally set alarm if user asks.',
            'For "buka pintu", use {"device":"door","state":"open"}.',
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
    const commands = normalizeCommands(parsed.commands || parsed.command);
    const reply = String(parsed.reply || 'Siap.');
    const memoryToSave = teachMemory || parsed.memory || '';

    if (req.body.queue === true) {
      if (!validateDashboardPin(req.body.pin)) {
        res.status(401).json({ ok: false, reply: 'PIN salah.', commands: [] });
        return;
      }
      await queueCommands(commands, 'ai', userMessage);
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

    res.json({ ok: true, reply, commands, memorySaved: Boolean(memoryToSave) });
  } catch (error) {
    console.error('AI chat failed:', error);
    res.status(500).json({ ok: false, reply: 'AI gateway sedang bermasalah.', commands: [], error: error.message });
  }
});

function normalizeCommands(value) {
  const input = Array.isArray(value) ? value : value ? [value] : [];
  return input.map(normalizeCommand).filter(Boolean);
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
