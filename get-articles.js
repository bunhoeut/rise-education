/* ═══════════════════════════════════════
   RISE EDUCATION — Netlify Function
   Reads articles from Netlify Blobs storage.
   Zero connection to GitHub/Git — reading or
   writing here NEVER triggers a site deploy,
   so it NEVER consumes build credits.
═══════════════════════════════════════ */

const { getStore } = require('@netlify/blobs');

exports.handler = async function (event, context) {
  try {
    const store = getStore('rise-education');

    let articles = await store.get('articles', { type: 'json' });

    // First run ever: Blobs is empty. Seed it once from the existing
    // static articles.json so nothing already published gets lost.
    if (!articles) {
      const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
      const res = await fetch(`${siteUrl}/articles.json`);
      articles = await res.json();
      await store.setJSON('articles', articles);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify(articles)
    };

  } catch (err) {
    console.error('get-articles error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
