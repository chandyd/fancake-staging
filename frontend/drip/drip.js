(function(){
'use strict';

const SUPABASE_URL = 'https://lftlvycvgauzrryyqxpu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdGx2eWN2Z2F1enJyeXlxeHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTY2MTksImV4cCI6MjA5MjMzMjYxOX0.rO4T1MAmrVr78gl6Bnh5sNqqh7aiGupZNRuIGZBmU2s';

const _sb = supabaseClient.createClient(SUPABASE_URL, SUPABASE_KEY);

const TYPES = {
  snapshot: { icon:'🖼', color:'#f59e0b', label:'Snapshot', desc:'Image' },
  capsule:  { icon:'🎬', color:'#ef4444', label:'Capsule', desc:'Video' },
  page:     { icon:'📖', color:'#3b82f6', label:'Page', desc:'Long text' },
  portal:   { icon:'🔗', color:'#10b981', label:'Portal', desc:'Link' },
  echo:     { icon:'🎧', color:'#8b5cf6', label:'Echo', desc:'Audio' },
  box:      { icon:'📦', color:'#6b7280', label:'Box', desc:'File' },
  moment:   { icon:'💬', color:'#ec4899', label:'Moment', desc:'Text' }
};

const TOPICS = {
  tech:['tech','code','dev','software','app','ai','digital','web','coding','programming','startup','data'],
  art:['art','drawing','painting','sketch','illustration','design','creative','artwork','digital art'],
  music:['music','song','audio','sound','beat','track','melody','podcast','playlist','album'],
  photo:['photo','photography','camera','shot','landscape','portrait','sunset','nature','travel'],
  gaming:['game','gaming','gamer','play','esports','rpg','fps','steam','multiplayer'],
  writing:['story','writing','poem','poetry','fiction','novel','chapter','narrative','tale','read'],
  food:['food','recipe','cooking','meal','dinner','breakfast','homemade','cuisine'],
  fitness:['workout','fitness','gym','exercise','training','sport','health','yoga'],
  edu:['learn','tutorial','guide','course','lesson','study','knowledge','how to'],
  news:['news','breaking','update','report','trending','latest','headline']
};

// ---- State ----
let currentUser = null;
let filter = 'all';
let drops = [];
let selFile = null;
let selFileData = null;
let selLink = null;
let tags = [];
let aiHints = [];
let authMode = 'login';
let dropType = 'moment';

// ---- Supabase init ----
_sb.auth.onAuthStateChange((ev, session) => {
  currentUser = session?.user || null;
  renderAuthUI();
});

_sb.auth.getSession().then(r => {
  if (r.data?.session) { currentUser = r.data.session.user; renderAuthUI(); }
});

// ---- Detect type ----
function detect(mime, text, link) {
  if (link && /^https?:\/\//.test(link)) return {type:'portal', icon:'🔗', color:'#10b981'};
  if (mime) {
    if (/^image\//.test(mime)) return {type:'snapshot', icon:'🖼', color:'#f59e0b'};
    if (/^video\//.test(mime)) return {type:'capsule', icon:'🎬', color:'#ef4444'};
    if (/^audio\//.test(mime)) return {type:'echo', icon:'🎧', color:'#8b5cf6'};
    return {type:'box', icon:'📦', color:'#6b7280'};
  }
  if (text && text.length > 500) return {type:'page', icon:'📖', color:'#3b82f6'};
  if (text && text.length > 0) return {type:'moment', icon:'💬', color:'#ec4899'};
  return {type:'moment', icon:'💬', color:'#ec4899'};
}

// ---- Suggest tags ----
function suggestTags(title, desc, type) {
  const words = ((title||'')+' '+(desc||'')).toLowerCase();
  let sug = [];
  for (const [topic, kws] of Object.entries(TOPICS)) {
    if (kws.some(k => words.includes(k))) { sug.push(topic); }
  }
  if (type && TYPES[type]) sug.push(TYPES[type].label.toLowerCase());
  return [...new Set(sug)].slice(0,5);
}

// ---- Time ago ----
function timeAgo(d) {
  const diff = Math.floor((Date.now()-new Date(d).getTime())/1000);
  if (diff<60) return 'now';
  if (diff<3600) return Math.floor(diff/60)+'m';
  if (diff<86400) return Math.floor(diff/3600)+'h';
  if (diff<604800) return Math.floor(diff/86400)+'d';
  return new Date(d).toLocaleDateString();
}

// ---- Drop zone handlers ----
const dropZone = document.getElementById('dropZone');
const dropFile = document.getElementById('dropFile');

dropZone.addEventListener('click', () => dropFile.click());

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files?.length) { handleFiles(e.dataTransfer.files[0]); return; }
  const txt = e.dataTransfer.getData('text/plain');
  if (txt) {
    if (/^https?:\/\//.test(txt)) { selLink=txt; selFile=null; selFileData=null; openForm(detect(null,null,txt)); }
    else { selLink=null; selFile=null; selFileData=null; document.getElementById('dropDesc').value=txt; openForm(detect(null,txt,null)); }
  }
});

document.addEventListener('paste', e => {
  const txt = (e.clipboardData||window.clipboardData).getData('text');
  if (txt && /^https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp|mp4|webm|mp3|pdf)/i.test(txt)) {
    selLink = txt; selFile=null; selFileData=null; openForm(detect(null,null,txt)); e.preventDefault();
  }
});

dropFile.addEventListener('change', () => { if (dropFile.files?.length) handleFiles(dropFile.files[0]); });

function handleFiles(file) {
  selFile = file; selLink = null; selFileData = null;
  if (file.type.startsWith('image/')) {
    const r = new FileReader();
    r.onload = e => { selFileData = e.target.result; openForm(detect(file.type,null,null)); };
    r.readAsDataURL(file);
  } else { openForm(detect(file.type,null,null)); }
}

// ---- Open/close form ----
function openForm(d) {
  dropType = d.type;
  dropZone.style.display = 'none';
  const f = document.getElementById('dropForm');
  f.classList.add('open');

  const info = TYPES[d.type] || TYPES.moment;
  document.getElementById('typeBadge').textContent = info.icon+' '+info.label;

  const prev = document.getElementById('dropPreview');
  if (selFile && selFile.type.startsWith('image/') && selFileData) {
    prev.classList.add('open');
    prev.innerHTML = '<img src="'+selFileData+'"><span>'+selFile.name+' ('+Math.round(selFile.size/1024)+'KB)</span>';
  } else if (selFile) {
    prev.classList.add('open');
    prev.innerHTML = '📦 <span>'+selFile.name+' ('+Math.round(selFile.size/1024)+'KB)</span>';
  } else { prev.classList.remove('open'); prev.innerHTML = ''; }

  updateAITags();
}

function cancelDrop() {
  tags=[]; aiHints=[]; selFile=null; selFileData=null; selLink=null;
  document.getElementById('dropTitle').value='';
  document.getElementById('dropDesc').value='';
  document.getElementById('dropForm').classList.remove('open');
  document.getElementById('dropPreview').classList.remove('open');
  dropZone.style.display='block';
  renderTagArena();
  document.getElementById('aiTags').innerHTML='';
}

// ---- Tag system ----
const tagInput = document.getElementById('tagInput');
tagInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput.value.trim()); }
});

