// Telegram "home board" bot.
//
// Long-polls getUpdates (outbound only — no webhook/public URL needed, works
// behind the home NAT). Routes each message to a memo / dinner / shopping
// section by command prefix or by forum-topic id, persists to board.json, and
// exposes the data to server.js for the display widget (/api/board).
//
// Enable by setting TELEGRAM_BOT_TOKEN (and ideally TELEGRAM_ALLOWED_CHATS) in
// .env. With no token the bot stays dormant and getBoard() just returns
// whatever is stored on disk.

const fs = require('fs');
const path = require('path');

const BOARD_FILE = path.join(__dirname, 'board.json');
const MEMO_MAX = 12;
const SHOP_MAX = 40;

function emptyBoard() {
  return { offset: 0, memos: [], dinner: null, shopping: [] };
}

function loadBoard() {
  try {
    return { ...emptyBoard(), ...JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8')) };
  } catch (e) {
    return emptyBoard();
  }
}

function saveBoard(b) {
  try {
    fs.writeFileSync(BOARD_FILE, JSON.stringify(b, null, 2));
  } catch (e) {
    console.error('Telegram board save failed:', e.message);
  }
}

// Decide which section a plain (non-command) message belongs to: explicit
// prefix wins, then the forum-topic mapping, else it's a memo.
function classifySection(text, threadId, cfg) {
  const prefixes = [
    ['dinner', /^(dinner|ruoka|meal|illallinen)\s*[:!\-]\s*/i],
    ['shopping', /^(shop|osta|kauppa|buy|ostos)\s*[:!\-]\s*/i],
    ['memo', /^(memo|muistio|note|lappu)\s*[:!\-]\s*/i],
  ];
  for (const [section, re] of prefixes) {
    if (re.test(text)) return { section, stripped: text.replace(re, '').trim() };
  }
  const topics = (cfg && cfg.topics) || {};
  if (threadId != null) {
    if (String(threadId) === String(topics.meals)) return { section: 'dinner', stripped: text.trim() };
    if (String(threadId) === String(topics.shopping)) return { section: 'shopping', stripped: text.trim() };
    if (String(threadId) === String(topics.memos)) return { section: 'memo', stripped: text.trim() };
  }
  return { section: 'memo', stripped: text.trim() };
}

// Apply one incoming message to the board (mutates `board`). Returns an optional
// { reply } string to send back to the chat. Pure aside from mutating `board`,
// so it can be unit-tested with a synthetic message object.
function applyMessage(board, msg, cfg) {
  const text = (msg.text || '').trim();
  if (!text) return null;
  const from = (msg.from && (msg.from.first_name || msg.from.username)) || '';
  const ts = msg.date ? msg.date * 1000 : Date.now();
  const threadId = msg.message_thread_id;

  if (text.startsWith('/')) {
    const parts = text.slice(1).split(/\s+/);
    const base = parts[0].split('@')[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    if (base === 'id' || base === 'start') {
      return { reply: `chat_id: ${msg.chat.id}\ntopic_id: ${threadId != null ? threadId : '(none / General)'}` };
    }
    if (base === 'help') {
      return { reply: [
        'Post text to add a memo. Prefixes route it:',
        '  dinner: tacos   ·   shop: milk, eggs   ·   memo: call plumber',
        'Commands: /done <item>, /rm <item>, /clear [memos|shopping|dinner|all], /id',
      ].join('\n') };
    }
    if (base === 'clear') {
      const what = (arg || 'all').toLowerCase();
      if (what === 'memos' || what === 'all') board.memos = [];
      if (what === 'shopping' || what === 'all') board.shopping = [];
      if (what === 'dinner' || what === 'all') board.dinner = null;
      return { reply: `Cleared ${what}.` };
    }
    if (base === 'done' && arg) {
      const it = board.shopping.find(i => i.text.toLowerCase() === arg.toLowerCase());
      if (it) { it.done = true; return { reply: `✓ ${it.text}` }; }
      return { reply: `Not on the list: ${arg}` };
    }
    if (base === 'rm' && arg) {
      const before = board.shopping.length;
      board.shopping = board.shopping.filter(i => i.text.toLowerCase() !== arg.toLowerCase());
      return { reply: board.shopping.length < before ? `Removed ${arg}` : `Not found: ${arg}` };
    }
    return { reply: `Unknown command /${base}. Try /help.` };
  }

  const { section, stripped } = classifySection(text, threadId, cfg);
  if (!stripped) return null;

  if (section === 'dinner') {
    board.dinner = { text: stripped, from, ts };
    return { reply: `🍽 Dinner: ${stripped}` };
  }
  if (section === 'shopping') {
    const items = stripped.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    const added = [];
    for (const item of items) {
      if (!board.shopping.some(i => i.text.toLowerCase() === item.toLowerCase())) {
        board.shopping.push({ text: item, done: false, ts });
        added.push(item);
      }
    }
    board.shopping = board.shopping.slice(-SHOP_MAX);
    return { reply: added.length ? `🛒 Added: ${added.join(', ')}` : 'Already on the list.' };
  }

  board.memos.unshift({ text: stripped, from, ts });
  board.memos = board.memos.slice(0, MEMO_MAX);
  return { reply: '📌 Noted.' };
}

async function tgCall(token, method, params) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

// Start the bot. getConfig() returns live config (topic mapping) from settings.
// Returns { getBoard } for the API layer.
function initTelegram(getConfig) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('Telegram: TELEGRAM_BOT_TOKEN not set — bot disabled.');
    let cached = loadBoard();
    return { getBoard: () => cached, reload: () => (cached = loadBoard()) };
  }

  const allowed = (process.env.TELEGRAM_ALLOWED_CHATS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const board = loadBoard();

  async function poll() {
    try {
      const resp = await tgCall(token, 'getUpdates', {
        offset: board.offset + 1, timeout: 50, allowed_updates: ['message'],
      });
      if (resp && resp.ok && Array.isArray(resp.result)) {
        for (const up of resp.result) {
          board.offset = up.update_id;
          const msg = up.message;
          if (!msg || !msg.chat) continue;
          if (allowed.length && !allowed.includes(String(msg.chat.id))) continue;
          let out = null;
          try { out = applyMessage(board, msg, getConfig()); }
          catch (e) { console.error('Telegram apply error:', e.message); }
          if (out && out.reply) {
            try {
              await tgCall(token, 'sendMessage', {
                chat_id: msg.chat.id,
                message_thread_id: msg.message_thread_id,
                text: out.reply,
              });
            } catch (e) { console.error('Telegram reply error:', e.message); }
          }
        }
        saveBoard(board);
      }
    } catch (e) {
      console.error('Telegram poll error:', e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
    setImmediate(poll);
  }

  console.log(`Telegram: bot enabled (${allowed.length ? allowed.length + ' allowed chat(s)' : 'ALL chats — set TELEGRAM_ALLOWED_CHATS!'}).`);
  poll();
  return { getBoard: () => board, reload: () => {} };
}

module.exports = { initTelegram, applyMessage, classifySection, loadBoard, emptyBoard };
