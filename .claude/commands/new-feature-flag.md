# New Feature Flag

Agrega una nueva feature flag opcional a la app, controlable desde la configuración.

Sigue estos 4 pasos **en orden**.

---

## Paso 1 — Migración SQL

Crea `supabase/migrations/YYYYMMDDHHMMSS_add_FLAGNAME_flag.sql`:

```sql
-- Agrega flag enable_X a la tabla correspondiente (companies, vto, o settings)
-- Default TRUE para backward compatibility.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS enable_X boolean DEFAULT true;
```

> Si no existe tabla `companies`, evalúa si agregar la flag a `vto` o crear una tabla `settings`.

---

## Paso 2 — Exponer desde `AppContext`

En `src/context/AppContext.jsx`:

**a)** Añade state y carga del flag:
```jsx
const [isXEnabled, setIsXEnabled] = useState(true);

// En loadVTO() o en una función loadSettings():
const { data } = await supabase
    .from('companies')
    .select('enable_X')
    .eq('id', 'ic-constructora')
    .single();
if (data) setIsXEnabled(data.enable_X !== false);
```

**b)** Incluye en el `value` del Provider:
```jsx
const value = {
    // ... existing values
    isXEnabled,
};
```

**c)** Para demo mode, definir un valor por defecto sensato en `DEMO_*` o inline.

---

## Paso 3 — Toggle en Configuración

En el componente de configuración (`src/components/configuracion/` o similar):

```jsx
const { isXEnabled } = useApp();

const handleToggleX = async (newValue) => {
    if (isDemoMode) {
        // Solo actualizar estado local en demo
        return;
    }
    const { error } = await supabase
        .from('companies')
        .update({ enable_X: newValue })
        .eq('id', 'ic-constructora');
    if (!error) {
        // Recargar configuración
    }
};

// JSX toggle:
<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
    <div>
        <p className="text-sm text-gray-700">Nombre visible</p>
        <p className="text-xs text-gray-400">Descripción corta de qué activa/desactiva</p>
    </div>
    <button
        type="button"
        onClick={() => handleToggleX(!isXEnabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${isXEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
        role="switch"
        aria-checked={!!isXEnabled}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isXEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
</div>
```

---

## Paso 4 — Condicionar la UI

```jsx
const { isXEnabled } = useApp();

// En JSX:
{isXEnabled && <ComponenteOpcional />}
```

---

## Flags existentes (para referencia)

| Flag DB | Hook en AppContext | Descripción |
|---------|-------------------|-------------|
| _(ninguna aún)_ | — | — |

> Actualizar esta tabla cada vez que se agregue un nuevo flag.
