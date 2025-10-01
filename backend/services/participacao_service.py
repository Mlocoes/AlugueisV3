"""
Serviço de Participações - Camada de Lógica de Negócio
Centraliza toda a lógica relacionada a participações e versionamento
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc
from typing import List, Dict, Optional, Any
from datetime import datetime, date
from decimal import Decimal

from backend.models_final import (
    Participacao, HistoricoParticipacao, Imovel, Proprietario
)


class ParticipacaoService:
    """Serviço para gerenciar operações de participações"""
    
    @staticmethod
    def get_participacoes_ativas(
        db: Session,
        imovel_id: Optional[int] = None,
        data_referencia: Optional[date] = None
    ) -> List[Participacao]:
        """
        Retorna participações ativas com eager loading
        Otimizado para evitar N+1 queries
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel para filtrar (opcional)
            data_referencia: Data de referência (opcional, padrão: hoje)
        
        Returns:
            Lista de participações ativas
        """
        if data_referencia is None:
            data_referencia = date.today()
        
        query = db.query(Participacao).options(
            joinedload(Participacao.imovel),
            joinedload(Participacao.proprietario)
        ).filter(
            and_(
                Participacao.data_inicio <= data_referencia,
                (Participacao.data_fim.is_(None)) | 
                (Participacao.data_fim >= data_referencia)
            )
        )
        
        if imovel_id:
            query = query.filter(Participacao.imovel_id == imovel_id)
        
        return query.all()
    
    @staticmethod
    def criar_nova_versao(
        db: Session,
        imovel_id: int,
        participacoes: List[Dict[str, Any]],
        data_inicio: date,
        usuario_id: Optional[int] = None
    ) -> tuple[bool, Optional[str], Optional[List[Participacao]]]:
        """
        Cria uma nova versão de participações para um imóvel
        Valida e arquiva versão anterior automaticamente
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel
            participacoes: Lista de dict com proprietario_id e porcentagem
            data_inicio: Data de início da nova versão
            usuario_id: ID do usuário que criou (para auditoria)
        
        Returns:
            Tupla (sucesso, mensagem_erro, novas_participacoes)
        """
        # Validar percentuais
        total_percentual = sum(p['porcentagem_participacao'] for p in participacoes)
        if abs(total_percentual - 100) > 0.01:  # Tolerância de 0.01%
            return False, f"Total de percentuais deve ser 100%. Atual: {total_percentual}%", None
        
        # Verificar se imóvel existe
        imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
        if not imovel:
            return False, f"Imóvel {imovel_id} não encontrado", None
        
        try:
            # Arquivar participações antigas
            ParticipacaoService._arquivar_versao_anterior(
                db, imovel_id, data_inicio, usuario_id
            )
            
            # Criar novas participações
            novas_participacoes = []
            for p in participacoes:
                participacao = Participacao(
                    imovel_id=imovel_id,
                    proprietario_id=p['proprietario_id'],
                    porcentagem_participacao=Decimal(str(p['porcentagem_participacao'])),
                    data_inicio=data_inicio,
                    data_fim=None  # Nova versão fica ativa indefinidamente
                )
                db.add(participacao)
                novas_participacoes.append(participacao)
            
            db.flush()  # Para obter os IDs
            
            # Registrar no histórico
            for participacao in novas_participacoes:
                historico = HistoricoParticipacao(
                    participacao_id=participacao.id,
                    imovel_id=imovel_id,
                    proprietario_id=participacao.proprietario_id,
                    porcentagem_participacao=participacao.porcentagem_participacao,
                    data_inicio=participacao.data_inicio,
                    data_fim=participacao.data_fim,
                    versao=ParticipacaoService._get_proxima_versao(db, imovel_id),
                    usuario_id=usuario_id,
                    data_criacao=datetime.now()
                )
                db.add(historico)
            
            db.commit()
            return True, None, novas_participacoes
            
        except Exception as e:
            db.rollback()
            return False, f"Erro ao criar nova versão: {str(e)}", None
    
    @staticmethod
    def _arquivar_versao_anterior(
        db: Session,
        imovel_id: int,
        data_fim: date,
        usuario_id: Optional[int]
    ) -> None:
        """
        Arquiva a versão anterior de participações
        Define data_fim para as participações ativas
        """
        participacoes_ativas = db.query(Participacao).filter(
            and_(
                Participacao.imovel_id == imovel_id,
                Participacao.data_fim.is_(None)
            )
        ).all()
        
        for participacao in participacoes_ativas:
            participacao.data_fim = data_fim
            
            # Registrar no histórico
            historico = HistoricoParticipacao(
                participacao_id=participacao.id,
                imovel_id=imovel_id,
                proprietario_id=participacao.proprietario_id,
                porcentagem_participacao=participacao.porcentagem_participacao,
                data_inicio=participacao.data_inicio,
                data_fim=data_fim,
                versao=ParticipacaoService._get_versao_atual(db, imovel_id),
                usuario_id=usuario_id,
                data_criacao=datetime.now()
            )
            db.add(historico)
    
    @staticmethod
    def _get_proxima_versao(db: Session, imovel_id: int) -> int:
        """Retorna o número da próxima versão"""
        max_versao = db.query(func.max(HistoricoParticipacao.versao)).filter(
            HistoricoParticipacao.imovel_id == imovel_id
        ).scalar()
        return (max_versao or 0) + 1
    
    @staticmethod
    def _get_versao_atual(db: Session, imovel_id: int) -> int:
        """Retorna o número da versão atual"""
        max_versao = db.query(func.max(HistoricoParticipacao.versao)).filter(
            HistoricoParticipacao.imovel_id == imovel_id
        ).scalar()
        return max_versao or 1
    
    @staticmethod
    def get_historico_completo(
        db: Session,
        imovel_id: int
    ) -> List[Dict[str, Any]]:
        """
        Retorna histórico completo de participações de um imóvel
        Agrupado por versão com eager loading
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel
        
        Returns:
            Lista de versões com suas participações
        """
        historico = db.query(HistoricoParticipacao).options(
            joinedload(HistoricoParticipacao.proprietario)
        ).filter(
            HistoricoParticipacao.imovel_id == imovel_id
        ).order_by(
            desc(HistoricoParticipacao.versao),
            HistoricoParticipacao.proprietario_id
        ).all()
        
        # Agrupar por versão
        versoes = {}
        for item in historico:
            versao = item.versao
            if versao not in versoes:
                versoes[versao] = {
                    "versao": versao,
                    "data_inicio": item.data_inicio.isoformat(),
                    "data_fim": item.data_fim.isoformat() if item.data_fim else None,
                    "participacoes": []
                }
            
            versoes[versao]["participacoes"].append({
                "proprietario_id": item.proprietario_id,
                "proprietario_nome": (
                    f"{item.proprietario.nome} {item.proprietario.sobrenome or ''}"
                ).strip() if item.proprietario else "N/A",
                "porcentagem": float(item.porcentagem_participacao)
            })
        
        return list(versoes.values())
    
    @staticmethod
    def validar_participacoes(
        participacoes: List[Dict[str, Any]]
    ) -> tuple[bool, Optional[str]]:
        """
        Valida lista de participações
        
        Args:
            participacoes: Lista de dicionários com dados das participações
        
        Returns:
            Tupla (válido, mensagem_erro)
        """
        if not participacoes:
            return False, "Lista de participações não pode estar vazia"
        
        # Validar percentuais
        total = sum(p.get('porcentagem_participacao', 0) for p in participacoes)
        if abs(total - 100) > 0.01:
            return False, f"Total de percentuais deve ser 100%. Atual: {total}%"
        
        # Validar valores individuais
        for i, p in enumerate(participacoes):
            if p.get('porcentagem_participacao', 0) <= 0:
                return False, f"Participação {i+1}: percentual deve ser positivo"
            
            if not p.get('proprietario_id'):
                return False, f"Participação {i+1}: proprietario_id é obrigatório"
        
        # Verificar duplicação de proprietários
        proprietarios = [p['proprietario_id'] for p in participacoes]
        if len(proprietarios) != len(set(proprietarios)):
            return False, "Proprietários duplicados na lista"
        
        return True, None
