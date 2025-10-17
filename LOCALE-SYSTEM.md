# 🌍 Sistema de Locale Automático

## Visão Geral

O sistema agora detecta **automaticamente o formato regional** (locale) do navegador/sistema operacional do usuário e adapta a formatação de números, datas e moedas.

## Como Funciona

### 1. Detecção Automática

O `LocaleManager` é carregado antes de todos os outros scripts e detecta:

```javascript
// Ordem de prioridade:
1. navigator.language        // Mais preciso (ex: 'pt-BR', 'en-US')
2. navigator.userLanguage    // Fallback para IE antigo
3. navigator.languages[0]    // Fallback adicional
4. 'pt-BR'                   // Fallback padrão
```

### 2. Formatos Suportados

| Locale | Exemplo Número | Exemplo Moeda | Descrição |
|--------|---------------|---------------|-----------|
| `pt-BR` | 1.234,56 | R$ 1.234,56 | Português (Brasil) |
| `en-US` | 1,234.56 | $ 1,234.56 | Inglês (Estados Unidos) |
| `es-ES` | 1.234,56 | € 1.234,56 | Espanhol (Espanha) |
| `en-GB` | 1,234.56 | £ 1,234.56 | Inglês (Reino Unido) |
| `de-DE` | 1.234,56 | € 1.234,56 | Alemão (Alemanha) |
| `fr-FR` | 1 234,56 | € 1 234,56 | Francês (França) |

## Uso no Código

### API Simples

```javascript
// Usar a instância global
const locale = window.localeManager;

// Formatar moeda
locale.formatCurrency(1234.56);
// pt-BR: "1.234,56"
// en-US: "1,234.56"

// Formatar número
locale.formatNumber(1234.56);
// Mesmo comportamento

// Formatar data
locale.formatDate(new Date());
// pt-BR: "17/10/2025, 14:30:00"
// en-US: "10/17/2025, 2:30:00 PM"

// Formatar porcentagem
locale.formatPercent(0.1556);
// "16%" (ambos locales)
```

### Obter Informações

```javascript
locale.getLocaleInfo();
// Retorna:
{
  locale: "pt-BR",
  decimalSeparator: ",",
  thousandsSeparator: ".",
  currency: {
    symbol: "R$",
    code: "BRL",
    name: "Real Brasileiro"
  }
}
```

## Migração de Código Existente

### Antes (hardcoded pt-BR)
```javascript
const valor = 1234.56;
const formatado = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
// SEMPRE mostra: "1.234,56" (mesmo se usuário for americano)
```

### Depois (automático)
```javascript
const valor = 1234.56;
const formatado = window.localeManager.formatCurrency(valor);
// pt-BR: "1.234,56"
// en-US: "1,234.56"
// Adapta automaticamente!
```

## Arquivos Modificados

### ✅ Implementados

1. **`frontend/js/utils/locale-manager.js`** (NOVO)
   - Classe LocaleManager com toda a lógica
   - Detecção automática de locale
   - Métodos de formatação

2. **`frontend/index.html`**
   - Adicionado script locale-manager.js
   - Carregado ANTES de todos os outros scripts

3. **`frontend/js/modules/extras.js`**
   - Migrado de `this.userLocale` para `window.localeManager`
   - Usa `formatCurrency()` em vez de `toLocaleString()`

### 🔄 Pendentes de Migração

Os seguintes arquivos ainda usam `'pt-BR'` hardcoded:

- `frontend/js/modules/dashboard.js` (2 ocorrências)
- `frontend/js/modules/alugueis.js` (7 ocorrências)
- `frontend/js/modules/alugueis_refactored.js` (4 ocorrências)
- `frontend/js/modules/imoveis_refactored.js` (2 ocorrências)
- `frontend/js/modules/relatorios.js` (3 ocorrências)
- `frontend/js/core/grid-component.js` (1 ocorrência - datas)
- `frontend/js/core/mobile-ui-manager.js` (1 ocorrência)

## Exemplo Completo

```javascript
// ❌ ANTIGO (não fazer mais)
const valor = parseFloat(data.receitas_ultimo_mes);
const formatado = valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
});
document.getElementById('receita').textContent = `R$ ${formatado}`;

// ✅ NOVO (fazer assim)
const valor = parseFloat(data.receitas_ultimo_mes);
const formatado = window.localeManager.formatCurrency(valor);
const moeda = window.localeManager.getCurrencyInfo().symbol;
document.getElementById('receita').textContent = `${moeda} ${formatado}`;
```

## Benefícios

✅ **Internacionalização Automática**: Sistema adapta-se ao usuário sem código adicional  
✅ **Manutenção Simplificada**: Um único lugar para gerenciar formatação  
✅ **Melhor UX**: Usuários veem números no formato familiar  
✅ **Código Limpo**: API simples e consistente  
✅ **Testável**: Fácil mockar locale para testes  

## Console de Debug

Ao carregar a página, você verá:

```
🌍 Locale detectado: pt-BR
✅ LocaleManager inicializado: {locale: "pt-BR", decimalSeparator: ",", ...}
```

## Próximos Passos

1. ✅ LocaleManager implementado
2. ✅ Extras.js migrado
3. ⏳ Migrar dashboard.js
4. ⏳ Migrar alugueis.js
5. ⏳ Migrar demais módulos
6. ⏳ Testes com diferentes locales

## Testes Manuais

Para testar diferentes locales:

1. **Chrome/Edge**:
   - Settings → Languages → Add language
   - Mover idioma desejado para o topo
   - Recarregar página

2. **Firefox**:
   - about:config
   - Buscar `intl.accept_languages`
   - Modificar (ex: `en-US,en;q=0.9`)
   - Recarregar página

3. **Programaticamente** (console):
   ```javascript
   // Forçar locale
   Object.defineProperty(navigator, 'language', {
     get: () => 'en-US'
   });
   location.reload();
   ```

---

**Versão**: 1.0  
**Data**: 17 de outubro de 2025  
**Status**: Implementação parcial (Extras concluído)
