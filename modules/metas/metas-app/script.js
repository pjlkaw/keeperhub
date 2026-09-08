/* ---------------- estado ---------------- */
function loadProfile(){
  const fallback = { name:'Fulano', bio:'Construindo uma vida melhor, uma meta por vez.', avatar:'F', photo:'' };
  try { return { ...fallback, ...JSON.parse(localStorage.getItem('metas-profile') || '{}') }; }
  catch { return fallback; }
}
const state = {
  screen: 'home',
  section: 'metas',
  history: [],
  livrosSub: 'explorar',
  booksTab: 'explorar',
  selectedGoal: null,
  selectedBook: null,
  openMenu: null,
  calMonth: 4, calYear: 2024, selectedDay: 15,
  notifUnread: 3,
  profile: loadProfile(),
  tasks: [
    { id:1, ic:'🛏️', t:'Arrumar a cama', s:'Casa', done:true, required:true },
    { id:2, ic:'🚶', t:'Caminhar 30 min', s:'Saúde • 07:00', done:true, required:true },
    { id:3, ic:'💧', t:'Beber 2L de água', s:'Saúde', done:true, required:true },
    { id:4, ic:'📖', t:'Ler por 20 min', s:'Desenvolvimento', done:true, required:true },
    { id:5, ic:'📵', t:'Ficar 1h sem celular', s:'Bem-estar', done:false, required:true },
  ],
  goals: [
    { id:1, name:'Novo carro', cat:'Meta financeira', pct:40, ic:'🚗', img:'linear-gradient(135deg,#2a2a34,#111116)',
      meta:45000, guardado:18000, status:'Juntando dinheiro', prioridade:'Alta', obs:'SUV confortável para viagens longas.' },
    { id:2, name:'Japão', cat:'Meta de experiência', pct:20, ic:'⛩️', img:'linear-gradient(135deg,#33261a,#1a120b)',
      meta:15000, guardado:3000, status:'Planejando', prioridade:'Média', obs:'Viagem de 2 semanas na primavera.' },
    { id:3, name:'Sofá novo', cat:'Meta pessoal', pct:73, ic:'🛋️', img:'linear-gradient(135deg,#2a2418,#14110a)',
      meta:4000, guardado:2920, status:'Quase lá', prioridade:'Baixa', obs:'Modelo retrátil, cor cinza.' },
  ],
  books: [
    { id:1, title:'Hábitos Atômicos', author:'James Clear', rating:4.8, cor:'#d8c9a3', cat:'Não-ficção • Desenvolvimento pessoal',
      desc:'Pequenas mudanças, resultados extraordinários. Um método comprovado para construir bons hábitos e se livrar dos maus.',
      listStatus:'lendo', inLibrary:true, favorite:true },
    { id:2, title:'Pai Rico, Pai Pobre', author:'Robert T. Kiyosaki', rating:4.6, cor:'#f2c230', cat:'Não-ficção • Finanças pessoais',
      desc:'O que os ricos ensinam aos filhos sobre dinheiro, e as classes média e pobre não.',
      listStatus:'explorar', inLibrary:false, favorite:false },
    { id:3, title:'Mindset', author:'Carol S. Dweck', rating:4.7, cor:'#c94f4f', cat:'Não-ficção • Psicologia',
      desc:'A nova psicologia do sucesso e como podemos aprender a cultivar o êxito ao longo da vida.',
      listStatus:'explorar', inLibrary:false, favorite:false },
    { id:4, title:'Essencialismo', author:'Greg McKeown', rating:4.5, cor:'#5b7db8', cat:'Não-ficção • Produtividade',
      desc:'A disciplinada busca por menos, e como fazer o que realmente importa.',
      listStatus:'quero', inLibrary:true, favorite:false },
  ],
  events: {
    15: [
      { t:'Reunião de trabalho', time:'10:00', color:'#f5a623' },
      { t:'Prazo: Novo carro', time:'15:00', color:'#3ecf8e' },
      { t:'Jantar com amigos', time:'20:00', color:'#4f9eff' },
    ]
  }
};

/* ---------------- navegação ---------------- */
function go(screen, extra){
  if(state.screen !== screen) state.history.push(state.screen);
  state.openMenu = null;
  Object.assign(state, extra||{});
  if(screen === 'goalForm'){
    const editingGoal = state.formMode === 'edit' ? goalById(state.selectedGoal) : null;
    state.pendingGoalImage = editingGoal?.img || '';
  }
  if(screen === 'editProfile') state.pendingProfilePhoto = '';
  state.screen = screen;
  render();
  window.scrollTo?.(0,0);
}
function goBack(){
  state.openMenu = null;
  const prev = state.history.pop() || 'home';
  state.screen = prev;
  render();
  window.scrollTo?.(0,0);
}
function selectSection(id){
  state.section = id;
  state.history = [];
  state.openMenu = null;
  if(id==='metas') state.screen = 'home';
  else state.screen = 'placeholder';
  render();
}

