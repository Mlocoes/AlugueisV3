#!/bin/bash
#
# Script: verificar_dependencias.sh
# Descrição: Executa a verificação de vulnerabilidades nas dependências Python.
#
# Este script utiliza a ferramenta 'safety' para analisar o arquivo `backend/requirements.txt`
# e identificar quaisquer pacotes com vulnerabilidades de segurança conhecidas.
#
# Uso:
#   1. Navegue até o diretório 'testes/seguranca'.
#   2. Conceda permissão de execução: chmod +x verificar_dependencias.sh
#   3. Execute o script: ./verificar_dependencias.sh
#
# Resultados Esperados:
#   - Se nenhuma vulnerabilidade for encontrada, o script exibirá uma mensagem de sucesso.
#   - Se vulnerabilidades forem detectadas, a ferramenta 'safety' listará os pacotes
#     vulneráveis, a versão instalada e a versão que contém a correção.
#

echo "================================================="
echo "  INICIANDO VERIFICAÇÃO DE DEPENDÊNCIAS (SAFETY) "
echo "================================================="
echo
echo "Alvo: backend/requirements.txt"
echo

# Executa o safety para verificar as dependências
safety check -r backend/requirements.txt

# Captura o código de saída do safety
# Um código de saída 0 significa que não foram encontradas vulnerabilidades.
# Um código de saída não-zero indica que vulnerabilidades foram encontradas.
EXIT_CODE=$?

echo
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ SUCESSO: Nenhuma vulnerabilidade de segurança encontrada nas dependências."
else
  echo "🚨 ALERTA: Vulnerabilidades de segurança foram detectadas. Revise o relatório acima."
fi
echo
echo "================================================="
echo "   VERIFICAÇÃO DE DEPENDÊNCIAS FINALIZADA       "
echo "================================================="

# Retorna o mesmo código de saída do safety para que possa ser usado em pipelines de CI/CD
exit $EXIT_CODE