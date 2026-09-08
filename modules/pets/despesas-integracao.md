# Despesas de Pets — ações para integrar

A página está em `components/despesas.html` e seu CSS em
`assets/css/despesas.css`. A paleta escura é exclusiva desta tela; os demais
módulos e o tema claro continuam com as cores compartilhadas.

Não foi criado JavaScript de negócio. O único script carregado é o serviço
de tema já existente. A seta retorna ao dashboard, as categorias levam aos
grupos do extrato e o botão + abre o formulário com o popover nativo do HTML.

## Integração com Node.js

- Substituir `data-pet-id="exemplo"` pelo pet autenticado e preservar sua
  seleção nos links com `data-manter-pet`.
- Consultar despesas e orçamento por pet e mês. Habilitar os botões
  `data-acao="mes-anterior"` e `data-acao="mes-seguinte"` após conectar a consulta.
- Calcular total, subtotal por categoria, percentuais e saldo. Armazenar
  valores em centavos e tratar orçamento zero, excedido e extrato vazio.
- Validar `#formulario-despesa`: descrição, categoria, valor positivo e data
  obrigatórios; estabelecimento e observações opcionais.
- Habilitar `data-acao="salvar-despesa"` somente com validação e persistência.
  Validar também no servidor e conferir a autorização de acesso ao pet.
- Mostrar envio, sucesso e erro em `#mensagem-despesa`, impedir envio
  duplicado e atualizar resumo e extrato após salvar.
- Integrar a consulta programada à agenda sem somá-la às despesas realizadas.

## Dados e ícones da referência

Outubro/2024: seis despesas de R$ 145,00, R$ 25,00, R$ 70,00, R$ 30,00,
R$ 85,00 e R$ 65,00. Total: R$ 420,00; teto: R$ 600,00; consumo: 70%; saldo:
R$ 180,00. O contador foi corrigido de cinco para seis para corresponder ao
extrato. A consulta de novembro está programada e não entra na soma.

Os 11 PNGs enviados são usados sem alteração gráfica em `assets/img/`.
Na ordem Icon.png, Icon-1.png até Icon-10.png, os nomes são alimentação,
ração, petiscos, higiene, banho, lazer, brinquedo, saúde, antipulgas, vacina
e consulta programada, sem acentos, seguidos de `-despesas-pets.png`.
Os originais do ZIP foram preservados.
