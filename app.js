/* ═══════════════════════════════════════
   RISE EDUCATION — Core App Logic
   Shared across all pages
═══════════════════════════════════════ */

// ─── CONFIG ───────────────────────────
const CONFIG = {
  site: { name: "Rise Education", tagline: "អាន • ចេះ • រីកចម្រើន" },
  owner: { name: "Phin Bunhoeut", email: "bunhoeut@gmail.com", phone: "+855 98 975 555" },
  social: {
    telegram_personal: "https://t.me/Bunhoeut",
    telegram_group:    "https://t.me/RiseEducationX",
    facebook:          "https://www.facebook.com/RiseEducationX",
    youtube:           "https://www.youtube.com/@RiseEducationX"
  },
  payment: {
    aba_name:  "PHIN BUNHOEUT",
    aba_phone: "+855 98 975 555",
    aba_khr:   "006 971 055",
    aba_usd:   "002 018 600",
    aba_qr:    "aba-qr.jpg"
  },
  admin_password: "rise2025admin",
  pillars: [
    { id:"growth",  kh:"ការអភិវឌ្ឍខ្លួន",   en:"Personal Growth",  color:"#c8f060", icon:"🌱" },
    { id:"study",   kh:"ជំនាញសិក្សា",        en:"Study Skills",     color:"#60d4f0", icon:"📚" },
    { id:"life",    kh:"ជំនាញជីវិត",          en:"Life Skills",      color:"#f0a060", icon:"💡" },
    { id:"career",  kh:"ការរីកចម្រើនអាជីព",   en:"Career Growth",    color:"#a060f0", icon:"🚀" },
    { id:"finance", kh:"ហិរញ្ញវត្ថុផ្ទាល់ខ្លួន", en:"Personal Finance", color:"#60f0a8", icon:"💰" },
    { id:"comm",    kh:"ទំនាក់ទំនង & ភាសា",   en:"Communication",    color:"#f06088", icon:"🗣️" }
  ]
};

// ─── LOCAL STORAGE KEYS ───────────────
const KEYS = {
  articles: 'rise_articles',
  users:    'rise_users',
  session:  'rise_session',
  admin:    'rise_admin'
};

