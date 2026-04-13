# New Analytics Chart

Crea un nuevo componente de gráfico en `src/components/analytics/` (créala si no existe) usando recharts + el patrón de AppContext.

## Template

```jsx
import { useEffect, useState, useMemo } from 'react';
import { ResponsiveContainer /*, ... recharts components */ } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { /* Icon */ } from 'lucide-react';

export default function MyNewChart() {
    const { t } = useTranslation();
    const { isDemoMode } = useApp();
    const [loading, setLoading] = useState(true);
    const [rawData, setRawData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        if (isDemoMode) {
            // Provide demo/mock data here
            setRawData([]);
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('TABLA')
            .select('*')
            .eq('company_id', 'ic-constructora');
        if (!error && data) setRawData(data);
        setLoading(false);
    };

    const chartData = useMemo(() => {
        // transform rawData into recharts-ready array
        return rawData.map(item => ({
            name: item.someField,
            value: item.anotherField,
        }));
    }, [rawData]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    </* Icon */ className="w-5 h-5 text-blue-500" />
                    Título del gráfico
                </h3>
            </div>

            {/* Chart body */}
            <div className="h-[380px]">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-gray-400 text-sm">No hay datos disponibles</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {/* recharts chart aquí */}
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
```

## Patrones clave de Traccion

| Concepto | Valor |
|----------|-------|
| Hook de contexto | `useApp()` de `../../context/AppContext` |
| Supabase | `supabase` de `../../lib/supabase` |
| Traducciones | `useTranslation()` de react-i18next |
| company_id fija | `'ic-constructora'` |
| Demo mode | Verificar `isDemoMode` y retornar datos mock |

## Modo demo
Siempre manejar `isDemoMode === true`. Proveer datos mock representativos para que la UI funcione sin Supabase.

## Después de crear el gráfico
Importarlo y agregarlo a la página de datos/analytics correspondiente.
