// FOTOS — a parte gráfica fica separada das regras do site.
// Este arquivo usa as funções elemento e avisar, definidas em script.js.
// Canvas é uma área de desenho do HTML. Desenhamos a foto nela para recortar.

const area = elemento('area-recorte');
const janelaFoto = elemento('editor-foto');
let imagemAtual = null;
let entregarFoto = null;
let escalaInicial = 1;
let deslocamentoX = 0;
let deslocamentoY = 0;
let arrastando = false;
let ultimoX = 0;
let ultimoY = 0;

// 1. Abrir um arquivo escolhido no formulário.
function carregarFoto(campo, aoTerminar) {
  if (uploadsPendentes > 0) return avisar('Termine o ajuste da foto atual primeiro.');
  const arquivo = campo.files[0];
  if (!arquivo) return;
  const formatos = ['image/jpeg', 'image/png', 'image/webp'];
  if (!formatos.includes(arquivo.type) || arquivo.size > 8 * 1024 * 1024) {
    campo.value = '';
    return avisar('Escolha JPG, PNG ou WebP de até 8 MB.');
  }

  uploadsPendentes = 1;
  const leitor = new FileReader();
  leitor.onerror = falhaNaFoto;
  leitor.onload = function () { abrirImagem(leitor.result, campo.id, aoTerminar); };
  leitor.readAsDataURL(arquivo);
  campo.value = ''; // Permite escolher o mesmo arquivo novamente.
}

function falhaNaFoto() {
  uploadsPendentes = 0;
  imagemAtual = null;
  entregarFoto = null;
  if (janelaFoto.open) janelaFoto.close();
  avisar('Não foi possível abrir essa imagem. Tente outra foto.');
}

function abrirImagem(endereco, tipo, aoTerminar) {
  const imagem = new Image();
  imagem.onerror = falhaNaFoto;
  imagem.onload = function () {
    imagemAtual = imagem;
    entregarFoto = aoTerminar;
    // Metas e perfil usam um recorte quadrado; livros usam uma capa vertical.
    area.width = 280;
    area.height = 280;
    if (tipo === 'livro-foto') {
      area.width = 196;
      area.height = 280;
    }
    escalaInicial = Math.max(area.width / imagem.width, area.height / imagem.height);
    centralizarFoto();
    janelaFoto.showModal();
  };
  imagem.src = endereco;
}

// 2. Desenhar a prévia respeitando o zoom e a posição.
function desenharFoto() {
  if (!imagemAtual) return;
  const escala = escalaInicial * Number(elemento('zoom-foto').value);
  const largura = imagemAtual.width * escala;
  const altura = imagemAtual.height * escala;

  // Limites impedem arrastar a foto para fora e deixar um espaço vazio.
  const limiteX = (largura - area.width) / 2;
  const limiteY = (altura - area.height) / 2;
  deslocamentoX = Math.max(-limiteX, Math.min(limiteX, deslocamentoX));
  deslocamentoY = Math.max(-limiteY, Math.min(limiteY, deslocamentoY));
  const esquerda = (area.width - largura) / 2 + deslocamentoX;
  const topo = (area.height - altura) / 2 + deslocamentoY;

  const pincel = area.getContext('2d');
  pincel.fillStyle = '#ffffff';
  pincel.fillRect(0, 0, area.width, area.height);
  pincel.drawImage(imagemAtual, esquerda, topo, largura, altura);
}

function centralizarFoto() {
  deslocamentoX = 0;
  deslocamentoY = 0;
  elemento('zoom-foto').value = '1';
  desenharFoto();
}