function addTag(v) {
  v = v.toLowerCase().replace(/[^a-z0-9-_]/g,'');
  if (!v || tags.includes(v)) return;
  tags.push(v); tagInput.value=''; renderTagArena(); updateAITags();
}

function toggleTag(v) {
  const i = tags.indexOf(v);
  if (i>-1) tags.splice(i,1); else tags.push(v);
  renderTagArena(); updateAITags();
}

function renderTagArena() {
  const a = document.getElementById('tagArena');
  const inp = a.querySelector('input');
  a.innerHTML = tags.map(t => `<span class="tag-pill on">#${t} <span class="x" onclick="Drip.toggleTag('${t}')">×</span></span>`).join('');
  a.appendChild(inp);
}

function updateAITags() {
  aiHints = suggestTags(
    document.getElementById('dropTitle').value,
    document.getElementById('dropDesc').value,
    dropType
  );
  const c = document.getElementById('aiTags');
  if (!aiHints.length) { c.innerHTML = ''; return; }
  c.innerHTML = '<span style="font-size:0.75rem;color:var(--text-secondary);margin-right:2px;">✨</span>' +
    aiHints.map(t => `<span class="tag-pill suggest ${tags.includes(t)?'on':''}" onclick="Drip.toggleTag('${t}')">#${t}</span>`).join('');
}

