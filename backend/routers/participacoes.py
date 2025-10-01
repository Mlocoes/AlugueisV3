from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Dict
import pandas as pd
import traceback
import uuid
from datetime import datetime, timedelta
from models_final import Participacao, Proprietario, Imovel, Usuario, HistoricoParticipacao
from config import get_db
from .auth import verify_token_flexible, is_admin
from services.participacao_service import ParticipacaoService

router = APIRouter(prefix="/api/participacoes", tags=["participacoes"])

@router.get("/datas", response_model=Dict)
def listar_datas_participacoes(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Lista todas as datas de conjuntos de participações disponíveis (incluindo histórico) - OPTIMIZED"""
    try:
        datas_list = ParticipacaoService.listar_datas_versoes(db=db)
        return {"success": True, "datas": datas_list}
    except Exception as e:
        print(f"❌ Erro ao listar datas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar datas: {str(e)}")

@router.get("/", response_model=Dict)
def listar_participacoes(data_registro: str = None, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Lista participações do conjunto mais recente ou de uma data específica - OPTIMIZED"""
    try:
        if data_registro:
            from dateutil import parser
            try:
                dt = parser.isoparse(data_registro)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Formato de data_registro inválido: {data_registro}")
            
            # Filtrar por timestamp EXACTO (não apenas a data)
            query = db.query(Participacao).options(
                joinedload(Participacao.imovel),
                joinedload(Participacao.proprietario)
            ).filter(
                Participacao.data_registro == dt
            )
        else:
            # Buscar conjunto mais recente com eager loading
            subquery = db.query(Participacao.data_registro).order_by(
                Participacao.data_registro.desc()
            ).limit(1).subquery()
            
            query = db.query(Participacao).options(
                joinedload(Participacao.imovel),
                joinedload(Participacao.proprietario)
            ).filter(
                Participacao.data_registro == subquery
            )
        
        participacoes = query.all()
        return {"success": True, "data": [p.to_dict() for p in participacoes]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao listar participações: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar participações: {str(e)}")

@router.post("/")
def criar_participacao(dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Cria uma nova participação - OPTIMIZED"""
    try:
        # Validar campos obrigatórios
        if not all(k in dados for k in ["imovel_id", "proprietario_id", "porcentagem"]):
            raise HTTPException(status_code=400, detail="Campos imovel_id, proprietario_id e porcentagem são obrigatórios.")

        # Validar existência com queries em batch
        imovel = db.query(Imovel).filter(Imovel.id == dados["imovel_id"]).first()
        if not imovel:
            raise HTTPException(status_code=404, detail="Imóvel não encontrado.")

        proprietario = db.query(Proprietario).filter(Proprietario.id == dados["proprietario_id"]).first()
        if not proprietario:
            raise HTTPException(status_code=404, detail="Proprietário não encontrado.")

        # Obter o conjunto mais recente de participações global
        subquery = db.query(Participacao.data_registro).order_by(Participacao.data_registro.desc()).limit(1).subquery()
        participacoes_atuais = db.query(Participacao).filter(Participacao.data_registro == subquery).all()

        # Criar novo conjunto, copiando todas as participações atuais, substituindo/adicionando a nova
        data_registro_novo = datetime.now()
        novas_participacoes = []
        
        for p in participacoes_atuais:
            # Se for a mesma participação (mesmo imóvel e proprietário), substituir
            if p.imovel_id == dados["imovel_id"] and p.proprietario_id == dados["proprietario_id"]:
                continue
            nova = Participacao(
                imovel_id=p.imovel_id,
                proprietario_id=p.proprietario_id,
                porcentagem=p.porcentagem,
                data_registro=data_registro_novo
            )
            novas_participacoes.append(nova)

        # Adicionar/atualizar a participação
        nova_participacao = Participacao(
            imovel_id=dados["imovel_id"],
            proprietario_id=dados["proprietario_id"],
            porcentagem=dados["porcentagem"],
            data_registro=data_registro_novo
        )
        novas_participacoes.append(nova_participacao)

        # Persistir todas as novas participações
        for p in novas_participacoes:
            db.add(p)
        db.commit()
        db.refresh(nova_participacao)
        
        return {"success": True, "data": nova_participacao.to_dict()}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar participação: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar participação: {str(e)}")

@router.get("/{participacao_id}", response_model=Dict)
def obter_participacao(participacao_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obtém uma participação específica pelo ID - OPTIMIZED"""
    try:
        participacao = db.query(Participacao).options(
            joinedload(Participacao.imovel),
            joinedload(Participacao.proprietario)
        ).filter(Participacao.id == participacao_id).first()
        
        if not participacao:
            raise HTTPException(status_code=404, detail="Participação não encontrada")
            
        return {"success": True, "data": participacao.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao obter participação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter participação: {str(e)}")

@router.put("/{participacao_id}", response_model=Dict)
def atualizar_participacao(participacao_id: int, dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Atualiza uma participação existente - OPTIMIZED"""
    try:
        participacao = db.query(Participacao).filter(Participacao.id == participacao_id).first()
        if not participacao:
            raise HTTPException(status_code=404, detail="Participação não encontrada")

        # Obter o conjunto mais recente de participações global
        subquery = db.query(Participacao.data_registro).order_by(Participacao.data_registro.desc()).limit(1).subquery()
        participacoes_atuais = db.query(Participacao).filter(Participacao.data_registro == subquery).all()

        # Criar novo conjunto, copiando todas as participações atuais, substituindo a editada
        data_registro_novo = datetime.now()
        novas_participacoes = []
        participacao_editada_ref = None
        
        for p in participacoes_atuais:
            if p.id == participacao_id:
                # Substituir pelos novos dados
                campos_modelo = [c.key for c in Participacao.__table__.columns]
                valores = {campo: getattr(p, campo) for campo in campos_modelo}
                
                for campo, valor in dados.items():
                    if campo in campos_modelo:
                        valores[campo] = valor
                        
                nova = Participacao(
                    imovel_id=valores["imovel_id"],
                    proprietario_id=valores["proprietario_id"],
                    porcentagem=valores["porcentagem"],
                    data_registro=data_registro_novo
                )
                novas_participacoes.append(nova)
                participacao_editada_ref = (valores["proprietario_id"], valores["imovel_id"])
            else:
                nova = Participacao(
                    imovel_id=p.imovel_id,
                    proprietario_id=p.proprietario_id,
                    porcentagem=p.porcentagem,
                    data_registro=data_registro_novo
                )
                novas_participacoes.append(nova)

        # Persistir todas as novas participações
        for p in novas_participacoes:
            db.add(p)
        db.commit()
        
        # Retornar a participação editada
        if participacao_editada_ref:
            prop_id, imovel_id = participacao_editada_ref
            participacao_editada = [
                p for p in novas_participacoes 
                if p.proprietario_id == prop_id and p.imovel_id == imovel_id
            ][0]
            db.refresh(participacao_editada)
            return {"success": True, "data": participacao_editada.to_dict()}
        else:
            raise HTTPException(status_code=500, detail="Erro ao localizar participação editada")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao atualizar participação: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar participação: {str(e)}")

@router.delete("/{participacao_id}")
def excluir_participacao(participacao_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Exclui uma participação - OPTIMIZED"""
    try:
        participacao = db.query(Participacao).filter(Participacao.id == participacao_id).first()
        if not participacao:
            raise HTTPException(status_code=404, detail="Participação não encontrada")
        
        db.delete(participacao)
        db.commit()
        
        return {"success": True, "mensagem": "Participação excluída com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao excluir participação: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir participação: {str(e)}")




@router.post("/nova-versao", response_model=Dict)
def criar_nova_versao_participacoes(payload: Dict, db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
    """Criar uma NOVA VERSÃO do conjunto de participações - OPTIMIZED
    
    Espera payload com a chave 'participacoes' contendo lista de itens:
    [{ imovel_id, proprietario_id, porcentagem }]

    Regras:
    - Apenas administradores podem criar nova versão
    - Cria um novo data_registro para TODO o conjunto recebido
    - Histórico mantido automaticamente
    - Valida existência de imovel e proprietario
    """
    try:
        itens = payload.get("participacoes")
        
        # Usar service para criar nova versão
        sucesso, erro, resultado = ParticipacaoService.criar_nova_versao_global(
            db=db,
            participacoes=itens,
            usuario_id=admin_user.id if admin_user else None
        )
        
        if not sucesso:
            raise HTTPException(status_code=400, detail=erro)
        
        return resultado
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar nova versão: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar nova versão: {str(e)}")

# ============================================
# ENDPOINTS PARA HISTÓRICO DE PARTICIPAÇÕES
# ============================================

@router.get("/historico/versoes")
async def get_versoes_historico(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Retorna lista de todas as versões históricas disponíveis - OPTIMIZED
    """
    try:
        versoes = db.query(
            HistoricoParticipacao.versao_id,
            HistoricoParticipacao.data_versao,
            func.count(HistoricoParticipacao.id).label('total_participacoes')
        ).group_by(
            HistoricoParticipacao.versao_id,
            HistoricoParticipacao.data_versao
        ).order_by(
            HistoricoParticipacao.data_versao.desc()
        ).all()
        
        return {
            "success": True,
            "data": [
                {
                    "versao_id": v.versao_id,
                    "data_versao": v.data_versao.isoformat(),
                    "total_participacoes": v.total_participacoes
                } for v in versoes
            ]
        }
    except Exception as e:
        print(f"❌ Erro ao obter versões: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter versões: {str(e)}")

@router.get("/historico/{versao_id}")
async def get_historico_por_versao(
    versao_id: str,
    imovel_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """
    Retorna as participações de uma versão específica do histórico ou ativas - OPTIMIZED
    """
    try:
        if versao_id == "ativo":
            # Carregar participações ativas com eager loading
            query = db.query(Participacao).options(
                joinedload(Participacao.imovel),
                joinedload(Participacao.proprietario)
            ).filter(Participacao.ativo == True)
            
            if imovel_id:
                query = query.filter(Participacao.imovel_id == imovel_id)
                
            participacoes = query.order_by(
                Participacao.imovel_id, 
                Participacao.proprietario_id
            ).all()
            
            if not participacoes:
                raise HTTPException(status_code=404, detail="Nenhuma participação ativa encontrada")
                
            return {
                "success": True,
                "versao_id": "ativo",
                "data_versao": participacoes[0].data_registro.isoformat() if participacoes else None,
                "data": [p.to_dict() for p in participacoes]
            }
        else:
            # Carregar do histórico com eager loading
            query = db.query(HistoricoParticipacao).options(
                joinedload(HistoricoParticipacao.imovel),
                joinedload(HistoricoParticipacao.proprietario)
            ).filter(HistoricoParticipacao.versao_id == versao_id)
            
            if imovel_id:
                query = query.filter(HistoricoParticipacao.imovel_id == imovel_id)
                
            historico = query.order_by(
                HistoricoParticipacao.imovel_id,
                HistoricoParticipacao.proprietario_id
            ).all()
            
            if not historico:
                raise HTTPException(status_code=404, detail=f"Versão {versao_id} não encontrada")
                
            return {
                "success": True,
                "versao_id": versao_id,
                "data_versao": historico[0].data_versao.isoformat(),
                "data": [h.to_dict() for h in historico]
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao obter histórico: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter histórico: {str(e)}")

@router.get("/historico/imovel/{imovel_id}")
async def get_historico_por_imovel(
    imovel_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """
    Retorna todo o histórico de participações para um imóvel específico - OPTIMIZED
    """
    try:
        # Verificar se imóvel existe
        imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
        if not imovel:
            raise HTTPException(status_code=404, detail="Imóvel não encontrado")
        
        # Buscar todas as versões históricas para este imóvel
        versoes = db.query(
            HistoricoParticipacao.versao_id,
            HistoricoParticipacao.data_versao
        ).filter(
            HistoricoParticipacao.imovel_id == imovel_id
        ).distinct().order_by(
            HistoricoParticipacao.data_versao.desc()
        ).all()
        
        # Buscar todas as participações de uma vez com eager loading
        historico_completo = []
        for versao in versoes:
            participacoes_versao = db.query(HistoricoParticipacao).options(
                joinedload(HistoricoParticipacao.proprietario),
                joinedload(HistoricoParticipacao.imovel)
            ).filter(
                HistoricoParticipacao.versao_id == versao.versao_id,
                HistoricoParticipacao.imovel_id == imovel_id
            ).order_by(HistoricoParticipacao.proprietario_id).all()
            
            historico_completo.append({
                "versao_id": versao.versao_id,
                "data_versao": versao.data_versao.isoformat(),
                "participacoes": [p.to_dict() for p in participacoes_versao]
            })
        
        return {
            "success": True,
            "imovel": {
                "id": imovel.id,
                "nome": imovel.nome,
                "endereco": imovel.endereco
            },
            "historico": historico_completo
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao obter histórico do imóvel: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao obter histórico do imóvel: {str(e)}")

@router.post("/criar-versao")
async def criar_snapshot_versao_participacoes(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Cria uma nova versão/snapshot das participações atuais no histórico - OPTIMIZED
    """
    try:
        if not current_user.tipo_de_usuario in ['administrador', 'usuario']:
            raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de usuário ou administrador.")
        
        # Gerar ID único para a versão
        versao_id = f"v_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
        
        # Buscar todas as participações atuais ativas com eager loading
        participacoes_atuais = db.query(Participacao).options(
            joinedload(Participacao.imovel),
            joinedload(Participacao.proprietario)
        ).filter(Participacao.ativo == True).all()
        
        if not participacoes_atuais:
            raise HTTPException(status_code=400, detail="Nenhuma participação ativa encontrada")
        
        # Verificar se já existe uma versão idêntica
        versao_recente = db.query(HistoricoParticipacao.versao_id).order_by(
            HistoricoParticipacao.data_versao.desc()
        ).first()
        
        if versao_recente:
            # Comparar dados
            dados_recentes = db.query(
                HistoricoParticipacao.imovel_id,
                HistoricoParticipacao.proprietario_id,
                HistoricoParticipacao.porcentagem
            ).filter(
                HistoricoParticipacao.versao_id == versao_recente.versao_id
            ).order_by(
                HistoricoParticipacao.imovel_id,
                HistoricoParticipacao.proprietario_id
            ).all()
            
            dados_atuais = [
                (p.imovel_id, p.proprietario_id, p.porcentagem)
                for p in sorted(participacoes_atuais, key=lambda x: (x.imovel_id, x.proprietario_id))
            ]
            
            dados_recentes_sorted = [
                (d.imovel_id, d.proprietario_id, d.porcentagem)
                for d in sorted(dados_recentes, key=lambda x: (x[0], x[1]))
            ]
            
            if dados_atuais == dados_recentes_sorted:
                return {
                    "success": True,
                    "message": f"Dados não mudaram, versão existente: {versao_recente.versao_id}",
                    "versao_id": versao_recente.versao_id
                }
        
        # Criar nova versão usando bulk insert
        historico_entries = []
        data_versao = datetime.now()
        
        for participacao in participacoes_atuais:
            historico_entries.append({
                "versao_id": versao_id,
                "data_versao": data_versao,
                "porcentagem": participacao.porcentagem,
                "data_registro_original": participacao.data_registro,
                "ativo": participacao.ativo,
                "imovel_id": participacao.imovel_id,
                "proprietario_id": participacao.proprietario_id
            })
        
        db.bulk_insert_mappings(HistoricoParticipacao, historico_entries)
        db.commit()
        
        return {
            "success": True,
            "message": f"Nova versão criada: {versao_id}",
            "versao_id": versao_id,
            "total_participacoes": len(historico_entries)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar versão: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar versão: {str(e)}")