/* ---------------- helpers ---------------- */
const fmtBRL = n => 'R$ ' + Number(n||0).toLocaleString('pt-BR', {minimumFractionDigits:2});
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
function doneCount(){ return state.tasks.filter(t=>t.done).length; }
function goalById(id){ return state.goals.find(g=>g.id===id); }
function bookById(id){ return state.books.find(b=>b.id===id); }
function overallProgress(){
  const total = state.goals.reduce((a,g)=>a+g.pct,0);
  return state.goals.length ? Math.round(total/state.goals.length) : 0;
}
function toggleMenu(key){ state.openMenu = state.openMenu === key ? null : key; render(); }
function profileAvatarContent(profile){
  return profile.photo ? `<img class="avatar-photo" src="${profile.photo}" alt="Foto de ${esc(profile.name)}">` : esc(profile.avatar);
}
function resizeImage(file, callback){
  if(!file || !file.type.startsWith('image/')){ alert('Escolha um arquivo de imagem válido.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const max = 1000;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', .84));
    };
    image.onerror = () => alert('Não foi possível carregar essa imagem.');
    image.src = reader.result;
  };
  reader.onerror = () => alert('Não foi possível ler o arquivo.');
  reader.readAsDataURL(file);
}

/* ---------------- chrome ---------------- */
function sectionTabs(){
  const tabs = [
    ['metas','logo-metas.png','Metas'],
    ['financas','logo-financas.png','Finanças'],
    ['pets','logo-pets.png','Pets'],
    ['medicamentos','logo-medicamentos.png','Medicamentos'],
    ['dispensa','logo-despensa.png','Dispensa']
  ];
  return `<nav class="section-tabs" aria-label="Módulos">
    ${tabs.map(([id,logo,label]) =>
      `<button class="section-tab section-${id} ${state.section===id?'active':''}" onclick="selectSection('${id}')" aria-current="${state.section===id?'page':'false'}">
        <img class="section-tab-logo" src="${logo}" alt="" aria-hidden="true">
        <span>${label}</span>
      </button>`
    ).join('')}
  </nav>`;
}
function screenHead(title, backAction, kebabHtml){
  return `<div class="screen-head">
    <button class="back-btn" onclick="${backAction}">‹</button>
    <h2>${title}</h2>
    ${kebabHtml || ''}
  </div>`;
}
function livrosSubnav(){
  const items = [['explorar','🧭','Explorar'],['biblioteca','📚','Biblioteca'],['favoritas','❤','Favoritas']];
  return `<div class="subnav">${items.map(([id,ic,label])=>
    `<button class="subnav-item ${state.livrosSub===id?'active':''}" onclick="go('${id==='explorar'?'livrosExplorar':id==='biblioteca'?'livrosBiblioteca':'livrosFavoritas'}',{livrosSub:'${id}'})"><span class="ic">${ic}</span>${label}</button>`
  ).join('')}</div>`;
}

/* ---------------- placeholder (Finanças/Pets/Medicamentos/Dispensa) ---------------- */
function screenPlaceholder(){
  const labels = { financas:'Finanças', pets:'Pets', medicamentos:'Medicamentos', dispensa:'Dispensa' };
  return `<div class="screen">
    <div class="empty-hint">
      <span class="ic">🚧</span>
      <div style="font-weight:800; color:var(--text); margin-bottom:6px; font-size:15px;">${labels[state.section]}</div>
      Essa área ainda está em construção.<br>Volte para a aba Metas para continuar.
    </div>
  </div>`;
}

/* ---------------- home ---------------- */
function screenHome(){
  const d = doneCount();
  const g = overallProgress();
  const p = state.profile;
  return `<div class="screen">
    <div class="greet">
      <div>
        <h1>Bom dia, ${esc(p.name.split(/\s+/)[0])}! 👋</h1>
        <p>Sua jornada está <span class="glow">evoluindo</span></p>
      </div>
      <div class="header-icons">
        <button class="icon-btn" onclick="go('notifications')">🔔${state.notifUnread>0?'<span class="dot-badge"></span>':''}</button>
        <button class="streak-pill" onclick="go('dayLevels')">🔥 45</button>
        <button class="avatar" onclick="go('profile')">${profileAvatarContent(p)}</button>
      </div>
    </div>

    <div class="card">
      <div class="card-label">Progresso Geral</div>
      <div class="big-stat">${g}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${g}%"></div></div>
      <div class="card-foot">🚩 ${state.goals.length * 6} metas ativas</div>
    </div>

    <div class="card-title-row"><div class="section-title">Seus objetivos recentes</div>
      <button class="see-all" onclick="go('goalsList')">Ver todos ›</button></div>
    <div class="card">
      ${state.goals.map(gl => goalRow(gl, 'home')).join('')}
    </div>

    <div class="card-title-row"><div class="section-title">Sua Rotina de Hoje</div>
      <button class="see-all" onclick="go('dailyGoals')">Ver mais ›</button></div>
    <div class="routine-grid">
      <div class="routine-chip" onclick="go('dailyGoals')"><span class="ic">🎯</span>Metas do dia<span class="sub">${d}/${state.tasks.length} tarefas</span></div>
      <div class="routine-chip" onclick="go('livrosExplorar',{livrosSub:'explorar'})"><span class="ic">📚</span>Livros<span class="sub">Sua biblioteca</span></div>
      <div class="routine-chip" onclick="go('calendar')"><span class="ic">🗓️</span>Calendário<span class="sub">Seus eventos</span></div>
    </div>

    <button class="floating-add-goal" type="button" aria-label="Criar nova meta" onclick="go('goalForm',{formMode:'new'})">+</button>
  </div>`;
}

