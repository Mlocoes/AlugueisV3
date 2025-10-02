#!/usr/bin/env python3
"""
Script para testar a integração de transferências no relatório
"""
import json
from datetime import datetime

print("="*80)
print("ANÁLISE DE TRANSFERÊNCIAS")
print("="*80)

# Dados da transferência retornada pelo backend
transferencia = {
    "id": 1,
    "nome_transferencia": "Guga",
    "valor_total": 2000.0,
    "id_proprietarios": '[{"id":1,"valor":1000},{"id":3,"valor":-1000}]',
    "data_criacao": "2000-01-01T00:00:00",
    "data_fim": "2050-12-31T00:00:00"
}

print("\n📦 TRANSFERÊNCIA DO BACKEND:")
print(json.dumps(transferencia, indent=2, ensure_ascii=False))

# Parse dos participantes
participantes = json.loads(transferencia['id_proprietarios'])
print("\n👥 PARTICIPANTES:")
for p in participantes:
    sinal = "+" if p['valor'] > 0 else ""
    print(f"   Proprietário {p['id']}: {sinal}{p['valor']}")

# Data da transferência
data_criacao = datetime.fromisoformat(transferencia['data_criacao'].replace('T', ' '))
print(f"\n📅 DATA DA TRANSFERÊNCIA:")
print(f"   Data completa: {data_criacao}")
print(f"   Ano: {data_criacao.year}")
print(f"   Mês: {data_criacao.month}")

# Período que está sendo consultado (exemplo)
print(f"\n🔍 TESTES DE FILTRO:")

# Teste 1: Janeiro/2000 (deve coincidir)
if data_criacao.year == 2000 and data_criacao.month == 1:
    print("   ✅ Janeiro/2000: COINCIDE")
else:
    print("   ❌ Janeiro/2000: NÃO COINCIDE")

# Teste 2: Setembro/2024 (não deve coincidir)
if data_criacao.year == 2024 and data_criacao.month == 9:
    print("   ✅ Setembro/2024: COINCIDE")
else:
    print("   ❌ Setembro/2024: NÃO COINCIDE")

# Teste 3: Sem filtro (qualquer período)
print("   ℹ️  Sem filtro: Sempre inclui")

print("\n" + "="*80)
print("PROBLEMA IDENTIFICADO")
print("="*80)
print("""
A transferência tem data_criacao = "2000-01-01"
Isso significa que ela só será incluída quando o usuário filtrar por:
  • Ano: 2000
  • Mês: Janeiro (1)

Se o usuário estiver vendo dados de 2024 ou 2025, a transferência NÃO será incluída!

SOLUÇÕES POSSÍVEIS:
1. Ignorar o filtro de data e SEMPRE incluir transferências ativas
2. Usar data_criacao e data_fim como período de validade (não como data do evento)
3. Adicionar campo "mes_referencia" e "ano_referencia" para indicar a qual período pertence
""")

print("="*80)
print("RECOMENDAÇÃO")
print("="*80)
print("""
A lógica atual compara:
  • data_criacao da transferência com ano/mês do filtro

Mas parece que o sistema deveria usar:
  • data_criacao e data_fim como período de VALIDADE
  • Se uma transferência está ativa (data atual entre criacao e fim),
    ela deve ser aplicada a TODOS os relatórios, independente do período

Código atual:
  if (tDate.getFullYear() == ano && (tDate.getMonth() + 1) == mes)

Código sugerido:
  // Verificar se a transferência está ativa no período consultado
  const dataInicio = new Date(t.data_criacao);
  const dataFim = new Date(t.data_fim);
  const dataConsulta = new Date(ano, mes - 1, 1);
  
  if (dataConsulta >= dataInicio && dataConsulta <= dataFim) {
      // Incluir transferência
  }
""")

print("="*80)
