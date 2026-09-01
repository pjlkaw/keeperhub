/**
 * KeeperHub — Servidor Express (Fase B2)
 * Servidor principal de desenvolvimento e execução do KeeperHub.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 1. Segurança Básica
app.disable('x-powered-by');

// 2. Arquivos Estáticos Globais e de Recursos Específicos
// Note: Não expomos a raiz inteira (PROJECT_ROOT) por segurança.
app.use('/assets', express.static(path.resolve(__dirname, 'assets')));
app.use('/shared', express.static(path.resolve(__dirname, 'shared')));

// Recursos estáticos do Main
app.use('/main/css', express.static(path.resolve(__dirname, 'main/css')));
app.use('/main/js', express.static(path.resolve(__dirname, 'main/js')));

// Recursos estáticos dos Módulos
const modules = ['medicamentos', 'metas', 'financas', 'despensa', 'pets'];
modules.forEach((mod) => {
  app.use(`/modules/${mod}/assets`, express.static(path.resolve(__dirname, `modules/${mod}/assets`)));
  app.use(`/modules/${mod}/js`, express.static(path.resolve(__dirname, `modules/${mod}/js`)));
});

// 3. Arquivos Raiz Específicos
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.resolve(__dirname, 'sitemap.xml'));
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'favicon.ico'));
});

// 4. Rotas de Páginas — Home Pública
app.get(['/', '/home', '/home/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/home.html'));
});

// 5. Rotas de Autenticação
app.get(['/entrar', '/entrar/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/entrar.html'));
});

app.get(['/criar-conta', '/criar-conta/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/criar-conta.html'));
});

// 6. Rotas Institucionais
app.get(['/contato', '/contato/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/contato.html'));
});

app.get(['/politica-de-privacidade', '/politica-de-privacidade/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/privacidade.html'));
});

app.get(['/termos-de-uso', '/termos-de-uso/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/termos.html'));
});

// 7. Rotas de Landings dos Módulos
app.get(['/metas', '/metas/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/metas.html'));
});

app.get(['/financas', '/financas/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/financas.html'));
});

app.get(['/despensa', '/despensa/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/despensa.html'));
});

app.get(['/pets', '/pets/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/pets.html'));
});

app.get(['/medicamentos', '/medicamentos/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/html/medicamentos.html'));
});

// 8. Hub Autenticado
app.get(['/main', '/main/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'main/index.html'));
});

// 9. Páginas Internas dos Módulos
app.get(['/modules/medicamentos', '/modules/medicamentos/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'modules/medicamentos/index.html'));
});

app.get(['/modules/medicamentos/medicacoes', '/modules/medicamentos/medicacoes/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'modules/medicamentos/medicacoes/index.html'));
});

app.get(['/modules/medicamentos/medicacoes/adicionar', '/modules/medicamentos/medicacoes/adicionar/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'modules/medicamentos/medicacoes/adicionar/index.html'));
});

app.get(['/modules/pets', '/modules/pets/'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'modules/pets/index.html'));
});

// 10. Tratamento 404 (URLs Inexistentes)
app.use((req, res) => {
  res.status(404).type('text/plain').send('404 Not Found');
});

// 11. Inicialização do Servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[KeeperHub Express] Servidor rodando na porta ${PORT} (http://localhost:${PORT})`);
});