function goalRow(gl, ctx){
  const menuKey = 'goal-'+ctx+'-'+gl.id;
  return `
    <div class="goal-row">
      <div class="goal-thumb" style="background:${gl.img}" onclick="go('goalDetail',{selectedGoal:${gl.id}})">${gl.ic}</div>
      <div class="goal-info" onclick="go('goalDetail',{selectedGoal:${gl.id}})">
        <div class="name">${gl.name}</div>
        <div class="cat">${gl.cat}</div>
        <div class="progress-track"><div class="progress-fill" style="width:${gl.pct}%"></div></div>
      </div>
      <div class="goal-pct">${gl.pct}%</div>
      <button class="kebab" onclick="event.stopPropagation(); toggleMenu('${menuKey}')">⋮
        ${state.openMenu===menuKey ? `
          <div class="menu-pop" onclick="event.stopPropagation()">
            <button onclick="go('goalForm',{formMode:'edit', selectedGoal:${gl.id}})">✎ Editar</button>
            <button class="danger" onclick="deleteGoal(${gl.id})">🗑 Excluir</button>
          </div>` : ''}
      </button>
    </div>`;
}

/* ---------------- lista de objetivos ---------------- */
function screenGoalsList(){
  return `<div class="screen">
    ${screenHead('Seus objetivos', "goBack()")}
    <div class="card">${state.goals.map(gl => goalRow(gl, 'list')).join('') || `<div class="empty-hint"><span class="ic">🎯</span>Nenhum objetivo ainda.</div>`}</div>
    <button class="cta-btn secondary" onclick="go('goalForm',{formMode:'new'})">＋ Criar novo objetivo</button>
  </div>`;
}

/* ---------------- metas do dia ---------------- */
function screenDailyGoals(){
  const d = doneCount(); const total = state.tasks.length;
  const pct = total ? Math.round(d/total*100) : 0;
  return `<div class="screen">
    ${screenHead('Metas do dia', "goBack()")}
    <div class="card">
      <div class="card-label">Progresso de hoje</div>
      <div class="big-stat">${d} / ${total} <span style="font-size:16px; color:var(--text-dim); font-weight:600;">concluídas</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="card-foot">Continue assim! Você está indo muito bem. (${pct}%)</div>
    </div>

    <div class="card" onclick="go('dayLevels')" style="cursor:pointer;">
      <div class="card-label">🔥 Sua sequência</div>
      <div style="font-size:24px; font-weight:800; margin:6px 0 10px;">45 dias</div>
      <div class="streak-days">${['S','T','Q','Q','S','S','D'].map((l,i)=>`<div class="streak-day ${i<5?'lit':''}">${i<5?'🔥':l}</div>`).join('')}</div>
      <div class="card-foot">Complete todas as metas do dia para manter sua sequência!</div>
    </div>

    <div class="card-title-row" style="margin-top:6px;">
      <div class="section-title">Tarefas de hoje</div>
      <button class="add-task-btn" onclick="addTask()">＋ Adicionar</button>
    </div>
    <div class="card">
      ${state.tasks.length ? state.tasks.map(t => `
        <div class="task-row">
          <button class="checkbox ${t.done?'done':''}" onclick="toggleTask(${t.id})">${t.done?'✓':''}</button>
          <div class="task-ic">${t.ic}</div>
          <div class="task-info">
            <div class="t ${t.done?'strike':''}">${esc(t.t)}</div>
            <div class="s">${esc(t.s)}</div>
          </div>
          ${t.required ? '' : `<button class="remove-btn" type="button" onclick="removeTask(${t.id})" aria-label="Remover ${esc(t.t)}" title="Remover tarefa">🗑</button>`}
        </div>
      `).join('') : `<div class="empty-list">Nenhuma tarefa para hoje.</div>`}
    </div>

    <div class="quote-card">"Pequenas ações feitas todos os dias transformam sua vida."</div>
  </div>`;
}
function toggleTask(id){ const t = state.tasks.find(x=>x.id===id); t.done = !t.done; render(); }
function removeTask(id){
  const task = state.tasks.find(t=>t.id===id);
  if(task?.required){ alert('Esta meta é obrigatória para a sequência do foguinho e não pode ser removida.'); return; }
  if(!task || !confirm(`Remover a tarefa "${task.t}"?`)) return;
  state.tasks = state.tasks.filter(t=>t.id!==id);
  render();
}
function addTask(){
  const name = prompt('Nome da nova tarefa:');
  if(!name) return;
  const cat = prompt('Categoria da tarefa:', 'Geral') || 'Geral';
  state.tasks.push({ id: Date.now(), ic:'⭐', t:name, s:cat, done:false, required:false });
  render();
}

