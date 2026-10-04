// Armazenamento temporário do módulo; será substituído pela API quando ela existir.
const prefixoChave = "keeperhub-medicamentos";

// Carrega registros locais e informa quando o conteúdo salvo não pode ser interpretado.
export function listarRegistros(tipo) {
    const chave = `${prefixoChave}-${tipo}-v1`;
    const conteudo = localStorage.getItem(chave);

    if (conteudo === null) {
        return [];
    }

    let registros;
    try {
        registros = JSON.parse(conteudo);
    } catch (erro) {
        throw new Error(`Não foi possível ler os dados locais de ${tipo}.`, { cause: erro });
    }

    if (!Array.isArray(registros)) {
        throw new Error(`Os dados locais de ${tipo} estão em um formato inválido.`);
    }

    return registros;
}

// Grava registros apenas neste navegador; a persistência em localStorage é provisória.
export function salvarRegistros(tipo, registros) {
    const chave = `${prefixoChave}-${tipo}-v1`;

    try {
        localStorage.setItem(chave, JSON.stringify(registros));
    } catch (erro) {
        throw new Error(`Não foi possível salvar ${tipo} neste navegador.`, { cause: erro });
    }
}

// Cria identificadores locais sem depender de serviços externos.
export function criarIdLocal() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
