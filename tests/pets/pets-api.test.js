import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarHandlerPets, validarPet, validarTutor } from '../../api/modulos/pets-api.js';

const HOJE = '2026-11-07';

function dadosValidos(extra = {}) {
    return {
        nome: 'Thor',
        especie: 'cachorro',
        raca: 'Vira-Lata',
        dataNascimento: '2022-05-10',
        peso: '12.5',
        genero: 'macho',
        ...extra
    };
}

test('validarPet aceita dados corretos e normaliza o peso', () => {
    const { dados, erro } = validarPet(dadosValidos(), HOJE);
    assert.equal(erro, undefined);
    assert.deepEqual(dados, {
        nome: 'Thor',
        especie: 'cachorro',
        raca: 'Vira-Lata',
        dataNascimento: '2022-05-10',
        peso: 12.5,
        genero: 'macho'
    });
});

test('validarPet recusa dados inválidos', () => {
    const casos = [
        { nome: '' },
        { nome: 'x'.repeat(61) },
        { especie: 'dragao' },
        { raca: '' },
        { raca: 'x'.repeat(81) },
        { dataNascimento: '' },
        { dataNascimento: '2022-02-30' },
        { dataNascimento: '10/05/2022' },
        { dataNascimento: '2026-11-08' },
        { dataNascimento: '1899-12-31' },
        { peso: '' },
        { peso: '-1' },
        { peso: 'abc' },
        { peso: '10000' },
        { genero: 'outro' }
    ];
    for (const caso of casos) {
        const resultado = validarPet(dadosValidos(caso), HOJE);
        assert.ok(resultado.erro, `deveria recusar ${JSON.stringify(caso)}`);
    }
});

test('validarPet aceita nascimento hoje e peso zero', () => {
    assert.equal(validarPet(dadosValidos({ dataNascimento: HOJE, peso: 0 }), HOJE).erro, undefined);
});

test('validarTutor aceita vazio, exige nome quando há telefone e limita tamanhos', () => {
    assert.deepEqual(validarTutor({ nomeTutor: ' ', telefone: '' }).dados, { nomeTutor: '', telefone: '' });
    assert.deepEqual(
        validarTutor({ nomeTutor: ' Maria ', telefone: ' (11) 99999-9999 ' }).dados,
        { nomeTutor: 'Maria', telefone: '(11) 99999-9999' }
    );
    assert.ok(validarTutor({ nomeTutor: '', telefone: '11999' }).erro);
    assert.ok(validarTutor({ nomeTutor: 'x'.repeat(151), telefone: '' }).erro);
    assert.ok(validarTutor({ nomeTutor: 'Maria', telefone: '1'.repeat(31) }).erro);
});

function respostaFalsa() {
    return {
        statusCode: 200,
        corpo: undefined,
        headers: {},
        setHeader(nome, valor) { this.headers[nome] = valor; },
        status(codigo) { this.statusCode = codigo; return this; },
        json(corpo) { this.corpo = corpo; return this; },
        end() { return this; }
    };
}

function dependenciasFalsas(extra = {}) {
    const chamadas = [];
    const pet = { id: '7', nome: 'Thor' };
    return {
        chamadas,
        usuarioDaSessao: () => 3,
        origemDaRequisicaoValida: () => true,
        hoje: () => HOJE,
        prepararFoto: async (foto) => (foto ? 'https://blob/pets/x.webp' : null),
        repositorio: {
            listarPets: async (usuarioId) => { chamadas.push(['listar', usuarioId]); return [pet]; },
            buscarPet: async (id, usuarioId) => { chamadas.push(['buscar', id, usuarioId]); return id === 7 ? pet : null; },
            criarPet: async (usuarioId, dados) => { chamadas.push(['criar', usuarioId, dados]); return pet; },
            atualizarPet: async (id, usuarioId, dados) => { chamadas.push(['atualizar', id, usuarioId, dados]); return pet; },
            salvarTutor: async (id, usuarioId, dados) => { chamadas.push(['tutor', id, usuarioId, dados]); return id === 7 ? pet : null; },
            desativarPet: async (id, usuarioId) => { chamadas.push(['desativar', id, usuarioId]); return id === 7; }
        },
        ...extra
    };
}

