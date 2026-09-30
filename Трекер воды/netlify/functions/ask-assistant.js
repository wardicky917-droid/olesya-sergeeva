exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method not allowed' }) };
  }

  let message = '', context = '';
  try {
    const body = JSON.parse(event.body || '{}');
    message = String(body.message || '').slice(0, 2000);
    context = String(body.context || '').slice(0, 500);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bad request' }) };
  }
  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'empty message' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'assistant not configured' }) };
  }

  const systemPrompt = 'Ты дружелюбный помощник внутри приложения «Дневник воды» — личного трекера выпитой воды. ' +
    'Отвечай кратко (2-5 предложений), по-русски, тепло и по делу. Можно отвечать на вопросы о питьевом режиме, ' +
    'самочувствии, а также на любые другие вопросы пользователя. Если уместно, учитывай контекст о сегодняшнем ' +
    'прогрессе, который дан ниже.' + (context ? ('\n\nКонтекст: ' + context) : '');

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      const errMsg = (data && data.error && data.error.message) || 'anthropic error';
      return { statusCode: resp.status, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: errMsg }) };
    }
    const reply = (data.content && data.content[0] && data.content[0].text) || '';
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({ reply: reply })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'request failed' }) };
  }
};
