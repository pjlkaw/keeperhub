import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapearPet } from '../../server/repositories/pets/animais.js';

test('mapearPet converte a linha do banco para o formato das telas', () => {
    const pet = mapearPet({
        id: 12,
        nome: 'Luna',
        especie: 'gato',
        raca: 'Siamês',
        sexo: 'femea',
        dataNasc: new Date(2021, 0, 5),
        peso: '4.20',
        foto: 'https://blob/pets/luna.webp',
        tutorNome: 'Maria',
        tutorTelefone: '(11) 99999-9999'
    });

    assert.deepEqual(pet, {
        id: '12',
        nome: 'Luna',
        especie: 'gato',
        raca: 'Siamês',
        genero: 'femea',
        dataNascimento: '2021-01-05',
        peso: 4.2,
        foto: 'https://blob/pets/luna.webp',
        contatoEmergencia: { nomeTutor: 'Maria', telefone: '(11) 99999-9999' }
    });
});

test('mapearPet trata campos vazios', () => {
    const pet = mapearPet({
        id: 3, nome: 'Rex', especie: null, raca: null, sexo: null,
        dataNasc: null, peso: null, foto: null, tutorNome: null, tutorTelefone: null
    });
    assert.equal(pet.dataNascimento, '');
    assert.equal(pet.peso, null);
    assert.equal(pet.contatoEmergencia, null);
    assert.equal(pet.raca, '');
});
