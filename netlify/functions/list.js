exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const params = event.queryStringParameters || {};
    const scriptUrl = params.scriptUrl || process.env.GOOGLE_SCRIPT_URL;
    const action = params.action || 'list';
    const url = scriptUrl + '?action=' + action;
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
