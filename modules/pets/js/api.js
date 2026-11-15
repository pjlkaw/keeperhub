// Chamadas à API de pets (api/modulos/pets-api.js). A sessão vai no cookie.
const URL_API = '/api/modulos/pets-api';

async function requisicao(url, opcoes = {}) {
    let resposta;
    try {
        resposta = await fetch(url, {
            credentials: 'same-origin',
            ...opcoes,
            headers: { 'Content-Type': 'application/json', ...opcoes.headers },
        });
    } catch (erro) {
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', { cause: erro });
    }

    if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro || 'Não foi possível acessar os pets.');
    }
    return resposta.status === 204 ? null : resposta.json();
}

function urlDoPet(id, acao) {
    const parametros = new URLSearchParams({ id: String(id) });
    if (acao) parametros.set('acao', acao);
    return `${URL_API}?${parametros}`;
}

export async function listarPetsApi() {
    const resposta = await requisicao(URL_API);
    return Array.isArray(resposta?.pets) ? resposta.pets : [];
}

export async function buscarPetApi(id) {
    return (await requisicao(urlDoPet(id))).pet;
}

// dados: { nome, especie, raca, dataNascimento, peso, genero, foto? }
export async function cadastrarPetApi(dados) {
    const resposta = await requisicao(URL_API, { method: 'POST', body: JSON.stringify(dados) });
    return resposta.pet;
}

export async function atualizarPetApi(id, dados) {
    const resposta = await requisicao(urlDoPet(id), { method: 'PUT', body: JSON.stringify(dados) });
    return resposta.pet;
}

export async function salvarTutorApi(id, { nomeTutor, telefone }) {
    const resposta = await requisicao(urlDoPet(id, 'tutor'), {
        method: 'PUT',
        body: JSON.stringify({ nomeTutor, telefone }),
    });
    return resposta.pet;
}

