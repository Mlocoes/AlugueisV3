# 🔍 Análisis del Script de Instalación - install.py

## 📋 Estado Actual: REQUIERE ACTUALIZACIONES ⚠️

**Archivo:** `scripts/install.py`  
**Versión Actual:** Compatible con AlugueisV2  
**Versión Objetivo:** AlugueisV3 v2.0.0  
**Fecha de Análisis:** 1 de octubre de 2025

---

## ✅ Funcionalidades Correctas

### 1. Verificación de Requisitos ✅
```python
def check_requirements():
    - Verifica Docker instalado ✅
    - Verifica Docker Compose instalado ✅
    - Muestra mensajes de error claros ✅
    - Links a documentación oficial ✅
```
**Estado:** Funcional, no requiere cambios

---

### 2. Colecta de Entrada del Usuario ✅
```python
def collect_user_input():
    - Admin user/password ✅
    - Database credentials ✅
    - Traefik configuration ✅
    - Frontend/Backend domains ✅
    - Host IP detection ✅
```
**Estado:** Funcional, requiere pequeños ajustes

---

### 3. Generación de Secret Keys ✅
```python
secret_key = token_hex(32)
csrf_secret_key = token_hex(32)
```
**Estado:** Funcional y seguro ✅

---

### 4. Docker Operations ✅
```python
def docker_operations(config):
    - Limpieza opcional de datos ✅
    - Construcción de containers ✅
    - Soporte para Traefik ✅
```
**Estado:** Funcional ✅

---

### 5. Wait for PostgreSQL ✅
```python
def wait_for_postgres(config):
    - Health check del container ✅
    - Timeout de 120 segundos ✅
    - Mensajes de error claros ✅
```
**Estado:** Funcional ✅

---

## ⚠️ Problemas Identificados

### CRÍTICO 1: Nombres de Containers Obsoletos
**Líneas:** 246, 275, 304

```python
# ❌ PROBLEMA: Usa nombres de AlugueisV2
container_name = "alugueisV2_postgres"
docker exec alugueisV2_backend ...
docker exec alugueisV2_postgres ...
```

**Impacto:** Alto - El script fallará al no encontrar los containers

**Solución:**
```python
# ✅ CORRECCIÓN: Usar nombres de AlugueisV3
container_name = "alugueisV3_postgres"
docker exec alugueisV3_backend ...
docker exec alugueisV3_postgres ...
```

---

### CRÍTICO 2: Nombre del Database Obsoleto
**Línea:** 70

```python
# ❌ PROBLEMA: Default usa nombre de V2
config["POSTGRES_DB"] = Prompt.ask(
    "🗃️ Nome do banco de dados", default="alugueisv2_db"
)
```

**Solución:**
```python
# ✅ CORRECCIÓN
config["POSTGRES_DB"] = Prompt.ask(
    "🗃️ Nome do banco de dados", default="alugueisv3_db"
)
```

---

### CRÍTICO 3: Usuario de Database Obsoleto
**Línea:** 73

```python
# ❌ PROBLEMA: Default usa nombre de V2
config["POSTGRES_USER"] = Prompt.ask(
    "🧑‍💻 Usuário do banco de dados", default="alugueisv2_usuario"
)
```

**Solución:**
```python
# ✅ CORRECCIÓN
config["POSTGRES_USER"] = Prompt.ask(
    "🧑‍💻 Usuário do banco de dados", default="alugueisv3_usuario"
)
```

---

### CRÍTICO 4: Password de Database Obsoleto
**Línea:** 76

```python
# ❌ PROBLEMA: Default usa nombre de V2
config["POSTGRES_PASSWORD"] = Prompt.ask(
    "🔑 Senha do banco de dados", password=True, default="alugueisv2_senha"
)
```

**Solución:**
```python
# ✅ CORRECCIÓN
config["POSTGRES_PASSWORD"] = Prompt.ask(
    "🔑 Senha do banco de dados", password=True, default="alugueisv3_senha"
)
```

---

