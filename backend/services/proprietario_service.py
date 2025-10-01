"""
Serviço de Proprietários - Camada de Lógica de Negócio
Centraliza toda a lógica relacionada a proprietários
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime

from models_final import Proprietario, Participacao, AluguelSimples


class ProprietarioService:
    """Serviço para gerenciar operações de proprietários"""
    
    @staticmethod
    def listar_todos(
        db: Session,
        ordem: str = "nome",
        incluir_participacoes: bool = False
    ) -> List[Proprietario]:
        """
        Lista todos os proprietários
        
        Args:
            db: Sessão do banco de dados
            ordem: Campo para ordenação (padrão: 'nome')
            incluir_participacoes: Se deve incluir participações com eager loading
        
        Returns:
            Lista de proprietários
        """
        query = db.query(Proprietario)
        
        # Eager loading opcional
        if incluir_participacoes:
            query = query.options(
                joinedload(Proprietario.participacoes).joinedload(Participacao.imovel)
            )
        
        # Ordenação
        if ordem == "nome":
            query = query.order_by(Proprietario.nome)
        elif ordem == "id":
            query = query.order_by(Proprietario.id)
        else:
            query = query.order_by(Proprietario.nome)
        
        return query.all()
    
    @staticmethod
    def buscar_por_id(
        db: Session,
        proprietario_id: int,
        incluir_participacoes: bool = False,
        incluir_alugueis: bool = False
    ) -> Optional[Proprietario]:
        """
        Busca um proprietário por ID com eager loading opcional
        
        Args:
            db: Sessão do banco de dados
            proprietario_id: ID do proprietário
            incluir_participacoes: Se deve incluir participações
            incluir_alugueis: Se deve incluir aluguéis
        
        Returns:
            Proprietário ou None se não encontrado
        """
        query = db.query(Proprietario)
        
        # Eager loading conforme necessário
        if incluir_participacoes:
            query = query.options(
                joinedload(Proprietario.participacoes).joinedload(Participacao.imovel)
            )
        
        if incluir_alugueis:
            query = query.options(
                joinedload(Proprietario.alugueis).joinedload(AluguelSimples.imovel)
            )
        
        return query.filter(Proprietario.id == proprietario_id).first()
    
    @staticmethod
    def criar(
        db: Session,
        dados: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Optional[Proprietario]]:
        """
        Cria um novo proprietário
        
        Args:
            db: Sessão do banco de dados
            dados: Dicionário com dados do proprietário
        
        Returns:
            Tupla (sucesso, mensagem_erro, proprietario)
        """
        try:
            # Validar campos obrigatórios
            if not dados.get('nome'):
                return False, "Nome é obrigatório", None
            
            # Verificar se já existe
            existe = db.query(Proprietario).filter(
                Proprietario.nome == dados['nome']
            ).first()
            
            if existe and dados.get('email') and existe.email == dados.get('email'):
                return False, "Proprietário com este nome e email já existe", None
            
            # Criar novo proprietário
            novo_proprietario = Proprietario(**dados)
            db.add(novo_proprietario)
            db.commit()
            db.refresh(novo_proprietario)
            
            return True, None, novo_proprietario
            
        except Exception as e:
            db.rollback()
            return False, f"Erro ao criar proprietário: {str(e)}", None
    
    @staticmethod
    def atualizar(
        db: Session,
        proprietario_id: int,
        dados: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Optional[Proprietario]]:
        """
        Atualiza um proprietário existente
        
        Args:
            db: Sessão do banco de dados
            proprietario_id: ID do proprietário
            dados: Dicionário com dados para atualizar
        
        Returns:
            Tupla (sucesso, mensagem_erro, proprietario)
        """
        try:
            proprietario = db.query(Proprietario).filter(
                Proprietario.id == proprietario_id
            ).first()
            
            if not proprietario:
                return False, "Proprietário não encontrado", None
            
            # Atualizar campos
            for campo, valor in dados.items():
                if hasattr(proprietario, campo) and campo != 'id':
                    setattr(proprietario, campo, valor)
            
            db.commit()
            db.refresh(proprietario)
            
            return True, None, proprietario
            
        except Exception as e:
            db.rollback()
            return False, f"Erro ao atualizar proprietário: {str(e)}", None
    
    @staticmethod
    def excluir(
        db: Session,
        proprietario_id: int,
        verificar_dependencias: bool = True
    ) -> Tuple[bool, Optional[str]]:
        """
        Exclui um proprietário
        
        Args:
            db: Sessão do banco de dados
            proprietario_id: ID do proprietário
            verificar_dependencias: Se deve verificar dependências antes de excluir
        
        Returns:
            Tupla (sucesso, mensagem_erro)
        """
        try:
            proprietario = db.query(Proprietario).filter(
                Proprietario.id == proprietario_id
            ).first()
            
            if not proprietario:
                return False, "Proprietário não encontrado"
            
            # Verificar dependências
            if verificar_dependencias:
                # Verificar participações
                participacoes = db.query(Participacao).filter(
                    Participacao.proprietario_id == proprietario_id
                ).count()
                
                if participacoes > 0:
                    return False, f"Não é possível excluir. Proprietário possui {participacoes} participação(ões) ativa(s)"
                
                # Verificar aluguéis
                alugueis = db.query(AluguelSimples).filter(
                    AluguelSimples.proprietario_id == proprietario_id
                ).count()
                
                if alugueis > 0:
                    return False, f"Não é possível excluir. Proprietário possui {alugueis} aluguel(éis) registrado(s)"
            
            # Excluir
            db.delete(proprietario)
            db.commit()
            
            return True, None
            
        except Exception as e:
            db.rollback()
            return False, f"Erro ao excluir proprietário: {str(e)}"
    
    @staticmethod
    def buscar(
        db: Session,
        termo: str,
        limite: int = 50
    ) -> List[Proprietario]:
        """
        Busca proprietários por termo (nome, email, telefone, etc)
        
        Args:
            db: Sessão do banco de dados
            termo: Termo de busca
            limite: Número máximo de resultados
        
        Returns:
            Lista de proprietários encontrados
        """
        termo_lower = f"%{termo.lower()}%"
        
        return db.query(Proprietario).filter(
            or_(
                func.lower(Proprietario.nome).like(termo_lower),
                func.lower(Proprietario.email).like(termo_lower),
                func.lower(Proprietario.telefone).like(termo_lower),
                func.lower(Proprietario.documento).like(termo_lower)
            )
        ).order_by(Proprietario.nome).limit(limite).all()
    
    @staticmethod
    def obter_estatisticas(
        db: Session,
        proprietario_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Obtém estatísticas de um proprietário
        
        Args:
            db: Sessão do banco de dados
            proprietario_id: ID do proprietário
        
        Returns:
            Dicionário com estatísticas ou None
        """
        proprietario = db.query(Proprietario).filter(
            Proprietario.id == proprietario_id
        ).first()
        
        if not proprietario:
            return None
        
        # Contar participações ativas
        participacoes_ativas = db.query(Participacao).filter(
            Participacao.proprietario_id == proprietario_id,
            Participacao.ativo == True
        ).count()
        
        # Contar total de aluguéis
        total_alugueis = db.query(AluguelSimples).filter(
            AluguelSimples.proprietario_id == proprietario_id
        ).count()
        
        # Calcular total recebido
        total_recebido = db.query(
            func.sum(AluguelSimples.valor_liquido_proprietario)
        ).filter(
            AluguelSimples.proprietario_id == proprietario_id
        ).scalar() or 0.0
        
        return {
            "proprietario_id": proprietario_id,
            "nome": proprietario.nome,
            "participacoes_ativas": participacoes_ativas,
            "total_alugueis": total_alugueis,
            "total_recebido": float(total_recebido)
        }
    
    @staticmethod
    def validar_dados(dados: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Valida dados de um proprietário
        
        Args:
            dados: Dicionário com dados para validar
        
        Returns:
            Tupla (válido, mensagem_erro)
        """
        # Nome é obrigatório
        if not dados.get('nome') or not dados.get('nome').strip():
            return False, "Nome é obrigatório"
        
        # Validar email se fornecido
        if dados.get('email'):
            email = dados['email'].strip()
            if '@' not in email or '.' not in email:
                return False, "Email inválido"
        
        # Validar documento se fornecido
        if dados.get('documento'):
            doc = dados['documento'].strip().replace('.', '').replace('-', '').replace('/', '')
            if len(doc) not in [11, 14]:  # CPF ou CNPJ
                return False, "Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos"
        
        return True, None
