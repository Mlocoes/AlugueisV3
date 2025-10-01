# 🗄️ CacheService API Documentation

## Versión: 1.0.0

**Archivo:** `frontend/js/services/cache-service.js`  
**Autor:** AlugueisV3 Team  
**Última actualización:** 1 de octubre de 2025

---

## 🎯 Descripción

CacheService es un sistema de caché inteligente para el frontend que reduce llamadas redundantes a la API, mejora el rendimiento de la aplicación, y proporciona una experiencia de usuario más rápida.

### Características Principales:
- ✅ Caché en memoria (in-memory)
- ✅ TTL (Time To Live) configurable por store
- ✅ Invalidación manual y automática
- ✅ Estadísticas de hit/miss rate
- ✅ Auto-limpieza de caché expirado
- ✅ Persistencia en localStorage (opcional)
- ✅ Event listeners para cambios
- ✅ Debug mode para desarrollo

---

## 📦 Instalación

### 1. Incluir JavaScript antes del cierre de `</body>`:
```html
<script src="js/services/cache-service.js"></script>
```

### 2. Verificar carga:
```javascript
console.log(window.cacheService); // Debe estar definido
```

---

## 🚀 Uso Básico

### Ejemplo Mínimo:
```javascript
// Guardar en cache
window.cacheService.set('mi-store', 'mi-key', { data: [1, 2, 3] });

// Obtener de cache
const cached = window.cacheService.get('mi-store', 'mi-key');
console.log(cached); // { data: [1, 2, 3] } o null si no existe/expiró

// Invalidar cache
window.cacheService.invalidate('mi-store');
```

---

## 🗂️ Stores Predefinidos

El sistema incluye stores predefinidos con TTL configurados:

| Store | TTL | Descripción |
|-------|-----|-------------|
| `proprietarios` | 5 minutos | Lista de propietarios |
| `imoveis` | 5 minutos | Lista de inmuebles |
| `usuarios` | 10 minutos | Lista de usuarios |
| `participacoes_datas` | 2 minutos | Fechas de participaciones (cambia frecuentemente) |
| `anos_disponiveis` | 5 minutos | Años disponibles de alquileres |

### Agregar Nuevo Store:
```javascript
// En cache-service.js constructor
this.stores = {
    ...existingStores,
    'mi-nuevo-store': { ttl: 300000 } // 5 minutos
};
```

---

## 🔧 Métodos Públicos

### get(storeName, key)
Obtiene un valor del caché.

**Parámetros:**
- `storeName` (String): Nombre del store
- `key` (String): Key del valor a obtener

**Retorna:**
- `any`: Valor cacheado o `null` si no existe/expiró

**Ejemplo:**
```javascript
const proprietarios = cacheService.get('proprietarios', 'all');
if (proprietarios) {
    console.log('✅ Cache HIT:', proprietarios);
} else {
    console.log('❌ Cache MISS, cargando desde API...');
    const data = await apiService.getProprietarios();
    cacheService.set('proprietarios', 'all', data);
}
```

---

### set(storeName, key, value, customTTL)
Guarda un valor en el caché.

**Parámetros:**
- `storeName` (String): Nombre del store
- `key` (String): Key del valor
- `value` (any): Valor a cachear
- `customTTL` (Number, opcional): TTL custom en milisegundos

**Retorna:**
- `void`

**Ejemplo:**
```javascript
// Con TTL default del store
cacheService.set('proprietarios', 'all', proprietariosData);

// Con TTL custom (10 segundos)
cacheService.set('temp-data', 'key1', tempData, 10000);
```

---

### invalidate(storeName, key)
Invalida una entrada o todo un store del caché.

**Parámetros:**
- `storeName` (String): Nombre del store
- `key` (String, opcional): Key específica a invalidar. Si se omite, invalida todo el store

**Retorna:**
- `void`

**Ejemplo:**
```javascript
// Invalidar entrada específica
cacheService.invalidate('proprietarios', 'id-123');

// Invalidar todo el store
cacheService.invalidate('proprietarios');

// Invalidar múltiples stores
cacheService.invalidate('proprietarios');
cacheService.invalidate('imoveis');
```

---

### clear()
Limpia todo el caché (todos los stores).

**Retorna:**
- `void`