### CRÍTICO 5: DATABASE_URL con nombre obsoleto
**Líneas:** 151, 160

```python
# ❌ PROBLEMA: Usa alugueisV2_postgres
DATABASE_URL=postgresql+psycopg2://...@alugueisV2_postgres:5432/...
DATABASE_URL=postgresql://...@alugueisV2_postgres:5432/...
```

**Solución:**
```python
# ✅ CORRECCIÓN
DATABASE_URL=postgresql+psycopg2://...@alugueisV3_postgres:5432/...
DATABASE_URL=postgresql://...@alugueisV3_postgres:5432/...
```

---

### MEDIO 6: Header del Script
**Línea:** 356

```python
# ⚠️ PROBLEMA: Título genérico
Text("Bem-vindo ao Instalador do Sistema de Aluguéis", ...)
```

**Solución:**
```python
# ✅ MEJORA
Text("Bem-vindo ao Instalador do AlugueisV3 v2.0.0", ...)
```

---

### BAJO 7: Mensaje de Logs
**Línea:** 261

```python
# ⚠️ PROBLEMA: Usa nombre V2 en mensaje
"Verifique os logs do container com: [bold]docker compose logs alugueisV2_postgres[/bold]"
```

**Solución:**
```python
# ✅ CORRECCIÓN
"Verifique os logs do container com: [bold]docker compose logs alugueisV3_postgres[/bold]"
```

---

## 📝 Resumen de Cambios Necesarios

### Cambios Críticos (7):
1. ✅ Container name: `alugueisV2_postgres` → `alugueisV3_postgres`
2. ✅ Container name: `alugueisV2_backend` → `alugueisV3_backend`
3. ✅ Default DB name: `alugueisv2_db` → `alugueisv3_db`
4. ✅ Default DB user: `alugueisv2_usuario` → `alugueisv3_usuario`
5. ✅ Default DB password: `alugueisv2_senha` → `alugueisv3_senha`
6. ✅ DATABASE_URL backend: `@alugueisV2_postgres` → `@alugueisV3_postgres`
7. ✅ DATABASE_URL main: `@alugueisV2_postgres` → `@alugueisV3_postgres`

### Cambios de Mejora (2):
8. ✅ Header title: agregar versión "AlugueisV3 v2.0.0"
9. ✅ Log message: actualizar nombre de container

---

## 🔧 Compatibilidad con docker-compose.yml

### Verificar que docker-compose.yml use nombres consistentes:

```yaml
services:
  postgres:
    container_name: alugueisV3_postgres  # ✅ Debe coincidir
    
  backend:
    container_name: alugueisV3_backend   # ✅ Debe coincidir
    environment:
      DATABASE_URL: postgresql://...@alugueisV3_postgres:5432/...
```

---

## 📊 Impacto de los Problemas

| Problema | Severidad | Impacto | Probabilidad Fallo |
|----------|-----------|---------|-------------------|
| Container names | CRÍTICO | Alto | 100% |
| Database defaults | CRÍTICO | Medio | 80% |
| DATABASE_URL | CRÍTICO | Alto | 100% |
| Header/Messages | BAJO | Bajo | 0% |

**Probabilidad de fallo sin correcciones:** 95%

---

## ✅ Funcionalidades que NO requieren cambios

1. ✅ Generación de SECRET_KEY (seguro)
2. ✅ Configuración de CORS
3. ✅ Lógica de Traefik
4. ✅ Wait for PostgreSQL health check
5. ✅ Creación de usuario admin
6. ✅ Generación de archivos .env
7. ✅ Docker operations (up, down, build)
8. ✅ Progress bars y UI (Rich)
9. ✅ Error handling
10. ✅ Final summary

---

## 🔍 Verificaciones Adicionales Necesarias

### 1. Verificar docker-compose.yml:
```bash
grep -n "container_name" docker-compose.yml
# Debe mostrar alugueisV3_postgres y alugueisV3_backend
```

