"/* ===== VINLAND — script.js =====
   Firebase v10 modular + Cloudinary + WebRTC
   by CEO
==================================== */

import { initializeApp } fro gfxm \"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js\";
import {
  getAuth, setPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup, updateProfile
} from \"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js\";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot,
  collection, query, where, orderBy, addDoc, serverTimestamp,
  getDocs, limit, deleteDoc, arrayUnion, arrayRemove, writeBatch
} from \"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js\";
import {
  getDatabase, ref as rtdbRef, onValue, set as rtdbSet,
  onDisconnect, serverTimestamp as rtdbTs
} from \"https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js\";

/* ---------- CONFIG ---------- */
const firebaseConfig = {
  apiKey: \"AIzaSyBdPtkcoq_mKWDUvuzgglsu_tMUzU6pJ-A\",
  authDomain: \"anivibehub-c6d17.firebaseapp.com\",
  databaseURL: \"https://anivibehub-c6d17-default-rtdb.firebaseio.com\",
  projectId: \"anivibehub-c6d17\",
  storageBucket: \"anivibehub-c6d17.firebasestorage.app\",
  messagingSenderId: \"629029424242\",
  appId: \"1:629029424242:web:0ad8c858af2fbc3882c6ebrtz\"
};

/* TODO: replace with your real Cloudinary values */
const CLOUDINARY = {
  cloudName: \"YOUR_CLOUD_NAME.\",   // e.g. \"dxyz123\"
  uploadPreset: \"YOUR_UPLOAD_PRESET\" // e.g. \"vinland_unsigned\"
};

const CREATOR_EMAIL = \"ceo@vinland.app\"; // email that shows the verified CEO badge

/* ---------- INIT ---------- */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
setPersistence(auth, browserLocalPersistence).catch(()=>{});

