# Sistema de Transferências - AlugueV3

## Visão Geral

O sistema de transferências permite distribuir valores entre proprietários de imóveis de forma granular e flexível. As transferências são usadas principalmente nos relatórios para ajustar valores entre proprietários.

## Como Funcionam as Transferências

### Estrutura dos Dados

Cada transferência contém:
- **Nome da Transferência**: Identificação descritiva
- **Alias**: Grupo de proprietários afetados
- **Proprietários e Valores**: Lista detalhada com cada proprietário e seu valor individual
- **Datas**: Período de validade (opcional)

### Exemplo de Estrutura JSON
```json
[
  {"id": 1, "valor": 1000.50},
  {"id": 2, "valor": -500.25},
  {"id": 3, "valor": -500.25}
]
```

### Campo `valor_total`

**Importante**: O campo `valor_total` no banco de dados é mantido em `0.00` por design. Ele não armazena a soma automática dos valores individuais. Os cálculos são feitos dinamicamente quando necessário.

## Uso nos Relatórios

### Inclusão de Transferências

Nos relatórios, há uma **caixa de seleção "Incluir Transferências"** que controla se os valores das transferências serão considerados no cálculo final.

- **Quando DESMARCADA** (padrão): Transferências são ignoradas nos cálculos
- **Quando MARCADA**: Os valores individuais das transferências são somados aos valores de cada proprietário

### Lógica de Cálculo

Quando as transferências são incluídas:

1. Para cada transferência ativa no período do relatório
2. Os valores individuais são extraídos do JSON `id_proprietarios`
3. Cada proprietário recebe o crédito/débito correspondente
4. O valor total do relatório é ajustado automaticamente

### Exemplo Prático

**Transferência "Ajuste IPTU"**:
```json
[
  {"id": 1, "valor": 750.00},   // João recebe +750
  {"id": 2, "valor": -250.00},  // Maria paga -250
  {"id": 3, "valor": -250.00},  // Pedro paga -250
  {"id": 4, "valor": -250.00}   // Ana paga -250
]
```

No relatório com transferências incluídas:
- João terá +750 adicionados ao seu total
- Maria terá -250 subtraídos do seu total
- E assim por diante

## Validações Implementadas

### Backend
- Validação da estrutura JSON dos proprietários
- Verificação de tipos de dados (IDs devem ser inteiros, valores devem ser números)
- Validação de alias existente
- Verificação de nomes não vazios

### Frontend
- Mensagens de erro específicas para diferentes tipos de falha
- Validação de campos obrigatórios
- Formatação adequada de datas

## Verificação de Consistência

Há um endpoint dedicado para verificar a consistência dos dados:

```
GET /api/transferencias/verificar-consistencia
```

Este endpoint retorna informações sobre:
- Se os dados estão consistentes
- Soma calculada vs valor registrado
- Status de validade dos dados JSON

## Manutenção

### Limpeza de Dados Inconsistentes

Se forem encontrados dados inconsistentes, eles podem ser corrigidos através da interface de edição ou diretamente no banco de dados.

### Backup

Sempre faça backup antes de modificar transferências em produção.

## Perguntas Frequentes

**P: Por que o valor_total fica em 0.00?**
R: Por design. O sistema calcula dinamicamente a soma quando necessário, evitando inconsistências.

**P: Como vejo o impacto das transferências no relatório?**
R: Marque a caixa "Incluir Transferências" no formulário de relatório.

**P: Posso editar uma transferência depois de criada?**
R: Sim, através do botão de editar na tabela de transferências.

**P: As transferências afetam apenas relatórios específicos?**
R: Não, elas são globais, mas só são aplicadas quando explicitamente incluídas no relatório.