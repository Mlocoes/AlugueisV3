# Relatório de Auditoria do Sistema AlugueisV3

**Data da Auditoria:** 18 de Outubro de 2025

## 1. Análise de Vulnerabilidades

### 1.1. Dependências do Backend

A análise de vulnerabilidades das dependências do backend foi realizada utilizando a ferramenta `safety`.

**Resultado:** Nenhuma vulnerabilidade conhecida foi encontrada nas dependências do backend.

### 1.2. Dependências do Frontend

A análise de vulnerabilidades das dependências do frontend foi realizada manualmente, inspecionando o arquivo `frontend/index.html` e pesquisando por vulnerabilidades conhecidas nas bibliotecas utilizadas.

**Dependências Identificadas:**

*   **Bootstrap:** 5.3.0
*   **Font Awesome:** 6.0.0
*   **Bootstrap Icons:** 1.10.0
*   **Handsontable:** 14.0.0
*   **Chart.js:** Versão não especificada
*   **DOMPurify:** 3.0.6

**Resultados:**

*   **Bootstrap 5.3.0, Font Awesome 6.0.0, Bootstrap Icons 1.10.0, e DOMPurify 3.0.6:** Nenhuma vulnerabilidade conhecida encontrada para estas versões.
*   **Handsontable 14.0.0:** A biblioteca Handsontable tem um histórico de vulnerabilidades de XSS. Embora a versão 14.0.0 não pareça estar afetada pelas vulnerabilidades mais conhecidas, é recomendado atualizar para a versão mais recente (atualmente 16.1.1) para garantir a segurança.
*   **Chart.js:** A versão do Chart.js não está especificada no link do CDN, o que impossibilita a verificação de vulnerabilidades. É uma prática recomendada especificar a versão da biblioteca para garantir que uma versão segura e conhecida seja utilizada.

**Recomendações:**

1.  **Atualizar Handsontable:** Atualizar a biblioteca Handsontable para a versão mais recente para mitigar possíveis vulnerabilidades de XSS.
2.  **Especificar a Versão do Chart.js:** Especificar a versão do Chart.js no link do CDN para garantir que uma versão segura e conhecida seja utilizada.

## 2. Análise de Duplicação de Código

A análise de duplicação de código foi realizada utilizando a ferramenta `jscpd`.

**Resultado:** A análise revelou uma duplicação de código de **5.07%** em todo o projeto. As áreas mais afetadas são:

*   **JavaScript (Frontend):** 15.2% de duplicação.
*   **SQL:** 11.71% de duplicação.

Apesar da refatoração mencionada no `README.md`, a duplicação de código no frontend ainda é alta. Isso sugere que a refatoração pode não ter sido tão eficaz quanto o esperado ou que existem outras áreas com duplicação significativa.

**Recomendações:**

1.  **Refatorar o Código Frontend:** Realizar uma análise mais aprofundada do código JavaScript para identificar as áreas com maior duplicação e refatorá-las para utilizar componentes e funções reutilizáveis.
2.  **Refatorar o Código SQL:** Analisar os scripts SQL para identificar e eliminar a duplicação de código, possivelmente através da criação de funções ou procedures reutilizáveis no banco de dados.

## 3. Análise de Qualidade de Código e Melhores Práticas

### 3.1. Análise Estática de Segurança com `bandit`

A análise estática de segurança do código Python foi realizada utilizando a ferramenta `bandit`.

**Resultados:**

*   **1 Problema de Severidade Média:**
    *   `[B404:any_other_function_with_shell_equals_true]` no arquivo `scripts/install.py`. O uso de `shell=True` com `subprocess` pode levar a vulnerabilidades de injeção de comando.
*   **24 Problemas de Severidade Baixa:**
    *   `[B101:assert_used]` em vários arquivos de teste. O uso de `assert` em testes não é uma vulnerabilidade, mas o uso de bibliotecas de asserção como a do `pytest` pode fornecer mensagens de erro mais descritivas.

**Recomendações:**

1.  **Remover `shell=True`:** Modificar o script `scripts/install.py` para evitar o uso de `shell=True` com `subprocess`. Em vez disso, passar os comandos como uma lista de argumentos.
2.  **Utilizar Asserções do Pytest:** Considerar o uso das asserções do `pytest` nos testes para obter mensagens de erro mais detalhadas.

### 3.2. Segredos Hardcoded e Senhas Padrão

A análise manual do código revelou a presença de senhas padrão no script de instalação.

**Resultados:**

*   O arquivo `scripts/install.py` contém senhas padrão para o usuário administrador (`admin00`) e para o banco de dados (`alugueisv3_senha`).

**Recomendações:**

1.  **Remover Senhas Padrão:** Remover as senhas padrão do script de instalação. Em vez de sugerir um valor padrão, o script deve exigir que o usuário insira uma senha durante o processo de instalação.

## 4. Resumo das Recomendações

1.  **Vulnerabilidades:**
    *   Atualizar a biblioteca **Handsontable** para a versão mais recente.
    *   Especificar a versão da biblioteca **Chart.js** no link do CDN.
2.  **Duplicação de Código:**
    *   Refatorar o código **JavaScript** do frontend para reduzir a duplicação.
    *   Refatorar os scripts **SQL** para eliminar a duplicação.
3.  **Qualidade de Código e Melhores Práticas:**
    *   Remover o uso de `shell=True` com `subprocess` no script de instalação.
    *   Remover as senhas padrão do script de instalação e exigir que o usuário defina suas próprias senhas.