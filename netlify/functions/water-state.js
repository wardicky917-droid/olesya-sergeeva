const { connectLambda, getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);
  const uid = event.queryStringParameters && event.queryStringParameters.uid;
  if (!uid) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing uid' }) };
  }
  const logStore = getStore('water-log');
  const raw = await logStore.get(uid);
  let entries = [];
  try { entries = raw ? JSON.parse(raw) : []; } catch (e) { entries = []; }
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({ entries: entries })
  };
};
