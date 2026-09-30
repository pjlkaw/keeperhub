const { buscarUsuario } = require('../shared/utils/usuario');

module.exports = async (req, res) => {
    const usuarios = await buscarUsuario();
    res.status(200).json(usuarios);

};