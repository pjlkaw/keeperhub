export function criarSelecaoMultipla(seletor) {
    const campo = document.createElement('fieldset');
    campo.className = 'selecao-pets';
    campo.hidden = true;
    campo.innerHTML = '<legend>Quais pets?</legend><div class="selecao-pets__lista"></div>';
    const lista = campo.lastElementChild;
    seletor.after(campo);
    campo.addEventListener('change', () => {
        if (seletor.value === '__todos__') {
            const podeEscolherVarios = [...seletor.options].some(opcao => opcao.value === '__selecionar__');
            seletor.value = podeEscolherVarios ? '__selecionar__' : lista.querySelector(':checked')?.value ?? '';
        }
        seletor.dispatchEvent(new Event('change'));
    });

    return {
        preparar(pets, incluirTodos = false) {
            const marcados = new Set([...lista.querySelectorAll(':checked')].map(input => input.value));
            if (pets.length > 2 || (incluirTodos && pets.length > 1)) seletor.add(new Option('Todos os pets', '__todos__'));
            if (pets.length > 2) seletor.add(new Option('Selecionar vários pets…', '__selecionar__'));
            lista.replaceChildren(...pets.map(pet => {
                const opcao = document.createElement('label');
                opcao.className = 'cartao-opcao';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.value = pet.id;
                input.checked = marcados.has(pet.id);
                opcao.append(input, document.createTextNode(pet.nome));
                return opcao;
            }));
        },

        selecionados(pets) {
            const todos = seletor.value === '__todos__';
            campo.hidden = !todos && seletor.value !== '__selecionar__';
            if (todos) lista.querySelectorAll('input').forEach(input => { input.checked = true; });
            else if (seletor.value !== '__selecionar__') {
                lista.querySelectorAll('input').forEach(input => {
                    input.checked = input.value === seletor.value;
                });
            }
            if (!campo.hidden) {
                const ids = new Set([...lista.querySelectorAll(':checked')].map(input => input.value));
                return pets.filter(pet => ids.has(pet.id));
            }
            return pets.filter(pet => pet.id === seletor.value);
        },

        selecionarPets(pets, ids) {
            const selecionados = new Set(ids);
            lista.querySelectorAll('input').forEach(input => {
                input.checked = selecionados.has(input.value);
                input.disabled = false;
            });
            seletor.disabled = false;
            if ([...seletor.options].some(opcao => opcao.value === '__selecionar__')) {
                seletor.value = '__selecionar__';
            } else if (ids.length === pets.length && [...seletor.options].some(opcao => opcao.value === '__todos__')) {
                seletor.value = '__todos__';
            } else {
                seletor.value = ids[0] ?? '';
            }
            campo.hidden = seletor.value !== '__selecionar__';
        }
    };
}

export function registrosDoPet(pet, campo) {
    return Array.isArray(pet?.[campo])
        ? pet[campo].filter(item => item && typeof item === 'object')
        : [];
}

export function agruparRegistros(pets, registros, estado = () => '') {
    const resultado = [];
    const grupos = new Map();

    for (const pet of pets) {
        for (const registro of registros(pet)) {
            const chave = registro.grupoId ? JSON.stringify([registro.grupoId, estado(registro)]) : null;
            let grupo = chave ? grupos.get(chave) : null;
            if (!grupo) {
                grupo = { ...registro, nomesPets: [], membros: [] };
                resultado.push(grupo);
                if (chave) grupos.set(chave, grupo);
            }
            grupo.nomesPets.push(pet.nome);
            grupo.membros.push({ pet, registro });
        }
    }
    return resultado;
}
