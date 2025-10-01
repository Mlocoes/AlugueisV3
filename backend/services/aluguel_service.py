"""
Serviço de Alugueis - Camada de Lógica de Negócio
Centraliza toda a lógica relacionada a alugueis
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, extract
from typing import List, Dict, Optional, Any
from datetime import datetime, date
from decimal import Decimal

from backend.models_final import Aluguel, Proprietario, Imovel, Participacao


class AluguelService:
    """Serviço para gerenciar operações de alugueis"""
    
    @staticmethod
    def get_distribuicao_matriz(
        db: Session,
        ano: Optional[int] = None,
        mes: Optional[int] = None,
        agregacao: str = "mensal"
    ) -> List[Dict[str, Any]]:
        """
        Retorna a distribuição de alugueis em formato matriz
        Otimizado com joinedload para evitar N+1 queries
        
        Args:
            db: Sessão do banco de dados
            ano: Ano para filtrar (opcional)
            mes: Mês para filtrar (opcional)
            agregacao: Tipo de agregação ('mensal' ou 'ano_completo')
        
        Returns:
            Lista de dicionários com dados agregados
        """
        # Base query com joinedload para evitar N+1
        query = db.query(Aluguel).options(
            joinedload(Aluguel.imovel),
            joinedload(Aluguel.participacoes).joinedload(Participacao.proprietario)
        )
        
        # Aplicar filtros
        if ano:
            query = query.filter(extract('year', Aluguel.data_referencia) == ano)
        if mes and agregacao == "mensal":
            query = query.filter(extract('month', Aluguel.data_referencia) == mes)
        
        alugueis = query.all()
        
        # Processar resultados
        resultado = []
        for aluguel in alugueis:
            # Calcular valores por proprietário
            for participacao in aluguel.participacoes:
                valor_proprietario = (
                    aluguel.valor_aluguel * participacao.porcentagem_participacao / 100
                )
                
                resultado.append({
                    "aluguel_id": aluguel.id,
                    "data_referencia": aluguel.data_referencia.isoformat(),
                    "imovel_id": aluguel.imovel_id,
                    "imovel_nome": aluguel.imovel.apelido if aluguel.imovel else "N/A",
                    "proprietario_id": participacao.proprietario_id,
                    "proprietario_nome": (
                        f"{participacao.proprietario.nome} "
                        f"{participacao.proprietario.sobrenome or ''}"
                    ).strip() if participacao.proprietario else "N/A",
                    "valor_total": float(aluguel.valor_aluguel),
                    "participacao": float(participacao.porcentagem_participacao),
                    "valor_proprietario": float(valor_proprietario),
                    "status": aluguel.status
                })
        
        return resultado
    
    @staticmethod
    def get_totais_por_periodo(
        db: Session,
        data_inicio: date,
        data_fim: date
    ) -> Dict[str, Any]:
        """
        Calcula totais de alugueis para um período
        
        Args:
            db: Sessão do banco de dados
            data_inicio: Data inicial do período
            data_fim: Data final do período
        
        Returns:
            Dicionário com totais agregados
        """
        result = db.query(
            func.sum(Aluguel.valor_aluguel).label('total'),
            func.count(Aluguel.id).label('quantidade'),
            func.avg(Aluguel.valor_aluguel).label('media')
        ).filter(
            and_(
                Aluguel.data_referencia >= data_inicio,
                Aluguel.data_referencia <= data_fim
            )
        ).first()
        
        return {
            "total": float(result.total or 0),
            "quantidade": result.quantidade or 0,
            "media": float(result.media or 0),
            "periodo": {
                "inicio": data_inicio.isoformat(),
                "fim": data_fim.isoformat()
            }
        }
    
    @staticmethod
    def get_alugueis_por_imovel(
        db: Session,
        imovel_id: int,
        limit: Optional[int] = None
    ) -> List[Aluguel]:
        """
        Retorna alugueis de um imóvel específico
        Com eager loading de relacionamentos
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel
            limit: Número máximo de resultados
        
        Returns:
            Lista de alugueis
        """
        query = db.query(Aluguel).options(
            joinedload(Aluguel.imovel),
            joinedload(Aluguel.participacoes).joinedload(Participacao.proprietario)
        ).filter(Aluguel.imovel_id == imovel_id).order_by(
            Aluguel.data_referencia.desc()
        )
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    @staticmethod
    def calcular_impostos(valor_aluguel: Decimal) -> Dict[str, Decimal]:
        """
        Calcula impostos sobre valor de aluguel
        
        Args:
            valor_aluguel: Valor do aluguel
        
        Returns:
            Dicionário com valores de impostos
        """
        # Implementar lógica de cálculo de impostos
        # Exemplo simplificado
        irrf = valor_aluguel * Decimal('0.15') if valor_aluguel > 1903.98 else Decimal('0')
        
        return {
            "valor_base": valor_aluguel,
            "irrf": irrf,
            "liquido": valor_aluguel - irrf
        }
    
    @staticmethod
    def validar_aluguel(
        valor: Decimal,
        data_referencia: date,
        imovel_id: int,
        db: Session
    ) -> tuple[bool, Optional[str]]:
        """
        Valida dados de um aluguel antes de criar/atualizar
        
        Args:
            valor: Valor do aluguel
            data_referencia: Data de referência
            imovel_id: ID do imóvel
            db: Sessão do banco de dados
        
        Returns:
            Tupla (válido, mensagem_erro)
        """
        # Validar valor
        if valor <= 0:
            return False, "Valor do aluguel deve ser positivo"
        
        # Validar data
        if data_referencia > date.today():
            return False, "Data de referência não pode ser futura"
        
        # Verificar se imóvel existe
        imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
        if not imovel:
            return False, f"Imóvel {imovel_id} não encontrado"
        
        # Verificar duplicação
        aluguel_existente = db.query(Aluguel).filter(
            and_(
                Aluguel.imovel_id == imovel_id,
                Aluguel.data_referencia == data_referencia
            )
        ).first()
        
        if aluguel_existente:
            return False, "Já existe aluguel para este imóvel nesta data"
        
        return True, None