// ---- Publish ----
async function publish() {
  if (!currentUser) { showAuth(); document.getElementById('authErr').textContent='Sign in to drop!'; return; }

  const btn = document.getElementById('dropBtn');
  btn.disabled = true;
  btn.textContent = 'Dropping...';

  try {
    const title = document.getElementById('dropTitle').value.trim();
    const desc = document.getElementById('dropDesc').value.trim();
    const detected = detect(selFile?.type||null, desc, selLink);

    const data = {
      user_id: currentUser.id,
      drop_type: detected.type,
      title: title||null,
      description: desc||null,
      content: desc||null,
      tags: tags.length ? tags : null,
      icon: detected.icon,
      color: detected.color,
      status: 'active',
      dropped_at: new Date().toISOString()
    };

    if (selLink) {
      data.link_url = selLink;
      try {
        const r = await fetch('/api/link-preview?url='+encodeURIComponent(selLink));
        if (r.ok) data.link_preview = await r.json();
      } catch(_) {}
    }

    if (selFile) {
      const ext = selFile.name.split('.').pop();
      const path = 'drops/'+currentUser.id+'/'+Date.now()+'.'+ext;
      const up = await _sb.storage.from('media').upload(path, selFile);
      if (up.error) throw up.error;
      data.media_url = _sb.storage.from('media').getPublicUrl(path).data.publicUrl;
      data.media_mime = selFile.type;
      data.media_size = selFile.size;
      if (selFile.type.startsWith('image/')) data.media_thumb = data.media_url;
    }

    const res = await _sb.from('drops').insert([data]).select('*, users!inner(id,username,email,avatar_url)').single();
    if (res.error) throw res.error;

    // Save AI tag suggestions
    if (aiHints.length) {
      _sb.from('drop_tag_suggestions').insert([{
        drop_id: res.data.id,
        suggested_tags: aiHints,
        user_accepted: tags,
        model_used: 'keyword'
      }]).then();
    }

    cancelDrop();
    await loadStream();

    btn.textContent = '✧ Dropped!';
    setTimeout(() => { btn.textContent = '✧ Drop into the stream'; btn.disabled = false; }, 800);
  } catch(e) {
    console.error('[Drip]', e);
    btn.textContent = 'Error — try again';
    btn.disabled = false;
  }
}

// ---- Load stream ----
async function loadStream() {
  const c = document.getElementById('stream');
  c.innerHTML = '<div class="loading-pulse"><div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div></div>';

  try {
    let q = _sb.from('drops')
      .select('*, users!inner(id,username,email,avatar_url)')
      .eq('status','active')
      .order('dropped_at', {ascending:false})
      .limit(50);

    if (filter !== 'all') q = q.eq('drop_type', filter);

    const r = await q;
    if (r.error) throw r.error;

    drops = r.data || [];
    document.getElementById('dropCount').textContent = drops.length;
    renderStream(c);
  } catch(e) {
    console.error('[Drip]', e);
    c.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>'+e.message+'</p></div>';
  }
}