/* ---------------- nível do mês ---------------- */
function screenDayLevels(){
  const levels = [
    {n:1,label:'Fogo Amarelo', ic:'🔥', active:false},
    {n:2,label:'Fogo Laranja', ic:'🔥', active:true},
    {n:3,label:'Fogo Verde', ic:'🔥', active:false},
    {n:4,label:'Fogo Azul', ic:'🔒', active:false},
  ];
  return `<div class="screen">
    ${screenHead('Nível do mês', "goBack()")}
    <div class="level-grid">${levels.map(l => `
      <div class="level-card ${l.active?'active':''}">
        <span class="level-flame">${l.ic}</span>
        <div class="ln">Nível ${l.n}</div>
        <div class="lc">${l.label}</div>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="section-title" style="margin-bottom:14px;">Como funciona?</div>
      <p style="font-size:12.5px; color:var(--text-dim); margin-bottom:16px;">Complete todas as metas do dia para acender o foguinho e manter sua sequência.</p>
      <div class="how-item"><div class="how-ic">🔥</div><div><h4>Se você completar tudo</h4><p>O fogo permanece aceso e sua sequência continua aumentando.</p></div></div>
      <div class="how-item"><div class="how-ic">💨</div><div><h4>Se não completar tudo</h4><p>O fogo apaga e sua sequência volta para 0.</p></div></div>
      <div class="how-item"><div class="how-ic">🏆</div><div><h4>Quanto mais consistência</h4><p>Mais alto será o nível do seu fogo no mês.</p></div></div>
    </div>
    <button class="cta-btn secondary" onclick="go('levelHistory')">📊 Ver histórico</button>
  </div>`;
}
function screenLevelHistory(){
  const months = [
    {m:'Abril', level:3, dias:28}, {m:'Março', level:2, dias:19}, {m:'Fevereiro', level:2, dias:16}, {m:'Janeiro', level:1, dias:9},
  ];
  return `<div class="screen">
    ${screenHead('Histórico de níveis', "goBack()")}
    <div class="card">
      ${months.map(mo => `
        <div class="kv-row">
          <span class="k">${mo.m}</span>
          <span class="v">🔥 Nível ${mo.level} · ${mo.dias} dias</span>
        </div>`).join('')}
    </div>
  </div>`;
}

/* ---------------- formulário de objetivo (novo / editar) ---------------- */
function screenGoalForm(){
  const editing = state.formMode === 'edit';
  const g = editing ? goalById(state.selectedGoal) : null;
  return `<div class="screen">
    ${screenHead(editing ? 'Editar objetivo' : 'Novo objetivo', "goBack()")}
    <div class="field"><label>Nome</label><input id="f-name" placeholder="Ex.: Viagem para Japão" value="${g?g.name:''}"></div>
    <div class="field"><label>Categoria</label>
      <select id="f-cat">
        ${['Meta financeira','Meta de experiência','Meta pessoal','Meta de saúde'].map(c=>`<option ${g&&g.cat===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Valor da meta (R$)</label><input id="f-target" type="number" placeholder="Ex.: 45.000,00" value="${g?g.meta:''}"></div>
    <div class="field"><label>Quanto você já tem (R$)</label><input id="f-saved" type="number" placeholder="Ex.: 18.000,00" value="${g?g.guardado:''}"></div>
    <div class="field"><label>Prioridade</label>
      <div class="seg" id="f-prio">
        ${['Baixa','Média','Alta'].map(p=>`<button type="button" class="${(g?g.prioridade:'Alta')===p?'sel':''}" data-v="${p}" onclick="selPrio(this)">${p}</button>`).join('')}
      </div>
    </div>
    <div class="field"><label>Status</label>
      <select id="f-status">
        ${['Sonho','Planejando','Juntando dinheiro','Quase lá','Concluído'].map(s=>`<option ${g&&g.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Foto</label>
      <label class="upload-box goal-photo-upload" for="f-photo">
        <span class="goal-photo-preview" id="goal-photo-preview" style="background:${state.pendingGoalImage || 'var(--surface-2)'}">${state.pendingGoalImage?'':'🖼️'}</span>
        <span>${state.pendingGoalImage?'Trocar imagem':'Toque para enviar uma imagem'}</span>
        <input id="f-photo" type="file" accept="image/*" onchange="setGoalPhoto(this)">
      </label>
    </div>
    <div class="field"><label>Observações</label><textarea id="f-obs" placeholder="Escreva algo sobre sua meta...">${g?g.obs:''}</textarea></div>
    <button class="cta-btn" onclick="saveGoal()">${editing?'Salvar alterações':'Salvar objetivo'}</button>
  </div>`;
}
function selPrio(btn){
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
}
function setGoalPhoto(input){
  resizeImage(input.files?.[0], dataUrl => {
    state.pendingGoalImage = `url("${dataUrl}")`;
    const preview = document.getElementById('goal-photo-preview');
    if(preview){ preview.style.background = state.pendingGoalImage; preview.textContent = ''; }
    const label = input.closest('.upload-box')?.querySelector('span:last-of-type');
    if(label) label.textContent = 'Trocar imagem';
  });
}
function saveGoal(){
  const name = document.getElementById('f-name').value.trim() || 'Novo objetivo';
  const cat = document.getElementById('f-cat').value;
  const target = parseFloat(document.getElementById('f-target').value) || 0;
  const saved = parseFloat(document.getElementById('f-saved').value) || 0;
  const prio = document.getElementById('f-prio').querySelector('.sel')?.dataset.v || 'Média';
  const status = document.getElementById('f-status').value;
  const obs = document.getElementById('f-obs').value || '—';
  const pct = target > 0 ? Math.min(100, Math.round(saved/target*100)) : 0;

  if(state.formMode === 'edit'){
    const g = goalById(state.selectedGoal);
    Object.assign(g, {name, cat, meta:target, guardado:saved, prioridade:prio, status, obs, pct, img:state.pendingGoalImage || g.img});
    state.history.pop();
    go('goalDetail', {selectedGoal:g.id});
  } else {
    const icons = ['🎯','✈️','🏠','🎓','💍','📱','🚀'];
    const newGoal = {
      id: Date.now(), name, cat, pct, ic: icons[state.goals.length % icons.length],
      img:state.pendingGoalImage || 'linear-gradient(135deg,#2a2a34,#111116)', meta: target, guardado: saved,
      status, prioridade: prio, obs
    };
    state.goals.unshift(newGoal);
    state.history.pop();
    state.history.push('goalsList');
    go('goalDetail', {selectedGoal:newGoal.id});
  }
}
function deleteGoal(id){
  state.openMenu = null;
  if(!confirm('Excluir este objetivo?')) return;
  state.goals = state.goals.filter(g=>g.id!==id);
  render();
}

/* ---------------- detalhes do objetivo ---------------- */
function screenGoalDetail(){
  const g = goalById(state.selectedGoal) || state.goals[0];
  if(!g) return `<div class="screen"><div class="empty-hint"><span class="ic">🎯</span>Objetivo não encontrado.</div></div>`;
  const menuKey = 'goal-detail-'+g.id;
  return `<div class="screen">
    ${screenHead(g.name, "goBack()", `
      <button class="kebab" onclick="event.stopPropagation(); toggleMenu('${menuKey}')">⋮
        ${state.openMenu===menuKey ? `
          <div class="menu-pop" onclick="event.stopPropagation()">
            <button onclick="go('goalForm',{formMode:'edit', selectedGoal:${g.id}})">✎ Editar</button>
            <button class="danger" onclick="deleteGoal(${g.id}); goBack();">🗑 Excluir</button>
          </div>` : ''}
      </button>`)}
    <div class="obj-hero" style="background:${g.img}"><div class="badge">${g.ic}</div></div>
    <div class="obj-title-row">
      <h2>${g.name}</h2>
      <button class="edit-ic" onclick="go('goalForm',{formMode:'edit', selectedGoal:${g.id}})">✎</button>
    </div>
    <div class="card">
      <div class="kv-row"><span class="k">Meta</span><span class="v">${fmtBRL(g.meta)}</span></div>
      <div class="kv-row"><span class="k">Guardado</span><span class="v">${fmtBRL(g.guardado)}</span></div>
    </div>
    <div class="card">
      <div class="card-label">Progresso</div>
      <div class="big-stat">${g.pct}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${g.pct}%"></div></div>
    </div>
    <div class="card">
      <div class="kv-row"><span class="k">Status</span><span class="v">${g.status}</span></div>
      <div class="kv-row"><span class="k">Prioridade</span><span class="v">${g.prioridade}</span></div>
      <div class="quote-box">"${g.obs}"</div>
    </div>
    <button class="cta-btn" onclick="addValue(${g.id})">＋ Adicionar valor</button>
    <div class="btn-gap"></div>
    <button class="cta-btn secondary" onclick="go('goalForm',{formMode:'edit', selectedGoal:${g.id}})">✎ Editar meta</button>
    <div class="btn-gap"></div>
    <button class="cta-btn ghost" onclick="completeGoal(${g.id})">✓ Marcar como concluído</button>
  </div>`;
}
function addValue(id){
  const g = goalById(id);
  const v = parseFloat(prompt('Quanto deseja adicionar a "'+g.name+'"? (R$)', '500'));
  if(!v || isNaN(v)) return;
  g.guardado += v;
  g.pct = g.meta > 0 ? Math.min(100, Math.round(g.guardado/g.meta*100)) : g.pct;
  render();
}
function completeGoal(id){
  const g = goalById(id);
  g.pct = 100; g.status = 'Concluído';
  render();
}

/* ---------------- livros: explorar ---------------- */
function bookRow(b){
  return `
    <div class="book-row">
      <div class="book-cover" style="background:${b.cor}; color:#1a1200;" onclick="go('bookDetail',{selectedBook:${b.id}})">${b.title}</div>
      <div class="book-info">
        <h4 onclick="go('bookDetail',{selectedBook:${b.id}})">${b.title}</h4>
        <div class="auth">${b.author}</div>
        <div class="rate">★★★★★ (${b.rating})</div>
        <div class="book-row-actions">
          <button class="mini-btn" onclick="go('bookDetail',{selectedBook:${b.id}})">Ver detalhes</button>
          <button class="fav-btn ${b.favorite?'on':''}" onclick="toggleFavorite(${b.id})">${b.favorite?'♥':'♡'}</button>
        </div>
      </div>
    </div>`;
}
function screenLivrosExplorar(){
  const tabs = [['explorar','Explorar'],['quero','Quero ler'],['lendo','Lendo'],['concluidos','Concluídos']];
  const list = state.booksTab==='explorar' ? state.books : state.books.filter(b=>b.listStatus===state.booksTab);
  return `<div class="screen with-subnav">
    ${screenHead('Livros', "goBack()")}
    <div class="search-box">🔍 Buscar livros, autor ou tema</div>
    <div class="tab-row">${tabs.map(([id,label])=>
      `<button class="tab-chip ${state.booksTab===id?'sel':''}" onclick="state.booksTab='${id}'; render();">${label}</button>`
    ).join('')}</div>
    ${list.length ? `
      <div class="card-title-row"><div class="section-title">Recomendados para você</div><button class="see-all">Ver todos ›</button></div>
      <div class="card">${list.map(bookRow).join('')}</div>
    ` : `<div class="empty-hint"><span class="ic">📚</span>Nada por aqui ainda.</div>`}
  </div>${livrosSubnav()}`;
}

/* ---------------- livros: biblioteca ---------------- */
function screenLivrosBiblioteca(){
  const list = state.books.filter(b=>b.inLibrary);
  return `<div class="screen with-subnav">
    ${screenHead('Biblioteca', "goBack()")}
    ${list.length ? `<div class="card">${list.map(bookRow).join('')}</div>`
      : `<div class="empty-hint"><span class="ic">📚</span>Sua biblioteca está vazia.<br>Adicione livros a partir dos detalhes.</div>`}
  </div>${livrosSubnav()}`;
}

/* ---------------- livros: favoritas ---------------- */
function screenLivrosFavoritas(){
  const list = state.books.filter(b=>b.favorite);
  return `<div class="screen with-subnav">
    ${screenHead('Favoritas', "goBack()")}
    ${list.length ? `<div class="card">${list.map(bookRow).join('')}</div>`
      : `<div class="empty-hint"><span class="ic">❤</span>Você ainda não favoritou nenhum livro.</div>`}
  </div>${livrosSubnav()}`;
}
function toggleFavorite(id){ const b = bookById(id); b.favorite = !b.favorite; render(); }

/* ---------------- detalhes do livro ---------------- */
function screenBookDetail(){
  const b = bookById(state.selectedBook) || state.books[0];
  const reading = b.listStatus === 'lendo';
  return `<div class="screen">
    ${screenHead('Detalhes do livro', "goBack()")}
    <div class="book-hero">
      <div class="book-hero-cover" style="background:${b.cor}; color:#1a1200;">
        ${b.title}
        <button class="book-hero-fav ${b.favorite?'on':''}" onclick="toggleFavorite(${b.id})">${b.favorite?'♥':'♡'}</button>
      </div>
      <div class="book-hero-info">
        <h2>${b.title}</h2>
        <div class="auth">${b.author}</div>
        <div class="rate" style="color:var(--amber-bright); font-size:13px;">★★★★★ (${b.rating})</div>
        <div style="font-size:12px; color:var(--text-dim); margin-top:8px;">${b.cat}</div>
        <div class="avail-pill ${reading?'reading':''}"><span class="d"></span>${reading?'Você está lendo':'Disponível para leitura'}</div>
      </div>
    </div>
    <div class="card-title-row"><div class="section-title">Sobre o livro</div></div>
    <p style="font-size:13.5px; color:var(--text-dim); line-height:1.6; margin-bottom:20px;">${b.desc}</p>
    <button class="cta-btn" onclick="readNow(${b.id})">📖 ${reading?'Continuar lendo':'Ler agora'}</button>
    <div class="btn-gap"></div>
    <button class="cta-btn secondary" onclick="toggleLibrary(${b.id})">${b.inLibrary?'📗 Remover da biblioteca':'📗 Adicionar à biblioteca'}</button>
    <div class="btn-gap"></div>
    <button class="cta-btn ghost" onclick="go('buyBook',{selectedBook:${b.id}})">🔗 Ver onde comprar</button>
  </div>`;
}
function readNow(id){
  const b = bookById(id);
  b.listStatus = 'lendo';
  b.inLibrary = true;
  render();
}
function toggleLibrary(id){
  const b = bookById(id);
  b.inLibrary = !b.inLibrary;
  render();
}
function screenBuyBook(){
  const b = bookById(state.selectedBook) || state.books[0];
  const stores = ['Livraria Cultura', 'Amazon', 'Estante Virtual'];
  return `<div class="screen">
    ${screenHead('Onde comprar', "goBack()")}
    <p style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">Opções para "${b.title}":</p>
    <div class="card">
      ${stores.map(s => `<div class="kv-row"><span class="k">${s}</span><span class="v" style="color:var(--amber-bright);">Ver preço</span></div>`).join('')}
    </div>
  </div>`;
}

/* ---------------- calendário ---------------- */
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function screenCalendar(){
  const first = new Date(state.calYear, state.calMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(state.calYear, state.calMonth+1, 0).getDate();
  const daysInPrev = new Date(state.calYear, state.calMonth, 0).getDate();
  let cells = [];
  for(let i=startDow-1;i>=0;i--) cells.push({d: daysInPrev-i, other:true});
  for(let d=1; d<=daysInMonth; d++) cells.push({d, other:false});
  while(cells.length % 7 !== 0) cells.push({d: cells.length, other:true});
  const dayEvents = state.events[state.selectedDay] || [];
  return `<div class="screen">
    ${screenHead('Calendário', "goBack()")}
    <div class="cal-head">
      <button onclick="shiftMonth(-1)">‹</button>
      <div style="font-weight:800; font-size:14.5px;">${MONTHS[state.calMonth]} ${state.calYear}</div>
      <button onclick="shiftMonth(1)">›</button>
    </div>
    <div class="cal-grid">
      ${['D','S','T','Q','Q','S','S'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}
      ${cells.map(c => {
        const isToday = !c.other && c.d === state.selectedDay;
        const hasEvt = !c.other && state.events[c.d];
        return `<div class="cal-day ${c.other?'other':''} ${isToday?'today':''}" onclick="${c.other?'':'selectDay('+c.d+')'}">${c.d}${hasEvt?'<span class="evt-dot"></span>':''}</div>`;
      }).join('')}
    </div>
    <div class="card-title-row" style="margin-top:20px;">
      <div class="section-title">Hoje • ${state.selectedDay} de ${MONTHS[state.calMonth]}</div>
    </div>
    <div class="card">
      ${dayEvents.length ? dayEvents.map((e,index) => `
        <div class="event-row">
          <span class="evt-dot-lg" style="background:${e.color}"></span>
          <span class="evt-time">${esc(e.time)}</span>
          <span class="evt-title">${esc(e.t)}</span>
          <button class="remove-btn" type="button" onclick="removeEvent(${index})" aria-label="Remover ${esc(e.t)}" title="Remover evento">🗑</button>
        </div>`).join('') : `<div style="text-align:center; color:var(--text-faint); font-size:12.5px; padding:10px 0;">Nenhum evento neste dia.</div>`}
    </div>
    <button class="cta-btn" onclick="addEvent()">＋ Novo evento</button>
  </div>`;
}
function shiftMonth(dir){
  state.calMonth += dir;
  if(state.calMonth<0){ state.calMonth=11; state.calYear--; }
  if(state.calMonth>11){ state.calMonth=0; state.calYear++; }
  render();
}
function selectDay(d){ state.selectedDay = d; render(); }
function removeEvent(index){
  const dayEvents = state.events[state.selectedDay] || [];
  const event = dayEvents[index];
  if(!event || !confirm(`Remover o evento "${event.t}"?`)) return;
  dayEvents.splice(index, 1);
  if(dayEvents.length === 0) delete state.events[state.selectedDay];
  render();
}
function addEvent(){
  const t = prompt('Nome do evento:');
  if(!t) return;
  const time = prompt('Horário (ex.: 14:00):','12:00') || '—';
  if(!state.events[state.selectedDay]) state.events[state.selectedDay] = [];
  state.events[state.selectedDay].push({t, time, color:'#f5a623'});
  render();
}

/* ---------------- notificações ---------------- */
const NOTIFS = [
  { ic:'🎯', t:'Meta diária concluída!', s:'Você completou 4 de 5 tarefas de hoje.', time:'Há 2 horas' },
  { ic:'🔥', t:'Sequência mantida', s:'45 dias seguidos cumprindo suas metas.', time:'Há 5 horas' },
  { ic:'💰', t:'"Novo carro" atualizado', s:'Você adicionou R$ 500,00 ao seu objetivo.', time:'Ontem' },
  { ic:'📖', t:'Lembrete de leitura', s:'Que tal 20 minutos com "Hábitos Atômicos" hoje?', time:'Ontem' },
  { ic:'🏆', t:'Novo nível alcançado', s:'Você chegou ao Nível 2 — Fogo Laranja.', time:'2 dias atrás' },
];
function screenNotifications(){
  state.notifUnread = 0;
  return `<div class="screen">
    ${screenHead('Notificações', "goBack()")}
    <div class="card">
      ${NOTIFS.map((n,i) => `
        <div class="notif-row">
          <div class="notif-ic">${n.ic}</div>
          <div class="notif-info" style="flex:1;">
            <div class="t">${n.t}</div>
            <div class="s">${n.s}</div>
            <div class="time">${n.time}</div>
          </div>
          ${i<3 ? '<div class="notif-dot"></div>' : ''}
        </div>`).join('')}
    </div>
  </div>`;
}

/* ---------------- perfil ---------------- */
function screenProfile(){
  const completed = state.goals.filter(g=>g.status==='Concluído').length;
  const p = state.profile;
  return `<div class="screen">
    ${screenHead('Perfil', "goBack()")}
    <div class="profile-head">
      <div class="profile-avatar">${profileAvatarContent(p)}</div>
      <h2>${esc(p.name)}</h2>
      <p>Membro desde Jan 2024</p>
      ${p.bio ? `<div class="profile-bio">${esc(p.bio)}</div>` : ''}
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="n">45</div><div class="l">dias de sequência</div></div>
      <div class="stat-card"><div class="n">${completed}</div><div class="l">metas concluídas</div></div>
      <div class="stat-card"><div class="n">2</div><div class="l">nível atual</div></div>
    </div>
    <div class="card">
      <div class="option-row" onclick="go('editProfile')"><span class="ic">✎</span><span class="t">Editar perfil</span><span class="arrow">›</span></div>
      <div class="option-row" onclick="go('notifications')"><span class="ic">🔔</span><span class="t">Notificações</span><span class="arrow">›</span></div>
      <div class="option-row" onclick="go('dayLevels')"><span class="ic">🔥</span><span class="t">Minha sequência</span><span class="arrow">›</span></div>
      <div class="option-row" onclick="alert('Sessão encerrada.')"><span class="ic">🚪</span><span class="t" style="color:var(--red);">Sair</span></div>
    </div>
  </div>`;
}

function screenEditProfile(){
  const p = state.profile;
  return `<div class="screen">
    ${screenHead('Editar perfil', "goBack()")}
    <div class="edit-profile-preview">
      <div class="profile-avatar" id="profile-preview-avatar">${profileAvatarContent(p)}</div>
      <span>Prévia do perfil</span>
    </div>
    <form id="profile-form" onsubmit="saveProfile(event)">
      <div class="field">
        <label for="profile-name">Nome</label>
        <input id="profile-name" maxlength="50" required autocomplete="name" value="${esc(p.name)}" placeholder="Seu nome">
      </div>
      <div class="field">
        <label>Foto de perfil</label>
        <label class="upload-box profile-photo-upload" for="profile-photo">📷 ${p.photo?'Trocar foto':'Adicionar foto de perfil'}
          <input id="profile-photo" type="file" accept="image/*" onchange="setProfilePhoto(this)">
        </label>
      </div>
      <div class="field">
        <label for="profile-avatar">Letra ou emoji do avatar</label>
        <input id="profile-avatar" maxlength="2" value="${esc(p.avatar)}" placeholder="😊" oninput="previewProfileAvatar(this.value)">
      </div>
      <div class="field">
        <label for="profile-bio">Biografia</label>
        <textarea id="profile-bio" maxlength="160" placeholder="Conte um pouco sobre você">${esc(p.bio)}</textarea>
        <div class="field-hint">Até 160 caracteres</div>
      </div>
      <button class="cta-btn" type="submit">✓ Salvar alterações</button>
      <div class="btn-gap"></div>
      <button class="cta-btn ghost" type="button" onclick="goBack()">Cancelar</button>
    </form>
  </div>`;
}
function previewProfileAvatar(value){
  const preview = document.getElementById('profile-preview-avatar');
  const name = document.getElementById('profile-name')?.value.trim();
  if(preview && !state.pendingProfilePhoto) preview.textContent = value.trim() || (name ? name.charAt(0).toUpperCase() : '?');
}
function setProfilePhoto(input){
  resizeImage(input.files?.[0], dataUrl => {
    state.pendingProfilePhoto = dataUrl;
    const preview = document.getElementById('profile-preview-avatar');
    if(preview) preview.innerHTML = `<img class="avatar-photo" src="${dataUrl}" alt="Prévia da foto de perfil">`;
    const upload = input.closest('.upload-box');
    if(upload) upload.childNodes[0].textContent = '📷 Trocar foto ';
  });
}
function saveProfile(event){
  event.preventDefault();
  const name = document.getElementById('profile-name').value.trim();
  const bio = document.getElementById('profile-bio').value.trim();
  const avatarValue = document.getElementById('profile-avatar').value.trim();
  if(!name){ alert('Digite seu nome.'); return; }
  state.profile = { name, bio, avatar: avatarValue || name.charAt(0).toUpperCase(), photo: state.pendingProfilePhoto || state.profile.photo || '' };
  state.pendingProfilePhoto = '';
  localStorage.setItem('metas-profile', JSON.stringify(state.profile));
  state.history = state.history.filter(screen => screen !== 'editProfile');
  state.screen = 'profile';
  render();
}

/* ---------------- roteador ---------------- */
function render(){
  const map = {
    home: screenHome,
    goalsList: screenGoalsList,
    dailyGoals: screenDailyGoals,
    dayLevels: screenDayLevels,
    levelHistory: screenLevelHistory,
    goalForm: screenGoalForm,
    goalDetail: screenGoalDetail,
    livrosExplorar: screenLivrosExplorar,
    livrosBiblioteca: screenLivrosBiblioteca,
    livrosFavoritas: screenLivrosFavoritas,
    bookDetail: screenBookDetail,
    buyBook: screenBuyBook,
    calendar: screenCalendar,
    notifications: screenNotifications,
    profile: screenProfile,
    editProfile: screenEditProfile,
    placeholder: screenPlaceholder,
  };
  const body = sectionTabs() + (map[state.screen] || screenHome)();
  document.getElementById('app').innerHTML = body;
}
document.addEventListener('click', () => { if(state.openMenu){ state.openMenu = null; render(); } });
render();