test('handler devolve 401 sem sessão', async () => {
    const handler = criarHandlerPets(dependenciasFalsas({ usuarioDaSessao: () => null }));
    const res = respostaFalsa();
    await handler({ method: 'GET', query: {} }, res);
    assert.equal(res.statusCode, 401);
});

test('handler devolve 403 para escrita com origem inválida', async () => {
    const deps = dependenciasFalsas({ origemDaRequisicaoValida: () => false });
    const handler = criarHandlerPets(deps);
    const res = respostaFalsa();
    await handler({ method: 'POST', query: {}, body: dadosValidos() }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(deps.chamadas.length, 0);
});

test('handler lista apenas os pets do usuário da sessão', async () => {
    const deps = dependenciasFalsas();
    const res = respostaFalsa();
    await criarHandlerPets(deps)({ method: 'GET', query: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.corpo, { pets: [{ id: '7', nome: 'Thor' }] });
    assert.deepEqual(deps.chamadas, [['listar', 3]]);
});

test('handler devolve 404 para pet de outro usuário', async () => {
    const res = respostaFalsa();
    await criarHandlerPets(dependenciasFalsas())({ method: 'GET', query: { id: '99' } }, res);
    assert.equal(res.statusCode, 404);
});

test('handler cadastra com dados validados e foto armazenada', async () => {
    const deps = dependenciasFalsas();
    const res = respostaFalsa();
    await criarHandlerPets(deps)({
        method: 'POST',
        query: {},
        body: dadosValidos({ foto: 'data:image/png;base64,AAAA' })
    }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(deps.chamadas[0][0], 'criar');
    assert.equal(deps.chamadas[0][2].foto, 'https://blob/pets/x.webp');
    assert.equal(deps.chamadas[0][2].peso, 12.5);
});

test('handler devolve 400 para cadastro inválido', async () => {
    const deps = dependenciasFalsas();
    const res = respostaFalsa();
    await criarHandlerPets(deps)({ method: 'POST', query: {}, body: dadosValidos({ genero: '' }) }, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.corpo.erro);
    assert.equal(deps.chamadas.length, 0);
});

test('handler atualiza sem mexer na foto quando ela não é enviada', async () => {
    const deps = dependenciasFalsas();
    const res = respostaFalsa();
    await criarHandlerPets(deps)({ method: 'PUT', query: { id: '7' }, body: dadosValidos() }, res);
    assert.equal(res.statusCode, 200);
    const atualizacao = deps.chamadas.find(([nome]) => nome === 'atualizar');
    assert.equal(Object.hasOwn(atualizacao[3], 'foto'), false);
});

test('handler salva tutor e devolve 404 para pet inexistente', async () => {
    const deps = dependenciasFalsas();
    const ok = respostaFalsa();
    await criarHandlerPets(deps)({
        method: 'PUT', query: { id: '7', acao: 'tutor' }, body: { nomeTutor: 'Maria', telefone: '11' }
    }, ok);
    assert.equal(ok.statusCode, 200);

    const ausente = respostaFalsa();
    await criarHandlerPets(deps)({
        method: 'PUT', query: { id: '8', acao: 'tutor' }, body: { nomeTutor: 'Maria', telefone: '11' }
    }, ausente);
    assert.equal(ausente.statusCode, 404);
});

test('handler desativa pet com DELETE', async () => {
    const deps = dependenciasFalsas();
    const res = respostaFalsa();
    await criarHandlerPets(deps)({ method: 'DELETE', query: { id: '7' } }, res);
    assert.equal(res.statusCode, 204);
    assert.deepEqual(deps.chamadas, [['desativar', 7, 3]]);
});

test('handler recusa identificador inválido', async () => {
    const res = respostaFalsa();
    await criarHandlerPets(dependenciasFalsas())({ method: 'GET', query: { id: 'abc' } }, res);
    assert.equal(res.statusCode, 400);
});
