"""
Serviço de Imóveis
Centraliza toda a lógica de negócio relacionada aos imóveis.
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Optional
from datetime import datetime
from fastapi import HTTPException

from models_final import Imovel, AluguelSimples, Participacao


class ImovelService:
    """
    Serviço responsável por toda a lógica de negócio de imóveis.
    Implementa padrão Service Layer para centralizar operações e melhorar testabilidade.
    """

    @staticmethod
    def listar_todos(db: Session, ordenar_por: str = "nome") -> List[Imovel]:
        """
        Lista todos os imóveis ordenados.
        
        Args:
            db: Sessão do banco de dados
            ordenar_por: Campo para ordenação (padrão: nome)
            
        Returns:
            Lista de objetos Imovel
        """
        try:
            query = db.query(Imovel)
            
            # Aplicar ordenação
            if ordenar_por == "nome":
                query = query.order_by(Imovel.nome)
            elif ordenar_por == "id":
                query = query.order_by(Imovel.id)
            elif ordenar_por == "data_criacao":
                query = query.order_by(Imovel.data_criacao.desc())
            
            return query.all()
            
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao listar imóveis: {str(e)}"
            )

    @staticmethod
    def buscar_por_id(db: Session, imovel_id: int, eager_load: bool = False) -> Optional[Imovel]:
        """
        Busca um imóvel específico por ID.
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel
            eager_load: Se True, carrega relacionamentos (participacoes, alugueis)
            
        Returns:
            Objeto Imovel ou None
            
        Raises:
            HTTPException: Se imóvel não for encontrado
        """
        try:
            query = db.query(Imovel).filter(Imovel.id == imovel_id)
            
            if eager_load:
                query = query.options(
                    joinedload(Imovel.participacoes),
                    joinedload(Imovel.alugueis)
                )
            
            imovel = query.first()
            
            if not imovel:
                raise HTTPException(
                    status_code=404,
                    detail=f"Imóvel com ID {imovel_id} não encontrado"
                )
            
            return imovel
            
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao buscar imóvel: {str(e)}"
            )

    @staticmethod
    def _limpar_dados(dados: Dict) -> Dict:
        """
        Limpa dados do formulário convertendo strings vazias em None.
        
        Args:
            dados: Dicionário com dados do formulário
            
        Returns:
            Dicionário com dados limpos
        """
        dados_limpos = {}
        for key, value in dados.items():
            # Converter strings vazias em None
            if value == '' or value is None:
                dados_limpos[key] = None
            # Manter outros valores como estão
            else:
                dados_limpos[key] = value
        return dados_limpos

    @staticmethod
    def criar(db: Session, dados: Dict) -> Imovel:
        """
        Cria um novo imóvel.
        
        Args:
            db: Sessão do banco de dados
            dados: Dicionário com dados do imóvel
            
        Returns:
            Objeto Imovel criado
            
        Raises:
            HTTPException: Se houver erro na validação ou criação
        """
        try:
            # Limpar dados (converter strings vazias em None)
            dados = ImovelService._limpar_dados(dados)
            
            # Validar dados
            ImovelService.validar_dados(dados)
            
            # Filtrar apenas campos válidos do modelo
            campos_modelo = [c.key for c in Imovel.__table__.columns]
            dados_filtrados = {k: v for k, v in dados.items() if k in campos_modelo}
            
            # Criar novo imóvel
            novo_imovel = Imovel(**dados_filtrados)
            
            db.add(novo_imovel)
            db.commit()
            db.refresh(novo_imovel)
            
            return novo_imovel
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao criar imóvel: {str(e)}"
            )

    @staticmethod
    def atualizar(db: Session, imovel_id: int, dados: Dict) -> Imovel:
        """
        Atualiza os dados de um imóvel existente.
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel a atualizar
            dados: Dicionário com dados a atualizar
            
        Returns:
            Objeto Imovel atualizado
            
        Raises:
            HTTPException: Se imóvel não for encontrado ou houver erro
        """
        try:
            # Limpar dados (converter strings vazias em None)
            dados = ImovelService._limpar_dados(dados)
            
            # Buscar imóvel
            imovel = ImovelService.buscar_por_id(db, imovel_id)
            
            # Validar dados
            ImovelService.validar_dados(dados, atualizacao=True)
            
            # Atualizar apenas campos permitidos
            campos_modelo = [c.key for c in Imovel.__table__.columns]
            for campo, valor in dados.items():
                if campo in campos_modelo and campo != 'id':
                    setattr(imovel, campo, valor)
            
            # Atualizar timestamp
            imovel.data_atualizacao = datetime.now()
            
            db.commit()
            db.refresh(imovel)
            
            return imovel
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao atualizar imóvel: {str(e)}"
            )

    @staticmethod
    def excluir(db: Session, imovel_id: int) -> Dict:
        """
        Exclui um imóvel se não tiver dependências ativas.
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel a excluir
            
        Returns:
            Dicionário com mensagem de sucesso e estatísticas
            
        Raises:
            HTTPException: Se imóvel não for encontrado ou tiver dependências
        """
        try:
            # Buscar imóvel
            imovel = ImovelService.buscar_por_id(db, imovel_id)
            
            # Verificar dependências
            dependencias = ImovelService._verificar_dependencias(db, imovel_id)
            
            if dependencias["alugueis"] > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Não é possível excluir o imóvel porque tem {dependencias['alugueis']} aluguel(is) associado(s). Remova primeiro os aluguéis ou desative o imóvel."
                )
            
            if dependencias["participacoes_ativas"] > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Não é possível excluir o imóvel porque tem {dependencias['participacoes_ativas']} participação(ões) ativa(s) associada(s). Remova as participações primeiro."
                )
            
            # Limpar participações vazias (porcentagem = 0) antes de excluir
            participacoes_vazias_removidas = 0
            if dependencias["participacoes_vazias"] > 0:
                participacoes_vazias_removidas = db.query(Participacao).filter(
                    Participacao.imovel_id == imovel_id,
                    Participacao.porcentagem == 0
                ).delete(synchronize_session=False)
            
            # Excluir imóvel
            db.delete(imovel)
            db.commit()
            
            return {
                "mensagem": "Imóvel excluído com sucesso",
                "imovel_id": imovel_id,
                "nome": imovel.nome,
                "participacoes_vazias_removidas": participacoes_vazias_removidas
            }
            
        except HTTPException:
            db.rollback()
            raise
        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao excluir imóvel: {str(e)}"
            )

    @staticmethod
    def listar_disponiveis(db: Session) -> List[Imovel]:
        """
        Lista todos os imóveis disponíveis (não alugados).
        
        Args:
            db: Sessão do banco de dados
            
        Returns:
            Lista de objetos Imovel disponíveis
        """
        try:
            return db.query(Imovel).filter(
                Imovel.alugado == False
            ).order_by(Imovel.nome).all()
            
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao listar imóveis disponíveis: {str(e)}"
            )

    @staticmethod
    def buscar(db: Session, termo: str) -> List[Imovel]:
        """
        Busca imóveis por nome, endereço ou CEP.
        
        Args:
            db: Sessão do banco de dados
            termo: Termo de busca
            
        Returns:
            Lista de objetos Imovel que correspondem à busca
        """
        try:
            termo_like = f"%{termo}%"
            return db.query(Imovel).filter(
                (Imovel.nome.ilike(termo_like)) |
                (Imovel.endereco.ilike(termo_like)) |
                (Imovel.cep.ilike(termo_like))
            ).order_by(Imovel.nome).all()
            
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao buscar imóveis: {str(e)}"
            )

    @staticmethod
    def obter_estatisticas(db: Session, imovel_id: Optional[int] = None) -> Dict:
        """
        Obtém estatísticas sobre imóveis.
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel específico (opcional)
            
        Returns:
            Dicionário com estatísticas
        """
        try:
            if imovel_id:
                # Estatísticas de um imóvel específico
                imovel = ImovelService.buscar_por_id(db, imovel_id)
                dependencias = ImovelService._verificar_dependencias(db, imovel_id)
                
                return {
                    "imovel_id": imovel_id,
                    "nome": imovel.nome,
                    "alugado": imovel.alugado,
                    "alugueis_total": dependencias["alugueis"],
                    "participacoes_ativas": dependencias["participacoes_ativas"],
                    "participacoes_vazias": dependencias["participacoes_vazias"]
                }
            else:
                # Estatísticas gerais
                total_imoveis = db.query(Imovel).count()
                imoveis_alugados = db.query(Imovel).filter(Imovel.alugado == True).count()
                imoveis_disponiveis = db.query(Imovel).filter(Imovel.alugado == False).count()
                
                return {
                    "total_imoveis": total_imoveis,
                    "imoveis_alugados": imoveis_alugados,
                    "imoveis_disponiveis": imoveis_disponiveis,
                    "taxa_ocupacao": round((imoveis_alugados / total_imoveis * 100), 2) if total_imoveis > 0 else 0
                }
                
        except HTTPException:
            raise
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao obter estatísticas: {str(e)}"
            )

    @staticmethod
    def validar_dados(dados: Dict, atualizacao: bool = False) -> None:
        """
        Valida os dados de um imóvel.
        
        Args:
            dados: Dicionário com dados do imóvel
            atualizacao: Se True, permite validação parcial
            
        Raises:
            HTTPException: Se dados inválidos
        """
        # Campos obrigatórios na criação
        if not atualizacao:
            campos_obrigatorios = ["nome"]
            for campo in campos_obrigatorios:
                if campo not in dados or not dados[campo]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Campo obrigatório ausente: {campo}"
                    )
        
        # Validar nome
        if "nome" in dados:
            if not isinstance(dados["nome"], str) or len(dados["nome"].strip()) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Nome do imóvel inválido"
                )
        
        # Validar alugado (se fornecido)
        if "alugado" in dados:
            if not isinstance(dados["alugado"], bool):
                raise HTTPException(
                    status_code=400,
                    detail="Campo 'alugado' deve ser booleano"
                )

    @staticmethod
    def _verificar_dependencias(db: Session, imovel_id: int) -> Dict:
        """
        Verifica dependências de um imóvel (interno).
        
        Args:
            db: Sessão do banco de dados
            imovel_id: ID do imóvel
            
        Returns:
            Dicionário com contadores de dependências
        """
        alugueis_count = db.query(AluguelSimples).filter(
            AluguelSimples.imovel_id == imovel_id
        ).count()
        
        participacoes_ativas_count = db.query(Participacao).filter(
            Participacao.imovel_id == imovel_id,
            Participacao.porcentagem > 0
        ).count()
        
        participacoes_vazias_count = db.query(Participacao).filter(
            Participacao.imovel_id == imovel_id,
            Participacao.porcentagem == 0
        ).count()
        
        return {
            "alugueis": alugueis_count,
            "participacoes_ativas": participacoes_ativas_count,
            "participacoes_vazias": participacoes_vazias_count
        }
