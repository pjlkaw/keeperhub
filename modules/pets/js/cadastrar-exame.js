// Cadastro e edição de um exame ou laudo de um pet, com anexos (PDF ou imagem).
import { carregarPets, definirExamesDoBanco, listarPets } from './armazenamento.js';
import { atualizarExameApi, cadastrarExameApi } from './api.js';

const LIMITES = { nome: 150, anexos: 10, bytesTotais: 1024 * 1024 };
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const formulario = document.querySelector('.formulario-exame');
const campos = {
    pet: document.getElementById('pet-exame'),
    tipo: document.getElementById('tipo-registro-exame'),
    nome: document.getElementById('nome-exame'),
    data: document.getElementById('data-exame'),
    resultado: document.getElementById('resultado-exame'),
    observacao: document.getElementById('observacao-exame'),
    anexos: document.getElementById('anexos-exame')
};
const listaSalvos = formulario.querySelector('[data-anexos-salvos]');
const botao = formulario.querySelector('[type="submit"]');
const aviso = document.getElementById('aviso-exame');
const resumoAnexos = document.getElementById('resumo-anexos-exame');

function atualizarTipoRegistro() {
    const laudo = campos.tipo.value === 'laudo';
    document.getElementById('rotulo-nome-exame').textContent = laudo ? 'Nome do laudo' : 'Nome do exame';
    campos.nome.placeholder = laudo ? 'Ex: Laudo dermatológico' : 'Ex: Hemograma completo';
    document.getElementById('rotulo-data-exame').textContent = laudo ? 'Data do laudo (opcional)' : 'Data do exame (opcional)';
    document.getElementById('rotulo-resultado-exame').textContent = laudo ? 'Resumo do laudo (opcional)' : 'Resultado (opcional)';
    campos.resultado.placeholder = laudo ? 'Resumo ou conclusão do laudo' : 'Ex: Valores dentro do normal';
    document.getElementById('rotulo-anexos-exame').textContent = laudo ? 'Arquivo do laudo (opcional)' : 'Anexos do exame (opcional)';
    botao.textContent = exameEmEdicao
        ? 'Salvar alterações'
        : laudo ? 'Salvar laudo' : 'Salvar exame';
    aviso.textContent = laudo ? 'O laudo será salvo na sua conta.' : 'O exame será salvo na sua conta.';
}

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
let exameEmEdicao = null;
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
    const anexos = exameEmEdicao?.anexos ?? [];
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

function lerArquivo(arquivo) {
    return new Promise((resolver, rejeitar) => {
        const leitor = new FileReader();
        leitor.onload = () => resolver({ nome: arquivo.name, tipo: arquivo.type, conteudo: leitor.result });
        leitor.onerror = () => rejeitar(new Error(`Não foi possível ler o arquivo ${arquivo.name}.`));
        leitor.readAsDataURL(arquivo);
    });
}

// Mesmas regras da API: nome obrigatório, data não futura e anexos dentro dos limites.
function validar(arquivos) {
    const nome = campos.nome.value.trim();
    const tipoRegistro = campos.tipo.value;
    if (!campos.pet.value) return { erro: 'Selecione o pet.', campo: campos.pet };
    if (!['exame', 'laudo'].includes(tipoRegistro)) {
        return { erro: 'Selecione se o registro é um exame ou laudo.', campo: campos.tipo };
    }
    if (!nome || nome.length > LIMITES.nome) {
        return { erro: `Informe o nome do ${tipoRegistro} (até ${LIMITES.nome} caracteres).`, campo: campos.nome };
    }
    if (campos.data.value && campos.data.value > hojeLocal()) {
        return { erro: `A data do ${tipoRegistro} não pode ser no futuro.`, campo: campos.data };
    }
    if (arquivos.some(arquivo => !TIPOS.includes(arquivo.type))) {
        return { erro: 'Envie o laudo em PDF, JPG, PNG ou WEBP.', campo: campos.anexos };
    }
    const mantidos = (exameEmEdicao?.anexos ?? []).filter(anexo => !anexosParaRemover.has(String(anexo.id)));
    if (mantidos.length + arquivos.length > LIMITES.anexos) {
        return { erro: `O ${tipoRegistro} pode ter até ${LIMITES.anexos} anexos.`, campo: campos.anexos };
    }
    const bytes = mantidos.reduce((soma, anexo) => soma + Number(anexo.tamanho || 0), 0) +
        arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);
    if (bytes > LIMITES.bytesTotais) {
        return { erro: 'Os anexos do exame precisam ter até 1 MB no total.', campo: campos.anexos };
    }
    return { nome, tipoRegistro };
}

campos.tipo.addEventListener('change', atualizarTipoRegistro);
campos.anexos.addEventListener('change', atualizarResumoAnexos);

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
            tipoRegistro: validacao.tipoRegistro,
            nome: validacao.nome,
            data: campos.data.value,
            resultado: campos.resultado.value.trim(),
            observacao: campos.observacao.value.trim(),
            anexos: await Promise.all(arquivos.map(lerArquivo))
        };
        const petId = campos.pet.value;
        if (exameEmEdicao) {
            definirExamesDoBanco(await atualizarExameApi(exameEmEdicao.id, {
                ...dados,
                removerAnexos: [...anexosParaRemover].map(Number)
            }));
        } else {
            definirExamesDoBanco((await cadastrarExameApi({ ...dados, petId: Number(petId) })).exames);
        }
        location.href = `consultas-exames.html?petId=${encodeURIComponent(petId)}`;
    } catch (erro) {
        botao.disabled = false;
        informar(erro.message || 'Não foi possível salvar o exame.', true);
    }
});

async function iniciar() {
    campos.data.max = hojeLocal();
    try {
        await carregarPets({ reutilizar: true });
        const pets = listarPets();
        for (const pet of pets) campos.pet.add(new Option(pet.nome, pet.id));
        if (!pets.length) {
            informar('Cadastre um pet antes de adicionar exames.', true);
            return;
        }

        if (idEdicao) {
            const dono = pets.find(pet => (pet.exames ?? []).some(exame => String(exame.id) === idEdicao));
            exameEmEdicao = dono?.exames.find(exame => String(exame.id) === idEdicao) ?? null;
            if (!exameEmEdicao) {
                informar('Exame não encontrado.', true);
                return;
            }
            campos.pet.value = dono.id;
            campos.pet.disabled = true;
            campos.tipo.value = exameEmEdicao.tipoRegistro || 'exame';
            campos.nome.value = exameEmEdicao.nome;
            campos.data.value = exameEmEdicao.data || '';
            campos.resultado.value = exameEmEdicao.resultado || '';
            campos.observacao.value = exameEmEdicao.observacao || '';
            botao.textContent = 'Salvar alterações';
            desenharAnexosSalvos();
        } else {
            const petUrl = pets.find(pet => pet.id === parametros.get('petId'));
            if (petUrl) campos.pet.value = petUrl.id;
            else if (pets.length === 1) campos.pet.value = pets[0].id;
        }
        atualizarTipoRegistro();
        atualizarResumoAnexos();
        botao.disabled = false;
    } catch (erro) {
        informar(erro.message || 'Não foi possível carregar os pets.', true);
    }
}

iniciar();
