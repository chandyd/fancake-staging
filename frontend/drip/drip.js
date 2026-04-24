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
let viewMode = 'card'; // 'card' | 'echo'

// ---- Echo Bubble state ----
let echoCanvas = null;
let echoCtx = null;
let echoAnimId = null;
let echoBubbles = [];

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
  document.getElementById('dropForm').classList.add('open');
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

    const res = await _sb.from('drops').insert([data]).select('*, users!inner(id,username,email)').single();
    if (res.error) throw res.error;

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

// ========== ECHO BUBBLE VIEW ==========

function renderEchoView() {
  const c = document.getElementById('stream');
  c.innerHTML = '';
  if (echoCanvas) { echoCanvas.remove(); echoCanvas = null; }

  echoCanvas = document.createElement('canvas');
  const h = Math.max(window.innerHeight - 340, 420);
  echoCanvas.style.cssText = `width:100%;height:${h}px;border-radius:12px;background:#08080d;display:block;cursor:pointer;`;
  c.appendChild(echoCanvas);

  echoCtx = echoCanvas.getContext('2d');
  resizeEchoCanvas();

  const dpr = window.devicePixelRatio || 1;
  const W = echoCanvas.width / dpr;
  const H = echoCanvas.height / dpr;

  // Build bubbles from drops data
  echoBubbles = drops.map(d => {
    const info = TYPES[d.drop_type] || TYPES.moment;
    const engagement = (d.like_count||0) + (d.comment_count||0) + 0.5;
    const ageMs = Date.now() - new Date(d.dropped_at || d.created_at).getTime();
    const ageHrs = ageMs / 3600000;
    const maxR = Math.min(W * 0.12, 45);
    const minR = Math.min(W * 0.035, 16);
    const size = Math.max(minR, Math.min(maxR, minR + (maxR - minR) * (engagement / (engagement + 5))));
    const opacity = Math.max(0.2, Math.min(1, 1 - (ageHrs / 72)));
    return {
      id: d.id,
      x: W/2 + (Math.random()-0.5)*W*0.3,
      y: H + 50,
      baseX: 0,
      targetY: 0,
      r: size,
      baseR: size,
      color: d.color || info.color,
      icon: d.icon || info.icon,
      opacity,
      speed: 0.12 + Math.random() * 0.15,
      name: 'drop-user',
      engagement,
      ageHrs,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.8 + Math.random() * 0.6,
      title: d.title || ''
    };
  });

  // Sort: most engaged first (top)
  echoBubbles.sort((a, b) => b.engagement - a.engagement);

  // Assign Y positions
  let currY = 50;
  echoBubbles.forEach((b, i) => {
    b.targetY = currY;
    currY += b.r * 2.8 + 6;
    b.baseX = W/2 + Math.sin(i * 1.3) * Math.min(W*0.15, 40 + b.r * 0.3);
  });

  // Cluster by shared tags
  clusterEchoBubbles();

  // Scale down if too many bubbles
  const lastY = echoBubbles.length ? echoBubbles[echoBubbles.length-1].targetY : 0;
  if (lastY > H - 80) {
    const scale = (H - 80) / (lastY + 50);
    echoBubbles.forEach(b => { b.targetY *= scale; b.r = Math.max(10, b.r * scale); });
  }

  // Click handler: open drop detail
  echoCanvas.onclick = e => {
    const r = echoCanvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    for (let i = echoBubbles.length-1; i >= 0; i--) {
      const b = echoBubbles[i];
      const dx = mx - b.x, dy = my - b.y;
      if (dx*dx + dy*dy <= (b.r + 8)*(b.r + 8)) { Drip.detail(b.id); return; }
    }
  };

  window.addEventListener('resize', onEchoResize);

  if (echoAnimId) cancelAnimationFrame(echoAnimId);
  loopEcho();
}

