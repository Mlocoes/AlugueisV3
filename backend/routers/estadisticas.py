"""
Router para endpoints de estadísticas y reportes
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from config import get_db
from models_final import AluguelSimples, LogImportacao, ResumenCalculator, Imovel as Inmueble, Usuario
from .auth import verify_token_flexible, obter_proprietarios_permitidos_usuario, filtrar_por_proprietarios_permitidos

router = APIRouter(prefix="/api/estadisticas", tags=["estadísticas"])

@router.get("/generales")
async def estadisticas_generales(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Obtener estadísticas generales del sistema"""
    try:
        # Consultas agregadas con filtros de permissão
        query_alquileres = db.query(func.count(AluguelSimples.id))
        query_alquileres = filtrar_por_proprietarios_permitidos(query_alquileres, AluguelSimples.proprietario_id, proprietarios_permitidos)
        total_alquileres = query_alquileres.scalar()
        
        # Contar propiedades distintas por nombre de inmueble
        query_propiedades = db.query(func.count(func.distinct(Inmueble.nome))).select_from(AluguelSimples).join(Inmueble, AluguelSimples.imovel_id == Inmueble.id)
        query_propiedades = filtrar_por_proprietarios_permitidos(query_propiedades, AluguelSimples.proprietario_id, proprietarios_permitidos)
        total_propiedades = query_propiedades.scalar()
        
        query_propietarios = db.query(func.count(func.distinct(AluguelSimples.proprietario_id)))
        query_propietarios = filtrar_por_proprietarios_permitidos(query_propietarios, AluguelSimples.proprietario_id, proprietarios_permitidos)
        total_propietarios = query_propietarios.scalar()

        query_valores = db.query(func.sum(AluguelSimples.valor_aluguel_proprietario))
        query_valores = filtrar_por_proprietarios_permitidos(query_valores, AluguelSimples.proprietario_id, proprietarios_permitidos)
        suma_valores = query_valores.scalar() or 0
        
        query_tasas = db.query(func.sum(AluguelSimples.taxa_administracao_proprietario))
        query_tasas = filtrar_por_proprietarios_permitidos(query_tasas, AluguelSimples.proprietario_id, proprietarios_permitidos)
        suma_tasas = query_tasas.scalar() or 0
        
        query_liquido = db.query(func.sum(AluguelSimples.valor_liquido_proprietario))
        query_liquido = filtrar_por_proprietarios_permitidos(query_liquido, AluguelSimples.proprietario_id, proprietarios_permitidos)
        suma_liquido = query_liquido.scalar() or 0

        # Últimas importaciones
        ultimas_importaciones = db.query(LogImportacao)\
            .order_by(desc(LogImportacao.data_importacao))\
            .limit(5).all()

        return {
            "totales": {
                "alquileres": total_alquileres,
                "propiedades": total_propiedades,
                "propietarios": total_propietarios
            },
            "valores_monetarios": {
                "total_alquileres": float(suma_valores),
                "total_tasas_administracion": float(suma_tasas),
                "total_valores_liquidos": float(suma_liquido)
            },
            "ultimas_importaciones": [imp.to_dict() for imp in ultimas_importaciones]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@router.get("/resumen/por-propiedad")
async def resumen_por_propiedad(
    ano: Optional[int] = Query(None, description="Año para el resumen"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Mes para el resumen"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Obtener resumen agrupado por propiedad"""
    try:
        query = db.query(AluguelSimples)
        query = filtrar_por_proprietarios_permitidos(query, AluguelSimples.proprietario_id, proprietarios_permitidos)

        if ano:
            query = query.filter(AluguelSimples.ano == ano)
        if mes:
            query = query.filter(AluguelSimples.mes == mes)
        
        alquileres = query.all()
        
        # Agrupar por propiedad y período
        resumenes = {}
        for alquiler in alquileres:
            clave = f"{alquiler.inmueble.nombre if alquiler.inmueble else 'SIN_NOMBRE'}_{alquiler.ano}_{alquiler.mes}"
            if clave not in resumenes:
                resumenes[clave] = []
            resumenes[clave].append(alquiler)

        # Calcular resúmenes
        resultado = []
        for grupo_alquileres in resumenes.values():
            resumen = ResumenCalculator.calcular_resumen_propiedad(grupo_alquileres)
            resultado.append(resumen)

        # Ordenar por período descendente
        resultado.sort(key=lambda x: (x.get('periodo', ''), x.get('nombre_inmueble', '')), reverse=True)

        return resultado
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar resumen: {str(e)}")

@router.get("/resumen/por-propietario")
async def resumen_por_propietario(
    ano: Optional[int] = Query(None, description="Año para el resumen"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Mes para el resumen"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Obtener resumen agrupado por propietario"""
    try:
        query = db.query(AluguelSimples)
        query = filtrar_por_proprietarios_permitidos(query, AluguelSimples.proprietario_id, proprietarios_permitidos)

        if ano:
            query = query.filter(AluguelSimples.ano == ano)
        if mes:
            query = query.filter(AluguelSimples.mes == mes)
        
        alquileres = query.all()
        
        # Agrupar por propietario y período
        resumenes = {}
        for alquiler in alquileres:
            clave = f"{alquiler.nombre_propietario}_{alquiler.ano}_{alquiler.mes}"
            if clave not in resumenes:
                resumenes[clave] = []
            resumenes[clave].append(alquiler)

        # Calcular resúmenes
        resultado = []
        for grupo_alquileres in resumenes.values():
            resumen = ResumenCalculator.calcular_resumen_propietario(grupo_alquileres)
            resultado.append(resumen)

        # Ordenar por período descendente
        resultado.sort(key=lambda x: (x.get('periodo', ''), x.get('nombre_propietario', '')), reverse=True)

        return resultado
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar resumen: {str(e)}")

@router.get("/resumen-mensual")
async def resumen_mensual(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Obtener resumen del último mes con métricas detalladas"""
    try:
        from datetime import datetime, timedelta
        
        # Obtener fecha actual
        ahora = datetime.now()
        mes_actual = ahora.month
        ano_actual = ahora.year
        
        # Calcular mes anterior
        if mes_actual == 1:
            mes_anterior = 12
            ano_anterior = ano_actual - 1
        else:
            mes_anterior = mes_actual - 1
            ano_anterior = ano_actual
        
        # 1. Ingresos del mes actual - CON DEBUG
        query_mes_actual = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
            .filter(
                AluguelSimples.mes == mes_actual,
                AluguelSimples.ano == ano_actual
            )
        query_mes_actual = filtrar_por_proprietarios_permitidos(query_mes_actual, AluguelSimples.proprietario_id, proprietarios_permitidos)
        
        # Debug: contar registros del mes actual
        count_query = db.query(func.count(AluguelSimples.id))\
            .filter(
                AluguelSimples.mes == mes_actual,
                AluguelSimples.ano == ano_actual
            )
        count_query = filtrar_por_proprietarios_permitidos(count_query, AluguelSimples.proprietario_id, proprietarios_permitidos)
        count_mes_actual = count_query.scalar() or 0
        
        ingresos_mes_actual = query_mes_actual.scalar() or 0
        
        # 2. Ingresos del mes anterior
        query_mes_anterior = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
            .filter(
                AluguelSimples.mes == mes_anterior,
                AluguelSimples.ano == ano_anterior
            )
        query_mes_anterior = filtrar_por_proprietarios_permitidos(query_mes_anterior, AluguelSimples.proprietario_id, proprietarios_permitidos)
        ingresos_mes_anterior = query_mes_anterior.scalar() or 0
        
        # 3. Total acumulado del año actual
        query_total_ano = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
            .filter(AluguelSimples.ano == ano_actual)
        query_total_ano = filtrar_por_proprietarios_permitidos(query_total_ano, AluguelSimples.proprietario_id, proprietarios_permitidos)
        total_ano_actual = query_total_ano.scalar() or 0
        
        # 4. Calcular media mensual del año actual
        query_meses = db.query(func.count(func.distinct(AluguelSimples.mes)))\
            .filter(AluguelSimples.ano == ano_actual)
        query_meses = filtrar_por_proprietarios_permitidos(query_meses, AluguelSimples.proprietario_id, proprietarios_permitidos)
        meses_con_datos = query_meses.scalar() or 1
        
        media_mensual = total_ano_actual / meses_con_datos if meses_con_datos > 0 else 0
        
        # 5. Calcular variación mensual
        if ingresos_mes_anterior > 0:
            variacion_absoluta = ingresos_mes_actual - ingresos_mes_anterior
            variacion_porcentual = (variacion_absoluta / ingresos_mes_anterior) * 100
        else:
            variacion_absoluta = ingresos_mes_actual
            variacion_porcentual = 100 if ingresos_mes_actual > 0 else 0
        
        # Determinar tipo de variación
        if variacion_absoluta > 0:
            tipo_variacion = "positiva"
            icono_variacion = "fas fa-arrow-up"
            clase_color = "text-success"
        elif variacion_absoluta < 0:
            tipo_variacion = "negativa" 
            icono_variacion = "fas fa-arrow-down"
            clase_color = "text-danger"
        else:
            tipo_variacion = "neutra"
            icono_variacion = "fas fa-minus"
            clase_color = "text-secondary"
        
        return {
            "periodo": {
                "mes_actual": f"{mes_actual:02d}/{ano_actual}",
                "mes_anterior": f"{mes_anterior:02d}/{ano_anterior}",
                "ano_actual": ano_actual
            },
            "metricas": {
                "ingresos_mes_actual": float(ingresos_mes_actual),
                "total_ano_actual": float(total_ano_actual),
                "media_mensual": float(media_mensual),
                "variacion": {
                    "absoluta": float(variacion_absoluta),
                    "porcentual": float(variacion_porcentual),
                    "tipo": tipo_variacion,
                    "icono": icono_variacion,
                    "clase_color": clase_color,
                    "mes_anterior": float(ingresos_mes_anterior)
                }
            },
            "detalles": {
                "meses_con_datos": meses_con_datos,
                "timestamp": datetime.now().isoformat(),
                "debug": {
                    "count_mes_actual": count_mes_actual,
                    "mes_consultado": mes_actual,
                    "ano_consultado": ano_actual
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener resumen mensual: {str(e)}")

@router.get("/debug/mes")
async def debug_mes(
    mes: int = 7, 
    ano: int = 2025, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Debug: verificar datos de un mes específico"""
    
    # Contar registros
    query_count = db.query(func.count(AluguelSimples.id))\
        .filter(AluguelSimples.mes == mes, AluguelSimples.ano == ano)
    query_count = filtrar_por_proprietarios_permitidos(query_count, AluguelSimples.proprietario_id, proprietarios_permitidos)
    count = query_count.scalar()
    
    # Sumar valores
    query_suma = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
        .filter(AluguelSimples.mes == mes, AluguelSimples.ano == ano)
    query_suma = filtrar_por_proprietarios_permitidos(query_suma, AluguelSimples.proprietario_id, proprietarios_permitidos)
    suma = query_suma.scalar() or 0
    
    # Primeros 5 registros para muestra
    query_registros = db.query(AluguelSimples.nombre_propietario, AluguelSimples.valor_alquiler_propietario)\
        .filter(AluguelSimples.mes == mes, AluguelSimples.ano == ano)
    query_registros = filtrar_por_proprietarios_permitidos(query_registros, AluguelSimples.proprietario_id, proprietarios_permitidos)
    registros = query_registros.limit(5).all()
    
    return {
        "mes": mes,
        "ano": ano,
        "count_registros": count,
        "suma_total": float(suma),
        "promedio": float(suma / count) if count > 0 else 0,
        "muestra_registros": [
            {"propietario": r.nombre_propietario, "valor": float(r.valor_alquiler_propietario)}
            for r in registros
        ]
    }

# Endpoint de compatibilidad
@router.get("/")
async def estadisticas_compatibilidad(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(verify_token_flexible),
    proprietarios_permitidos: Optional[list] = Depends(obter_proprietarios_permitidos_usuario)
):
    """Endpoint de compatibilidad para el frontend"""
    # This endpoint calls an already secured function, but it's good practice
    # to secure the entry point as well.
    return await estadisticas_generales(db, current_user, proprietarios_permitidos)
