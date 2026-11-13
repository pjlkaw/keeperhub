/* ==========================================================================
   KEEPERHUB — MÓDULO PETS
   Arquivo: rotinas.js
   Função: regras puras das rotinas (higiene, alimentar e lazer): catálogos,
   validação, ocorrência no dia e operações sobre a lista de refeições.
   Sem DOM, sem localStorage e sem importar o armazenamento.
   ========================================================================== */

export const TIPOS_ROTINA = ['higiene', 'alimentar', 'lazer'];

export const CATALOGO = {
    higiene: {
        atividades: {
            banho: 'Banho',
            banho_tosa: 'Banho e Tosa',
            corte_unha: 'Corte de Unha',
            escovacao: 'Escovação'
        },
        frequencias: {
            semanal: 'Semanal (7 dias)',
            quinzenal: 'A cada 15 dias',
            mensal: 'Mensal'
        }
    },
    alimentar: {
        refeicoes: {
            'cafe-da-manha': 'Café da manhã',
            almoco: 'Almoço',
            'cafe-da-tarde': 'Café da tarde',
            jantar: 'Jantar',
            outro: 'Outro'
        }
    },
    lazer: {
        atividades: {
            passeio: 'Passeio',
            brincadeira: 'Brincadeira',
            parque: 'Parque ou praça',
            creche: 'Creche / Day care',
            adestramento: 'Adestramento',
            outro: 'Outro'
        },
        frequencias: {
            diaria: 'Todo dia',
            dias_semana: 'Dias da semana',
            uma_vez: 'Uma vez'
        }
    }
};

const REGEX_HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;
const REGEX_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function temChave(objeto, chave) {
    return Object.prototype.hasOwnProperty.call(objeto, chave);
}

// Converte 'AAAA-MM-DD' em Date local (meia-noite). Retorna null se inválida.
function lerData(valor) {
    const partes = REGEX_DATA.exec(texto(valor));
    if (!partes) return null;
    const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
    const data = new Date(ano, mes - 1, dia);
    const valida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
    return valida ? data : null;
}

// Data local no formato AAAA-MM-DD (nunca usa UTC).
export function dataLocalISO(dia) {
    const mes = String(dia.getMonth() + 1).padStart(2, '0');
    const d = String(dia.getDate()).padStart(2, '0');
    return `${dia.getFullYear()}-${mes}-${d}`;
}

function diferencaEmDias(inicio, fim) {
    const inicioUtc = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const fimUtc = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate());
    return Math.round((fimUtc - inicioUtc) / 86400000);
}

function ultimoDiaDoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
}

export function validarRotina(tipo, dados) {
    const d = dados && typeof dados === 'object' ? dados : {};
    const erros = {};
    const registro = {};
    const catalogo = CATALOGO[tipo];

    if (!catalogo) {
        return { ok: false, erros: { tipo: 'Tipo de rotina inválido.' }, registro: null };
    }

    const horario = texto(d.horario);
    const observacao = texto(d.observacao);

    if (tipo === 'alimentar') {
        const refeicao = texto(d.refeicao);
        if (!temChave(catalogo.refeicoes, refeicao)) {
            erros.refeicao = 'Escolha a refeição.';
        } else if (refeicao === 'outro') {
            const outra = texto(d.refeicaoOutra);
            if (!outra) erros.refeicaoOutra = 'Informe o nome da refeição.';
            else registro.nome = outra;
        } else {
            registro.nome = catalogo.refeicoes[refeicao];
        }
        if (!REGEX_HORARIO.test(horario)) erros.horario = 'Informe um horário válido (HH:MM).';
        else registro.horario = horario;
        if (observacao) registro.observacao = observacao;
    } else {
        const atividade = texto(d.atividade);
        const frequencia = texto(d.frequencia);
        const data = texto(d.data);

        if (!temChave(catalogo.atividades, atividade)) {
            erros.atividade = 'Escolha a atividade.';
        } else {
            registro.atividade = atividade;
            if (tipo === 'lazer' && atividade === 'outro') {
                const outra = texto(d.atividadeOutra);
                if (!outra) erros.atividadeOutra = 'Informe qual é a atividade.';
                else registro.atividadeOutra = outra;
            }
        }

        if (!temChave(catalogo.frequencias, frequencia)) {
            erros.frequencia = 'Escolha a frequência.';
        } else {
            registro.frequencia = frequencia;
        }

        if (tipo === 'higiene' || frequencia === 'uma_vez') {
            if (!data) erros.data = 'Informe a data.';
            else if (!lerData(data)) erros.data = 'Informe uma data válida.';
            else registro.data = data;
        }

        if (tipo === 'lazer' && frequencia === 'dias_semana') {
            const dias = Array.isArray(d.diasSemana) ? d.diasSemana : [];
            const validos = [...new Set(dias.map(Number))]
                .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
                .sort((a, b) => a - b);
            if (!validos.length) erros.diasSemana = 'Escolha pelo menos um dia da semana.';
            else registro.diasSemana = validos;
        }

        if (!REGEX_HORARIO.test(horario)) erros.horario = 'Informe um horário válido (HH:MM).';
        else registro.horario = horario;

        if (tipo === 'lazer') {
            const bruto = d.duracaoMin == null ? '' : String(d.duracaoMin).trim();
            if (bruto) {
                const minutos = Number(bruto);
                if (!/^\d+$/.test(bruto) || !Number.isInteger(minutos) || minutos < 1) {
                    erros.duracaoMin = 'Informe a duração em minutos (maior que zero).';
                } else {
                    registro.duracaoMin = minutos;
                }
            }
        }

        if (observacao) registro.observacao = observacao;
    }

    const ok = Object.keys(erros).length === 0;
    return { ok, erros, registro: ok ? registro : null };
}