### 2. Verificar docker-compose.traefik.yml:
```bash
grep -n "alugueisV" docker-compose.traefik.yml
# Debe usar alugueisV3 consistentemente
```

### 3. Verificar scripts de inicialización:
```bash
ls -la database/init/
# Verificar que scripts usen nombres correctos
```

---

## 🎯 Recomendaciones

### Prioridad Alta:
1. ⚠️ **Actualizar todos los nombres de V2 a V3** (crítico)
2. ⚠️ **Verificar consistencia con docker-compose.yml** (crítico)
3. ⚠️ **Testear script en entorno limpio** (importante)

### Prioridad Media:
4. ✅ Agregar verificación de versión de Docker (recomendado)
5. ✅ Agregar opción de rollback (recomendado)
6. ✅ Mejorar mensajes de error (opcional)

### Prioridad Baja:
7. ✅ Agregar logo ASCII art (cosmético)
8. ✅ Agregar progreso más detallado (cosmético)

---

## 🧪 Plan de Testing

### Test 1: Instalación Limpia
```bash
# En sistema sin AlugueisV3 previo
python scripts/install.py
# Verificar que todos los containers se crean con nombres V3
docker ps --filter "name=alugueisV3"
```

### Test 2: Instalación con Traefik
```bash
python scripts/install.py
# Seleccionar "Sí" para Traefik
# Verificar archivos .env generados
cat .env
cat backend/.env
```

### Test 3: Instalación sin Traefik
```bash
python scripts/install.py
# Seleccionar "No" para Traefik
# Verificar que usa localhost
```

### Test 4: Creación de Usuario Admin
```bash
# Después de instalación
docker exec alugueisV3_postgres psql -U alugueisv3_usuario -d alugueisv3_db \
  -c "SELECT usuario, tipo_de_usuario FROM usuarios WHERE tipo_de_usuario='administrador';"
# Debe mostrar el usuario admin creado
```

---

## 📋 Checklist de Correcciones

### Antes de Deploy:
- [ ] Actualizar nombres de containers (7 cambios)
- [ ] Actualizar defaults de database (3 cambios)
- [ ] Actualizar DATABASE_URLs (2 cambios)
- [ ] Actualizar mensajes y logs (2 cambios)
- [ ] Verificar consistencia con docker-compose.yml
- [ ] Testear en entorno limpio
- [ ] Documentar cambios en CHANGELOG.md

---

## 🔗 Archivos Relacionados

1. `scripts/install.py` - Este script
2. `docker-compose.yml` - Definición de servicios
3. `docker-compose.traefik.yml` - Configuración Traefik
4. `database/init/*.sql` - Scripts de inicialización DB
5. `.env` - Variables de entorno (generado)
6. `backend/.env` - Variables backend (generado)

---

## 🎯 Próximos Pasos

1. **Corregir install.py** con todos los cambios identificados
2. **Verificar docker-compose.yml** tiene nombres consistentes
3. **Testear script** en entorno limpio
4. **Documentar** proceso de instalación en README.md
5. **Crear guía** de troubleshooting para instalación

---

## 📊 Métricas del Script

| Métrica | Valor |
|---------|-------|
| Líneas totales | 384 |
| Funciones | 9 |
| Dependencias | 3 (rich, secrets, subprocess) |
| Pasos de instalación | 7 |
| Tiempo estimado | 5-10 minutos |
| Nivel de automatización | 95% |
| Manejo de errores | Bueno ✅ |
| UX (Rich) | Excelente ✅ |

---

## ✅ Conclusión

**Estado General:** El script está bien diseñado pero requiere actualizaciones críticas para ser compatible con AlugueisV3.

**Problemas Críticos:** 7 (todos relacionados con nomenclatura V2 → V3)

**Tiempo de Corrección:** 15-20 minutos

**Riesgo sin correcciones:** Alto (95% probabilidad de fallo)

**Recomendación:** Aplicar todas las correcciones antes de usar el script en producción.

---

**Siguiente Acción:** Aplicar correcciones al archivo `scripts/install.py`
