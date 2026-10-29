const URL_API = '/api/modulos/medicamentos-api';
let medicamentosCache = null;
let registrosUsoCache = null;

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...opcoes.headers },
    ...opcoes,
  });
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new Error(corpo.erro || 'Não foi possível acessar os medicamentos.');
  }
  return resposta.status === 204 ? null : resposta.json();
}

export async function listarMedicamentosApi() {
  if (medicamentosCache) return medicamentosCache.map((item) => ({ ...item }));
  const resposta = await requisicao(URL_API);
  medicamentosCache = resposta.medicamentos.map(normalizarMedicamento);
  return medicamentosCache.map((item) => ({ ...item }));
}

export async function buscarMedicamentoApi(id) {
  const resposta = await requisicao(`${URL_API}?id=${encodeURIComponent(id)}`);
  const medicamento = normalizarMedicamento(resposta.medicamento);
  if (medicamentosCache) {
    medicamentosCache = medicamentosCache.filter((item) => item.id !== medicamento.id);
    medicamentosCache.push(medicamento);
  }
  return { ...medicamento };
}

export async function salvarMedicamentoApi(dados, id = null) {
  const resposta = await requisicao(id ? `${URL_API}?id=${encodeURIComponent(id)}` : URL_API, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(dados),
  });
  const medicamento = normalizarMedicamento(resposta.medicamento);
  if (medicamentosCache) {
    medicamentosCache = medicamentosCache.filter((item) => item.id !== medicamento.id);
    medicamentosCache.push(medicamento);
  }
  return { ...medicamento };
}

export async function registrarEntradaEstoqueApi(id, dados) {
  const resposta = await requisicao(`${URL_API}?id=${encodeURIComponent(id)}&acao=entrada`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  const medicamento = normalizarMedicamento(resposta.medicamento);
  if (medicamentosCache) {
    medicamentosCache = medicamentosCache.map((item) => item.id === medicamento.id ? medicamento : item);
  }
  return { ...medicamento };
}

export async function encerrarTratamentoApi(id) {
  const resposta = await requisicao(`${URL_API}?id=${encodeURIComponent(id)}&acao=encerrar`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const medicamento = normalizarMedicamento(resposta.medicamento);
  if (medicamentosCache) {
    medicamentosCache = medicamentosCache.filter((item) => item.id !== medicamento.id);
  }
  return medicamento;
}

export async function listarMovimentacoesEstoqueApi(id) {
  const resposta = await requisicao(`${URL_API}?id=${encodeURIComponent(id)}&acao=movimentacoes`);
  return resposta.eventos;
}

export async function listarHistoricoEstoqueApi() {
  const resposta = await requisicao(`${URL_API}?acao=historico`);
  return resposta.eventos;
}

export async function listarRegistrosUsoApi() {
  if (registrosUsoCache) return registrosUsoCache.map((registro) => ({ ...registro }));
  const resposta = await requisicao(`${URL_API}?acao=usos`);
  registrosUsoCache = resposta.registros.map(normalizarRegistroUso);
  return registrosUsoCache.map((registro) => ({ ...registro }));
}

export async function salvarRegistroUsoApi(dados) {
  const resposta = await requisicao(`${URL_API}?acao=uso`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  registrosUsoCache = resposta.registros.map(normalizarRegistroUso);
  return registrosUsoCache.map((registro) => ({ ...registro }));
}

export async function excluirMedicamentoApi(id) {
  await requisicao(`${URL_API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (medicamentosCache) {
    medicamentosCache = medicamentosCache.filter((item) => item.id !== String(id));
  }
}

function normalizarMedicamento(medicamento) {
  const { ativo, ...dados } = medicamento;
  return {
    ...dados,
    id: String(dados.id),
    status: dados.status || (ativo ? 'ativo' : 'encerrado'),
  };
}

function normalizarRegistroUso(registro) {
  return {
    ...registro,
    id: String(registro.id),
    medicamentoId: String(registro.medicamentoId),
    status: { tomado: 'tomada', perdido: 'sem-estoque', pendente: 'pendente' }[registro.status] || registro.status,
  };
}
