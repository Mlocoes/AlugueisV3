"""
Router para gerenciamento de DARF
(Documento de Arrecadação de Receitas Federais)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from typing import List
from datetime import datetime, date

from config import get_db
from models_final import Darf, Proprietario, DarfCreate, DarfUpdate, DarfResponse, DarfImportacao
from routers.auth import verify_token

router = APIRouter(prefix="/api/darf", tags=["darf"])

# ============================================
# CRUD DARF
# ============================================

@router.get("/", response_model=List[DarfResponse])
async def listar_darfs(
    skip: int = 0,
    limit: int = 100,
    proprietario_id: int = None,
    ano: int = None,
    mes: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Listar DARFs com filtros opcionais"""
    query = db.query(Darf).options(joinedload(Darf.proprietario))
    
    # Filtros
    if proprietario_id:
        query = query.filter(Darf.proprietario_id == proprietario_id)
    
    if ano and mes:
        data_inicio = date(ano, mes, 1)
        # Último dia do mês
        if mes == 12:
            data_fim = date(ano + 1, 1, 1)
        else:
            data_fim = date(ano, mes + 1, 1)
        query = query.filter(and_(
            Darf.data >= data_inicio,
            Darf.data < data_fim
        ))
    elif ano:
        query = query.filter(func.extract('year', Darf.data) == ano)
    elif mes:
        query = query.filter(func.extract('month', Darf.data) == mes)
    
    # Ordenar por data decrescente
    query = query.order_by(Darf.data.desc())
    
    darfs = query.offset(skip).limit(limit).all()
    return [DarfResponse(**darf.to_dict()) for darf in darfs]


@router.get("/{darf_id}", response_model=DarfResponse)
async def obter_darf(
    darf_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Obter detalhes de um DARF específico"""
    darf = db.query(Darf).options(joinedload(Darf.proprietario)).filter(Darf.id == darf_id).first()
    
    if not darf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DARF não encontrado"
        )
    
    return DarfResponse(**darf.to_dict())


@router.post("/", response_model=DarfResponse, status_code=status.HTTP_201_CREATED)
async def criar_darf(
    darf_data: DarfCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Criar um novo DARF"""
    # Verificar se proprietário existe
    proprietario = db.query(Proprietario).filter(Proprietario.id == darf_data.proprietario_id).first()
    if not proprietario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proprietário não encontrado"
        )
    
    # Verificar se já existe DARF para este proprietário nesta data
    darf_existente = db.query(Darf).filter(
        and_(
            Darf.proprietario_id == darf_data.proprietario_id,
            Darf.data == darf_data.data
        )
    ).first()
    
    if darf_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um DARF para o proprietário '{proprietario.nome}' na data {darf_data.data.strftime('%d/%m/%Y')}"
        )
    
    # Criar novo DARF
    novo_darf = Darf(**darf_data.dict())
    db.add(novo_darf)
    db.commit()
    db.refresh(novo_darf)
    
    return DarfResponse(**novo_darf.to_dict())


@router.put("/{darf_id}", response_model=DarfResponse)
async def atualizar_darf(
    darf_id: int,
    darf_data: DarfUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Atualizar um DARF existente"""
    darf = db.query(Darf).filter(Darf.id == darf_id).first()
    
    if not darf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DARF não encontrado"
        )
    
    # Atualizar apenas campos fornecidos
    update_data = darf_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(darf, key, value)
    
    db.commit()
    db.refresh(darf)
    
    return DarfResponse(**darf.to_dict())


@router.delete("/{darf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_darf(
    darf_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Excluir um DARF"""
    darf = db.query(Darf).filter(Darf.id == darf_id).first()
    
    if not darf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DARF não encontrado"
        )
    
    db.delete(darf)
    db.commit()
    
    return None


# ============================================
# IMPORTAÇÃO MÚLTIPLA
# ============================================

