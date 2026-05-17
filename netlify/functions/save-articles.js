/* ═══════════════════════════════════════
   RISE EDUCATION — Netlify Function
   Securely saves articles.json to GitHub
   Token stored in Netlify env (never exposed to browser)
═══════════════════════════════════════ */

exports.handler = async function(event, context) {

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Basic security check — must include admin password
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

  // GitHub token from Netlify environment (never exposed to browser)
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = 'bunhoeut';
  const GITHUB_REPO  = 'rise-education';
  const FILE_PATH    = 'articles.json';

  try {
    // Step 1: Get current file SHA (required by GitHub API to update a file)
    const shaRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    const shaData = await shaRes.json();
    const sha = shaData.sha;

    if (!sha) {
      throw new Error('Could not get file SHA from GitHub');
    }

    // Step 2: Encode articles as base64
    const content = Buffer.from(JSON.stringify(articles, null, 2)).toString('base64');

    // Step 3: Push updated articles.json to GitHub
    const updateRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `📝 Auto-save: ${articles.length} articles [Rise Admin]`,
          content: content,
          sha: sha
        })
      }
    );

    const updateData = await updateRes.json();

    if (updateRes.ok) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          message: 'articles.json updated on GitHub!',
          commit: updateData.commit?.sha?.substring(0, 7)
        })
      };
    } else {
      throw new Error(updateData.message || 'GitHub API error');
    }

  } catch (err) {
    console.error('save-articles error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
