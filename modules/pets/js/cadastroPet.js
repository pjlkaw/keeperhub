const form = document.getElementById('cadastro-pet-form');

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const nome = document.getElementById('nome').value.trim();

  const especie = document.querySelector(
    'input[name="tipo_animal"]:checked'
  ).value;

  const raca = document.getElementById('raca').value.trim();

  const idade = document.getElementById('idade').value.trim();

  const peso = document.getElementById('peso').value;

  const genero = document.querySelector(
    'input[name="genero"]:checked'
  ).value;

  const novoPet = {
    nome: nome,
    especie: especie,
    raca: raca,
    idade: idade,
    peso: peso,
    genero: genero
  };

  const petsSalvos = localStorage.getItem('keeperhub-pets');

  const pets = petsSalvos ? JSON.parse(petsSalvos) : [];

  pets.push(novoPet);

  localStorage.setItem('keeperhub-pets', JSON.stringify(pets));

  console.log(pets);

  form.reset();
});