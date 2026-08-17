import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { Ingrediente, Receta, RegistroMermaOperativa } from '../../services/db';
import { CustomSelect } from '../CustomSelect';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';

interface MermasTabProps {
  onRefresh?: () => void;
}

export const MermasTab: React.FC<MermasTabProps> = ({ onRefresh }) => {
  const { showToast } = useToast();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [mermas, setMermas] = useState<RegistroMermaOperativa[]>([]);
  const [costoRecetaBase, setCostoRecetaBase] = useState(0);
  const [mermaForm, setMermaForm] = useState({
    tipoOrigen: 'ingrediente' as 'ingrediente' | 'receta',
    referenciaId: '',
    cantidadPerdida: '' as string | number,
    motivo: 'vencido' as 'vencido' | 'quemado' | 'derrame_caida' | 'error_preparacion'
  });
  const [mermaSearch, setMermaSearch] = useState('');
  const [mermaPage, setMermaPage] = useState(1);
  const [activeMermaRowActions, setActiveMermaRowActions] = useState<string | null>(null);
  const [mermaToDelete, setMermaToDelete] = useState<RegistroMermaOperativa | null>(null);
  const itemsPerPage = 10;

  const loadCatalogos = async () => {
    const listIng = await db.getIngredientes();
    const listRec = await db.getRecetas();
    const listMer = await db.getMermas();
    setIngredientes(listIng);
    setRecetas(listRec);
    setMermas(listMer);

    // Auto-seleccionar primer elemento en formularios si existen
    if (listIng.length > 0 && !mermaForm.referenciaId) {
      setMermaForm(prev => ({ ...prev, referenciaId: listIng[0].id }));
    }
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  // Calcular costo de receta seleccionada (async)
  useEffect(() => {
    if (mermaForm.tipoOrigen === 'receta' && mermaForm.referenciaId) {
      db.calcularCostoReceta(mermaForm.referenciaId, recetas).then(costo => {
        const rec = recetas.find(r => r.id === mermaForm.referenciaId);
        setCostoRecetaBase(rec && rec.cantidadRendimiento > 0 ? costo / rec.cantidadRendimiento : 0);
      });
    } else {
      setCostoRecetaBase(0);
    }
  }, [mermaForm.referenciaId, mermaForm.tipoOrigen, recetas]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.actions-container')) {
        setActiveMermaRowActions(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Preview síncrono del costo de pérdida
  const costoPreviewMerma = useMemo(() => {
    const qty = Number(mermaForm.cantidadPerdida) || 0;
    if (qty <= 0 || !mermaForm.referenciaId) return 0;
    if (mermaForm.tipoOrigen === 'ingrediente') {
      const ing = ingredientes.find(i => i.id === mermaForm.referenciaId);
      return ing ? (ing.precioActivo || 0) * qty : 0;
    }
    return costoRecetaBase * qty;
  }, [mermaForm.cantidadPerdida, mermaForm.referenciaId, mermaForm.tipoOrigen, ingredientes, costoRecetaBase]);

  const handleSaveMerma = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(mermaForm.cantidadPerdida);
    if (qtyNum <= 0 || !mermaForm.referenciaId) return;

    let costoPérdidaItem = 0;
    if (mermaForm.tipoOrigen === 'ingrediente') {
      const ing = ingredientes.find(i => i.id === mermaForm.referenciaId);
      if (ing) {
        costoLotePorcion = (ing.precioActivo || 0) * qtyNum;
        costoPérdidaItem = costoLotePorcion;
      }
    } else {
      const rec = recetas.find(r => r.id === mermaForm.referenciaId);
      if (rec) {
        const costoLote = await db.calcularCostoReceta(rec.id, recetas);
        costoPérdidaItem = (costoLote / rec.cantidadRendimiento) * qtyNum;
      }
    }

    const nuevaMerma: RegistroMermaOperativa = {
      id: 'mrm_' + Math.random().toString(36).substr(2, 9),
      fechaMerma: new Date().toISOString(),
      tipoOrigen: mermaForm.tipoOrigen,
      referenciaId: mermaForm.referenciaId,
      cantidadPerdida: qtyNum,
      motivo: mermaForm.motivo,
      costoPerdida: costoPérdidaItem,
      registradoPor: 'admin_lorena'
    };

    await db.saveMerma(nuevaMerma);
    setMermaForm(prev => ({
      ...prev,
      cantidadPerdida: ''
    }));
    loadCatalogos();
    if (onRefresh) onRefresh();
    showToast('Merma registrada para auditoría.', 'success');
  };

  let costoLotePorcion = 0; // auxiliary declaration inside component

  const handleDeleteMerma = (merma: RegistroMermaOperativa) => {
    setMermaToDelete(merma);
  };

  // --- LÓGICA FILTRADO Y PAGINACIÓN MERMAS ---
  const filteredMermas = mermas.filter(m => {
    let prodName = '';
    if (m.tipoOrigen === 'ingrediente') {
      const ing = ingredientes.find(i => i.id === m.referenciaId);
      prodName = ing ? ing.nombre : 'Insumo';
    } else {
      const rec = recetas.find(r => r.id === m.referenciaId);
      prodName = rec ? rec.nombre : 'Receta';
    }
    const searchLower = mermaSearch.toLowerCase();
    return (
      prodName.toLowerCase().includes(searchLower) ||
      m.motivo.replace('_', ' ').toLowerCase().includes(searchLower) ||
      new Date(m.fechaMerma).toLocaleDateString().includes(searchLower)
    );
  });
  const totalMermaItems = filteredMermas.length;
  const totalMermaPages = Math.ceil(totalMermaItems / itemsPerPage) || 1;
  const activeMermaPage = Math.min(mermaPage, totalMermaPages);
  const startMermaIdx = (activeMermaPage - 1) * itemsPerPage;
  const paginatedMermas = filteredMermas.slice(startMermaIdx, startMermaIdx + itemsPerPage);

  return (
    <div className="grid-cols-2">
      {/* Registro de Merma */}
      <form className="mixo-card" onSubmit={handleSaveMerma}>
        <h2>Registro y Control de Mermas</h2>
        <span className="text-secondary">Capture pérdidas por vencimiento o accidentes en tiempo real.</span>

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label>Tipo de Pérdida</label>
          <CustomSelect
            options={[
              { value: 'ingrediente', label: 'Insumo en Bruto' },
              { value: 'receta', label: 'Receta / Plato Elaborado' }
            ]}
            value={mermaForm.tipoOrigen}
            onChange={val => {
              const firstId = val === 'ingrediente' ? ingredientes[0]?.id : recetas[0]?.id;
              setMermaForm({ ...mermaForm, tipoOrigen: val as any, referenciaId: firstId || '' });
            }}
          />
        </div>

        <div className="form-group">
          <label>Referencia del Insumo o Receta</label>
          <CustomSelect
            options={
              mermaForm.tipoOrigen === 'ingrediente' ? (
                ingredientes.map(i => ({
                  value: i.id,
                  label: `${i.nombre} (Unidad: ${i.unidadReceta})`
                }))
              ) : (
                recetas.map(r => ({
                  value: r.id,
                  label: `${r.nombre} (Porción)`
                }))
              )
            }
            value={mermaForm.referenciaId}
            onChange={val => setMermaForm({ ...mermaForm, referenciaId: val })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Cantidad Perdida (Merma)</label>
            <input 
              type="number"
              step="0.01"
              value={mermaForm.cantidadPerdida}
              onChange={e => setMermaForm({ ...mermaForm, cantidadPerdida: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Motivo de la Merma</label>
            <CustomSelect
              options={[
                { value: 'vencido', label: 'Producto Expirado / Vencido' },
                { value: 'quemado', label: 'Producto Quemado / Sobre-cocido' },
                { value: 'derrame_caida', label: 'Accidente / Derrame / Caída' },
                { value: 'error_preparacion', label: 'Falla en Preparación / Mal Sabor' }
              ]}
              value={mermaForm.motivo}
              onChange={val => setMermaForm({ ...mermaForm, motivo: val as any })}
            />
          </div>
        </div>

        {/* Preview de costo de la pérdida */}
        {costoPreviewMerma > 0 && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(255,138,128,0.05)',
            borderLeft: '3px solid #ff8a80',
            borderRadius: '8px',
            marginTop: '4px'
          }}>
            <div className="flex-row-between" style={{ fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Costo estimado de esta pérdida:</span>
              <strong style={{ color: '#ff8a80' }}>${costoPreviewMerma.toFixed(2)}</strong>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
          Registrar Merma
        </button>
      </form>

      {/* Listado de Mermas */}
      <div className="mixo-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h2>Historial de Mermas de Cocina</h2>
        <span className="text-secondary">Registro de pérdidas listas para exportar y auditar en Unify.</span>
        
        {/* Buscador */}
        <div style={{ marginTop: '12px', marginBottom: '4px' }}>
          <input 
            type="text" 
            className="search-input"
            placeholder="Buscar por insumo, receta o motivo..." 
            value={mermaSearch}
            onChange={e => { setMermaSearch(e.target.value); setMermaPage(1); }}
          />
        </div>

        <div className="table-container" style={{ marginTop: '12px' }}>
          <table>
            <thead>
              <tr>
                <th className="text-center">Fecha</th>
                <th className="text-left">Producto</th>
                <th className="text-right">Cantidad Perdida</th>
                <th className="text-right">Valor de la Pérdida</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMermas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No se encontraron mermas registradas.
                  </td>
                </tr>
              ) : (
                paginatedMermas.map(m => {
                  let prodName = 'Desconocido';
                  let unit = '';
                  if (m.tipoOrigen === 'ingrediente') {
                    const ing = ingredientes.find(i => i.id === m.referenciaId);
                    prodName = ing ? ing.nombre : 'Insumo';
                    unit = ing ? ing.unidadReceta : '';
                  } else {
                    const rec = recetas.find(r => r.id === m.referenciaId);
                    prodName = rec ? rec.nombre : 'Receta';
                    unit = rec ? (rec.unidadRendimiento === 'porciones' ? 'porciones' : rec.unidadRendimiento === 'litro' ? 'L' : rec.unidadRendimiento) : 'porción';
                  }

                  return (
                    <tr key={m.id}>
                      <td className="text-center">{new Date(m.fechaMerma).toLocaleDateString()}</td>
                      <td className="text-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="cell-truncate" title={prodName} style={{ fontWeight: 'bold' }}>
                            {prodName}
                          </span>
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginLeft: '4px' }} title={`Motivo: ${m.motivo.replace('_', ' ')}`}>
                            ({m.motivo.replace('_', ' ')})
                          </span>
                        </div>
                      </td>
                      <td className="text-right">{m.cantidadPerdida} {unit}</td>
                      <td className="text-right">-${m.costoPerdida.toFixed(2)}</td>
                      <td className="text-right">
                        <div className="actions-container">
                          <button 
                            type="button" 
                            className="btn-actions-trigger" 
                            onClick={() => setActiveMermaRowActions(activeMermaRowActions === m.id ? null : m.id)}
                          >
                            ⋮
                          </button>
                          {activeMermaRowActions === m.id && (
                            <div className="actions-dropdown">
                              <button type="button" className="danger" onClick={() => { handleDeleteMerma(m); setActiveMermaRowActions(null); }}>
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
            Mostrando {totalMermaItems === 0 ? 0 : startMermaIdx + 1} - {Math.min(startMermaIdx + itemsPerPage, totalMermaItems)} de {totalMermaItems} mermas
          </span>
          <div className="flex-gap-16">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setMermaPage(prev => Math.max(prev - 1, 1))}
              disabled={activeMermaPage === 1}
              style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
            >
              Anterior
            </button>
            <span className="flex-center" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Pág. {activeMermaPage} de {totalMermaPages}
            </span>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setMermaPage(prev => Math.min(prev + 1, totalMermaPages))}
              disabled={activeMermaPage === totalMermaPages}
              style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={mermaToDelete !== null}
        title="Eliminar Registro de Merma"
        message={
          mermaToDelete
            ? `¿Estás seguro de eliminar el registro de merma de ${
                mermaToDelete.tipoOrigen === 'ingrediente'
                  ? (ingredientes.find(i => i.id === mermaToDelete.referenciaId)?.nombre || 'Insumo')
                  : (recetas.find(r => r.id === mermaToDelete.referenciaId)?.nombre || 'Receta')
              } por un valor de $${mermaToDelete.costoPerdida.toFixed(2)}?`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDanger={true}
        onCancel={() => setMermaToDelete(null)}
        onConfirm={async () => {
          if (mermaToDelete) {
            await db.deleteMerma(mermaToDelete.id);
            setMermaToDelete(null);
            loadCatalogos();
            if (onRefresh) onRefresh();
          }
        }}
      />
    </div>
  );
};
