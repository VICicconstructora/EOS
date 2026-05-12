// Descarga un array de objetos como CSV con BOM UTF-8 (Excel lo abre correctamente)
export function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const v = r[h] ?? ''
        return `"${String(v).replace(/"/g, '""')}"`
      }).join(',')
    ),
  ]
  const bom = '﻿'
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
