exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method not allowed' }) };
  }
  let password = '';
  try {
    const body = JSON.parse(event.body || '{}');
    password = String(body.password || '');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bad request' }) };
  }
  const expected = process.env.SITE_PASSWORD || '';
  const ok = !!expected && password === expected;
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({ ok })
  };
};
