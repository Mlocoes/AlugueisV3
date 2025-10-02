#!/usr/bin/env python3
"""
Script de verificação completa da tela de Relatórios
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)

def test_endpoint(name, url, expected_status=200):
    """Testa um endpoint e retorna o resultado"""
    print(f"\n🔍 Testando: {name}")
    print(f"   URL: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            print("   ✅ Status correto!")
        else:
            print(f"   ❌ Status incorreto! Esperado: {expected_status}")
            return None
        
        try:
            data = response.json()
            print(f"   Tipo de resposta: {type(data)}")
            
            if isinstance(data, list):
                print(f"   Quantidade de items: {len(data)}")
                if len(data) > 0:
                    print(f"   Primeiro item: {json.dumps(data[0], indent=2, ensure_ascii=False)}")
            elif isinstance(data, dict):
                print(f"   Keys: {list(data.keys())}")
                if 'data' in data:
                    print(f"   data type: {type(data['data'])}")
                    if isinstance(data['data'], list):
                        print(f"   data length: {len(data['data'])}")
            
            return data
        except Exception as e:
            print(f"   ❌ Erro ao decodificar JSON: {e}")
            print(f"   Resposta raw: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"   ❌ Erro na requisição: {e}")
        return None

def main():
    print_header("VERIFICAÇÃO COMPLETA - TELA DE RELATÓRIOS")
    print(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test 1: Info do router
    print_header("1. INFO DO ROUTER")
    test_endpoint(
        "Info do Router de Reportes",
        f"{BASE_URL}/api/reportes/"
    )
    
    # Test 2: Anos disponíveis (precisa autenticação)
    print_header("2. ANOS DISPONÍVEIS")
    print("⚠️  Este endpoint requer autenticação JWT")
    print("   Para testar, use o navegador ou adicione um token válido")
    
    # Test 3: Resumo mensal sem filtros
    print_header("3. RESUMO MENSAL - SEM FILTROS")
    data = test_endpoint(
        "Resumo Mensal (todos os dados)",
        f"{BASE_URL}/api/reportes/resumen-mensual"
    )
    
    if data:
        print("\n📊 ANÁLISE DOS DADOS:")
        if isinstance(data, list):
            # Agrupar por ano/mês
            periodos = {}
            proprietarios = set()
            
            for item in data:
                periodo = f"{item.get('mes', '?')}/{item.get('ano', '?')}"
                if periodo not in periodos:
                    periodos[periodo] = []
                periodos[periodo].append(item)
                proprietarios.add(item.get('nome_proprietario', 'Desconhecido'))
            
            print(f"\n   📅 Períodos encontrados: {len(periodos)}")
            for periodo, items in sorted(periodos.items(), reverse=True):
                print(f"      • {periodo}: {len(items)} registros")
            
            print(f"\n   👥 Proprietários únicos: {len(proprietarios)}")
            for prop in sorted(proprietarios):
                print(f"      • {prop}")
            
            # Estatísticas gerais
            if data:
                total_alugueis = sum(item.get('soma_alugueis', 0) for item in data)
                total_taxas = sum(item.get('soma_taxas', 0) for item in data)
                
                print(f"\n   💰 Totais gerais:")
                print(f"      • Soma de aluguéis: R$ {total_alugueis:,.2f}")
                print(f"      • Soma de taxas: R$ {total_taxas:,.2f}")
                print(f"      • Valor líquido total: R$ {(total_alugueis - total_taxas):,.2f}")
    
    # Test 4: Resumo mensal com filtro de ano
    print_header("4. RESUMO MENSAL - FILTRADO POR ANO")
    current_year = datetime.now().year
    test_endpoint(
        f"Resumo Mensal (ano {current_year})",
        f"{BASE_URL}/api/reportes/resumen-mensual?ano={current_year}"
    )
    
    # Test 5: Resumo mensal com filtro de mês
    print_header("5. RESUMO MENSAL - FILTRADO POR MÊS")
    current_month = datetime.now().month
    test_endpoint(
        f"Resumo Mensal (mês {current_month})",
        f"{BASE_URL}/api/reportes/resumen-mensual?mes={current_month}"
    )
    
    # Test 6: Resumo mensal com ambos filtros
    print_header("6. RESUMO MENSAL - FILTRADO POR ANO E MÊS")
    test_endpoint(
        f"Resumo Mensal (mês {current_month}/{current_year})",
        f"{BASE_URL}/api/reportes/resumen-mensual?ano={current_year}&mes={current_month}"
    )
    
    # Test 7: Verificar dependências (endpoints relacionados)
    print_header("7. ENDPOINTS RELACIONADOS")
    
    test_endpoint(
        "Lista de Proprietários",
        f"{BASE_URL}/api/proprietarios/"
    )
    
    test_endpoint(
        "Aliases para Relatórios",
        f"{BASE_URL}/api/extras/reportes"
    )
    
    # Test 8: Estrutura dos dados
    print_header("8. VALIDAÇÃO DA ESTRUTURA DOS DADOS")
    data = test_endpoint(
        "Validação de estrutura",
        f"{BASE_URL}/api/reportes/resumen-mensual"
    )
    
    if data and isinstance(data, list) and len(data) > 0:
        print("\n📋 CAMPOS ESPERADOS vs RECEBIDOS:")
        campos_esperados = [
            'nome_proprietario',
            'proprietario_id',
            'mes',
            'ano',
            'valor_total',
            'soma_alugueis',
            'soma_taxas',
            'quantidade_imoveis'
        ]
        
        primeiro_item = data[0]
        for campo in campos_esperados:
            presente = "✅" if campo in primeiro_item else "❌"
            valor = primeiro_item.get(campo, "N/A")
            tipo = type(valor).__name__
            print(f"   {presente} {campo}: {valor} ({tipo})")
    
    print_header("VERIFICAÇÃO COMPLETA")
    print("\n✅ Teste concluído!")
    print("\n📝 PRÓXIMOS PASSOS:")
    print("   1. Testar no navegador: http://localhost:3000")
    print("   2. Fazer login e acessar 'Relatórios'")
    print("   3. Verificar filtros (Ano, Mês, Proprietário)")
    print("   4. Verificar checkbox 'Transferências' (somente admin)")
    print("   5. Verificar exibição da tabela")
    print("   6. Verificar ordenação dos dados")

if __name__ == "__main__":
    main()
