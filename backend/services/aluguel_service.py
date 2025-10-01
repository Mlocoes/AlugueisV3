"""
Serviço de Alugueis - Camada de Lógica de Negócio
Centraliza toda a lógica relacionada a alugueis
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, extract
from typing import List, Dict, Optional, Any
from datetime import datetime, date
from decimal import Decimal

from models_final import AluguelSimples, Proprietario, Imovel, Participacao


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
        query = db.query(AluguelSimples).options(
            joinedload(AluguelSimples.imovel),
            joinedload(AluguelSimples.participacoes).joinedload(Participacao.proprietario)
        )
        
        # Aplicar filtros
        if ano:
            query = query.filter(extract('year', AluguelSimples.data_referencia) == ano)
        if mes and agregacao == "mensal":
            query = query.filter(extract('month', AluguelSimples.data_referencia) == mes)
        
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
            func.sum(AluguelSimples.valor_aluguel).label('total'),
            func.count(AluguelSimples.id).label('quantidade'),
            func.avg(AluguelSimples.valor_aluguel).label('media')
        ).filter(
            and_(
                AluguelSimples.data_referencia >= data_inicio,
                AluguelSimples.data_referencia <= data_fim
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
    def get_totais_por_imovel(
        db: Session,
        ano: int,
        mes: int
    ) -> List[Dict[str, Any]]:
        """
        Retorna totais de alugueis agrupados por imóvel para um período
        Otimizado com joinedload para evitar N+1 queries
        
        Args:
            db: Sessão do banco de dados
            ano: Ano para filtrar
            mes: Mês para filtrar
        
        Returns:
            Lista de dicionários com totais por imóvel
        """
        from models_final import AluguelSimples
        
        # Query otimizada com joinedload
        resultado = db.query(
            AluguelSimples.imovel_id,
            func.sum(AluguelSimples.valor_liquido_proprietario).label('total_valor'),
            func.count(AluguelSimples.id).label('quantidade_proprietarios')
        ).filter(
            AluguelSimples.ano == ano,
            AluguelSimples.mes == mes
        ).group_by(
            AluguelSimples.imovel_id
        ).order_by(
            func.sum(AluguelSimples.valor_liquido_proprietario).desc()
        ).all()
        
        # Buscar nomes de imóveis em uma única query
        imovel_ids = [row.imovel_id for row in resultado]
        imoveis_dict = {}
        if imovel_ids:
            imoveis = db.query(Imovel).filter(Imovel.id.in_(imovel_ids)).all()
            imoveis_dict = {imovel.id: imovel.nome for imovel in imoveis}
        
        # Formatar resposta
        totais = []
        for row in resultado:
            totais.append({
                'imovel_id': row.imovel_id,
                'nome_imovel': imoveis_dict.get(row.imovel_id, None),
                'total_valor': float(row.total_valor),
                'quantidade_proprietarios': int(row.quantidade_proprietarios),
                'ano': ano,
                'mes': mes
            })
        
        return totais
    
    @staticmethod
    def get_totais_mensais(
        db: Session,
        limite_meses: int = 12
    ) -> Dict[str, Any]:
        """
        Retorna totais de alugueis agrupados por mês
        
        Args:
            db: Sessão do banco de dados
            limite_meses: Número máximo de meses a retornar
        
        Returns:
            Dicionário com totais mensais
        """
        from models_final import AluguelSimples
        import calendar
        
        # Obter todos os períodos disponíveis ordenados por data
        resultado = db.query(
            AluguelSimples.ano,
            AluguelSimples.mes,
            func.sum(AluguelSimples.valor_liquido_proprietario).label('total_mes'),
            func.count(AluguelSimples.id).label('quantidade_alugueis')
        ).group_by(
            AluguelSimples.ano,
            AluguelSimples.mes
        ).order_by(
            AluguelSimples.ano.desc(),
            AluguelSimples.mes.desc()
        ).limit(limite_meses).all()
        
        if not resultado:
            return {
                'totais_mensais': [],
                'total_periodos': 0
            }
        
        # Formatar resposta e inverter ordem para mostrar cronologicamente
        totais_mensais = []
        for row in reversed(resultado):
            try:
                nome_mes = calendar.month_name[row.mes] if row.mes and 1 <= row.mes <= 12 else str(row.mes)
                periodo_label = f"{nome_mes} {row.ano}"
            except:
                periodo_label = f"{row.mes}/{row.ano}"
            
            totais_mensais.append({
                'ano': row.ano,
                'mes': row.mes,
                'periodo': periodo_label,
                'total_valor': float(row.total_mes),
                'quantidade_alugueis': int(row.quantidade_alugueis)
            })
        
        return {
            'totais_mensais': totais_mensais,
            'total_periodos': len(totais_mensais)
        }
    
    @staticmethod
    def get_alugueis_por_imovel(
        db: Session,
        imovel_id: int,
        limit: Optional[int] = None
    ) -> List[AluguelSimples]:
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
        query = db.query(AluguelSimples).options(
            joinedload(AluguelSimples.imovel),
            joinedload(AluguelSimples.participacoes).joinedload(Participacao.proprietario)
        ).filter(AluguelSimples.imovel_id == imovel_id).order_by(
            AluguelSimples.data_referencia.desc()
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
        aluguel_existente = db.query(AluguelSimples).filter(
            and_(
                AluguelSimples.imovel_id == imovel_id,
                AluguelSimples.data_referencia == data_referencia
            )
        ).first()
        
        if aluguel_existente:
            return False, "Já existe aluguel para este imóvel nesta data"
        
        return True, None
