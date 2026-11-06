# Main: problemas visuais e funcionais

> Checklist convertido do relatório de 23/10/2026 (Davi). Os itens abaixo registram as pendências e recomendações do documento; não indicam que as correções já foram feitas.

## Visão geral

- [ ] Resolver 8 problemas: 3 de prioridade alta, 3 média e 2 baixa.
- [ ] Resolver as 4 decisões de produto antes dos itens que dependem delas.
- [ ] Criar `shared/services/previas-modulos.js` para destravar as abas de Finanças, Despensa, Pets e Medicamentos.

Esforço estimado no relatório: **P** = até meio dia; **M** = 1 a 2 dias; **G** = mais de 2 dias. Confirmar as estimativas com quem fará as correções.

## Decisões pendentes

- [ ] **Item 5 — Metas nas páginas de apresentação.**
  - [ ] Decidir: incluir Metas (pílula, hub e FAQ) ou atualizar os textos para “quatro módulos”.
  - [ ] Recomendação: atualizar os textos para quatro módulos agora e incluir Metas quando o módulo estiver pronto para o público.
- [ ] **Item 2 — Demonstração de Finanças.**
  - [ ] Decidir: escrever o CSS e o JavaScript que faltam ou substituir a demonstração por um `iframe` das páginas reais.
  - [ ] Recomendação: usar `iframe`, pois exige menos código e a prévia acompanha o app.
  - [ ] Definir o conteúdo das abas “Relatórios” e “Nova transação”.
- [ ] **Item 3 — Login com Google e Apple.**
  - [ ] Decidir: integrar agora ou ocultar/desabilitar os botões até a integração existir.
  - [ ] Recomendação: ocultar ou mostrar “Em breve” agora e integrar depois.
- [ ] **Item 4 — Busca do FAQ.**
  - [ ] Decidir: buscar em todas as categorias enquanto a pessoa digita ou manter a categoria selecionada e avisar sobre o escopo.
  - [ ] Recomendação: buscar em todas as categorias, como se espera de uma busca.

## Prioridade alta

- [ ] **1. Abas das prévias não trocam o conteúdo** — Prioridade alta · Esforço P · Status no relatório: aberto
  - **Impacto:** nas páginas de Finanças, Despensa, Pets e Medicamentos, clicar em “Visão geral”, “Transações” ou outra aba não muda a tela.
  - **Como reproduzir:** abrir a página de um dos quatro módulos e clicar na segunda aba. Esperado: a aba fica selecionada e o painel muda. Observado: nada muda.
  - **Causa:** as quatro páginas carregam `shared/services/previas-modulos.js`, mas o arquivo não existe (erro 404). O HTML das abas e dos painéis já está pronto.
  - **Acessibilidade:** abas não selecionadas têm `tabindex="-1"` e os painéis ficam `hidden`; teclado e leitor de tela só alcançam o primeiro painel.
  - **Checklist de correção:**
    - [ ] Criar `previas-modulos.js` genérico que use o `aria-controls` de cada aba.
    - [ ] Tratar clique, teclas de seta, `Home` e `End`.
    - [ ] Atualizar `aria-selected`, `tabindex` e `hidden` ao trocar de aba.
    - [ ] Confirmar comportamento nas quatro páginas de módulo.

- [ ] **2. Demonstração de Finanças aparece sem estilo** — Prioridade alta · Esforço G · Status no relatório: aguardando decisão
  - **Impacto:** menu de módulos empilhado na vertical, ícones minúsculos e quadrados brancos no lugar dos ícones de tema.
  - **Causa:** 140 de 179 classes da página (99 `fin-demo-*` e 41 `fin-tx-*`) não têm regras CSS. Também falta JavaScript para alternar entre as vistas, voltar e filtrar transações.
  - **Observação:** as abas “Relatórios” e “Nova transação” têm somente painel de texto.
  - **Checklist de correção:**
    - [ ] Registrar a decisão entre implementar CSS/JS próprios ou usar `iframe` das páginas reais de `modules/financas`.
    - [ ] Implementar a alternativa escolhida.
    - [ ] Definir o que mostrar em “Relatórios” e “Nova transação”.
    - [ ] Verificar o menu, os ícones, as vistas, o botão de voltar e os filtros.

- [ ] **3. Login com Google e Apple não executa ação** — Prioridade alta · Esforço P para ocultar ou G para integrar · Status no relatório: aguardando decisão
  - **Impacto:** em Criar conta e Entrar, clicar em Google ou Apple não faz nada nem mostra aviso.
  - **Causa:** `#btn-signup-google`, `#btn-signup-apple`, `#btn-login-google` e `#btn-login-apple` não têm handlers; `criar-conta.js` e `entrar.js` não tratam login social.
  - **Checklist de correção:**
    - [ ] Aplicar a decisão pendente.
    - [ ] Se a integração não estiver disponível, ocultar os botões ou desabilitá-los com o aviso “Em breve”.
    - [ ] Se integrar, conectar os botões a `shared/services/auth.js`.

## Prioridade média

