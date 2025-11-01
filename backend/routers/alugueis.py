# Correção: importar e definir router corretamente

from config import get_db
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Form
from sqlalchemy.orm import Session
import pandas as pd
from typing import Optional
from datetime import datetime
from models_final import Imovel, Proprietario, AluguelSimples, Usuario
from sqlalchemy import asc, desc, func
from .auth import verify_token_flexible, obter_proprietarios_permitidos_usuario, filtrar_por_proprietarios_permitidos
import calendar
# Assuming CalculoService is in this path
from services.calculo_service import CalculoService
from services.aluguel_service import AluguelService

router = APIRouter(prefix="/api/alugueis", tags=["alugueis"])




def formatar_periodo_label(ano: int, mes: int) -> str:
    """Formatar período em formato legível"""
    try:
        nome_mes = calendar.month_name[mes] if mes and 1 <= mes <= 12 else str(mes)
        return f"{nome_mes} {ano}"
    except:
        return f"{mes}/{ano}"

@router.get("/listar")
async def listar_alugueis(
    skip: int = Query(0, ge=0, description="Número de registros a pular"),
    limit: int = Query(2000, ge=1, le=10000, description="Número máximo de registros a retornar (padrão: 2000, máx: 10000)"),
    ano: Optional[int] = Query(None, ge=2020, le=2030, description="Filtrar por ano"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mês"),
    imovel_id: Optional[int] = Query(None, description="Filtrar por ID do imóvel"),
    proprietario_id: Optional[int] = Query(None, description="Filtrar por ID do proprietário"),
    ordem: str = Query("desc", description="Ordem: 'asc' ou 'desc'"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Listar aluguéis com filtros e paginação (respeitando permissões)"""
    try:
        query = db.query(AluguelSimples)
        
        # APLICAR FILTRO DE PERMISSÕES PRIMEIRO
        query = filtrar_por_proprietarios_permitidos(
            query, 
            AluguelSimples.proprietario_id, 
            proprietarios_permitidos
        )
        
        # Aplicar outros filtros
        if ano:
            query = query.filter(AluguelSimples.ano == ano)
        if mes:
            query = query.filter(AluguelSimples.mes == mes)
        if imovel_id:
            query = query.filter(AluguelSimples.imovel_id == imovel_id)
        if proprietario_id:
            query = query.filter(AluguelSimples.proprietario_id == proprietario_id)
        # Aplicar ordem
        if ordem.lower() == "asc":
            query = query.order_by(asc(AluguelSimples.ano), asc(AluguelSimples.mes), asc(AluguelSimples.imovel_id))
        else:
            query = query.order_by(desc(AluguelSimples.ano), desc(AluguelSimples.mes), asc(AluguelSimples.imovel_id))
        # Aplicar paginação
        alugueis = query.offset(skip).limit(limit).all()
        # Devolver também nomes relacionados
        data = [
            {
                **aluguel.to_dict(),
                'nome_imovel': aluguel.imovel.nome if aluguel.imovel else None,
                'nome_proprietario': aluguel.proprietario.nome if aluguel.proprietario else None
            }
            for aluguel in alugueis
        ]
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar aluguéis: {str(e)}")

@router.get("/obter/{aluguel_id}")
async def obter_aluguel(aluguel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obter um aluguel específico por ID"""
    try:
        aluguel = db.query(AluguelSimples).filter(AluguelSimples.id == aluguel_id).first()
        if not aluguel:
            raise HTTPException(status_code=404, detail="Aluguel não encontrado")
        data = {
            **aluguel.to_dict(),
            'nome_imovel': aluguel.imovel.nome if aluguel.imovel else None,
            'nome_proprietario': aluguel.proprietario.nome if aluguel.proprietario else None
        }
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter aluguel: {str(e)}")

@router.post("/criar")
async def criar_aluguel(
    ano: int = Form(...),
    mes: int = Form(...),
    imovel_id: int = Form(...),
    proprietario_id: int = Form(...),
    valor: float = Form(...),
    descricao: str = Form(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """Criar um novo aluguel"""
    try:
        # Verificar se já existe um aluguel para o mesmo imóvel/proprietário/ano/mês
        aluguel_existente = db.query(AluguelSimples).filter(
            AluguelSimples.ano == ano,
            AluguelSimples.mes == mes,
            AluguelSimples.imovel_id == imovel_id,
            AluguelSimples.proprietario_id == proprietario_id
        ).first()
        
        if aluguel_existente:
            raise HTTPException(status_code=400, detail="Já existe um aluguel para este imóvel/proprietário neste período")
        
        novo_aluguel = AluguelSimples(
            ano=ano,
            mes=mes,
            imovel_id=imovel_id,
            proprietario_id=proprietario_id,
            taxa_administracao_total=taxa_administracao_total if 'taxa_administracao_total' in locals() else 0.0,
            valor_liquido_proprietario=valor_liquido if 'valor_liquido' in locals() else 0.0
            # taxa_administracao_proprietario será calculado automáticamente por trigger
        )
        
        db.add(novo_aluguel)
        db.commit()
        db.refresh(novo_aluguel)
        
        return {"sucesso": True, "mensagem": "Aluguel criado com sucesso", "id": novo_aluguel.id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar aluguel: {str(e)}")

@router.get("/anos-disponiveis/")
async def obter_anos_disponiveis(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obter lista de anos que têm dados de aluguéis"""
    try:
        anos = db.query(AluguelSimples.ano).distinct().order_by(desc(AluguelSimples.ano)).all()
        anos_lista = [ano[0] for ano in anos if ano[0] is not None]
        print(f"📅 Anos disponíveis em dados: {anos_lista}")
        return {"success": True, "data": {'anos': anos_lista, 'total': len(anos_lista)}}
    except Exception as e:
        print(f"Erro em /alugueis/anos-disponiveis/: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro obtendo anos disponíveis: {str(e)}")

@router.get("/totais-por-imovel/")
async def obter_totais_por_imovel(
    ano: Optional[int] = Query(None, description="Filtrar por ano (por padrão último ano com dados)"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mês (por padrão último mês com dados)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """Obter totais de aluguéis por imóvel - OPTIMIZED"""
    try:
        # Se não se especifica ano/mês, obter o último período disponível
        if not ano or not mes:
            ultimo_periodo = db.query(
                AluguelSimples.ano, 
                AluguelSimples.mes
            ).order_by(
                desc(AluguelSimples.ano), 
                desc(AluguelSimples.mes)
            ).first()
            
            if not ultimo_periodo:
                return {"success": True, "data": {
                    'periodo': {'ano': None, 'mes': None},
                    'totais': [],
                    'total_imoveis': 0
                }}
            
            if not ano:
                ano = ultimo_periodo.ano
            if not mes:
                mes = ultimo_periodo.mes
        
        # Usar AluguelService para obter totais com eager loading
        totais = AluguelService.get_totais_por_imovel(db=db, ano=ano, mes=mes)
        
        return {"success": True, "data": {
            'periodo': {'ano': ano, 'mes': mes},
            'totais': totais,
            'total_imoveis': len(totais)
        }}
        
    except Exception as e:
        print(f"❌ Erro ao obter totais por imóvel: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter totais por imóvel: {str(e)}")

@router.get("/totais-por-mes/")
async def obter_totais_por_mes(
    limite_meses: Optional[int] = Query(12, ge=1, le=24, description="Número de meses a incluir (máximo 24)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """Obter totais de aluguéis agrupados por mês - OPTIMIZED"""
    try:
        resultado = AluguelService.get_totais_mensais(
            db=db,
            limite_meses=limite_meses
        )
        
        return {"success": True, "data": resultado}
        
    except Exception as e:
        print(f"❌ Erro ao obter totais por mês: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter totais por mês: {str(e)}")

@router.get("/distribuicao-matriz/")
async def obter_distribuicao_matriz(
    ano: int = Query(..., description="Ano para filtrar"),
    mes: int = Query(..., ge=1, le=12, description="Mês para filtrar"),
    proprietario_id: Optional[int] = Query(None, description="Filtrar por ID de proprietário específico"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """Obter distribuição de aluguéis em formato matriz para um mês específico"""
    try:
        print(f"🔍 Buscando distribuição matriz para {mes}/{ano}")
        
        # Obter todos os registros do mês/ano especificado
        query = db.query(AluguelSimples).filter(
            AluguelSimples.ano == ano,
            AluguelSimples.mes == mes
        )
        
        if proprietario_id:
            query = query.filter(AluguelSimples.proprietario_id == proprietario_id)
        
        alugueis = query.all()
        
        if not alugueis:
            return {"success": True, "data": {"matriz": [], "proprietarios": [], "imoveis": []}}
        
        # Agrupar por proprietário e imóvel
        distribuicao = {}
        proprietarios_set = set()
        imoveis_set = set()
        
        for aluguel in alugueis:
            prop_id = aluguel.proprietario_id
            imovel_id = aluguel.imovel_id
            valor = aluguel.valor_liquido_proprietario or 0
            
            proprietarios_set.add(prop_id)
            imoveis_set.add(imovel_id)
            
            if prop_id not in distribuicao:
                distribuicao[prop_id] = {}
            
            distribuicao[prop_id][imovel_id] = valor
        
        # Obter dados de proprietários
        proprietarios = []
        for prop_id in proprietarios_set:
            prop = db.query(Proprietario).filter(Proprietario.id == prop_id).first()
            if prop:
                proprietarios.append({
                    "proprietario_id": prop_id,
                    "nome": prop.nome
                })
        proprietarios.sort(key=lambda x: x['nome'])
        
        # Obter dados de imóveis
        imoveis = []
        for imovel_id in imoveis_set:
            imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
            if imovel:
                imoveis.append({
                    "id": imovel_id,
                    "nome": imovel.nome
                })
        imoveis.sort(key=lambda x: x['nome'])
        
        # Criar matriz
        matriz = []
        for prop in proprietarios:
            prop_id = prop["proprietario_id"]
            valores = {}
            for imovel in imoveis:
                imovel_id = imovel["id"]
                valores[imovel["nome"]] = distribuicao.get(prop_id, {}).get(imovel_id, 0)
            
            matriz.append({
                "proprietario_id": prop_id,
                "nome": prop["nome"],
                "valores": valores
            })
        
        print(f"✅ Matriz criada: {len(matriz)} proprietários, {len(imoveis)} imóveis")
        return {
            "success": True,
            "data": {
                "matriz": matriz,
                "proprietarios": proprietarios,
                "imoveis": imoveis
            }
        }
        
    except Exception as e:
        print(f"❌ Erro ao obter distribuição matriz: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter distribuição matriz: {str(e)}")

@router.get("/aluguel/{aluguel_id}")
async def obter_aluguel_por_id(aluguel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obter um aluguel específico por ID"""
    aluguel = db.query(AluguelSimples).filter(AluguelSimples.id == aluguel_id).first()
    if not aluguel:
        raise HTTPException(status_code=404, detail="Aluguel não encontrado")
    
    return aluguel.to_dict()

@router.post("/")
async def criar_aluguel_dict(aluguel_data: dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Criar um novo registro de aluguel"""
    try:
        # Criar objeto diretamente
        novo_aluguel = AluguelSimples(**aluguel_data)
        
        db.add(novo_aluguel)
        db.commit()
        db.refresh(novo_aluguel)
        
        return {
            "mensagem": "Aluguel criado com sucesso",
            "aluguel": novo_aluguel.to_dict()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar aluguel: {str(e)}")

@router.put("/{aluguel_id}")
async def atualizar_aluguel(aluguel_id: int, aluguel_data: dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Atualizar um aluguel existente"""
    try:
        aluguel = db.query(AluguelSimples).filter(AluguelSimples.id == aluguel_id).first()
        if not aluguel:
            raise HTTPException(status_code=404, detail="Aluguel não encontrado")
        
        # Atualizar campos
        for campo, valor in aluguel_data.items():
            if hasattr(aluguel, campo):
                setattr(aluguel, campo, valor)
        
        db.commit()
        db.refresh(aluguel)
        
        return {
            "mensagem": "Aluguel atualizado com sucesso",
            "aluguel": aluguel.to_dict()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar aluguel: {str(e)}")

@router.delete("/{aluguel_id}")
async def excluir_aluguel(aluguel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Excluir um aluguel"""
    try:
        aluguel = db.query(AluguelSimples).filter(AluguelSimples.id == aluguel_id).first()
        if not aluguel:
            raise HTTPException(status_code=404, detail="Aluguel não encontrado")
        
        db.delete(aluguel)
        db.commit()
        
        return {"mensagem": "Aluguel excluído com sucesso"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir aluguel: {str(e)}")

@router.post("/recalcular-taxas/")
async def recalcular_todas_as_taxas(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Recalcula todas as taxas de administração por proprietário aplicando corretamente as participações"""
    try:
        resultado = CalculoService.recalcular_todas_as_taxas(db)
        
        return {
            "mensagem": "Recálculo de taxas completado",
            "resumo": resultado,
            "erros": resultado.get("erros")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao recalcular taxas: {str(e)}")

@router.get("/ultimo-periodo/")
async def obter_ultimo_periodo(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obter o último ano e mês disponível na base de dados"""
    try:
        ultimo_periodo = db.query(
            AluguelSimples.ano, 
            AluguelSimples.mes
        ).order_by(
            desc(AluguelSimples.ano), 
            desc(AluguelSimples.mes)
        ).first()
        
        if not ultimo_periodo:
            return {"success": True, "data": {"ano": None, "mes": None}}
        
        return {
            "success": True, 
            "data": {
                "ano": ultimo_periodo.ano,
                "mes": ultimo_periodo.mes
            }
        }
    except Exception as e:
        print(f"Erro em /alugueis/ultimo-periodo/: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro obtendo último período: {str(e)}")

@router.get("/distribuicao-todos-meses/")
async def obter_distribuicao_todos_meses(
    ano: int = Query(..., description="Ano para obter soma de todos os meses"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """Obter distribuição matriz de aluguéis com soma de todos os meses do ano especificado"""
    try:
        print(f"🔍 Buscando distribuição de todos os meses para ano {ano}")
        
        # Obter todos os registros do ano especificado
        alugueis = db.query(AluguelSimples).filter(
            AluguelSimples.ano == ano
        ).all()
        
        if not alugueis:
            return {"success": True, "data": {"matriz": [], "proprietarios": [], "imoveis": []}}
        
        # Agrupar por proprietário e imóvel, sumando todos los meses
        distribuicao = {}
        proprietarios_set = set()
        imoveis_set = set()
        
        for aluguel in alugueis:
            prop_id = aluguel.proprietario_id
            imovel_id = aluguel.imovel_id
            valor = aluguel.valor_liquido_proprietario or 0
            
            proprietarios_set.add(prop_id)
            imoveis_set.add(imovel_id)
            
            if prop_id not in distribuicao:
                distribuicao[prop_id] = {}
            if imovel_id not in distribuicao[prop_id]:
                distribuicao[prop_id][imovel_id] = 0
            
            distribuicao[prop_id][imovel_id] += valor
        
        # Converter a formato matriz
        proprietarios = []
        for prop_id in proprietarios_set:
            prop = db.query(Proprietario).filter(Proprietario.id == prop_id).first()
            if prop:
                proprietarios.append({
                    "proprietario_id": prop_id,
                    "nome": prop.nome
                })
        proprietarios.sort(key=lambda x: x['nome'])
        
        imoveis = []
        for imovel_id in imoveis_set:
            imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
            if imovel:
                imoveis.append({
                    "id": imovel_id,
                    "nome": imovel.nome
                })
        imoveis.sort(key=lambda x: x['nome'])
        
        # Crear matriz
        matriz = []
        for prop in proprietarios:
            prop_id = prop["proprietario_id"]
            valores = {}
            for imovel in imoveis:
                imovel_id = imovel["id"]
                valores[imovel["nome"]] = distribuicao.get(prop_id, {}).get(imovel_id, 0)
            
            matriz.append({
                "proprietario_id": prop_id,
                "nome": prop["nome"],
                "valores": valores
            })
        
        print(f"✅ Matriz criada: {len(matriz)} proprietários, {len(imoveis)} imóveis")
        return {
            "success": True,
            "data": {
                "matriz": matriz,
                "proprietarios": proprietarios,
                "imoveis": imoveis
            }
        }
        
    except Exception as e:
        print(f"Erro em /alugueis/distribuicao-todos-meses/: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro obtendo distribuição de todos os meses: {str(e)}")