@router.post("/importar-multiplos", status_code=status.HTTP_201_CREATED)
async def importar_multiplos_darfs(
    darfs: List[DarfImportacao],
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """
    Importar múltiplos DARFs de uma só vez
    Formato: [{"proprietario": "Nome", "data": "DD/MM/YYYY", "valor_darf": 1000.00}]
    """
    resultados = {
        "total": len(darfs),
        "sucesso": 0,
        "erros": 0,
        "detalhes": []
    }
    
    for idx, darf_data in enumerate(darfs, start=1):
        try:
            # Buscar proprietário pelo nome (case-insensitive, busca parcial)
            nome_proprietario = darf_data.proprietario.strip()
            proprietario = db.query(Proprietario).filter(
                func.lower(Proprietario.nome).like(f"%{nome_proprietario.lower()}%")
            ).first()
            
            if not proprietario:
                raise ValueError(f"Proprietário '{nome_proprietario}' não encontrado")
            
            # Converter data de DD/MM/YYYY para date
            try:
                data_parts = darf_data.data.split('/')
                if len(data_parts) != 3:
                    raise ValueError("Formato de data inválido")
                dia, mes, ano = int(data_parts[0]), int(data_parts[1]), int(data_parts[2])
                data_darf = date(ano, mes, dia)
            except (ValueError, IndexError) as e:
                raise ValueError(f"Data inválida '{darf_data.data}'. Use formato DD/MM/YYYY")
            
            # Verificar se já existe DARF para este proprietário nesta data
            darf_existente = db.query(Darf).filter(
                and_(
                    Darf.proprietario_id == proprietario.id,
                    Darf.data == data_darf
                )
            ).first()
            
            if darf_existente:
                # Atualizar valor existente
                darf_existente.valor_darf = darf_data.valor_darf
                db.commit()
                
                resultados["detalhes"].append({
                    "linha": idx,
                    "proprietario": nome_proprietario,
                    "data": darf_data.data,
                    "valor": darf_data.valor_darf,
                    "status": "atualizado",
                    "mensagem": f"DARF atualizado para R$ {darf_data.valor_darf:.2f}"
                })
            else:
                # Criar novo DARF
                novo_darf = Darf(
                    proprietario_id=proprietario.id,
                    data=data_darf,
                    valor_darf=darf_data.valor_darf
                )
                db.add(novo_darf)
                db.commit()
                
                resultados["detalhes"].append({
                    "linha": idx,
                    "proprietario": nome_proprietario,
                    "data": darf_data.data,
                    "valor": darf_data.valor_darf,
                    "status": "criado",
                    "mensagem": "DARF criado com sucesso"
                })
            
            resultados["sucesso"] += 1
            
        except Exception as e:
            resultados["erros"] += 1
            resultados["detalhes"].append({
                "linha": idx,
                "proprietario": darf_data.proprietario if hasattr(darf_data, 'proprietario') else 'N/A',
                "data": darf_data.data if hasattr(darf_data, 'data') else 'N/A',
                "valor": darf_data.valor_darf if hasattr(darf_data, 'valor_darf') else 0,
                "status": "erro",
                "mensagem": str(e)
            })
            # Rollback da transação em caso de erro
            db.rollback()
    
    return resultados


# ============================================
# ESTATÍSTICAS E RELATÓRIOS
# ============================================

@router.get("/estatisticas/total-por-mes")
async def total_darfs_por_mes(
    ano: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Obter total de DARFs por mês em um ano específico"""
    resultados = db.query(
        func.extract('month', Darf.data).label('mes'),
        func.sum(Darf.valor_darf).label('total')
    ).filter(
        func.extract('year', Darf.data) == ano
    ).group_by(
        func.extract('month', Darf.data)
    ).order_by('mes').all()
    
    return [{"mes": int(r.mes), "total": float(r.total) if r.total else 0} for r in resultados]


@router.get("/estatisticas/total-por-proprietario")
async def total_darfs_por_proprietario(
    ano: int = None,
    mes: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Obter total de DARFs por proprietário"""
    query = db.query(
        Proprietario.id,
        Proprietario.nome,
        Proprietario.sobrenome,
        func.sum(Darf.valor_darf).label('total'),
        func.count(Darf.id).label('quantidade')
    ).join(
        Darf, Darf.proprietario_id == Proprietario.id
    )
    
    if ano and mes:
        data_inicio = date(ano, mes, 1)
        if mes == 12:
            data_fim = date(ano + 1, 1, 1)
        else:
            data_fim = date(ano, mes + 1, 1)
        query = query.filter(and_(
            Darf.data >= data_inicio,
            Darf.data < data_fim
        ))
    elif ano:
        query = query.filter(func.extract('year', Darf.data) == ano)
    
    resultados = query.group_by(
        Proprietario.id,
        Proprietario.nome,
        Proprietario.sobrenome
    ).order_by(func.sum(Darf.valor_darf).desc()).all()
    
    return [{
        "proprietario_id": r.id,
        "nome": f"{r.nome} {r.sobrenome}".strip(),
        "total": float(r.total) if r.total else 0,
        "quantidade": r.quantidade
    } for r in resultados]
