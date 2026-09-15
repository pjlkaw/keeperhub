// METAS — JavaScript sem frameworks.
// O HTML desenha as telas; este arquivo cuida dos cliques e dos dados.

// 1. DADOS INICIAIS ----------------------------------------------------
// Objetos guardam informações. Arrays (listas) guardam vários objetos.
const dadosIniciais = {
  perfil: { name: 'Fulano', bio: 'Uma meta por vez.', avatar: 'F', photo: '' },
  metas: [
    { id: 1, nome: 'Novo carro', categoria: 'Meta financeira', valor: 45000, guardado: 18000, prioridade: 'Alta', status: 'Juntando dinheiro', prazo: '2026-12-31', observacoes: 'SUV confortável para viagens longas.', foto: '', icone: '🚗' },
    { id: 2, nome: 'Japão', categoria: 'Meta de experiência', valor: 15000, guardado: 3000, prioridade: 'Média', status: 'Planejando', prazo: '2027-05-30', observacoes: 'Viagem de duas semanas na primavera.', foto: '', icone: '⛩️' },
    { id: 3, nome: 'Sofá novo', categoria: 'Meta pessoal', valor: 4000, guardado: 2920, prioridade: 'Baixa', status: 'Quase lá', prazo: '2026-11-30', observacoes: 'Modelo retrátil, cor cinza.', foto: '', icone: '🛋️' }
  ],
  tarefas: [
    { id: 1, nome: 'Arrumar a cama', categoria: 'Casa', icone: '🛏️', obrigatoria: true, feita: false },
    { id: 2, nome: 'Caminhar 30 min', categoria: 'Saúde', icone: '🚶', obrigatoria: true, feita: false },
    { id: 3, nome: 'Beber 2L de água', categoria: 'Saúde', icone: '💧', obrigatoria: true, feita: false },
    { id: 4, nome: 'Ler por 20 min', categoria: 'Desenvolvimento', icone: '📖', obrigatoria: true, feita: false },
    { id: 5, nome: 'Ficar 1h sem celular', categoria: 'Bem-estar', icone: '📵', obrigatoria: true, feita: false }
  ],
  livros: [
    { id: 1, titulo: 'Hábitos Atômicos', autor: 'James Clear', nota: '4,8', cor: '#d8c9a3', categoria: 'Desenvolvimento pessoal', descricao: 'Pequenas mudanças, resultados extraordinários. Construindo bons hábitos todos os dias.', status: 'lendo', biblioteca: true, favorito: true },
    { id: 2, titulo: 'Pai Rico, Pai Pobre', autor: 'Robert T. Kiyosaki', nota: '4,6', cor: '#f2c230', categoria: 'Finanças pessoais', descricao: 'Reflexões sobre educação financeira e nossa relação com o dinheiro.', status: 'explorar', biblioteca: false, favorito: false },
    { id: 3, titulo: 'Mindset', autor: 'Carol S. Dweck', nota: '4,7', cor: '#c94f4f', categoria: 'Psicologia', descricao: 'Como a mentalidade de crescimento influencia o aprendizado.', status: 'explorar', biblioteca: false, favorito: false },
    { id: 4, titulo: 'Essencialismo', autor: 'Greg McKeown', nota: '4,5', cor: '#5b7db8', categoria: 'Produtividade', descricao: 'Fazer menos coisas, com mais atenção ao que realmente importa.', status: 'quero', biblioteca: true, favorito: false }
  ],
  eventos: [],
  diasCompletos: [],
  diaTarefas: ''
};

// JSON transforma objetos em texto para guardar no navegador.
let dados = carregarDados();
let telaAtual = 'inicio';
let historico = [];
let metaSelecionada = null;
let livroSelecionado = null;
let fotoMeta = '';
let fotoPerfil = '';
let fotoLivro = '';
let livroEmEdicao = null;
let filtroLivros = 'todos';
let dataSelecionada = new Date();
let mesExibido = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), 1);
let uploadsPendentes = 0;
const chaveDados = 'metas-junior-v1';

// 2. FUNÇÕES PEQUENAS DE APOIO ----------------------------------------
// Evita repetir document.getElementById em todas as linhas.
function elemento(id) {
  return document.getElementById(id);
}

function carregarDados() {
  let novos = JSON.parse(JSON.stringify(dadosIniciais));
  try {
    const salvos = localStorage.getItem('metas-junior-v1');
    if (salvos) {
      const recuperados = JSON.parse(salvos);
      if (recuperados && recuperados.perfil && Array.isArray(recuperados.metas)
          && Array.isArray(recuperados.tarefas) && Array.isArray(recuperados.livros)
          && Array.isArray(recuperados.eventos) && Array.isArray(recuperados.diasCompletos)) {
        return recuperados;
      }
    }
    // Aproveita o perfil salvo pela versão antiga, se existir.
    const perfilAntigo = localStorage.getItem('metas-profile');
    if (perfilAntigo) {
      const perfil = JSON.parse(perfilAntigo);
      if (perfil && typeof perfil.name === 'string') novos.perfil = perfil;
    }
  } catch (erro) {
    console.warn('Não foi possível recuperar os dados locais.', erro);
  }
  return novos;
}

