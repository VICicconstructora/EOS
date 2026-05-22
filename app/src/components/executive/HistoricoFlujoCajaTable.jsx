// src/components/executive/HistoricoFlujoCajaTable.jsx
// Tabla horizontal scrolleable: películas (meses) × proyectos
// Celdas con valores de flujo de caja (rojo negativo, verde positivo)

export function HistoricoFlujoCajaTable({ data, movies, projects, loading, error }) {
  if (loading) {
    return (
      <section style={{ marginTop: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
          Histórico Flujo de Caja
        </h2>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando datos...
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section style={{ marginTop: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
          Histórico Flujo de Caja
        </h2>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--status-error)' }}>
          Error al cargar datos: {error.message}
        </div>
      </section>
    )
  }

  if (!data || data.length === 0) {
    return (
      <section style={{ marginTop: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
          Histórico Flujo de Caja
        </h2>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          Sin datos disponibles
        </div>
      </section>
    )
  }

  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
        Histórico Flujo de Caja — Películas Mensuales
      </h2>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {/* Tabla scrolleable horizontalmente */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    minWidth: 140,
                    position: 'sticky',
                    left: 0,
                    background: 'var(--bg-elevated)',
                    zIndex: 10,
                  }}
                >
                  Proyecto
                </th>
                {movies.map((movie) => (
                  <th
                    key={movie.key}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      minWidth: 100,
                      borderLeft: '1px solid var(--border-subtle)',
                    }}
                  >
                    {movie.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.proyecto}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background var(--duration-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                  }}
                >
                  <td
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      minWidth: 140,
                      position: 'sticky',
                      left: 0,
                      background: 'inherit',
                      zIndex: 9,
                    }}
                  >
                    {row.proyecto}
                  </td>
                  {movies.map((movie) => {
                    const celda = row.valores[movie.key] || { valor: 0, tipo: 'historico' }
                    const esProyectado = celda.tipo === 'proyectado'
                    const valor = celda.valor
                    const isNegative = valor < 0
                    const color = isNegative ? 'var(--status-error)' : 'var(--status-success)'

                    return (
                      <td
                        key={`${row.proyecto}-${movie.key}`}
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'right',
                          color,
                          fontWeight: 500,
                          fontStyle: esProyectado ? 'italic' : 'normal',
                          opacity: esProyectado ? 0.7 : 1,
                          borderLeft: '1px solid var(--border-subtle)',
                        }}
                        title={`${row.proyecto} - ${movie.label}${esProyectado ? ' (Proyectado)' : ''}`}
                      >
                        {valor > 0 ? '+' : ''}{Math.round(valor * 10) / 10}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            padding: 'var(--space-4)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-overlay)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--status-success)' }}>●</span>
            <span>Positivo (rojo = negativo)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <em>Cursiva</em>
            <span>= Proyectado</span>
          </div>
        </div>
      </div>
    </section>
  )
}
