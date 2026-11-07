import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarIdadePet } from '../../modules/pets/js/idade-pet.js';

const hoje = new Date(2026, 10, 7); // 07/11/2026

test('formatarIdadePet mostra anos completos', () => {
    assert.equal(formatarIdadePet('2023-11-07', hoje), '3 anos');
    assert.equal(formatarIdadePet('2025-11-07', hoje), '1 ano');
    assert.equal(formatarIdadePet('2023-11-08', hoje), '2 anos');
});

test('formatarIdadePet mostra meses antes de completar um ano', () => {
    assert.equal(formatarIdadePet('2026-06-07', hoje), '5 meses');
    assert.equal(formatarIdadePet('2026-10-07', hoje), '1 mês');
});

test('formatarIdadePet mostra semanas e dias para filhotes', () => {
    assert.equal(formatarIdadePet('2026-10-17', hoje), '3 semanas');
    assert.equal(formatarIdadePet('2026-11-04', hoje), '3 dias');
    assert.equal(formatarIdadePet('2026-11-06', hoje), '1 dia');
    assert.equal(formatarIdadePet('2026-11-07', hoje), 'Recém-nascido');
});

test('formatarIdadePet devolve vazio para data ausente ou inválida', () => {
    assert.equal(formatarIdadePet('', hoje), '');
    assert.equal(formatarIdadePet('abc', hoje), '');
    assert.equal(formatarIdadePet('2027-01-01', hoje), '');
});