- [ ] **4. Busca do FAQ tem três defeitos** — Prioridade média · Esforço P · Status no relatório: aguardando decisão
  - [ ] **4a — Busca limitada à categoria ativa.** Em `faq.js:74-86`, o item precisa corresponder à categoria e ao texto. Com “Conta e Acesso” selecionada, buscar “pets” não encontra itens que existem na categoria Pets. Ao limpar a busca, a categoria continua selecionada.
    - [ ] Aplicar a decisão de produto: mudar para “Todas as dúvidas” ao digitar, ou manter a categoria e oferecer a mensagem “Nenhum resultado em [categoria]. Buscar em todas?”.
  - [ ] **4b — Dois botões para limpar.** `type="search"` já exibe um X no Chrome e Edge, além do botão próprio `#faq-search-clear`.
    - [ ] Ocultar o botão nativo com `.faq-search-input::-webkit-search-cancel-button { appearance: none; }`, mantendo o botão do projeto.
  - [ ] **4c — Lupa sem função.** O ícone é decorativo (`<span aria-hidden="true">`) e não foca o campo.
    - [ ] Trocar por `<label for="faq-search-input">` para que o ícone foque a busca.
    - [ ] Manter a busca em tempo real; não é necessário botão de envio.

- [ ] **5. Pílula vazia e Metas ausente** — Prioridade média · Esforço P · Status no relatório: aguardando decisão
  - **Impacto:** em Criar conta e Entrar, há uma pílula em branco no bloco “Uma conta. Cinco módulos.”; o título anuncia cinco módulos, mas só quatro têm conteúdo.
  - **Causa:** há um `<span class="auth-module-pill"></span>` vazio em Criar conta e em Entrar. Metas não aparece nas páginas de apresentação, no hub nem no FAQ; não existe `logo-metas.png` em `main/assets/img/`.
  - [ ] Aplicar a decisão pendente sobre incluir Metas ou ajustar os textos para quatro módulos.
  - [ ] Remover a pílula vazia em qualquer cenário.

- [ ] **6. Dois links do perfil não têm ação** — Prioridade média · Esforço P · Status no relatório: aberto
  - [ ] Corrigir “Esqueceu?” em Editar perfil: atualmente é um `<a href="#">` sem tratamento e leva ao topo. A recuperação de senha ainda não existe.
  - [ ] Corrigir “Sair” em Perfil: o `<a id="sair-perfil">` não tem `href` e não recebe foco pelo teclado.
  - [ ] Trocar “Sair” por `<button type="button">`.

## Prioridade baixa

- [ ] **7. Ajustes menores** — Prioridade baixa · Esforço P · Status no relatório: aberto
  - [ ] **E-mail da home se perde.** O formulário envia `?email=` para Criar conta, mas `criar-conta.js` não lê o parâmetro. Ler `new URLSearchParams(location.search).get('email')` e preencher `#email`.
  - [ ] **Barra de rolagem visível nas abas.** `.abas-previa` usa `overflow-x: auto` nos quatro CSS de módulo sem esconder a barra. Repetir a regra `scrollbar-width: none` usada no FAQ.
  - [ ] Como a quarta aba fica cortada em celular, acrescentar um degradê na borda direita indicando que há mais conteúdo rolável.

- [ ] **8. Arquivos sem uso e CSS duplicado** — Prioridade baixa · Esforço M · Status no relatório: aberto
  - [ ] Avaliar a remoção de `main/js/script.js` (17 linhas) e `main/css/style.css` (203 linhas), que não são usados por páginas. O script procura `#search-input` e `.tool-card`, inexistentes, e usa a navegação antiga `../modules/<nome>/`.
  - [ ] Consolidar o CSS repetido de `financas.css`, `despensa.css`, `pets.css` e `medicamentos.css` em `shared/`. Cada arquivo tem 342 linhas e difere em apenas 8 a 10 linhas.
  - [ ] Avaliar o CSS compartilhado entre `contato.css` e `privacidade.css` (358 linhas cada; 76 linhas diferentes).
  - [ ] No hub, criar regras para `module-card-financas` e `module-card-despensa`, usadas no HTML mas sem regra em `hub.css`.
  - [ ] Avaliar `.module-card-tall`, que está no CSS e não é usado no HTML.
  - [ ] Criar regras para `chatbot-title`, `chatbot-close-button` e `placeholder-text`, presentes no HTML sem estilo.
  - [ ] Corrigir o prefixo `modalConfirmatio-` (falta “n”) para corresponder à grafia de `modalConfirmation.css` e evitar a propagação do erro.

## Ordem de correção sugerida

- [ ] 1. Criar `previas-modulos.js` (item 1), resolvendo as abas dos quatro módulos.
- [ ] 2. Corrigir a demonstração de Finanças (item 2), após a decisão entre CSS/JS próprios e `iframe`.
- [ ] 3. Resolver os botões de login social (item 3): ocultar/desabilitar agora ou integrar.
- [ ] 4. Corrigir o FAQ (item 4) e os links do perfil (item 6).
- [ ] 5. Resolver a pílula vazia e a ausência de Metas (item 5), após a decisão.
- [ ] 6. Tratar o e-mail da home, a rolagem, o hub e a limpeza de arquivos/CSS (itens 7 e 8).

## Teste e observações do relatório

- [ ] Antes de enviar para os gerentes, preencher navegador e versão, data do teste e commit da `main` para permitir reprodução.
- **Verificado no relatório:** itens 1, 2, 4 e 5 foram conferidos no navegador, com capturas em tela de 400 × 515 px.
- **Já funciona:** as 18 imagens da demonstração de Finanças existem em disco; o problema apontado é o CSS.
- **Já funciona:** a busca do FAQ filtra em tempo real; os dois X limpam o campo e restauram os 18 itens.
- **Já funciona:** o modal de confirmação funciona, embora o prefixo das classes esteja grafado incorretamente.
- **Já funciona:** fora do item 2, as outras páginas de `main/` têm no máximo 5 classes sem regra de CSS.