// dados: { petIds, nome, nomePersonalizado, data, frequencia, proximaDose, clinica, horario, observacao }
// Retorna as vacinas por pet e os IDs criados neste envio.
export async function cadastrarVacinaApi(dados) {
    return requisicao(`${URL_API}?acao=vacina`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

export async function atualizarVacinasApi(dados) {
    return requisicao(`${URL_API}?acao=vacina`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
}

export async function marcarVacinasAplicadasApi(ids) {
    return requisicao(`${URL_API}?acao=vacina-realizada`, {
        method: 'PUT',
        body: JSON.stringify({ ids }),
    });
}

export async function desfazerVacinasAplicadasApi(anteriores) {
    return requisicao(`${URL_API}?acao=vacina-desfazer-realizada`, {
        method: 'PUT',
        body: JSON.stringify({ anteriores }),
    });
}

export async function excluirVacinasApi(ids) {
    const resposta = await requisicao(`${URL_API}?acao=vacina`, {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
    });
    return resposta.vacinas;
}

// dados: { petIds, medico, especialidade, especialidadePersonalizada, clinica, data, horario, lembrar }
// Retorna as consultas por pet e os IDs criados neste envio.
export async function cadastrarConsultaApi(dados) {
    return requisicao(`${URL_API}?acao=consulta`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

export async function atualizarConsultasApi(dados) {
    return requisicao(`${URL_API}?acao=consulta`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
}

export async function excluirConsultasApi(ids) {
    const resposta = await requisicao(`${URL_API}?acao=consulta`, {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
    });
    return resposta.consultas;
}

export async function alterarLembreteConsultaApi(idConsulta, lembrar) {
    const resposta = await requisicao(urlDoPet(idConsulta, 'consulta-lembrete'), {
        method: 'PUT',
        body: JSON.stringify({ lembrar }),
    });
    return resposta.consulta;
}

export async function registrarConsultaRealizadaApi(idConsulta, resumo) {
    const resposta = await requisicao(urlDoPet(idConsulta, 'consulta-realizada'), {
        method: 'PUT',
        body: JSON.stringify({ resumo }),
    });
    return resposta.consulta;
}

export async function registrarConsultasRealizadasApi(ids, resumo) {
    const resposta = await requisicao(`${URL_API}?acao=consulta-realizada`, {
        method: 'PUT',
        body: JSON.stringify({ ids, resumo }),
    });
    return resposta.consultas;
}

// dados: { petIds, nome, tipoUso, dosagem, horarioDose, frequencia, dataFim, quantidadeEstoque, observacao }
// Retorna as medicações por pet e os IDs criados neste envio.
export async function cadastrarMedicacaoApi(dados) {
    return requisicao(`${URL_API}?acao=medicacao`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

// dados: os mesmos do cadastro + ids (registros editados) e petIdsOrigem (pet de cada id).
export async function atualizarMedicacoesApi(dados) {
    return requisicao(`${URL_API}?acao=medicacao`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
}

// concluida = false reabre o tratamento (usado pelo "Desfazer" da conclusão).
export async function concluirMedicacoesApi(ids, concluida = true) {
    const resposta = await requisicao(`${URL_API}?acao=medicacao-concluida`, {
        method: 'PUT',
        body: JSON.stringify({ ids, concluida }),
    });
    return resposta.medicacoes;
}

export async function excluirMedicacoesApi(ids) {
    const resposta = await requisicao(`${URL_API}?acao=medicacao`, {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
    });
    return resposta.medicacoes;
}

// dados: { petIds, descricao, categoria, valorCentavos (total), data, estabelecimento, observacoes }
// O valor total é dividido entre os pets. Retorna as despesas por pet e os IDs criados.
export async function cadastrarDespesaApi(dados) {
    return requisicao(`${URL_API}?acao=despesa`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

// dados: os mesmos do cadastro + ids (registros editados) e petIdsOrigem (pet de cada id).
export async function atualizarDespesasApi(dados) {
    return requisicao(`${URL_API}?acao=despesa`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
}

export async function excluirDespesasApi(ids) {
    const resposta = await requisicao(`${URL_API}?acao=despesa`, {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
    });
    return resposta.despesas;
}

// dados: { tipo ('higiene' | 'lazer' | 'alimentar'), petIds, ...campos da rotina validados em rotinas.js }.
// Retorna as rotinas por pet e os IDs criados.
export async function cadastrarRotinaApi(dados) {
    return requisicao(`${URL_API}?acao=rotina`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

// dados: os mesmos do cadastro + ids (registros editados) e petIdsOrigem (pet de cada id).
export async function atualizarRotinasApi(dados) {
    return requisicao(`${URL_API}?acao=rotina`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
}

export async function excluirRotinasApi(tipo, ids) {
    const resposta = await requisicao(`${URL_API}?acao=rotina`, {
        method: 'DELETE',
        body: JSON.stringify({ tipo, ids }),
    });
    return resposta.rotinas;
}

// Receitas: dados = { petId (só no cadastro), nome, veterinario, dataEmissao, dataValidade,
// observacao, anexos: [{ nome, tipo, conteudo (data URL) }], removerAnexos: [ids] (só na edição) }.
export async function cadastrarReceitaApi(dados) {
    return requisicao(`${URL_API}?acao=receita`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

export async function atualizarReceitaApi(id, dados) {
    const resposta = await requisicao(`${URL_API}?acao=receita&id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
    return resposta.receitas;
}

// concluida = true marca como concluída hoje; false reabre a receita.
export async function concluirReceitaApi(id, concluida = true) {
    const resposta = await requisicao(`${URL_API}?acao=receita-concluida&id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ concluida }),
    });
    return resposta.receitas;
}

export async function excluirReceitaApi(id) {
    const resposta = await requisicao(`${URL_API}?acao=receita&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    return resposta.receitas;
}

// Orçamento das despesas de um pet num mês ('AAAA-MM'), em centavos. Retorna { idDoPet: { mes: centavos } }.
export async function salvarOrcamentoApi(petId, mes, valorCentavos) {
    const resposta = await requisicao(`${URL_API}?acao=orcamento`, {
        method: 'PUT',
        body: JSON.stringify({ petId: Number(petId), mes, valorCentavos }),
    });
    return resposta.orcamentos;
}

// Exames: dados = { petId (só no cadastro), nome, data, resultado, observacao,
// anexos: [{ nome, tipo, conteudo (data URL) }], removerAnexos: [ids] (só na edição) }.
export async function cadastrarExameApi(dados) {
    return requisicao(`${URL_API}?acao=exame`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
}

export async function atualizarExameApi(id, dados) {
    const resposta = await requisicao(`${URL_API}?acao=exame&id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(dados),
    });
    return resposta.exames;
}

export async function excluirExameApi(id) {
    const resposta = await requisicao(`${URL_API}?acao=exame&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    return resposta.exames;
}

// Notas de comportamento: uma por pet, com data e hora definidas pelo servidor.
export async function cadastrarObservacaoApi(petId, texto) {
    return requisicao(`${URL_API}?acao=observacao`, {
        method: 'POST',
        body: JSON.stringify({ petId: Number(petId), texto }),
    });
}

export async function atualizarObservacaoApi(id, texto) {
    const resposta = await requisicao(`${URL_API}?acao=observacao&id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ texto }),
    });
    return resposta.observacoes;
}

export async function excluirObservacaoApi(id) {
    const resposta = await requisicao(`${URL_API}?acao=observacao&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    return resposta.observacoes;
}

export async function excluirPetApi(id) {
    await requisicao(urlDoPet(id), { method: 'DELETE' });
}
