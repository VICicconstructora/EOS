# Testing Checklist — Executive Dashboard

## Antes de Iniciar Testing

```bash
cd app
npm install  # Si es necesario
npm run dev  # Inicia servidor
```

Abre navegador a: `http://localhost:5173/executive`

---

## 1. Carga Inicial

- [ ] Página carga sin errores en console
- [ ] Spinner de carga aparece brevemente (1-2 seg)
- [ ] No hay errores de "404 not found"
- [ ] Styling se aplicó correctamente (fondo oscuro, colores IC)

---

## 2. Sección: Scorecard (3 Métricas)

### Visuales
- [ ] 3 tarjetas visibles lado a lado (desktop)
- [ ] Tarjetas apiladas verticalmente (mobile)
- [ ] Cada tarjeta tiene:
  - [ ] Título (Ventas YTD / Prog. Obra / Saldo Caja)
  - [ ] Owner bajo el título (Juan Paulo / Andrés / Juan José)
  - [ ] Ícono en esquina superior derecha
  - [ ] Valor grande y legible
  - [ ] Unidad (MM$ o %)
  - [ ] Barra de progreso colorida
  - [ ] % cumplimiento
  - [ ] Semáforo (círculo con color: 🟢 verde / 🟡 amarillo / 🔴 rojo)

### Interactividad
- [ ] Hover tarjeta: borde cambio de color, sombra aparece
- [ ] Valores se ven correctos (ej: Ventas YTD ~500MM$)
- [ ] Barras progreso se llenan hasta % correcto

---

## 3. Sección: Histórico Flujo de Caja

### Visuales
- [ ] Tabla renderiza correctamente
- [ ] Header con título "Histórico Flujo de Caja — Películas Mensuales"
- [ ] Columna izquierda "Proyecto" fija durante scroll
- [ ] Columnas dinámicas con meses (May 2026, Abr 2026, Mar 2026)
- [ ] 8 filas de proyectos (Bosque Central, Gaia, etc.)
- [ ] Valores en MM$ (ej: 45.5, -12.3)

### Colores
- [ ] Valores positivos: color verde (--status-success)
- [ ] Valores negativos: color rojo (--status-error)
- [ ] Texto en italics para "proyectado"
- [ ] Hover fila: fondo se ilumina

### Interactividad
- [ ] Scroll horizontal funciona (mobile/tablet)
- [ ] Header se queda visible durante scroll
- [ ] Columna Proyecto se queda fija

### Leyenda
- [ ] Leyenda visible al pie de tabla:
  - [ ] "Positivo (rojo = negativo)"
  - [ ] "Cursiva = Proyectado"

---

## 4. Sección: 3 Nuevos Negocios

### Visuales
- [ ] Grid con 3 tarjetas (o menos si no hay datos)
- [ ] Cada tarjeta tiene:
  - [ ] Nombre del proyecto (ej: "Proyecto Nueva Esperanza")
  - [ ] Status badge (verde "En marcha", amarillo "En riesgo", rojo "Crítico")
  - [ ] Owner name (Mónica Báez)
  - [ ] Valor grande "Promesa" en MM$
  - [ ] Valor grande "Escritura" en MM$ (verde)
  - [ ] Botón "Últimos 3 meses"

### Interactividad
- [ ] Hover tarjeta: borde colorea según status, sombra aparece
- [ ] Click "Últimos 3 meses":
  - [ ] Botón Chevron rota 180°
  - [ ] Tabla histórica aparece dentro de tarjeta
  - [ ] Tabla muestra 3 filas: Mes | Promesa | Escritura
  - [ ] Click nuevamente: colapsa tabla

### Responsividad
- [ ] Desktop: 3 columnas lado a lado
- [ ] Tablet: 2 columnas
- [ ] Mobile: 1 columna (tarjeta apilada)

---

## 5. Sección: Control Obra + Cartera

### Visuales
- [ ] Data grid con columnas:
  - [ ] Proyecto (sticky left, icono chevron)
  - [ ] Cartera Pre (números alineados derecha)
  - [ ] Cartera Post (números alineados derecha)
  - [ ] Prog. Obra % (números alineados derecha)
  - [ ] Status (badge coloreado)

### Ordenamiento
- [ ] **Primeras filas:** Status rojo 🔴 (La Hacienda, Primera Este)
- [ ] **Medio:** Status amarillo 🟡 (Gaia, Castilla Imperial, Castilla Living)
- [ ] **Último:** Status verde 🟢 (Bosque Central, Praia Natura, Reserva De Oporto)

### Interactividad
- [ ] Click fila: Chevron rota, fila expandida
- [ ] Expandido: tabla con 3 capítulos (Estructura, Acabados, Instalaciones)
  - [ ] Capitulo | Presupuesto | Real | % Prog
- [ ] Click fila nuevamente: Colapsa

### Hover
- [ ] Fila rojo (danger): fondo rojo tenue
- [ ] Hover cualquier fila: fondo se ilumina más

---

## 6. Sección: Filtros