function resizeEchoCanvas() {
  if (!echoCanvas || !echoCtx) return;
  const rect = echoCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  echoCanvas.width = rect.width * dpr;
  echoCanvas.height = rect.height * dpr;
  echoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clusterEchoBubbles() {
  for (let i = 0; i < echoBubbles.length; i++) {
    for (let j = i+1; j < Math.min(i+5, echoBubbles.length); j++) {
      const di = drops.find(d => d.id === echoBubbles[i].id);
      const dj = drops.find(d => d.id === echoBubbles[j].id);
      if (!di || !dj) continue;
      const common = (di.tags||[]).filter(t => (dj.tags||[]).includes(t)).length;
      if (common > 0) {
        const mid = (echoBubbles[i].baseX + echoBubbles[j].baseX) / 2;
        echoBubbles[i].baseX = mid - 12 - i%5;
        echoBubbles[j].baseX = mid + 12 + j%5;
      }
    }
  }
}

// ---- Echo animation loop ----
function loopEcho() {
  if (viewMode !== 'echo' || !echoCtx || !echoCanvas) return;

  const dpr = window.devicePixelRatio || 1;
  const W = echoCanvas.width / dpr;
  const H = echoCanvas.height / dpr;

  echoCtx.clearRect(0, 0, W, H);

  // Vignette glow at top
  const grd = echoCtx.createRadialGradient(W/2, 30, 0, W/2, 30, W*0.5);
  grd.addColorStop(0, 'rgba(108,92,231,0.04)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  echoCtx.fillStyle = grd;
  echoCtx.fillRect(0, 0, W, H);

  // Faint connecting lines between tagged-clustered bubbles
  echoCtx.strokeStyle = 'rgba(108,92,231,0.05)';
  echoCtx.lineWidth = 1;
  for (let i = 0; i < echoBubbles.length; i++) {
    for (let j = i+1; j < Math.min(i+4, echoBubbles.length); j++) {
      const dx = echoBubbles[i].x - echoBubbles[j].x;
      const dy = echoBubbles[i].y - echoBubbles[j].y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < W*0.35) {
        echoCtx.globalAlpha = (1 - dist/(W*0.35)) * 0.2;
        echoCtx.beginPath();
        echoCtx.moveTo(echoBubbles[i].x, echoBubbles[i].y);
        echoCtx.lineTo(echoBubbles[j].x, echoBubbles[j].y);
        echoCtx.stroke();
      }
    }
  }
  echoCtx.globalAlpha = 1;

  const now = Date.now();

  for (const b of echoBubbles) {
    // Float up toward target Y
    if (b.y > b.targetY + 2) {
      b.y -= b.speed * (1 + (b.y - b.targetY) / 80);
    } else {
      b.y += (b.targetY - b.y) * 0.015;
    }

    // Gentle horizontal sway
    b.x = b.baseX + Math.sin(now/3000 + b.pulsePhase) * Math.max(2, b.r*0.08);
    b.x = Math.max(b.r + 5, Math.min(W - b.r - 5, b.x));

    // Pulse size based on engagement
    const pulse = 1 + 0.08 * Math.sin(now/(1500 + b.pulseSpeed*500) + b.pulsePhase) * Math.min(1, b.engagement/5);
    const drawR = b.r * pulse;

    // Outer glow for recent drops
    const glowR = b.ageHrs < 1 ? 18 : b.ageHrs < 6 ? 10 : 3;
    if (glowR > 3) {
      const g = echoCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, drawR + glowR);
      g.addColorStop(0, b.color + '25');
      g.addColorStop(1, 'transparent');
      echoCtx.save();
      echoCtx.fillStyle = g;
      echoCtx.beginPath();
      echoCtx.arc(b.x, b.y, drawR + glowR, 0, Math.PI*2);
      echoCtx.fill();
      echoCtx.restore();
    }

    echoCtx.save();
    echoCtx.globalAlpha = b.opacity;

    // Bubble fill
    echoCtx.beginPath();
    echoCtx.arc(b.x, b.y, drawR, 0, Math.PI*2);
    echoCtx.fillStyle = b.color + '20';
    echoCtx.fill();
    echoCtx.strokeStyle = b.color + '50';
    echoCtx.lineWidth = 1.5;
    echoCtx.stroke();

    // Inner highlight
    const hl = echoCtx.createRadialGradient(b.x - drawR*0.3, b.y - drawR*0.3, 0, b.x, b.y, drawR);
    hl.addColorStop(0, b.color + '30');
    hl.addColorStop(0.5, b.color + '10');
    hl.addColorStop(1, 'transparent');
    echoCtx.fillStyle = hl;
    echoCtx.beginPath();
    echoCtx.arc(b.x, b.y, drawR, 0, Math.PI*2);
    echoCtx.fill();

    // Type icon in center
    if (drawR > 14) {
      echoCtx.font = `${Math.min(drawR*1.1, 24)}px system-ui, sans-serif`;
      echoCtx.textAlign = 'center';
      echoCtx.textBaseline = 'middle';
      echoCtx.fillText(b.icon, b.x, b.y - 1);
    }

    // Username below bubble
    if (drawR > 18 && b.name) {
      echoCtx.globalAlpha = Math.min(0.5, b.opacity * 0.6);
      echoCtx.fillStyle = '#aaa';
      echoCtx.font = '10px system-ui, sans-serif';
      echoCtx.textAlign = 'center';
      echoCtx.textBaseline = 'top';
      echoCtx.fillText(b.name, b.x, b.y + drawR + 3);
    }

    echoCtx.restore();
  }

  // Empty state text
  if (!echoBubbles.length) {
    echoCtx.fillStyle = '#55557755';
    echoCtx.font = '16px system-ui, sans-serif';
    echoCtx.textAlign = 'center';
    echoCtx.textBaseline = 'middle';
    echoCtx.fillText('✦ No drops yet. Drop something. ✦', W/2, H/2);
  }

  echoAnimId = requestAnimationFrame(loopEcho);
}

