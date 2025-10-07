#!/bin/bash
#
# Script: analise_estatica.sh
# Descrição: Executa a análise estática de código para identificar vulnerabilidades de segurança.
#
# Este script utiliza a ferramenta 'bandit' para escanear o código-fonte do backend
# em busca de padrões de código que possam indicar falhas de segurança.
#
# Uso:
#   1. Navegue até o diretório 'testes/seguranca'.
#   2. Conceda permissão de execução: chmod +x analise_estatica.sh
#   3. Execute o script: ./analise_estatica.sh
#
# Resultados Esperados:
#   - O 'bandit' analisará os arquivos .py no diretório 'backend/'.
#   - Um relatório será gerado listando as issues encontradas, classificadas por
#     severidade (Low, Medium, High) e confiança (Low, Medium, High).
#   - O script terminará com um resumo das descobertas.
#

echo "================================================="
echo "   INICIANDO ANÁLISE ESTÁTICA (BANDIT)          "
echo "================================================="
echo
echo "Alvo: diretório backend/"
echo

# Executa o bandit no diretório do backend, excluindo os testes
# -r: recursivo
# -ll: reporta apenas issues de severidade MÉDIA ou ALTA
# -x: exclui o diretório de testes para focar no código de produção
bandit -r backend/ -ll -x backend/tests/

# Captura o código de saída do bandit
# Um código de saída 0 significa que não foram encontradas issues (com a configuração de severidade).
# Um código de saída 1 indica que issues foram encontradas.
EXIT_CODE=$?

echo
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ SUCESSO: Nenhuma vulnerabilidade de severidade MÉDIA ou ALTA foi encontrada."
else
  echo "🚨 ALERTA: Foram detectadas vulnerabilidades de severidade MÉDIA ou ALTA. Revise o relatório acima."
fi
echo
echo "================================================="
echo "      ANÁLISE ESTÁTICA FINALIZADA               "
echo "================================================="

# Retorna o mesmo código de saída do bandit
exit $EXIT_CODE