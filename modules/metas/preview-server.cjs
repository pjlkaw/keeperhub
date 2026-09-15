// Servidor pequeno só para abrir este site no preview local.
// As opções extras do preview são ignoradas de propósito.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const server = http.createServer((request, response) => {
  let nome = decodeURIComponent(request.url.split('?')[0]);
  if (nome === '/') nome = '/index.html';
  const arquivo = path.join(root, nome);
  if (!arquivo.startsWith(root) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
    response.writeHead(404); response.end('Arquivo não encontrado'); return;
  }
  response.writeHead(200, { 'Content-Type': tipos[path.extname(arquivo)] || 'application/octet-stream' });
  fs.createReadStream(arquivo).pipe(response);
});
server.listen(4173, '0.0.0.0');
