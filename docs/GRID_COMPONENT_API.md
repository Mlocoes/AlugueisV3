# 📊 GridComponent API Documentation

## Versión: 1.0.0

**Archivo:** `frontend/js/core/grid-component.js`  
**CSS:** `frontend/css/grid-component.css`  
**Autor:** AlugueisV3 Team  
**Última actualización:** 1 de octubre de 2025

---

## 🎯 Descripción

GridComponent es un componente universal para renderizar tablas y grids con características avanzadas como búsqueda, ordenación, paginación, acciones por fila, y renderización responsive automática.

### Características Principales:
- ✅ Renderización desktop (tabla) y mobile (cards)
- ✅ Búsqueda en tiempo real
- ✅ Ordenación por columnas (ascendente/descendente)
- ✅ Paginación configurable
- ✅ Acciones por fila personalizables
- ✅ Selección múltiple (opcional)
- ✅ Agrupación de filas (opcional)
- ✅ Responsive automático
- ✅ Accesibilidad (ARIA labels)
- ✅ Loading y empty states

---

## 📦 Instalación

### 1. Incluir CSS en `<head>`:
```html
<link href="css/grid-component.css" rel="stylesheet">
```

### 2. Incluir JavaScript antes del cierre de `</body>`:
```html
<script src="js/core/grid-component.js"></script>
```

### 3. Verificar carga:
```javascript
console.log(window.GridComponent); // Debe estar definido
```

---

## 🚀 Uso Básico

### Ejemplo Mínimo:
```javascript
const config = {
    container: document.getElementById('mi-contenedor'),
    columns: [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre' }
    ],
    data: [
        { id: 1, nombre: 'Juan' },
        { id: 2, nombre: 'María' }
    ]
};

const grid = new GridComponent(config);
grid.render();
```

---

## 📋 Configuración

### Constructor:
```javascript
new GridComponent(config)
```

### Parámetros de Configuración:

#### **config** (Object)
Objeto con todas las opciones del grid.

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `container` | HTMLElement | **required** | Elemento DOM donde se renderiza el grid |
| `columns` | Array | **required** | Array de objetos Column (ver abajo) |
| `data` | Array | **required** | Array de objetos con los datos |
| `sortable` | Boolean | `false` | Habilita ordenación global |
| `searchable` | Boolean | `false` | Habilita búsqueda global |
| `searchPlaceholder` | String | `'Buscar...'` | Placeholder del input de búsqueda |
| `pagination` | Boolean | `false` | Habilita paginación |
| `itemsPerPage` | Number | `10` | Items por página (si pagination=true) |
| `itemsPerPageOptions` | Array | `[10,20,50]` | Opciones de items por página |
| `emptyMessage` | String | `'No hay datos'` | Mensaje cuando data está vacío |
| `loadingMessage` | String | `'Cargando...'` | Mensaje durante carga |
| `rowActions` | Array | `[]` | Array de objetos RowAction (ver abajo) |
| `selectable` | Boolean | `false` | Habilita selección múltiple |
| `groupBy` | String | `null` | Key para agrupar filas |
| `responsive` | Object | `{}` | Configuración responsive (ver abajo) |
| `classes` | Object | `{}` | Clases CSS personalizadas (ver abajo) |

---

## 📐 Column Configuration

### Objeto Column:
```javascript
{
    key: 'nombre',              // required: key en el objeto data
    label: 'Nombre',            // required: texto del header
    sortable: true,             // opcional: columna ordenable
    searchable: true,           // opcional: columna buscable
    type: 'text',              // opcional: 'text', 'number', 'date', 'currency'
    align: 'left',             // opcional: 'left', 'center', 'right'
    width: '200px',            // opcional: ancho fijo
    render: (value, row) => {} // opcional: función custom de renderizado
}
```

### Ejemplo de Columnas Avanzadas:
```javascript
columns: [
    {
        key: 'id',
        label: 'ID',
        sortable: true,
        type: 'number',
        align: 'center',
        width: '80px'
    },
    {
        key: 'nombre',
        label: 'Nome Completo',
        sortable: true,
        searchable: true,
        render: (value, row) => `
            <strong>${value}</strong>
            <br>
            <small class="text-muted">${row.email}</small>
        `
    },
    {
        key: 'valor',
        label: 'Valor',
        sortable: true,
        type: 'currency',
        align: 'right',
        render: (value, row) => `R$ ${value.toLocaleString('pt-BR')}`
    },
    {
        key: 'activo',
        label: 'Status',
        align: 'center',
        render: (value, row) => value 
            ? '<span class="badge bg-success">Activo</span>'
            : '<span class="badge bg-danger">Inactivo</span>'
    }
]
```

---

## ⚡ Row Actions

### Objeto RowAction:
```javascript
{
    icon: 'fas fa-edit',        // required: clase de icono
    label: 'Editar',            // required: label accesible
    class: 'btn-primary',       // opcional: clase Bootstrap
    callback: (row) => {}       // required: función al hacer click
}
```

