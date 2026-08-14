import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { Receta, Ingrediente, ConfiguracionCostos } from '../../services/db';
import { CustomSelect } from '../CustomSelect';

interface PlanificadorTabProps {
  recetas: Receta[];
  ingredientes: Ingrediente[];
  config: ConfiguracionCostos;
}

interface FilaIngredientePlanificado {
  id: string;
  nombre: string;
  cantidadReceta: number;
  unidadReceta: string;
  cantidadCompra: number;
  unidadCompra: string;
  esRecetaAnidada: boolean;
}

export const PlanificadorTab: React.FC<PlanificadorTabProps> = ({ recetas, ingredientes, config }) => {
  const [selectedRecetaId, setSelectedRecetaId] = useState<string>('');
  const [cantidadObjetivo, setCantidadObjetivo] = useState<number | string>('1');
  const [desglosarSubRecetas, setDesglosarSubRecetas] = useState<boolean>(true);
  const [ventas, setVentas] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'planificador' | 'matriz_bcg'>('planificador');

  useEffect(() => {
    db.getVentas().then(setVentas);
  }, []);

  // --- CÁLCULOS MATEMÁTICOS DE COSTEO SÍNCRONOS ---
  const getCostoIngredienteSync = (ing: Ingrediente, qty: number) => {
    const costoAP = ing.precioActivo || 0;
    return costoAP * qty;
  };

  const getCostoRecetaSync = (recetaId: string, visited = new Set<string>()): number => {
    if (visited.has(recetaId)) return 0;
    visited.add(recetaId);

    const rec = recetas.find(r => r.id === recetaId);
    if (!rec) return 0;

    let total = 0;
    rec.ingredientes.forEach(item => {
      if (item.esRecetaAnidada) {
        const subCost = getCostoRecetaSync(item.ingredienteId, new Set(visited));
        const sub = recetas.find(r => r.id === item.ingredienteId);
        if (sub) {
          const costPerUnit = subCost / sub.cantidadRendimiento;
          total += costPerUnit * item.cantidadRequerida;
        }
      } else {
        const ing = ingredientes.find(i => i.id === item.ingredienteId);
        if (ing) {
          total += getCostoIngredienteSync(ing, item.cantidadRequerida);
        }
      }
    });
    return total;
  };

  // --- ALGORITMO DE EXPLOSIÓN RECURSIVA ---
  const calcularExplosion = (): FilaIngredientePlanificado[] => {
    if (!selectedRecetaId || Number(cantidadObjetivo) <= 0) return [];

    const result: { [id: string]: { cantidad: number; esReceta: boolean } } = {};

    const explode = (recId: string, qty: number, visited = new Set<string>()) => {
      if (visited.has(recId)) return;
      visited.add(recId);

      const rec = recetas.find(r => r.id === recId);
      if (!rec) return;

      const scaleFactor = qty / rec.cantidadRendimiento;

      rec.ingredientes.forEach(item => {
        const qtyNeeded = item.cantidadRequerida * scaleFactor;
        if (item.esRecetaAnidada && desglosarSubRecetas) {
          explode(item.ingredienteId, qtyNeeded, new Set(visited));
        } else {
          const key = item.ingredienteId;
          if (!result[key]) {
            result[key] = { cantidad: 0, esReceta: item.esRecetaAnidada };
          }
          result[key].cantidad += qtyNeeded;
        }
      });
    };

    explode(selectedRecetaId, Number(cantidadObjetivo));

    // Mapear resultado a filas detalladas
    return Object.keys(result).map(key => {
      const { cantidad, esReceta } = result[key];
      if (esReceta) {
        const sub = recetas.find(r => r.id === key);
        return {
          id: key,
          nombre: sub ? `${sub.nombre} (Sub-receta)` : 'Sub-receta Desconocida',
          cantidadReceta: cantidad,
          unidadReceta: sub ? sub.unidadRendimiento : 'lote',
          cantidadCompra: cantidad, // Las subrecetas internas no tienen conversión de empaque de compra
          unidadCompra: sub ? sub.unidadRendimiento : 'lote',
          esRecetaAnidada: true
        };
      } else {
        const ing = ingredientes.find(i => i.id === key);
        let qtyCompra = cantidad;
        let unitCompra = ing ? ing.unidadReceta : '';
        if (ing) {
          if (ing.unidadReceta === 'g') {
            qtyCompra = cantidad / 1000;
            unitCompra = 'kg';
          } else if (ing.unidadReceta === 'ml') {
            qtyCompra = cantidad / 1000;
            unitCompra = 'litro';
          }
        }
        return {
          id: key,
          nombre: ing ? ing.nombre : 'Insumo Desconocido',
          cantidadReceta: cantidad,
          unidadReceta: ing ? ing.unidadReceta : '',
          cantidadCompra: qtyCompra,
          unidadCompra: unitCompra,
          esRecetaAnidada: false
        };
      }
    });
  };

  const selectedReceta = recetas.find(r => r.id === selectedRecetaId);
  const ingredientesPlanificados = calcularExplosion();

  // Calcular Costo Total del Lote Proyectado
  const costoTotalLoteProyectado = (() => {
    if (!selectedReceta) return 0;
    const costoBaseUnitario = getCostoRecetaSync(selectedReceta.id) / selectedReceta.cantidadRendimiento;
    return costoBaseUnitario * Number(cantidadObjetivo || 0);
  })();

  const rawCostWithCond = costoTotalLoteProyectado * (1 + config.factorCondimentoGlobal / 100);
  const costPortionMateriaPrima = Number(cantidadObjetivo) > 0 ? rawCostWithCond / Number(cantidadObjetivo) : 0;
  const totalCostosFijos = config.alquiler + config.serviciosPublicos + config.nominaAdministrativa + config.otrosGastos;
  const costCIFPerPlate = totalCostosFijos / config.platosProyectadosMensuales;
  const costTotalPortion = costPortionMateriaPrima + costCIFPerPlate;
  const priceNetPortion = costTotalPortion / (config.margenAlimentosObjetivo / 100);
  const priceGrossPortion = priceNetPortion * (1 + config.porcentajeImpuestos / 100);

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { key: 'planificador' as const, label: 'Planificador de Compras' },
    { key: 'matriz_bcg' as const, label: 'Ingeniería de Menú (Matriz BCG)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="no-print">
      {/* Tabs internas */}
      <div
        className="tab-navigation"
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '8px',
          paddingBottom: '0',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'planificador' && (
        <div className="mixo-card" style={{ padding: '24px', width: '100%' }}>
        <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h2>Planificador de Compras e Insumos</h2>
          {selectedRecetaId && ingredientesPlanificados.length > 0 && (
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handlePrint}
              style={{ minWidth: '120px' }}
            >
              Imprimir Planificación
            </button>
          )}
        </div>

        {/* Inputs de Planificación */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div className="grid-cols-2" style={{ gap: '16px' }}>
            <div className="form-group">
              <label>Receta a Planificar</label>
              <CustomSelect
                options={recetas.map(r => ({
                  value: r.id,
                  label: `${r.nombre} (${r.esSubReceta ? 'Sub-receta' : 'Plato Menú'})`
                }))}
                value={selectedRecetaId}
                onChange={val => {
                  setSelectedRecetaId(val);
                  const rec = recetas.find(r => r.id === val);
                  if (rec) setCantidadObjetivo(rec.cantidadRendimiento);
                }}
                placeholder="-- Seleccionar Receta --"
              />
            </div>

            {selectedReceta && (
              <div className="form-group">
                 <label>Cantidad Objetivo a Preparar</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={cantidadObjetivo}
                    onChange={e => setCantidadObjetivo(e.target.value)}
                    style={{ flexGrow: 1 }}
                    required
                  />
                  <span className="badge neutral" style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', fontSize: '14px', borderRadius: '28px' }}>
                    {selectedReceta.unidadRendimiento}
                  </span>
                </div>
              </div>
            )}
          </div>

          {selectedReceta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <input
                type="checkbox"
                id="desglosarSubRecetas"
                checked={desglosarSubRecetas}
                onChange={e => setDesglosarSubRecetas(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="desglosarSubRecetas" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                Desglosar sub-recetas en cascada (Explosión recursiva de insumos base)
              </label>
            </div>
          )}
        </div>

        {/* Contenido Planificado */}
        {selectedReceta ? (
          Number(cantidadObjetivo) <= 0 ? (
            <div className="flex-center" style={{ padding: '32px', backgroundColor: 'var(--color-bg-base)', borderRadius: '24px', border: '1px solid var(--color-border)' }}>
              <span className="text-secondary" style={{ fontSize: '14px' }}>Por favor ingresa una cantidad objetivo mayor a cero para realizar los cálculos.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Resumen de costos proyectados */}
              <div className="mixo-card" style={{ padding: '16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '12px' }}>
                  Resumen de Costos y Precios Proyectados
                </h3>
                <div className="grid-cols-2" style={{ gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Insumos del Lote:</span>
                      <strong>${costoTotalLoteProyectado.toFixed(2)}</strong>
                    </div>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Insumos Lote (con Condimentos):</span>
                      <strong>${rawCostWithCond.toFixed(2)}</strong>
                    </div>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Costo de Insumos por Porción:</span>
                      <strong>${costPortionMateriaPrima.toFixed(2)} / {selectedReceta.unidadRendimiento === 'porciones' ? 'porción' : selectedReceta.unidadRendimiento}</strong>
                    </div>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Costo Total por Porción (con Gasto Fijo):</span>
                      <strong>${costTotalPortion.toFixed(2)} / {selectedReceta.unidadRendimiento === 'porciones' ? 'porción' : selectedReceta.unidadRendimiento}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Precio Neto Sugerido (Target {config.margenAlimentosObjetivo}%):</span>
                      <strong>${priceNetPortion.toFixed(2)}</strong>
                    </div>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Precio Público Sugerido (IVA {config.porcentajeImpuestos}%):</span>
                      <strong>${priceGrossPortion.toFixed(2)}</strong>
                    </div>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Factor de Escala Aplicado:</span>
                      <span className="badge neutral" style={{ fontSize: '12px', padding: '2px 8px' }}>
                        x{(Number(cantidadObjetivo) / selectedReceta.cantidadRendimiento).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex-row-between" style={{ fontSize: '14px' }}>
                      <span>Rendimiento Estándar Receta:</span>
                      <span>{selectedReceta.cantidadRendimiento} {selectedReceta.unidadRendimiento}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Listado de Insumos Escalados */}
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Requisición y Explosión de Ingredientes</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th className="text-left">Insumo / Ingrediente</th>
                        <th className="text-right">Cantidad Cocina</th>
                        <th className="text-center">Unidad Receta</th>
                        <th className="text-right">Equivalente Bodega</th>
                        <th className="text-center">Unidad Compra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientesPlanificados.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-secondary" style={{ padding: '20px' }}>
                            La receta seleccionada no tiene ingredientes registrados.
                          </td>
                        </tr>
                      ) : (
                        ingredientesPlanificados.map(item => (
                          <tr key={item.id} style={{ height: '48px' }}>
                            <td className="text-left" style={{ fontWeight: 500 }}>
                              {item.nombre}
                            </td>
                            <td className="text-right">
                              {item.cantidadReceta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-center">
                              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                {item.unidadReceta}
                              </span>
                            </td>
                            <td className="text-right">
                              {item.cantidadCompra.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-center">
                              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                {item.unidadCompra}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )
        ) : null}
      </div>
      )}

      {/* VISTA DE IMPRESIÓN EXCLUSIVA */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Inter', sans-serif !important;
            padding: 20px !important;
          }
          .no-print, header, aside, footer, .app-sidebar, .tab-navigation {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
          }
          .mixo-card {
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 20px !important;
          }
          th, td {
            border-bottom: 1px solid #000000 !important;
            padding: 8px 12px !important;
            font-size: 14px !important;
          }
          th {
            font-weight: 500 !important;
            background-color: #f0f0f0 !important;
          }
          .badge {
            border: 1px solid #000000 !important;
            background: transparent !important;
            color: #000000 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
        }
        @media screen {
          .print-area {
            display: none;
          }
        }
      `}</style>

      {/* ÁREA DE IMPRESIÓN */}
      {selectedReceta && (
        <div className="print-area">
          <div style={{ borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Mixo - Planificador de Producción</h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#555555' }}>
              Documento de Trabajo de Cocina / Requisición de Bodega
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '14px' }}>
            <div><strong>Fórmula / Plato:</strong> {selectedReceta.nombre}</div>
            {selectedReceta.codigoIntegracionPOS && <div><strong>SKU:</strong> {selectedReceta.codigoIntegracionPOS}</div>}
            <div><strong>Cantidad Proyectada:</strong> {cantidadObjetivo} {selectedReceta.unidadRendimiento}</div>
            <div><strong>Factor de Escala:</strong> x{(Number(cantidadObjetivo) / selectedReceta.cantidadRendimiento).toFixed(2)}</div>
            <div><strong>Desglose en Cascada:</strong> {desglosarSubRecetas ? 'Sí (Ingredientes Base)' : 'No (Sub-recetas de Bodega)'}</div>
            <div><strong>Fecha de Impresión:</strong> {new Date().toLocaleDateString()}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '2px solid #000000', padding: '8px' }}>Ingrediente</th>
                <th style={{ textAlign: 'right', borderBottom: '2px solid #000000', padding: '8px' }}>Cantidad Cocina</th>
                <th style={{ textAlign: 'center', borderBottom: '2px solid #000000', padding: '8px' }}>Unidad</th>
                <th style={{ textAlign: 'right', borderBottom: '2px solid #000000', padding: '8px' }}>Equivalente Bodega</th>
                <th style={{ textAlign: 'center', borderBottom: '2px solid #000000', padding: '8px' }}>Unidad Compra</th>
              </tr>
            </thead>
            <tbody>
              {ingredientesPlanificados.map(item => (
                <tr key={item.id}>
                  <td style={{ borderBottom: '1px solid #cccccc', padding: '8px', fontWeight: 500 }}>
                    {item.nombre}
                  </td>
                  <td style={{ borderBottom: '1px solid #cccccc', padding: '8px', textAlign: 'right' }}>
                    {item.cantidadReceta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ borderBottom: '1px solid #cccccc', padding: '8px', textAlign: 'center' }}>
                    {item.unidadReceta}
                  </td>
                  <td style={{ borderBottom: '1px solid #cccccc', padding: '8px', textAlign: 'right' }}>
                    {item.cantidadCompra.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ borderBottom: '1px solid #cccccc', padding: '8px', textAlign: 'center' }}>
                    {item.unidadCompra}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Matriz de Ingeniería de Menú (BCG) */}
      {activeTab === 'matriz_bcg' && (() => {
        const finalRecipes = recetas.filter(r => !r.esSubReceta);
        const platesStats = finalRecipes.map(rec => {
          let costoLote = 0;
          const calcCosto = (items: typeof rec.ingredientes): number => {
            let t = 0;
            items.forEach(item => {
              if (item.esRecetaAnidada) {
                const sub = recetas.find(r => r.id === item.ingredienteId);
                if (sub) { const sc = calcCosto(sub.ingredientes); t += (sc / sub.cantidadRendimiento) * item.cantidadRequerida; }
              } else {
                const ing = ingredientes.find(i => i.id === item.ingredienteId);
                if (ing) t += (ing.precioActivo || 0) * item.cantidadRequerida;
              }
            });
            return t;
          };
          costoLote = calcCosto(rec.ingredientes);
          const costoPorcion = rec.cantidadRendimiento > 0 ? costoLote / rec.cantidadRendimiento : 0;
          let totalVolume = 0;
          ventas.forEach(v => v.items?.forEach((it: any) => { if (it.recetaId === rec.id) totalVolume += it.cantidadVendida; }));
          const margin = (rec.precioVentaMenu || 0) - costoPorcion;
          return { rec, totalVolume, margin, costoPorcion };
        });
        const n = platesStats.length;
        const avgVol = n > 0 ? platesStats.reduce((a, c) => a + c.totalVolume, 0) / n : 0;
        const avgMar = n > 0 ? platesStats.reduce((a, c) => a + c.margin, 0) / n : 0;
        const cuadrantes = [
          { key: 'estrella',    label: '⭐ Estrella',           sub: 'Alta venta, alto margen',   color: '#81c784', bg: 'rgba(129,199,132,0.04)', border: 'rgba(129,199,132,0.15)', items: platesStats.filter(p => p.totalVolume >= avgVol && p.margin >= avgMar) },
          { key: 'rompecabeza',label: '🧩 Rompecabezas',       sub: 'Baja venta, alto margen',   color: 'var(--color-accent)', bg: 'rgba(168,199,250,0.04)', border: 'rgba(168,199,250,0.15)', items: platesStats.filter(p => p.totalVolume < avgVol && p.margin >= avgMar) },
          { key: 'caballo',    label: '🐴 Caballo de Batalla', sub: 'Alta venta, bajo margen',   color: '#ffb300', bg: 'rgba(255,179,0,0.04)', border: 'rgba(255,179,0,0.15)', items: platesStats.filter(p => p.totalVolume >= avgVol && p.margin < avgMar) },
          { key: 'perro',      label: '🐶 Perro',              sub: 'Baja venta, bajo margen',   color: '#ef5350', bg: 'rgba(239,83,80,0.04)', border: 'rgba(239,83,80,0.15)', items: platesStats.filter(p => p.totalVolume < avgVol && p.margin < avgMar) },
        ];
        return (
          <div className="mixo-card" style={{ marginTop: '0' }}>
            <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h2>Ingeniería de Menú (Matriz BCG)</h2>
                <span className="text-secondary" style={{ fontSize: '13px' }}>Clasificación estratégica de platos por popularidad vs. rentabilidad.</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>Vol. medio: <strong>{avgVol.toFixed(1)} porc.</strong></span>
                <span>Margen medio: <strong>${avgMar.toFixed(2)}</strong></span>
              </div>
            </div>
            {ventas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-secondary)' }}>
                Registra ventas en la sección de Administración para activar esta matriz.
              </div>
            ) : (
              <div className="grid-cols-2" style={{ gap: '16px' }}>
                {cuadrantes.map(q => (
                  <div key={q.key} className="mixo-card" style={{ backgroundColor: q.bg, border: `1px solid ${q.border}`, padding: '16px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: q.color, fontSize: '14px' }}>{q.label}</strong>
                      <div className="text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>{q.sub}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {q.items.length === 0 ? (
                        <span className="text-secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>Sin platos en este cuadrante.</span>
                      ) : q.items.map(p => (
                        <div key={p.rec.id} className="flex-row-between" style={{ fontSize: '13px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                          <span><strong>{p.rec.nombre}</strong></span>
                          <span className="text-secondary" style={{ fontSize: '12px' }}>{p.totalVolume} porc. / +${p.margin.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
