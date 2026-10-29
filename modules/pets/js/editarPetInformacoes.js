// Controla o carregamento e a edição das informações de um pet.

// Importa a função que atualiza um pet e a que busca um pet pelo ID.
import { atualizarPet, buscarPetPorId } from './armazenamento.js';

// Importa a função que valida os dados do pet antes de salvar.
import { validarDadosPet } from './validacao-pet.js';

// Busca no HTML o formulário e os elementos usados pela página.
const form = document.getElementById('formulario-informacoes-pet');
const status = document.getElementById('status-informacoes-pet');
const botao = form.querySelector('[type="submit"]');
const campoFoto = document.getElementById('foto-pet-edicao');
const figuraFoto = form.querySelector('.foto-pet-edicao__visualizacao');
const imagemFoto = document.getElementById('foto-pet-edicao-imagem');

// Lê o ID do pet na URL. Por exemplo: ?petId=123.
const petId = new URLSearchParams(window.location.search).get('petId');

// Guarda os dados do pet carregado, a nova foto escolhida,
// a leitura da foto em andamento e o estado do envio do formulário.
let petAtual = null;
let fotoSelecionada = null;
let leituraFoto = Promise.resolve(null);
let enviando = false;

// Exibe uma mensagem de sucesso ou de erro na página.
function informar(mensagem, erro = false) {
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';

    // Ajuda leitores de tela a identificar o tipo de mensagem.
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Mostra a foto do pet ou uma imagem padrão, caso não haja uma foto válida.
function mostrarFoto(foto, nome) {
    // Aceita fotos em URL HTTPS ou em formato Base64 JPEG, PNG ou WebP.
    const fotoValida = typeof foto === 'string' && (
        /^https:\/\//.test(foto) ||
        /^data:image\/(?:jpeg|png|webp);base64,/.test(foto)
    );

    // Indica no HTML se há uma foto válida.
    figuraFoto.dataset.temFoto = String(fotoValida);

    // Define a foto ou usa o logo padrão.
    imagemFoto.src = fotoValida ? foto : '/shared/img/logo-pets.png';

    // O texto alternativo descreve a foto para leitores de tela.
    imagemFoto.alt = fotoValida ? 'Foto de ' + nome : '';

    if (fotoValida) {
        // Se a foto não carregar, mostra o logo padrão.
        // { once: true } faz este tratamento acontecer uma única vez.
        imagemFoto.addEventListener('error', () => {
            figuraFoto.dataset.temFoto = 'false';
            imagemFoto.src = '/shared/img/logo-pets.png';
            imagemFoto.alt = '';
        }, { once: true });
    }
}

// Coloca os dados do pet nos campos do formulário.
function preencherFormulario(pet) {
    // Guarda o ID do pet no próprio formulário.
    form.dataset.petId = pet.id;

    // Preenche os campos. O operador ?? usa uma string vazia
    // quando o valor é null ou undefined.
    form.elements.nome.value = pet.nome ?? '';
    form.elements.tipo_animal.value = pet.especie ?? '';
    form.elements.raca.value = pet.raca ?? '';
    form.elements.idade.value = pet.idade ?? '';
    form.elements.peso.value = pet.peso ?? '';
    form.elements.genero.value = pet.genero ?? '';

    // Mostra a foto atual do pet.
    mostrarFoto(pet.foto, pet.nome);

    // Acrescenta o ID do pet aos links das abas da página.
    // Isso permite que outras páginas também saibam qual pet mostrar.
    document.querySelectorAll('.abas-pet a').forEach(link => {
        const destino = new URL(link.href, window.location.href);
        destino.searchParams.set('petId', pet.id);
        link.href = destino.href;
    });
}

// Desabilita todos os campos e controles do formulário.
function desabilitarFormulario() {
    [...form.elements].forEach(campo => {
        campo.disabled = true;
    });
}

// Lê um arquivo de imagem e o converte para uma URL de dados Base64.
// Promise permite aguardar o resultado da leitura ou tratar um erro.
function lerArquivoComoDataUrl(arquivo) {
    return new Promise((resolve, reject) => {
        // Aceita somente arquivos JPEG, PNG e WebP.
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
            reject(new Error('Escolha uma imagem JPEG, PNG ou WebP.'));
            return;
        }

        const leitor = new FileReader();

        // Executado quando a leitura do arquivo termina.
        leitor.addEventListener('load', () => {
            // Confirma que o resultado é uma imagem Base64 válida.
            if (
                typeof leitor.result !== 'string' ||
                !/^data:image\/(?:jpeg|png|webp);base64,/.test(leitor.result)
            ) {
                reject(new Error('Não foi possível ler a imagem selecionada.'));
                return;
            }

            // Entrega o conteúdo da imagem para quem aguardou a Promise.
            resolve(leitor.result);
        }, { once: true });

        // Avisa quem aguardou a Promise se o navegador não conseguir ler o arquivo.
        leitor.addEventListener('error', () => {
            reject(new Error('Não foi possível ler a imagem selecionada.'));
        }, { once: true });

        // Inicia a leitura do arquivo como uma URL de dados.
        leitor.readAsDataURL(arquivo);
    });
}

