
// ═══════════════════════════════════════════════════════════
//   AniVibeHub ULTRA — script.js
//   Cyberpunk Anime | Firebase + Cloudinary + WebRTC
// ═══════════════════════════════════════════════════════════

// ╔═══════════════════════════════════════════════════════════╗
// ║  STEP 1 — PASTE YOUR FIREBASE CONFIG                     ║
// ║  Go to: console.firebase.google.com                      ║
// ║  → Project Settings → Your Apps → Web → Config          ║
// ╚═══════════════════════════════════════════════════════════╝
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBdPtkcoq_mKWDUvuzgglsu_tMUzU6pJ-A",
  authDomain:        "anivibehub-c6d17.firebaseapp.com",
  databaseURL:       "https://anivibehub-c6d17-default-rtdb.firebaseio.com",
  projectId:         "anivibehub-c6d17",
  storageBucket:     "anivibehub-c6d17.firebasestorage.app",
  messagingSenderId: "629029424242",
  appId:             "1:629029424242:web:0ad8c858af2fbc3882c6eb"
};

// ╔═══════════════════════════════════════════════════════════╗
// ║  STEP 2 — PASTE YOUR CLOUDINARY DETAILS (FREE)           ║
// ║  Go to: cloudinary.com → Dashboard                       ║
// ║  Upload Preset: Settings → Upload → Add Preset           ║
// ║  (Set Signing Mode = "Unsigned", name = anivibe_upload)  ║
// ╚═══════════════════════════════════════════════════════════╝
const CLOUDINARY_CLOUD_NAME    = "dinzdtjjt";
const CLOUDINARY_UPLOAD_PRESET = "anivibe_upload";

// ═══════════════════════════════════════════════════════════
//   VISUAL EFFECTS — MESH, CURSOR, KANJI
// ═══════════════════════════════════════════════════════════

// ── ANIMATED MESH BACKGROUND ─────────────────────────────
(function initMesh() {
  const canvas = document.getElementById('meshCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, points;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    createPoints();
  }

  function createPoints() {
    points = [];
    const count = Math.floor((W * H) / 18000);
    for (let i = 0; i < count; i++) {
      points.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r:  Math.random() * 2 + 1
      });
    }
  }

  const COLORS = ['#ff2d78','#9333ea','#00f5ff','#00ff9d'];
  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    // Draw connections
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx   = points[i].x - points[j].x;
        const dy   = points[i].y - points[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          const alpha = (1 - dist/140) * 0.35;
          const colorIdx = (i + j) % COLORS.length;
          ctx.strokeStyle = COLORS[colorIdx].replace('#','') === COLORS[colorIdx].replace('#','')
            ? `${COLORS[colorIdx]}${Math.floor(alpha * 255).toString(16).padStart(2,'0')}`
            : COLORS[colorIdx];
          ctx.globalAlpha = alpha;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // Draw points
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Move
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

// ── CUSTOM CURSOR ─────────────────────────────────────────
(function initCursor() {
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform  = `translate(${mx - 4}px, ${my - 4}px)`;
  });

  function animateRing() {
    rx += (mx - rx - 18) * 0.12;
    ry += (my - ry - 18) * 0.12;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.addEventListener('mouseover', e => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' ||
        e.target.tagName === 'INPUT'  || e.target.tagName === 'LABEL' ||
        e.target.closest('button') || e.target.closest('a')) {
      ring.classList.add('hovering');
    } else {
      ring.classList.remove('hovering');
    }
  });
})();

// ── FLOATING KANJI ────────────────────────────────────────
(function initKanji() {
  const chars = ['愛','夢','星','空','風','火','水','光','闇','心','魂','力','美','花','月','神','侍','桜','剣','道'];
  const cont  = document.getElementById('kanjiBg');
  if (!cont) return;

  setInterval(() => {
    const el = document.createElement('div');
    el.className   = 'kanji-char';
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    el.style.left  = Math.random() * 100 + 'vw';
    el.style.animationDuration  = (Math.random() * 20 + 15) + 's';
    el.style.animationDelay     = '0s';
    el.style.fontSize = (Math.random() * 40 + 20) + 'px';
    cont.appendChild(el);
    setTimeout(() => el.remove(), 38000);
  }, 1500);
})();

// ── AUTH TAB INDICATOR ────────────────────────────────────
(function initAuthTabs() {
  const ind = document.getElementById('atabIndicator');
  const loginTab = document.getElementById('atab-login');
  const regTab   = document.getElementById('atab-register');
  if (!ind) return;

  document.addEventListener('click', e => {
    if (e.target.id === 'atab-register') ind.classList.add('right');
    if (e.target.id === 'atab-login')    ind.classList.remove('right');
  });
})();

