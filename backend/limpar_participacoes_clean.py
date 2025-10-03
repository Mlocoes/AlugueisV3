#!/usr/bin/env python3
"""
Script para limpar todas as participações da base de dados
Mantém a estrutura das tabelas intacta
"""
from config import get_db
from models_final import Participacao, HistoricoParticipacao

def limpar_participacoes():
    """Limpa todas as participações e histórico"""
    db = next(get_db())
    
    try:
        # Contar registros antes
        count_participacoes = db.query(Participacao).count()
        count_historico = db.query(HistoricoParticipacao).count()
        
        print(f"📊 Registros atuais:")
        print(f"   - Participações: {count_participacoes}")
        print(f"   - Histórico: {count_historico}")
        print()
        
        # Limpar histórico primeiro (por causa de foreign keys)
        print("🗑️  Limpando histórico de participações...")
        deleted_historico = db.query(HistoricoParticipacao).delete()
        
        # Limpar participações
        print("🗑️  Limpando participações...")
        deleted_participacoes = db.query(Participacao).delete()
        
        # Commit
        db.commit()
        
        print()
        print("✅ Base de dados limpa com sucesso!")
        print(f"   - {deleted_participacoes} participações removidas")
        print(f"   - {deleted_historico} registros de histórico removidos")
        print()
        print("📝 Agora você pode importar um novo conjunto de participações")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao limpar base: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    limpar_participacoes()