/* ---------- HELPERS ---------- */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const show = (id)=>{$$(\".screen\").forEach(s=>s.classList.remove(\"active\"));$(id).classList.add(\"active\");};
const toast = (msg, err=false) => {
  const t = $(\"#toast\"); t.textContent = msg; t.className = \"toast\" + (err?\" err\":\"\");
  t.hidden = false; clearTimeout(t._to); t._to = setTimeout(()=>t.hidden=true,2600);
};
const fmtTime = (ts) => { if(!ts) return \"\"; const d=ts.toDate?ts.toDate():new Date(ts); const n=new Date();
  if(d.toDateString()===n.toDateString()) return d.toLocaleTimeString([], {hour:\"2-digit\",minute:\"2-digit\"});
  return d.toLocaleDateString([], {month:\"short\",day:\"numeric\"}); };
const pairId = (a,b)=>[a,b].sort().join(\"_\");
const defaultAvatar = (name=\"?\") => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

/* ---------- STATE ---------- */
let me = null;        // auth user
let myProfile = null; // firestore user doc
let currentChat = null; // { type:'private'|'group', id, peer? }
let replyTo = null;
let typingTimeout = null;
let unsub = { chatList:null, messages:null, users:null, stories:null, typing:null, presence:null, incoming:null };
let localStream = null, remoteStream = null, pc = null, currentCallId = null, callRole = null;
let usersCache = {}; // uid -> profile

/* ---------- SPLASH → AUTH FLOW ---------- */
window.addEventListener(\"load\", ()=>{
  setTimeout(()=>{
    onAuthStateChanged(auth, async (u)=>{
      if (u) { me = u; await loadMyProfile(); enterApp(); }
      else { show(\"#auth\"); }
    });
  }, 1400);
});

/* ========== AUTH ========== */
$$(\".tab\").forEach(btn=>btn.addEventListener(\"click\",()=>{
  $$(\".tab\").forEach(b=>b.classList.remove(\"active\"));
  btn.classList.add(\"active\");
  const t = btn.dataset.tab;
  $(\"#login-form\").classList.toggle(\"active\", t===\"login\");
  $(\"#signup-form\").classList.toggle(\"active\", t===\"signup\");
  $(\"#auth-title\").textContent = t===\"login\" ? \"welcome back\" : \"join vinland\";
  $(\"#auth-sub\").textContent   = t===\"login\" ? \"log into your anime world\" : \"create your character\";
  $(\"#auth-msg\").textContent = \"\";
}));

$(\"#login-form\").addEventListener(\"submit\", async (e)=>{
  e.preventDefault();
  const msg = $(\"#auth-msg\"); msg.textContent = \"signing in...\";
  try {
    await signInWithEmailAndPassword(auth, $(\"#login-email\").value.trim(), $(\"#login-password\").value);
    msg.textContent = \"\"; msg.className=\"auth-msg\";
  } catch(err){ msg.textContent = prettyErr(err); msg.className=\"auth-msg\"; }
});

$(\"#signup-form\").addEventListener(\"submit\", async (e)=>{
  e.preventDefault();
  const msg = $(\"#auth-msg\"); msg.textContent = \"creating account...\";
  try {
    const name = $(\"#signup-name\").value.trim();
    const cred = await createUserWithEmailAndPassword(auth, $(\"#signup-email\").value.trim(), $(\"#signup-password\").value);
    await updateProfile(cred.user, { displayName: name });
    await createUserDoc(cred.user, { displayName: name });
    msg.textContent = \"\";
  } catch(err){ msg.textContent = prettyErr(err); }
});

$(\"#google-btn\").addEventListener(\"click\", async ()=>{
  const msg = $(\"#auth-msg\"); msg.textContent = \"opening google...\";
  try {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const snap = await getDoc(doc(db,\"users\",res.user.uid));
    if (!snap.exists()) await createUserDoc(res.user, { displayName: res.user.displayName, photoURL: res.user.photoURL });
    msg.textContent = \"\";
  } catch(err){ msg.textContent = prettyErr(err); }
});

$(\"#forgot-btn\").addEventListener(\"click\", async ()=>{
  const email = $(\"#login-email\").value.trim();
  if (!email) { toast(\"enter your email first\", true); return; }
  try { await sendPasswordResetEmail(auth, email); toast(\"reset email sent ✨\"); }
  catch(err){ toast(prettyErr(err), true); }
});

function prettyErr(err){
  const c = err?.code || \"\";
  if (c.includes(\"email-already\")) return \"email already in use\";
  if (c.includes(\"wrong-password\")||c.includes(\"invalid-credential\")) return \"invalid email or password\";
  if (c.includes(\"user-not-found\")) return \"no account found\";
  if (c.includes(\"weak-password\")) return \"password too weak\";
  if (c.includes(\"popup-closed\")) return \"google popup closed\";
  return err?.message || \"something went wrong\";
}

async function createUserDoc(user, extra={}){
  const data = {
    uid: user.uid,
    displayName: extra.displayName || user.displayName || user.email.split(\"@\")[0],
    email: user.email,
    photoURL: extra.photoURL || defaultAvatar(user.email),
    bio: \"just another anime soul\",
    age: null, gender: \"\", country: \"\",
    favAnime: \"\", hobbies: \"\",
    socials: { instagram:\"\", telegram:\"\", facebook:\"\", snapchat:\"\" },
    verified: user.email === CREATOR_EMAIL,
    favorites: [], blacklist: [],
    createdAt: serverTimestamp()
  };
  await setDoc(doc(db,\"users\",user.uid), data);
}

/* ========== ENTER APP ========== */
async function loadMyProfile(){
  const ref = doc(db,\"users\",me.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) { await createUserDoc(me); myProfile = (await getDoc(ref)).data(); }
  else myProfile = snap.data();
  paintProfile();
  setupPresence();
  listenIncomingCalls();
}

function enterApp(){
  show(\"#app\");
  loadUsersLive();
  loadStoriesLive();
  loadChatListLive();
  switchPage(\"home\");
}

function paintProfile(){
  $(\"#profile-name\").textContent = myProfile.displayName;
  $(\"#profile-email\").textContent = myProfile.email;
  $(\"#profile-avatar\").src = myProfile.photoURL || defaultAvatar(myProfile.displayName);
  $(\"#verified-badge\").hidden = !myProfile.verified;
  $(\"#pf-bio\").value = myProfile.bio||\"\";
  $(\"#pf-age\").value = myProfile.age||\"\";
  $(\"#pf-gender\").value = myProfile.gender||\"\";
  $(\"#pf-country\").value = myProfile.country||\"\";
  $(\"#pf-anime\").value = myProfile.favAnime||\"\";
  $(\"#pf-hobbies\").value = myProfile.hobbies||\"\";
  $(\"#pf-ig\").value = myProfile.socials?.instagram||\"\";
  $(\"#pf-tg\").value = myProfile.socials?.telegram||\"\";
  $(\"#pf-fb\").value = myProfile.socials?.facebook||\"\";
  $(\"#pf-sc\").value = myProfile.socials?.snapchat||\"\";
  paintLists();
}

function paintLists(){
  const fav = $(\"#fav-list\"), bl = $(\"#black-list\");
  fav.innerHTML = \"\"; bl.innerHTML = \"\";
  const favs = myProfile.favorites||[]; const blacks = myProfile.blacklist||[];
  if (!favs.length) fav.innerHTML = \"<span class='empty'>no favorites yet</span>\";
  if (!blacks.length) bl.innerHTML = \"<span class='empty'>nobody blocked</span>\";
  favs.forEach(u=>{ const p=usersCache[u]; if(p) fav.insertAdjacentHTML(\"beforeend\", `<span class=\"mini-pill\"><img src=\"${p.photoURL}\"/> ${p.displayName}</span>`); });
  blacks.forEach(u=>{ const p=usersCache[u]; if(p) bl.insertAdjacentHTML(\"beforeend\", `<span class=\"mini-pill\"><img src=\"${p.photoURL}\"/> ${p.displayName}</span>`); });
}

/* ========== PRESENCE ========== */
function setupPresence(){
  const pref = rtdbRef(rtdb, `presence/${me.uid}`);
  rtdbSet(pref, { online:true, lastSeen: rtdbTs() });
  onDisconnect(pref).set({ online:false, lastSeen: rtdbTs() });
  window.addEventListener(\"beforeunload\", ()=>rtdbSet(pref,{online:false,lastSeen:Date.now()}));
}

function listenPresence(uid, cb){
  return onValue(rtdbRef(rtdb, `presence/${uid}`), (snap)=>cb(snap.val()||{online:false}));
}

/* ========== USERS LIVE ========== */
function loadUsersLive(){
  if (unsub.users) unsub.users();
  unsub.users = onSnapshot(collection(db,\"users\"), (snap)=>{
    usersCache = {};
    snap.forEach(d=>usersCache[d.id] = d.data());
    paintUserSlider();
    paintLists();
  });
}

let currentFilter = \"all\", currentCountry = \"\";
$$(\".filter-chips .chip\").forEach(c=>c.addEventListener(\"click\",()=>{
  $$(\".filter-chips .chip\").forEach(x=>x.classList.remove(\"active\"));
  c.classList.add(\"active\"); currentFilter = c.dataset.filter; paintUserSlider();
}));
$(\"#search-country\").addEventListener(\"input\", (e)=>{ currentCountry = e.target.value.toLowerCase().trim(); paintUserSlider(); });

async function isOnline(uid){
  return new Promise(res=>{
    const un = listenPresence(uid, p=>{ un(); res(p.online); });
  });
}

function paintUserSlider(){
  const slider = $(\"#user-slider\"); slider.innerHTML = \"\";
  const list = Object.values(usersCache).filter(u=>u.uid !== me.uid);
  const bl = myProfile?.blacklist||[];
  const filtered = list.filter(u=>{
    if (bl.includes(u.uid)) return false;
    if (currentFilter===\"female\" && u.gender!==\"female\") return false;
    if (currentFilter===\"male\" && u.gender!==\"male\") return false;
    if (currentCountry && !(u.country||\"\").toLowerCase().includes(currentCountry)) return false;
    return true;
  });
  filtered.forEach(u=>{
    const card = document.createElement(\"div\");
    card.className = \"user-card\"; card.dataset.testid = `user-card-${u.uid}`;
    card.innerHTML = `
      <img src=\"${u.photoURL||defaultAvatar(u.displayName)}\" alt=\"\"/>
      <div class=\"card-overlay\">
        <h4>${u.displayName} ${u.verified?'<i class=\"fa-solid fa-crown verified-mini\"></i>':\"\"}</h4>
        <div class=\"meta\"><span class=\"online-dot\" data-pres=\"${u.uid}\"></span><span>${u.country||\"—\"}</span>${u.gender?'<span>· '+u.gender+'</span>':''}</div>
      </div>`;
    card.addEventListener(\"click\", ()=>openUserModal(u.uid));
    slider.appendChild(card);
    listenPresence(u.uid, p=>{
      const dot = card.querySelector(`[data-pres=\"${u.uid}\"]`);
      if (dot) dot.classList.toggle(\"on\", !!p.online);
      if (currentFilter===\"online\" && !p.online) card.style.display = \"none\";
      else card.style.display = \"\";
    });
  });
}

/* ========== USER MODAL ========== */
function openUserModal(uid){
  const u = usersCache[uid]; if (!u) return;
  const m = $(\"#user-modal\"); m.hidden = false;
  $(\"#um-avatar\").src = u.photoURL||defaultAvatar(u.displayName);
  $(\"#um-name\").innerHTML = `${u.displayName} ${u.verified?'<i class=\"fa-solid fa-crown verified-mini\"></i>':\"\"}`;
  $(\"#um-bio\").textContent = u.bio||\"\";
  $(\"#um-gender\").textContent = u.gender||\"\";
  $(\"#um-country\").textContent = u.country||\"\";
  $(\"#um-age\").textContent = u.age? `${u.age} yrs` : \"\";
  $(\"#um-anime\").textContent = u.favAnime? `loves: ${u.favAnime}` : \"\";
  const s = u.socials||{}; const soc=$(\"#um-socials\"); soc.innerHTML=\"\";
  const links=[[\"instagram\",\"fa-instagram\"],[\"telegram\",\"fa-telegram\"],[\"facebook\",\"fa-facebook\"],[\"snapchat\",\"fa-snapchat\"]];
  links.forEach(([k,ic])=>{ if(s[k]) soc.insertAdjacentHTML(\"beforeend\", `<a href=\"${s[k].startsWith(\"http\")?s[k]:\"https://\"+s[k]}\" target=\"_blank\"><i class=\"fa-brands ${ic}\"></i></a>`); });
  $(\"#um-chat\").onclick = ()=>{ closeModals(); openPrivateChat(uid); };
  $(\"#um-video\").onclick = ()=>{ closeModals(); startCall(uid, \"video\"); };
  $(\"#um-audio\").onclick = ()=>{ closeModals(); startCall(uid, \"audio\"); };
  $(\"#um-fav\").onclick = async ()=>{ await toggleFavorite(uid); };
  $(\"#um-block\").onclick = async ()=>{ await toggleBlock(uid); closeModals(); };
}

async function toggleFavorite(uid){
  const favs = myProfile.favorites||[];
  const op = favs.includes(uid) ? arrayRemove(uid) : arrayUnion(uid);
  await updateDoc(doc(db,\"users\",me.uid), { favorites: op });
  toast(favs.includes(uid) ? \"removed from favorites\" : \"added to favorites ♡\");
  myProfile = (await getDoc(doc(db,\"users\",me.uid))).data(); paintLists();
}
async function toggleBlock(uid){
  const bl = myProfile.blacklist||[];
  const op = bl.includes(uid) ? arrayRemove(uid) : arrayUnion(uid);
  await updateDoc(doc(db,\"users\",me.uid), { blacklist: op });
  toast(bl.includes(uid) ? \"unblocked\" : \"user blocked\");
  myProfile = (await getDoc(doc(db,\"users\",me.uid))).data(); paintUserSlider(); paintLists();
}

/* close modals */
document.addEventListener(\"click\",(e)=>{
  if (e.target.matches(\"[data-close]\") || e.target.closest(\"[data-close]\")) closeModals();
  if (e.target.classList.contains(\"modal\")) closeModals();
});
function closeModals(){ $$(\".modal\").forEach(m=>{ if(m.id===\"call-screen\"||m.id===\"incoming-call\"||m.id===\"story-viewer\") return; m.hidden=true; }); }

/* ========== NAV / PAGE SWITCH ========== */
$$(\".nav-btn\").forEach(b=>b.addEventListener(\"click\", ()=>switchPage(b.dataset.page)));
function switchPage(page){
  $$(\".page\").forEach(p=>p.classList.remove(\"active\"));
  const target = $(`[data-page-panel=\"${page}\"]`);
  if (target) target.classList.add(\"active\");
  $$(\".nav-btn\").forEach(b=>b.classList.toggle(\"active\", b.dataset.page===page));
  closeChatRoom();
}

/* menu */
$(\"#menu-btn\").addEventListener(\"click\",(e)=>{ e.stopPropagation(); $(\"#menu-drop\").hidden = !$(\"#menu-drop\").hidden; });
document.addEventListener(\"click\",(e)=>{ if(!e.target.closest(\"#menu-btn,#menu-drop\")) $(\"#menu-drop\").hidden=true; });
$$(\"#menu-drop [data-page]\").forEach(b=>b.addEventListener(\"click\",()=>{ $(\"#menu-drop\").hidden=true; switchPage(b.dataset.page); }));
$(\"#logout-btn\").addEventListener(\"click\", async ()=>{
  await rtdbSet(rtdbRef(rtdb,`presence/${me.uid}`),{online:false,lastSeen:Date.now()});
  await signOut(auth); location.reload();
});

/* ========== PROFILE SAVE ========== */
$(\"#save-profile-btn\").addEventListener(\"click\", async ()=>{
  const upd = {
    bio: $(\"#pf-bio\").value,
    age: parseInt($(\"#pf-age\").value)||null,
    gender: $(\"#pf-gender\").value,
    country: $(\"#pf-country\").value,
    favAnime: $(\"#pf-anime\").value,
    hobbies: $(\"#pf-hobbies\").value,
    socials: {
      instagram: $(\"#pf-ig\").value,
      telegram: $(\"#pf-tg\").value,
      facebook: $(\"#pf-fb\").value,
      snapchat: $(\"#pf-sc\").value
    }
  };
  await updateDoc(doc(db,\"users\",me.uid), upd);
  myProfile = { ...myProfile, ...upd };
  toast(\"profile saved ✨\");
});

$(\"#avatar-upload\").addEventListener(\"change\", async (e)=>{
  const f = e.target.files[0]; if (!f) return;
  toast(\"uploading...\");
  const url = await uploadToCloudinary(f);
  if (!url) return;
  await updateDoc(doc(db,\"users\",me.uid), { photoURL: url });
  myProfile.photoURL = url; $(\"#profile-avatar\").src = url;
  toast(\"avatar updated\");
});

/* ========== CLOUDINARY UPLOAD ========== */
async function uploadToCloudinary(file){
  if (CLOUDINARY.cloudName === \"YOUR_CLOUD_NAME\") {
    // local fallback = base64 (works but heavy; user should set Cloudinary)
    toast(\"Cloudinary not configured — using local preview\", true);
    return await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
  }
  const fd = new FormData();
  fd.append(\"file\", file);
  fd.append(\"upload_preset\", CLOUDINARY.uploadPreset);
  const isVideo = file.type.startsWith(\"video/\");
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${isVideo?\"video\":\"auto\"}/upload`;
  try {
    const r = await fetch(url, { method:\"POST\", body: fd });
    const j = await r.json();
    if (j.secure_url) return j.secure_url;
    toast(\"upload failed\", true); return null;
  } catch(e){ toast(\"upload error\", true); return null; }
}

/* ========== STORIES ========== */
function loadStoriesLive(){
  if (unsub.stories) unsub.stories();
  const cutoff = Date.now() - 24*60*60*1000;
  unsub.stories = onSnapshot(
    query(collection(db,\"stories\"), orderBy(\"createdAt\",\"desc\")),
    (snap)=>{
      const row = $(\"#stories-row\"); row.innerHTML = \"\";
      // \"you\" story card always first
      const mine = document.createElement(\"div\");
      mine.className = \"story-item\"; mine.dataset.testid = \"my-story-item\";
      mine.innerHTML = `<div class=\"story-ring story-add\"><i class=\"fa-solid fa-plus\"></i></div><p>your story</p>`;
      mine.addEventListener(\"click\", ()=>$(\"#add-story-btn\").click());
      row.appendChild(mine);
      const byUser = {};
      snap.forEach(d=>{
        const s = d.data(); if ((s.createdAt?.toMillis?.()||0) < cutoff) return;
        if (!byUser[s.uid]) byUser[s.uid] = []; byUser[s.uid].push({id:d.id,...s});
      });
      Object.values(byUser).forEach(stories=>{
        const u = usersCache[stories[0].uid]; if (!u) return;
        const seen = stories.every(st => (st.viewers||[]).includes(me.uid));
        const el = document.createElement(\"div\");
        el.className = \"story-item\";
        el.innerHTML = `<div class=\"story-ring ${seen?'seen':''}\"><img src=\"${u.photoURL||defaultAvatar(u.displayName)}\"/></div><p>${u.displayName.split(\" \")[0]}</p>`;
        el.addEventListener(\"click\", ()=>openStoryViewer(stories));
        row.appendChild(el);
      });
    });
}

$(\"#add-story-btn\").addEventListener(\"click\", ()=>{
  const inp = document.createElement(\"input\");
  inp.type=\"file\"; inp.accept=\"image/*,video/*\";
  inp.onchange = async (e)=>{
    const f=e.target.files[0]; if(!f) return;
    toast(\"uploading story...\");
    const url = await uploadToCloudinary(f);
    if (!url) return;
    await addDoc(collection(db,\"stories\"), {
      uid: me.uid, url, type: f.type.startsWith(\"video\")?\"video\":\"image\",
      createdAt: serverTimestamp(), viewers:[]
    });
    toast(\"story posted ✨\");
  };
  inp.click();
});

let storyState = { list:[], index:0, timer:null };
function openStoryViewer(stories){
  storyState = { list:stories, index:0, timer:null };
  $(\"#story-viewer\").hidden = false;
  renderStory();
}
function renderStory(){
  clearInterval(storyState.timer);
  const s = storyState.list[storyState.index]; if (!s) return closeStory();
  const u = usersCache[s.uid]||{};
  $(\"#story-user-avatar\").src = u.photoURL||defaultAvatar(u.displayName);
  $(\"#story-user-name\").textContent = u.displayName||\"\";
  const media = $(\"#story-media\"); media.innerHTML = \"\";
  if (s.type===\"video\") media.innerHTML = `<video src=\"${s.url}\" autoplay playsinline></video>`;
  else media.innerHTML = `<img src=\"${s.url}\"/>`;
  $(\"#story-viewers-count\").textContent = (s.viewers||[]).length;
  // mark viewed
  if (!(s.viewers||[]).includes(me.uid) && s.uid !== me.uid)
    updateDoc(doc(db,\"stories\",s.id), { viewers: arrayUnion(me.uid) });
  // progress
  let p=0; const dur = s.type===\"video\"?8000:5000;
  storyState.timer = setInterval(()=>{
    p += 100; $(\"#story-progress\").style.width = (p/dur*100)+\"%\";
    if (p>=dur){ clearInterval(storyState.timer); storyState.index++; renderStory(); }
  }, 100);
}
function closeStory(){ clearInterval(storyState.timer); $(\"#story-viewer\").hidden=true; }
$(\"#story-viewer .modal-close\").addEventListener(\"click\", closeStory);
$(\"#story-viewers-btn\").addEventListener(\"click\", ()=>{
  const s = storyState.list[storyState.index]; if(!s) return;
  const viewers = (s.viewers||[]).map(v=>usersCache[v]?.displayName||\"anon\").join(\", \");
  toast(viewers||\"no viewers yet\");
});

/* ========== CHAT LIST ========== */
let chatSeg = \"private\";
$$(\".segmented .seg\").forEach(s=>s.addEventListener(\"click\",()=>{
  $$(\".segmented .seg\").forEach(x=>x.classList.remove(\"active\"));
  s.classList.add(\"active\"); chatSeg = s.dataset.seg; loadChatListLive();
}));

function loadChatListLive(){
  if (unsub.chatList) unsub.chatList();
  const listEl = $(\"#chat-list\"); listEl.innerHTML = `<p class=\"muted\" style=\"text-align:center;padding:20px\">loading...</p>`;
  if (chatSeg === \"private\") {
    unsub.chatList = onSnapshot(
      query(collection(db,\"chats\"), where(\"participants\",\"array-contains\", me.uid)),
      (snap)=>{
        listEl.innerHTML = \"\";
        if (snap.empty) { listEl.innerHTML = `<p class=\"muted\" style=\"text-align:center;padding:20px\">no chats yet — tap a user to start</p>`; return; }
        const arr = []; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
        arr.sort((a,b)=>(b.lastTime?.toMillis?.()||0)-(a.lastTime?.toMillis?.()||0));
        arr.forEach(c=>{
          const peerId = c.participants.find(p=>p!==me.uid);
          const peer = usersCache[peerId]||{displayName:\"user\",photoURL:defaultAvatar(\"?\")};
          const el = document.createElement(\"div\"); el.className=\"chat-item\"; el.dataset.testid=`chat-item-${peerId}`;
          el.innerHTML = `<img src=\"${peer.photoURL}\"/><div class=\"ci-body\"><h4>${peer.displayName}</h4><p class=\"preview\">${c.lastMsg||\"say hi 👋\"}</p></div><div style=\"text-align:right\"><span class=\"time\">${fmtTime(c.lastTime)}</span></div>`;
          el.addEventListener(\"click\",()=>openPrivateChat(peerId));
          listEl.appendChild(el);
        });
      });
  } else {
    unsub.chatList = onSnapshot(
      query(collection(db,\"groups\"), where(\"members\",\"array-contains\", me.uid)),
      (snap)=>{
        listEl.innerHTML = \"\";
        if (snap.empty) { listEl.innerHTML = `<p class=\"muted\" style=\"text-align:center;padding:20px\">no groups — tap \"new group\"</p>`; return; }
        snap.forEach(d=>{
          const g = d.data();
          const el = document.createElement(\"div\"); el.className=\"chat-item\";
          el.innerHTML = `<img src=\"${g.photoURL||defaultAvatar(g.name)}\"/><div class=\"ci-body\"><h4>${g.name}</h4><p class=\"preview\">${g.lastMsg||\"new group\"}</p></div><div style=\"text-align:right\"><span class=\"time\">${fmtTime(g.lastTime)}</span></div>`;
          el.addEventListener(\"click\",()=>openGroupChat(d.id, g));
          listEl.appendChild(el);
        });
      });
  }
}

$(\"#new-group-btn\").addEventListener(\"click\", async ()=>{
  const name = prompt(\"group name?\"); if (!name) return;
  const ref = await addDoc(collection(db,\"groups\"), {
    name, createdBy: me.uid, members:[me.uid], photoURL:\"\", createdAt: serverTimestamp()
  });
  toast(\"group created — invite friends from any chat\");
  openGroupChat(ref.id, { name, members:[me.uid] });
});

/* ========== CHAT ROOM ========== */
function openPrivateChat(peerId){
  const peer = usersCache[peerId]; if (!peer) return;
  const cid = pairId(me.uid, peerId);
  currentChat = { type:\"private\", id: cid, peerId };
  setDoc(doc(db,\"chats\",cid), { participants:[me.uid,peerId], createdAt: serverTimestamp() }, { merge:true });
  $(\"#chat-title\").textContent = peer.displayName;
  $(\"#chat-avatar\").src = peer.photoURL;
  openChatRoom();
  listenMessages();
  // presence
  if (unsub.presence) unsub.presence();
  unsub.presence = listenPresence(peerId, p=>{ $(\"#chat-status\").textContent = p.online ? \"online\" : \"offline\"; $(\"#chat-status\").style.color = p.online?\"var(--lime)\":\"var(--muted)\"; });
  // typing listen
  if (unsub.typing) unsub.typing();
  unsub.typing = onSnapshot(doc(db,\"typing\",cid), (s)=>{
    const d = s.data()||{};
    $(\"#typing-indicator\").hidden = !(d[peerId] && (Date.now()-d[peerId])<3000);
  });
}

function openGroupChat(gid, g){
  currentChat = { type:\"group\", id: gid };
  $(\"#chat-title\").textContent = g.name;
  $(\"#chat-avatar\").src = g.photoURL||defaultAvatar(g.name);
  $(\"#chat-status\").textContent = `${(g.members||[]).length} members`;
  openChatRoom();
  listenMessages();
}

function openChatRoom(){
  $$(\".page\").forEach(p=>p.classList.remove(\"active\"));
  $(`[data-page-panel=\"chatroom\"]`).classList.add(\"active\");
}
function closeChatRoom(){
  if (unsub.messages) unsub.messages();
  if (unsub.typing) unsub.typing();
  if (unsub.presence) unsub.presence();
  currentChat = null; replyTo = null; $(\"#reply-preview\").hidden = true;
}
$(\"#chat-back\").addEventListener(\"click\",()=>switchPage(\"chats\"));

$(\"#chat-opt-btn\").addEventListener(\"click\",(e)=>{ e.stopPropagation(); $(\"#chat-opts\").hidden = !$(\"#chat-opts\").hidden; });
document.addEventListener(\"click\",(e)=>{ if(!e.target.closest(\"#chat-opt-btn,#chat-opts\")) $(\"#chat-opts\").hidden=true; });
$(\"#block-user-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId){ toggleBlock(currentChat.peerId); switchPage(\"chats\"); } });
$(\"#fav-user-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId) toggleFavorite(currentChat.peerId); });
$(\"#report-user-btn\").addEventListener(\"click\", async ()=>{ if(!currentChat?.peerId) return;
  await addDoc(collection(db,\"reports\"), { reporter: me.uid, target: currentChat.peerId, at: serverTimestamp() });
  toast(\"report submitted — thank you\");
});

function listenMessages(){
  if (unsub.messages) unsub.messages();
  const col = currentChat.type===\"private\" ? `chats/${currentChat.id}/messages` : `groups/${currentChat.id}/messages`;
  unsub.messages = onSnapshot(
    query(collection(db, col), orderBy(\"createdAt\",\"asc\"), limit(200)),
    (snap)=>{
      const box = $(\"#messages\"); box.innerHTML = \"\";
      const batch = writeBatch(db);
      let needsCommit = false;
      snap.forEach(d=>{
        const m = d.data(); const mine = m.sender === me.uid;
        const el = document.createElement(\"div\");
        el.className = \"msg \" + (mine?\"mine\":\"theirs\"); el.dataset.id = d.id;
        let inner = \"\";
        if (!mine && currentChat.type===\"group\") {
          const u = usersCache[m.sender]; inner += `<div class=\"m-name\">${u?.displayName||\"user\"}</div>`;
        }
        if (m.replyTo) inner += `<div class=\"m-reply\"><b>${m.replyTo.name}</b><div>${escapeHtml(m.replyTo.text)}</div></div>`;
        if (m.text) inner += `<div>${linkify(escapeHtml(m.text))}</div>`;
        if (m.media && m.mediaType===\"image\") inner += `<img src=\"${m.media}\"/>`;
        if (m.media && m.mediaType===\"video\") inner += `<video src=\"${m.media}\" controls></video>`;
        if (m.media && m.mediaType===\"audio\") inner += `<audio src=\"${m.media}\" controls></audio>`;
        inner += `<div class=\"m-meta\">${fmtTime(m.createdAt)} ${mine?`<i class=\"fa-solid fa-check-double ${(m.seenBy||[]).length>1?'seen':''}\"></i>`:\"\"}</div>`;
        el.innerHTML = inner;
        el.addEventListener(\"dblclick\", ()=>setReply(m));
        box.appendChild(el);
        if (!mine && !(m.seenBy||[]).includes(me.uid)) {
          batch.update(doc(db, col, d.id), { seenBy: arrayUnion(me.uid) }); needsCommit = true;
        }
      });
      if (needsCommit) batch.commit().catch(()=>{});
      box.scrollTop = box.scrollHeight;
    });
}

function escapeHtml(s){ return (s||\"\").replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }
function linkify(s){ return s.replace(/(https?:\/\/[^\s]+)/g, '<a href=\"$1\" target=\"_blank\" style=\"color:inherit;text-decoration:underline\">$1</a>'); }

function setReply(m){
  const u = usersCache[m.sender]||{displayName:\"you\"};
  replyTo = { sender:m.sender, text:m.text||\"(media)\", name: m.sender===me.uid?\"you\":u.displayName };
  $(\"#reply-name\").textContent = replyTo.name;
  $(\"#reply-text\").textContent = replyTo.text;
  $(\"#reply-preview\").hidden = false;
  $(\"#msg-input\").focus();
}
$(\"#reply-cancel\").addEventListener(\"click\",()=>{ replyTo=null; $(\"#reply-preview\").hidden=true; });

/* send */
$(\"#msg-form\").addEventListener(\"submit\", async (e)=>{
  e.preventDefault();
  const txt = $(\"#msg-input\").value.trim();
  if (!txt || !currentChat) return;
  await sendMessage({ text: txt });
  $(\"#msg-input\").value = \"\";
});

async function sendMessage(payload){
  const col = currentChat.type===\"private\" ? `chats/${currentChat.id}/messages` : `groups/${currentChat.id}/messages`;
  const msg = {
    sender: me.uid,
    createdAt: serverTimestamp(),
    seenBy:[me.uid],
    ...payload
  };
  if (replyTo) { msg.replyTo = replyTo; replyTo=null; $(\"#reply-preview\").hidden=true; }
  await addDoc(collection(db, col), msg);
  // update parent
  const preview = payload.text || (payload.mediaType===\"image\"?\"📷 photo\":payload.mediaType===\"video\"?\"🎥 video\":payload.mediaType===\"audio\"?\"🎤 voice\":\"message\");
  const parent = currentChat.type===\"private\" ? doc(db,\"chats\",currentChat.id) : doc(db,\"groups\",currentChat.id);
  await setDoc(parent, { lastMsg: preview, lastTime: serverTimestamp() }, { merge:true });
}

/* typing */
$(\"#msg-input\").addEventListener(\"input\", ()=>{
  if (!currentChat || currentChat.type!==\"private\") return;
  clearTimeout(typingTimeout);
  setDoc(doc(db,\"typing\",currentChat.id), { [me.uid]: Date.now() }, { merge:true });
  typingTimeout = setTimeout(()=>setDoc(doc(db,\"typing\",currentChat.id), { [me.uid]: 0 }, { merge:true }), 2500);
});

/* attach */
$(\"#attach-btn\").addEventListener(\"click\", ()=>$(\"#attach-input\").click());
$(\"#attach-input\").addEventListener(\"change\", async (e)=>{
  const f = e.target.files[0]; if (!f) return;
  toast(\"uploading media...\");
  const url = await uploadToCloudinary(f); if (!url) return;
  const type = f.type.startsWith(\"video\")?\"video\":\"image\";
  await sendMessage({ media:url, mediaType:type });
  e.target.value = \"\";
});

/* voice note */
let mediaRec = null, chunks=[];
$(\"#voice-btn\").addEventListener(\"click\", async ()=>{
  if (mediaRec && mediaRec.state===\"recording\") { mediaRec.stop(); return; }
  try {
    const s = await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRec = new MediaRecorder(s); chunks=[];
    mediaRec.ondataavailable = e=>chunks.push(e.data);
    mediaRec.onstop = async ()=>{
      const blob = new Blob(chunks,{type:\"audio/webm\"});
      s.getTracks().forEach(t=>t.stop());
      toast(\"uploading voice...\");
      const url = await uploadToCloudinary(new File([blob],\"voice.webm\",{type:\"audio/webm\"}));
      if (url) await sendMessage({ media:url, mediaType:\"audio\" });
    };
    mediaRec.start();
    toast(\"recording... tap mic to stop\");
    $(\"#voice-btn\").style.color = \"#ff6b8c\";
    setTimeout(()=>{ if(mediaRec?.state===\"recording\") mediaRec.stop(); $(\"#voice-btn\").style.color=\"\"; }, 30000);
  } catch(e){ toast(\"mic permission denied\", true); }
});

/* emoji */
const EMOJIS = [\"😀\",\"😂\",\"🥹\",\"😍\",\"🥰\",\"😘\",\"😎\",\"🤩\",\"🥳\",\"🫶\",\"🙏\",\"👋\",\"❤️\",\"💔\",\"🔥\",\"✨\",\"🌸\",\"🌙\",\"⭐\",\"💫\",\"🎉\",\"😭\",\"😅\",\"😳\",\"🤔\",\"😏\",\"🙃\",\"😴\",\"🥺\",\"😱\",\"💀\",\"👀\",\"💜\",\"💖\",\"💞\",\"🌈\",\"☁️\",\"🍜\",\"🍡\",\"🎌\",\"⚔️\",\"🗡️\",\"🎮\",\"🎧\",\"📸\",\"💌\",\"💭\",\"👑\",\"🐉\",\"🌊\",\"🍃\"];
$(\"#emoji-btn\").addEventListener(\"click\",()=>{
  const p = $(\"#emoji-panel\");
  if (p.hidden){ p.innerHTML = EMOJIS.map(e=>`<button type=\"button\">${e}</button>`).join(\"\"); p.hidden=false; }
  else p.hidden=true;
});
$(\"#emoji-panel\").addEventListener(\"click\",(e)=>{
  if (e.target.tagName===\"BUTTON\"){ $(\"#msg-input\").value += e.target.textContent; $(\"#emoji-panel\").hidden=true; $(\"#msg-input\").focus(); }
});

/* ========== CALLS (WebRTC + Firestore signaling) ========== */
const iceServers = { iceServers:[{urls:\"stun:stun.l.google.com:19302\"},{urls:\"stun:stun1.l.google.com:19302\"}] };

$(\"#random-video-btn\").addEventListener(\"click\", ()=>randomCall(\"video\"));
$(\"#random-audio-btn\").addEventListener(\"click\", ()=>randomCall(\"audio\"));
$(\"#call-audio-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId) startCall(currentChat.peerId,\"audio\"); });
$(\"#call-video-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId) startCall(currentChat.peerId,\"video\"); });

async function randomCall(type){
  const online = [];
  for (const uid of Object.keys(usersCache)) {
    if (uid===me.uid) continue;
    if ((myProfile.blacklist||[]).includes(uid)) continue;
    online.push(uid);
  }
  if (!online.length){ toast(\"no users online rn\", true); return; }
  const pick = online[Math.floor(Math.random()*online.length)];
  toast(\"pairing you up ✨\");
  startCall(pick, type);
}

async function startCall(peerId, type){
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:true, video: type===\"video\" });
  } catch(e){ toast(\"camera/mic permission needed\", true); return; }
  callRole = \"caller\";
  $(\"#call-screen\").hidden = false;
  $(\"#local-video\").srcObject = localStream;
  $(\"#call-name\").textContent = usersCache[peerId]?.displayName || \"calling...\";
  $(\"#call-status\").textContent = \"ringing\";

  pc = new RTCPeerConnection(iceServers);
  localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
  remoteStream = new MediaStream(); $(\"#remote-video\").srcObject = remoteStream;
  pc.ontrack = (e)=>e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t));

  const callRef = doc(collection(db,\"calls\"));
  currentCallId = callRef.id;
  const offerCands = collection(callRef,\"offerCandidates\");
  const answerCands = collection(callRef,\"answerCandidates\");
  pc.onicecandidate = (e)=>e.candidate && addDoc(offerCands, e.candidate.toJSON());

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await setDoc(callRef, { caller: me.uid, callee: peerId, type, offer:{type:offer.type, sdp:offer.sdp}, status:\"ringing\", createdAt: serverTimestamp() });

  onSnapshot(callRef,(s)=>{
    const d = s.data(); if (!d) return;
    if (d.answer && !pc.currentRemoteDescription) pc.setRemoteDescription(new RTCSessionDescription(d.answer));
    if (d.status===\"ended\") endCall();
    if (d.status===\"declined\"){ toast(\"call declined\"); endCall(); }
    if (d.status===\"active\") $(\"#call-status\").textContent = \"connected\";
  });
  onSnapshot(answerCands,(s)=>s.docChanges().forEach(c=>{ if(c.type===\"added\") pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); }));
}

function listenIncomingCalls(){
  if (unsub.incoming) unsub.incoming();
  unsub.incoming = onSnapshot(
    query(collection(db,\"calls\"), where(\"callee\",\"==\",me.uid), where(\"status\",\"==\",\"ringing\")),
    (snap)=>{
      snap.docChanges().forEach(c=>{
        if (c.type===\"added\"){
          const d = c.doc.data(); const cid = c.doc.id;
          showIncoming(cid, d);
        }
      });
    });
}

function showIncoming(cid, data){
  const caller = usersCache[data.caller]||{displayName:\"unknown\",photoURL:defaultAvatar(\"?\")};
  $(\"#incoming-call\").hidden = false;
  $(\"#inc-avatar\").src = caller.photoURL;
  $(\"#inc-name\").textContent = caller.displayName;
  $(\"#inc-type\").textContent = `incoming ${data.type} call`;
  $(\"#accept-call\").onclick = ()=>acceptCall(cid, data);
  $(\"#decline-call\").onclick = async ()=>{
    await updateDoc(doc(db,\"calls\",cid), { status:\"declined\" });
    $(\"#incoming-call\").hidden = true;
  };
}

async function acceptCall(cid, data){
  $(\"#incoming-call\").hidden = true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:true, video: data.type===\"video\" });
  } catch(e){ toast(\"permission needed\", true); return; }
  callRole = \"callee\"; currentCallId = cid;
  $(\"#call-screen\").hidden = false;
  $(\"#local-video\").srcObject = localStream;
  $(\"#call-name\").textContent = usersCache[data.caller]?.displayName||\"caller\";
  $(\"#call-status\").textContent = \"connected\";

  pc = new RTCPeerConnection(iceServers);
  localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
  remoteStream = new MediaStream(); $(\"#remote-video\").srcObject = remoteStream;
  pc.ontrack = (e)=>e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t));

  const callRef = doc(db,\"calls\",cid);
  const offerCands = collection(callRef,\"offerCandidates\");
  const answerCands = collection(callRef,\"answerCandidates\");
  pc.onicecandidate = (e)=>e.candidate && addDoc(answerCands, e.candidate.toJSON());

  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
  const ans = await pc.createAnswer();
  await pc.setLocalDescription(ans);
  await updateDoc(callRef, { answer:{type:ans.type, sdp:ans.sdp}, status:\"active\" });

  onSnapshot(offerCands,(s)=>s.docChanges().forEach(c=>{ if(c.type===\"added\") pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); }));
  onSnapshot(callRef,(s)=>{ if (s.data()?.status===\"ended\") endCall(); });
}

$(\"#end-call\").addEventListener(\"click\", endCall);
$(\"#toggle-mic\").addEventListener(\"click\", (e)=>{
  if (!localStream) return;
  const a = localStream.getAudioTracks()[0]; if(!a) return;
  a.enabled = !a.enabled; e.currentTarget.classList.toggle(\"muted\", !a.enabled);
  e.currentTarget.innerHTML = a.enabled ? '<i class=\"fa-solid fa-microphone\"></i>' : '<i class=\"fa-solid fa-microphone-slash\"></i>';
});
$(\"#toggle-cam\").addEventListener(\"click\",(e)=>{
  if (!localStream) return;
  const v = localStream.getVideoTracks()[0]; if(!v) return;
  v.enabled = !v.enabled; e.currentTarget.classList.toggle(\"muted\", !v.enabled);
  e.currentTarget.innerHTML = v.enabled ? '<i class=\"fa-solid fa-video\"></i>' : '<i class=\"fa-solid fa-video-slash\"></i>';
});
$(\"#toggle-speaker\").addEventListener(\"click\",(e)=>{
  const rv = $(\"#remote-video\"); rv.muted = !rv.muted;
  e.currentTarget.classList.toggle(\"muted\", rv.muted);
  e.currentTarget.innerHTML = rv.muted ? '<i class=\"fa-solid fa-volume-xmark\"></i>' : '<i class=\"fa-solid fa-volume-high\"></i>';
});

async function endCall(){
  try {
    if (pc) pc.close(); pc = null;
    if (localStream) localStream.getTracks().forEach(t=>t.stop()); localStream = null;
    if (currentCallId) await updateDoc(doc(db,\"calls\",currentCallId), { status:\"ended\" });
  } catch(e){}
  currentCallId = null;
  $(\"#call-screen\").hidden = true;
  $(\"#local-video\").srcObject = null; $(\"#remote-video\").srcObject = null;
}

/* ========== NOTIFICATION BADGES (unread) ========== */
// quick heuristic — count chats with lastTime > our seen
onAuthStateChanged(auth, (u)=>{ if(!u) return;
  onSnapshot(query(collection(db,\"chats\"), where(\"participants\",\"array-contains\", u.uid)), (snap)=>{
    // simple placeholder; full unread tracker would require per-user lastSeen
    let n = 0;
    snap.forEach(d=>{ if ((d.data().lastMsg||\"\") && (d.data().lastTime)) n++; });
    const b = $(\"#unread-badge\"); if (n){ b.textContent = Math.min(n,9); b.hidden=false; } else b.hidden=true;
  });
Action: file_editor create /app/frontend/public/script.js --file-text "/* ===== VINLAND — script.js =====
   Firebase v10 modular + Cloudinary + WebRTC
   by CEO
==================================== */

import { initializeApp } from \"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js\";
import {
  getAuth, setPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup, updateProfile
} from \"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js\";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot,
  collection, query, where, orderBy, addDoc, serverTimestamp,
  getDocs, limit, deleteDoc, arrayUnion, arrayRemove, writeBatch
} from \"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js\";
import {
  getDatabase, ref as rtdbRef, onValue, set as rtdbSet,
  onDisconnect, serverTimestamp as rtdbTs
} from \"https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js\";

/* ---------- CONFIG ---------- */
const firebaseConfig = {
  apiKey: \"AIzaSyBdPtkcoq_mKWDUvuzgglsu_tMUzU6pJ-A\",
  authDomain: \"anivibehub-c6d17.firebaseapp.com\",
  databaseURL: \"https://anivibehub-c6d17-default-rtdb.firebaseio.com\",
  projectId: \"anivibehub-c6d17\",
  storageBucket: \"anivibehub-c6d17.firebasestorage.app\",
  messagingSenderId: \"629029424242\",
  appId: \"1:629029424242:web:0ad8c858af2fbc3882c6ebrtz\"
};

/* TODO: replace with your real Cloudinary values */
const CLOUDINARY = {
  cloudName: \"YOUR_CLOUD_NAME\",   // e.g. \"dxyz123\"
  uploadPreset: \"YOUR_UPLOAD_PRESET\" // e.g. \"vinland_unsigned\"
};

const CREATOR_EMAIL = \"ceo@vinland.app\"; // email that shows the verified CEO badge

/* ---------- INIT ---------- */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
setPersistence(auth, browserLocalPersistence).catch(()=>{});

/* ---------- HELPERS ---------- */
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const show = (id)=>{$$(\".screen\").forEach(s=>s.classList.remove(\"active\"));$(id).classList.add(\"active\");};
const toast = (msg, err=false) => {
  const t = $(\"#toast\"); t.textContent = msg; t.className = \"toast\" + (err?\" err\":\"\");
  t.hidden = false; clearTimeout(t._to); t._to = setTimeout(()=>t.hidden=true,2600);
};
const fmtTime = (ts) => { if(!ts) return \"\"; const d=ts.toDate?ts.toDate():new Date(ts); const n=new Date();
  if(d.toDateString()===n.toDateString()) return d.toLocaleTimeString([], {hour:\"2-digit\",minute:\"2-digit\"});
  return d.toLocaleDateString([], {month:\"short\",day:\"numeric\"}); };
const pairId = (a,b)=>[a,b].sort().join(\"_\");
const defaultAvatar = (name=\"?\") => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

/* ---------- STATE ---------- */
let me = null;        // auth user
let myProfile = null; // firestore user doc
let currentChat = null; // { type:'private'|'group', id, peer? }
let replyTo = null;
let typingTimeout = null;
let unsub = { chatList:null, messages:null, users:null, stories:null, typing:null, presence:null, incoming:null };
let localStream = null, remoteStream = null, pc = null, currentCallId = null, callRole = null;
let usersCache = {}; // uid -> profile

/* ---------- SPLASH → AUTH FLOW ---------- */
window.addEventListener(\"load\", ()=>{
  setTimeout(()=>{
    onAuthStateChanged(auth, async (u)=>{
      if (u) { me = u; await loadMyProfile(); enterApp(); }
      else { show(\"#auth\"); }
    });
  }, 1400);
});

/* ========== AUTH ========== */
$$(\".tab\").forEach(btn=>btn.addEventListener(\"click\",()=>{
  $$(\".tab\").forEach(b=>b.classList.remove(\"active\"));
  btn.classList.add(\"active\");
  const t = btn.dataset.tab;
  $(\"#login-form\").classList.toggle(\"active\", t===\"login\");
  $(\"#signup-form\").classList.toggle(\"active\", t===\"signup\");
  $(\"#auth-title\").textContent = t===\"login\" ? \"welcome back\" : \"join vinland\";
  $(\"#auth-sub\").textContent   = t===\"login\" ? \"log into your anime world\" : \"create your character\";
  $(\"#auth-msg\").textContent = \"\";
}));

$(\"#login-form\").addEventListener(\"submit\", async (e)=>{
  e.preventDefault();
  const msg = $(\"#auth-msg\"); msg.textContent = \"signing in...\";
  try {
    await signInWithEmailAndPassword(auth, $(\"#login-email\").value.trim(), $(\"#login-password\").value);
    msg.textContent = \"\"; msg.className=\"auth-msg\";
  } catch(err){ msg.textContent = prettyErr(err); msg.className=\"auth-msg\"; }
});

$(\"#signup-form\").addEventListener(\"submit\", async (e)=>{
  e.preventDefault();
  const msg = $(\"#auth-msg\"); msg.textContent = \"creating account...\";
  try {
    const name = $(\"#signup-name\").value.trim();
    const cred = await createUserWithEmailAndPassword(auth, $(\"#signup-email\").value.trim(), $(\"#signup-password\").value);
    await updateProfile(cred.user, { displayName: name });
    await createUserDoc(cred.user, { displayName: name });
    msg.textContent = \"\";
  } catch(err){ msg.textContent = prettyErr(err); }
});

$(\"#google-btn\").addEventListener(\"click\", async ()=>{
  const msg = $(\"#auth-msg\"); msg.textContent = \"opening google...\";
  try {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const snap = await getDoc(doc(db,\"users\",res.user.uid));
    if (!snap.exists()) await createUserDoc(res.user, { displayName: res.user.displayName, photoURL: res.user.photoURL });
    msg.textContent = \"\";
  } catch(err){ msg.textContent = prettyErr(err); }
});

$(\"#forgot-btn\").addEventListener(\"click\", async ()=>{
  const email = $(\"#login-email\").value.trim();
  if (!email) { toast(\"enter your email first\", true); return; }
  try { await sendPasswordResetEmail(auth, email); toast(\"reset email sent ✨\"); }
  catch(err){ toast(prettyErr(err), true); }
});

function prettyErr(err){
  const c = err?.code || \"\";
  if (c.includes(\"email-already\")) return \"email already in use\";
  if (c.includes(\"wrong-password\")||c.includes(\"invalid-credential\")) return \"invalid email or password\";
  if (c.includes(\"user-not-found\")) return \"no account found\";
  if (c.includes(\"weak-password\")) return \"password too weak\";
  if (c.includes(\"popup-closed\")) return \"google popup closed\";
  return err?.message || \"something went wrong\";
}

async function createUserDoc(user, extra={}){
  const data = {
    uid: user.uid,
    displayName: extra.displayName || user.displayName || user.email.split(\"@\")[0],
    email: user.email,
    photoURL: extra.photoURL || defaultAvatar(user.email),
    bio: \"just another anime soul\",
    age: null, gender: \"\", country: \"\",
    favAnime: \"\", hobbies: \"\",
    socials: { instagram:\"\", telegram:\"\", facebook:\"\", snapchat:\"\" },
    verified: user.email === CREATOR_EMAIL,
    favorites: [], blacklist: [],
    createdAt: serverTimestamp()
  };
  await setDoc(doc(db,\"users\",user.uid), data);
}

/* ========== ENTER APP ========== */
async function loadMyProfile(){
  const ref = doc(db,\"users\",me.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) { await createUserDoc(me); myProfile = (await getDoc(ref)).data(); }
  else myProfile = snap.data();
  paintProfile();
  setupPresence();
  listenIncomingCalls();
}

function enterApp(){
  show(\"#app\");
  loadUsersLive();
  loadStoriesLive();
  loadChatListLive();
  switchPage(\"home\");
}

function paintProfile(){
  $(\"#profile-name\").textContent = myProfile.displayName;
  $(\"#profile-email\").textContent = myProfile.email;
  $(\"#profile-avatar\").src = myProfile.photoURL || defaultAvatar(myProfile.displayName);
  $(\"#verified-badge\").hidden = !myProfile.verified;
  $(\"#pf-bio\").value = myProfile.bio||\"\";
  $(\"#pf-age\").value = myProfile.age||\"\";
  $(\"#pf-gender\").value = myProfile.gender||\"\";
  $(\"#pf-country\").value = myProfile.country||\"\";
  $(\"#pf-anime\").value = myProfile.favAnime||\"\";
  $(\"#pf-hobbies\").value = myProfile.hobbies||\"\";
  $(\"#pf-ig\").value = myProfile.socials?.instagram||\"\";
  $(\"#pf-tg\").value = myProfile.socials?.telegram||\"\";
  $(\"#pf-fb\").value = myProfile.socials?.facebook||\"\";
  $(\"#pf-sc\").value = myProfile.socials?.snapchat||\"\";
  paintLists();
}

function paintLists(){
  const fav = $(\"#fav-list\"), bl = $(\"#black-list\");
  fav.innerHTML = \"\"; bl.innerHTML = \"\";
  const favs = myProfile.favorites||[]; const blacks = myProfile.blacklist||[];
  if (!favs.length) fav.innerHTML = \"<span class='empty'>no favorites yet</span>\";
  if (!blacks.length) bl.innerHTML = \"<span class='empty'>nobody blocked</span>\";
  favs.forEach(u=>{ const p=usersCache[u]; if(p) fav.insertAdjacentHTML(\"beforeend\", `<span class=\"mini-pill\"><img src=\"${p.photoURL}\"/> ${p.displayName}</span>`); });
  blacks.forEach(u=>{ const p=usersCache[u]; if(p) bl.insertAdjacentHTML(\"beforeend\", `<span class=\"mini-pill\"><img src=\"${p.photoURL}\"/> ${p.displayName}</span>`); });
}

/* ========== PRESENCE ========== */
function setupPresence(){
  const pref = rtdbRef(rtdb, `presence/${me.uid}`);
  rtdbSet(pref, { online:true, lastSeen: rtdbTs() });
  onDisconnect(pref).set({ online:false, lastSeen: rtdbTs() });
  window.addEventListener(\"beforeunload\", ()=>rtdbSet(pref,{online:false,lastSeen:Date.now()}));
}

function listenPresence(uid, cb){
  return onValue(rtdbRef(rtdb, `presence/${uid}`), (snap)=>cb(snap.val()||{online:false}));
}

/* ========== USERS LIVE ========== */
function loadUsersLive(){
  if (unsub.users) unsub.users();
  unsub.users = onSnapshot(collection(db,\"users\"), (snap)=>{
    usersCache = {};
    snap.forEach(d=>usersCache[d.id] = d.data());
    paintUserSlider();
    paintLists();
  });
}

let currentFilter = \"all\", currentCountry = \"\";
$$(\".filter-chips .chip\").forEach(c=>c.addEventListener(\"click\",()=>{
  $$(\".filter-chips .chip\").forEach(x=>x.classList.remove(\"active\"));
  c.classList.add(\"active\"); currentFilter = c.dataset.filter; paintUserSlider();
}));
$(\"#search-country\").addEventListener(\"input\", (e)=>{ currentCountry = e.target.value.toLowerCase().trim(); paintUserSlider(); });

async function isOnline(uid){
  return new Promise(res=>{
    const un = listenPresence(uid, p=>{ un(); res(p.online); });
  });
}

function paintUserSlider(){
  const slider = $(\"#user-slider\"); slider.innerHTML = \"\";
  const list = Object.values(usersCache).filter(u=>u.uid !== me.uid);
  const bl = myProfile?.blacklist||[];
  const filtered = list.filter(u=>{
    if (bl.includes(u.uid)) return false;
    if (currentFilter===\"female\" && u.gender!==\"female\") return false;
    if (currentFilter===\"male\" && u.gender!==\"male\") return false;
    if (currentCountry && !(u.country||\"\").toLowerCase().includes(currentCountry)) return false;
    return true;
  });
  filtered.forEach(u=>{
    const card = document.createElement(\"div\");
    card.className = \"user-card\"; card.dataset.testid = `user-card-${u.uid}`;
    card.innerHTML = `
      <img src=\"${u.photoURL||defaultAvatar(u.displayName)}\" alt=\"\"/>
      <div class=\"card-overlay\">
        <h4>${u.displayName} ${u.verified?'<i class=\"fa-solid fa-crown verified-mini\"></i>':\"\"}</h4>
        <div class=\"meta\"><span class=\"online-dot\" data-pres=\"${u.uid}\"></span><span>${u.country||\"—\"}</span>${u.gender?'<span>· '+u.gender+'</span>':''}</div>
      </div>`;
    card.addEventListener(\"click\", ()=>openUserModal(u.uid));
    slider.appendChild(card);
    listenPresence(u.uid, p=>{
      const dot = card.querySelector(`[data-pres=\"${u.uid}\"]`);
      if (dot) dot.classList.toggle(\"on\", !!p.online);
      if (currentFilter===\"online\" && !p.online) card.style.display = \"none\";
      else card.style.display = \"\";
    });
  });
}

/* ========== USER MODAL ========== */
function openUserModal(uid){
  const u = usersCache[uid]; if (!u) return;
  const m = $(\"#user-modal\"); m.hidden = false;
  $(\"#um-avatar\").src = u.photoURL||defaultAvatar(u.displayName);
  $(\"#um-name\").innerHTML = `${u.displayName} ${u.verified?'<i class=\"fa-solid fa-crown verified-mini\"></i>':\"\"}`;
  $(\"#um-bio\").textContent = u.bio||\"\";
  $(\"#um-gender\").textContent = u.gender||\"\";
  $(\"#um-country\").textContent = u.country||\"\";
  $(\"#um-age\").textContent = u.age? `${u.age} yrs` : \"\";
  $(\"#um-anime\").textContent = u.favAnime? `loves: ${u.favAnime}` : \"\";
  const s = u.socials||{}; const soc=$(\"#um-socials\"); soc.innerHTML=\"\";
  const links=[[\"instagram\",\"fa-instagram\"],[\"telegram\",\"fa-telegram\"],[\"facebook\",\"fa-facebook\"],[\"snapchat\",\"fa-snapchat\"]];
  links.forEach(([k,ic])=>{ if(s[k]) soc.insertAdjacentHTML(\"beforeend\", `<a href=\"${s[k].startsWith(\"http\")?s[k]:\"https://\"+s[k]}\" target=\"_blank\"><i class=\"fa-brands ${ic}\"></i></a>`); });
  $(\"#um-chat\").onclick = ()=>{ closeModals(); openPrivateChat(uid); };
  $(\"#um-video\").onclick = ()=>{ closeModals(); startCall(uid, \"video\"); };
  $(\"#um-audio\").onclick = ()=>{ closeModals(); startCall(uid, \"audio\"); };
  $(\"#um-fav\").onclick = async ()=>{ await toggleFavorite(uid); };
  $(\"#um-block\").onclick = async ()=>{ await toggleBlock(uid); closeModals(); };
}

async function toggleFavorite(uid){
  const favs = myProfile.favorites||[];
  const op = favs.includes(uid) ? arrayRemove(uid) : arrayUnion(uid);
  await updateDoc(doc(db,\"users\",me.uid), { favorites: op });
  toast(favs.includes(uid) ? \"removed from favorites\" : \"added to favorites ♡\");
  myProfile = (await getDoc(doc(db,\"users\",me.uid))).data(); paintLists();
}
async function toggleBlock(uid){
  const bl = myProfile.blacklist||[];
  const op = bl.includes(uid) ? arrayRemove(uid) : arrayUnion(uid);
  await updateDoc(doc(db,\"users\",me.uid), { blacklist: op });
  toast(bl.includes(uid) ? \"unblocked\" : \"user blocked\");
  myProfile = (await getDoc(doc(db,\"users\",me.uid))).data(); paintUserSlider(); paintLists();
}

/* close modals */
document.addEventListener(\"click\",(e)=>{
  if (e.target.matches(\"[data-close]\") || e.target.closest(\"[data-close]\")) closeModals();
  if (e.target.classList.contains(\"modal\")) closeModals();
});
function closeModals(){ $$(\".modal\").forEach(m=>{ if(m.id===\"call-screen\"||m.id===\"incoming-call\"||m.id===\"story-viewer\") return; m.hidden=true; }); }

/* ========== NAV / PAGE SWITCH ========== */
$$(\".nav-btn\").forEach(b=>b.addEventListener(\"click\", ()=>switchPage(b.dataset.page)));
function switchPage(page){
  $$(\".page\").forEach(p=>p.classList.remove(\"active\"));
  const target = $(`[data-page-panel=\"${page}\"]`);
  if (target) target.classList.add(\"active\");
  $$(\".nav-btn\").forEach(b=>b.classList.toggle(\"active\", b.dataset.page===page));
  closeChatRoom();
}

/* menu */
$(\"#menu-btn\").addEventListener(\"click\",(e)=>{ e.stopPropagation(); $(\"#menu-drop\").hidden = !$(\"#menu-drop\").hidden; });
document.addEventListener(\"click\",(e)=>{ if(!e.target.closest(\"#menu-btn,#menu-drop\")) $(\"#menu-drop\").hidden=true; });
$$(\"#menu-drop [data-page]\").forEach(b=>b.addEventListener(\"click\",()=>{ $(\"#menu-drop\").hidden=true; switchPage(b.dataset.page); }));
$(\"#logout-btn\").addEventListener(\"click\", async ()=>{
  await rtdbSet(rtdbRef(rtdb,`presence/${me.uid}`),{online:false,lastSeen:Date.now()});
  await signOut(auth); location.reload();
});

/* ========== PROFILE SAVE ========== */
$(\"#save-profile-btn\").addEventListener(\"click\", async ()=>{
  const upd = {
    bio: $(\"#pf-bio\").value,
    age: parseInt($(\"#pf-age\").value)||null,
    gender: $(\"#pf-gender\").value,
    country: $(\"#pf-country\").value,
    favAnime: $(\"#pf-anime\").value,
    hobbies: $(\"#pf-hobbies\").value,
    socials: {
      instagram: $(\"#pf-ig\").value,
      telegram: $(\"#pf-tg\").value,
      facebook: $(\"#pf-fb\").value,
      snapchat: $(\"#pf-sc\").value
    }
  };
  await updateDoc(doc(db,\"users\",me.uid), upd);
  myProfile = { ...myProfile, ...upd };
  toast(\"profile saved ✨\");
});

$(\"#avatar-upload\").addEventListener(\"change\", async (e)=>{
  const f = e.target.files[0]; if (!f) return;
  toast(\"uploading...\");
  const url = await uploadToCloudinary(f);
  if (!url) return;
  await updateDoc(doc(db,\"users\",me.uid), { photoURL: url });
  myProfile.photoURL = url; $(\"#profile-avatar\").src = url;
  toast(\"avatar updated\");
});

/* ========== CLOUDINARY UPLOAD ========== */
async function uploadToCloudinary(file){
  if (CLOUDINARY.cloudName === \"YOUR_CLOUD_NAME\") {
    // local fallback = base64 (works but heavy; user should set Cloudinary)
    toast(\"Cloudinary not configured — using local preview\", true);
    return await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
  }
  const fd = new FormData();
  fd.append(\"file\", file);
  fd.append(\"upload_preset\", CLOUDINARY.uploadPreset);
  const isVideo = file.type.startsWith(\"video/\");
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${isVideo?\"video\":\"auto\"}/upload`;
  try {
    const r = await fetch(url, { method:\"POST\", body: fd });
    const j = await r.json();
    if (j.secure_url) return j.secure_url;
    toast(\"upload failed\", true); return null;
  } catch(e){ toast(\"upload error\", true); return null; }
}

/* ========== STORIES ========== */
function loadStoriesLive(){
  if (unsub.stories) unsub.stories();
  const cutoff = Date.now() - 24*60*60*1000;
  unsub.stories = onSnapshot(
    query(collection(db,\"stories\"), orderBy(\"createdAt\",\"desc\")),
    (snap)=>{
      const row = $(\"#stories-row\"); row.innerHTML = \"\";
      // \"you\" story card always first
      const mine = document.createElement(\"div\");
      mine.className = \"story-item\"; mine.dataset.testid = \"my-story-item\";
      mine.innerHTML = `<div class=\"story-ring story-add\"><i class=\"fa-solid fa-plus\"></i></div><p>your story</p>`;
      mine.addEventListener(\"click\", ()=>$(\"#add-story-btn\").click());
      row.appendChild(mine);
      const byUser = {};
      snap.forEach(d=>{
        const s = d.data(); if ((s.createdAt?.toMillis?.()||0) < cutoff) return;
        if (!byUser[s.uid]) byUser[s.uid] = []; byUser[s.uid].push({id:d.id,...s});
      });
      Object.values(byUser).forEach(stories=>{
        const u = usersCache[stories[0].uid]; if (!u) return;
        const seen = stories.every(st => (st.viewers||[]).includes(me.uid));
        const el = document.createElement(\"div\");
        el.className = \"story-item\";
        el.innerHTML = `<div class=\"story-ring ${seen?'seen':''}\"><img src=\"${u.photoURL||defaultAvatar(u.displayName)}\"/></div><p>${u.displayName.split(\" \")[0]}</p>`;
        el.addEventListener(\"click\", ()=>openStoryViewer(stories));
        row.appendChild(el);
      });
    });
}

$(\"#add-story-btn\").addEventListener(\"click\", ()=>{
  const inp = document.createElement(\"input\");
  inp.type=\"file\"; inp.accept=\"image/*,video/*\";
  inp.onchange = async (e)=>{
    const f=e.target.files[0]; if(!f) return;
    toast(\"uploading story...\");
    const url = await uploadToCloudinary(f);
    if (!url) return;
    await addDoc(collection(db,\"stories\"), {
      uid: me.uid, url, type: f.type.startsWith(\"video\")?\"video\":\"image\",
      createdAt: serverTimestamp(), viewers:[]
    });
    toast(\"story posted ✨\");
  };
  inp.click();
});

let storyState = { list:[], index:0, timer:null };
function openStoryViewer(stories){
  storyState = { list:stories, index:0, timer:null };
  $(\"#story-viewer\").hidden = false;
  renderStory();
}
function renderStory(){
  clearInterval(storyState.timer);
  const s = storyState.list[storyState.index]; if (!s) return closeStory();
  const u = usersCache[s.uid]||{};
  $(\"#story-user-avatar\").src = u.photoURL||defaultAvatar(u.displayName);
  $(\"#story-user-name\").textContent = u.displayName||\"\";
  const media = $(\"#story-media\"); media.innerHTML = \"\";
  if (s.type===\"video\") media.innerHTML = `<video src=\"${s.url}\" autoplay playsinline></video>`;
  else media.innerHTML = `<img src=\"${s.url}\"/>`;
  $(\"#story-viewers-count\").textContent = (s.viewers||[]).length;
  // mark viewed
  if (!(s.viewers||[]).includes(me.uid) && s.uid !== me.uid)
    updateDoc(doc(db,\"stories\",s.id), { viewers: arrayUnion(me.uid) });
  // progress
  let p=0; const dur = s.type===\"video\"?8000:5000;
  storyState.timer = setInterval(()=>{
    p += 100; $(\"#story-progress\").style.width = (p/dur*100)+\"%\";
    if (p>=dur){ clearInterval(storyState.timer); storyState.index++; renderStory(); }
  }, 100);
}
function closeStory(){ clearInterval(storyState.timer); $(\"#story-viewer\").hidden=true; }
$(\"#story-viewer .modal-close\").addEventListener(\"click\", closeStory);
$(\"#story-viewers-btn\").addEventListener(\"click\", ()=>{
  const s = storyState.list[storyState.index]; if(!s) return;
  const viewers = (s.viewers||[]).map(v=>usersCache[v]?.displayName||\"anon\").join(\", \");
  toast(viewers||\"no viewers yet\");
});

/* ========== CHAT LIST ========== */
let chatSeg = \"private\";
$$(\".segmented .seg\").forEach(s=>s.addEventListener(\"click\",()=>{
  $$(\".segmented .seg\").forEach(x=>x.classList.remove(\"active\"));
  s.classList.add(\"active\"); chatSeg = s.dataset.seg; loadChatListLive();
}));

function loadChatListLive(){
  if (unsub.chatList) unsub.chatList();
  const listEl = $(\"#chat-list\"); listEl.innerHTML = `<p class=\"muted\" style=\"text-align:center;padding:20px\">loading...</p>`;
  if (chatSeg === \"private\") {
    unsub.chatList = onSnapshot(
      query(collection(db,\"chats\"), where(\"participants\",\"array-contains\", me.uid)),
      (snap)=>{
        listEl.innerHTML = \"\";
        if (snap.empty) { listEl.innerHTML = `<p class=\"muted\" style=\"text-align:center;padding:20px\">no chats yet — tap a user to start</p>`; return; }
        const arr = []; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
        arr.sort((a,b)=>(b.lastTime?.toMillis?.()||0)-(a.lastTime?.toMillis?.()||0));
        arr.forEach(c=>{
          const peerId = c.participants.find(p=>p!==me.uid);
          const peer = usersCache[peerId]||{displayName:\"user\",photoURL:defaultAvatar(\"?\")};
          const el = document.createElement(\"div\"); el.className=\"chat-item\"; el.dataset.testid=`chat-item-${peerId}`;
          el.innerHTML = `<img src=\"${peer.photoURL}\"/><div class=\"ci-body\"><h4>${peer.displayName}</h4><p class=\"preview\">${c.lastMsg||\"say hi 👋\"}</p></div><div style=\"text-align:right\"><span class=\"time\">${fmtTime(c.lastTime)}</span></div>`;
          el.addEventListener(\"click\",()=>openPrivateChat(peerId));
          listEl.appendChild(el);
        });
      });
  } else {
    unsub.chatList = onSnapshot(
      query(collection(db,\"groups\"), where(\"members\",\"array-contains\", me.uid)),
      (snap)=>{
        listEl.innerHTML = \"\";
        if (snap.empty) { listEl.innerHTML = `<p class=\"muted\" style=\"text-align:center;padding:20px\">no groups — tap \"new group\"</p>`; return; }
        snap.forEach(d=>{
          const g = d.data();
          const el = document.createElement(\"div\"); el.className=\"chat-item\";
          el.innerHTML = `<img src=\"${g.photoURL||defaultAvatar(g.name)}\"/><div class=\"ci-body\"><h4>${g.name}</h4><p class=\"preview\">${g.lastMsg||\"new group\"}</p></div><div style=\"text-align:right\"><span class=\"time\">${fmtTime(g.lastTime)}</span></div>`;
          el.addEventListener(\"click\",()=>openGroupChat(d.id, g));
          listEl.appendChild(el);
        });
      });
  }
}

$(\"#new-group-btn\").addEventListener(\"click\", async ()=>{
  const name = prompt(\"group name?\"); if (!name) return;
  const ref = await addDoc(collection(db,\"groups\"), {
    name, createdBy: me.uid, members:[me.uid], photoURL:\"\", createdAt: serverTimestamp()
  });
  toast(\"group created — invite friends from any chat\");
  openGroupChat(ref.id, { name, members:[me.uid] });
});

/* ========== CHAT ROOM ========== */
function openPrivateChat(peerId){
  const peer = usersCache[peerId]; if (!peer) return;
  const cid = pairId(me.uid, peerId);
  currentChat = { type:\"private\", id: cid, peerId };
  setDoc(doc(db,\"chats\",cid), { participants:[me.uid,peerId], createdAt: serverTimestamp() }, { merge:true });
  $(\"#chat-title\").textContent = peer.displayName;
  $(\"#chat-avatar\").src = peer.photoURL;
  openChatRoom();
  listenMessages();
  // presence
  if (unsub.presence) unsub.presence();
  unsub.presence = listenPresence(peerId, p=>{ $(\"#chat-status\").textContent = p.online ? \"online\" : \"offline\"; $(\"#chat-status\").style.color = p.online?\"var(--lime)\":\"var(--muted)\"; });
  // typing listen
  if (unsub.typing) unsub.typing();
  unsub.typing = onSnapshot(doc(db,\"typing\",cid), (s)=>{
    const d = s.data()||{};
    $(\"#typing-indicator\").hidden = !(d[peerId] && (Date.now()-d[peerId])<3000);
  });
}

function openGroupChat(gid, g){
  currentChat = { type:\"group\", id: gid };
  $(\"#chat-title\").textContent = g.name;
  $(\"#chat-avatar\").src = g.photoURL||defaultAvatar(g.name);
  $(\"#chat-status\").textContent = `${(g.members||[]).length} members`;
  openChatRoom();
  listenMessages();
}

function openChatRoom(){
  $$(\".page\").forEach(p=>p.classList.remove(\"active\"));
  $(`[data-page-panel=\"chatroom\"]`).classList.add(\"active\");
}
function closeChatRoom(){
  if (unsub.messages) unsub.messages();
  if (unsub.typing) unsub.typing();
  if (unsub.presence) unsub.presence();
  currentChat = null; replyTo = null; $(\"#reply-preview\").hidden = true;
}
$(\"#chat-back\").addEventListener(\"click\",()=>switchPage(\"chats\"));

$(\"#chat-opt-btn\").addEventListener(\"click\",(e)=>{ e.stopPropagation(); $(\"#chat-opts\").hidden = !$(\"#chat-opts\").hidden; });
document.addEventListener(\"click\",(e)=>{ if(!e.target.closest(\"#chat-opt-btn,#chat-opts\")) $(\"#chat-opts\").hidden=true; });
$(\"#block-user-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId){ toggleBlock(currentChat.peerId); switchPage(\"chats\"); } });
$(\"#fav-user-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId) toggleFavorite(currentChat.peerId); });
$(\"#report-user-btn\").addEventListener(\"click\", async ()=>{ if(!currentChat?.peerId) return;
  await addDoc(collection(db,\"reports\"), { reporter: me.uid, target: currentChat.peerId, at: serverTimestamp() });
  toast(\"report submitted — thank you\");
});

function listenMessages(){
  if (unsub.messages) unsub.messages();
  const col = currentChat.type===\"private\" ? `chats/${currentChat.id}/messages` : `groups/${currentChat.id}/messages`;
  unsub.messages = onSnapshot(
    query(collection(db, col), orderBy(\"createdAt\",\"asc\"), limit(200)),
    (snap)=>{
      const box = $(\"#messages\"); box.innerHTML = \"\";
      const batch = writeBatch(db);
      let needsCommit = false;
      snap.forEach(d=>{
        const m = d.data(); const mine = m.sender === me.uid;
        const el = document.createElement(\"div\");
        el.className = \"msg \" + (mine?\"mine\":\"theirs\"); el.dataset.id = d.id;
        let inner = \"\";
        if (!mine && currentChat.type===\"group\") {
          const u = usersCache[m.sender]; inner += `<div class=\"m-name\">${u?.displayName||\"user\"}</div>`;
        }
        if (m.replyTo) inner += `<div class=\"m-reply\"><b>${m.replyTo.name}</b><div>${escapeHtml(m.replyTo.text)}</div></div>`;
        if (m.text) inner += `<div>${linkify(escapeHtml(m.text))}</div>`;
        if (m.media && m.mediaType===\"image\") inner += `<img src=\"${m.media}\"/>`;
        if (m.media && m.mediaType===\"video\") inner += `<video src=\"${m.media}\" controls></video>`;
        if (m.media && m.mediaType===\"audio\") inner += `<audio src=\"${m.media}\" controls></audio>`;
        inner += `<div class=\"m-meta\">${fmtTime(m.createdAt)} ${mine?`<i class=\"fa-solid fa-check-double ${(m.seenBy||[]).length>1?'seen':''}\"></i>`:\"\"}</div>`;
        el.innerHTML = inner;
        el.addEventListener(\"dblclick\", ()=>setReply(m));
        box.appendChild(el);
        if (!mine && !(m.seenBy||[]).includes(me.uid)) {
          batch.update(doc(db, col, d.id), { seenBy: arrayUnion(me.uid) }); needsCommit = true;
        }
      });
      if (needsCommit) batch.commit().catch(()=>{});
      box.scrollTop = box.scrollHeight;
    });
}

function escapeHtml(s){ return (s||\"\").replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }
function linkify(s){ return s.replace(/(https?:\/\/[^\s]+)/g, '<a href=\"$1\" target=\"_blank\" style=\"color:inherit;text-decoration:underline\">$1</a>'); }

function setReply(m){
  const u = usersCache[m.sender]||{displayName:\"you\"};
  replyTo = { sender:m.sender, text:m.text||\"(media)\", name: m.sender===me.uid?\"you\":u.displayName };
  $(\"#reply-name\").textContent = replyTo.name;
  $(\"#reply-text\").textContent = replyTo.text;
  $(\"#reply-preview\").hidden = false;
  $(\"#msg-input\").focus();
}
$(\"#reply-cancel\").addEventListener(\"click\",()=>{ replyTo=null; $(\"#reply-preview\").hidden=true; });

/* send */
$(\"#msg-form\").addEventListener(\"submit\", async (e)=>{
  e.preventDefault();
  const txt = $(\"#msg-input\").value.trim();
  if (!txt || !currentChat) return;
  await sendMessage({ text: txt });
  $(\"#msg-input\").value = \"\";
});

async function sendMessage(payload){
  const col = currentChat.type===\"private\" ? `chats/${currentChat.id}/messages` : `groups/${currentChat.id}/messages`;
  const msg = {
    sender: me.uid,
    createdAt: serverTimestamp(),
    seenBy:[me.uid],
    ...payload
  };
  if (replyTo) { msg.replyTo = replyTo; replyTo=null; $(\"#reply-preview\").hidden=true; }
  await addDoc(collection(db, col), msg);
  // update parent
  const preview = payload.text || (payload.mediaType===\"image\"?\"📷 photo\":payload.mediaType===\"video\"?\"🎥 video\":payload.mediaType===\"audio\"?\"🎤 voice\":\"message\");
  const parent = currentChat.type===\"private\" ? doc(db,\"chats\",currentChat.id) : doc(db,\"groups\",currentChat.id);
  await setDoc(parent, { lastMsg: preview, lastTime: serverTimestamp() }, { merge:true });
}

/* typing */
$(\"#msg-input\").addEventListener(\"input\", ()=>{
  if (!currentChat || currentChat.type!==\"private\") return;
  clearTimeout(typingTimeout);
  setDoc(doc(db,\"typing\",currentChat.id), { [me.uid]: Date.now() }, { merge:true });
  typingTimeout = setTimeout(()=>setDoc(doc(db,\"typing\",currentChat.id), { [me.uid]: 0 }, { merge:true }), 2500);
});

/* attach */
$(\"#attach-btn\").addEventListener(\"click\", ()=>$(\"#attach-input\").click());
$(\"#attach-input\").addEventListener(\"change\", async (e)=>{
  const f = e.target.files[0]; if (!f) return;
  toast(\"uploading media...\");
  const url = await uploadToCloudinary(f); if (!url) return;
  const type = f.type.startsWith(\"video\")?\"video\":\"image\";
  await sendMessage({ media:url, mediaType:type });
  e.target.value = \"\";
});

/* voice note */
let mediaRec = null, chunks=[];
$(\"#voice-btn\").addEventListener(\"click\", async ()=>{
  if (mediaRec && mediaRec.state===\"recording\") { mediaRec.stop(); return; }
  try {
    const s = await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRec = new MediaRecorder(s); chunks=[];
    mediaRec.ondataavailable = e=>chunks.push(e.data);
    mediaRec.onstop = async ()=>{
      const blob = new Blob(chunks,{type:\"audio/webm\"});
      s.getTracks().forEach(t=>t.stop());
      toast(\"uploading voice...\");
      const url = await uploadToCloudinary(new File([blob],\"voice.webm\",{type:\"audio/webm\"}));
      if (url) await sendMessage({ media:url, mediaType:\"audio\" });
    };
    mediaRec.start();
    toast(\"recording... tap mic to stop\");
    $(\"#voice-btn\").style.color = \"#ff6b8c\";
    setTimeout(()=>{ if(mediaRec?.state===\"recording\") mediaRec.stop(); $(\"#voice-btn\").style.color=\"\"; }, 30000);
  } catch(e){ toast(\"mic permission denied\", true); }
});

/* emoji */
const EMOJIS = [\"😀\",\"😂\",\"🥹\",\"😍\",\"🥰\",\"😘\",\"😎\",\"🤩\",\"🥳\",\"🫶\",\"🙏\",\"👋\",\"❤️\",\"💔\",\"🔥\",\"✨\",\"🌸\",\"🌙\",\"⭐\",\"💫\",\"🎉\",\"😭\",\"😅\",\"😳\",\"🤔\",\"😏\",\"🙃\",\"😴\",\"🥺\",\"😱\",\"💀\",\"👀\",\"💜\",\"💖\",\"💞\",\"🌈\",\"☁️\",\"🍜\",\"🍡\",\"🎌\",\"⚔️\",\"🗡️\",\"🎮\",\"🎧\",\"📸\",\"💌\",\"💭\",\"👑\",\"🐉\",\"🌊\",\"🍃\"];
$(\"#emoji-btn\").addEventListener(\"click\",()=>{
  const p = $(\"#emoji-panel\");
  if (p.hidden){ p.innerHTML = EMOJIS.map(e=>`<button type=\"button\">${e}</button>`).join(\"\"); p.hidden=false; }
  else p.hidden=true;
});
$(\"#emoji-panel\").addEventListener(\"click\",(e)=>{
  if (e.target.tagName===\"BUTTON\"){ $(\"#msg-input\").value += e.target.textContent; $(\"#emoji-panel\").hidden=true; $(\"#msg-input\").focus(); }
});

/* ========== CALLS (WebRTC + Firestore signaling) ========== */
const iceServers = { iceServers:[{urls:\"stun:stun.l.google.com:19302\"},{urls:\"stun:stun1.l.google.com:19302\"}] };

$(\"#random-video-btn\").addEventListener(\"click\", ()=>randomCall(\"video\"));
$(\"#random-audio-btn\").addEventListener(\"click\", ()=>randomCall(\"audio\"));
$(\"#call-audio-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId) startCall(currentChat.peerId,\"audio\"); });
$(\"#call-video-btn\").addEventListener(\"click\", ()=>{ if(currentChat?.peerId) startCall(currentChat.peerId,\"video\"); });

async function randomCall(type){
  const online = [];
  for (const uid of Object.keys(usersCache)) {
    if (uid===me.uid) continue;
    if ((myProfile.blacklist||[]).includes(uid)) continue;
    online.push(uid);
  }
  if (!online.length){ toast(\"no users online rn\", true); return; }
  const pick = online[Math.floor(Math.random()*online.length)];
  toast(\"pairing you up ✨\");
  startCall(pick, type);
}

async function startCall(peerId, type){
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:true, video: type===\"video\" });
  } catch(e){ toast(\"camera/mic permission needed\", true); return; }
  callRole = \"caller\";
  $(\"#call-screen\").hidden = false;
  $(\"#local-video\").srcObject = localStream;
  $(\"#call-name\").textContent = usersCache[peerId]?.displayName || \"calling...\";
  $(\"#call-status\").textContent = \"ringing\";

  pc = new RTCPeerConnection(iceServers);
  localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
  remoteStream = new MediaStream(); $(\"#remote-video\").srcObject = remoteStream;
  pc.ontrack = (e)=>e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t));

  const callRef = doc(collection(db,\"calls\"));
  currentCallId = callRef.id;
  const offerCands = collection(callRef,\"offerCandidates\");
  const answerCands = collection(callRef,\"answerCandidates\");
  pc.onicecandidate = (e)=>e.candidate && addDoc(offerCands, e.candidate.toJSON());

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await setDoc(callRef, { caller: me.uid, callee: peerId, type, offer:{type:offer.type, sdp:offer.sdp}, status:\"ringing\", createdAt: serverTimestamp() });

  onSnapshot(callRef,(s)=>{
    const d = s.data(); if (!d) return;
    if (d.answer && !pc.currentRemoteDescription) pc.setRemoteDescription(new RTCSessionDescription(d.answer));
    if (d.status===\"ended\") endCall();
    if (d.status===\"declined\"){ toast(\"call declined\"); endCall(); }
    if (d.status===\"active\") $(\"#call-status\").textContent = \"connected\";
  });
  onSnapshot(answerCands,(s)=>s.docChanges().forEach(c=>{ if(c.type===\"added\") pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); }));
}

function listenIncomingCalls(){
  if (unsub.incoming) unsub.incoming();
  unsub.incoming = onSnapshot(
    query(collection(db,\"calls\"), where(\"callee\",\"==\",me.uid), where(\"status\",\"==\",\"ringing\")),
    (snap)=>{
      snap.docChanges().forEach(c=>{
        if (c.type===\"added\"){
          const d = c.doc.data(); const cid = c.doc.id;
          showIncoming(cid, d);
        }
      });
    });
}

function showIncoming(cid, data){
  const caller = usersCache[data.caller]||{displayName:\"unknown\",photoURL:defaultAvatar(\"?\")};
  $(\"#incoming-call\").hidden = false;
  $(\"#inc-avatar\").src = caller.photoURL;
  $(\"#inc-name\").textContent = caller.displayName;
  $(\"#inc-type\").textContent = `incoming ${data.type} call`;
  $(\"#accept-call\").onclick = ()=>acceptCall(cid, data);
  $(\"#decline-call\").onclick = async ()=>{
    await updateDoc(doc(db,\"calls\",cid), { status:\"declined\" });
    $(\"#incoming-call\").hidden = true;
  };
}

async function acceptCall(cid, data){
  $(\"#incoming-call\").hidden = true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:true, video: data.type===\"video\" });
  } catch(e){ toast(\"permission needed\", true); return; }
  callRole = \"callee\"; currentCallId = cid;
  $(\"#call-screen\").hidden = false;
  $(\"#local-video\").srcObject = localStream;
  $(\"#call-name\").textContent = usersCache[data.caller]?.displayName||\"caller\";
  $(\"#call-status\").textContent = \"connected\";

  pc = new RTCPeerConnection(iceServers);
  localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
  remoteStream = new MediaStream(); $(\"#remote-video\").srcObject = remoteStream;
  pc.ontrack = (e)=>e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t));

  const callRef = doc(db,\"calls\",cid);
  const offerCands = collection(callRef,\"offerCandidates\");
  const answerCands = collection(callRef,\"answerCandidates\");
  pc.onicecandidate = (e)=>e.candidate && addDoc(answerCands, e.candidate.toJSON());

  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
  const ans = await pc.createAnswer();
  await pc.setLocalDescription(ans);
  await updateDoc(callRef, { answer:{type:ans.type, sdp:ans.sdp}, status:\"active\" });

  onSnapshot(offerCands,(s)=>s.docChanges().forEach(c=>{ if(c.type===\"added\") pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); }));
  onSnapshot(callRef,(s)=>{ if (s.data()?.status===\"ended\") endCall(); });
}

$(\"#end-call\").addEventListener(\"click\", endCall);
$(\"#toggle-mic\").addEventListener(\"click\", (e)=>{
  if (!localStream) return;
  const a = localStream.getAudioTracks()[0]; if(!a) return;
  a.enabled = !a.enabled; e.currentTarget.classList.toggle(\"muted\", !a.enabled);
  e.currentTarget.innerHTML = a.enabled ? '<i class=\"fa-solid fa-microphone\"></i>' : '<i class=\"fa-solid fa-microphone-slash\"></i>';
});
$(\"#toggle-cam\").addEventListener(\"click\",(e)=>{
  if (!localStream) return;
  const v = localStream.getVideoTracks()[0]; if(!v) return;
  v.enabled = !v.enabled; e.currentTarget.classList.toggle(\"muted\", !v.enabled);
  e.currentTarget.innerHTML = v.enabled ? '<i class=\"fa-solid fa-video\"></i>' : '<i class=\"fa-solid fa-video-slash\"></i>';
});
$(\"#toggle-speaker\").addEventListener(\"click\",(e)=>{
  const rv = $(\"#remote-video\"); rv.muted = !rv.muted;
  e.currentTarget.classList.toggle(\"muted\", rv.muted);
  e.currentTarget.innerHTML = rv.muted ? '<i class=\"fa-solid fa-volume-xmark\"></i>' : '<i class=\"fa-solid fa-volume-high\"></i>';
});

async function endCall(){
  try {
    if (pc) pc.close(); pc = null;
    if (localStream) localStream.getTracks().forEach(t=>t.stop()); localStream = null;
    if (currentCallId) await updateDoc(doc(db,\"calls\",currentCallId), { status:\"ended\" });
  } catch(e){}
  currentCallId = null;
  $(\"#call-screen\").hidden = true;
  $(\"#local-video\").srcObject = null; $(\"#remote-video\").srcObject = null;
}

/* ========== NOTIFICATION BADGES (unread) ========== */
// quick heuristic — count chats with lastTime > our seen
onAuthStateChanged(auth, (u)=>{ if(!u) return;
  onSnapshot(query(collection(db,\"chats\"), where(\"participants\",\"array-contains\", u.uid)), (snap)=>{
    // simple placeholder; full unread tracker would require per-user lastSeen
    let n = 0;
    snap.forEach(d=>{ if ((d.data().lastMsg||\"\") && (d.data().lastTime)) n++; });
    const b = $(\"#unread-badge\"); if (n){ b.textContent = Math.min(n,9); b.hidden=false; } else b.hidden=true;
  });
});

/* click outside to close emoji panel */
document.addEventListener(\"click\",(e)=>{ if(!e.target.closest(\"#emoji-btn,#emoji-panel\")) $(\"#emoji-panel\").hidden=true; });
"
Observation: Create successful: /app/frontend/public/script.js
});

/* click outside to close emoji panel */
document.addEventListener(\"click\",(e)=>{ if(!e.target.closest(\"#emoji-btn,#emoji-panel\")) $(\"#emoji-panel\").hidden=true; });
"
Observation: Create successful: /app/frontend/public/script.js