// ═══════════════════════════════════════════════════════════
//   CLOUDINARY UPLOAD — FREE
// ═══════════════════════════════════════════════════════════
async function uploadToCloudinary(file) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res  = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method:'POST', body:form }
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed. Check cloud name & upload preset.');
  return data.secure_url;
}

// ═══════════════════════════════════════════════════════════
//   FIREBASE LOADER
// ═══════════════════════════════════════════════════════════
const FB_SCRIPTS = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js'
];

function loadScript(src) {
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve;
    document.head.appendChild(s);
  });
}

Promise.all(FB_SCRIPTS.map(loadScript)).then(() => {
  firebase.initializeApp(FIREBASE_CONFIG);
  APP._init();
});

// ═══════════════════════════════════════════════════════════
//   MAIN APP
// ═══════════════════════════════════════════════════════════
const APP = {

  auth: null, db: null, rtdb: null,
  me: null, allUsers: [],
  currentChatUID: null, chatUnsub: null,
  currentGroupId: null, groupUnsub: null,
  peerConn: null, localStream: null,
  isMuted: false, isCamOff: false,
  incomingCallData: null,
  _toastTimer: null,

  // ── INIT ──────────────────────────────────────────────
  _init() {
    this.auth = firebase.auth();
    this.db   = firebase.firestore();
    this.rtdb = firebase.database();

    this.auth.onAuthStateChanged(async user => {
      if (user) {
        const snap = await this.db.collection('users').doc(user.uid).get();
        if (snap.exists) {
          this.me = { uid: user.uid, ...snap.data() };
          this._showApp();
        }
      } else {
        this.me = null;
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display    = 'none';
      }
    });
  },

  // ── AUTH ──────────────────────────────────────────────
  async register() {
    const name     = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
    const email    = document.getElementById('regEmail').value.trim();
    const pass     = document.getElementById('regPass').value;
    const bio      = document.getElementById('regBio').value.trim();
    const errEl    = document.getElementById('regError');
    errEl.textContent = '';

    if (!name || !username || !email || !pass) { errEl.textContent = '⚠️ Fill all required fields'; return; }
    if (pass.length < 6) { errEl.textContent = '⚠️ Password needs 6+ characters'; return; }

    try {
      this._toast('⏳ Creating your account...');
      const cred = await this.auth.createUserWithEmailAndPassword(email, pass);
      let avatarURL = `https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`;
      const file    = document.getElementById('regAvatarFile').files[0];
      if (file) { this._toast('⏳ Uploading photo...'); avatarURL = await uploadToCloudinary(file); }

      const userData = {
        uid: cred.user.uid, name, username, email,
        bio: bio || 'New to AniVibeHub ⚡',
        avatar: avatarURL, banner: '',
        followers: 0, posts: 0, groups: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await this.db.collection('users').doc(cred.user.uid).set(userData);
      await cred.user.updateProfile({ displayName: name, photoURL: avatarURL });
      this._setOnline(cred.user.uid, true);
      this._toast('🌟 Welcome to AniVibeHub!');
    } catch(e) { errEl.textContent = '❌ ' + e.message; }
  },

  async login() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    try {
      await this.auth.signInWithEmailAndPassword(email, pass);
      this._toast('⚡ Welcome back!');
    } catch(e) { errEl.textContent = '❌ Wrong email or password'; }
  },

  async logout() {
    if (this.me) this._setOnline(this.me.uid, false);
    await this.auth.signOut();
  },

  switchForm(to) {
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    document.getElementById(to === 'register' ? 'registerForm' : 'loginForm').classList.add('active');
    document.querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
    document.getElementById('atab-' + to).classList.add('active');
  },

  previewAvatar(input) {
    if (input.files[0]) {
      const r = new FileReader();
      r.onload = e => document.getElementById('regAvatarPreview').src = e.target.result;
      r.readAsDataURL(input.files[0]);
    }
  },

  _setOnline(uid, online) {
    const r = this.rtdb.ref(`status/${uid}`);
    r.set({ online, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    if (online) r.onDisconnect().set({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
  },

  // ── SHOW APP ──────────────────────────────────────────
  _showApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display    = 'flex';
    this._updateUI();
    this._setOnline(this.me.uid, true);
    this._loadFeed();
    this._loadAllUsers();
    this._loadGroups();
    this._loadProfile();
    this._listenCalls();
  },

  _updateUI() {
    const set = (id, val, prop='textContent') => { const el = document.getElementById(id); if(el) el[prop] = val; };
    set('sbName',            this.me.name);
    set('sbAvatar',          this.me.avatar, 'src');
    set('postComposerAv',    this.me.avatar, 'src');
    set('postComposerName',  this.me.name);
    set('profileAvatar',     this.me.avatar, 'src');
    set('profileName',       this.me.name);
    set('profileHandle',     '@' + this.me.username);
    set('profileBio',        this.me.bio);
    if (this.me.banner) {
      const b = document.getElementById('profileBanner');
      if (b) b.style.background = `url(${this.me.banner}) center/cover no-repeat`;
    }
  },

  // ── NAVIGATION ────────────────────────────────────────
  openTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    const nb = document.getElementById('nav-' + tab);
    if (nb) nb.classList.add('active');
    if (window.innerWidth <= 768) this.closeSidebar();
    if (tab === 'explore') this._renderExplore(this.allUsers);
    if (tab === 'calls')   this._renderCallUsers(this.allUsers);
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sbOverlay').classList.toggle('show');
  },
  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sbOverlay').classList.remove('show');
  },

  // ── POSTS ─────────────────────────────────────────────
  toggleLinkBox() {
    const el = document.getElementById('postLinkInput');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    if (el.style.display === 'block') el.focus();
  },

  previewPostMedia(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('postMediaPreview');
      prev.innerHTML = input.files[0].type.startsWith('video')
        ? `<video src="${e.target.result}" controls style="max-width:100%;border-radius:12px;margin-top:8px"></video>`
        : `<img src="${e.target.result}" style="max-width:100%;border-radius:12px;margin-top:8px"/>`;
    };
    reader.readAsDataURL(input.files[0]);
  },

  async submitPost() {
    const text = document.getElementById('postText').value.trim();
    const link = document.getElementById('postLinkInput').value.trim();
    const file = document.getElementById('postMediaFile').files[0];
    if (!text && !link && !file) { this._toast('⚠️ Add something first!'); return; }

    this._toast('⏳ Posting...');
    let mediaURL = '', mediaType = '';
    if (file) { mediaURL = await uploadToCloudinary(file); mediaType = file.type.startsWith('video') ? 'video' : 'image'; }

    await this.db.collection('posts').add({
      uid: this.me.uid, name: this.me.name, username: this.me.username, avatar: this.me.avatar,
      text, link, mediaURL, mediaType, likes: 0, likedBy: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await this.db.collection('users').doc(this.me.uid).update({ posts: firebase.firestore.FieldValue.increment(1) });
    this.me.posts = (this.me.posts||0) + 1;

    this.closeModal('postModal');
    ['postText','postLinkInput','postMediaFile'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    document.getElementById('postLinkInput').style.display = 'none';
    document.getElementById('postMediaPreview').innerHTML  = '';
    this._toast('🚀 Post live!');
  },

  _loadFeed() {
    this.db.collection('posts').orderBy('createdAt','desc').onSnapshot(snap => {
      const feed = document.getElementById('postsFeed');
      feed.innerHTML = '';
      if (snap.empty) { feed.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">🌸 No posts yet — be the first!</div>'; return; }
      snap.forEach(d => feed.appendChild(this._postCard({ id:d.id, ...d.data() })));
      this._buildStories(snap);
    });
  },

  _postCard(post) {
    const div   = document.createElement('div');
    div.className = 'post-card';
    const liked   = (post.likedBy||[]).includes(this.me?.uid);
    const time    = post.createdAt?.toDate ? this._ago(post.createdAt.toDate()) : 'now';
    div.innerHTML = `
      <div class="pc-head">
        <img src="${post.avatar}" class="pc-av" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${post.username}'" onclick="APP._goProfile('${post.uid}')"/>
        <div>
          <div class="pc-name" onclick="APP._goProfile('${post.uid}')">${post.name}</div>
          <div class="pc-time">@${post.username} · ${time}</div>
        </div>
        ${post.uid===this.me?.uid ? `<button class="pc-delete" onclick="APP._delPost('${post.id}')"><i class="fas fa-trash"></i></button>` : ''}
      </div>
      ${post.text ? `<div class="pc-text">${this._links(post.text)}</div>` : ''}
      ${post.mediaURL && post.mediaType==='image' ? `<img src="${post.mediaURL}" class="pc-media"/>` : ''}
      ${post.mediaURL && post.mediaType==='video' ? `<video src="${post.mediaURL}" controls class="pc-media"></video>` : ''}
      ${post.link ? `<div class="pc-link">🔗 <a href="${post.link}" target="_blank" rel="noopener noreferrer">${post.link}</a></div>` : ''}
      <div class="pc-actions">
        <button class="pc-btn ${liked?'liked':''}" onclick="APP._like('${post.id}')"><i class="fas fa-heart"></i> ${post.likes||0}</button>
        <button class="pc-btn" onclick="APP.openChatWith('${post.uid}')"><i class="fas fa-comment"></i> Message</button>
        <button class="pc-btn" onclick="APP._share('${post.id}')"><i class="fas fa-share-nodes"></i> Share</button>
      </div>`;
    return div;
  },

  async _like(id) {
    const ref  = this.db.collection('posts').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return;
    const { likes, likedBy=[] } = snap.data();
    const already = likedBy.includes(this.me.uid);
    await ref.update({
      likes: firebase.firestore.FieldValue.increment(already ? -1 : 1),
      likedBy: already ? firebase.firestore.FieldValue.arrayRemove(this.me.uid) : firebase.firestore.FieldValue.arrayUnion(this.me.uid)
    });
  },

  async _delPost(id) {
    if (!confirm('Delete this post?')) return;
    await this.db.collection('posts').doc(id).delete();
    this._toast('🗑️ Post deleted');
  },

  _share(id) { navigator.clipboard?.writeText(location.href + '?p=' + id); this._toast('🔗 Link copied!'); },
  _goProfile(uid) { if (uid===this.me.uid) this.openTab('profile'); else this.openChatWith(uid); },
  _links(t) { return t.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--neon-cyan)">$1</a>'); },

  _buildStories(snap) {
    const row    = document.getElementById('storiesRow');
    const addBtn = row.querySelector('.story-add-card');
    row.innerHTML = ''; row.appendChild(addBtn);
    const seen = new Set();
    snap.forEach(d => {
      const p = d.data();
      if (seen.has(p.uid)) return; seen.add(p.uid);
      const el = document.createElement('div');
      el.className = 'story-item-card';
      el.onclick   = () => this.openChatWith(p.uid);
      el.innerHTML = `<div class="story-ring"><img src="${p.avatar}" class="story-av" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${p.username}'"/></div><span>${p.name.split(' ')[0]}</span>`;
      row.appendChild(el);
    });
  },

  // ── USERS ─────────────────────────────────────────────
  async _loadAllUsers() {
    this.db.collection('users').onSnapshot(snap => {
      this.allUsers = [];
      snap.forEach(d => { if (d.id !== this.me.uid) this.allUsers.push({ uid:d.id, ...d.data() }); });
      this._renderChatList(this.allUsers);
      this._liveOnline();
    });
  },

  _liveOnline() {
    this.rtdb.ref('status').on('value', snap => {
      const s    = snap.val() || {};
      const list = document.getElementById('onlineUsersList');
      list.innerHTML = '';
      this.allUsers.filter(u => s[u.uid]?.online).forEach(u => {
        const div = document.createElement('div');
        div.className = 'online-user-item';
        div.onclick   = () => this.openChatWith(u.uid);
        div.innerHTML = `<img src="${u.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'" alt="${u.name}"/><span>${u.name.split(' ')[0]}</span><span class="green-dot"></span>`;
        list.appendChild(div);
      });
    });
  },

  // ── CHAT ──────────────────────────────────────────────
  _cid(a,b) { return [a,b].sort().join('__'); },

  _renderChatList(users) {
    const list = document.getElementById('chatUsersList');
    list.innerHTML = '';
    users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'chat-user-row'; div.id = 'cu-'+u.uid;
      div.onclick = () => this.openChatWith(u.uid);
      div.innerHTML = `
        <img src="${u.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'" alt="${u.name}"/>
        <div><div class="cu-name">${u.name}</div><div class="cu-sub">@${u.username}</div></div>
        <div class="cu-dot" id="dot-${u.uid}"></div>`;
      list.appendChild(div);
    });
    this.rtdb.ref('status').on('value', snap => {
      const s = snap.val() || {};
      users.forEach(u => {
        const dot = document.getElementById('dot-'+u.uid);
        if (dot) dot.style.background = s[u.uid]?.online ? 'var(--neon-green)' : '#333';
      });
    });
  },

  filterChat() {
    const q = document.getElementById('chatSearch').value.toLowerCase();
    document.querySelectorAll('.chat-user-row').forEach(r => {
      r.style.display = r.querySelector('.cu-name').textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  openChatWith(uid) {
    const user = this.allUsers.find(u => u.uid === uid);
    if (!user) return;
    this.currentChatUID = uid;
    this.openTab('chat');
    document.querySelectorAll('.chat-user-row').forEach(r => r.classList.remove('active'));
    const row = document.getElementById('cu-'+uid); if (row) row.classList.add('active');

    const win = document.getElementById('chatMain');
    win.innerHTML = `
      <div class="cw-header">
        <img src="${user.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${user.username}'" class="cw-av" alt="${user.name}"/>
        <div><div class="cw-name">${user.name}</div><div class="cw-handle" id="cws-${uid}">loading...</div></div>
        <div class="cw-call-btns">
          <button class="cw-call-btn audio" onclick="APP.startCall('${uid}',false)" title="Audio Call"><i class="fas fa-phone"></i></button>
          <button class="cw-call-btn video" onclick="APP.startCall('${uid}',true)"  title="Video Call"><i class="fas fa-video"></i></button>
        </div>
      </div>
      <div class="cw-messages" id="cwMsgs"></div>
      <div class="cw-input-row">
        <label class="cw-attach" title="Send media">
          <i class="fas fa-paperclip"></i>
          <input type="file" accept="image/*,video/*" style="display:none" onchange="APP._sendMedia(this)"/>
        </label>
        <input class="ultra-input flex1" id="cwInput" placeholder="Type a message... ⚡" onkeydown="if(event.key==='Enter')APP._sendMsg()"/>
        <button class="send-btn" onclick="APP._sendMsg()"><i class="fas fa-paper-plane"></i></button>
      </div>`;

    this.rtdb.ref(`status/${uid}`).on('value', snap => {
      const el = document.getElementById(`cws-${uid}`);
      if (el) el.textContent = snap.val()?.online ? '🟢 Online' : '⚫ Offline';
    });

    if (this.chatUnsub) this.chatUnsub();
    const cid = this._cid(this.me.uid, uid);
    this.chatUnsub = this.db.collection('chats').doc(cid).collection('messages')
      .orderBy('createdAt','asc').onSnapshot(snap => {
        const area = document.getElementById('cwMsgs'); if (!area) return;
        area.innerHTML = '';
        if (snap.empty) { area.innerHTML = '<div style="text-align:center;color:var(--muted);padding:30px;margin:auto">Say hi! 👋⚡</div>'; }
        snap.forEach(d => {
          const msg = d.data();
          const div = document.createElement('div');
          div.className = 'msg '+(msg.senderUID===this.me.uid ? 'mine':'theirs');
          if (msg.mediaURL) {
            div.innerHTML = msg.mediaType==='video'
              ? `<video src="${msg.mediaURL}" controls class="msg-media"></video>`
              : `<img src="${msg.mediaURL}" class="msg-media" onclick="window.open('${msg.mediaURL}','_blank')"/>`;
          } else if (msg.text?.startsWith('http')) {
            div.innerHTML = `<a href="${msg.text}" target="_blank" rel="noopener noreferrer">${msg.text}</a>`;
          } else { div.textContent = msg.text; }
          const t = document.createElement('div');
          t.className = 'msg-time'; t.textContent = msg.createdAt?.toDate ? this._ago(msg.createdAt.toDate()) : '';
          div.appendChild(t); area.appendChild(div);
        });
        area.scrollTop = area.scrollHeight;
      });
  },

  async _sendMsg() {
    const input = document.getElementById('cwInput');
    const text  = input?.value.trim();
    if (!text || !this.currentChatUID) return;
    input.value = '';
    await this.db.collection('chats').doc(this._cid(this.me.uid,this.currentChatUID)).collection('messages').add({
      senderUID: this.me.uid, senderName: this.me.name,
      text, mediaURL:'', mediaType:'',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async _sendMedia(input) {
    if (!input.files[0] || !this.currentChatUID) return;
    this._toast('⏳ Uploading...');
    const file = input.files[0];
    const mediaURL  = await uploadToCloudinary(file);
    const mediaType = file.type.startsWith('video') ? 'video' : 'image';
    await this.db.collection('chats').doc(this._cid(this.me.uid,this.currentChatUID)).collection('messages').add({
      senderUID: this.me.uid, senderName: this.me.name,
      text:'', mediaURL, mediaType,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    this._toast('📎 Sent!');
  },

  // ── GROUPS ────────────────────────────────────────────
  _loadGroups() {
    this.db.collection('groups').orderBy('createdAt','desc').onSnapshot(snap => {
      const grid = document.getElementById('groupsGrid');
      grid.innerHTML = '';
      if (snap.empty) { grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">No groups yet — create one! 👥</div>'; return; }
      const EM = { anime:'🌸',gaming:'🎮',music:'🎵',art:'🎨',memes:'😂',study:'📚',sports:'⚽',tech:'💻' };
      snap.forEach(d => {
        const g = { id:d.id, ...d.data() };
        const joined = (g.members||[]).includes(this.me?.uid);
        const card = document.createElement('div'); card.className = 'group-card';
        card.innerHTML = `
          <div class="gc-emoji">${EM[g.theme]||'🌟'}</div>
          <div class="gc-name">${g.name}</div>
          <div class="gc-desc">${g.desc}</div>
          <div class="gc-members">👥 ${(g.members||[]).length} members</div>
          <div class="gc-btns">
            <button class="gc-join-btn ${joined?'joined':''}" onclick="APP._join('${g.id}',${joined})">
              ${joined?'✅ Joined':'＋ Join'}
            </button>
            <button class="gc-chat-btn" onclick="APP._groupChat('${g.id}','${g.name}')"><i class="fas fa-comment"></i></button>
          </div>`;
        grid.appendChild(card);
      });
    });
  },

  async createGroup() {
    const name  = document.getElementById('newGroupName').value.trim();
    const desc  = document.getElementById('newGroupDesc').value.trim();
    const theme = document.getElementById('newGroupTheme').value;
    if (!name) { this._toast('⚠️ Enter a name!'); return; }
    await this.db.collection('groups').add({
      name, desc: desc||'✨ A new vibe space', theme,
      createdBy: this.me.uid, members:[this.me.uid],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    this.closeModal('groupModal');
    document.getElementById('newGroupName').value = '';
    document.getElementById('newGroupDesc').value = '';
    this._toast('🌟 Group created!');
  },

  async _join(gid, isJoined) {
    await this.db.collection('groups').doc(gid).update({
      members: isJoined
        ? firebase.firestore.FieldValue.arrayRemove(this.me.uid)
        : firebase.firestore.FieldValue.arrayUnion(this.me.uid)
    });
    this._toast(isJoined ? 'Left group' : '🌟 Joined!');
  },

  _groupChat(gid, gname) {
    this.currentGroupId = gid;
    document.getElementById('groupChatTitle').textContent = '👥 ' + gname;
    this.openModal('groupChatModal');
    if (this.groupUnsub) this.groupUnsub();
    this.groupUnsub = this.db.collection('groups').doc(gid).collection('messages')
      .orderBy('createdAt','asc').onSnapshot(snap => {
        const area = document.getElementById('groupMessages'); if (!area) return;
        area.innerHTML = '';
        snap.forEach(d => {
          const msg = d.data();
          const div = document.createElement('div');
          div.className = 'msg '+(msg.senderUID===this.me.uid?'mine':'theirs');
          div.textContent = (msg.senderUID!==this.me.uid ? msg.senderName+': ':'') + msg.text;
          const t = document.createElement('div');
          t.className='msg-time'; t.textContent = msg.createdAt?.toDate ? this._ago(msg.createdAt.toDate()):'';
          div.appendChild(t); area.appendChild(div);
        });
        area.scrollTop = area.scrollHeight;
      });
  },

  async sendGroupMessage() {
    const input = document.getElementById('groupMsgInput');
    const text  = input?.value.trim();
    if (!text || !this.currentGroupId) return;
    input.value = '';
    await this.db.collection('groups').doc(this.currentGroupId).collection('messages').add({
      senderUID: this.me.uid, senderName: this.me.name, text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // ── EXPLORE ───────────────────────────────────────────
  _renderExplore(users) {
    const grid = document.getElementById('exploreGrid');
    grid.innerHTML = '';
    if (!users.length) { grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">No users yet 🌸</div>'; return; }
    users.forEach(u => {
      const card = document.createElement('div'); card.className = 'explore-user-card';
      card.onclick = () => this.openChatWith(u.uid);
      card.innerHTML = `
        <img src="${u.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'" class="eu-av" alt="${u.name}"/>
        <div class="eu-name">${u.name}</div>
        <div class="eu-handle">@${u.username}</div>
        <div class="eu-bio">${u.bio||'No bio yet'}</div>
        <div class="eu-btns">
          <button class="eu-msg-btn"  onclick="event.stopPropagation();APP.openChatWith('${u.uid}')"><i class="fas fa-message"></i> Chat</button>
          <button class="eu-call-btn" onclick="event.stopPropagation();APP.startCall('${u.uid}',true)"><i class="fas fa-video"></i></button>
        </div>`;
      grid.appendChild(card);
    });
  },

  filterExplore() {
    const q = document.getElementById('exploreSearch').value.toLowerCase();
    this._renderExplore(this.allUsers.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)));
  },

  // ── PROFILE ───────────────────────────────────────────
  _loadProfile() {
    this.db.collection('posts').where('uid','==',this.me.uid).orderBy('createdAt','desc').onSnapshot(snap => {
      const grid = document.getElementById('myPostsGrid'); grid.innerHTML = '';
      document.getElementById('pStatPosts').textContent = snap.size;
      if (snap.empty) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">No posts yet ⚡</div>'; return; }
      snap.forEach(d => {
        const p = d.data();
        const div = document.createElement('div'); div.className = 'my-post-thumb';
        div.innerHTML = p.mediaURL ? (p.mediaType==='video' ? `<video src="${p.mediaURL}"></video>` : `<img src="${p.mediaURL}" alt="post"/>`) : `<div class="my-post-text-thumb">${p.text?.slice(0,40)||'⚡'}</div>`;
        grid.appendChild(div);
      });
    });
    this.db.collection('groups').onSnapshot(snap => {
      let c = 0; snap.forEach(d => { if ((d.data().members||[]).includes(this.me.uid)) c++; });
      document.getElementById('pStatGroups').textContent  = c;
      document.getElementById('pStatFriends').textContent = this.allUsers.length;
    });
  },

  openEditProfile() {
    document.getElementById('editName').value     = this.me.name;
    document.getElementById('editUsername').value = this.me.username;
    document.getElementById('editBio').value      = this.me.bio;
    this.openModal('editModal');
  },

  async saveProfile() {
    const name     = document.getElementById('editName').value.trim();
    const username = document.getElementById('editUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
    const bio      = document.getElementById('editBio').value.trim();
    if (!name) { this._toast('⚠️ Name required'); return; }
    await this.db.collection('users').doc(this.me.uid).update({ name, username, bio });
    this.me.name = name; this.me.username = username; this.me.bio = bio;
    this._updateUI(); this.closeModal('editModal'); this._toast('✅ Profile updated!');
  },

  async changeProfilePhoto(input) {
    if (!input.files[0]) return;
    this._toast('⏳ Uploading...');
    const url = await uploadToCloudinary(input.files[0]);
    await this.db.collection('users').doc(this.me.uid).update({ avatar: url });
    this.me.avatar = url; this._updateUI(); this._toast('📷 Photo updated!');
  },

  changeBanner() { document.getElementById('bannerInput').click(); },

  async uploadBanner(input) {
    if (!input.files[0]) return;
    this._toast('⏳ Uploading banner...');
    const url = await uploadToCloudinary(input.files[0]);
    await this.db.collection('users').doc(this.me.uid).update({ banner: url });
    this.me.banner = url;
    const b = document.getElementById('profileBanner');
    if (b) b.style.background = `url(${url}) center/cover no-repeat`;
    this._toast('🎨 Banner updated!');
  },

  // ── CALLS ─────────────────────────────────────────────
  _ICE: { iceServers:[{ urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302'] }] },

  _renderCallUsers(users) {
    const grid = document.getElementById('callUsersGrid'); grid.innerHTML = '';
    if (!users.length) { grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">No users yet 🌸</div>'; return; }
    users.forEach(u => {
      const div = document.createElement('div'); div.className = 'call-user-card';
      div.innerHTML = `
        <img src="${u.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'" class="cuc-av" alt="${u.name}"/>
        <div class="cuc-name">${u.name}</div>
        <div class="cuc-btns">
          <button class="cuc-btn audio" onclick="APP.startCall('${u.uid}',false)" title="Audio"><i class="fas fa-phone"></i></button>
          <button class="cuc-btn video" onclick="APP.startCall('${u.uid}',true)"  title="Video"><i class="fas fa-video"></i></button>
        </div>`;
      grid.appendChild(div);
    });
  },

  async startCall(targetUID, withVideo) {
    const user = this.allUsers.find(u => u.uid === targetUID);
    if (!user) { this._toast('❌ User not found'); return; }
    this.isMuted = false; this.isCamOff = false;
    this._showCallUI(user, withVideo, 'Calling... 📡');
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video:withVideo, audio:true });
      if (withVideo) document.getElementById('localVideo').srcObject = this.localStream;
      this.peerConn = new RTCPeerConnection(this._ICE);
      this.localStream.getTracks().forEach(t => this.peerConn.addTrack(t, this.localStream));
      this.peerConn.ontrack = e => { document.getElementById('remoteVideo').srcObject = e.streams[0]; };
      const offer = await this.peerConn.createOffer();
      await this.peerConn.setLocalDescription(offer);
      this.peerConn.onicecandidate = e => { if (e.candidate) this.rtdb.ref(`calls/${targetUID}/callerCandidates`).push(e.candidate.toJSON()); };
      await this.rtdb.ref(`calls/${targetUID}`).set({
        callerUID: this.me.uid, callerName: this.me.name, callerAvatar: this.me.avatar,
        type: withVideo?'video':'audio', offer:{sdp:offer.sdp,type:offer.type},
        status:'calling', timestamp:Date.now()
      });
      this.rtdb.ref(`calls/${targetUID}/answer`).on('value', async snap => {
        if (snap.val() && this.peerConn && !this.peerConn.currentRemoteDescription) {
          await this.peerConn.setRemoteDescription(new RTCSessionDescription(snap.val()));
          document.getElementById('callStatus').textContent = `Connected with ${user.name.split(' ')[0]} ⚡`;
        }
      });
      this.rtdb.ref(`calls/${targetUID}/calleeCandidates`).on('child_added', snap => {
        this.peerConn?.addIceCandidate(new RTCIceCandidate(snap.val()));
      });
    } catch(err) {
      document.getElementById('callStatus').textContent = '❌ Allow camera & mic, then retry';
      this._toast('❌ Need camera/mic permission');
    }
  },

  _listenCalls() {
    if (!this.me) return;
    this.rtdb.ref(`calls/${this.me.uid}`).on('value', snap => {
      const data = snap.val();
      if (!data || data.status!=='calling' || data.callerUID===this.me.uid) return;
      this.incomingCallData = data;
      document.getElementById('incAv').src          = data.callerAvatar;
      document.getElementById('incName').textContent = data.callerName;
      document.getElementById('incType').textContent = data.type==='video' ? '📹 Video Call' : '🎙️ Audio Call';
      document.getElementById('incomingPopup').style.display = 'flex';
      setTimeout(() => { document.getElementById('incomingPopup').style.display='none'; }, 35000);
    });
  },

  async acceptCall() {
    document.getElementById('incomingPopup').style.display = 'none';
    if (!this.incomingCallData) return;
    const withVideo = this.incomingCallData.type === 'video';
    this.isMuted = false; this.isCamOff = false;
    this._showCallUI({ name:this.incomingCallData.callerName, avatar:this.incomingCallData.callerAvatar }, withVideo, 'Connecting... 📡');
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video:withVideo, audio:true });
      if (withVideo) document.getElementById('localVideo').srcObject = this.localStream;
      this.peerConn = new RTCPeerConnection(this._ICE);
      this.localStream.getTracks().forEach(t => this.peerConn.addTrack(t, this.localStream));
      this.peerConn.ontrack = e => { document.getElementById('remoteVideo').srcObject = e.streams[0]; };
      await this.peerConn.setRemoteDescription(new RTCSessionDescription(this.incomingCallData.offer));
      const answer = await this.peerConn.createAnswer();
      await this.peerConn.setLocalDescription(answer);
      this.peerConn.onicecandidate = e => { if (e.candidate) this.rtdb.ref(`calls/${this.me.uid}/calleeCandidates`).push(e.candidate.toJSON()); };
      await this.rtdb.ref(`calls/${this.me.uid}/answer`).set({ sdp:answer.sdp, type:answer.type });
      document.getElementById('callStatus').textContent = 'Connected! ⚡';
    } catch(err) { document.getElementById('callStatus').textContent = '❌ Could not connect'; }
  },

  declineCall() {
    document.getElementById('incomingPopup').style.display = 'none';
    if (this.me) this.rtdb.ref(`calls/${this.me.uid}/status`).set('declined');
    this.incomingCallData = null; this._toast('❌ Declined');
  },

  endCall() {
    if (this.peerConn)    { this.peerConn.close(); this.peerConn = null; }
    if (this.localStream) { this.localStream.getTracks().forEach(t => t.stop()); this.localStream = null; }
    if (this.me) this.rtdb.ref(`calls/${this.me.uid}`).remove();
    document.getElementById('callModal').style.display = 'none';
    this._toast('📞 Call ended');
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
    const btn = document.getElementById('muteBtn');
    btn.innerHTML = this.isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    btn.classList.toggle('off', this.isMuted);
    this._toast(this.isMuted ? '🔇 Muted' : '🎙️ Unmuted');
  },

  toggleCam() {
    this.isCamOff = !this.isCamOff;
    this.localStream?.getVideoTracks().forEach(t => t.enabled = !this.isCamOff);
    const btn = document.getElementById('camBtn');
    btn.innerHTML = this.isCamOff ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
    btn.classList.toggle('off', this.isCamOff);
    this._toast(this.isCamOff ? '📵 Cam off' : '📹 Cam on');
  },

  toggleSpeaker() { document.getElementById('spkBtn').classList.toggle('off'); this._toast('🔊 Speaker toggled'); },

  _showCallUI(user, withVideo, status) {
    document.getElementById('callRemoteAv').src      = user.avatar;
    document.getElementById('callUserName').textContent = user.name;
    document.getElementById('callStatus').textContent   = status;
    document.getElementById('callTypeLabel').textContent = withVideo ? '📹 VIDEO CALL' : '🎙️ AUDIO CALL';
    document.getElementById('callModal').style.display  = 'flex';
    document.getElementById('videoArea').style.display  = withVideo ? 'block' : 'none';
    ['muteBtn','camBtn','spkBtn'].forEach(id => { const b = document.getElementById(id); if(b) b.classList.remove('off'); });
    const mb = document.getElementById('muteBtn'); if(mb) mb.innerHTML = '<i class="fas fa-microphone"></i>';
    const cb = document.getElementById('camBtn');  if(cb) cb.innerHTML = '<i class="fas fa-video"></i>';
  },

  // ── MODALS ────────────────────────────────────────────
  openModal(id)  { document.getElementById(id).style.display = 'flex'; },
  closeModal(id) { document.getElementById(id).style.display = 'none'; },
  closeModalOutside(e, id) { if (e.target.id === id) this.closeModal(id); },

  // ── HELPERS ───────────────────────────────────────────
  _ago(date) {
    const s = Math.floor((Date.now()-date)/1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s/60)   + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    return Math.floor(s/86400) + 'd ago';
  },

  _toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }
}