**Ejemplo:**
```javascript
// Limpiar todo el cache (útil al logout)
cacheService.clear();
```

---

### getStats()
Obtiene estadísticas del caché.

**Retorna:**
- `Object`: Objeto con estadísticas

**Ejemplo:**
```javascript
const stats = cacheService.getStats();
console.log(stats);

/*
{
    totalHits: 150,
    totalMisses: 50,
    hitRate: 0.75,  // 75%
    stores: {
        proprietarios: {
            entries: 1,
            hits: 50,
            misses: 10
        },
        imoveis: {
            entries: 1,
            hits: 100,
            misses: 40
        }
    }
}
*/
```

---

### debug()
Muestra información de debug en la consola (útil para desarrollo).

**Retorna:**
- `void`

**Ejemplo:**
```javascript
// Ver estado completo del cache
cacheService.debug();

/*
Console output:
=== CacheService Debug ===
Total Stores: 5
Total Entries: 3
Hit Rate: 75.0%

Stores:
  - proprietarios:
    - Entries: 1
    - TTL: 300000ms (5min)
    - Hits: 50
    - Misses: 10
  - imoveis:
    - Entries: 1
    - TTL: 300000ms (5min)
    - Hits: 100
    - Misses: 40
*/
```

---

### on(event, callback)
Registra un listener para eventos del caché.

**Parámetros:**
- `event` (String): Nombre del evento (`'set'`, `'get'`, `'invalidate'`, `'clear'`)
- `callback` (Function): Función callback

**Retorna:**
- `void`

**Ejemplo:**
```javascript
// Escuchar cuando se guarda algo en cache
cacheService.on('set', (storeName, key, value) => {
    console.log(`✅ Cached: ${storeName}.${key}`);
});

// Escuchar cuando se invalida cache
cacheService.on('invalidate', (storeName, key) => {
    console.log(`🗑️ Invalidated: ${storeName}${key ? `.${key}` : ''}`);
});

// Escuchar cache hits/misses
cacheService.on('get', (storeName, key, hit) => {
    if (hit) {
        console.log(`✅ HIT: ${storeName}.${key}`);
    } else {
        console.log(`❌ MISS: ${storeName}.${key}`);
    }
});
```

---

## 💡 Patrones de Uso

### Patrón 1: Cache con Fallback a API
```javascript
async function getProprietarios(useCache = true) {
    if (useCache) {
        const cached = cacheService.get('proprietarios', 'all');
        if (cached) {
            console.log('📦 Usando datos cacheados');
            return cached;
        }
    }
    
    console.log('🌐 Cargando desde API...');
    const data = await apiService.getProprietarios();
    cacheService.set('proprietarios', 'all', data);
    return data;
}

// Uso
const proprietarios = await getProprietarios(true); // intenta cache primero
```

---

### Patrón 2: Invalidación Automática en Mutaciones
```javascript
async function createProprietario(data) {
    const response = await apiService.createProprietario(data);
    
    // Invalidar cache para forzar refresh
    cacheService.invalidate('proprietarios');
    
    return response;
}

async function updateProprietario(id, data) {
    const response = await apiService.updateProprietario(id, data);
    
    // Invalidar cache
    cacheService.invalidate('proprietarios');
    
    return response;
}

async function deleteProprietario(id) {
    const response = await apiService.deleteProprietario(id);
    
    // Invalidar cache
    cacheService.invalidate('proprietarios');
    
    return response;
}
```

---

### Patrón 3: Cache por ID Individual
```javascript
async function getProprietarioById(id, useCache = true) {
    const cacheKey = `id-${id}`;
    
    if (useCache) {
        const cached = cacheService.get('proprietarios', cacheKey);
        if (cached) return cached;
    }
    
    const data = await apiService.getProprietario(id);
    cacheService.set('proprietarios', cacheKey, data);
    return data;
}

// Invalidar solo ese ID al editar
async function updateProprietario(id, data) {
    const response = await apiService.updateProprietario(id, data);
    
    // Invalidar cache específico
    cacheService.invalidate('proprietarios', `id-${id}`);
    
    // También invalidar lista completa
    cacheService.invalidate('proprietarios', 'all');
    
    return response;
}
```

---

