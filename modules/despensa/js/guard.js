const raiz = document.documentElement;

function mostrarErroValidacao() {
  raiz.classList.remove('module-access-pending');
  document.body.replaceChildren();

  const main = document.createElement('main');
  const titulo = document.createElement('h1');
  const mensagem = document.createElement('p');
  const link = document.createElement('a');

  titulo.textContent = 'Não foi possível validar o acesso';
  mensagem.textContent = 'Tente novamente em instantes ou volte ao KeeperHub.';
  link.href = '/main/hub/index.html';
  link.textContent = 'Voltar ao KeeperHub';
  main.append(titulo, mensagem, link);
  document.body.append(main);
}

try {
  const resposta = await fetch('/api/modulos/acesso', {
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (resposta.status === 401) {
    window.location.replace('/main/entrar/index.html');
  } else if (!resposta.ok) {
    throw new Error(`Validação de acesso falhou (HTTP ${resposta.status}).`);
  } else {
    const dados = await resposta.json();
    const temAcesso = Array.isArray(dados.modulos) &&
      dados.modulos.some((modulo) => modulo.codigo === 'despensa');

    if (!temAcesso) {
      window.location.replace('/main/compra/index.html');
    } else {
      raiz.classList.remove('module-access-pending');
      await import('../script.js');
      await import('./index.js');
    }
  }
} catch (erro) {
  console.error('[Despensa] Não foi possível validar o acesso:', erro);
  mostrarErroValidacao();
}