function salvarDados() {
  try {
    localStorage.setItem(chaveDados, JSON.stringify(dados));
    return true;
  } catch (erro) {
    alert('Não foi possível salvar no navegador. O espaço pode estar cheio ou bloqueado. Seus dados ainda estão nesta tela.');
    return false;
  }
}

function avisar(texto) {
  elemento('mensagem').textContent = texto;
  elemento('mensagem').hidden = false;
  window.setTimeout(function () { elemento('mensagem').hidden = true; }, 4000);
}

function dinheiro(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataLocal(data) {
  // Usa a data local, sem mudar de dia por causa do fuso horário.
  return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
}

function copiarModelo(id) {
  // Copia um <template> do HTML. Não cria uma tela inteira pelo script.
  return elemento(id).content.firstElementChild.cloneNode(true);
}

function mensagemVazia(lista, texto) {
  if (lista.children.length === 0) {
    const mensagem = document.createElement('p');
    mensagem.className = 'empty-list';
    mensagem.textContent = texto;
    lista.appendChild(mensagem);
  }
}

function mostrarFoto(imagem, foto) {
  // Só aceita as imagens locais produzidas pelo envio de fotos.
  // startsWith significa "começa com": mais fácil de ler que uma expressão regular.
  let valida = false;
  if (typeof foto === 'string') {
    valida = foto.startsWith('data:image/jpeg;base64,')
      || foto.startsWith('data:image/png;base64,')
      || foto.startsWith('data:image/webp;base64,');
  }
  imagem.hidden = !valida;
  if (valida) imagem.src = foto;
  else imagem.removeAttribute('src');
}

// 3. NAVEGAÇÃO --------------------------------------------------------
function mostrarTela(id, guardarHistorico = true) {
  if (uploadsPendentes > 0) return avisar('Aguarde a foto terminar de carregar.');
  if (guardarHistorico && telaAtual !== id) historico.push(telaAtual);
  document.querySelectorAll('.tela').forEach(function (tela) {
    tela.hidden = tela.id !== id;
  });
  telaAtual = id;
  atualizarTela();
  window.scrollTo(0, 0);
}

function voltar() {
  mostrarTela(historico.pop() || 'inicio', false);
}

function atualizarTela() {
  atualizarDia();
  atualizarResumo();
  if (telaAtual === 'inicio' || telaAtual === 'objetivos') listarMetas();
  if (telaAtual === 'detalhes-meta') mostrarDetalhesMeta();
  if (telaAtual === 'diarias') listarTarefas();
  if (telaAtual === 'calendario') montarCalendario();
  if (telaAtual === 'livros') listarLivros();
  if (telaAtual === 'detalhes-livro') mostrarDetalhesLivro();
  if (telaAtual === 'notificacoes') elemento('aviso-notificacao').hidden = true;
  if (telaAtual === 'historico') listarHistorico();
}

document.querySelectorAll('[data-tela]').forEach(function (botao) {
  botao.addEventListener('click', function () { mostrarTela(botao.dataset.tela); });
});
document.querySelectorAll('.voltar').forEach(function (botao) {
  botao.addEventListener('click', voltar);
});
document.querySelectorAll('[data-modulo]').forEach(function (botao) {
  botao.addEventListener('click', function () {
    if (botao.dataset.modulo === 'Metas') mostrarTela('inicio');
    else {
      elemento('titulo-modulo').textContent = botao.dataset.modulo;
      mostrarTela('em-construcao');
    }
  });
});

// 4. METAS: listar, criar, editar, concluir e remover --------------------
function porcentagem(meta) {
  if (meta.status === 'Concluído') return 100;
  if (meta.valor <= 0) return 0;
  return Math.min(100, Math.round(meta.guardado / meta.valor * 100));
}

function mensagemDeProgresso() {
  const nome = dados.perfil.name.split(' ')[0];
  if (dados.metas.length === 0) return nome + ', crie uma meta para começar sua jornada.';

  const ativas = dados.metas.filter(function (meta) { return meta.status !== 'Concluído'; });
  if (ativas.length === 0) return 'Parabéns, ' + nome + '! Você concluiu todas as suas metas.';

  const hoje = new Date();
  const temAtrasada = ativas.some(function (meta) {
    if (!meta.prazo) return false;
    const prazo = new Date(meta.prazo + 'T23:59:59');
    return prazo < hoje && porcentagem(meta) < 100;
  });
  if (temAtrasada) return nome + ', você está pendente com uma meta.';

  const temProxima = ativas.some(function (meta) {
    if (!meta.prazo) return false;
    const prazo = new Date(meta.prazo + 'T23:59:59');
    const dias = (prazo - hoje) / (1000 * 60 * 60 * 24);
    return dias >= 0 && dias <= 30;
  });
  const media = ativas.reduce(function (total, meta) { return total + porcentagem(meta); }, 0) / ativas.length;
  if (temProxima && media < 50) return nome + ', você está pendente com uma meta.';
  if (temProxima) return nome + ', sua meta está chegando na reta final.';
  if (media >= 80) return nome + ', você está quase lá!';
  return nome + ', sua jornada está evoluindo.';
}

function listarMetas() {
  const listas = [elemento('metas-recentes'), elemento('lista-metas')];
  listas.forEach(function (lista) {
    lista.replaceChildren();
    let metas = dados.metas;
    if (lista.id === 'metas-recentes') metas = metas.slice(0, 3);
    metas.forEach(function (meta) {
      const cartao = copiarModelo('modelo-meta');
      cartao.querySelector('.name').textContent = meta.nome;
      cartao.querySelector('.cat').textContent = meta.categoria;
      cartao.querySelector('.icone').textContent = meta.icone;
      cartao.querySelector('.icone').hidden = Boolean(meta.foto);
      mostrarFoto(cartao.querySelector('img'), meta.foto);
      cartao.querySelector('progress').value = porcentagem(meta);
      cartao.querySelector('.goal-pct').textContent = porcentagem(meta) + '%';
      cartao.querySelectorAll('.abrir').forEach(function (botao) {
        botao.addEventListener('click', function () {
          metaSelecionada = meta;
          mostrarTela('detalhes-meta');
        });
      });
      cartao.querySelector('.editar').addEventListener('click', function () { abrirFormularioMeta(meta); });
      cartao.querySelector('.excluir').addEventListener('click', function () { removerMeta(meta); });
      lista.appendChild(cartao);
    });
    mensagemVazia(lista, 'Nenhum objetivo cadastrado.');
  });
}

function abrirFormularioMeta(meta) {
  metaSelecionada = meta;
  elemento('form-meta').reset();
  fotoMeta = '';
  elemento('titulo-formulario-meta').textContent = 'Novo objetivo';
  if (meta) {
    elemento('titulo-formulario-meta').textContent = 'Editar objetivo';
    elemento('meta-nome').value = meta.nome;
    elemento('meta-categoria').value = meta.categoria;
    elemento('meta-valor').value = meta.valor;
    elemento('meta-guardado').value = meta.guardado;
    elemento('meta-prioridade').value = meta.prioridade;
    elemento('meta-status').value = meta.status;
    elemento('meta-prazo').value = meta.prazo || '';
    elemento('meta-observacoes').value = meta.observacoes;
    fotoMeta = meta.foto;
  }
  mostrarFoto(elemento('previa-meta'), fotoMeta);
  mostrarTela('formulario-meta');
}

document.querySelectorAll('.nova-meta').forEach(function (botao) {
  botao.addEventListener('click', function () { abrirFormularioMeta(null); });
});

elemento('form-meta').addEventListener('submit', function (evento) {
  evento.preventDefault();
  if (uploadsPendentes > 0) return avisar('Aguarde a foto terminar de carregar.');
  const nome = elemento('meta-nome').value.trim();
  if (!nome) return avisar('Digite o nome da meta.');
  const meta = {
    id: metaSelecionada ? metaSelecionada.id : Date.now(),
    nome: nome,
    categoria: elemento('meta-categoria').value,
    valor: Number(elemento('meta-valor').value),
    guardado: Number(elemento('meta-guardado').value),
    prioridade: elemento('meta-prioridade').value,
    status: elemento('meta-status').value,
    prazo: elemento('meta-prazo').value,
    observacoes: elemento('meta-observacoes').value,
    foto: fotoMeta,
    icone: metaSelecionada ? metaSelecionada.icone : '🎯'
  };
  if (metaSelecionada) {
    const indice = dados.metas.findIndex(function (item) { return item.id === meta.id; });
    dados.metas[indice] = meta;
  } else dados.metas.unshift(meta);
  metaSelecionada = meta;
  if (!salvarDados()) return;
  historico = ['inicio', 'objetivos'];
  mostrarTela('detalhes-meta', false);
  avisar('Meta salva!');
});

function mostrarDetalhesMeta() {
  const meta = metaSelecionada;
  if (!meta) return mostrarTela('objetivos', false);
  elemento('nome-meta').textContent = meta.nome;
  elemento('valor-meta').textContent = dinheiro(meta.valor);
  elemento('guardado-meta').textContent = dinheiro(meta.guardado);
  elemento('status-meta').textContent = meta.status;
  elemento('prioridade-meta').textContent = meta.prioridade;
  if (meta.prazo) {
    elemento('prazo-meta').textContent = 'Prazo: ' + new Date(meta.prazo + 'T12:00:00').toLocaleDateString('pt-BR');
  } else {
    elemento('prazo-meta').textContent = 'Sem prazo definido';
  }
  elemento('observacoes-meta').textContent = meta.observacoes;
  elemento('icone-meta').textContent = meta.icone;
  elemento('percentual-meta').textContent = porcentagem(meta) + '%';
  elemento('barra-meta').value = porcentagem(meta);
  mostrarFoto(elemento('foto-detalhe-meta'), meta.foto);
}

function removerMeta(meta) {
  if (!confirm('Remover a meta "' + meta.nome + '"?')) return;
  dados.metas = dados.metas.filter(function (item) { return item.id !== meta.id; });
  salvarDados();
  if (telaAtual === 'detalhes-meta') mostrarTela('objetivos', false);
  else atualizarTela();
}

elemento('editar-meta').addEventListener('click', function () { abrirFormularioMeta(metaSelecionada); });
elemento('excluir-meta').addEventListener('click', function () { removerMeta(metaSelecionada); });
elemento('concluir-meta').addEventListener('click', function () {
  metaSelecionada.status = 'Concluído';
  salvarDados();
  atualizarTela();
});
elemento('adicionar-valor').addEventListener('click', function () {
  const resposta = prompt('Quanto deseja adicionar? Ex.: 150,50');
  if (resposta === null) return;
  const valor = Number(resposta.replace(',', '.'));
  if (!Number.isFinite(valor) || valor <= 0) return avisar('Digite um valor maior que zero.');
  metaSelecionada.guardado += valor;
  salvarDados();
  atualizarTela();
});

// 5. TAREFAS E FOGUINHO ------------------------------------------------
function atualizarDia() {
  const hoje = dataLocal(new Date());
  if (dados.diaTarefas === hoje) return;
  dados.tarefas.forEach(function (tarefa) { tarefa.feita = false; });
  dados.diaTarefas = hoje;
  salvarDados();
}

function atualizarFoguinho() {
  const obrigatorias = dados.tarefas.filter(function (tarefa) { return tarefa.obrigatoria; });
  const completas = obrigatorias.every(function (tarefa) { return tarefa.feita; });
  const hoje = dataLocal(new Date());
  dados.diasCompletos = dados.diasCompletos.filter(function (dia) { return dia !== hoje; });
  if (completas && obrigatorias.length > 0) dados.diasCompletos.push(hoje);
}

function contarSequencia() {
  let total = 0;
  const dia = new Date();
  // Antes de terminar hoje, a sequência de ontem ainda está válida.
  if (!dados.diasCompletos.includes(dataLocal(dia))) dia.setDate(dia.getDate() - 1);
  while (dados.diasCompletos.includes(dataLocal(dia))) {
    total++;
    dia.setDate(dia.getDate() - 1);
  }
  return total;
}

function listarTarefas() {
  const lista = elemento('lista-tarefas');
  lista.replaceChildren();
  dados.tarefas.forEach(function (tarefa) {
    const linha = copiarModelo('modelo-tarefa');
    const caixa = linha.querySelector('input');
    const titulo = linha.querySelector('label');
    caixa.id = 'tarefa-' + tarefa.id;
    caixa.checked = tarefa.feita;
    titulo.htmlFor = caixa.id;
    titulo.textContent = tarefa.nome;
    titulo.classList.toggle('strike', tarefa.feita);
    linha.querySelector('.task-ic').textContent = tarefa.icone;
    linha.querySelector('.s').textContent = tarefa.categoria + (tarefa.obrigatoria ? ' · Obrigatória' : ' · Extra');
    caixa.addEventListener('change', function () {
      atualizarDia();
      tarefa.feita = caixa.checked;
      atualizarFoguinho();
      salvarDados();
      atualizarTela();
    });
    const remover = linha.querySelector('.remove-btn');
    remover.hidden = tarefa.obrigatoria;
    remover.addEventListener('click', function () {
      if (tarefa.obrigatoria) return;
      if (!confirm('Remover "' + tarefa.nome + '"?')) return;
      dados.tarefas = dados.tarefas.filter(function (item) { return item.id !== tarefa.id; });
      salvarDados();
      atualizarTela();
    });
    lista.appendChild(linha);
  });
}

elemento('adicionar-tarefa').addEventListener('click', function () {
  const nome = prompt('Nome da nova tarefa:');
  if (!nome || !nome.trim()) return;
  dados.tarefas.push({ id: Date.now(), nome: nome.trim(), categoria: 'Pessoal', icone: '⭐', obrigatoria: false, feita: false });
  salvarDados();
  atualizarTela();
});

function listarHistorico() {
  const lista = elemento('lista-historico');
  lista.replaceChildren();
  dados.diasCompletos.slice().sort().reverse().forEach(function (dia) {
    const linha = document.createElement('p');
    linha.className = 'kv-row';
    linha.textContent = '🔥 ' + dia.split('-').reverse().join('/') + ' — obrigatórias concluídas';
    lista.appendChild(linha);
  });
  mensagemVazia(lista, 'Seu histórico aparece depois de completar as obrigatórias.');
}

// 6. CALENDÁRIO: cada evento usa dia, mês e ano --------------------------
function montarCalendario() {
  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();
  elemento('mes-calendario').textContent = mesExibido.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const grade = elemento('dias-calendario');
  grade.replaceChildren();
  const inicio = new Date(ano, mes, 1).getDay();
  const quantidade = new Date(ano, mes + 1, 0).getDate();
  for (let espaco = 0; espaco < inicio; espaco++) grade.appendChild(document.createElement('span'));
  for (let numero = 1; numero <= quantidade; numero++) {
    const data = new Date(ano, mes, numero);
    const chave = dataLocal(data);
    const botao = document.createElement('button');
    botao.className = 'cal-day';
    botao.textContent = numero;
    botao.classList.toggle('today', chave === dataLocal(dataSelecionada));
    botao.setAttribute('aria-label', data.toLocaleDateString('pt-BR'));
    botao.setAttribute('aria-pressed', chave === dataLocal(dataSelecionada));
    if (dados.eventos.some(function (evento) { return evento.data === chave; })) {
      const ponto = document.createElement('span');
      ponto.className = 'evt-dot';
      botao.appendChild(ponto);
    }
    botao.addEventListener('click', function () { dataSelecionada = data; montarCalendario(); });
    grade.appendChild(botao);
  }
  elemento('data-eventos').textContent = dataSelecionada.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const lista = elemento('lista-eventos');
  lista.replaceChildren();
  dados.eventos.forEach(function (evento) {
    if (evento.data !== dataLocal(dataSelecionada)) return;
    const linha = copiarModelo('modelo-evento');
    linha.querySelector('.evt-time').textContent = evento.hora;
    linha.querySelector('.evt-title').textContent = evento.nome;
    linha.querySelector('button').addEventListener('click', function () {
      if (!confirm('Remover o evento "' + evento.nome + '"?')) return;
      dados.eventos = dados.eventos.filter(function (item) { return item.id !== evento.id; });
      salvarDados();
      montarCalendario();
    });
    lista.appendChild(linha);
  });
  mensagemVazia(lista, 'Nenhum evento neste dia.');
}

function mudarMes(direcao) {
  mesExibido.setMonth(mesExibido.getMonth() + direcao);
  dataSelecionada = new Date(mesExibido.getFullYear(), mesExibido.getMonth(), 1);
  montarCalendario();
}
elemento('mes-anterior').addEventListener('click', function () { mudarMes(-1); });
elemento('mes-seguinte').addEventListener('click', function () { mudarMes(1); });
elemento('adicionar-evento').addEventListener('click', function () {
  const nome = prompt('Nome do evento:');
  if (!nome || !nome.trim()) return;
  const hora = prompt('Horário (ex.: 14:00):', '12:00');
  if (hora === null) return;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return avisar('Use um horário válido, como 14:00.');
  dados.eventos.push({ id: Date.now(), nome: nome.trim(), hora: hora, data: dataLocal(dataSelecionada) });
  salvarDados();
  montarCalendario();
});

// 7. PERFIL E FOTOS ----------------------------------------------------
elemento('abrir-edicao-perfil').addEventListener('click', function () {
  elemento('form-perfil').reset();
  elemento('perfil-nome').value = dados.perfil.name;
  elemento('perfil-bio').value = dados.perfil.bio;
  elemento('perfil-letra').value = dados.perfil.avatar;
  elemento('previa-letra').textContent = dados.perfil.avatar;
  fotoPerfil = dados.perfil.photo || '';
  mostrarFoto(elemento('previa-perfil'), fotoPerfil);
  elemento('previa-letra').hidden = !elemento('previa-perfil').hidden;
  mostrarTela('editar-perfil');
});

elemento('perfil-letra').addEventListener('input', function () {
  elemento('previa-letra').textContent = elemento('perfil-letra').value || 'F';
});

elemento('form-perfil').addEventListener('submit', function (evento) {
  evento.preventDefault();
  if (uploadsPendentes > 0) return avisar('Aguarde a foto terminar de carregar.');
  const nome = elemento('perfil-nome').value.trim();
  if (!nome) return avisar('Digite seu nome.');
  dados.perfil = { name: nome, bio: elemento('perfil-bio').value, avatar: elemento('perfil-letra').value || nome[0], photo: fotoPerfil };
  if (!salvarDados()) return;
  voltar();
  avisar('Perfil salvo!');
});

// O recorte e a leitura da imagem estão em fotos.js, para manter este arquivo simples.

elemento('meta-foto').addEventListener('change', function () {
  carregarFoto(this, function (foto) { fotoMeta = foto; mostrarFoto(elemento('previa-meta'), foto); });
});
elemento('perfil-foto').addEventListener('change', function () {
  carregarFoto(this, function (foto) {
    fotoPerfil = foto;
    mostrarFoto(elemento('previa-perfil'), foto);
    elemento('previa-letra').hidden = true;
  });
});

// 8. LIVROS: filtros, favoritos e acompanhamento da leitura --------------
// Cada cadastro é um objeto. A lista dados.livros guarda esses objetos.
// Editamos uma cópia: cancelar o formulário não modifica o livro original.
function abrirFormularioLivro(livro) {
  if (uploadsPendentes > 0) return avisar('Aguarde a foto terminar de carregar.');
  livroEmEdicao = livro;
  fotoLivro = '';
  elemento('form-livro').reset();
  elemento('titulo-formulario-livro').textContent = 'Nova meta de leitura';
  elemento('livro-prioridade').value = 'Média';
  elemento('livro-status').value = 'quero';

  if (livro) {
    elemento('titulo-formulario-livro').textContent = 'Editar meta de leitura';
    elemento('livro-titulo').value = livro.titulo;
    elemento('livro-autor').value = livro.autor;
    elemento('livro-prioridade').value = livro.prioridade || 'Média';
    elemento('livro-status').value = livro.status;
    elemento('livro-descricao').value = livro.descricao;
    fotoLivro = livro.foto || '';
  }

  mostrarFoto(elemento('previa-livro'), fotoLivro);
  mostrarTela('formulario-livro');
}

elemento('novo-livro').addEventListener('click', function () {
  abrirFormularioLivro(null);
});
elemento('editar-livro').addEventListener('click', function () {
  abrirFormularioLivro(livroSelecionado);
});
elemento('livro-foto').addEventListener('change', function () {
  // Reaproveita a mesma função de fotos do perfil e das metas.
  carregarFoto(this, function (foto) {
    fotoLivro = foto;
    mostrarFoto(elemento('previa-livro'), foto);
  });
});

elemento('form-livro').addEventListener('submit', function (evento) {
  evento.preventDefault();
  if (uploadsPendentes > 0) return avisar('Aguarde a foto terminar de carregar.');
  const titulo = elemento('livro-titulo').value.trim();
  if (!titulo) return avisar('Digite o título do livro.');

  const livro = {
    id: Date.now(),
    titulo: titulo,
    autor: elemento('livro-autor').value.trim(),
    prioridade: elemento('livro-prioridade').value,
    status: elemento('livro-status').value,
    descricao: elemento('livro-descricao').value.trim(),
    foto: fotoLivro,
    categoria: 'Meta de leitura',
    cor: '#d8c9a3',
    nota: '',
    biblioteca: true,
    favorito: false
  };

  // slice cria uma cópia da lista, para recuperar caso o navegador não salve.
  const listaAnterior = dados.livros.slice();
  if (livroEmEdicao) {
    livro.id = livroEmEdicao.id;
    livro.favorito = livroEmEdicao.favorito;
    livro.biblioteca = livroEmEdicao.biblioteca;
    livro.nota = livroEmEdicao.nota;
    livro.cor = livroEmEdicao.cor;
    livro.categoria = livroEmEdicao.categoria;
    for (let i = 0; i < dados.livros.length; i++) {
      if (dados.livros[i].id === livro.id) dados.livros[i] = livro;
    }
  } else {
    dados.livros.unshift(livro);
  }

  if (!salvarDados()) {
    dados.livros = listaAnterior;
    return;
  }
  livroSelecionado = livro;
  historico = ['inicio', 'livros'];
  mostrarTela('detalhes-livro', false);
  avisar('Meta de leitura salva!');
});

function apagarLivro(livro) {
  if (!livro) return;
  if (!confirm('Apagar "' + livro.titulo + '" da sua lista de livros?')) return;

  const listaAnterior = dados.livros;
  const livrosRestantes = [];
  // Copiamos somente os livros que NÃO foram escolhidos para apagar.
  for (const item of dados.livros) {
    if (item.id !== livro.id) livrosRestantes.push(item);
  }
  dados.livros = livrosRestantes;
  if (!salvarDados()) {
    dados.livros = listaAnterior;
    return;
  }
  livroSelecionado = null;
  historico = ['inicio'];
  mostrarTela('livros', false);
  avisar('Livro apagado.');
}

elemento('excluir-livro').addEventListener('click', function () {
  apagarLivro(livroSelecionado);
});

// Uma condição por linha facilita entender cada filtro.
function livroCombinaComFiltro(livro, busca) {
  if (filtroLivros === 'biblioteca' && !livro.biblioteca) return false;
  if (filtroLivros === 'favoritos' && !livro.favorito) return false;
  if (filtroLivros === 'quero' && livro.status !== 'quero') return false;
  if (filtroLivros === 'lendo' && livro.status !== 'lendo') return false;
  if (filtroLivros === 'concluidos' && livro.status !== 'concluidos') return false;
  const texto = livro.titulo + ' ' + livro.autor + ' ' + livro.categoria;
  return texto.toLowerCase().includes(busca);
}

function listarLivros() {
  const lista = elemento('lista-livros');
  const busca = elemento('busca-livros').value.toLowerCase();
  lista.replaceChildren();
  dados.livros.forEach(function (livro) {
    if (!livroCombinaComFiltro(livro, busca)) return;
    const linha = copiarModelo('modelo-livro');
    linha.querySelector('.texto-capa').textContent = livro.titulo;
    mostrarFoto(linha.querySelector('.imagem-capa'), livro.foto);
    linha.querySelector('.texto-capa').hidden = !linha.querySelector('.imagem-capa').hidden;
    linha.querySelector('.book-cover').setAttribute('aria-label', 'Abrir ' + livro.titulo);
    linha.querySelector('.book-cover').style.backgroundColor = livro.cor;
    linha.querySelector('.name').textContent = livro.titulo;
    linha.querySelector('.auth').textContent = livro.autor;
    if (livro.nota) linha.querySelector('.rate').textContent = '★★★★★ (' + livro.nota + ')';
    else linha.querySelector('.rate').hidden = true;
    linha.querySelector('.prioridade-leitura').textContent = 'Prioridade: ' + (livro.prioridade || 'Média');
    linha.querySelector('.apagar-livro').addEventListener('click', function () {
      apagarLivro(livro);
    });
    linha.querySelectorAll('.abrir').forEach(function (botao) {
      botao.addEventListener('click', function () { livroSelecionado = livro; mostrarTela('detalhes-livro'); });
    });
    const favorito = linha.querySelector('.fav-btn');
    favorito.textContent = livro.favorito ? '♥' : '♡';
    favorito.classList.toggle('on', livro.favorito);
    favorito.setAttribute('aria-pressed', livro.favorito);
    favorito.addEventListener('click', function () { livro.favorito = !livro.favorito; salvarDados(); listarLivros(); });
    lista.appendChild(linha);
  });
  mensagemVazia(lista, 'Nenhum livro nesta seleção.');
}

document.querySelectorAll('[data-filtro]').forEach(function (botao) {
  botao.addEventListener('click', function () {
    filtroLivros = botao.dataset.filtro;
    document.querySelectorAll('[data-filtro]').forEach(function (item) { item.classList.toggle('sel', item === botao); });
    elemento('titulo-lista-livros').textContent = botao.textContent;
    listarLivros();
  });
});
elemento('busca-livros').addEventListener('input', listarLivros);

function mostrarDetalhesLivro() {
  const livro = livroSelecionado;
  if (!livro) return mostrarTela('livros', false);
  elemento('titulo-livro').textContent = livro.titulo;
  elemento('texto-capa-livro').textContent = livro.titulo;
  mostrarFoto(elemento('foto-detalhe-livro'), livro.foto);
  elemento('texto-capa-livro').hidden = !elemento('foto-detalhe-livro').hidden;
  elemento('capa-livro').style.backgroundColor = livro.cor;
  elemento('autor-livro').textContent = livro.autor;
  elemento('nota-livro').hidden = !livro.nota;
  if (livro.nota) elemento('nota-livro').textContent = '★★★★★ (' + livro.nota + ')';
  elemento('prioridade-detalhe-livro').textContent = 'Prioridade: ' + (livro.prioridade || 'Média');
  elemento('categoria-livro').textContent = livro.categoria;
  elemento('descricao-livro').textContent = livro.descricao;
  elemento('status-leitura').value = livro.status;
  // if/else: se a condição for verdadeira, usa o primeiro texto; senão, o outro.
  if (livro.biblioteca) elemento('biblioteca-livro').textContent = 'Remover da biblioteca';
  else elemento('biblioteca-livro').textContent = 'Adicionar à biblioteca';

  if (livro.favorito) elemento('favoritar-livro').textContent = '♥ Remover dos favoritos';
  else elemento('favoritar-livro').textContent = '♡ Favoritar';

  if (livro.status === 'lendo') elemento('ler-livro').textContent = '📖 Você está lendo';
  else elemento('ler-livro').textContent = '📖 Marcar como lendo';
  const pesquisa = encodeURIComponent(livro.titulo + ' ' + livro.autor);
  elemento('loja-amazon').href = 'https://www.amazon.com.br/s?k=' + pesquisa;
  elemento('loja-estante').href = 'https://www.estantevirtual.com.br/busca?q=' + pesquisa;
}

elemento('status-leitura').addEventListener('change', function () {
  livroSelecionado.status = this.value;
  if (this.value !== 'explorar') livroSelecionado.biblioteca = true;
  salvarDados();
  mostrarDetalhesLivro();
});
elemento('ler-livro').addEventListener('click', function () {
  livroSelecionado.status = 'lendo';
  livroSelecionado.biblioteca = true;
  salvarDados();
  mostrarDetalhesLivro();
});
elemento('biblioteca-livro').addEventListener('click', function () {
  livroSelecionado.biblioteca = !livroSelecionado.biblioteca;
  salvarDados();
  mostrarDetalhesLivro();
});
elemento('favoritar-livro').addEventListener('click', function () {
  livroSelecionado.favorito = !livroSelecionado.favorito;
  salvarDados();
  mostrarDetalhesLivro();
});

// 9. RESUMOS DA PÁGINA INICIAL E PERFIL ---------------------------------
function atualizarResumo() {
  let soma = 0;
  let concluidas = 0;
  dados.metas.forEach(function (meta) {
    soma += porcentagem(meta);
    if (meta.status === 'Concluído') concluidas++;
  });
  const media = dados.metas.length ? Math.round(soma / dados.metas.length) : 0;
  elemento('progresso-geral').textContent = media + '%';
  elemento('barra-geral').value = media;
  elemento('total-metas').textContent = '🚩 ' + (dados.metas.length - concluidas) + ' metas ativas';
  elemento('metas-concluidas').textContent = concluidas;
  const feitas = dados.tarefas.filter(function (tarefa) { return tarefa.feita; }).length;
  elemento('resumo-tarefas').textContent = feitas + '/' + dados.tarefas.length + ' tarefas';
  elemento('total-diarias').textContent = feitas + ' / ' + dados.tarefas.length;
  elemento('barra-diarias').value = dados.tarefas.length ? feitas / dados.tarefas.length * 100 : 0;
  elemento('notificacao-tarefas').textContent = 'Você completou ' + feitas + ' de ' + dados.tarefas.length + ' tarefas hoje.';
  elemento('nome-inicio').textContent = dados.perfil.name.split(' ')[0];
  elemento('mensagem-inicio').textContent = mensagemDeProgresso();
  elemento('nome-perfil').textContent = dados.perfil.name;
  elemento('bio-perfil').textContent = dados.perfil.bio;
  document.querySelectorAll('.foto-perfil').forEach(function (imagem) { mostrarFoto(imagem, dados.perfil.photo); });
  document.querySelectorAll('.letra-perfil').forEach(function (letra) {
    letra.textContent = dados.perfil.avatar;
    letra.hidden = Boolean(dados.perfil.photo);
  });
  const sequencia = contarSequencia();
  const nivel = Math.min(4, Math.floor(sequencia / 30) + 1);
  elemento('nivel-perfil').textContent = nivel;
  document.querySelectorAll('.dias-sequencia').forEach(function (texto) { texto.textContent = sequencia; });
  document.querySelectorAll('.level-card').forEach(function (cartao, indice) { cartao.classList.toggle('active', indice + 1 === nivel); });
  document.querySelectorAll('.fogo').forEach(function (fogo) {
    fogo.className = 'fogo nivel-' + nivel;
    fogo.classList.toggle('apagado', !dados.diasCompletos.includes(dataLocal(new Date())));
  });
}

elemento('sair').addEventListener('click', function () {
  avisar('Ainda não há login. Seus dados ficam somente neste navegador.');
});

// Ao retornar ao site ou virar o dia, renova as tarefas sem apagar o histórico.
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) atualizarTela();
});
window.setInterval(function () {
  if (dados.diaTarefas !== dataLocal(new Date())) atualizarTela();
}, 60000);
mostrarTela('inicio', false);