### Visuales
- [ ] Barra de filtros:
  - [ ] Ícono calendario
  - [ ] Selector "Período" (YTD, Q2 2026, Este mes, Mes anterior)
  - [ ] Selector "Proyecto" (Todos, + 8 proyectos)
  - [ ] Botón "Actualizar" con ícono refresh
  - [ ] Texto "Auto-refresh cada 4h"

### Interactividad
- [ ] Cambiar período: No causa error (nota: sin refresh de datos)
- [ ] Cambiar proyecto: No causa error
- [ ] Click botón "Actualizar":
  - [ ] Spinner gira 1.5s
  - [ ] Botón muestra "Actualizando..."
  - [ ] Tiempo en footer se actualiza

---

## 7. General

### Loading States
- [ ] En carga inicial: spinner visible
- [ ] En error: mensaje rojo "Error al cargar"
- [ ] Sin datos: "Sin datos disponibles"

### Error Handling
- [ ] Si un componente falla: otros se muestran igual
- [ ] Mensajes de error legibles (no stack traces)

### Info Footer
- [ ] Al pie: "Última actualización: [HH:MM:SS]"
- [ ] Al pie derecha: "IC Constructora — Sistema EOS Tracción"

### Navegación
- [ ] URL es `/executive`
- [ ] Botón back funciona correctamente
- [ ] Puedes navegar a otras páginas sin problemas

---

## 8. Responsiveness

### Desktop (1920px)
- [ ] Scorecard: 3 columnas
- [ ] Nuevos Negocios: 3 columnas
- [ ] Tablas: scroll horizontal solo si es necesario

### Tablet (768px)
- [ ] Scorecard: 2 columnas
- [ ] Nuevos Negocios: 2 columnas
- [ ] Filtros: wrappean correctamente

### Mobile (375px)
- [ ] Scorecard: 1 columna
- [ ] Nuevos Negocios: 1 columna
- [ ] Tablas: scroll horizontal funciona
- [ ] Botones: clickeables (no muy pequeños)
- [ ] Header sticky: visible

---

## 9. Performance

### Tiempo de Carga
- [ ] Página carga en < 3 segundos (con demo data)
- [ ] Expansiones (histórico, tabla capítulos): < 200ms

### Interactividad
- [ ] Clics son responsivos (sin lag)
- [ ] Hover effects suave (sin stutter)
- [ ] Scroll suave (sin jank)

### Browser Console
- [ ] Sin errores (solo warnings si los hay)
- [ ] Sin Network errors (404, 500, etc.)
- [ ] Sin warnings sobre "Unmanaged state"

---

## 10. Demo Mode

- [ ] Sin configurar `.env`: funciona en demo mode
- [ ] Banner azul aparece: "Modo Demo: datos ficticios..."
- [ ] Datos visibles y correctos
- [ ] Todas las secciones tienen valores mock

---

## 11. Validación Visual Final

### Colores Esperados
- [ ] Fondo principal: oscuro (#0A0C10)
- [ ] Cards/Surfaces: gris oscuro (#111318)
- [ ] Bordes: muy sutiles (rgba gris)
- [ ] Texto primario: blanco/muy claro
- [ ] Textos secundarios: gris
- [ ] Semáforos: 🟢 verde, 🟡 naranja, 🔴 rojo (IC brand colors)

### Tipografía
- [ ] Títulos: Outfit (font-display), bold
- [ ] Cuerpo: Inter (font-sans), regular
- [ ] Valores grandes: 1.5rem+, bold, font-display

### Espaciado
- [ ] Gap entre componentes: consistente
- [ ] Padding dentro de cards: uniforme
- [ ] Márgenes: respetan ritmo de espaciado

---

## 12. Casos Edge

- [ ] Varias expandiciones abiertas simultáneamente: funcionan
- [ ] Cambiar filtro mientras hay histórico expandido: no rompe UI
- [ ] Refresh mientras tabla expandida: cierra / se mantiene
- [ ] Valores muy grandes (ej: 9999MM$): se muestran correctamente
- [ ] Valores muy pequeños (ej: 0.1MM$): se muestran con decimales

---

## 13. Checklist Final (Antes de Deploy)

- [ ] Cero errores en console
- [ ] Ruta `/executive` accesible
- [ ] Responsive en 3 breakpoints
- [ ] Demo mode funciona
- [ ] Componentes cargados correctamente
- [ ] Datos mock visibles
- [ ] Interactividad fluida
- [ ] Textos legibles
- [ ] Colores consistentes con IC brand

---

## Resultado Final

- [ ] ✅ **Aprobado para Testing Interno**
- [ ] ✅ **Listo para integración Supabase IC**
- [ ] ✅ **Listo para mostrar al CEO**

---

## Notas Adicionales

Si encuentras un bug:
1. Documenta qué hiciste
2. Anota el error (console screenshot)
3. Nota el navegador y versión
4. Comparte en issue/bug report

Si algo está "roto":
- Revisa la consola del navegador (F12 → Console)
- Verifica que App.jsx tiene la ruta `/executive`
- Recarga la página (Ctrl+Shift+R para cache clear)

---

**Testing completado:** ___/___/2026  
**Responsable:** _________________  
**Resultado:** ✅ APROBADO / ⚠️ COMENTARIOS / ❌ BLOQUEANTES
