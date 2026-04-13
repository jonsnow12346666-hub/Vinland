
// ═══════════════════════════════════════════════════════
//   VINLAND — script.js
//   Firebase + Cloudinary + WebRTC | Full Feature App
// ═══════════════════════════════════════════════════════

// ╔═══════════════════════════════════════════════════════╗
// ║  STEP 1 — PASTE YOUR FIREBASE CONFIG HERE            ║
// ║  Go to: console.firebase.google.com                  ║
// ║  → Project Settings → Your Apps → Web → Config      ║
// ╚═══════════════════════════════════════════════════════╝
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBdPtkcoq_mKWDUvuzgglsu_tMUzU6pJ-A",
  authDomain:        "anivibehub-c6d17.firebaseapp.com",
  databaseURL:       "https://anivibehub-c6d17-default-rtdb.firebaseio.com",
  projectId:         "anivibehub-c6d17",
  storageBucket:     "anivibehub-c6d17.firebasestorage.app",
  messagingSenderId: "629029424242",
  appId:             " 1:629029424242:web:0ad8c858af2fbc3882c6eb"
};

// ╔═══════════════════════════════════════════════════════╗
// ║  STEP 2 — PASTE YOUR CLOUDINARY DETAILS HERE (FREE)  ║
// ║  Go to: cloudinary.com → Dashboard                   ║
// ║  Preset: Settings → Upload → Add Preset → Unsigned   ║
// ╚═══════════════════════════════════════════════════════╝
const CLOUD_NAME   = "PASTE_YOUR_CLOUD_NAME_HERE";
const CLOUD_PRESET = "PASTE_YOUR_UPLOAD_PRESET_HERE";

// ═══════════════════════════════════════════════════════
//   LOAD FIREBASE
// ═══════════════════════════════════════════════════════
const FB_URLS = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js'
];
const loadScript = src => new Promise(res => { const s=document.createElement('script'); s.src=src; s.onload=res; document.head.appendChild(s); });
Promise.all(FB_URLS.map(loadScript)).then(() => { firebase.initializeApp(FIREBASE_CONFIG); APP._boot(); });

// ═══════════════════════════════════════════════════════
//   CLOUDINARY
// ═══════════════════════════════════════════════════════
async function upload(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUD_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method:'POST', body:fd });
  const d = await r.json();
  if (!d.secure_url) throw new Error('Upload failed — check Cloudinary cloud name and preset');
  return d.secure_url;
}

// ═══════════════════════════════════════════════════════
//   BACKGROUND CANVAS
// ═══════════════════════════════════════════════════════
(function bgCanvas() {
  const c = document.getElementById('bgCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts;
  const resize = () => { W=c.width=innerWidth; H=c.height=innerHeight; pts=Array.from({length:Math.floor(W*H/20000)},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3})); };
  const draw = () => {
    ctx.clearRect(0,0,W,H);
    pts.forEach((p,i)=>{ pts.slice(i+1).forEach(q=>{ const d=Math.hypot(p.x-q.x,p.y-q.y); if(d<120){ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.strokeStyle=`rgba(201,168,76,${(1-d/120)*0.15})`; ctx.lineWidth=.6; ctx.stroke(); } }); p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1; ctx.beginPath(); ctx.arc(p.x,p.y,1.5,0,Math.PI*2); ctx.fillStyle='rgba(201,168,76,0.3)'; ctx.fill(); }); requestAnimationFrame(draw);
  };
  window.addEventListener('resize',resize); resize(); draw();
})();

// ═══════════════════════════════════════════════════════
//   SLIDESHOW
// ═══════════════════════════════════════════════════════
let _slideIdx = 0;
function goSlide(n) {
  document.querySelectorAll('.slide').forEach((s,i)=>{ s.classList.toggle('active',i===n); });
  document.querySelectorAll('.dot').forEach((d,i)=>{ d.classList.toggle('active',i===n); });
  _slideIdx = n;
}
setInterval(()=>goSlide((_slideIdx+1)%4), 3500);

// ═══════════════════════════════════════════════════════
//   UI HELPERS
// ═══════════════════════════════════════════════════════
const UI = {
  openModal(id)  { document.getElementById(id).style.display='flex'; },
  closeModal(id) { document.getElementById(id).style.display='none'; },
  bgClose(e,id)  { if(e.target.id===id) this.closeModal(id); },
  toggleEl(id)   { const el=document.getElementById(id); if(!el)return; el.style.display=el.style.display==='none'?'block':'none'; },
  toggleMenu()   {
    const m=document.getElementById('threeDotMenu');
    m.style.display=m.style.display==='none'?'block':'none';
    setTimeout(()=>document.addEventListener('click',()=>m.style.display='none',{once:true}),50);
  },
  toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); },
  closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); },
  showPage(name) {
    APP.openTab(name);
    if(window.innerWidth<=768) this.closeSidebar();
  },
  openEditProfile() {
    const m = APP.me;
    if(!m) return;
    document.getElementById('editName').value     = m.name||'';
    document.getElementById('editUsername').value = m.username||'';
    document.getElementById('editBio').value      = m.bio||'';
    document.getElementById('editGender').value   = m.gender||'';
    document.getElementById('editCountry').value  = m.country||'';
    document.getElementById('editInsta').value    = m.instagram||'';
    document.getElementById('editTelegram').value = m.telegram||'';
    document.getElementById('editFb').value       = m.facebook||'';
    document.getElementById('editSnap').value     = m.snapchat||'';
    this.openModal('editModal');
  }
};

