import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { Ingrediente, Receta, LoteProduccion, IngredienteReceta } from '../../services/db';
import { CustomSelect } from '../CustomSelect';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';

interface LotesTabProps {
  lotesProduccion: LoteProduccion[];
  recetas: Receta[];
  ingredientes: Ingrediente[];
  onRefresh: () => void;
}

export const LotesTab: React.FC<LotesTabProps> = ({
  lotesProduccion,
  recetas,
  ingredientes,
  onRefresh
}) => {
  const { showToast } = useToast();
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [loteToDelete, setLoteToDelete] = useState<LoteProduccion | null>(null);
  const [selectedRecetaId, setSelectedRecetaId] = useState('');
  const [loteCantidadProducida, setLoteCantidadProducida] = useState<number | string>(1);
  const [loteInsumos, setLoteInsumos] = useState<any[]>([]);
  const [loteFecha, setLoteFecha] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [activeRowActions, setActiveRowActions] = useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.actions-container')) {
        setActiveRowActions(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // --- CÁLCULO AUXILIAR DE RECETA ---
  const getCostoTotalLote = (ings: IngredienteReceta[]) => {
    let total = 0;
    ings.forEach(item => {
      if (item.esRecetaAnidada) {
        const sub = recetas.find(r => r.id === item.ingredienteId);
        if (sub) {
          const costoSubTotal = getCostoTotalLote(sub.ingredientes);
          const costoGramo = costoSubTotal / sub.cantidadRendimiento;
          total += costoGramo * item.cantidadRequerida;
        }
      } else {
        const ing = ingredientes.find(i => i.id === item.ingredienteId);
        if (ing) {
          total += db.calcularCostoUsoIngrediente(ing, item.cantidadRequerida);
        }
      }
    });
    return total;
  };

  // --- CÁLCULO DE COSTOS EN PRODUCCIÓN REAL ---
  const getCostoTotalLoteProduccion = (insumosList: any[]) => {
    let total = 0;
    insumosList.forEach(item => {
      const qty = Number(item.cantidadReal) || 0;
      if (item.esRecetaAnidada) {
        const sub = recetas.find(r => r.id === item.ingredienteId);
        if (sub) {
          const costoSubTotal = getCostoTotalLote(sub.ingredientes);
          const costoUnidadSub = costoSubTotal / sub.cantidadRendimiento;
          total += costoUnidadSub * qty;
        }
      } else {
        const ing = ingredientes.find(i => i.id === item.ingredienteId);
        if (ing) {
          total += db.calcularCostoUsoIngrediente(ing, qty);
        }
      }
    });
    return total;
  };

  // --- CONTROLADORES DE LOTES DE PRODUCCIÓN ---
  useEffect(() => {
    if (!selectedRecetaId) {
      setLoteInsumos([]);
      return;
    }
    const rec = recetas.find(r => r.id === selectedRecetaId);
    if (rec) {
      const scale = (Number(loteCantidadProducida) || 0) / rec.cantidadRendimiento;
      const initialInsumos = rec.ingredientes.map(item => ({
        ingredienteId: item.ingredienteId,
        esRecetaAnidada: item.esRecetaAnidada,
        shadowQty: item.cantidadRequerida,
        cantidadReal: Number((item.cantidadRequerida * scale).toFixed(2))
      }));
      setLoteInsumos(initialInsumos.map(({shadowQty, ...rest}) => rest)); // keep type clean
    }
  }, [selectedRecetaId, loteCantidadProducida, recetas]);

  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(loteCantidadProducida);
    if (!selectedRecetaId || qtyNum <= 0 || loteInsumos.length === 0) return;

    const parsedInsumos = loteInsumos.map(item => ({
      ...item,
      cantidadReal: Number(item.cantidadReal) || 0
    }));

    const costTotal = getCostoTotalLoteProduccion(parsedInsumos);
    const costPorcion = costTotal / qtyNum;

    const nuevoLote: LoteProduccion = {
      id: 'lote_' + Math.random().toString(36).substr(2, 9),
      fecha: new Date(loteFecha).toISOString(),
      recetaId: selectedRecetaId,
      cantidadProducida: qtyNum,
      costoTotalInsumos: costTotal,
      costoPorcionReal: costPorcion,
      insumos: parsedInsumos,
      registradoPor: 'chef_ramon'
    };

    await db.saveLoteProduccion(nuevoLote);
    setShowLoteForm(false);
    setSelectedRecetaId('');
    setLoteCantidadProducida(1);
    setLoteInsumos([]);
    setIsDirty(false);
    onRefresh();
    showToast('Lote registrado. Costos actualizados.', 'success');
  };

  const handleDeleteLote = (lote: LoteProduccion) => {
    setLoteToDelete(lote);
  };

  const filteredLotes = lotesProduccion.filter(lote => {
    const rec = recetas.find(r => r.id === lote.recetaId);
    const searchLower = searchQuery.toLowerCase();
    return (
      (rec ? rec.nombre : 'Receta Eliminada').toLowerCase().includes(searchLower) ||
      new Date(lote.fecha).toLocaleDateString().includes(searchLower)
    );
  });

  const totalItems = filteredLotes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedLotes = filteredLotes.slice(startIndex, startIndex + itemsPerPage);

  const handleCloseDrawer = () => {
    if (isDirty) {
      setPendingClose(true);
    } else {
      setShowLoteForm(false);
      setSelectedRecetaId('');
      setLoteCantidadProducida(1);
      setLoteInsumos([]);
      setIsDirty(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Bitácora de Lotes */}
      <div className="mixo-card" style={{ padding: '24px', width: '100%' }}>
        <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h2>Registro e Historial de Producción</h2>
          <div>
            <button 
              type="button"
              className="btn btn-primary"
              onClick={() => setShowLoteForm(true)}
            >
              Registrar Lote
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          {/* Buscador */}
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              className="search-input"
              placeholder="Buscar por receta producida o fecha..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                   <th className="text-center">Fecha</th>
                  <th className="text-left">Receta Producida</th>
                  <th className="text-right">Porciones Producidas</th>
                  <th className="text-right">Costo de Insumos Lote</th>
                  <th className="text-right">Costo Real por Porción</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No se encontraron lotes de producción.
                    </td>
                  </tr>
                ) : (
                  paginatedLotes.map(lote => {
                    const rec = recetas.find(r => r.id === lote.recetaId);
                    return (
                      <tr key={lote.id}>
                        <td className="text-center">{new Date(lote.fecha).toLocaleDateString()}</td>
                        <td className="text-left">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="cell-truncate" title={rec ? rec.nombre : 'Receta Eliminada'} style={{ fontWeight: 'bold' }}>
                              {rec ? rec.nombre : 'Receta Eliminada'}
                            </span>
                            {rec && (
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginLeft: '4px' }}>
                                ({rec.esSubReceta ? 'Sub-receta' : 'Plato Final'})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right">{lote.cantidadProducida} {rec ? (rec.unidadRendimiento === 'porciones' ? 'porciones' : rec.unidadRendimiento === 'litro' ? 'L' : rec.unidadRendimiento) : 'porción'}</td>
                        <td className="text-right">${lote.costoTotalInsumos.toFixed(2)}</td>
                        <td className="text-right">${lote.costoPorcionReal.toFixed(2)}</td>
                        <td className="text-right">
                          <div className="actions-container">
                            <button 
                              type="button" 
                              className="btn-actions-trigger" 
                              onClick={() => setActiveRowActions(activeRowActions === lote.id ? null : lote.id)}
                            >
                              ⋮
                            </button>
                            {activeRowActions === lote.id && (
                              <div className="actions-dropdown">
                                <button type="button" className="danger" onClick={() => { handleDeleteLote(lote); setActiveRowActions(null); }}>
                                  Eliminar
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
              Mostrando {totalItems === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} lotes
            </span>
            <div className="flex-gap-16">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
              >
                Anterior
              </button>
              <span className="flex-center" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                Pág. {activePage} de {totalPages}
              </span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop del Drawer */}
      <div 
        className={`drawer-backdrop ${showLoteForm ? 'open' : ''}`} 
        onClick={handleCloseDrawer}
      />

      {/* Drawer Panel */}
      <div className={`drawer-panel ${showLoteForm ? 'open' : ''}`}>
        <form onSubmit={handleSaveLote} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="drawer-header">
            <h2>Registrar Lote de Producción</h2>
            <button 
              type="button" 
              className="drawer-close-btn" 
              onClick={handleCloseDrawer}
            >
              ×
            </button>
          </div>

          <div className="drawer-body">
            <div className="form-group">
              <label>Receta a Producir</label>
              <CustomSelect
                options={recetas.map(r => ({
                  value: r.id,
                  label: `${r.nombre} (Sugerido: ${r.cantidadRendimiento} ${r.unidadRendimiento})`
                }))}
                value={selectedRecetaId}
                onChange={val => {
                  setSelectedRecetaId(val);
                  const rec = recetas.find(r => r.id === val);
                  if (rec) setLoteCantidadProducida(rec.cantidadRendimiento);
                }}
                placeholder="-- Seleccionar Receta --"
              />
            </div>

            {selectedRecetaId && (
              <>
                <div className="form-group">
                  <label>Fecha de Preparación</label>
                  <input 
                    type="date"
                    value={loteFecha}
                    onChange={e => { setLoteFecha(e.target.value); setIsDirty(true); }}
                    required
                  />
                </div>

                <div className="form-group">
                {/* Label dinámico según unidad de rendimiento */}
                {(() => {
                  const recSel = recetas.find(r => r.id === selectedRecetaId);
                  const labelCantidad = !recSel ? 'Cantidad Producida'
                    : recSel.unidadRendimiento === 'porciones' ? 'Porciones Producidas'
                    : recSel.unidadRendimiento === 'litro'     ? 'Litros Producidos'
                    : recSel.unidadRendimiento === 'kg'        ? 'Kilogramos Producidos'
                    : `Cantidad Producida (${recSel.unidadRendimiento})`;
                  return <label>{labelCantidad}</label>;
                })()}
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={loteCantidadProducida}
                  onChange={e => { setLoteCantidadProducida(e.target.value); setIsDirty(true); }}
                  required
                />
                </div>

                <div className="mixo-card" style={{ padding: '16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                  <h3 style={{ fontSize: '15px' }}>Resumen de Costo Real</h3>
                  {(() => {
                    const costTotal = getCostoTotalLoteProduccion(loteInsumos);
                    const qtyNum = Number(loteCantidadProducida);
                    const costPorcion = qtyNum > 0 ? costTotal / qtyNum : 0;
                    const rec = recetas.find(r => r.id === selectedRecetaId);
                    const unit = rec ? rec.unidadRendimiento : 'porción';

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                        <div className="flex-row-between" style={{ fontSize: '13px' }}>
                          <span>Materia Prima Utilizada:</span>
                          <strong>${costTotal.toFixed(2)}</strong>
                        </div>
                        <div className="flex-row-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', fontSize: '14px' }}>
                          <span><strong>Costo Real por {unit}:</strong></span>
                          <strong>${costPorcion.toFixed(2)}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {loteInsumos.length > 0 && (
                  <div className="mixo-card" style={{ padding: '16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Insumos Utilizados (Tanda)</h3>
                    <span className="text-secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '12px' }}>
                      Ajuste los consumos reales si difieren de la receta teórica:
                    </span>

                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th style={{ width: '120px' }}>Cant. Real</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loteInsumos.map((item, idx) => {
                          const ing = ingredientes.find(i => i.id === item.ingredienteId);
                          const sub = recetas.find(r => r.id === item.ingredienteId);
                          const name = ing ? ing.nombre : sub ? sub.nombre : 'Insumo';
                          const unit = ing ? ing.unidadReceta : sub ? sub.unidadRendimiento : '';

                          return (
                            <tr key={idx} style={{ height: '36px' }}>
                              <td><strong>{name}</strong></td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    style={{ height: '32px', padding: '0 8px', fontSize: '13px' }}
                                    value={item.cantidadReal}
                                    onChange={e => {
                                      const list = [...loteInsumos];
                                      list[idx].cantidadReal = e.target.value;
                                      setLoteInsumos(list);
                                    }}
                                    required
                                  />
                                  <span style={{ fontSize: '12px' }}>{unit}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="drawer-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCloseDrawer}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!selectedRecetaId || Number(loteCantidadProducida) <= 0}
            >
              Registrar Lote
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={loteToDelete !== null}
        title="Eliminar Lote de Producción"
        message={
          loteToDelete
            ? `¿Estás seguro de eliminar este lote de producción del ${new Date(loteToDelete.fecha).toLocaleDateString()}?`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDanger={true}
        onCancel={() => setLoteToDelete(null)}
        onConfirm={async () => {
          if (loteToDelete) {
            await db.deleteLoteProduccion(loteToDelete.id);
            setLoteToDelete(null);
            onRefresh();
          }
        }}
      />

      {/* Warning: cambios sin guardar */}
      <ConfirmModal
        isOpen={pendingClose}
        title="¿Cerrar sin guardar?"
        message="Tienes cambios sin guardar. Si cierras ahora, se perderán."
        confirmText="Descartar cambios"
        cancelText="Seguir editando"
        isDanger={false}
        onCancel={() => setPendingClose(false)}
        onConfirm={() => {
          setPendingClose(false);
          setShowLoteForm(false);
          setSelectedRecetaId('');
          setLoteCantidadProducida(1);
          setLoteInsumos([]);
          setIsDirty(false);
        }}
      />
    </div>
  );
};