// Busca o pet usando o ID da URL e preenche o formulário.
function carregarPet() {
    try {
        // Sem ID, não há como saber qual pet deve ser editado.
        if (!petId) {
            informar('Pet não informado. Volte à lista e escolha um pet para editar.', true);
            desabilitarFormulario();
            return;
        }

        // Busca o pet no armazenamento.
        petAtual = buscarPetPorId(petId);

        // Se o ID não corresponder a nenhum pet, avisa e desabilita o formulário.
        if (!petAtual) {
            informar('Este pet não foi encontrado no armazenamento deste navegador.', true);
            desabilitarFormulario();
            return;
        }

        // Preenche os campos com os dados encontrados.
        preencherFormulario(petAtual);
    } catch (erro) {
        // Mostra a mensagem do erro ou uma mensagem padrão.
        informar(erro.message || 'Não foi possível carregar os dados do pet.', true);
        desabilitarFormulario();
    }
}

// Quando um campo muda, limpa a mensagem de validação personalizada anterior.
form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') {
        event.target.setCustomValidity('');
        event.target.removeAttribute('aria-invalid');
    }
});

// Detecta campos inválidos segundo as regras nativas do HTML,
// como required, min ou max. O true faz o formulário capturar o evento.
form.addEventListener('invalid', event => {
    event.target.setAttribute('aria-invalid', 'true');
    informar('Confira o campo indicado e preencha os dados obrigatórios.', true);
}, true);

// Executa quando a pessoa escolhe ou remove uma foto.
campoFoto.addEventListener('change', () => {
    // Pega o primeiro arquivo selecionado, se houver.
    const arquivo = campoFoto.files?.[0];

    // Se não houver arquivo, limpa a foto nova e volta a mostrar a foto atual.
    if (!arquivo) {
        fotoSelecionada = null;
        leituraFoto = Promise.resolve(null);

        if (petAtual) mostrarFoto(petAtual.foto, petAtual.nome);
        return;
    }

    // Lê o arquivo escolhido e, quando terminar, atualiza a prévia da foto.
    leituraFoto = lerArquivoComoDataUrl(arquivo).then(foto => {
        fotoSelecionada = foto;
        mostrarFoto(foto, form.elements.nome.value.trim() || petAtual.nome);
        informar('Prévia da foto atualizada. Salve as alterações para mantê-la.');
        return foto;
    }).catch(erro => {
        // Se a leitura falhar, limpa a seleção e mostra a mensagem de erro.
        fotoSelecionada = null;
        campoFoto.value = '';
        informar(erro.message, true);

        // Mantém a rejeição para que o envio também possa tratar o erro.
        throw erro;
    });

    // Evita uma rejeição não tratada caso outra foto seja escolhida
    // antes de a leitura atual terminar.
    leituraFoto.catch(() => {});
});

// Executa quando a pessoa envia o formulário.
// A função é async porque pode precisar aguardar a leitura da foto.
form.addEventListener('submit', async event => {
    // Impede o envio padrão, que recarregaria a página.
    event.preventDefault();

    // Não faz nada se já houver um envio em andamento
    // ou se nenhum pet tiver sido carregado.
    if (enviando || !petAtual) return;

    // Busca as opções marcadas para espécie e gênero.
    const especieSelecionada = form.querySelector('[name="tipo_animal"]:checked');
    const generoSelecionado = form.querySelector('[name="genero"]:checked');

    // Lê e organiza os dados atuais do formulário.
    const dados = {
        nome: form.elements.nome.value.trim(),
        especie: especieSelecionada?.value ?? '',
        raca: form.elements.raca.value.trim(),
        idade: form.elements.idade.value.trim(),
        peso: form.elements.peso.value,
        genero: generoSelecionado?.value ?? ''
    };

    // Verifica os dados com as regras de validação da aplicação.
    const erroValidacao = validarDadosPet(dados);

    if (erroValidacao) {
        // Encontra o campo que precisa de correção.
        const campo = form.querySelector(
            '[name="' + erroValidacao.campo + '"]'
        );

        // Mostra o erro no campo, sinaliza-o para tecnologias assistivas
        // e leva o foco até ele.
        campo.setCustomValidity(erroValidacao.mensagem);
        campo.setAttribute('aria-invalid', 'true');
        campo.reportValidity();
        campo.focus();

        // Mostra também a mensagem na área de status.
        informar(erroValidacao.mensagem, true);
        return;
    }

    // Executa as validações nativas do navegador.
    if (!form.reportValidity()) return;

    // Marca o formulário como ocupado e desabilita o botão de envio.
    enviando = true;
    botao.disabled = true;
    botao.textContent = 'Salvando…';

    try {
        // Se há um arquivo selecionado, aguarda sua leitura
        // e inclui a foto nos dados que serão salvos.
        if (campoFoto.files?.length) {
            dados.foto = await leituraFoto;
        } else if (fotoSelecionada) {
            // Usa a foto já lida, caso esteja selecionada.
            dados.foto = fotoSelecionada;
        }

        // Salva as alterações do pet usando seu ID.
        const atualizado = atualizarPet(petId, dados);

        // Se o pet não for mais encontrado, desabilita o formulário.
        if (!atualizado) {
            petAtual = null;
            desabilitarFormulario();
            informar('Este pet não foi encontrado no armazenamento deste navegador.', true);
            return;
        }

        // Atualiza os dados locais e a prévia com o resultado salvo.
        petAtual = atualizado;
        mostrarFoto(petAtual.foto, petAtual.nome);
        informar('Alterações salvas com sucesso.');
    } catch (erro) {
        // Mostra o erro recebido ou uma mensagem padrão.
        informar(erro.message || 'Não foi possível salvar as alterações.', true);
    } finally {
        // Este bloco roda tanto em caso de sucesso quanto de erro.
        // Libera o botão novamente se ainda houver um pet carregado.
        enviando = false;

        if (petAtual) {
            botao.disabled = false;
            botao.textContent = 'Salvar Alterações';
        }
    }
});

// Carrega os dados do pet assim que o script é executado.
carregarPet();