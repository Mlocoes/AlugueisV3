from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any
import pandas as pd
import traceback
import io
from models_final import Proprietario, Usuario, ProprietarioUpdateSchema, ProprietarioCreateSchema
from config import get_db
from .auth import verify_token_flexible, is_admin
from services.proprietario_service import ProprietarioService

router = APIRouter(prefix="/api/proprietarios", tags=["proprietarios"])

# Limite máximo do arquivo de importação em bytes (ex: 10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# ===========================================
# ROUTES
# ===========================================

@router.get("/", response_model=List[Dict])
def listar_proprietarios(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Lista todos os proprietários em ordem alfabética - OPTIMIZED"""
    try:
        proprietarios = ProprietarioService.listar_todos(db=db, ordem="nome")
        return [p.to_dict() for p in proprietarios]
    except Exception as e:
        print(f"❌ Erro ao listar proprietários: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro ao listar proprietários")

@router.post("/", response_model=Dict, status_code=201)
def criar_proprietario(dados: ProprietarioCreateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(is_admin)):
    """Cria um novo proprietário - OPTIMIZED"""
    try:
        # Validar dados
        valido, erro = ProprietarioService.validar_dados(dados.dict())
        if not valido:
            raise HTTPException(status_code=400, detail=erro)
        
        # Criar usando service
        sucesso, erro, proprietario = ProprietarioService.criar(db=db, dados=dados.dict())
        
        if not sucesso:
            raise HTTPException(status_code=400, detail=erro)
        
        return proprietario.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar proprietário: {str(e)}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro interno ao criar proprietário")

@router.get("/{proprietario_id}", response_model=Dict)
def obter_proprietario(proprietario_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obtém um proprietário específico pelo seu ID - OPTIMIZED"""
    try:
        proprietario = ProprietarioService.buscar_por_id(
            db=db,
            proprietario_id=proprietario_id,
            incluir_participacoes=False
        )
        
        if not proprietario:
            raise HTTPException(status_code=404, detail="Proprietário não encontrado")
        
        return proprietario.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao obter proprietário: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao obter proprietário")

@router.put("/{proprietario_id}", response_model=Dict)
def atualizar_proprietario(
    proprietario_id: int,
    dados: ProprietarioUpdateSchema,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """Atualiza os dados de um proprietário existente - OPTIMIZED"""
    try:
        # Atualizar usando service
        update_data = dados.dict(exclude_unset=True)
        sucesso, erro, proprietario = ProprietarioService.atualizar(
            db=db,
            proprietario_id=proprietario_id,
            dados=update_data
        )
        
        if not sucesso:
            if "não encontrado" in erro:
                raise HTTPException(status_code=404, detail=erro)
            raise HTTPException(status_code=400, detail=erro)
        
        return proprietario.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao atualizar proprietário: {str(e)}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar proprietário")


@router.delete("/{proprietario_id}")
def excluir_proprietario(
    proprietario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """Exclui um proprietário - OPTIMIZED
    A exclusão falhará se houver aluguéis ou participações associadas.
    """
    try:
        # Excluir usando service
        sucesso, erro = ProprietarioService.excluir(db=db, proprietario_id=proprietario_id)
        
        if not sucesso:
            if "não encontrado" in erro:
                raise HTTPException(status_code=404, detail=erro)
            if "dependências" in erro or "foreign key" in erro.lower():
                raise HTTPException(status_code=400, detail=erro)
            raise HTTPException(status_code=400, detail=erro)
        
        return {"success": True, "mensagem": "Proprietário excluído com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao excluir proprietário: {str(e)}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro interno ao excluir proprietário")
