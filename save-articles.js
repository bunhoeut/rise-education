/* ═══════════════════════════════════════
   RISE EDUCATION — Netlify Function
   Saves articles to Netlify Blobs storage.
   This does NOT touch GitHub and does NOT
   trigger a deploy — publishing articles is
   now permanently 0 credits, guaranteed,
   with no dependency on "Auto Publishing Locked".
═══════════════════════════════════════ */

const { getStore } = require('@netlify/blobs');

exports.handler = async function (event, context) {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { articles, adminPassword } = JSON.parse(event.body);

  if (adminPassword !== 'rise2025admin') {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  if (!articles || !Array.isArray(articles)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid articles data' })
    };
  }

  try {
    const store = getStore('rise-education');
    await store.setJSON('articles', articles);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: `Saved ${articles.length} articles to Netlify Blobs — 0 credits used`
      })
    };

  } catch (err) {
    console.error('save-articles error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