function onEchoResize() {
  if (viewMode !== 'echo' || !echoCanvas) return;
  resizeEchoCanvas();
}

// ---- Load stream ----
async function loadStream() {
  const c = document.getElementById('stream');
  c.innerHTML = '<div class="loading-pulse"><div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div></div>';

  try {
    // Timeout di sicurezza: se dopo 15s la query non torna, mostra errore
    const ac = new AbortController();
    const timeout = setTimeout(() => { ac.abort(); }, 15000);

    // Prova prima la query semplice senza join
    let q = _sb.from('drops')
      .select('*')
      .eq('status','active')
      .order('dropped_at', {ascending:false})
      .limit(50);

    if (filter !== 'all') q = q.eq('drop_type', filter);

    const r = await q;
    clearTimeout(timeout);
    if (r.error) throw r.error;

    drops = r.data || [];
    const countEl = document.getElementById('dropCount');
    if (countEl) countEl.textContent = drops.length;

    if (viewMode === 'echo') renderEchoView();
    else renderStream(c);
  } catch(e) {
    console.error('[Drip] loadStream error:', e);
    const msg = e?.message || e?.error_description || e?.toString?.() || 'Unknown error';
    c.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p style="color:#ff6b6b;font-size:0.85rem;">'+msg.replace(/</g,'&lt;')+'</p>'+
      '<p style="color:var(--text-muted);font-size:0.8rem;margin-top:8px;">Check console (F12) for details</p></div>';
  }
}

