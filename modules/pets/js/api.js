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
// Retorna as vacinas atualizadas, agrupadas pelo id do pet.
export async function cadastrarVacinaApi(dados) {
    const resposta = await requisicao(`${URL_API}?acao=vacina`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
    return resposta.vacinas ?? {};
}

// dados: { petIds, medico, especialidade, especialidadePersonalizada, clinica, data, horario, lembrar }
// Retorna as consultas atualizadas, agrupadas pelo id do pet.
export async function cadastrarConsultaApi(dados) {
    const resposta = await requisicao(`${URL_API}?acao=consulta`, {
        method: 'POST',
        body: JSON.stringify(dados),
    });
    return resposta.consultas ?? {};
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

export async function excluirPetApi(id) {
    await requisicao(urlDoPet(id), { method: 'DELETE' });
}
