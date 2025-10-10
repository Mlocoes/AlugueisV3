#!/usr/bin/env python3
"""
Script para limpar todos os aluguéis da base de dados
Mantém a estrutura das tabelas intacta
"""
import sys
sys.path.insert(0, '/app')

from config import get_db
from models_final import AluguelSimples

def limpar_alugueis():
    """Limpa todos os aluguéis"""
    db = next(get_db())

    try:
        # Contar registros antes
        count_alugueis = db.query(AluguelSimples).count()

        print(f"📊 Registros atuais:")
        print(f"   - Aluguéis: {count_alugueis}")
        print()

        # Confirmar
        resposta = input("⚠️  Deseja realmente APAGAR todos os aluguéis? (sim/não): ")
        if resposta.lower() != 'sim':
            print("❌ Operação cancelada")
            return

        # Limpar aluguéis
        print("🗑️  Limpando aluguéis...")
        db.query(AluguelSimples).delete()

        # Commit
        db.commit()

        print()
        print("✅ Base de dados limpa com sucesso!")
        print("📝 Agora você pode importar um novo conjunto de aluguéis")

    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao limpar base: {str(e)}")
        raise

if __name__ == "__main__":
    limpar_alugueis()