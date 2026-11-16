// Cadastro e edição de uma receita de um pet, com anexos (PDF ou imagem).
import { carregarPets, definirReceitasDoBanco, listarPets } from './armazenamento.js';
import { atualizarReceitaApi, cadastrarReceitaApi } from './api.js';

const LIMITES = { nome: 150, veterinario: 150, anexos: 10, bytesTotais: 1024 * 1024 };
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const formulario = document.querySelector('.formulario-receita');
const campos = {
    pet: document.getElementById('pet-receita'),
    nome: document.getElementById('nome-receita'),
    veterinario: document.getElementById('veterinario-receita'),
    emissao: document.getElementById('emissao-receita'),
    validade: document.getElementById('validade-receita'),
    observacao: document.getElementById('observacao-receita'),
    anexos: document.getElementById('anexos-receita')
};
const listaSalvos = formulario.querySelector('[data-anexos-salvos]');
const botao = formulario.querySelector('[type="submit"]');
const aviso = document.getElementById('aviso-receita');
const resumoAnexos = document.getElementById('resumo-anexos-receita');

function atualizarResumoAnexos() {
    const arquivos = [...campos.anexos.files];
    resumoAnexos.textContent = arquivos.length === 0
        ? 'Nenhum arquivo selecionado'
        : arquivos.length === 1
            ? arquivos[0].name
            : `${arquivos.length} arquivos selecionados`;
}

const parametros = new URLSearchParams(location.search);
const idEdicao = parametros.get('id');
let receitaEmEdicao = null;
const anexosParaRemover = new Set();

function informar(mensagem, erro = false) {
    aviso.textContent = mensagem;
    aviso.dataset.estado = erro ? 'erro' : 'informativo';
}

function hojeLocal() {
    // Data de hoje no fuso de Brasília, a mesma que o servidor usa nas validações.
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
}

// Na edição, mostra os anexos já salvos com a opção de remover (ou manter) cada um.
function desenharAnexosSalvos() {
    const anexos = receitaEmEdicao?.anexos ?? [];
    listaSalvos.hidden = !anexos.length;
    listaSalvos.innerHTML = anexos.map(anexo => {
        const remover = anexosParaRemover.has(String(anexo.id));
        return `<li class="anexo-exame${remover ? ' anexo-exame--removido' : ''}"><a href="${escapar(anexo.url)}" target="_blank" rel="noopener noreferrer">${escapar(anexo.nome)}</a><button type="button" class="botao-texto" data-alternar-anexo="${escapar(anexo.id)}">${remover ? 'Manter' : 'Remover'}</button></li>`;
    }).join('');
}

listaSalvos.addEventListener('click', event => {
    const alvo = event.target.closest('[data-alternar-anexo]');
    if (!alvo) return;
    const id = alvo.dataset.alternarAnexo;
    if (anexosParaRemover.has(id)) anexosParaRemover.delete(id);
    else anexosParaRemover.add(id);
    desenharAnexosSalvos();
});

campos.anexos.addEventListener('change', atualizarResumoAnexos);

function lerArquivo(arquivo) {
    return new Promise((resolver, rejeitar) => {
        const leitor = new FileReader();
        leitor.onload = () => resolver({ nome: arquivo.name, tipo: arquivo.type, conteudo: leitor.result });
        leitor.onerror = () => rejeitar(new Error(`Não foi possível ler o arquivo ${arquivo.name}.`));
        leitor.readAsDataURL(arquivo);
    });
}

