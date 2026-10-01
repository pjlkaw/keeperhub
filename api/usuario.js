import { buscarUsuario } from "../shared/utils/usuario.js";

export default async function handler(req, res) {
    const usuarios = await buscarUsuario();
    res.status(200).json(usuarios);
}