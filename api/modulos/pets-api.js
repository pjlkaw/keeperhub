// Organização do módulo Pets: administrar animais e os dados do tutor.
// Vacinas e consultas também vêm do banco. Medicações, despesas e rotinas ainda ficam no navegador.
import {
  atualizarPet,
  buscarPet,
  criarPet,
  desativarPet,
  listarPets,
  salvarTutor,
} from '../../server/repositories/pets/animais.js';
import {
  CODIGOS_VACINA,
  cadastrarVacina,
  listarVacinasPorPet,
  atualizarVacinas,
  marcarVacinasAplicadas,
  excluirVacinas,
} from '../../server/repositories/pets/vacinas.js';
import {
  CODIGOS_ESPECIALIDADE,
  alterarLembreteConsulta,
  cadastrarConsulta,
  atualizarConsultas,
  excluirConsultas,
  listarConsultasPorPet,
  registrarConsultaRealizada,
  registrarConsultasRealizadas,
} from '../../server/repositories/pets/consultas.js';
import {
  origemDaRequisicaoValida,
  usuarioDaSessao,
} from '../../server/auth-session.js';

const ESPECIES = [
  'cachorro', 'gato', 'passaro', 'cavalo', 'reptil',
  'pequeno-mamifero', 'peixe', 'animal-fazenda', 'anfibio', 'exotico',
];
const GENEROS = ['macho', 'femea'];
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const PESO_MAXIMO = 9999.99; // coluna DECIMAL(6,2)
const FREQUENCIAS_VACINA = ['reforco_anual', 'doses_fracionadas', 'dose_unica'];
const HORARIO_VALIDO = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function dataISOValida(valor) {
  if (!DATA_VALIDA.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// Mesmas regras de modules/pets/js/validacao-pet.js, repetidas no servidor.
export function validarPet(body, hoje = hojeEmSaoPaulo()) {
  const nome = texto(body.nome);
  const especie = texto(body.especie);
  const raca = texto(body.raca);
  const dataNascimento = texto(body.dataNascimento);
  const genero = texto(body.genero);
  const pesoTexto = body.peso == null ? '' : String(body.peso).trim().replace(',', '.');
  const peso = pesoTexto === '' ? NaN : Number(pesoTexto);

  if (!nome || nome.length > 60) return { erro: 'Informe o nome do pet (até 60 caracteres).' };
  if (!ESPECIES.includes(especie)) return { erro: 'Selecione um tipo de animal.' };
  if (!raca || raca.length > 80) return { erro: 'Informe a raça do pet (até 80 caracteres).' };
  if (!dataISOValida(dataNascimento) || dataNascimento < '1900-01-01' || dataNascimento > hoje) {
    return { erro: 'Informe uma data de nascimento válida, que não esteja no futuro.' };
  }
  if (!Number.isFinite(peso) || peso < 0 || peso > PESO_MAXIMO) {
    return { erro: 'Informe um peso válido em quilogramas, sem valores negativos.' };
  }
  if (!GENEROS.includes(genero)) return { erro: 'Selecione o gênero do pet.' };

  return {
    dados: {
      nome, especie, raca, dataNascimento,
      peso: Math.round(peso * 100) / 100,
      genero,
    },
  };
}

export function validarTutor(body) {
  const nomeTutor = texto(body.nomeTutor);
  const telefone = texto(body.telefone);
  if (nomeTutor.length > 150) return { erro: 'O nome do tutor pode ter até 150 caracteres.' };
  if (telefone.length > 30) return { erro: 'O telefone pode ter até 30 caracteres.' };
  if (telefone && !nomeTutor) return { erro: 'Informe o nome do tutor.' };
  return { dados: { nomeTutor, telefone } };
}

// Valida uma vacina e define se é aplicação (hoje ou passado) ou agendamento (futuro).
export function validarVacina(body, hoje = hojeEmSaoPaulo()) {
  const petIds = Array.isArray(body.petIds)
    ? [...new Set(body.petIds.map(Number))]
    : [];
  const codigo = texto(body.nome);
  const nome = codigo === 'outra' ? texto(body.nomePersonalizado) : codigo;
  const data = texto(body.data);
  const frequencia = texto(body.frequencia);
  const proximaDose = texto(body.proximaDose);
  const clinica = texto(body.clinica);
  const horario = texto(body.horario);
  const observacao = texto(body.observacao);

  if (!petIds.length || petIds.length > 50 || petIds.some(id => !Number.isInteger(id) || id <= 0)) {
    return { erro: 'Selecione ao menos um pet válido.' };
  }
  if (codigo !== 'outra' && !CODIGOS_VACINA.includes(codigo)) {
    return { erro: 'Selecione a vacina.' };
  }
  if (!nome || nome.length > 100) return { erro: 'Informe o nome da vacina (até 100 caracteres).' };
  if (!dataISOValida(data) || data < '1900-01-01') return { erro: 'Informe uma data válida.' };
  if (!FREQUENCIAS_VACINA.includes(frequencia)) return { erro: 'Selecione a frequência.' };
  if (frequencia === 'dose_unica' && proximaDose) {
    return { erro: 'Dose única não tem próxima dose.' };
  }
  if (frequencia !== 'dose_unica' && (!dataISOValida(proximaDose) || proximaDose < data)) {
    return { erro: 'A próxima dose deve ser na data de aplicação ou depois.' };
  }
  if (clinica.length > 150) return { erro: 'A clínica pode ter até 150 caracteres.' };
  if (horario && !HORARIO_VALIDO.test(horario)) return { erro: 'Informe o horário no formato HH:mm.' };
  if (observacao.length > 2000) return { erro: 'A observação pode ter até 2000 caracteres.' };

  return {
    petIds,
    dados: {
      nome,
      status: data > hoje ? 'agendada' : 'aplicada',
      data,
      frequencia,
      proximaDose: frequencia === 'dose_unica' ? '' : proximaDose,
      clinica,
      horario,
      observacao,
    },
  };
}

// Valida uma consulta. Data passada já entra como realizada; hoje ou futura, como agendada
// (mesma regra da tela).
export function validarConsulta(body, hoje = hojeEmSaoPaulo()) {
  const petIds = Array.isArray(body.petIds)
    ? [...new Set(body.petIds.map(Number))]
    : [];
  const codigo = texto(body.especialidade);
  const especialidade = codigo === 'outra' ? texto(body.especialidadePersonalizada) : codigo;
  const medico = texto(body.medico);
  const clinica = texto(body.clinica);
  const data = texto(body.data);
  const horario = texto(body.horario);

  if (!petIds.length || petIds.length > 50 || petIds.some(id => !Number.isInteger(id) || id <= 0)) {
    return { erro: 'Selecione ao menos um pet válido.' };
  }
  if (!medico || medico.length > 150) return { erro: 'Informe o nome do veterinário (até 150 caracteres).' };
  if (codigo !== 'outra' && !CODIGOS_ESPECIALIDADE.includes(codigo)) {
    return { erro: 'Selecione a especialidade.' };
  }
  if (!especialidade || especialidade.length > 120) {
    return { erro: 'Informe a especialidade (até 120 caracteres).' };
  }
  if (!clinica || clinica.length > 150) return { erro: 'Informe a clínica (até 150 caracteres).' };
  if (!dataISOValida(data) || data < '1900-01-01') return { erro: 'Informe uma data válida.' };
  if (!HORARIO_VALIDO.test(horario)) return { erro: 'Informe o horário no formato HH:mm.' };

  return {
    petIds,
    dados: {
      medico, especialidade, clinica, data, horario,
      lembrar: body.lembrar === true,
      status: data < hoje ? 'realizada' : 'agendada',
    },
  };
}

// A foto chega em Base64; é validada e enviada ao Vercel Blob. Só a URL vai para o banco.
// Os módulos de imagem são carregados sob demanda para não pesar nas demais requisições.
async function prepararFotoPadrao(foto) {
  const { validarFoto } = await import('../../server/image-validation.js');
  const { armazenarFoto } = await import('../../server/image-storage.js');
  const resultado = await validarFoto(foto);
  if (resultado.erro) {
    const erro = new Error(resultado.erro.replace('do perfil', 'do pet').replace('foto de perfil', 'foto do pet'));
    erro.statusCode = 400;
    throw erro;
  }
  return armazenarFoto(resultado, 'pets');
}

function idDaRequisicao(req) {
  const id = Number(req.query?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requisicaoTemId(req) {
  return Object.prototype.hasOwnProperty.call(req.query || {}, 'id');
}

// Recebe as dependências para permitir testes sem banco; o export default usa as reais.
export function criarHandlerPets(deps) {
  const { repositorio, prepararFoto } = deps;

  // Inclui "foto" nos dados apenas quando o navegador enviou uma alteração.
  async function aplicarFoto(body, dados) {
    if (!Object.hasOwn(body, 'foto')) return dados;
    if (body.foto === null || body.foto === '') return { ...dados, foto: null };
    if (typeof body.foto === 'string' && body.foto.startsWith('data:')) {
      return { ...dados, foto: await prepararFoto(body.foto) };
    }
    return dados; // URL já salva: nada muda.
  }

  return async function handler(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const usuarioId = deps.usuarioDaSessao(req);
      if (!usuarioId) {
        return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
      }

      const id = idDaRequisicao(req);
      if (requisicaoTemId(req) && !id) {
        return res.status(400).json({ erro: 'Informe um identificador válido.' });
      }

      if (req.method === 'GET') {
        if (id) {
          const pet = await repositorio.buscarPet(id, usuarioId);
          return pet
            ? res.status(200).json({ pet })
            : res.status(404).json({ erro: 'Pet não encontrado.' });
        }
        // A lista já leva as vacinas de cada pet, usadas pelas telas do módulo.
        const [pets, vacinasPorPet, consultasPorPet] = await Promise.all([
          repositorio.listarPets(usuarioId),
          repositorio.listarVacinasPorPet(usuarioId),
          repositorio.listarConsultasPorPet(usuarioId),
        ]);
        return res.status(200).json({
          pets: pets.map(pet => ({
            ...pet,
            vacinas: vacinasPorPet.get(pet.id) || [],
            consultas: consultasPorPet.get(pet.id) || [],
          })),
        });
      }

      if (!deps.origemDaRequisicaoValida(req)) {
        return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};

      if (req.method === 'POST' && req.query?.acao === 'vacina') {
        const validacao = validarVacina(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarVacina(usuarioId, validacao.petIds, validacao.dados);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          vacinas: Object.fromEntries(resultado.vacinasPorPet),
          criados: resultado.criados,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'vacina') {
        const validacao = validarVacina(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as vacinas válidas.' });
        }
        const petIdsOrigem = Array.isArray(body.petIdsOrigem)
          ? body.petIdsOrigem.map(Number)
          : validacao.petIds;
        if (petIdsOrigem.length !== ids.length ||
            petIdsOrigem.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(petIdsOrigem).size !== petIdsOrigem.length) {
          return res.status(400).json({ erro: 'A lista de pets de origem não corresponde às vacinas.' });
        }
        const resultado = await repositorio.atualizarVacinas(
          ids, petIdsOrigem, validacao.petIds, usuarioId, validacao.dados
        );
        return resultado
          ? res.status(200).json({
              vacinas: Object.fromEntries(resultado.vacinasPorPet),
              grupoIds: resultado.grupoIds,
            })
          : res.status(404).json({ erro: 'Vacina não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'vacina-realizada') {
        const ids = id
          ? [id]
          : Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as vacinas válidas.' });
        }
        const vacinasPorPet = await repositorio.marcarVacinasAplicadas(ids, usuarioId);
        return vacinasPorPet
          ? res.status(200).json({ vacinas: Object.fromEntries(vacinasPorPet) })
          : res.status(404).json({ erro: 'Vacina agendada não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'vacina') {
        const ids = id ? [id] : Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as vacinas válidas.' });
        }
        const vacinasPorPet = await repositorio.excluirVacinas(ids, usuarioId);
        return vacinasPorPet
          ? res.status(200).json({ vacinas: Object.fromEntries(vacinasPorPet) })
          : res.status(404).json({ erro: 'Vacina não encontrada.' });
      }

      if (req.method === 'POST' && req.query?.acao === 'consulta') {
        const validacao = validarConsulta(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarConsulta(usuarioId, validacao.petIds, validacao.dados);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          consultas: Object.fromEntries(resultado.consultasPorPet),
          criados: resultado.criados,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'consulta') {
        const validacao = validarConsulta(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as consultas válidas.' });
        }
        const petIdsOrigem = Array.isArray(body.petIdsOrigem)
          ? body.petIdsOrigem.map(Number)
          : validacao.petIds;
        if (petIdsOrigem.length !== ids.length ||
            petIdsOrigem.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(petIdsOrigem).size !== petIdsOrigem.length) {
          return res.status(400).json({ erro: 'A lista de pets de origem não corresponde às consultas.' });
        }
        const resultado = await repositorio.atualizarConsultas(
          ids, petIdsOrigem, validacao.petIds, usuarioId, validacao.dados
        );
        return resultado
          ? res.status(200).json({
              consultas: Object.fromEntries(resultado.consultasPorPet),
              grupoIds: resultado.grupoIds,
            })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'consulta') {
        const ids = id ? [id] : Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as consultas válidas.' });
        }
        const consultasPorPet = await repositorio.excluirConsultas(ids, usuarioId);
        return consultasPorPet
          ? res.status(200).json({ consultas: Object.fromEntries(consultasPorPet) })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'consulta-lembrete') {
        if (!id) return res.status(400).json({ erro: 'Informe a consulta.' });
        if (typeof body.lembrar !== 'boolean') return res.status(400).json({ erro: 'Informe o lembrete.' });
        const consulta = await repositorio.alterarLembreteConsulta(id, usuarioId, body.lembrar);
        return consulta
          ? res.status(200).json({ consulta })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'consulta-realizada') {
        const resumo = texto(body.resumo);
        if (resumo.length > 2000) return res.status(400).json({ erro: 'O resumo pode ter até 2000 caracteres.' });
        if (!id) {
          const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
          if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
            return res.status(400).json({ erro: 'Informe as consultas válidas.' });
          }
          const consultasPorPet = await repositorio.registrarConsultasRealizadas(ids, usuarioId, resumo);
          return consultasPorPet
            ? res.status(200).json({ consultas: Object.fromEntries(consultasPorPet) })
            : res.status(404).json({ erro: 'Consulta não encontrada.' });
        }
        const consulta = await repositorio.registrarConsultaRealizada(id, usuarioId, resumo);
        return consulta
          ? res.status(200).json({ consulta })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'tutor') {
        if (!id) return res.status(400).json({ erro: 'Informe o pet.' });
        const validacao = validarTutor(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const pet = await repositorio.salvarTutor(id, usuarioId, validacao.dados);
        return pet
          ? res.status(200).json({ pet })
          : res.status(404).json({ erro: 'Pet não encontrado.' });
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const validacao = validarPet(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });

        if (req.method === 'POST') {
          const dados = await aplicarFoto(body, validacao.dados);
          const pet = await repositorio.criarPet(usuarioId, dados);
          return res.status(201).json({ pet });
        }

        if (!id) return res.status(400).json({ erro: 'Informe o pet.' });
        const existente = await repositorio.buscarPet(id, usuarioId);
        if (!existente) return res.status(404).json({ erro: 'Pet não encontrado.' });
        const dados = await aplicarFoto(body, validacao.dados);
        const pet = await repositorio.atualizarPet(id, usuarioId, dados);
        return pet
          ? res.status(200).json({ pet })
          : res.status(404).json({ erro: 'Pet não encontrado.' });
      }

      if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ erro: 'Informe o pet.' });
        return (await repositorio.desativarPet(id, usuarioId))
          ? res.status(204).end()
          : res.status(404).json({ erro: 'Pet não encontrado.' });
      }

      return res.status(405).json({ erro: 'Método não permitido.' });
    } catch (erro) {
      console.error('Erro na API de pets:', erro);
      return res.status(erro.statusCode || 500).json({
        erro: erro.statusCode ? erro.message : 'Erro ao acessar pets.',
      });
    }
  };
}

export default criarHandlerPets({
  repositorio: {
    atualizarPet, buscarPet, criarPet, desativarPet, listarPets, salvarTutor,
    listarVacinasPorPet, cadastrarVacina,
    atualizarVacinas, marcarVacinasAplicadas, excluirVacinas,
    listarConsultasPorPet, cadastrarConsulta, atualizarConsultas, excluirConsultas, alterarLembreteConsulta, registrarConsultaRealizada,
    registrarConsultasRealizadas,
  },
  usuarioDaSessao,
  origemDaRequisicaoValida,
  prepararFoto: prepararFotoPadrao,
});