// Mesmas regras da API: nome obrigatório, emissão não futura, validade depois da emissão e anexos nos limites.
function validar(arquivos) {
    const nome = campos.nome.value.trim();
    const emissao = campos.emissao.value;
    const validade = campos.validade.value;
    if (!campos.pet.value) return { erro: 'Selecione o pet.', campo: campos.pet };
    if (!nome || nome.length > LIMITES.nome) {
        return { erro: `Informe a receita ou o medicamento (até ${LIMITES.nome} caracteres).`, campo: campos.nome };
    }
    if (campos.veterinario.value.trim().length > LIMITES.veterinario) {
        return { erro: `O nome do veterinário pode ter até ${LIMITES.veterinario} caracteres.`, campo: campos.veterinario };
    }
    if (emissao && emissao > hojeLocal()) {
        return { erro: 'A data de emissão não pode ser no futuro.', campo: campos.emissao };
    }
    if (emissao && validade && validade < emissao) {
        return { erro: 'A validade não pode ser antes da emissão.', campo: campos.validade };
    }
    if (arquivos.some(arquivo => !TIPOS.includes(arquivo.type))) {
        return { erro: 'Envie o arquivo em PDF, JPG, PNG ou WEBP.', campo: campos.anexos };
    }
    const mantidos = (receitaEmEdicao?.anexos ?? []).filter(anexo => !anexosParaRemover.has(String(anexo.id)));
    if (mantidos.length + arquivos.length > LIMITES.anexos) {
        return { erro: `A receita pode ter até ${LIMITES.anexos} anexos.`, campo: campos.anexos };
    }
    const bytes = mantidos.reduce((soma, anexo) => soma + Number(anexo.tamanho || 0), 0) +
        arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);
    if (bytes > LIMITES.bytesTotais) {
        return { erro: 'Os anexos precisam ter até 1 MB no total.', campo: campos.anexos };
    }
    return { nome };
}

formulario.addEventListener('submit', async event => {
    event.preventDefault();
    const arquivos = [...campos.anexos.files];
    const validacao = validar(arquivos);
    if (validacao.erro) {
        informar(validacao.erro, true);
        validacao.campo?.focus();
        return;
    }

    botao.disabled = true;
    informar('Salvando...');
    try {
        const dados = {
            nome: validacao.nome,
            veterinario: campos.veterinario.value.trim(),
            dataEmissao: campos.emissao.value,
            dataValidade: campos.validade.value,
            observacao: campos.observacao.value.trim(),
            anexos: await Promise.all(arquivos.map(lerArquivo))
        };
        const petId = campos.pet.value;
        if (receitaEmEdicao) {
            definirReceitasDoBanco(await atualizarReceitaApi(receitaEmEdicao.id, {
                ...dados,
                removerAnexos: [...anexosParaRemover].map(Number)
            }));
        } else {
            definirReceitasDoBanco((await cadastrarReceitaApi({ ...dados, petId: Number(petId) })).receitas);
        }
        location.href = `receitas.html?petId=${encodeURIComponent(petId)}`;
    } catch (erro) {
        botao.disabled = false;
        informar(erro.message || 'Não foi possível salvar a receita.', true);
    }
});

async function iniciar() {
    campos.emissao.max = hojeLocal();
    try {
        await carregarPets({ reutilizar: true });
        const pets = listarPets();
        for (const pet of pets) campos.pet.add(new Option(pet.nome, pet.id));
        if (!pets.length) {
            informar('Cadastre um pet antes de adicionar receitas.', true);
            return;
        }

        if (idEdicao) {
            const dono = pets.find(pet => (pet.receitas ?? []).some(receita => String(receita.id) === idEdicao));
            receitaEmEdicao = dono?.receitas.find(receita => String(receita.id) === idEdicao) ?? null;
            if (!receitaEmEdicao) {
                informar('Receita não encontrada.', true);
                return;
            }
            campos.pet.value = dono.id;
            campos.pet.disabled = true;
            campos.nome.value = receitaEmEdicao.nome;
            campos.veterinario.value = receitaEmEdicao.veterinario || '';
            campos.emissao.value = receitaEmEdicao.dataEmissao || '';
            campos.validade.value = receitaEmEdicao.dataValidade || '';
            campos.observacao.value = receitaEmEdicao.observacao || '';
            botao.textContent = 'Salvar alterações';
            desenharAnexosSalvos();
        } else {
            const petUrl = pets.find(pet => pet.id === parametros.get('petId'));
            if (petUrl) campos.pet.value = petUrl.id;
            else if (pets.length === 1) campos.pet.value = pets[0].id;
        }
        atualizarResumoAnexos();
        botao.disabled = false;
    } catch (erro) {
        informar(erro.message || 'Não foi possível carregar os pets.', true);
    }
}

iniciar();
