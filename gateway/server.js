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
          .dots { display:flex; justify-content:center; gap:9px; margin:12px 0 16px; }
          .dots span { width:13px; height:13px; border-radius:50%; border:1px solid #21e9ff99; background:#03131a; }
          .dots span.on { background:#10ddea; box-shadow:0 0 16px #10ddea; }
          #pin { width:100%; text-align:center; font-size:22px; letter-spacing:8px; font-weight:800; }
          .pad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:12px; }
          .pad button { margin:0; min-height:48px; font-size:18px; }
          #error { min-height:18px; margin-top:12px; text-align:center; color:#ff8b8b; font-size:13px; }
          @media (max-width:560px) { header { align-items:flex-start; flex-direction:column; } .pill { width:100%; text-align:center; } }
        </style>
      </head>
      <body class="locked">
        <div class="lock" id="lock">
          <section class="panel">
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
        <main>
          <header>
            <div>
              <h1>Smart Room Cloud</h1>
              <div class="sub">Remote control via Vercel + Supabase</div>
            </div>
            <div class="row" style="flex:0 0 auto">
              <div class="pill" id="espStatus" style="border-color:#551111;color:#ff5555;background:#1a0505;">ESP Offline</div>
              <div class="pill" id="status">Cloud ready</div>
              <button class="dark" onclick="lockAgain()" style="margin:0;max-width:92px">LOCK</button>
            </div>
          </header>
          <section class="grid">
            <article class="card"><h2>Desk Lamp</h2><button class="primary" onclick="queue({device:'lamp',state:'on'})">ON</button><button class="dark" onclick="queue({device:'lamp',state:'off'})">OFF</button></article>
            <article class="card"><h2>RGB Room</h2><div class="row"><input id="color" type="color" value="#10ddea"><button class="blue" onclick="rgbColor()">SET</button></div><button class="primary" onclick="queue({device:'rgb',state:'on'})">ON</button><button class="dark" onclick="queue({device:'rgb',state:'off'})">OFF</button></article>
            <article class="card"><h2>Smart Door</h2><button class="primary" onclick="queue({device:'door',state:'open'})">OPEN</button><button class="dark" onclick="queue({device:'door',state:'close'})">CLOSE</button></article>
            <article class="card"><h2>Smart TV</h2><button class="primary" onclick="queue({device:'tv',state:'on'})">ON</button><button class="dark" onclick="queue({device:'tv',state:'off'})">OFF</button></article>
            <article class="card"><h2>Alarm</h2><div class="row"><input id="alarmTime" type="time" value="06:00"><button class="blue" onclick="setAlarm()">SET</button></div><button class="dark" onclick="queue({device:'buzzer',state:'off'})">STOP</button></article>
            <article class="card"><h2>AI Command</h2><input id="cmd" placeholder="mode tidur"><button class="primary" onclick="askAi()">ASK AI</button><button class="blue" onclick="voiceAi()">VOICE AI</button><button class="dark" onclick="clearPending()">CLEAR PENDING</button><div id="reply">Gateway ready</div></article>
          </section>
        </main>
        <script>
          const AUTH = 'smart_room_cloud_pin';
          const unlocked = () => sessionStorage.getItem(AUTH) === '1';
          const pinValue = () => sessionStorage.getItem('smart_room_pin') || '';
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
          async function queue(command) {
            if (!unlocked()) return;
            status.textContent = 'Sending...';
            const response = await fetch('/remote/command', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({pin:pinValue(), command})
            });
            const result = await response.json().catch(() => ({}));
            status.textContent = response.ok && result.ok ? 'Command queued' : (result.error || 'Failed');
          }
          function rgbColor() {
            const hex = color.value.slice(1);
            queue({device:'rgb', r:parseInt(hex.slice(0,2),16), g:parseInt(hex.slice(2,4),16), b:parseInt(hex.slice(4,6),16)});
          }
          function setAlarm() {
            const [hour, minute] = alarmTime.value.split(':').map(Number);
            queue({device:'alarm', enabled:true, hour, minute});
          }
          async function askAi() {
            if (!unlocked() || !cmd.value.trim()) return;
            const message = cmd.value.trim();
            cmd.value = '';
            reply.textContent = 'AI thinking...';
            const response = await fetch('/chat', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({pin:pinValue(), message, queue:true})
            });
            const result = await response.json().catch(() => ({}));
            reply.textContent = result.reply || result.error || 'AI failed';
            if (result.reply) speak(result.reply);
            status.textContent = response.ok && result.ok ? 'AI command queued' : 'AI failed';
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
              reply.textContent = 'Voice belum didukung browser ini.';
              return;
            }
            const rec = new SpeechRecognition();
            rec.lang = 'id-ID';
            rec.interimResults = false;
            rec.maxAlternatives = 1;
            reply.textContent = 'Mendengarkan...';
            rec.onresult = (event) => {
              const text = event.results[0][0].transcript;
              cmd.value = text;
              reply.textContent = text;
              askAi();
            };
            rec.onerror = () => { reply.textContent = 'Voice gagal. Coba lagi.'; };
            rec.onend = () => { if (reply.textContent === 'Mendengarkan...') reply.textContent = 'Voice selesai.'; };
            rec.start();
          }
          async function clearPending() {
            if (!unlocked()) return;
            status.textContent = 'Clearing...';
            const response = await fetch('/remote/clear', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({pin:pinValue()})
            });
            const result = await response.json().catch(() => ({}));
            status.textContent = response.ok && result.ok ? 'Pending cleared' : (result.error || 'Clear failed');
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
            } catch (e) {}
          }
          setInterval(checkEspStatus, 5000);
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

    const { error } = await supabase
      .from('commands')
      .update({ executed: true })
      .eq('executed', false);

    if (error) throw error;
    res.json({ ok: true });
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

    const p1 = supabase.from('device_status').upsert({ id: 'esp32', last_seen: new Date().toISOString() });
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
    const { data } = await supabase.from('device_status').select('last_seen').eq('id', 'esp32').single();
    if (!data) {
      res.json({ online: false });
      return;
    }
    const lastSeen = new Date(data.last_seen).getTime();
    const now = Date.now();
    res.json({ online: (now - lastSeen) < 15000, lastSeen: data.last_seen });
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

    const { error } = await supabase
      .from('commands')
      .update({ executed: true })
      .eq('id', id);

    if (error) throw error;
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
