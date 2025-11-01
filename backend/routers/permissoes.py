"""
Router para gerenciamento de permissões de usuários
Controla quais proprietários cada usuário pode visualizar dados financeiros
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text, and_
from typing import List, Optional
from datetime import datetime

from config import get_db
from models_final import Usuario, Proprietario
from routers.auth import verify_token_flexible, is_admin

router = APIRouter(prefix="/api/permissoes", tags=["permissoes"])


# ===========================================
# SCHEMAS
# ===========================================

from pydantic import BaseModel

class ProprietarioPermitidoInfo(BaseModel):
    id: int
    nome: str
    sobrenome: Optional[str]
    nome_completo: str

class UsuarioPermissoesResponse(BaseModel):
    id: int
    usuario: str
    tipo_de_usuario: str
    proprietarios_permitidos: List[int]
    proprietarios_nomes: List[ProprietarioPermitidoInfo]
    permissoes_atualizadas_em: Optional[str]
    atualizado_por_nome: Optional[str]
    tem_permissoes: bool

class AtualizarPermissoesRequest(BaseModel):
    proprietarios_permitidos: List[int]


# ===========================================
# ENDPOINTS
# ===========================================

@router.get("/usuarios", response_model=List[UsuarioPermissoesResponse])
async def listar_usuarios_permissoes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """
    Listar todos os usuários com suas permissões.
    Apenas administradores podem acessar.
    """
    try:
        # Buscar todos os usuários com informações de permissões
        usuarios = db.query(Usuario).all()
        
        resultado = []
        for usuario in usuarios:
            # Buscar nomes dos proprietários permitidos
            proprietarios_nomes = []
            if usuario.proprietarios_permitidos:
                props = db.query(Proprietario).filter(
                    Proprietario.id.in_(usuario.proprietarios_permitidos)
                ).all()
                
                proprietarios_nomes = [
                    ProprietarioPermitidoInfo(
                        id=p.id,
                        nome=p.nome,
                        sobrenome=p.sobrenome,
                        nome_completo=f"{p.nome} {p.sobrenome or ''}".strip()
                    )
                    for p in props
                ]
            
            # Buscar nome do usuário que atualizou
            atualizado_por_nome = None
            if usuario.permissoes_atualizadas_por:
                atualizador = db.query(Usuario).filter(
                    Usuario.id == usuario.permissoes_atualizadas_por
                ).first()
                if atualizador:
                    atualizado_por_nome = atualizador.usuario
            
            tem_permissoes = bool(
                usuario.tipo_de_usuario == 'administrador' or
                (usuario.proprietarios_permitidos and len(usuario.proprietarios_permitidos) > 0)
            )
            
            resultado.append(UsuarioPermissoesResponse(
                id=usuario.id,
                usuario=usuario.usuario,
                tipo_de_usuario=usuario.tipo_de_usuario,
                proprietarios_permitidos=usuario.proprietarios_permitidos or [],
                proprietarios_nomes=proprietarios_nomes,
                permissoes_atualizadas_em=usuario.permissoes_atualizadas_em.isoformat() if usuario.permissoes_atualizadas_em else None,
                atualizado_por_nome=atualizado_por_nome,
                tem_permissoes=tem_permissoes
            ))
        
        return resultado
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar permissões: {str(e)}"
        )


@router.put("/usuarios/{usuario_id}")
async def atualizar_permissoes(
    usuario_id: int,
    request: AtualizarPermissoesRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """
    Atualizar permissões de um usuário específico.
    Apenas administradores podem atualizar permissões.
    """
    try:
        # Buscar usuário
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Verificar se os proprietários existem
        if request.proprietarios_permitidos:
            proprietarios_existentes = db.query(Proprietario.id).filter(
                Proprietario.id.in_(request.proprietarios_permitidos)
            ).all()
            
            ids_existentes = [p.id for p in proprietarios_existentes]
            if len(ids_existentes) != len(request.proprietarios_permitidos):
                ids_invalidos = set(request.proprietarios_permitidos) - set(ids_existentes)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Proprietários não encontrados: {list(ids_invalidos)}"
                )
        
        # Atualizar permissões
        usuario.proprietarios_permitidos = request.proprietarios_permitidos
        usuario.permissoes_atualizadas_em = datetime.now()
        usuario.permissoes_atualizadas_por = current_user.id
        
        db.commit()
        db.refresh(usuario)
        
        return {
            "success": True,
            "message": "Permissões atualizadas com sucesso",
            "usuario_id": usuario.id,
            "proprietarios_permitidos": usuario.proprietarios_permitidos
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar permissões: {str(e)}"
        )


@router.get("/verificar/{usuario_id}/{proprietario_id}")
async def verificar_permissao(
    usuario_id: int,
    proprietario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """
    Verificar se um usuário tem permissão para visualizar dados de um proprietário específico.
    """
    try:
        result = db.execute(
            text("SELECT usuario_tem_permissao(:usuario_id, :proprietario_id) as tem_permissao"),
            {"usuario_id": usuario_id, "proprietario_id": proprietario_id}
        )
        
        row = result.fetchone()
        return {
            "usuario_id": usuario_id,
            "proprietario_id": proprietario_id,
            "tem_permissao": row[0] if row else False
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar permissão: {str(e)}"
        )


@router.get("/proprietarios/{usuario_id}")
async def obter_proprietarios_permitidos(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """
    Obter lista de proprietários que o usuário tem permissão para visualizar.
    """
    try:
        # Usar função SQL para obter proprietários permitidos
        result = db.execute(
            text("SELECT proprietario_id FROM obter_proprietarios_permitidos(:usuario_id)"),
            {"usuario_id": usuario_id}
        )
        
        proprietarios_ids = [row[0] for row in result.fetchall()]
        
        # Buscar informações completas dos proprietários
        if proprietarios_ids:
            proprietarios = db.query(Proprietario).filter(
                Proprietario.id.in_(proprietarios_ids)
            ).all()
            
            return [
                {
                    "id": p.id,
                    "nome": p.nome,
                    "sobrenome": p.sobrenome,
                    "nome_completo": f"{p.nome} {p.sobrenome or ''}".strip(),
                    "documento": p.documento
                }
                for p in proprietarios
            ]
        
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter proprietários permitidos: {str(e)}"
        )


@router.get("/usuarios/{usuario_id}/log")
async def obter_log_permissoes(
    usuario_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """
    Obter histórico de alterações de permissões de um usuário.
    Apenas administradores podem acessar.
    """
    try:
        result = db.execute(
            text("""
                SELECT 
                    lp.id,
                    lp.acao,
                    lp.proprietarios_anteriores,
                    lp.proprietarios_novos,
                    lp.data_modificacao,
                    lp.observacoes,
                    u.usuario as modificado_por_nome
                FROM log_permissoes lp
                LEFT JOIN usuarios u ON lp.modificado_por = u.id
                WHERE lp.usuario_id = :usuario_id
                ORDER BY lp.data_modificacao DESC
                LIMIT :limit
            """),
            {"usuario_id": usuario_id, "limit": limit}
        )
        
        logs = []
        for row in result.fetchall():
            logs.append({
                "id": row[0],
                "acao": row[1],
                "proprietarios_anteriores": row[2],
                "proprietarios_novos": row[3],
                "data_modificacao": row[4].isoformat() if row[4] else None,
                "observacoes": row[5],
                "modificado_por_nome": row[6]
            })
        
        return logs
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter log de permissões: {str(e)}"
        )
