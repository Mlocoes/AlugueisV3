from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from models_final import Usuario
from config import get_db
from .auth import verify_token_flexible
from services.imovel_service import ImovelService

router = APIRouter(prefix="/api/imoveis", tags=["imoveis"])

@router.get("/")
def listar_imoveis(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Lista todos os imóveis em ordem alfabética.
    Utiliza ImovelService para centralizar lógica de negócio.
    """
    try:
        imoveis = ImovelService.listar_todos(db, ordenar_por="nome")
        return {"success": True, "data": [imovel.to_dict() for imovel in imoveis]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar imóveis: {str(e)}")

@router.get("/{imovel_id}")
def obter_imovel(imovel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Obtém um imóvel específico pelo seu ID.
    Utiliza ImovelService.buscar_por_id() para buscar o imóvel.
    """
    try:
        imovel = ImovelService.buscar_por_id(db, imovel_id, eager_load=False)
        return {"success": True, "data": imovel.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter imóvel: {str(e)}")

@router.post("/")
def criar_imovel(dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Cria um novo imóvel a partir de um dicionário de dados.
    Utiliza ImovelService.criar() para validação e criação.
    """
    try:
        novo_imovel = ImovelService.criar(db, dados)
        return {"success": True, "data": novo_imovel.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar imóvel: {str(e)}")


@router.put("/{imovel_id}", response_model=Dict)
def atualizar_imovel(imovel_id: int, dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Atualiza os dados de um imóvel existente.
    Utiliza ImovelService.atualizar() para validação e atualização.
    """
    try:
        imovel = ImovelService.atualizar(db, imovel_id, dados)
        return imovel.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar imóvel: {str(e)}")

@router.delete("/{imovel_id}")
def excluir_imovel(imovel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Exclui um imóvel, se não tiver aluguéis ou participações ativas associados.
    Utiliza ImovelService.excluir() para verificar dependências e excluir.
    """
    try:
        resultado = ImovelService.excluir(db, imovel_id)
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir imóvel: {str(e)}")

@router.get("/disponiveis/", response_model=List[Dict])
def listar_imoveis_disponiveis(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Lista todos os imóveis disponíveis (não alugados).
    Utiliza ImovelService.listar_disponiveis() para filtrar imóveis disponíveis.
    """
    try:
        imoveis = ImovelService.listar_disponiveis(db)
        return [i.to_dict() for i in imoveis]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