// 3. Arrastar funciona com mouse e com o dedo no celular.
area.addEventListener('pointerdown', function (evento) {
  if (!imagemAtual) return;
  arrastando = true;
  ultimoX = evento.clientX;
  ultimoY = evento.clientY;
  area.setPointerCapture(evento.pointerId);
});
area.addEventListener('pointermove', function (evento) {
  if (!arrastando) return;
  const tamanhoNaTela = area.getBoundingClientRect();
  deslocamentoX += (evento.clientX - ultimoX) * area.width / tamanhoNaTela.width;
  deslocamentoY += (evento.clientY - ultimoY) * area.height / tamanhoNaTela.height;
  ultimoX = evento.clientX;
  ultimoY = evento.clientY;
  desenharFoto();
});
area.addEventListener('pointerup', pararArrasto);
area.addEventListener('pointercancel', pararArrasto);
area.addEventListener('lostpointercapture', pararArrasto);
function pararArrasto() { arrastando = false; }

// Também permite ajustar sem mouse: selecione a imagem com Tab e use as setas.
area.addEventListener('keydown', function (evento) {
  if (!evento.key.startsWith('Arrow')) return;
  evento.preventDefault();
  if (evento.key === 'ArrowLeft') deslocamentoX -= 10;
  if (evento.key === 'ArrowRight') deslocamentoX += 10;
  if (evento.key === 'ArrowUp') deslocamentoY -= 10;
  if (evento.key === 'ArrowDown') deslocamentoY += 10;
  desenharFoto();
});
elemento('zoom-foto').addEventListener('input', desenharFoto);
elemento('centralizar-foto').addEventListener('click', centralizarFoto);

// 4. Aplicar cria a foto recortada; o botão Salvar do formulário grava o cadastro.
elemento('aplicar-recorte').addEventListener('click', function () {
  if (!imagemAtual) return;
  try {
    const escala = escalaInicial * Number(elemento('zoom-foto').value);
    const esquerda = (area.width - imagemAtual.width * escala) / 2 + deslocamentoX;
    const topo = (area.height - imagemAtual.height * escala) / 2 + deslocamentoY;
    const resultado = document.createElement('canvas');
    const qualidade = 800 / Math.max(area.width, area.height);
    resultado.width = Math.round(area.width * qualidade);
    resultado.height = Math.round(area.height * qualidade);
    const pincel = resultado.getContext('2d');
    pincel.fillStyle = '#ffffff';
    pincel.fillRect(0, 0, resultado.width, resultado.height);
    pincel.drawImage(imagemAtual, esquerda * qualidade, topo * qualidade,
      imagemAtual.width * escala * qualidade, imagemAtual.height * escala * qualidade);
    entregarFoto(resultado.toDataURL('image/jpeg', 0.8));
    fecharEditor();
  } catch (erro) { falhaNaFoto(); }
});

function fecharEditor() {
  janelaFoto.close();
  uploadsPendentes = 0;
  imagemAtual = null;
  entregarFoto = null;
  arrastando = false;
}
elemento('cancelar-recorte').addEventListener('click', fecharEditor);
janelaFoto.addEventListener('cancel', function (evento) {
  evento.preventDefault();
  fecharEditor();
});

// 5. Ajustar uma foto já escolhida, sem precisar enviá-la novamente.
function ajustarFotoSalva(foto, tipo, aoTerminar) {
  if (uploadsPendentes > 0) return;
  if (!foto) return avisar('Escolha uma imagem primeiro.');
  uploadsPendentes = 1;
  abrirImagem(foto, tipo, aoTerminar);
}
elemento('ajustar-meta').addEventListener('click', function () {
  ajustarFotoSalva(fotoMeta, 'meta-foto', function (foto) {
    fotoMeta = foto;
    mostrarFoto(elemento('previa-meta'), foto);
  });
});
elemento('ajustar-perfil').addEventListener('click', function () {
  ajustarFotoSalva(fotoPerfil, 'perfil-foto', function (foto) {
    fotoPerfil = foto;
    mostrarFoto(elemento('previa-perfil'), foto);
    elemento('previa-letra').hidden = true;
  });
});
elemento('ajustar-livro').addEventListener('click', function () {
  ajustarFotoSalva(fotoLivro, 'livro-foto', function (foto) {
    fotoLivro = foto;
    mostrarFoto(elemento('previa-livro'), foto);
  });
});
