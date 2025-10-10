#!/usr/bin/env python3
"""
Script para verificar aluguéis importados, incluindo valores negativos
"""
import sys
sys.path.append('/app')

from config import SessionLocal
from models_final import AluguelSimples

def check_alugueis():
    """Verifica os aluguéis importados"""
    db = SessionLocal()
    
    try:
        # Total de registros
        total = db.query(AluguelSimples).count()
        print(f"📊 Total de aluguéis: {total}")
        
        # Valores negativos
        negativos = db.query(AluguelSimples).filter(AluguelSimples.valor_liquido_proprietario < 0).all()
        print(f"🔴 Aluguéis com valores negativos: {len(negativos)}")
        
        if negativos:
            print("\n📋 Detalhes dos valores negativos:")
            for aluguel in negativos[:10]:  # Mostrar apenas os primeiros 10
                print(f"  - ID: {aluguel.id}, Imóvel: {aluguel.imovel_id}, Proprietário: {aluguel.proprietario_id}, Valor: R$ {aluguel.valor_liquido_proprietario}, Mês/Ano: {aluguel.mes}/{aluguel.ano}")
        
        # Valores positivos
        positivos = db.query(AluguelSimples).filter(AluguelSimples.valor_liquido_proprietario > 0).count()
        print(f"✅ Aluguéis com valores positivos: {positivos}")
        
        # Valores zero
        zeros = db.query(AluguelSimples).filter(AluguelSimples.valor_liquido_proprietario == 0).count()
        print(f"⚪ Aluguéis com valor zero: {zeros}")
        
        # Por mês/ano
        from sqlalchemy import func
        por_periodo = db.query(
            AluguelSimples.ano,
            AluguelSimples.mes,
            func.count(AluguelSimples.id).label('total')
        ).group_by(AluguelSimples.ano, AluguelSimples.mes).order_by(AluguelSimples.ano, AluguelSimples.mes).all()
        
        print("\n📅 Aluguéis por período:")
        for ano, mes, total_periodo in por_periodo:
            negativos_periodo = db.query(AluguelSimples).filter(
                AluguelSimples.ano == ano,
                AluguelSimples.mes == mes,
                AluguelSimples.valor_liquido_proprietario < 0
            ).count()
            print(f"  - {mes:02d}/{ano}: {total_periodo} registros ({negativos_periodo} negativos)")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_alugueis()