### Patrón 4: Cache con TTL Custom
```javascript
// Datos que cambian muy rápido (30 segundos)
async function getLiveData() {
    const cached = cacheService.get('live-data', 'current');
    if (cached) return cached;
    
    const data = await apiService.getLiveData();
    cacheService.set('live-data', 'current', data, 30000); // 30s TTL
    return data;
}

// Datos estáticos (1 hora)
async function getStaticConfig() {
    const cached = cacheService.get('config', 'static');
    if (cached) return cached;
    
    const data = await apiService.getConfig();
    cacheService.set('config', 'static', data, 3600000); // 1h TTL
    return data;
}
```

---

### Patrón 5: Cache con Estrategia Stale-While-Revalidate
```javascript
async function getProprietarios(useCache = true) {
    const cached = cacheService.get('proprietarios', 'all');
    
    if (useCache && cached) {
        // Devolver datos cacheados inmediatamente
        console.log('📦 Usando cache (stale)');
        
        // Revalidar en background
        apiService.getProprietarios().then(freshData => {
            cacheService.set('proprietarios', 'all', freshData);
            console.log('🔄 Cache actualizado en background');
        });
        
        return cached;
    }
    
    // Sin cache, cargar normalmente
    const data = await apiService.getProprietarios();
    cacheService.set('proprietarios', 'all', data);
    return data;
}
```

---

## 📊 Integración con apiService

### Ejemplo de apiService.js con Cache:
```javascript
class ApiService {
    constructor() {
        this.cacheService = window.cacheService;
    }
    
    // GET con cache opcional
    async getProprietarios(useCache = true) {
        if (useCache && this.cacheService) {
            const cached = this.cacheService.get('proprietarios', 'all');
            if (cached) return cached;
        }
        
        const response = await fetch('/api/proprietarios');
        const data = await response.json();
        
        if (this.cacheService) {
            this.cacheService.set('proprietarios', 'all', data);
        }
        
        return data;
    }
    
    // CREATE invalida cache
    async createProprietario(data) {
        const response = await fetch('/api/proprietarios', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        // Invalidar cache
        if (this.cacheService) {
            this.cacheService.invalidate('proprietarios');
        }
        
        return response.json();
    }
    
    // UPDATE invalida cache
    async updateProprietario(id, data) {
        const response = await fetch(`/api/proprietarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        // Invalidar cache
        if (this.cacheService) {
            this.cacheService.invalidate('proprietarios');
        }
        
        return response.json();
    }
    
    // DELETE invalida cache
    async deleteProprietario(id) {
        const response = await fetch(`/api/proprietarios/${id}`, {
            method: 'DELETE'
        });
        
        // Invalidar cache
        if (this.cacheService) {
            this.cacheService.invalidate('proprietarios');
        }
        
        return response.json();
    }
}
```

---

## 🎨 Configuración Avanzada

### Persistir Cache en localStorage:
```javascript
// En cache-service.js, agregar métodos:

class CacheService {
    // ... código existente ...
    
    // Guardar cache en localStorage
    persist() {
        try {
            localStorage.setItem('app-cache', JSON.stringify(this.cache));
            console.log('✅ Cache persistido en localStorage');
        } catch (e) {
            console.error('❌ Error al persistir cache:', e);
        }
    }
    
    // Restaurar cache desde localStorage
    restore() {
        try {
            const stored = localStorage.getItem('app-cache');
            if (stored) {
                this.cache = JSON.parse(stored);
                console.log('✅ Cache restaurado desde localStorage');
            }
        } catch (e) {
            console.error('❌ Error al restaurar cache:', e);
        }
    }
    
    // Auto-persistir cada 30 segundos
    startAutoPersist() {
        setInterval(() => {
            this.persist();
        }, 30000);
    }
}

// Uso:
window.cacheService.restore(); // al cargar app
window.cacheService.startAutoPersist(); // auto-guardar
```

---

### Comprimir Cache (grandes datasets):
```javascript
// Usar LZ-String library para comprimir
// <script src="https://cdn.jsdelivr.net/npm/lz-string@1.4.4/libs/lz-string.min.js"></script>

set(storeName, key, value, customTTL) {
    // Comprimir antes de guardar
    const compressed = LZString.compress(JSON.stringify(value));
    
    // Guardar comprimido
    this._setInternal(storeName, key, compressed, customTTL);
}