function renderStream(c) {
  if (!drops.length) {
    c.innerHTML = '<div class="empty-state"><span class="empty-icon">🌊</span><h6 style="color:var(--text-primary);">Silent waters</h6><p>Nothing has been dropped yet. Be the first.</p></div>';
    return;
  }
  c.innerHTML = drops.map(d => {
    const info = TYPES[d.drop_type] || TYPES.moment;
    const u = d.users || {};
    const uname = u.username || u.email || 'anon';
    const init = (uname.charAt(0)||'?').toUpperCase();

    let media = '';
    if (d.media_url && d.drop_type==='snapshot')
      media = '<div class="dc-media"><img src="'+d.media_url+'" loading="lazy"></div>';
    else if (d.media_url && d.drop_type==='capsule')
      media = '<div class="dc-media"><video src="'+d.media_url+'" controls preload="metadata" poster="'+(d.media_thumb||'')+'"></video></div>';
    else if (d.media_url)
      media = '<div class="dc-media" style="padding:10px;text-align:center;background:#181820;">📦 '+(d.media_url.split('/').pop())+'</div>';

    let link = '';
    if (d.link_url) {
      const lp = d.link_preview || {};
      link = '<div class="dc-link" onclick="window.open(\''+d.link_url+'\',\'_blank\')">';
      if (lp.image) link += '<img src="'+lp.image+'" onerror="this.style.display=\'none\'">';
      link += '<div class="dc-link-title">'+(lp.title||d.link_url)+'</div>';
      if (lp.description) link += '<div class="dc-link-desc">'+lp.description+'</div>';
      try { link += '<div class="dc-link-host">🔗 '+new URL(d.link_url).hostname+'</div>'; } catch(_){}
      link += '</div>';
    }

    let content = '';
    if (d.content)
      content = '<div class="dc-desc">'+d.content.substring(0, d.drop_type==='moment'?500:250)+(d.content.length>(d.drop_type==='moment'?500:250)?'…':'')+'</div>';

    let tagsHtml = '';
    if (d.tags?.length)
      tagsHtml = '<div class="dc-tags">'+d.tags.map(t=>'<span class="dc-tag">#'+t+'</span>').join('')+'</div>';

    return '<div class="drop-card" onclick="Drip.detail(\''+d.id+'\')">'+
      '<div class="drop-card-pad">'+
        '<div class="dc-head">'+
          '<div class="dc-avatar">'+init+'</div>'+
          '<div class="dc-user"><span class="dc-name">'+uname+'</span><span class="dc-time">'+timeAgo(d.dropped_at)+'</span></div>'+
          '<span class="dc-type" style="color:'+d.color+';">'+d.icon+' '+info.label+'</span>'+
        '</div>'+
        (d.title?'<div class="dc-title">'+d.title+'</div>':'')+
        content+
        media+
        link+
        tagsHtml+
        '<div class="dc-actions">'+
          '<button class="dc-act" onclick="event.stopPropagation();Drip.like(\''+d.id+'\')">❤ <span id="lc-'+d.id+'">'+(d.like_count||0)+'</span></button>'+
          '<button class="dc-act" onclick="event.stopPropagation()"><i class="bi bi-chat"></i> '+(d.comment_count||0)+'</button>'+
          '<button class="dc-act" onclick="event.stopPropagation();Drip.bookmark(\''+d.id+'\')"><i class="bi bi-bookmark"></i></button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

// ---- Actions ----
window.Drip = {
  reload: () => loadStream(),
  cancelDrop,
  addTag,
  toggleTag,
  publish,
  filter(f, btn) {
    filter = f;
    document.querySelectorAll('.f-chip').forEach(c => c.classList.remove('on'));
    btn.classList.add('on');
    loadStream();
  },
  async like(id) {
    if (!currentUser) { showAuth(); return; }
    await _sb.rpc('increment_like', {row_id: id});
    const el = document.getElementById('lc-'+id);
    if (el) el.textContent = parseInt(el.textContent||'0')+1;
  },
  bookmark(id) {
    if (!currentUser) { showAuth(); return; }
    // For now just visual
  },
  // ---- Detail modal ----
  async detail(id) {
    const m = document.getElementById('detailModal');
    const b = document.getElementById('detailBody');
    m.classList.add('open');
    b.innerHTML = '<div class="loading-pulse"><div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div></div>';
    try {
      const r = await _sb.from('drops').select('*, users!inner(id,username,email,avatar_url)').eq('id',id).single();
      if (r.error) throw r.error;
      const d = r.data, u = d.users||{}, uname = u.username||u.email||'anon';
      const info = TYPES[d.drop_type]||TYPES.moment;
      b.innerHTML =
        '<div class="dc-head mb-2">'+
          '<div class="dc-avatar">'+(uname.charAt(0).toUpperCase())+'</div>'+
          '<div class="dc-user"><span class="dc-name">'+uname+'</span><span class="dc-time">'+timeAgo(d.dropped_at)+'</span></div>'+
          '<span class="dc-type" style="color:'+d.color+';">'+d.icon+' '+info.label+'</span>'+
        '</div>'+
        (d.title?'<h5 style="margin:8px 0;">'+d.title+'</h5>':'')+
        (d.content?'<p style="color:var(--text-secondary);line-height:1.7;">'+d.content+'</p>':'')+
        (d.media_url&&d.drop_type==='snapshot'?'<img src="'+d.media_url+'" style="width:100%;border-radius:10px;margin:6px 0;">':'')+
        (d.media_url&&d.drop_type==='capsule'?'<video src="'+d.media_url+'" controls style="width:100%;border-radius:10px;margin:6px 0;"></video>':'')+
        (d.tags?.length?'<div class="dc-tags" style="margin:8px 0;">'+d.tags.map(t=>'<span class="dc-tag">#'+t+'</span>').join('')+'</div>':'')+
        '<div style="display:flex;gap:20px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle);color:var(--text-secondary);font-size:0.9rem;">'+
          '<span>❤ '+(d.like_count||0)+'</span><span>💬 '+(d.comment_count||0)+'</span><span>👁 '+(d.view_count||0)+'</span>'+
        '</div>';
    } catch(e) {
      b.innerHTML = '<p style="color:var(--text-secondary);">Could not load drop.</p>';
    }
  },
  closeDetail: () => document.getElementById('detailModal').classList.remove('open'),

  // ---- Auth ----
  showAuth,
  closeAuth: () => document.getElementById('authModal').classList.remove('open'),
  toggleAuth,
  async submitAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    const name = document.getElementById('authName').value.trim();
    const err = document.getElementById('authErr');
    const btn = document.getElementById('authBtn2');
    if (!email||!pass) { err.textContent='Email and password required'; return; }
    if (authMode==='signup'&&!name) { err.textContent='Choose a username'; return; }
    btn.disabled = true;
    btn.textContent = authMode==='signup'?'Creating...':'Signing in...';
    try {
      let r;
      if (authMode==='signup') {
        r = await _sb.auth.signUp({email,password});
        if (r.error) throw r.error;
        if (r.data.user) {
          await _sb.from('users').upsert([{id:r.data.user.id,email,username:name,display_name:name,is_creator:true}],{onConflict:'id'});
        }
        err.textContent = 'Account created! Check your email.';
        err.style.color = '#10b981';
        setTimeout(()=>{ Drip.closeAuth(); },1500);
        btn.disabled = false; btn.textContent = 'Done';
        return;
      } else {
        r = await _sb.auth.signInWithPassword({email,password});
        if (r.error) throw r.error;
      }
      Drip.closeAuth();
    } catch(e) {
      err.textContent = e.message;
      err.style.color = '#ef4444';
      btn.disabled = false;
      btn.textContent = authMode==='signup'?'Create Account':'Sign in';
    }
  }
};

function showAuth() {
  authMode = 'login';
  document.getElementById('authTitle').textContent = 'Sign in';
  document.getElementById('authBtn2').textContent = 'Sign in';
  document.getElementById('authToggle').textContent = "No account? Create one";
  document.getElementById('authName').style.display = 'none';
  document.getElementById('authErr').textContent = '';
  document.getElementById('authModal').classList.add('open');
}

function toggleAuth() {
  authMode = authMode==='login'?'signup':'login';
  document.getElementById('authTitle').textContent = authMode==='login'?'Sign in':'Create account';
  document.getElementById('authBtn2').textContent = authMode==='login'?'Sign in':'Create account';
  document.getElementById('authToggle').textContent = authMode==='login'?"No account? Create one":"Have an account? Sign in";
  document.getElementById('authName').style.display = authMode==='signup'?'block':'none';
  document.getElementById('authErr').textContent = '';
}

function renderAuthUI() {
  const btn = document.getElementById('authBtn');
  const area = document.getElementById('navAuth');
  if (currentUser) {
    area.innerHTML = '<span style="font-size:0.8rem;color:var(--text-secondary);">'+currentUser.email+'</span>'+
      '<button class="nav-btn" onclick="Drip.logout()" title="Sign out"><i class="bi bi-box-arrow-right"></i></button>';
  } else {
    area.innerHTML = '<button class="nav-btn" onclick="Drip.showAuth()" title="Sign in"><i class="bi bi-person"></i></button>';
  }
}

window.Drip.logout = function() {
  _sb.auth.signOut();
  currentUser = null;
  renderAuthUI();
};

// ---- ESC key ----
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('detailModal').classList.remove('open');
    document.getElementById('authModal').classList.remove('open');
  }
});

// ---- Init ----
loadStream();
console.log('[Drip] Ready. Drop everything. 🚀');

})();
