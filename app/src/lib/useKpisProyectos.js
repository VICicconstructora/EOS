import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useApp } from '../context/AppContext';

const PROYECTOS_ACTIVOS = ['Well', 'Verde Vivo', 'Azul Celeste', 'Azul Turquesa', 'Mitika'];

const LINEAS_TIR_K = {
  aportesIC: '13.2',
  reintegrosIC: '13.4',
  aportesS: '14.2',
  reintegrosS: '14.4',
};

const LINEAS_TIR_OP = {
  ingresos: '1.0',
  totalCostos: '9.0',
  fco: '10.0',
};

function calcularVPN(flujos, tasa) {
  let vpn = 0;
  for (let t = 0; t < flujos.length; t++) {
    vpn += flujos[t] / Math.pow(1 + tasa, t);
  }
  return vpn;
}

function calcularDerivadaVPN(flujos, tasa) {
  let derivada = 0;
  for (let t = 1; t < flujos.length; t++) {
    derivada -= (t * flujos[t]) / Math.pow(1 + tasa, t + 1);
  }
  return derivada;
}

function calcularTIR(flujos, tasaInicial = 0.1, maxIteraciones = 100, tolerancia = 1e-6) {
  if (!flujos || flujos.length === 0) return null;

  let tasa = tasaInicial;
  let iteracion = 0;

  while (iteracion < maxIteraciones) {
    const vpn = calcularVPN(flujos, tasa);

    if (Math.abs(vpn) < tolerancia) {
      return tasa;
    }

    const derivada = calcularDerivadaVPN(flujos, tasa);

    if (Math.abs(derivada) < 1e-12) {
      return null;
    }

    const tasaNueva = tasa - vpn / derivada;

    if (Math.abs(tasaNueva - tasa) < tolerancia) {
      return tasaNueva;
    }

    tasa = tasaNueva;
    iteracion++;
  }

  return null;
}

export function useKpisProyectos() {
  const { isDemoMode } = useApp();
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadKpis();
  }, [isDemoMode]);

  async function loadKpis() {
    try {
      setLoading(true);
      setError(null);

      if (isDemoMode) {
        const kpisMock = generarKpisMock();
        setKpis(kpisMock);
        setLoading(false);
        return;
      }

      if (!supabase) {
        setKpis(generarKpisMock());
        setLoading(false);
        return;
      }

      const resultados = [];

      for (const proyecto of PROYECTOS_ACTIVOS) {
        const kpisProyecto = await calcularKpisProyecto(proyecto);
        resultados.push(...kpisProyecto);
      }

      setKpis(resultados);
    } catch (err) {
      console.error('Error cargando KPIs:', err);
      setError(err.message);
      setKpis(generarKpisMock());
    } finally {
      setLoading(false);
    }
  }

  async function calcularKpisProyecto(proyecto) {
    const { data, error } = await supabase
      .from('historico')
      .select('proyecto, fecha_datos, pg, valor, fecha')
      .eq('proyecto', proyecto)
      .order('fecha_datos', { ascending: true });

    if (error) {
      console.error(`Error cargando datos para ${proyecto}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const grupoPorFecha = {};
    data.forEach(row => {
      const clave = row.fecha_datos;
      if (!grupoPorFecha[clave]) {
        grupoPorFecha[clave] = [];
      }
      grupoPorFecha[clave].push(row);
    });

    const resultados = [];

    for (const [fechaDatos, registros] of Object.entries(grupoPorFecha)) {
      const flujosK = construirFlujosK(registros);
      const tiirK = calcularTIR(flujosK);

      const flujosOp = construirFlujosOperativos(registros);
      const tirOp = calcularTIR(flujosOp);

      if (tiirK !== null || tirOp !== null) {
        resultados.push({
          proyecto,
          fechaCalculo: new Date(fechaDatos),
          tir_k: tiirK ? (tiirK * 100).toFixed(2) : null,
          tir_operativa: tirOp ? (tirOp * 100).toFixed(2) : null,
          estado: 'calculado',
        });
      }
    }

    return resultados;
  }

  function construirFlujosK(registros) {
    const flujosPorMes = {};

    registros.forEach(row => {
      const mes = row.fecha ? new Date(row.fecha).toISOString().substring(0, 7) : null;
      if (!mes) return;

      if (!flujosPorMes[mes]) {
        flujosPorMes[mes] = {
          aportesIC: 0,
          reintegrosIC: 0,
          aportesS: 0,
          reintegrosS: 0,
        };
      }

      const pg = row.pg ? row.pg.toString().trim() : '';

      if (pg === LINEAS_TIR_K.aportesIC) {
        flujosPorMes[mes].aportesIC += row.valor || 0;
      } else if (pg === LINEAS_TIR_K.reintegrosIC) {
        flujosPorMes[mes].reintegrosIC += row.valor || 0;
      } else if (pg === LINEAS_TIR_K.aportesS) {
        flujosPorMes[mes].aportesS += row.valor || 0;
      } else if (pg === LINEAS_TIR_K.reintegrosS) {
        flujosPorMes[mes].reintegrosS += row.valor || 0;
      }
    });

    const meses = Object.keys(flujosPorMes).sort();
    const flujos = meses.map(mes => {
      const f = flujosPorMes[mes];
      return f.reintegrosIC + f.reintegrosS - f.aportesIC - f.aportesS;
    });

    return flujos.length > 0 ? flujos : null;
  }

  function construirFlujosOperativos(registros) {
    const flujosPorMes = {};

    registros.forEach(row => {
      const mes = row.fecha ? new Date(row.fecha).toISOString().substring(0, 7) : null;
      if (!mes) return;

      if (!flujosPorMes[mes]) {
        flujosPorMes[mes] = {
          ingresos: 0,
          totalCostos: 0,
        };
      }

      const pg = row.pg ? row.pg.toString().trim() : '';

      if (pg === LINEAS_TIR_OP.ingresos) {
        flujosPorMes[mes].ingresos += row.valor || 0;
      } else if (pg === LINEAS_TIR_OP.totalCostos) {
        flujosPorMes[mes].totalCostos += row.valor || 0;
      }
    });

    const meses = Object.keys(flujosPorMes).sort();
    const flujos = meses.map(mes => {
      const f = flujosPorMes[mes];
      return f.ingresos - f.totalCostos;
    });

    return flujos.length > 0 ? flujos : null;
  }

  function generarKpisMock() {
    const meses = [
      '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01',
      '2025-05-01', '2025-06-01', '2025-07-01', '2025-08-01',
      '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01',
      '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
    ];

    const kpisMock = [];

    PROYECTOS_ACTIVOS.forEach(proyecto => {
      meses.forEach(mes => {
        const baseTirK = 12 + Math.random() * 8;
        const baseTirOp = 8 + Math.random() * 15;

        kpisMock.push({
          proyecto,
          fechaCalculo: new Date(mes),
          tir_k: (baseTirK + (Math.random() - 0.5) * 2).toFixed(2),
          tir_operativa: (baseTirOp + (Math.random() - 0.5) * 3).toFixed(2),
          estado: 'demo',
        });
      });
    });

    return kpisMock;
  }

  return {
    kpis,
    loading,
    error,
    refetch: loadKpis,
  };
}