### Ejemplo:
```javascript
rowActions: [
    {
        icon: 'fas fa-edit',
        label: 'Editar',
        class: 'btn-outline-primary',
        callback: (row) => {
            console.log('Editando:', row);
            this.editItem(row.id);
        }
    },
    {
        icon: 'fas fa-trash',
        label: 'Eliminar',
        class: 'btn-outline-danger',
        callback: (row) => {
            if (confirm(`¿Eliminar ${row.nombre}?`)) {
                this.deleteItem(row.id);
            }
        }
    },
    {
        icon: 'fas fa-eye',
        label: 'Ver detalle',
        class: 'btn-outline-info',
        callback: (row) => {
            this.showDetail(row);
        }
    }
]
```

---

## 📱 Responsive Configuration

### Objeto Responsive:
```javascript
responsive: {
    enabled: true,              // habilita responsive
    breakpoint: 768,            // breakpoint en px (default: 768)
    mobileRender: (row) => {}   // función custom para cards mobile
}
```

### Ejemplo Mobile Custom:
```javascript
responsive: {
    enabled: true,
    breakpoint: 768,
    mobileRender: (row) => `
        <div class="card mobile-card mb-2">
            <div class="card-body">
                <h5 class="card-title">${row.nombre}</h5>
                <p class="card-text">
                    <strong>Email:</strong> ${row.email}<br>
                    <strong>Telefone:</strong> ${row.telefone}
                </p>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-primary" onclick="editItem(${row.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItem(${row.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        </div>
    `
}
```

---

## 🎨 Classes Configuration

### Objeto Classes:
```javascript
classes: {
    table: 'table table-hover',
    thead: 'thead-dark',
    headerCell: 'table-header-cell',
    bodyCell: 'table-body-cell',
    searchInput: 'form-control',
    pagination: 'pagination',
    loading: 'spinner-border'
}
```

---

## 🔧 Métodos Públicos

### render()
Renderiza el grid completo.
```javascript
grid.render();
```

### updateConfig(newConfig)
Actualiza la configuración y re-renderiza.
```javascript
grid.updateConfig({
    data: newData,
    sortable: true
});
```

### updateData(newData)
Actualiza solo los datos y re-renderiza.
```javascript
grid.updateData([
    { id: 1, nombre: 'Juan' },
    { id: 2, nombre: 'María' }
]);
```

### getSelectedRows()
Retorna array de filas seleccionadas (si `selectable: true`).
```javascript
const selected = grid.getSelectedRows();
console.log(selected); // [{ id: 1, ... }, { id: 3, ... }]
```

### destroy()
Destruye el grid y limpia event listeners.
```javascript
grid.destroy();
```

---

## 📊 Eventos

### onSort
Se dispara cuando se ordena una columna.
```javascript
config.onSort = (column, direction) => {
    console.log(`Ordenado por ${column} en dirección ${direction}`);
};
```

### onSearch
Se dispara cuando se realiza una búsqueda.
```javascript
config.onSearch = (query) => {
    console.log(`Buscando: ${query}`);
};
```

### onPageChange
Se dispara cuando se cambia de página.
```javascript
config.onPageChange = (page) => {
    console.log(`Página: ${page}`);
};
```

### onRowClick
Se dispara cuando se hace click en una fila.
```javascript
config.onRowClick = (row) => {
    console.log('Fila clickeada:', row);
};
```

### onSelectionChange
Se dispara cuando cambia la selección (si `selectable: true`).
```javascript
config.onSelectionChange = (selectedRows) => {
    console.log(`${selectedRows.length} filas seleccionadas`);
};
```

---

## 💡 Ejemplos Completos

### Ejemplo 1: Grid Simple
```javascript
const grid = new GridComponent({
    container: document.getElementById('grid-container'),
    columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'nome', label: 'Nome', sortable: true, searchable: true },
        { key: 'email', label: 'Email', searchable: true }
    ],
    data: [
        { id: 1, nome: 'Juan Pérez', email: 'juan@example.com' },
        { id: 2, nome: 'María García', email: 'maria@example.com' }
    ],
    sortable: true,
    searchable: true,
    pagination: true,
    itemsPerPage: 10
});

grid.render();
```

### Ejemplo 2: Grid con Acciones
```javascript
const grid = new GridComponent({
    container: document.getElementById('users-table'),
    columns: [
        { key: 'id', label: 'ID', type: 'number', align: 'center' },
        { key: 'nome', label: 'Nome', sortable: true, searchable: true },
        { key: 'email', label: 'Email', searchable: true }
    ],
    data: userData,
    sortable: true,
    searchable: true,
    searchPlaceholder: 'Buscar usuario...',
    pagination: true,
    itemsPerPage: 20,
    itemsPerPageOptions: [10, 20, 50, 100],
    rowActions: [
        {
            icon: 'fas fa-edit',
            label: 'Editar',
            class: 'btn-outline-primary',
            callback: (row) => editUser(row.id)
        },
        {
            icon: 'fas fa-trash',
            label: 'Eliminar',
            class: 'btn-outline-danger',
            callback: (row) => deleteUser(row.id)
        }
    ],
    responsive: {
        enabled: true,
        breakpoint: 768
    }
});

grid.render();
```

### Ejemplo 3: Grid con Columnas Personalizadas
```javascript
const grid = new GridComponent({
    container: document.getElementById('productos-grid'),
    columns: [
        {
            key: 'nombre',
            label: 'Producto',
            sortable: true,
            searchable: true,
            render: (value, row) => `
                <div class="d-flex align-items-center">
                    <img src="${row.imagen}" alt="${value}" style="width:40px;height:40px;margin-right:10px;">
                    <div>
                        <strong>${value}</strong><br>
                        <small class="text-muted">SKU: ${row.sku}</small>
                    </div>
                </div>
            `
        },
        {
            key: 'precio',
            label: 'Precio',
            sortable: true,
            type: 'currency',
            align: 'right',
            render: (value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        },
        {
            key: 'stock',
            label: 'Stock',
            sortable: true,
            align: 'center',
            render: (value) => value > 10 
                ? `<span class="badge bg-success">${value}</span>`
                : `<span class="badge bg-warning">${value}</span>`
        }
    ],
    data: productosData,
    sortable: true,
    searchable: true,
    pagination: true,
    itemsPerPage: 25
});

grid.render();
```

---

## 🎨 Personalización CSS

### Clases Disponibles:
```css
/* Contenedor principal */
.grid-component { }

/* Toolbar (búsqueda + filtros) */
.grid-toolbar { }
.grid-search-input { }

/* Tabla desktop */
.grid-table { }
.grid-header-cell { }
.grid-body-cell { }
.grid-sortable { }
.grid-sorted-asc { }
.grid-sorted-desc { }

/* Cards mobile */
.grid-mobile-cards { }
.grid-mobile-card { }

/* Paginación */
.grid-pagination { }
.grid-page-info { }

/* Estados */
.grid-loading { }
.grid-empty { }
```

### Ejemplo de Personalización:
```css
/* Personalizar header */
.grid-header-cell {
    background-color: #007bff;
    color: white;
    font-weight: bold;
}

/* Personalizar filas hover */
.grid-table tbody tr:hover {
    background-color: #f8f9fa;
    cursor: pointer;
}

/* Personalizar mobile cards */
.grid-mobile-card {
    border-left: 4px solid #007bff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

---

## 🐛 Troubleshooting

### El grid no se renderiza:
```javascript
// Verificar que container existe
console.log(config.container); // Debe ser HTMLElement

// Verificar que hay datos
console.log(config.data); // Debe ser Array con elementos

// Verificar console por errores
// F12 → Console
```

### La búsqueda no funciona:
```javascript
// Verificar que searchable está true
config.searchable = true;

// Verificar que columnas tienen searchable: true
columns: [
    { key: 'nome', label: 'Nome', searchable: true }
]
```

### La paginación no aparece:
```javascript
// Verificar que pagination está true
config.pagination = true;

// Verificar que hay más datos que itemsPerPage
data.length > config.itemsPerPage
```

---

## 📚 Best Practices

### 1. Usar render() para columnas complejas
```javascript
// ❌ MAL
columns: [
    { key: 'nombre', label: 'Nombre' }
]

// ✅ BIEN
columns: [
    { 
        key: 'nombre', 
        label: 'Nombre',
        render: (value, row) => sanitizeHTML(value) // prevenir XSS
    }
]
```

### 2. Limitar acciones por fila
```javascript
// ❌ MAL: demasiadas acciones
rowActions: [action1, action2, action3, action4, action5]

// ✅ BIEN: max 3 acciones
rowActions: [edit, delete, view]
```

### 3. Usar responsive para mobile
```javascript
// ✅ BIEN
responsive: {
    enabled: true,
    breakpoint: 768,
    mobileRender: (row) => customCard(row)
}
```

### 4. Paginar datasets grandes
```javascript
// ❌ MAL: cargar 10,000 items sin paginación
data: bigArray // performance horrible

// ✅ BIEN: paginar
pagination: true,
itemsPerPage: 50
```

---

## 🔗 Integración con Otros Componentes

### Con CacheService:
```javascript
// Cargar datos con cache
const data = await apiService.getProprietarios(true); // useCache = true

// Crear grid
const grid = new GridComponent({
    container: document.getElementById('grid'),
    columns: columns,
    data: data
});

grid.render();

// Invalidar cache al crear/editar/eliminar
async function deleteItem(id) {
    await apiService.deleteProprietario(id);
    cacheService.invalidate('proprietarios'); // invalidar cache
    const newData = await apiService.getProprietarios(true); // recargar
    grid.updateData(newData); // actualizar grid
}
```

---

## 📄 Licencia

MIT License - AlugueisV3 Project

---

## 🤝 Contribuir

Para contribuir al GridComponent:
1. Reportar bugs en GitHub Issues
2. Proponer features en GitHub Discussions
3. Submit Pull Requests con tests

---

**GridComponent v1.0.0** - Documentación completa