// ---- Render card view ----
function renderStream(c) {
  if (!drops.length) {
    c.innerHTML = '<div class="empty-state"><span class="empty-icon">🌊</span><h6 style="color:var(--text-primary);">Silent waters</h6><p>Nothing has been dropped yet. Be the first.</p></div>';
    return;
  }
  c.innerHTML = drops.map(d => {
    const info = TYPES[d.drop_type] || TYPES.moment;
    const uname = 'drop-user';
    const init = (uname.charAt(0)||'?').toUpperCase();
    let media = '';
    if (d.media_url && d.drop_type==='snapshot')
      media = '<div class="dc-media"><img src="'+d.media_url+'" loading="lazy"></div>';
    else if (d.media_url && d.drop_type==='capsule')
      media = '<div class="dc-media"><video src="'+d.media_url+'" controls preload="metadata"></video></div>';
    else if (d.media_url)
      media = '<div class="dc-media" style="padding:10px;text-align:center;background:#181820;">📦 '+(d.media_url.split('/').pop())+'</div>';
    let link = '';
    if (d.link_url) {
      const lp = d.link_preview || {};
      link = '<div class="dc-link" onclick="event.stopPropagation();window.open(\''+d.link_url+'\',\'_blank\')">';
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
        content+media+link+tagsHtml+
        '<div class="dc-actions">'+
          '<button class="dc-act" onclick="event.stopPropagation();Drip.like(\''+d.id+'\')">❤ <span id="lc-'+d.id+'">'+(d.like_count||0)+'</span></button>'+
          '<button class="dc-act" onclick="event.stopPropagation()"><i class="bi bi-chat"></i> '+(d.comment_count||0)+'</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

// ---- Like ----
async function likeDrop(id) {
  if (!currentUser) { showAuth(); return; }
  await _sb.rpc('increment_like', {row_id: id});
  const el = document.getElementById('lc-'+id);
  if (el) el.textContent = parseInt(el.textContent||'0')+1;
}

// ---- Detail modal ----
async function showDetail(id) {
  const m = document.getElementById('detailModal');
  const b = document.getElementById('detailBody');
  m.classList.add('open');
  b.innerHTML = '<div class="loading-pulse"><div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div></div>';
  try {
    const r = await _sb.from('drops').select('*, users!inner(id,username,email)').eq('id',id).single();
    if (r.error) throw r.error;
    const d = r.data, uname = 'drop-user';
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
        '<span>❤ '+(d.like_count||0)+'</span><span>💬 '+(d.comment_count||0)+'</span>'+
      '</div>';
  } catch(e) {
    b.innerHTML = '<p style="color:var(--text-secondary);">Could not load drop.</p>';
  }
}
function closeDetail() { document.getElementById('detailModal').classList.remove('open'); }

// ========== VIEW MODE TOGGLE ==========
function setView(mode) {
  viewMode = mode;
  document.querySelectorAll('.vw-btn').forEach(b => b.classList.toggle('on', b.dataset.v === mode));

  const filtersEl = document.getElementById('filters');
  if (filtersEl) filtersEl.style.display = mode === 'card' ? 'flex' : 'none';

  if (mode !== 'echo') {
    if (echoAnimId) { cancelAnimationFrame(echoAnimId); echoAnimId = null; }
    echoBubbles = [];
    if (echoCanvas) { echoCanvas.remove(); echoCanvas = null; }
    renderStream(document.getElementById('stream'));
    return;
  }

  loadStream();
}

// ========== AUTH ==========
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
  document.getElementById('authBtn2').textContent = authMode==='login'?'Sign in':'Sign up';
  document.getElementById('authToggle').textContent = authMode==='login'?"No account? Create one":"Already have an account? Sign in";
  document.getElementById('authName').style.display = authMode==='login'?'none':'block';
  document.getElementById('authErr').textContent = '';
}

async function authSubmit() {
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value.trim();
  const err = document.getElementById('authErr');
  err.textContent = '';
  if (!email||!pass) { err.textContent='Email and password required'; return; }
  try {
    let r;
    if (authMode==='login') r = await _sb.auth.signInWithPassword({email,pass});
    else {
      const name = document.getElementById('authName').value.trim();
      r = await _sb.auth.signUp({email,pass,options:{data:{username:name||email.split('@')[0]}}});
    }
    if (r.error) throw r.error;
    if (authMode==='signup') { err.textContent='Check your email to confirm!'; return; }
    document.getElementById('authModal').classList.remove('open');
  } catch(e) { err.textContent=e.message; }
}

function renderAuthUI() {
  const el = document.getElementById('authUI');
  if (!el) return;
  if (currentUser) {
    const u = currentUser.user_metadata||{};
    el.innerHTML = '<span class="user-badge">'+(u.username||u.email||currentUser.email||'User')+'</span> <button class="btn-outline" onclick="_sb.auth.signOut()">Sign out</button>';
  } else {
    el.innerHTML = '<button class="btn-outline" onclick="Drip.showAuth()">Sign in</button>';
  }
}

// ==== Expose public API ====
window.Drip = {
  setView,
  detail: showDetail,
  closeDetail,
  like: likeDrop,
  showAuth,
  toggleTag,
  toggleAuth,
  authSubmit,
  publish,
  cancelDrop,
  loadStream,
  setFilter: f => { filter=f; loadStream(); }
};

// ==== Init ====
document.addEventListener('DOMContentLoaded', () => {
  // Filter click handlers
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      filter = b.dataset.f || 'all';
      loadStream();
    });
  });
  // View toggle click handlers
  document.querySelectorAll('.vw-btn').forEach(b => {
    b.addEventListener('click', () => setView(b.dataset.v));
  });
  loadStream();
});

})();