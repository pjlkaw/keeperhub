# Checklist de Padronizacao

Use este arquivo durante a correcao dos modulos. Marque cada item com `[x]` somente depois de corrigir o arquivo indicado e validar o comportamento.

Status inicial: pendente
Ultima revisao: 2026-09-09

## 1. Bloqueios de entrada

- [ ] Criar uma pagina HTML valida em [modules/despensa/index.html](../modules/despensa/index.html).
- [ ] Criar uma pagina HTML valida em [modules/metas/index.html](../modules/metas/index.html).
- [ ] Decidir se [modules/metas/metas-app](../modules/metas/metas-app) sera incorporado ao modulo principal ou removido como aplicacao paralela.

## 2. Recursos compartilhados e dependencias

- [ ] Garantir a ordem `variables.css`, `reset.css`, `components.css`, estilos compartilhados adicionais e estilos do modulo em todos os HTML.
- [ ] Corrigir a ordem dos imports em [modules/financas/index.html](../modules/financas/index.html).
- [ ] Corrigir a ordem dos imports em todos os arquivos de [modules/financas/components](../modules/financas/components).
- [ ] Corrigir a ordem dos imports em [modules/pets/index.html](../modules/pets/index.html).
- [ ] Corrigir a ordem dos imports em todos os arquivos de [modules/pets/components](../modules/pets/components).
- [ ] Substituir a navbar local das paginas de [modules/despensa](../modules/despensa) por [shared/components/navbar-section.html](../shared/components/navbar-section.html).
- [ ] Avaliar a substituicao dos headers duplicados em [modules/medicamentos/components/adicionar-habito.html](../modules/medicamentos/components/adicionar-habito.html) e [modules/medicamentos/components/bons-habitos.html](../modules/medicamentos/components/bons-habitos.html) por [shared/components/header-page.html](../shared/components/header-page.html).
- [ ] Remover ou preencher os componentes vazios [modules/despensa/components/pagina.html](../modules/despensa/components/pagina.html) e [modules/metas/components/pagina.html](../modules/metas/components/pagina.html).
- [ ] Confirmar que nenhum modulo importa arquivos diretamente de outro modulo.

## 3. Padronizacao de tema e CSS

- [ ] Corrigir `var(--text)` para `var(--text-color)` em [modules/despensa/inicio.css](../modules/despensa/inicio.css).
- [ ] Corrigir `var(--azul)` ou declarar um token valido em [modules/despensa/produtos.css](../modules/despensa/produtos.css).
- [ ] Migrar gradualmente os tokens paralelos (`--black`, `--panel`, `--white`, `--muted` e similares) de [modules/financas/assets/css/style.css](../modules/financas/assets/css/style.css) para os tokens de [shared/styles/variables.css](../shared/styles/variables.css).
- [ ] Migrar os tokens paralelos (`--bg`, `--surface`, `--text`, `--amber` e similares) de [modules/metas/metas-app/style.css](../modules/metas/metas-app/style.css) para os tokens compartilhados.
- [ ] Revisar as redefinicoes locais de tokens globais em [modules/pets/assets/css/despesas.css](../modules/pets/assets/css/despesas.css) e [modules/pets/assets/css/vacinacoes.css](../modules/pets/assets/css/vacinacoes.css).
- [ ] Padronizar o servico de tema de [modules/financas/js/preview-theme.js](../modules/financas/js/preview-theme.js) para [shared/services/theme.js](../shared/services/theme.js), ou documentar formalmente a excecao.
- [ ] Garantir que paginas com `#theme-toggle` carreguem [shared/services/theme.js](../shared/services/theme.js).
- [ ] Revisar contraste nos temas claro e escuro depois da migracao dos tokens.
- [ ] Remover a importacao duplicada da fonte Nunito em [modules/despensa/produtos.html](../modules/despensa/produtos.html).

## 4. Padronizacao de cards

- [X] Confirmar que o componente base esta definido em [shared/styles/components.css](../shared/styles/components.css).
- [X] Confirmar que os cards de [modules/medicamentos](../modules/medicamentos) usam `class="card"` e, quando aplicavel, `card--interactive`.
- [ ] Adicionar `class="card"` aos cards de conteudo de [modules/despensa](../modules/despensa), mantendo as classes especificas de cada card.
- [ ] Adicionar `class="card"` aos cards de conteudo de [modules/financas](../modules/financas), mantendo as classes especificas de cada card.
- [ ] Adicionar `class="card"` aos cards de conteudo de [modules/pets](../modules/pets), mantendo as classes especificas de cada card.
- [ ] Migrar a definicao local de `.card` em [modules/metas/metas-app/style.css](../modules/metas/metas-app/style.css) para [shared/styles/components.css](../shared/styles/components.css).
- [ ] Revisar os cards proprios `summary-card`, `total-card`, `product-card` e `resumo-card` em [modules/despensa](../modules/despensa).
- [ ] Revisar os cards proprios `finance-shortcut-card`, `monthly-expenses-card`, `summary-card`, `evolution-card` e `insight-card` em [modules/financas](../modules/financas).
- [ ] Revisar `card-modelo-lembrete` e `card-agendado` em [modules/pets/components/lembretes.html](../modules/pets/components/lembretes.html).
- [ ] Substituir cores fixas do hover de `.card--interactive` em [shared/styles/components.css](../shared/styles/components.css) por tokens ou regras específicas para os temas.
- [ ] Validar bordas entre 8px e 16px e área mínima de toque de 44px nos cards de todos os módulos.