// ─── DATA LAYER ───────────────────────
const DB = {

  // ─── PUBLIC: Always fetch fresh from articles.json ───────────────
  // Uses ?v=timestamp cache-buster so phones/CDN never serve stale data.
  // Admin panel uses saveArticles() → localStorage separately.
  async getArticles() {
    // If admin is logged in, merge: GitHub base + admin's localStorage edits
    // so newly published articles appear immediately on this browser too.
    if (AdminSession.isLoggedIn()) {
      const adminData = localStorage.getItem(KEYS.articles);
      if (adminData) {
        try { return JSON.parse(adminData); } catch(e) {}
      }
    }

    // For ALL visitors (phone, desktop, any browser):
    // Always fetch from articles.json with a cache-buster timestamp.
    // This guarantees phones always get the latest articles from GitHub.
    try {
      const bust = `?v=${Date.now()}`;
      const res = await fetch(`articles.json${bust}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      return data;
    } catch(e) {
      // Last resort: try localStorage if network fails
      const fallback = localStorage.getItem(KEYS.articles);
      if (fallback) {
        try { return JSON.parse(fallback); } catch(e2) {}
      }
      return [];
    }
  },

  // Admin-only: save published/edited articles to localStorage
  // After saving, admin copies to GitHub (articles.json) to make live for everyone
  saveArticles(articles) {
    localStorage.setItem(KEYS.articles, JSON.stringify(articles));
  },

  async getUsers() {
    const cached = localStorage.getItem(KEYS.users);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }
    try {
      const res = await fetch('users.json');
      const data = await res.json();
      localStorage.setItem(KEYS.users, JSON.stringify(data));
      return data;
    } catch(e) {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem(KEYS.users, JSON.stringify(users));
  },

  async addArticle(article) {
    const articles = await this.getArticles();
    const maxId = articles.reduce((m, a) => Math.max(m, a.id), 0);
    article.id = maxId + 1;
    article.date = new Date().toISOString().split('T')[0];
    article.views = 0;
    articles.unshift(article);
    this.saveArticles(articles);
    return article;
  },

  async updateArticle(id, updates) {
    const articles = await this.getArticles();
    const idx = articles.findIndex(a => a.id === id);
    if (idx !== -1) {
      articles[idx] = { ...articles[idx], ...updates };
      this.saveArticles(articles);
      return articles[idx];
    }
    return null;
  },

  async deleteArticle(id) {
    const articles = await this.getArticles();
    const filtered = articles.filter(a => a.id !== id);
    this.saveArticles(filtered);
  },

  async incrementViews(id) {
    // Views are tracked in localStorage only (not critical to sync)
    const cached = localStorage.getItem(KEYS.articles);
    let articles = [];
    if (cached) {
      try { articles = JSON.parse(cached); } catch(e) {}
    }
    if (articles.length === 0) {
      articles = await this.getArticles();
    }
    const article = articles.find(a => a.id === id);
    if (article) {
      article.views = (article.views || 0) + 1;
      this.saveArticles(articles);
    }
  },

  async addUser(user) {
    const users = await this.getUsers();
    const exists = users.find(u => u.phone === user.phone);
    if (exists) return { error: 'phone_exists' };
    const maxId = users.reduce((m, u) => Math.max(m, u.id), 0);
    user.id = maxId + 1;
    user.registeredDate = new Date().toISOString().split('T')[0];
    user.vip = false;
    user.approved = false;
    user.expiry = null;
    users.push(user);
    this.saveUsers(users);
    return user;
  },

  async activateVIP(userId, plan) {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    user.vip = true;
    user.approved = true;
    user.plan = plan;
    const expiry = new Date();
    if (plan === 'monthly')   expiry.setMonth(expiry.getMonth() + 1);
    if (plan === 'quarterly') expiry.setMonth(expiry.getMonth() + 3);
    if (plan === 'yearly')    expiry.setFullYear(expiry.getFullYear() + 1);
    user.expiry = expiry.toISOString().split('T')[0];
    this.saveUsers(users);
    return user;
  },

  async rejectUser(userId) {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) { user.rejected = true; this.saveUsers(users); }
  }
};

// ─── SESSION ──────────────────────────
const Session = {
  get() {
    const s = localStorage.getItem(KEYS.session);
    return s ? JSON.parse(s) : null;
  },
  set(user) {
    localStorage.setItem(KEYS.session, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(KEYS.session);
  },
  isVIP() {
    const s = this.get();
    if (!s || !s.vip) return false;
    if (s.expiry && new Date(s.expiry) < new Date()) return false;
    return true;
  }
};

const AdminSession = {
  isLoggedIn() { return localStorage.getItem(KEYS.admin) === 'true'; },
  login() { localStorage.setItem(KEYS.admin, 'true'); },
  logout() { localStorage.removeItem(KEYS.admin); }
};

// ─── PILLAR HELPERS ───────────────────
function getPillar(id) {
  return CONFIG.pillars.find(p => p.id === id) || CONFIG.pillars[0];
}

function getPillarColor(id) {
  return getPillar(id).color;
}

function pillarGradient(id) {
  const p = getPillar(id);
  return `linear-gradient(135deg, ${p.color}22 0%, ${p.color}08 100%)`;
}

// ─── ARTICLE CARD BUILDER ─────────────
function buildArticleCard(article, isVIP = false) {
  const pillar = getPillar(article.pillar);
  const hasAccess = article.access === 'free' || isVIP;
  const coverBg = article.coverImage
    ? `<img src="${article.coverImage}" alt="${article.title}" style="width:100%;height:100%;object-fit:cover">`
    : `<div class="article-card-cover-gradient" style="background:${pillarGradient(article.pillar)}">${pillar.icon}</div>`;

  const excerptClass = (!hasAccess && article.access === 'vip') ? 'article-card-excerpt blurred' : 'article-card-excerpt';

  return `
  <div class="article-card" onclick="openArticle(${article.id})">
    <div class="article-card-cover">
      ${coverBg}
      <div class="article-card-badges">
        <span class="badge badge-pillar" style="background:${pillar.color}22;color:${pillar.color};border:1px solid ${pillar.color}33">
          ${pillar.kh}
        </span>
        ${article.access === 'free'
          ? '<span class="badge badge-free">ឥតគិតថ្លៃ</span>'
          : '<span class="badge badge-vip">⭐ ពិសេស</span>'}
      </div>
    </div>
    <div class="article-card-body">
      <div class="article-card-title">${article.title}</div>
      <div class="${excerptClass}">${article.excerpt}</div>
      <div class="article-card-footer">
        <span class="article-card-time">⏱ ${article.readTime} នាទី</span>
        <span class="article-card-read">${hasAccess ? 'អានបន្ត →' : '🔒 VIP'}</span>
      </div>
    </div>
  </div>`;
}

function openArticle(id) {
  window.location.href = `article.html?id=${id}`;
}

// ─── MARKDOWN PARSER (simple) ─────────
function parseMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

// ─── READ TIME CALCULATOR ─────────────
function calcReadTime(content) {
  const words = (content || '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── DATE FORMATTER ───────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── TOAST ────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ─── NAV BUILDER ──────────────────────
function buildNav(activePage = '') {
  const session = Session.get();
  const navHtml = `
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">
        <img src="logo.png" alt="Rise Education" style="height:46px;width:auto;object-fit:contain;display:block" onerror="this.style.display='none'">
        <div class="nav-logo-text">
          <span style="font-family:'Noto Sans Khmer','Inter',sans-serif;font-weight:700;font-size:15px;color:var(--text);letter-spacing:0.04em">RISE EDUCATION</span>
          <span style="font-family:'Noto Sans Khmer',sans-serif;font-size:10px;margin-top:2px">
            <span style="color:var(--read-color)">អាន</span>
            <span style="color:var(--muted2)"> • </span>
            <span style="color:var(--know-color)">ចេះ</span>
            <span style="color:var(--muted2)"> • </span>
            <span style="color:var(--grow-color)">រីកចម្រើន</span>
          </span>
        </div>
      </a>
      <div class="nav-links">
        <a href="index.html" class="${activePage==='home'?'active':''}">ទំព័រដើម</a>
        <a href="pillar.html" class="${activePage==='pillars'?'active':''}">ប្រធានបទ</a>
        <a href="${CONFIG.social.telegram_group}" target="_blank">សហគមន៍</a>
        <a href="about.html" class="${activePage==='about'?'active':''}">អំពីយើង</a>
        <a href="admin.html" style="font-size:12px;color:var(--muted2)" title="Admin Panel">⚙️</a>
      </div>
      <div class="nav-actions">
        ${session
          ? `<span style="font-family:'Noto Sans Khmer',sans-serif;font-size:13px;color:var(--muted)">👤 ${session.name}</span>
             <button class="btn btn-ghost btn-sm" onclick="Session.clear();location.reload()">ចាកចេញ</button>`
          : `<a href="vip-login.html" class="btn btn-ghost btn-sm">ចូលគណនី</a>
             <a href="vip-join.html" class="btn btn-accent btn-sm">ចូលរួម VIP</a>`
        }
      </div>
      <button class="hamburger" id="hamburger" onclick="toggleMobileNav()" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
  <div class="nav-overlay" id="nav-overlay">
    <a href="index.html">ទំព័រដើម</a>
    <a href="pillar.html">ប្រធានបទ</a>
    <a href="${CONFIG.social.telegram_group}" target="_blank">💬 សហគមន៍ Telegram</a>
    <a href="about.html">អំពីយើង</a>
    <div class="nav-overlay-divider"></div>
    ${session
      ? `<a href="#" onclick="Session.clear();location.reload()">ចាកចេញ</a>`
      : `<a href="vip-login.html">ចូលគណនី</a>
         <a href="vip-join.html" style="color:var(--gold)">⭐ ចូលរួម VIP</a>`
    }
  </div>`;
  return navHtml;
}

function toggleMobileNav() {
  const hb = document.getElementById('hamburger');
  const ov = document.getElementById('nav-overlay');
  hb.classList.toggle('open');
  ov.classList.toggle('open');
}

// ─── FOOTER BUILDER ───────────────────
function buildFooter() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand-name">RISE EDUCATION</div>
          <div class="footer-tagline">
            <span style="color:var(--read-color)">អាន</span>
            <span style="color:var(--muted2)"> • </span>
            <span style="color:var(--know-color)">ចេះ</span>
            <span style="color:var(--muted2)"> • </span>
            <span style="color:var(--grow-color)">រីកចម្រើន</span>
          </div>
          <div class="footer-social">
            <a href="${CONFIG.social.facebook}" target="_blank" class="footer-social-fb" title="Facebook">f</a>
            <a href="${CONFIG.social.telegram_group}" target="_blank" class="footer-social-tg" title="Telegram">✈</a>
            <a href="${CONFIG.social.youtube}" target="_blank" class="footer-social-yt" title="YouTube">▶</a>
          </div>
        </div>
        <div>
          <div class="footer-col-title">ប្រធានបទ</div>
          <div class="footer-links">
            ${CONFIG.pillars.map(p =>
              `<a href="pillar.html?pillar=${p.id}">${p.kh}</a>`
            ).join('')}
          </div>
        </div>
        <div>
          <div class="footer-col-title">ទំនាក់ទំនង</div>
          <div class="footer-links">
            <a href="about.html">អំពីយើង</a>
            <a href="${CONFIG.social.telegram_group}" target="_blank">Telegram Group</a>
            <a href="${CONFIG.social.facebook}" target="_blank">Facebook Page</a>
            <a href="${CONFIG.social.youtube}" target="_blank">YouTube Channel</a>
            <a href="mailto:${CONFIG.owner.email}">${CONFIG.owner.email}</a>
            <a href="vip-join.html">ចូលរួម VIP</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="footer-copy">© 2026 Rise Education · បង្កើតដោយ ភិន ប៊ុនហឿត</div>
        <div class="footer-copy">${CONFIG.owner.email} · ${CONFIG.owner.phone}</div>
      </div>
    </div>
  </footer>
  <div id="toast" class="toast"></div>`;
}

// ─── URL PARAMS ───────────────────────
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ─── INIT NAV + FOOTER ────────────────
function initPage(activePage = '') {
  const navEl = document.getElementById('nav-placeholder');
  const footerEl = document.getElementById('footer-placeholder');
  if (navEl) navEl.innerHTML = buildNav(activePage);
  if (footerEl) footerEl.innerHTML = buildFooter();
}
