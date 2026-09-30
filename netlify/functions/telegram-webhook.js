const { connectLambda, getStore } = require('@netlify/blobs');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = 'https://api.telegram.org/bot' + TOKEN;

const KEYBOARD = {
  keyboard: [
    ['💧 Стакан +200', '☕ Чашка +250'],
    ['🍶 Бутылка +500', '🚰 Большая бутылка +750']
  ],
  resize_keyboard: true,
  is_persistent: true
};

const AMOUNTS = {
  '💧 Стакан +200': 200,
  '☕ Чашка +250': 250,
  '🍶 Бутылка +500': 500,
  '🚰 Большая бутылка +750': 750
};

async function tgCall(method, payload) {
  const res = await fetch(API + '/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

exports.handler = async (event) => {
  connectLambda(event);
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };
  if (!TOKEN) return { statusCode: 500, body: 'no token configured' };

  let update;
  try { update = JSON.parse(event.body); } catch (e) { return { statusCode: 200, body: 'ok' }; }

  const msg = update.message;
  if (!msg || !msg.text) return { statusCode: 200, body: 'ok' };

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const linksStore = getStore('chat-links');
  const logStore = getStore('water-log');

  if (text.indexOf('/start') === 0) {
    const parts = text.split(' ');
    const payload = parts[1];
    if (payload) {
      await linksStore.set(String(chatId), payload);
      await tgCall('sendMessage', {
        chat_id: chatId,
        text: 'Готово! Дневник привязан 💧 Нажимай кнопки ниже, чтобы отмечать воду — записи появятся в приложении.',
        reply_markup: KEYBOARD
      });
    } else {
      const existing = await linksStore.get(String(chatId));
      if (existing) {
        await tgCall('sendMessage', {
          chat_id: chatId,
          text: 'Дневник уже привязан. Нажимай кнопки ниже, чтобы добавить воду 👇',
          reply_markup: KEYBOARD
        });
      } else {
        await tgCall('sendMessage', {
          chat_id: chatId,
          text: 'Привет! Чтобы привязать этот чат к дневнику воды, открой приложение и нажми «Подключить Telegram» — оттуда придёт специальная ссылка.'
        });
      }
    }
    return { statusCode: 200, body: 'ok' };
  }

  const uid = await linksStore.get(String(chatId));
  if (!uid) {
    await tgCall('sendMessage', {
      chat_id: chatId,
      text: 'Этот чат ещё не привязан к дневнику. Открой приложение и нажми «Подключить Telegram».'
    });
    return { statusCode: 200, body: 'ok' };
  }

  let amount = AMOUNTS[text];
  if (!amount) {
    const n = Number(text.replace(',', '.'));
    if (n && n > 0 && n <= 5000) amount = Math.round(n);
  }

  if (!amount) {
    await tgCall('sendMessage', {
      chat_id: chatId,
      text: 'Не понял количество. Нажми кнопку ниже или пришли число в мл (например, 300).',
      reply_markup: KEYBOARD
    });
    return { statusCode: 200, body: 'ok' };
  }

  const entryId = 'tg' + msg.message_id + '_' + chatId;
  const raw = await logStore.get(uid);
  let entries = [];
  try { entries = raw ? JSON.parse(raw) : []; } catch (e) { entries = []; }
  if (!entries.some(function (e) { return e.id === entryId; })) {
    entries.push({ id: entryId, amount: amount, ts: msg.date ? msg.date * 1000 : Date.now() });
    if (entries.length > 200) entries = entries.slice(-200);
    await logStore.set(uid, JSON.stringify(entries));
  }

  await tgCall('sendMessage', {
    chat_id: chatId,
    text: 'Добавлено ' + amount + ' мл 💧',
    reply_markup: KEYBOARD
  });

  return { statusCode: 200, body: 'ok' };
};
