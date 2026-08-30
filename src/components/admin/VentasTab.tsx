import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { ConfirmModal } from '../ConfirmModal';
import type { Receta } from '../../services/db';
import { useToast } from '../../hooks/useToast';

interface VentasTabProps {
  onRefresh?: () => void;
}

export const VentasTab: React.FC<VentasTabProps> = ({ onRefresh }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<'registro' | 'precios' | 'analisis_menu'>('registro');
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [recetaCostos, setRecetaCostos] = useState<{ [id: string]: number }>({});
  const [tempPrices, setTempPrices] = useState<{ [id: string]: string }>({});
  const [ventaRegistroSearch, setVentaRegistroSearch] = useState('');
  const [ventaFechaInicio, setVentaFechaInicio] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [ventaFechaFin, setVentaFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [ventaItems, setVentaItems] = useState<{ recetaId: string; cantidad: string | number; precioMenu: string | number }[]>([]);
  const [activeVentaRowActions, setActiveVentaRowActions] = useState<string | null>(null);
  const [ventaToDelete, setVentaToDelete] = useState<any | null>(null);
  const [ventaSearch, setVentaSearch] = useState('');
  const [ventaPage, setVentaPage] = useState(1);
  const itemsPerPage = 10;

  const loadCatalogos = async () => {
    const listRec = await db.getRecetas();
    const listVen = await db.getVentas();
    const listIng = await db.getIngredientes();
    const platosFinales = listRec.filter(r => !r.esSubReceta);
    setRecetas(platosFinales);
    setVentas(listVen);

    // Inicializar reporte de ventas con platos finales
    setVentaItems(platosFinales.map(r => ({
      recetaId: r.id,
      cantidad: '',
      precioMenu: r.precioVentaMenu !== undefined ? r.precioVentaMenu : ''
    })));

    // Calcular costos de recetas de forma ultra rápida en memoria
    const costosMap: { [id: string]: number } = {};
    for (const r of platosFinales) {
      costosMap[r.id] = await db.calcularCostoReceta(r.id, listRec, listIng);
    }
    setRecetaCostos(costosMap);
  };

  const handleSavePrice = async (recetaId: string, val: string) => {
    const priceNum = Number(val);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Ingresa un precio válido.', 'warning');
      return;
    }
    const rec = recetas.find(r => r.id === recetaId);
    if (rec) {
      const updatedRec = { ...rec, precioVentaMenu: priceNum };
      await db.saveReceta(updatedRec);
      await loadCatalogos();
      if (onRefresh) onRefresh();
    }
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.actions-container')) {
        setActiveVentaRowActions(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSaveVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsValidos = ventaItems
      .filter(item => Number(item.cantidad) > 0)
      .map(item => ({
        recetaId: item.recetaId,
        cantidadVendida: Number(item.cantidad),
        precioCobrado: Number(item.precioMenu) || 0
      }));

    if (itemsValidos.length === 0) {
      showToast('Ingresa una cantidad mayor a cero para al menos un plato.', 'warning');
      return;
    }

    const nuevaVenta = {
      id: 'vta_' + Math.random().toString(36).substr(2, 9),
      fechaInicio: new Date(ventaFechaInicio).toISOString(),
      fechaFin: new Date(ventaFechaFin).toISOString(),
      items: itemsValidos,
      fechaRegistro: new Date().toISOString(),
      registradoPor: 'admin_lorena'
    };

    await db.saveVenta(nuevaVenta);
    setVentaItems(prev => prev.map(item => ({ ...item, cantidad: '' })));
    setVentaRegistroSearch('');
    loadCatalogos();
    if (onRefresh) onRefresh();
    showToast('Venta registrada correctamente.', 'success');
  };

  const handleDeleteVenta = (venta: any) => {
    setVentaToDelete(venta);
  };

  // --- LÓGICA FILTRADO Y PAGINACIÓN VENTAS ---
  const filteredVentas = (ventas || []).filter(v => {
    const searchLower = (ventaSearch || '').toLowerCase();
    return (
      new Date(v.fechaInicio).toLocaleDateString().includes(searchLower) ||
      new Date(v.fechaFin).toLocaleDateString().includes(searchLower) ||
      (v.registradoPor || '').toLowerCase().includes(searchLower)
    );
  });
  const totalVentaItems = filteredVentas.length;
  const totalVentaPages = Math.ceil(totalVentaItems / itemsPerPage) || 1;
  const activeVentaPage = Math.min(ventaPage, totalVentaPages);
  const startVentaIdx = (activeVentaPage - 1) * itemsPerPage;
  const paginatedVentas = filteredVentas.slice(startVentaIdx, startVentaIdx + itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', minHeight: 0 }}>
      {/* Selector de Sub-pestañas */}
      <div
        className="tab-navigation"
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '16px',
          paddingBottom: '0',
          alignSelf: 'stretch'
        }}
      >
        <button 
          type="button" 
          onClick={() => setSubTab('registro')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: subTab === 'registro' ? '600' : '400',
            color: subTab === 'registro' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            background: 'transparent',
            border: 'none',
            borderBottom: subTab === 'registro'
              ? '2px solid var(--color-accent)'
              : '2px solid transparent',
            borderRadius: '0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '-1px',
          }}
        >
          Registro de Ventas
        </button>
        <button 
          type="button" 
          onClick={() => setSubTab('precios')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: subTab === 'precios' ? '600' : '400',
            color: subTab === 'precios' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            background: 'transparent',
            border: 'none',
            borderBottom: subTab === 'precios'
              ? '2px solid var(--color-accent)'
              : '2px solid transparent',
            borderRadius: '0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '-1px',
          }}
        >
          Precios y Rentabilidad (Menú)
        </button>
        <button 
          type="button" 
          onClick={() => setSubTab('analisis_menu')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: subTab === 'analisis_menu' ? '600' : '400',
            color: subTab === 'analisis_menu' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            background: 'transparent',
            border: 'none',
            borderBottom: subTab === 'analisis_menu'
              ? '2px solid var(--color-accent)'
              : '2px solid transparent',
            borderRadius: '0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: '-1px',
          }}
        >
          Análisis de Menú (Matriz BCG)
        </button>
      </div>

      {subTab === 'registro' ? (
        <div className="grid-cols-2" style={{ flex: 1, minHeight: 0 }}>
          {/* Registro de Reporte POS */}
          <form className="mixo-card" onSubmit={handleSaveVenta} style={{ height: '100%' }}>
            <h2>Carga de Ventas (Reporte POS)</h2>
            <span className="text-secondary">Especifique las porciones vendidas para deducir insumos del inventario en cascada.</span>

            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label>Fecha de Inicio del Reporte</label>
                <input 
                  type="date"
                  value={ventaFechaInicio}
                  onChange={e => setVentaFechaInicio(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha de Fin del Reporte</label>
                <input 
                  type="date"
                  value={ventaFechaFin}
                  onChange={e => setVentaFechaFin(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mixo-card" style={{ padding: '16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', marginTop: '12px', flex: 1, minHeight: 0 }}>
              <h3 style={{ marginBottom: '8px' }}>Platos Vendidos por Receta</h3>

              {/* Filtro de búsqueda */}
              <input
                type="text"
                className="search-input"
                placeholder="Buscar plato del menú..."
                value={ventaRegistroSearch}
                onChange={e => setVentaRegistroSearch(e.target.value)}
                style={{ marginBottom: '12px', fontSize: '13px', height: '36px' }}
              />

              {recetas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)' }}>
                  No hay recetas registradas como platos finales.
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: '100%', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th className="text-left">Plato / Receta</th>
                        <th className="text-right" style={{ width: '100px' }}>Porciones</th>
                        <th className="text-right" style={{ width: '130px' }}>Precio de Venta Real</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventaItems.filter(item => {
                        if (!ventaRegistroSearch) return true;
                        const rec = recetas.find(r => r.id === item.recetaId);
                        return rec ? rec.nombre.toLowerCase().includes(ventaRegistroSearch.toLowerCase()) : true;
                      }).map((item, idx) => {
                        const rec = recetas.find(r => r.id === item.recetaId);
                        if (!rec) return null;
                        return (
                          <tr key={item.recetaId}>
                            <td className="text-left"><strong>{rec.nombre}</strong></td>
                            <td className="text-right">
                              <input 
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item.cantidad}
                                onChange={e => {
                                  const list = [...ventaItems];
                                  list[idx].cantidad = e.target.value;
                                  setVentaItems(list);
                                }}
                                style={{ width: '80px', textAlign: 'right', padding: '4px 8px', height: '32px' }}
                              />
                            </td>
                            <td className="text-right">
                              <input 
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={item.precioMenu}
                                onChange={e => {
                                  const list = [...ventaItems];
                                  list[idx].precioMenu = e.target.value;
                                  setVentaItems(list);
                                }}
                                style={{ width: '100px', textAlign: 'right', padding: '4px 8px', height: '32px' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={recetas.length === 0}>
              Procesar Reporte y Actualizar Inventario
            </button>
          </form>

          {/* Historial de Reportes POS */}
          <div className="mixo-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2>Historial de Reportes de Ventas</h2>
            <span className="text-secondary">Reportes POS procesados con deducción automática de insumos del inventario.</span>

            <div style={{ marginTop: '12px', marginBottom: '4px' }}>
              <input 
                type="text" 
                className="search-input"
                placeholder="Buscar por fecha o usuario..." 
                value={ventaSearch}
                onChange={e => { setVentaSearch(e.target.value); setVentaPage(1); }}
              />
            </div>

            <div className="table-container" style={{ marginTop: '12px' }}>
              <table>
                <thead>
                  <tr>
                    <th className="text-center">Registro</th>
                    <th className="text-left">Rango Reportado</th>
                    <th className="text-right">Platos</th>
                    <th className="text-right">Total Facturado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVentas.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        No se han registrado reportes de venta.
                      </td>
                    </tr>
                  ) : (
                    paginatedVentas.map(v => {
                      const totalCobrado = v.items.reduce((acc: number, curr: any) => acc + (curr.cantidadVendida * curr.precioCobrado), 0);
                      const totalPlatos = v.items.reduce((acc: number, curr: any) => acc + curr.cantidadVendida, 0);
                      return (
                        <tr key={v.id}>
                          <td className="text-center">{new Date(v.fechaRegistro).toLocaleDateString()}</td>
                          <td className="text-left">
                            <strong>{new Date(v.fechaInicio).toLocaleDateString()}</strong> al <strong>{new Date(v.fechaFin).toLocaleDateString()}</strong>
                          </td>
                          <td className="text-right">{totalPlatos} u.</td>
                          <td className="text-right"><strong>${totalCobrado.toFixed(2)}</strong></td>
                          <td className="text-right">
                            <div className="actions-container">
                              <button 
                                type="button" 
                                className="btn-actions-trigger" 
                                onClick={() => setActiveVentaRowActions(activeVentaRowActions === v.id ? null : v.id)}
                              >
                                ⋮
                              </button>
                              {activeVentaRowActions === v.id && (
                                <div className="actions-dropdown">
                                  <button type="button" className="danger" onClick={() => { handleDeleteVenta(v); setActiveVentaRowActions(null); }}>
                                    Eliminar Reporte
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex-row-between" style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <span className="text-secondary" style={{ fontSize: '13px' }}>
                Mostrando {totalVentaItems === 0 ? 0 : startVentaIdx + 1} - {Math.min(startVentaIdx + itemsPerPage, totalVentaItems)} de {totalVentaItems} reportes
              </span>
              <div className="flex-gap-16">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setVentaPage(prev => Math.max(prev - 1, 1))}
                  disabled={activeVentaPage === 1}
                  style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
                >
                  Anterior
                </button>
                <span className="flex-center" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  Pág. {activeVentaPage} de {totalVentaPages}
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setVentaPage(prev => Math.min(prev + 1, totalVentaPages))}
                  disabled={activeVentaPage === totalVentaPages}
                  style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : subTab === 'precios' ? (
        /* Precios y Rentabilidad */
        <div className="mixo-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <h2>Precios y Rentabilidad de Platos</h2>
          <span className="text-secondary">Establezca los precios de venta de sus recetas para evaluar márgenes de ganancia y porcentajes de costo de alimentos.</span>

          <div className="table-container" style={{ marginTop: '16px', flex: 1, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="text-left">Plato / Receta Final</th>
                  <th className="text-right" style={{ width: '150px' }}>Costo Porción</th>
                  <th className="text-right" style={{ width: '180px' }}>Precio Venta (Menú)</th>
                  <th className="text-center" style={{ width: '150px' }}>% Food Cost</th>
                  <th className="text-right" style={{ width: '150px' }}>Margen de Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {recetas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '24px' }}>
                      No hay recetas registradas como platos finales.
                    </td>
                  </tr>
                ) : (
                  recetas.map(rec => {
                    const costoUnitario = recetaCostos[rec.id] || 0;
                    const currentPrice = tempPrices[rec.id] !== undefined ? tempPrices[rec.id] : (rec.precioVentaMenu || '');
                    const priceNum = Number(currentPrice) || 0;
                    const foodCostPct = priceNum > 0 ? (costoUnitario / priceNum) * 100 : 0;
                    const margen = priceNum > 0 ? priceNum - costoUnitario : 0;

                    let badgeColor = 'var(--color-text-secondary)';
                    let badgeBg = 'var(--color-bg-transparent)';
                    if (priceNum > 0) {
                      if (foodCostPct <= 30) {
                        badgeColor = '#81c784';
                        badgeBg = 'rgba(129, 199, 132, 0.1)';
                      } else if (foodCostPct <= 40) {
                        badgeColor = '#ffb300';
                        badgeBg = 'rgba(255, 179, 0, 0.1)';
                      } else {
                        badgeColor = '#e57373';
                        badgeBg = 'rgba(229, 115, 115, 0.1)';
                      }
                    }

                    return (
                      <tr key={rec.id}>
                        <td className="text-left">
                          <strong>{rec.nombre}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            Código: {rec.codigoIntegracionPOS || '—'} | Rendimiento: {rec.cantidadRendimiento} {rec.unidadRendimiento === 'porciones' ? 'porciones' : rec.unidadRendimiento}
                          </div>
                        </td>
                        <td className="text-right">
                          ${costoUnitario.toFixed(2)}
                        </td>
                        <td className="text-right">
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>$</span>
                            <input 
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={currentPrice}
                              onChange={e => {
                                setTempPrices({
                                  ...tempPrices,
                                  [rec.id]: e.target.value
                                });
                              }}
                              onBlur={e => handleSavePrice(rec.id, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              style={{
                                width: '100px',
                                textAlign: 'right',
                                padding: '4px 8px',
                                height: '32px',
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px',
                                background: 'var(--color-bg-transparent)',
                                color: 'var(--color-text-primary)',
                                transition: 'all 0.15s ease'
                              }}
                            />
                          </div>
                        </td>
                        <td className="text-center">
                          {priceNum > 0 ? (
                            <span className="badge" style={{ 
                              color: badgeColor, 
                              backgroundColor: badgeBg, 
                              borderColor: badgeColor,
                              fontWeight: 600,
                              minWidth: '58px',
                              textAlign: 'center',
                              display: 'inline-block'
                            }}>
                              {foodCostPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="badge" style={{ color: 'var(--color-text-secondary)', display: 'inline-block' }}>
                              Sin precio
                            </span>
                          )}
                        </td>
                        <td className="text-right" style={{ fontWeight: 600, color: margen >= 0 ? 'var(--color-text-primary)' : '#e57373' }}>
                          {priceNum > 0 ? `$${margen.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Análisis de Menú (Matriz BCG) */
        (() => {
          const platosFinales = recetas.filter(r => !r.esSubReceta);
          const platesStats = platosFinales.map(rec => {
            const costoPorcion = recetaCostos[rec.id] || 0;
            let totalVolume = 0;
            ventas.forEach(v => {
              v.items?.forEach((it: any) => {
                if (it.recetaId === rec.id) totalVolume += Number(it.cantidadVendida || 0);
              });
            });
            const precioMenu = rec.precioVentaMenu || 0;
            const margin = precioMenu - costoPorcion;
            const foodCostPct = precioMenu > 0 ? (costoPorcion / precioMenu) * 100 : 0;
            return { rec, totalVolume, margin, costoPorcion, precioMenu, foodCostPct };
          });

          const n = platesStats.length;
          const avgVol = n > 0 ? platesStats.reduce((a, c) => a + c.totalVolume, 0) / n : 0;
          const avgMar = n > 0 ? platesStats.reduce((a, c) => a + c.margin, 0) / n : 0;

          const cuadrantes = [
            {
              key: 'estrella',
              label: '⭐ Platos Estrella',
              desc: 'Platos favoritos y rentables. Mantener calidad exacta y alta visibilidad.',
              color: '#81c784',
              bg: 'rgba(129, 199, 132, 0.05)',
              border: 'rgba(129, 199, 132, 0.25)',
              items: platesStats.filter(p => p.totalVolume >= avgVol && p.margin >= avgMar)
            },
            {
              key: 'rompecabeza',
              label: '🧩 Rompecabezas (Puzzles)',
              desc: 'Muy rentables pero poco pedidos. Promocionar con meseros o destacar en carta.',
              color: 'var(--color-accent)',
              bg: 'rgba(168, 199, 250, 0.05)',
              border: 'rgba(168, 199, 250, 0.25)',
              items: platesStats.filter(p => p.totalVolume < avgVol && p.margin >= avgMar)
            },
            {
              key: 'caballo',
              label: '🐴 Caballos de Batalla',
              desc: 'Muy populares pero bajo margen. Subir ligeramente el precio o ajustar costos.',
              color: '#ffb300',
              bg: 'rgba(255, 179, 0, 0.05)',
              border: 'rgba(255, 179, 0, 0.25)',
              items: platesStats.filter(p => p.totalVolume >= avgVol && p.margin < avgMar)
            },
            {
              key: 'perro',
              label: '🐶 Perros (Baja Rentabilidad)',
              desc: 'Poca demanda y poco margen. Candidatos a renovar, reemplazar o retirar.',
              color: '#ef5350',
              bg: 'rgba(239, 83, 80, 0.05)',
              border: 'rgba(239, 83, 80, 0.25)',
              items: platesStats.filter(p => p.totalVolume < avgVol && p.margin < avgMar)
            }
          ];

          return (
            <div className="mixo-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h2>Ingeniería de Menú (Matriz BCG)</h2>
                  <span className="text-secondary" style={{ fontSize: '13px' }}>
                    Clasificación estratégica cruzando popularidad (volumen de ventas) vs. rentabilidad (margen neto por plato).
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)', alignItems: 'center' }}>
                  <span>Volumen medio: <strong style={{ color: 'var(--color-text-primary)' }}>{avgVol.toFixed(1)} porc.</strong></span>
                  <span>Margen medio: <strong style={{ color: 'var(--color-text-primary)' }}>${avgMar.toFixed(2)}</strong></span>
                </div>
              </div>

              {ventas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
                  Registra reportes de venta en la pestaña «Registro de Ventas» para calcular la matriz BCG de tu carta.
                </div>
              ) : (
                <div className="grid-cols-2" style={{ gap: '16px', flex: 1, overflowY: 'auto' }}>
                  {cuadrantes.map(q => (
                    <div
                      key={q.key}
                      className="mixo-card"
                      style={{
                        backgroundColor: q.bg,
                        border: `1px solid ${q.border}`,
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: q.color, fontSize: '15px' }}>{q.label}</strong>
                          <span className="badge" style={{ fontSize: '11px', borderColor: q.color, color: q.color }}>
                            {q.items.length} {q.items.length === 1 ? 'plato' : 'platos'}
                          </span>
                        </div>
                        <div className="text-secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
                          {q.desc}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '220px' }}>
                        {q.items.length === 0 ? (
                          <span className="text-secondary" style={{ fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                            Sin platos en este cuadrante.
                          </span>
                        ) : (
                          q.items.map(p => (
                            <div
                              key={p.rec.id}
                              className="flex-row-between"
                              style={{
                                fontSize: '13px',
                                borderBottom: '1px solid var(--color-border)',
                                paddingBottom: '6px',
                                paddingTop: '2px'
                              }}
                            >
                              <div>
                                <strong>{p.rec.nombre}</strong>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                  Precio: ${p.precioMenu.toFixed(2)} | Costo: ${p.costoPorcion.toFixed(2)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 600, color: p.margin >= 0 ? 'var(--color-text-primary)' : '#e57373' }}>
                                  +${p.margin.toFixed(2)}
                                </span>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                  {p.totalVolume} porc. vendidas
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Modal de confirmación para eliminar reporte */}
      <ConfirmModal
        isOpen={!!ventaToDelete}
        title="¿Eliminar Reporte de Venta?"
        message="Esta acción no se puede deshacer. Se revertirán los insumos deducidos del inventario en cascada."
        confirmText="Eliminar Reporte"
        cancelText="Cancelar"
        onConfirm={async () => {
          if (ventaToDelete) {
            await db.deleteVenta(ventaToDelete.id);
            setVentaToDelete(null);
            loadCatalogos();
            if (onRefresh) onRefresh();
          }
        }}
        onCancel={() => setVentaToDelete(null)}
      />
    </div>
  );
};