export function ocorreNoDia(tipo, registro, dia) {
    if (!registro || typeof registro !== 'object' || !(dia instanceof Date)) return false;
    if (tipo === 'alimentar') return true;

    if (tipo === 'higiene') {
        const inicio = lerData(registro.data);
        if (!inicio) return false;
        const dias = diferencaEmDias(inicio, dia);
        if (dias < 0) return false;
        if (registro.frequencia === 'semanal') return dias % 7 === 0;
        if (registro.frequencia === 'quinzenal') return dias % 15 === 0;
        if (registro.frequencia === 'mensal') {
            const alvo = Math.min(inicio.getDate(), ultimoDiaDoMes(dia.getFullYear(), dia.getMonth()));
            return dia.getDate() === alvo;
        }
        return false;
    }

    if (tipo === 'lazer') {
        if (registro.frequencia === 'diaria') return true;
        if (registro.frequencia === 'dias_semana') {
            return Array.isArray(registro.diasSemana) && registro.diasSemana.map(Number).includes(dia.getDay());
        }
        if (registro.frequencia === 'uma_vez') return registro.data === dataLocalISO(dia);
        return false;
    }

    return false;
}

export function tituloRotina(tipo, registro) {
    if (!registro || typeof registro !== 'object') return '';
    if (tipo === 'alimentar') return registro.nome || '';
    if (tipo === 'lazer' && registro.atividade === 'outro') {
        return registro.atividadeOutra || CATALOGO.lazer.atividades.outro;
    }
    const atividades = CATALOGO[tipo]?.atividades;
    return atividades?.[registro.atividade] || '';
}

function entradasValidas(lista) {
    return Array.isArray(lista) ? lista.filter(item => item && typeof item === 'object') : [];
}

export function itensDoDia(pet, dia) {
    const itens = [];
    const fontes = {
        higiene: entradasValidas(pet?.rotinaHigiene),
        alimentar: entradasValidas(pet?.rotinaAlimentar?.refeicoes),
        lazer: entradasValidas(pet?.rotinaLazer)
    };
    for (const tipo of TIPOS_ROTINA) {
        for (const registro of fontes[tipo]) {
            if (typeof registro.horario !== 'string' || !registro.horario) continue;
            if (tipo === 'alimentar' && (typeof registro.nome !== 'string' || !registro.nome.trim())) continue;
            if (!ocorreNoDia(tipo, registro, dia)) continue;
            itens.push({
                tipo,
                registro,
                horario: registro.horario || '',
                titulo: tituloRotina(tipo, registro)
            });
        }
    }
    return itens.sort((a, b) => a.horario.localeCompare(b.horario));
}

function copiarRotinaAlimentar(rotinaAlimentar) {
    const base = rotinaAlimentar && typeof rotinaAlimentar === 'object' ? rotinaAlimentar : {};
    return { ...base, refeicoes: Array.isArray(base.refeicoes) ? [...base.refeicoes] : [] };
}

export function adicionarRefeicao(rotinaAlimentar, refeicao) {
    const novo = copiarRotinaAlimentar(rotinaAlimentar);
    novo.refeicoes.push(refeicao);
    return novo;
}

export function substituirRefeicao(rotinaAlimentar, id, dados) {
    const novo = copiarRotinaAlimentar(rotinaAlimentar);
    novo.refeicoes = novo.refeicoes.map(item => (item?.id === id ? { ...item, ...dados, id: item.id } : item));
    return novo;
}

export function removerRefeicao(rotinaAlimentar, id) {
    const novo = copiarRotinaAlimentar(rotinaAlimentar);
    novo.refeicoes = novo.refeicoes.filter(item => item?.id !== id);
    return novo;
}
