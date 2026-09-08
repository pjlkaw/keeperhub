# Instrucoes do KeeperHub

Estas regras valem para qualquer alteracao neste repositorio.

## Antes de editar

1. Leia `docs/padronizacao.txt`.
2. Leia `docs/shared.txt` quando a alteracao envolver componentes, estilos ou servicos compartilhados.
3. Identifique o modulo afetado e siga a estrutura existente dele.
4. Nao crie uma nova convencao se ja houver uma convencao documentada.
5. Se uma regra nao puder ser seguida sem quebrar codigo existente, explique o conflito antes de fazer uma migracao ampla.

## Regras obrigatorias

- Use nomes de arquivos e pastas em minusculo, sem acentos ou espacos.
- Prefira `kebab-case` para novos arquivos e pastas.
- Use `camelCase` para variaveis e funcoes JavaScript.
- Use nomes em portugues no dominio da aplicacao.
- Modulos nao podem importar arquivos diretamente de outros modulos.
- Codigo usado por mais de um modulo pertence a `shared/`.
- Em paginas HTML, carregue nesta ordem: `variables.css`, `reset.css`, `components.css`, estilos compartilhados adicionais e estilos do modulo.
- Use tokens de `shared/styles/variables.css` em vez de repetir cores fixas.
- Paginas com `#theme-toggle` devem carregar `/shared/services/theme.js`.
- Preserve o comportamento existente quando a tarefa for apenas visual ou de organizacao.
- Nao renomeie arquivos existentes sem necessidade direta para a tarefa.
- Nao adicione dependencias ou frameworks sem justificar a necessidade.

## Padrao de pagina de modulo

Uma nova pagina deve seguir, quando aplicavel:

```text
modules/nome-do-modulo/
|-- index.html
|-- assets/
|   |-- css/
|   |-- img/
|-- components/
|-- js/
```

Use os componentes compartilhados antes de duplicar header, navbar ou controles de tema.

## O que a IA deve evitar

- Nao usar placeholders como `SEU-MODULO` em codigo final.
- Nao importar CSS compartilhado duas vezes.
- Nao colocar `button` dentro de `a`; estilize o link como botao quando a acao for navegacao.
- Nao criar outro componente compartilhado dentro de um modulo.
- Nao reorganizar outros modulos durante uma tarefa localizada.
- Nao substituir arquivos inteiros quando uma alteracao pequena resolver o problema.
- Nao misturar refatoracao geral com uma funcionalidade nova sem solicitar essa ampliacao.

## Checklist antes de concluir

Confirme na resposta final:

- quais arquivos foram alterados;
- se os caminhos para `shared/` estao corretos;
- se nao foram criadas duplicacoes de componentes ou estilos;
- se tema claro e escuro continuam previstos quando aplicavel;
- qual comando ou teste foi executado;
- qualquer regra existente que ficou pendente por causa de compatibilidade.

Se a tarefa tocar em mais de um modulo, mantenha as alteracoes separadas e explique o motivo de cada uma.
