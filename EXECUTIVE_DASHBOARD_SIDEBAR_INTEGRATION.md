# Integración con Sidebar — Dashboard Ejecutivo

## Objetivo

Agregar "Dashboard Ejecutivo" en el menú lateral de navegación para acceso rápido desde cualquier página.

## Ubicación del Sidebar

Archivo: `app/src/components/layout/Sidebar.jsx`

## Cambio Recomendado

Busca la sección donde se definen los items del menú y agrega el dashboard ejecutivo:

```jsx
// En Sidebar.jsx, alrededor de los otros items de menú:

{isAdmin && (
  <SidebarItem
    icon={BarChart3}  // o cualquier icono que prefieras
    label="Dashboard Ejecutivo"
    path="/executive"
    description="Estado general operativo"
  />
)}

// O si deseas que sea visible para todos (no solo admin):

<SidebarItem
  icon={LineChart}  // lucide-react: LineChart, TrendingUp, Activity, etc.
  label="Dashboard Ejecutivo"
  path="/executive"
  description="Scorecard, flujo caja, nuevos negocios"
/>
```

## Iconos Sugeridos (lucide-react)

```javascript
import { 
  BarChart3,      // Gráficos genéricos
  LineChart,      // Líneas para tendencias
  TrendingUp,     // Tendencia al alza
  Activity,       // Actividad general
  Zap,           // Energía/acción rápida
  Target,        // Objetivos (nuestra meta de 3 negocios)
  PieChart,      // Composición de datos
} from 'lucide-react'
```

## Orden Recomendado en Menú

**Opción 1: Ejecutivo primero (para CEO)**
```
Dashboard
Dashboard Ejecutivo  ← NUEVA
Visión
Personas
Datos
...
```

**Opción 2: Bajo Datos (agrupado con KPIs)**
```
Dashboard
Visión
Personas
Datos
  └─ Dashboard Ejecutivo  ← NUEVA
  └─ KPIs
...
```

**Opción 3: Sección separada "Control"**
```
Dashboard
Visión
─────────────────
Control Operativo
  └─ Dashboard Ejecutivo
  └─ KPIs
─────────────────
Personas
...
```

## Ejemplo de Implementación Completa

```jsx
// En Sidebar.jsx

import {
  Home,
  Eye,
  Users,
  BarChart3,
  LineChart,  // NEW para dashboard ejecutivo
  AlertTriangle,
  Settings2,
  Rocket,
  Calendar,
  Book,
  // ... otros
} from 'lucide-react'

// Dentro del componente Sidebar:

{/* Menú Principal */}
<nav style={{ ... }}>
  <SidebarItem
    icon={Home}
    label="Dashboard"
    path="/"
    isActive={location.pathname === '/'}
  />

  {/* NUEVO: Dashboard Ejecutivo (visible para admin y CEO) */}
  {(isAdmin || userRole === 'ceo') && (
    <SidebarItem
      icon={LineChart}
      label="Dashboard Ejecutivo"
      path="/executive"
      isActive={location.pathname === '/executive'}
      description="Scorecard, flujo de caja, negocios"
      badgeColor="var(--status-success)"
      badge="CEO"
    />
  )}

  <SidebarItem
    icon={Eye}
    label="Visión"
    path="/vision"
    isActive={location.pathname === '/vision'}
  />

  <SidebarItem
    icon={Users}
    label="Personas"
    path="/personas"
    isActive={location.pathname === '/personas'}
  />

  <SidebarItem
    icon={BarChart3}
    label="Datos"
    path="/datos"
    isActive={location.pathname === '/datos'}
  />

  {/* ... resto del menú ... */}
</nav>
```

## Con Badge Indicador

Si quieres agregar un badge visual (ej: rojo si hay alertas):

```jsx
{/* Dashboard Ejecutivo con badge de status */}
{(isAdmin || userRole === 'ceo') && (
  <SidebarItem
    icon={LineChart}
    label="Dashboard Ejecutivo"
    path="/executive"
    isActive={location.pathname === '/executive'}
    badge={hasAlerts ? '!' : null}
    badgeColor={hasAlerts ? 'var(--status-error)' : 'var(--status-success)'}
  />
)}
```

## Acceso Directo desde Top Header

**Alternativa:** Si prefieres un botón flotante o en el header:

```jsx
// En TopHeader.jsx, agregar link/botón:

<button
  onClick={() => navigate('/executive')}
  title="Dashboard Ejecutivo"
  style={{
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
  }}
>
  <LineChart size={20} />
</button>
```

## Configuración de Permisos

### Opción A: Solo CEO

```jsx
import { isAdmin } from '../lib/permissions'

{isAdmin && (
  <SidebarItem
    icon={LineChart}
    label="Dashboard Ejecutivo"
    path="/executive"
  />
)}
```

### Opción B: CEO + Gerentes de Área

```jsx
const userCanAccessExecutiveDashboard = (profile) => {
  const adminRoles = ['admin', 'ceo']
  const managerRoles = ['gerente_ventas', 'gerente_construccion', 'gerente_financiero']
  return adminRoles.includes(profile?.role) || managerRoles.includes(profile?.area)
}

{userCanAccessExecutiveDashboard(profile) && (
  <SidebarItem ... />
)}
```

### Opción C: Todos

```jsx
<SidebarItem
  icon={LineChart}
  label="Dashboard Ejecutivo"
  path="/executive"
/>
```

## Testing

Después de agregar el item al sidebar:

1. ✅ Verificar que el link aparece en el menú
2. ✅ Click → navega a `/executive` sin errores
3. ✅ Highlight "activo" cuando estés en `/executive`
4. ✅ Verificar permisos (si es restringido, que solo ciertos usuarios lo vean)
5. ✅ Mobile: que el item sea accesible en menu móvil

## Alternativa: Quick Link en Dashboard Principal

Si quieres hacerlo descubierto sin cambiar sidebar:

```jsx
// En DashboardPage.jsx, agregar tarjeta/botón:

<Link
  to="/executive"
  style={{
    padding: 'var(--space-6)',
    background: 'linear-gradient(135deg, var(--eos-vision), var(--eos-traction))',
    borderRadius: 'var(--radius-lg)',
    color: '#fff',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    fontWeight: 600,
  }}
>
  <LineChart size={24} />
  <div>
    <div>Dashboard Ejecutivo</div>
    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Estado operativo general</div>
  </div>
</Link>
```

---

**Conclusión:** El dashboard está 100% funcional. Solo falta agregarlo al menú lateral para hacerlo fácilmente accesible. Recomendamos Opción 1 (después de Dashboard principal) con permiso solo para admin/CEO.
