from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, String
from datetime import datetime, timedelta
from typing import Optional
from models_final import Proprietario, Imovel, AluguelSimples, Usuario
from config import get_db
from .auth import verify_token_flexible, obter_proprietarios_permitidos_usuario, filtrar_por_proprietarios_permitidos

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Retorna um resumo de dados agregados para o dashboard."""
    
    # 1. Contagens totais
    # Para proprietários, aplicar filtro se necessário
    query_prop = db.query(func.count(Proprietario.id))
    if proprietarios_permitidos is not None:
        query_prop = query_prop.filter(Proprietario.id.in_(proprietarios_permitidos))
    total_proprietarios = query_prop.scalar()
    
    # Para imóveis, filtrar por proprietário
    query_imoveis = db.query(func.count(Imovel.id))
    if proprietarios_permitidos is not None:
        query_imoveis = query_imoveis.filter(Imovel.proprietario_id.in_(proprietarios_permitidos))
    total_imoveis = query_imoveis.scalar()

    # 2. Valor total de aluguéis no ano corrente
    current_year = datetime.now().year
    query_alugueis = db.query(func.sum(AluguelSimples.valor_liquido_proprietario)) \
        .filter(AluguelSimples.ano == current_year)
    query_alugueis = filtrar_por_proprietarios_permitidos(query_alugueis, AluguelSimples.proprietario_id, proprietarios_permitidos)
    total_alugueis_ano_corrente = query_alugueis.scalar() or 0

    # 3. Receitas do último mês com dados
    query_last_month = db.query(AluguelSimples.ano, AluguelSimples.mes)
    query_last_month = filtrar_por_proprietarios_permitidos(query_last_month, AluguelSimples.proprietario_id, proprietarios_permitidos)
    last_month_data = query_last_month.order_by(AluguelSimples.ano.desc(), AluguelSimples.mes.desc()).first()
    
    receitas_ultimo_mes = 0
    receitas_mes_anterior = 0
    variacao_percentual = 0
    
    if last_month_data:
        last_year, last_month = last_month_data
        query_ultimo = db.query(func.sum(AluguelSimples.valor_liquido_proprietario)) \
            .filter(AluguelSimples.ano == last_year, AluguelSimples.mes == last_month)
        query_ultimo = filtrar_por_proprietarios_permitidos(query_ultimo, AluguelSimples.proprietario_id, proprietarios_permitidos)
        receitas_ultimo_mes = query_ultimo.scalar() or 0
        
        # Calcular mês anterior
        if last_month == 1:
            prev_month = 12
            prev_year = last_year - 1
        else:
            prev_month = last_month - 1
            prev_year = last_year
        
        query_anterior = db.query(func.sum(AluguelSimples.valor_liquido_proprietario)) \
            .filter(AluguelSimples.ano == prev_year, AluguelSimples.mes == prev_month)
        query_anterior = filtrar_por_proprietarios_permitidos(query_anterior, AluguelSimples.proprietario_id, proprietarios_permitidos)
        receitas_mes_anterior = query_anterior.scalar() or 0
        
        # Calcular variação percentual
        if receitas_mes_anterior > 0:
            variacao_percentual = ((receitas_ultimo_mes - receitas_mes_anterior) / receitas_mes_anterior) * 100
        elif receitas_ultimo_mes > 0:
            variacao_percentual = 100  # 100% de aumento quando anterior era 0

    # 4. Dados para o gráfico de receitas (últimos 12 meses)
    twelve_months_ago = datetime.now() - timedelta(days=365)
    query_income = db.query(
            AluguelSimples.ano,
            AluguelSimples.mes,
            func.sum(AluguelSimples.valor_liquido_proprietario)
        )
    query_income = filtrar_por_proprietarios_permitidos(query_income, AluguelSimples.proprietario_id, proprietarios_permitidos)
    income_data = query_income.group_by(AluguelSimples.ano, AluguelSimples.mes) \
        .order_by(AluguelSimples.ano, AluguelSimples.mes).all()

    chart_labels = []
    chart_values = []
    for year, month, total in income_data:
        # Formatação do label para o gráfico
        date_obj = datetime(year, month, 1)
        chart_labels.append(date_obj.strftime("%b/%y"))
        chart_values.append(float(total))

    return {
        "total_proprietarios": total_proprietarios,
        "total_imoveis": total_imoveis,
        "total_alugueis_ano_corrente": float(total_alugueis_ano_corrente),
        "receitas_ultimo_mes": float(receitas_ultimo_mes),
        "variacao_percentual": round(variacao_percentual, 2),
        "income_chart_data": {
            "labels": chart_labels,
            "values": chart_values
        }
    }
