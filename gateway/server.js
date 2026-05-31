import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabase = createSupabaseClient();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Smart Room AI Gateway</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: radial-gradient(circle at 50% 20%, #0b7185 0, #03151c 38%, #02070b 80%);
            color: #e9fbff;
            font-family: Inter, system-ui, sans-serif;
          }
          main {
            width: min(520px, calc(100% - 32px));
            border: 1px solid #20e8ff66;
            border-radius: 8px;
            padding: 26px;
            background: linear-gradient(180deg, #08232e, #030b10);
            box-shadow: 0 24px 70px #000b, 0 0 46px #10ddea33;
          }
          h1 { margin: 0 0 8px; font-size: 30px; }
          p { color: #7fefff; line-height: 1.5; }
          code { color: #20f3ff; }
        </style>
      </head>
      <body>
        <main>
          <h1>Smart Room AI Gateway</h1>
          <p>Gateway is online. Use <code>/health</code> to check Groq and Supabase env status.</p>
        </main>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'smart-room-ai-gateway',
    groq: Boolean(process.env.GROQ_API_KEY),
    supabase: Boolean(supabase)
  });
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

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return url && key ? createClient(url, key) : null;
}

function getMessageText(body) {
  return String(body.message || body.prompt || body.text || '').trim();
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