## 5. Modulo Despensa

- [ ] Definir uma unica pagina de entrada para o modulo e alinhar [modules/despensa/index.html](../modules/despensa/index.html), [modules/despensa/inicio.html](../modules/despensa/inicio.html), [modules/despensa/precos.html](../modules/despensa/precos.html), [modules/despensa/produtos.html](../modules/despensa/produtos.html) e [modules/despensa/vencimento.html](../modules/despensa/vencimento.html).
- [ ] Reorganizar os arquivos CSS legados da raiz de [modules/despensa](../modules/despensa) conforme a estrutura documentada, preservando os caminhos existentes durante a migracao.
- [ ] Substituir `onclick="irPara(...)"` por links ou comportamento centralizado em JavaScript.
- [ ] Corrigir `button` dentro de `a` em [modules/despensa/inicio.html](../modules/despensa/inicio.html).
- [ ] Substituir nomes de arquivos sem significado, como [modules/despensa/assets/img/a](../modules/despensa/assets/img/a), por nomes descritivos.

## 6. Modulo Financas

- [ ] Substituir a convencao paralela de tema por `data-theme`, `#theme-toggle` e [shared/services/theme.js](../shared/services/theme.js), se nao houver requisito funcional para mante-la.
- [ ] Validar o tema claro em [modules/financas/index.html](../modules/financas/index.html) e em cada pagina de [modules/financas/components](../modules/financas/components).
- [ ] Separar estilos compartilhaveis de [modules/financas/assets/css/style.css](../modules/financas/assets/css/style.css) caso tambem sejam usados por outros modulos.

## 7. Modulo Medicamentos

- [x] Manter a ordem dos imports de shared em [modules/medicamentos/index.html](../modules/medicamentos/index.html) e nos componentes.
- [ ] Confirmar que todos os componentes usam os tokens de [shared/styles/variables.css](../shared/styles/variables.css) para cores globais.
	- Auditoria em 2026-09-09: parcialmente executada. Foram adicionados aliases baseados nos tokens globais em [modules/medicamentos/assets/css/essentials/meds-variables.css](../modules/medicamentos/assets/css/essentials/meds-variables.css) e migradas cores neutras em [modules/medicamentos/assets/css/essentials/components.css](../modules/medicamentos/assets/css/essentials/components.css), [modules/medicamentos/assets/css/home.css](../modules/medicamentos/assets/css/home.css), [modules/medicamentos/assets/css/meds-list.css](../modules/medicamentos/assets/css/meds-list.css), [modules/medicamentos/assets/css/rotina.css](../modules/medicamentos/assets/css/rotina.css) e nos controles de [modules/medicamentos/assets/css/meds-form.css](../modules/medicamentos/assets/css/meds-form.css). O item permanece pendente porque ainda existem fallbacks fixos no proprio `meds-form.css` e em regras de tema claro de `rotina.css` que precisam ser substituidos na origem. Cores semanticas de alerta, erro, tratamento e destaque verde devem continuar em tokens especificos do modulo.
- [ ] Confirmar que o tema salvo e o botao de tema funcionam ao abrir a pagina em diferentes dispositivos e tamanhos de viewport.
- [ ] Evitar duplicacao do header compartilhado nos componentes que ainda possuem markup manual.

## 8. Modulo Metas

- [ ] Escolher entre [modules/metas/index.html](../modules/metas/index.html) como entrada oficial.
- [ ] Mover a implementacao escolhida para a estrutura `index.html`, `assets/`, `components/` e `js/` do modulo.
- [ ] Integrar o modulo escolhido com [shared/styles/variables.css](../shared/styles/variables.css), [shared/styles/components.css](../shared/styles/components.css), [shared/components/navbar-section.html](../shared/components/navbar-section.html) e [shared/services/theme.js](../shared/services/theme.js).
- [ ] Corrigir referencias de navegacao que usam `dispensa` em vez de `despensa` em [modules/metas/metas-app/script.js](../modules/metas/metas-app/script.js).
- [ ] Remover duplicacoes de imagens que ja existem em [shared/img](../shared/img).
- [ ] Remover emojis

## 9. Modulo Pets

- [ ] Corrigir a ordem dos estilos compartilhados em [modules/pets/index.html](../modules/pets/index.html) e nos componentes.
- [ ] Confirmar que os aliases `--pets-*` continuam apontando para tokens globais e nao criam um segundo sistema de tema.
- [ ] Revisar as excecoes de tema de [modules/pets/assets/css/despesas.css](../modules/pets/assets/css/despesas.css) e [modules/pets/assets/css/vacinacoes.css](../modules/pets/assets/css/vacinacoes.css) nos dois temas.
- [ ] Substituir nomes de arquivos sem significado, como [modules/pets/assets/img/a](../modules/pets/assets/img/a), por nomes descritivos.

## 10. Validacao final


## Excecoes registradas

Nenhuma excecao registrada.