get(storeName, key) {
    const compressed = this._getInternal(storeName, key);
    if (!compressed) return null;
    
    // Descomprimir
    const decompressed = LZString.decompress(compressed);
    return JSON.parse(decompressed);
}
```

---

## 📊 Métricas y Monitoreo

### Dashboard de Cache:
```javascript
function showCacheDashboard() {
    const stats = cacheService.getStats();
    
    console.log(`
    ╔════════════════════════════════════╗
    ║     CacheService Dashboard         ║
    ╠════════════════════════════════════╣
    ║ Hit Rate:     ${(stats.hitRate * 100).toFixed(1)}%          ║
    ║ Total Hits:   ${stats.totalHits}                 ║
    ║ Total Misses: ${stats.totalMisses}                 ║
    ╠════════════════════════════════════╣
    ║ Stores:                            ║
    ${Object.keys(stats.stores).map(store => `
    ║   - ${store}: ${stats.stores[store].entries} entries      ║`).join('')}
    ╚════════════════════════════════════╝
    `);
}

// Llamar cada minuto
setInterval(showCacheDashboard, 60000);
```

---

### Alertas de Performance:
```javascript
// Alertar si hit rate es bajo
cacheService.on('get', (storeName, key, hit) => {
    const stats = cacheService.getStats();
    
    if (stats.totalHits + stats.totalMisses > 100 && stats.hitRate < 0.5) {
        console.warn(`⚠️ Hit rate bajo: ${(stats.hitRate * 100).toFixed(1)}%`);
    }
});
```

---

## 🐛 Troubleshooting

### Cache no funciona:
```javascript
// Verificar que cacheService está definido
console.log(window.cacheService); // debe ser objeto

// Verificar que store existe
console.log(cacheService.stores); // debe incluir tu store
```

### Cache no se invalida:
```javascript
// Verificar llamada a invalidate después de mutaciones
async function updateProprietario(id, data) {
    const response = await apiService.updateProprietario(id, data);
    
    // ⚠️ IMPORTANTE: invalidar después de la mutación
    cacheService.invalidate('proprietarios');
    
    return response;
}
```

### TTL demasiado largo/corto:
```javascript
// Ajustar TTL en constructor
this.stores = {
    'mi-store': { 
        ttl: 60000  // 1 minuto en vez de 5
    }
};
```

---

## 📚 Best Practices

### 1. ✅ Usar cache en GET, invalidar en POST/PUT/DELETE
```javascript
// ✅ BIEN
async getItems(useCache = true) {
    if (useCache) {
        const cached = cache.get('items', 'all');
        if (cached) return cached;
    }
    const data = await api.getItems();
    cache.set('items', 'all', data);
    return data;
}

async createItem(data) {
    const response = await api.createItem(data);
    cache.invalidate('items'); // ⚠️ IMPORTANTE
    return response;
}
```

---

### 2. ✅ TTL según frecuencia de cambio
```javascript
// ✅ BIEN
stores = {
    'static-config': { ttl: 3600000 },  // 1 hora (raramente cambia)
    'live-data': { ttl: 30000 },        // 30 segundos (cambia frecuentemente)
    'users': { ttl: 300000 }            // 5 minutos (balance)
}
```

---

### 3. ✅ Usar debug() en desarrollo
```javascript
// ✅ BIEN en development
if (process.env.NODE_ENV === 'development') {
    window.showCacheDebug = () => cacheService.debug();
}

// Llamar en console:
// showCacheDebug()
```

---

### 4. ✅ Invalidar múltiples stores relacionados
```javascript
// ✅ BIEN
async deleteProprietario(id) {
    await api.deleteProprietario(id);
    
    // Invalidar stores relacionados
    cache.invalidate('proprietarios');
    cache.invalidate('participacoes'); // puede incluir esse proprietario
    cache.invalidate('imoveis');       // puede incluir imoveis desse proprietario
}
```

---

## 🔗 Referencias

### Documentación Relacionada:
- [GridComponent API](./GRID_COMPONENT_API.md)
- [apiService Integration](./API_SERVICE.md)

### Links Útiles:
- [HTTP Caching MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Cache Strategies](https://web.dev/cache-api-quick-guide/)

---

## 📄 Licencia

MIT License - AlugueisV3 Project

---

**CacheService v1.0.0** - Documentación completa
