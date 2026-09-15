# Metas — versão para estudar

Abra `index.html` no navegador. Não precisa instalar React, Node ou dependências.
Se você usa VS Code, também pode abrir com a extensão Live Server.

## Qual arquivo faz o quê?

- `index.html`: todas as telas, títulos, botões, formulários e modelos de cartões.
- `style.css`: cores, tamanhos, margens, responsividade e aparência.
- `script.js`: cliques, troca de telas, listas e salvamento local.
- `fotos.js`: leitura, ajuste com arrastar/zoom e salvamento das imagens.
- `logo-*.png`: os ícones dos módulos.

Java e JavaScript são linguagens diferentes. Este projeto usa JavaScript.
Não há framework, compilação, classes ou geração de telas inteiras no script.

## Como estudar

1. Abra o HTML e procure os comentários numerados: cada seção é uma tela.
2. Troque um título no HTML e atualize a página para ver o resultado.
3. Mude uma cor em `:root` no início do CSS.
4. Procure `data-tela="perfil"`: ele indica qual tela um botão abre.
5. No JavaScript, leia `mostrarTela`, depois os eventos de clique.
6. Por último, leia os formulários e o salvamento com `localStorage`.

O atributo `hidden` oculta uma tela. O JS remove esse atributo quando ela é aberta.
`textContent` atualiza textos com segurança, sem interpretar o que o usuário digita como HTML.
`addEventListener` significa “quando acontecer um clique, mudança ou envio, execute esta função”.
Os elementos `<template>` no final do HTML são modelos de uma meta, tarefa, evento e livro.
O JS copia esses modelos para cada cadastro; você muda o visual deles no próprio HTML.

## O que precisa de JavaScript

HTML e CSS sozinhos não salvam cadastros, calculam progresso nem leem fotos.
Por isso essas funções continuam no JS, divididas em nove blocos comentados.
O tratamento de fotos é a parte mais técnica: lê, reduz, recorta e guarda a imagem.
Por isso ele fica isolado em `fotos.js`; as regras principais continuam fáceis de acompanhar.

## Funcionalidades

- Criar, editar, concluir e remover metas; adicionar valores e fotos.
- Definir prazo para cada meta e receber uma mensagem inicial baseada no progresso e na data.
- Editar nome, foto, letra/emoji e biografia do perfil, sem e-mail.
- Cinco tarefas obrigatórias protegidas contra exclusão e tarefas extras removíveis.
- Foguinho real por dias consecutivos de tarefas obrigatórias completas; extras não bloqueiam.
- Calendário por data completa, com criação e remoção de eventos.
- Explorar livros, pesquisar, favoritar, organizar biblioteca e status de leitura.
- Criar e editar metas de leitura com título, autor, prioridade e foto da capa.
- Apagar qualquer livro pela lixeira na lista ou pelo botão nos detalhes, com confirmação.
- Arrastar uma foto no enquadramento, aproximar com zoom e confirmar o recorte.
- Níveis, histórico de dias concluídos, notificações locais e módulos em construção.

## Limites e diferenças importantes

Os dados ficam neste navegador, não em uma conta na internet. Limpar os dados do navegador
remove os cadastros. Trocar de navegador, endereço ou pasta pode usar outro armazenamento.
Prefira usar sempre o mesmo endereço local. Em navegação privada ou com armazenamento
bloqueado, o navegador pode impedir o salvamento.

A versão anterior só persistia o perfil. Se a mesma origem tiver `metas-profile`, o perfil
é aproveitado. Metas e tarefas da versão antiga que só existiam na memória não podem
ser recuperadas após fechar aquela página. A nova versão salva todas essas listas.

A frase abaixo do “Olá” muda automaticamente: mostra pendência para metas atrasadas ou
próximas com pouco progresso, avisa quando uma meta está na reta final, parabeniza quando
tudo foi concluído e usa “sua jornada está evoluindo” nos outros casos. O prazo é opcional;
sem prazo, a meta continua contando para o progresso geral.

Os antigos “45 dias” e históricos fictícios foram substituídos por registros reais.
A sequência começa em zero, sem inventar dias concluídos. As tarefas reiniciam na data local.
Os eventos fictícios de maio de 2024 foram removidos; o calendário abre no mês atual.

A navegação da coleção de livros agora fica logo abaixo dos filtros, sem barra fixa no rodapé.
O site NÃO fornece e-books, não realiza compras, não possui login ou backend.
“Marcar como lendo” organiza a leitura, não abre um livro. Links de lojas abrem pesquisas externas.
Finanças, Pets, Medicamentos e Dispensa continuam como áreas em construção.

As fotos aceitam JPG, PNG ou WebP até 8 MB, são reduzidas para até 800 px e salvas como JPEG.
Cancelar um formulário não muda os dados já salvos. Se o espaço local acabar, aparece um aviso.

## Metas de leitura

Na aba Livros, clique em **Criar meta de leitura**. A prioridade indica quais livros
você quer ler primeiro: Alta, Média ou Baixa. Ela aparece no cartão e nos detalhes.
O cadastro começa em **Quero ler** e entra na biblioteca. A prioridade é uma etiqueta:
ela não altera automaticamente a ordem dos livros.

Nos detalhes, **Editar meta de leitura** permite trocar a prioridade, a capa e os outros
dados. Cancelar preserva o cadastro anterior. **Apagar livro** remove o cadastro inteiro,
inclusive dos favoritos e da biblioteca. **Remover da biblioteca** apenas retira da coleção,
sem apagar o livro. Se você apagar todos, a lista mostra uma mensagem e permite cadastrar novos.

O mesmo salvamento local da versão anterior é usado, preservando seus dados nesta origem.
Livros antigos que ainda não têm prioridade aparecem como Média e podem ser editados.

### Onde está o código novo?

- HTML: seção `formulario-livro`, formulário `form-livro` e modelo `modelo-livro`.
- CSS: último bloco, **Capa e prioridade das metas de leitura**.
- JavaScript: bloco 8, funções `abrirFormularioLivro`, `apagarLivro` e `listarLivros`.

Nos trechos revisados usamos condições `if/else`, nomes descritivos e comentários.
`startsWith` verifica como um texto começa. `for` percorre uma lista, um item por vez.
A função de fotos é reaproveitada: não há uma nova biblioteca nem um segundo sistema de upload.