// ═══════════════════════════════════════════════════════
//   AUTH OBJECT
// ═══════════════════════════════════════════════════════
const AUTH = {
  showLogin()    { document.getElementById('loginPanel').classList.add('active'); document.getElementById('regPanel').classList.remove('active'); document.getElementById('tab-login').classList.add('active'); document.getElementById('tab-reg').classList.remove('active'); },
  showRegister() { document.getElementById('regPanel').classList.add('active'); document.getElementById('loginPanel').classList.remove('active'); document.getElementById('tab-reg').classList.add('active'); document.getElementById('tab-login').classList.remove('active'); },

  prevAvatar(input) { if(input.files[0]){ const r=new FileReader(); r.onload=e=>document.getElementById('regAvPrev').src=e.target.result; r.readAsDataURL(input.files[0]); } },

  togglePw(id, btn) {
    const f = document.getElementById(id);
    const show = f.type==='password';
    f.type = show ? 'text' : 'password';
    btn.innerHTML = `<i class="fas fa-eye${show?'-slash':''}"></i>`;
  },

  async googleLogin() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await firebase.auth().signInWithPopup(provider);
      const user = cred.user;
      const snap = await firebase.firestore().collection('users').doc(user.uid).get();
      if (!snap.exists) {
        // New Google user — create profile
        const userData = {
          uid: user.uid, name: user.displayName||'Vinland User',
          username: user.email.split('@')[0].replace(/[^a-z0-9_]/gi,'').toLowerCase(),
          email: user.email, avatar: user.photoURL||`https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}`,
          bio:'', gender:'', country:'', banner:'',
          instagram:'', telegram:'', facebook:'', snapchat:'',
          blocked:[], favourites:[],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await firebase.firestore().collection('users').doc(user.uid).set(userData);
      }
      APP._toast('Welcome!');
    } catch(e) { APP._toast('❌ ' + e.message); }
  },

  async register() {
    const name=document.getElementById('regName').value.trim();
    const username=document.getElementById('regUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
    const email=document.getElementById('regEmail').value.trim();
    const pass=document.getElementById('regPass').value;
    const gender=document.getElementById('regGender').value;
    const country=document.getElementById('regCountry').value;
    const bio=document.getElementById('regBio').value.trim();
    const err=document.getElementById('regErr');
    err.textContent='';
    if(!name||!username||!email||!pass){err.textContent='Please fill all required fields';return;}
    if(pass.length<6){err.textContent='Password must be at least 6 characters';return;}
    try {
      APP._toast('Creating your account...');
      const cred=await firebase.auth().createUserWithEmailAndPassword(email,pass);
      let avatarURL=`https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`;
      const file=document.getElementById('regAvFile').files[0];
      if(file){ APP._toast('Uploading photo...'); avatarURL=await upload(file); }
      await firebase.firestore().collection('users').doc(cred.user.uid).set({
        uid:cred.user.uid, name, username, email, avatar:avatarURL,
        bio:bio||'', gender:gender||'', country:country||'', banner:'',
        instagram:'', telegram:'', facebook:'', snapchat:'',
        blocked:[], favourites:[],
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      await cred.user.updateProfile({displayName:name,photoURL:avatarURL});
    } catch(e){err.textContent='Error: '+e.message;}
  },

  async login() {
    const email=document.getElementById('loginEmail').value.trim();
    const pass=document.getElementById('loginPass').value;
    const err=document.getElementById('loginErr');
    err.textContent='';
    try { await firebase.auth().signInWithEmailAndPassword(email,pass); }
    catch(e){err.textContent='Wrong email or password';}
  },

  async forgotPassword() {
    const email=document.getElementById('loginEmail').value.trim();
    if(!email){APP._toast('Enter your email first');return;}
    try { await firebase.auth().sendPasswordResetEmail(email); APP._toast('✅ Reset link sent to your email!'); }
    catch(e){APP._toast('Error: '+e.message);}
  }
};

// ═══════════════════════════════════════════════════════
//   MAIN APP
// ═══════════════════════════════════════════════════════
const APP = {
  auth:null, db:null, rtdb:null,
  me:null, allUsers:[], blacklist:[],
  currentChatUID:null, chatUnsub:null,
  currentGroupId:null, groupUnsub:null,
  peerConn:null, localStream:null,
  isMuted:false, isCamOff:false,
  incomingData:null, _toastTimer:null,
  isFullscreen:false,

  _boot() {
    this.auth=firebase.auth(); this.db=firebase.firestore(); this.rtdb=firebase.database();
    this.auth.onAuthStateChanged(async user=>{
      if(user){
        const snap=await this.db.collection('users').doc(user.uid).get();
        if(snap.exists){
          this.me={uid:user.uid,...snap.data()};
          this._showApp();
        }
      } else {
        this.me=null;
        document.getElementById('authScreen').style.display='flex';
        document.getElementById('mainApp').style.display='none';
      }
    });
  },

  async logout() {
    if(this.me) this._setOnline(this.me.uid,false);
    await this.auth.signOut();
    this._toast('Logged out');
  },

  async requestPermissions() {
    try { await navigator.mediaDevices.getUserMedia({video:true,audio:true}); this._toast('✅ Camera and mic allowed!'); }
    catch(e){ this._toast('You can allow camera/mic later when making a call'); }
    if(Notification&&Notification.permission==='default') Notification.requestPermission();
    document.getElementById('permOverlay').style.display='none';
  },

  skipPermissions() { document.getElementById('permOverlay').style.display='none'; },

  _showApp() {
    document.getElementById('authScreen').style.display='none';
    document.getElementById('mainApp').style.display='flex';
    // Show permission modal on first login
    const firstTime = !localStorage.getItem('vinland_perms_asked');
    if(firstTime){ document.getElementById('permOverlay').style.display='flex'; localStorage.setItem('vinland_perms_asked','1'); }
    this._updateUI();
    this._setOnline(this.me.uid,true);
    this._loadFeed();
    this._loadAllUsers();
    this._loadGroups();
    this._loadProfile();
    this._listenCalls();
  },

  _setOnline(uid,online) {
    const r=this.rtdb.ref(`status/${uid}`);
    r.set({online,lastSeen:firebase.database.ServerValue.TIMESTAMP});
    if(online) r.onDisconnect().set({online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP});
  },

  _updateUI() {
    const m=this.me;
    const s=(id,v,p='textContent')=>{const el=document.getElementById(id);if(el)el[p]=v;};
    s('sbName',m.name); s('sbHandle','@'+(m.username||'')); s('sbAvatar',m.avatar,'src');
    s('postAv',m.avatar,'src'); s('postName',m.name);
    s('profileAv',m.avatar,'src'); s('profileName',m.name);
    s('profileHandle','@'+(m.username||''));
    s('profileBio',m.bio||'No bio yet');
    const meta=[];
    if(m.gender) meta.push(m.gender.charAt(0).toUpperCase()+m.gender.slice(1));
    if(m.country) meta.push(m.country);
    s('profileCountryGender',meta.join(' · '));
    if(m.banner){ const b=document.getElementById('profileBanner'); if(b){b.style.backgroundImage=`url(${m.banner})`; b.style.backgroundSize='cover'; b.style.backgroundPosition='center';} }
    this._renderSocialLinks();
  },

  _renderSocialLinks() {
    const m=this.me; if(!m) return;
    const cont=document.getElementById('socialLinks'); if(!cont) return;
    cont.innerHTML='';
    const links=[
      {key:'instagram',icon:'fa-brands fa-instagram',label:'Instagram',url:`https://instagram.com/${m.instagram}`},
      {key:'telegram', icon:'fa-brands fa-telegram', label:'Telegram', url:`https://t.me/${m.telegram}`},
      {key:'facebook', icon:'fa-brands fa-facebook', label:'Facebook', url:`https://facebook.com/${m.facebook}`},
      {key:'snapchat', icon:'fa-brands fa-snapchat', label:'Snapchat', url:`https://snapchat.com/add/${m.snapchat}`},
    ];
    links.forEach(l=>{
      if(!m[l.key]) return;
      const a=document.createElement('a'); a.href=l.url; a.target='_blank'; a.className='social-link'; a.rel='noopener noreferrer';
      a.innerHTML=`<i class="${l.icon}"></i> ${l.label}`;
      cont.appendChild(a);
    });
  },

  openTab(tab) {
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+tab).classList.add('active');
    const nb=document.getElementById('nav-'+tab); if(nb) nb.classList.add('active');
    if(window.innerWidth<=768) UI.closeSidebar();
    if(tab==='explore') this._renderExplore(this.allUsers);
    if(tab==='calls')   this._renderCallUsers(this.allUsers);
    if(tab==='favourites') this._renderFavourites();
  },

  // ── POSTS ──────────────────────────────────────────
  prevPostMedia(input) {
    if(!input.files[0]) return;
    const r=new FileReader(); r.onload=e=>{
      const p=document.getElementById('postPrev');
      p.innerHTML=input.files[0].type.startsWith('video')
        ?`<video src="${e.target.result}" controls style="max-width:100%;border-radius:10px;margin-top:8px"></video>`
        :`<img src="${e.target.result}" style="max-width:100%;border-radius:10px;margin-top:8px"/>`;
    }; r.readAsDataURL(input.files[0]);
  },

  async submitPost() {
    const text=document.getElementById('postText').value.trim();
    const link=document.getElementById('postLink')?.value.trim()||'';
    const file=document.getElementById('postFile').files[0];
    if(!text&&!link&&!file){this._toast('Add something to post!');return;}
    this._toast('Posting...');
    let mediaURL='',mediaType='';
    if(file){mediaURL=await upload(file);mediaType=file.type.startsWith('video')?'video':'image';}
    await this.db.collection('posts').add({
      uid:this.me.uid,name:this.me.name,username:this.me.username,avatar:this.me.avatar,
      text,link,mediaURL,mediaType,likes:0,likedBy:[],
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    await this.db.collection('users').doc(this.me.uid).update({posts:firebase.firestore.FieldValue.increment(1)});
    UI.closeModal('postModal');
    document.getElementById('postText').value='';
    document.getElementById('postPrev').innerHTML='';
    document.getElementById('postFile').value='';
    this._toast('✅ Posted!');
  },

  _loadFeed() {
    this.db.collection('posts').orderBy('createdAt','desc').onSnapshot(snap=>{
      const feed=document.getElementById('feedPosts'); feed.innerHTML='';
      if(snap.empty){feed.innerHTML='<div style="text-align:center;padding:48px;color:var(--muted)">No posts yet. Be the first!</div>';return;}
      snap.forEach(d=>feed.appendChild(this._buildPost({id:d.id,...d.data()})));
      this._buildStories(snap);
    });
  },

  _buildPost(p) {
    const div=document.createElement('div'); div.className='post-card';
    const liked=(p.likedBy||[]).includes(this.me?.uid);
    const time=p.createdAt?.toDate?this._ago(p.createdAt.toDate()):'now';
    div.innerHTML=`
      <div class="pc-top">
        <img src="${p.avatar}" class="pc-av" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${p.username}'" onclick="APP.viewUser('${p.uid}')"/>
        <div><div class="pc-name" onclick="APP.viewUser('${p.uid}')">${p.name}</div><div class="pc-time">@${p.username} · ${time}</div></div>
        ${p.uid===this.me?.uid?`<button class="pc-del" onclick="APP._delPost('${p.id}')"><i class="fas fa-trash"></i></button>`:''}
      </div>
      ${p.text?`<div class="pc-text">${p.text}</div>`:''}
      ${p.mediaURL&&p.mediaType==='image'?`<img src="${p.mediaURL}" class="pc-img"/>`:``}
      ${p.mediaURL&&p.mediaType==='video'?`<video src="${p.mediaURL}" controls class="pc-img"></video>`:``}
      ${p.link?`<div class="pc-link">🔗 <a href="${p.link}" target="_blank" rel="noopener noreferrer">${p.link}</a></div>`:''}
      <div class="pc-actions">
        <button class="pc-btn ${liked?'liked':''}" onclick="APP._likePost('${p.id}')"><i class="fas fa-heart"></i> ${p.likes||0}</button>
        <button class="pc-btn" onclick="APP.openChatWith('${p.uid}')"><i class="fas fa-comment"></i> Message</button>
        <button class="pc-btn" onclick="APP._fav('${p.uid}')"><i class="fas fa-heart"></i> Fav</button>
      </div>`;
    return div;
  },

  async _likePost(id) {
    const ref=this.db.collection('posts').doc(id);
    const snap=await ref.get(); if(!snap.exists)return;
    const {likes,likedBy=[]}=snap.data(); const already=likedBy.includes(this.me.uid);
    await ref.update({likes:firebase.firestore.FieldValue.increment(already?-1:1),likedBy:already?firebase.firestore.FieldValue.arrayRemove(this.me.uid):firebase.firestore.FieldValue.arrayUnion(this.me.uid)});
  },
  async _delPost(id){if(!confirm('Delete this post?'))return;await this.db.collection('posts').doc(id).delete();this._toast('Deleted');},

  _buildStories(snap) {
    const row=document.getElementById('storiesRow');
    const add=row.querySelector('.story-add'); row.innerHTML=''; row.appendChild(add);
    const seen=new Set();
    snap.forEach(d=>{
      const p=d.data(); if(seen.has(p.uid))return; seen.add(p.uid);
      const el=document.createElement('div'); el.className='story-item';
      el.onclick=()=>this.viewUser(p.uid);
      el.innerHTML=`<div class="story-av-wrap"><img src="${p.avatar}" class="story-av" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${p.username}'"/></div><span>${p.name.split(' ')[0]}</span>`;
      row.appendChild(el);
    });
  },

  // ── USERS ──────────────────────────────────────────
  async _loadAllUsers() {
    this.db.collection('users').onSnapshot(snap=>{
      this.allUsers=[]; snap.forEach(d=>{if(d.id!==this.me.uid)this.allUsers.push({uid:d.id,...d.data()});});
      this._renderChatList(this.allUsers);
      this._liveOnline();
    });
  },

  _liveOnline() {
    this.rtdb.ref('status').on('value',snap=>{
      const s=snap.val()||{};
      const list=document.getElementById('onlineList'); list.innerHTML='';
      this.allUsers.filter(u=>s[u.uid]?.online&&!(this.me?.blocked||[]).includes(u.uid)).forEach(u=>{
        const div=document.createElement('div'); div.className='online-item'; div.onclick=()=>this.viewUser(u.uid);
        div.innerHTML=`<img src="${u.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'" alt="${u.name}"/><span>${u.name.split(' ')[0]}</span><span class="online-dot"></span>`;
        list.appendChild(div);
      });
      // update chat dots
      this.allUsers.forEach(u=>{ const dot=document.getElementById('dot-'+u.uid); if(dot) dot.style.background=s[u.uid]?.online?'var(--online)':'#333'; });
    });
  },

  // ── VIEW USER PROFILE ──────────────────────────────
  viewUser(uid) {
    if(uid===this.me.uid){this.openTab('profile');return;}
    const u=this.allUsers.find(x=>x.uid===uid); if(!u) return;
    const s=(id,v,p='textContent')=>{const el=document.getElementById(id);if(el)el[p]=v;};
    s('upAvatar',u.avatar,'src'); s('upName',u.name);
    s('upHandle','@'+(u.username||'')); s('upBio',u.bio||'');
    const meta=[]; if(u.gender) meta.push(u.gender); if(u.country) meta.push(u.country);
    s('upMeta',meta.join(' · '));
    // social links
    const sc=document.getElementById('upSocial'); sc.innerHTML='';
    const slinks=[{key:'instagram',icon:'fa-brands fa-instagram',label:'Instagram',url:`https://instagram.com/${u.instagram}`},{key:'telegram',icon:'fa-brands fa-telegram',label:'Telegram',url:`https://t.me/${u.telegram}`},{key:'facebook',icon:'fa-brands fa-facebook',label:'Facebook',url:`https://facebook.com/${u.facebook}`},{key:'snapchat',icon:'fa-brands fa-snapchat',label:'Snapchat',url:`https://snapchat.com/add/${u.snapchat}`}];
    slinks.forEach(l=>{ if(!u[l.key])return; const a=document.createElement('a'); a.href=l.url; a.target='_blank'; a.className='social-link'; a.rel='noopener noreferrer'; a.innerHTML=`<i class="${l.icon}"></i> ${l.label}`; sc.appendChild(a); });
    document.getElementById('upChatBtn').onclick=()=>{UI.closeModal('userProfileModal');this.openChatWith(uid);};
    document.getElementById('upCallBtn').onclick=()=>{UI.closeModal('userProfileModal');this.startCall(uid,false);};
    document.getElementById('upVideoBtn').onclick=()=>{UI.closeModal('userProfileModal');this.startCall(uid,true);};
    document.getElementById('upFavBtn').onclick=()=>this._fav(uid);
    document.getElementById('upBlockBtn').onclick=()=>this._block(uid);
    UI.openModal('userProfileModal');
  },

  // ── FAVOURITES ─────────────────────────────────────
  async _fav(uid) {
    const favs=this.me.favourites||[];
    const already=favs.includes(uid);
    const newFavs=already?favs.filter(f=>f!==uid):[...favs,uid];
    await this.db.collection('users').doc(this.me.uid).update({favourites:newFavs});
    this.me.favourites=newFavs;
    this._toast(already?'Removed from favourites':'❤️ Added to favourites!');
  },

  _renderFavourites() {
    const favs=this.me?.favourites||[];
    const users=this.allUsers.filter(u=>favs.includes(u.uid));
    const grid=document.getElementById('favouritesList'); grid.innerHTML='';
    if(!users.length){grid.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">No favourites yet. Tap ❤️ on any profile.</div>';return;}
    users.forEach(u=>{
      const card=document.createElement('div'); card.className='explore-card'; card.onclick=()=>this.viewUser(u.uid);
      card.innerHTML=`<img src="${u.avatar}" class="ec-av" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'"/><div class="ec-name">${u.name}</div><div class="ec-handle">@${u.username}</div><div class="ec-meta">${[u.gender,u.country].filter(Boolean).join(' · ')}</div><div class="ec-btns"><button class="ec-btn" onclick="event.stopPropagation();APP.openChatWith('${u.uid}')">Message</button><button class="ec-btn sm" onclick="event.stopPropagation();APP._fav('${u.uid}')"><i class="fas fa-heart-broken"></i></button></div>`;
      grid.appendChild(card);
    });
  },

  // ── BLACKLIST ──────────────────────────────────────
  async _block(uid) {
    if(!confirm('Block this user? They will not be able to message you.'))return;
    const blocked=this.me.blocked||[];
    await this.db.collection('users').doc(this.me.uid).update({blocked:[...blocked,uid]});
    this.me.blocked=[...blocked,uid];
    UI.closeModal('userProfileModal');
    this._toast('User blocked');
  },

  // ── CHAT ───────────────────────────────────────────
  _cid(a,b){return[a,b].sort().join('__');},

  _renderChatList(users) {
    const blocked=this.me?.blocked||[];
    const list=document.getElementById('chatUserList'); list.innerHTML='';
    users.filter(u=>!blocked.includes(u.uid)).forEach(u=>{
      const div=document.createElement('div'); div.className='chat-user-row'; div.id='cu-'+u.uid; div.onclick=()=>this.openChatWith(u.uid);
      div.innerHTML=`<img src="${u.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'" alt="${u.name}"/><div class="cu-meta" style="flex:1;min-width:0"><div class="cu-name">${u.name}</div><div class="cu-sub">@${u.username}</div></div><div class="cu-dot" id="dot-${u.uid}"></div>`;
      list.appendChild(div);
    });
  },

  filterChat() {
    const q=document.getElementById('chatSearch').value.toLowerCase();
    document.querySelectorAll('.chat-user-row').forEach(r=>{ r.style.display=r.querySelector('.cu-name').textContent.toLowerCase().includes(q)?'':'none'; });
  },

  openChatWith(uid) {
    const blocked=this.me?.blocked||[];
    if(blocked.includes(uid)){this._toast('This user is blocked');return;}
    const user=this.allUsers.find(u=>u.uid===uid); if(!user)return;
    this.currentChatUID=uid; this.openTab('chat');
    document.querySelectorAll('.chat-user-row').forEach(r=>r.classList.remove('active'));
    const row=document.getElementById('cu-'+uid); if(row)row.classList.add('active');

    const right=document.getElementById('chatRight');
    right.innerHTML=`
      <div class="cw-header">
        <img src="${user.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${user.username}'" class="cw-av" alt="${user.name}"/>
        <div><div class="cw-name">${user.name}</div><div class="cw-status" id="cw-status-${uid}">...</div></div>
        <div class="cw-btns">
          <button class="cw-btn" onclick="APP.startCall('${uid}',false)" title="Audio Call"><i class="fas fa-phone"></i></button>
          <button class="cw-btn" onclick="APP.startCall('${uid}',true)"  title="Video Call"><i class="fas fa-video"></i></button>
          <button class="cw-btn red" onclick="APP._block('${uid}')" title="Block"><i class="fas fa-ban"></i></button>
        </div>
      </div>
      <div class="cw-messages" id="cwMsgs"></div>
      <div class="chat-input-row">
        <label class="icon-btn" title="Send photo/video">
          <i class="fas fa-image"></i>
          <input type="file" accept="image/*,video/*" style="display:none" onchange="APP._sendMedia(this)"/>
        </label>
        <label class="icon-btn" title="Send voice note">
          <i class="fas fa-microphone"></i>
          <input type="file" accept="audio/*" style="display:none" onchange="APP._sendVoice(this)"/>
        </label>
        <input class="chat-input" id="cwInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter')APP._sendMsg()"/>
        <button class="icon-btn gold" onclick="APP._sendMsg()"><i class="fas fa-paper-plane"></i></button>
      </div>`;

    this.rtdb.ref(`status/${uid}`).on('value',snap=>{
      const el=document.getElementById(`cw-status-${uid}`);
      if(el) el.textContent=snap.val()?.online?'🟢 Online':'⚫ Offline';
    });

    if(this.chatUnsub) this.chatUnsub();
    const cid=this._cid(this.me.uid,uid);
    this.chatUnsub=this.db.collection('chats').doc(cid).collection('messages').orderBy('createdAt','asc').onSnapshot(snap=>{
      const area=document.getElementById('cwMsgs'); if(!area)return;
      area.innerHTML='';
      if(snap.empty){area.innerHTML='<div style="text-align:center;color:var(--muted);padding:30px;margin:auto">Say hi! 👋</div>';}
      snap.forEach(d=>{
        const msg=d.data();
        const div=document.createElement('div'); div.className='msg '+(msg.senderUID===this.me.uid?'mine':'theirs');
        if(msg.mediaURL){
          if(msg.mediaType==='video') div.innerHTML=`<video src="${msg.mediaURL}" controls class="msg-img"></video>`;
          else if(msg.mediaType==='audio') div.innerHTML=`<div class="msg-audio"><audio src="${msg.mediaURL}" controls></audio></div>`;
          else div.innerHTML=`<img src="${msg.mediaURL}" class="msg-img" onclick="window.open('${msg.mediaURL}','_blank')"/>`;
        } else if(msg.text?.startsWith('http')) {
          div.innerHTML=`<a href="${msg.text}" target="_blank" rel="noopener noreferrer">${msg.text}</a>`;
        } else { div.textContent=msg.text; }
        const t=document.createElement('div'); t.className='msg-time'; t.textContent=msg.createdAt?.toDate?this._ago(msg.createdAt.toDate()):''; div.appendChild(t);
        area.appendChild(div);
      });
      area.scrollTop=area.scrollHeight;
    });
  },

  async _sendMsg() {
    const input=document.getElementById('cwInput'); const text=input?.value.trim(); if(!text||!this.currentChatUID)return;
    input.value='';
    const cid=this._cid(this.me.uid,this.currentChatUID);
    await this.db.collection('chats').doc(cid).collection('messages').add({
      senderUID:this.me.uid,senderName:this.me.name,text,mediaURL:'',mediaType:'',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async _sendMedia(input) {
    if(!input.files[0]||!this.currentChatUID)return;
    this._toast('Uploading...');
    const file=input.files[0]; const mediaURL=await upload(file);
    const mediaType=file.type.startsWith('video')?'video':file.type.startsWith('audio')?'audio':'image';
    const cid=this._cid(this.me.uid,this.currentChatUID);
    await this.db.collection('chats').doc(cid).collection('messages').add({
      senderUID:this.me.uid,senderName:this.me.name,text:'',mediaURL,mediaType,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    this._toast('✅ Sent!');
  },

  async _sendVoice(input) {
    if(!input.files[0]||!this.currentChatUID)return;
    this._toast('Uploading voice note...');
    const mediaURL=await upload(input.files[0]);
    const cid=this._cid(this.me.uid,this.currentChatUID);
    await this.db.collection('chats').doc(cid).collection('messages').add({
      senderUID:this.me.uid,senderName:this.me.name,text:'',mediaURL,mediaType:'audio',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    this._toast('✅ Voice note sent!');
  },

  // ── GROUPS ─────────────────────────────────────────
  _loadGroups() {
    this.db.collection('groups').orderBy('createdAt','desc').onSnapshot(snap=>{
      const grid=document.getElementById('groupsList'); grid.innerHTML='';
      if(snap.empty){grid.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">No groups yet. Create one!</div>';return;}
      const EM={general:'💬',anime:'🌸',gaming:'🎮',music:'🎵',art:'🎨',study:'📚',sports:'⚽',tech:'💻'};
      snap.forEach(d=>{
        const g={id:d.id,...d.data()}; const joined=(g.members||[]).includes(this.me?.uid);
        const card=document.createElement('div'); card.className='group-card';
        card.innerHTML=`<div class="gc-emoji">${EM[g.theme]||'💬'}</div><div class="gc-name">${g.name}</div><div class="gc-desc">${g.desc}</div><div class="gc-members">👥 ${(g.members||[]).length} members</div><div class="gc-btns"><button class="gc-join-btn ${joined?'joined':''}" onclick="APP._joinGroup('${g.id}',${joined})">${joined?'✅ Joined':'+ Join'}</button><button class="gc-chat-btn" onclick="APP._openGroupChat('${g.id}','${g.name}',${JSON.stringify(g.members||[]).replace(/"/g,"'")})"><i class="fas fa-comment"></i> Chat</button></div>`;
        grid.appendChild(card);
      });
    });
  },

  async createGroup() {
    const name=document.getElementById('gName').value.trim(); if(!name){this._toast('Enter a group name');return;}
    const desc=document.getElementById('gDesc').value.trim(); const theme=document.getElementById('gTheme').value;
    await this.db.collection('groups').add({name,desc:desc||'A new group',theme,createdBy:this.me.uid,members:[this.me.uid],createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    UI.closeModal('groupModal'); document.getElementById('gName').value=''; document.getElementById('gDesc').value='';
    this._toast('✅ Group created!');
  },

  async _joinGroup(gid,isJoined) {
    await this.db.collection('groups').doc(gid).update({members:isJoined?firebase.firestore.FieldValue.arrayRemove(this.me.uid):firebase.firestore.FieldValue.arrayUnion(this.me.uid)});
    this._toast(isJoined?'Left group':'✅ Joined!');
  },

  _openGroupChat(gid,gname,members) {
    this.currentGroupId=gid;
    document.getElementById('gcTitle').textContent=gname;
    document.getElementById('gcMembers').textContent=Array.isArray(members)?`${members.length} members`:'';
    UI.openModal('gcModal');
    if(this.groupUnsub) this.groupUnsub();
    this.groupUnsub=this.db.collection('groups').doc(gid).collection('messages').orderBy('createdAt','asc').onSnapshot(snap=>{
      const area=document.getElementById('gcMessages'); if(!area)return;
      area.innerHTML='';
      snap.forEach(d=>{
        const msg=d.data(); const div=document.createElement('div');
        div.className='msg '+(msg.senderUID===this.me.uid?'mine':'theirs');
        if(msg.mediaURL){
          if(msg.mediaType==='video') div.innerHTML=`<video src="${msg.mediaURL}" controls class="msg-img"></video>`;
          else div.innerHTML=`<img src="${msg.mediaURL}" class="msg-img"/>`;
        } else { div.textContent=(msg.senderUID!==this.me.uid?msg.senderName+': ':'')+msg.text; }
        const t=document.createElement('div'); t.className='msg-time'; t.textContent=msg.createdAt?.toDate?this._ago(msg.createdAt.toDate()):''; div.appendChild(t);
        area.appendChild(div);
      });
      area.scrollTop=area.scrollHeight;
    });
  },

  async sendGroupMsg() {
    const input=document.getElementById('gcInput'); const text=input?.value.trim(); if(!text||!this.currentGroupId)return;
    input.value='';
    await this.db.collection('groups').doc(this.currentGroupId).collection('messages').add({
      senderUID:this.me.uid,senderName:this.me.name,text,mediaURL:'',mediaType:'',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async sendGroupMedia(input) {
    if(!input.files[0]||!this.currentGroupId)return;
    this._toast('Uploading...');
    const file=input.files[0]; const mediaURL=await upload(file);
    const mediaType=file.type.startsWith('video')?'video':'image';
    await this.db.collection('groups').doc(this.currentGroupId).collection('messages').add({
      senderUID:this.me.uid,senderName:this.me.name,text:'',mediaURL,mediaType,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    this._toast('✅ Sent!');
  },

  groupVideoCall() { this._toast('Group video call — invite members to join a call'); },

  // ── EXPLORE ────────────────────────────────────────
  _renderExplore(users) {
    const blocked=this.me?.blocked||[];
    const grid=document.getElementById('exploreGrid'); grid.innerHTML='';
    const filtered=users.filter(u=>!blocked.includes(u.uid));
    if(!filtered.length){grid.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">No users found</div>';return;}
    filtered.forEach(u=>{
      const card=document.createElement('div'); card.className='explore-card'; card.onclick=()=>this.viewUser(u.uid);
      const meta=[]; if(u.gender) meta.push(u.gender.charAt(0).toUpperCase()+u.gender.slice(1)); if(u.country) meta.push(u.country);
      card.innerHTML=`<img src="${u.avatar}" class="ec-av" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'"/><div class="ec-name">${u.name}</div><div class="ec-handle">@${u.username||''}</div><div class="ec-meta">${meta.join(' · ')}</div><div class="ec-bio">${u.bio||''}</div><div class="ec-btns"><button class="ec-btn" onclick="event.stopPropagation();APP.openChatWith('${u.uid}')">Message</button><button class="ec-btn sm" onclick="event.stopPropagation();APP.startCall('${u.uid}',true)"><i class="fas fa-video"></i></button><button class="ec-btn sm" onclick="event.stopPropagation();APP._fav('${u.uid}')"><i class="fas fa-heart"></i></button></div>`;
      grid.appendChild(card);
    });
  },

  filterExplore() {
    const q=document.getElementById('exploreSearch').value.toLowerCase();
    const g=document.getElementById('filterGender').value;
    const c=document.getElementById('filterCountry').value;
    const filtered=this.allUsers.filter(u=>{
      const matchQ=!q||u.name.toLowerCase().includes(q)||(u.username||'').toLowerCase().includes(q);
      const matchG=!g||u.gender===g;
      const matchC=!c||u.country===c;
      return matchQ&&matchG&&matchC;
    });
    this._renderExplore(filtered);
  },

  // ── CALL GRID ──────────────────────────────────────
  _renderCallUsers(users) {
    const blocked=this.me?.blocked||[];
    const grid=document.getElementById('callUsersList'); grid.innerHTML='';
    users.filter(u=>!blocked.includes(u.uid)).forEach(u=>{
      const div=document.createElement('div'); div.className='call-card';
      div.innerHTML=`<img src="${u.avatar}" onerror="this.src='https://api.dicebear.com/8.x/adventurer/svg?seed=${u.username}'" alt="${u.name}"/><div class="call-card-name">${u.name}</div><div class="call-card-btns"><button class="call-card-btn" onclick="APP.startCall('${u.uid}',false)" title="Audio"><i class="fas fa-phone"></i></button><button class="call-card-btn" onclick="APP.startCall('${u.uid}',true)" title="Video"><i class="fas fa-video"></i></button></div>`;
      grid.appendChild(div);
    });
  },

  // ── PROFILE ────────────────────────────────────────
  _loadProfile() {
    this.db.collection('posts').where('uid','==',this.me.uid).orderBy('createdAt','desc').onSnapshot(snap=>{
      const grid=document.getElementById('myPostsGrid'); grid.innerHTML='';
      document.getElementById('psPosts').textContent=snap.size;
      if(snap.empty){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">No posts yet</div>';return;}
      snap.forEach(d=>{const p=d.data(); const div=document.createElement('div'); div.className='my-post-thumb'; div.innerHTML=p.mediaURL?(p.mediaType==='video'?`<video src="${p.mediaURL}"></video>`:`<img src="${p.mediaURL}" alt="post"/>`):`<div class="my-post-text-thumb">${p.text?.slice(0,40)||'...'}</div>`; grid.appendChild(div);});
    });
    this.db.collection('groups').onSnapshot(snap=>{let c=0;snap.forEach(d=>{if((d.data().members||[]).includes(this.me.uid))c++;});document.getElementById('psGroups').textContent=c;});
    document.getElementById('psFavs').textContent=(this.me.favourites||[]).length;
  },

  async saveProfile() {
    const name=document.getElementById('editName').value.trim(); if(!name){this._toast('Name required');return;}
    const username=document.getElementById('editUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
    const bio=document.getElementById('editBio').value.trim();
    const gender=document.getElementById('editGender').value;
    const country=document.getElementById('editCountry').value;
    const instagram=document.getElementById('editInsta').value.trim();
    const telegram=document.getElementById('editTelegram').value.trim();
    const facebook=document.getElementById('editFb').value.trim();
    const snapchat=document.getElementById('editSnap').value.trim();
    await this.db.collection('users').doc(this.me.uid).update({name,username,bio,gender,country,instagram,telegram,facebook,snapchat});
    Object.assign(this.me,{name,username,bio,gender,country,instagram,telegram,facebook,snapchat});
    this._updateUI(); UI.closeModal('editModal'); this._toast('✅ Profile updated!');
  },

  async changeAvatar(input) {
    if(!input.files[0])return; this._toast('Uploading...');
    const url=await upload(input.files[0]);
    await this.db.collection('users').doc(this.me.uid).update({avatar:url});
    this.me.avatar=url; this._updateUI(); this._toast('✅ Photo updated!');
  },

  changeBanner(){document.getElementById('bannerFile').click();},

  async uploadBanner(input) {
    if(!input.files[0])return; this._toast('Uploading banner...');
    const url=await upload(input.files[0]);
    await this.db.collection('users').doc(this.me.uid).update({banner:url});
    this.me.banner=url;
    const b=document.getElementById('profileBanner');
    if(b){b.style.backgroundImage=`url(${url})`;b.style.backgroundSize='cover';b.style.backgroundPosition='center';}
    this._toast('✅ Banner updated!');
  },

  // ── WEBRTC CALLS ───────────────────────────────────
  _ICE:{iceServers:[{urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']}]},

  async startCall(targetUID,withVideo) {
    const user=this.allUsers.find(u=>u.uid===targetUID); if(!user){this._toast('User not found');return;}
    this.isMuted=false; this.isCamOff=false;
    this._showCallUI(user,withVideo,'Calling...');
    try {
      this.localStream=await navigator.mediaDevices.getUserMedia({video:withVideo,audio:true});
      if(withVideo)document.getElementById('localVid').srcObject=this.localStream;
      this.peerConn=new RTCPeerConnection(this._ICE);
      this.localStream.getTracks().forEach(t=>this.peerConn.addTrack(t,this.localStream));
      this.peerConn.ontrack=e=>{document.getElementById('remoteVid').srcObject=e.streams[0];};
      const offer=await this.peerConn.createOffer(); await this.peerConn.setLocalDescription(offer);
      this.peerConn.onicecandidate=e=>{if(e.candidate)this.rtdb.ref(`calls/${targetUID}/callerCandidates`).push(e.candidate.toJSON());};
      await this.rtdb.ref(`calls/${targetUID}`).set({callerUID:this.me.uid,callerName:this.me.name,callerAvatar:this.me.avatar,type:withVideo?'video':'audio',offer:{sdp:offer.sdp,type:offer.type},status:'calling',timestamp:Date.now()});
      this.rtdb.ref(`calls/${targetUID}/answer`).on('value',async snap=>{
        if(snap.val()&&this.peerConn&&!this.peerConn.currentRemoteDescription){
          await this.peerConn.setRemoteDescription(new RTCSessionDescription(snap.val()));
          document.getElementById('callStatus').textContent='Connected ✅';
        }
      });
      this.rtdb.ref(`calls/${targetUID}/calleeCandidates`).on('child_added',snap=>{this.peerConn?.addIceCandidate(new RTCIceCandidate(snap.val()));});
    } catch(err){document.getElementById('callStatus').textContent='❌ Allow camera and mic first';this._toast('Please allow camera & mic');}
  },

  _listenCalls() {
    if(!this.me)return;
    this.rtdb.ref(`calls/${this.me.uid}`).on('value',snap=>{
      const data=snap.val(); if(!data||data.status!=='calling'||data.callerUID===this.me.uid)return;
      this.incomingData=data;
      document.getElementById('incAv').src=data.callerAvatar;
      document.getElementById('incName').textContent=data.callerName;
      document.getElementById('incType').textContent=data.type==='video'?'📹 Video Call':'🎙️ Audio Call';
      document.getElementById('incomingCall').style.display='flex';
      setTimeout(()=>{document.getElementById('incomingCall').style.display='none';},35000);
    });
  },

  async acceptCall() {
    document.getElementById('incomingCall').style.display='none'; if(!this.incomingData)return;
    const withVideo=this.incomingData.type==='video'; this.isMuted=false; this.isCamOff=false;
    this._showCallUI({name:this.incomingData.callerName,avatar:this.incomingData.callerAvatar},withVideo,'Connecting...');
    try {
      this.localStream=await navigator.mediaDevices.getUserMedia({video:withVideo,audio:true});
      if(withVideo)document.getElementById('localVid').srcObject=this.localStream;
      this.peerConn=new RTCPeerConnection(this._ICE);
      this.localStream.getTracks().forEach(t=>this.peerConn.addTrack(t,this.localStream));
      this.peerConn.ontrack=e=>{document.getElementById('remoteVid').srcObject=e.streams[0];};
      await this.peerConn.setRemoteDescription(new RTCSessionDescription(this.incomingData.offer));
      const answer=await this.peerConn.createAnswer(); await this.peerConn.setLocalDescription(answer);
      this.peerConn.onicecandidate=e=>{if(e.candidate)this.rtdb.ref(`calls/${this.me.uid}/calleeCandidates`).push(e.candidate.toJSON());};
      await this.rtdb.ref(`calls/${this.me.uid}/answer`).set({sdp:answer.sdp,type:answer.type});
      document.getElementById('callStatus').textContent='Connected ✅';
    } catch(err){document.getElementById('callStatus').textContent='❌ Could not connect';}
  },

  declineCall(){document.getElementById('incomingCall').style.display='none';if(this.me)this.rtdb.ref(`calls/${this.me.uid}/status`).set('declined');this.incomingData=null;this._toast('Call declined');},
  endCall(){if(this.peerConn){this.peerConn.close();this.peerConn=null;}if(this.localStream){this.localStream.getTracks().forEach(t=>t.stop());this.localStream=null;}if(this.me)this.rtdb.ref(`calls/${this.me.uid}`).remove();document.getElementById('callModal').style.display='none';this._toast('Call ended');},

  toggleMute(){this.isMuted=!this.isMuted;this.localStream?.getAudioTracks().forEach(t=>t.enabled=!this.isMuted);const btn=document.getElementById('muteBtn');btn.innerHTML=this.isMuted?'<i class="fas fa-microphone-slash"></i>':'<i class="fas fa-microphone"></i>';btn.classList.toggle('off',this.isMuted);this._toast(this.isMuted?'Muted':'Unmuted');},
  toggleCam(){this.isCamOff=!this.isCamOff;this.localStream?.getVideoTracks().forEach(t=>t.enabled=!this.isCamOff);const btn=document.getElementById('camBtn');btn.innerHTML=this.isCamOff?'<i class="fas fa-video-slash"></i>':'<i class="fas fa-video"></i>';btn.classList.toggle('off',this.isCamOff);this._toast(this.isCamOff?'Camera off':'Camera on');},
  toggleSpk(){document.getElementById('spkBtn').classList.toggle('off');this._toast('Speaker toggled');},

  toggleFullscreen(){
    const area=document.getElementById('videoArea');
    if(!this.isFullscreen){area.requestFullscreen?.();this.isFullscreen=true;}
    else{document.exitFullscreen?.();this.isFullscreen=false;}
  },

  _showCallUI(user,withVideo,status){
    document.getElementById('callAv').src=user.avatar;
    document.getElementById('callName').textContent=user.name;
    document.getElementById('callStatus').textContent=status;
    document.getElementById('callTypeTag').textContent=withVideo?'📹 Video Call':'🎙️ Audio Call';
    document.getElementById('callModal').style.display='flex';
    document.getElementById('videoArea').style.display=withVideo?'block':'none';
    ['muteBtn','camBtn','spkBtn'].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.remove('off');});
    const mb=document.getElementById('muteBtn');if(mb)mb.innerHTML='<i class="fas fa-microphone"></i>';
    const cb=document.getElementById('camBtn');if(cb)cb.innerHTML='<i class="fas fa-video"></i>';
  },

  // ── HELPERS ────────────────────────────────────────
  _ago(date){const s=Math.floor((Date.now()-date)/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';},
  _toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(this._toastTimer);this._toastTimer=setTimeout(()=>t.classList.remove('show'),3000);}
};
