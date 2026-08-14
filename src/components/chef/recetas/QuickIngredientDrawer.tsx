import React, { useState, useEffect } from 'react';
import { db } from '../../../services/db';
import type { Ingrediente } from '../../../services/db';
import { CustomSelect } from '../../CustomSelect';

interface QuickIngredientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ingId: string) => void;
  ingredientes: Ingrediente[];
}

export const QuickIngredientDrawer: React.FC<QuickIngredientDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  ingredientes
}) => {
  const [editingIngInPanel, setEditingIngInPanel] = useState<Ingrediente | null>(null);
  const [refSearch, setRefSearch] = useState('');
  const [ingForm, setIngForm] = useState({
    nombre: '',
    unidadReceta: 'g',
    conservacion: 'secos' as 'secos' | 'refrigerado' | 'congelado',
    perecibilidad: 'media' as 'alta' | 'media' | 'baja',
    diasVidaUtil: '' as string | number
  });

  const resetForm = () => {
    setEditingIngInPanel(null);
    setRefSearch('');
    setIngForm({
      nombre: '',
      unidadReceta: 'g',
      conservacion: 'secos',
      perecibilidad: 'media',
      diasVidaUtil: ''
    });
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSaveIngrediente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingForm.nombre) return;

    const ingId = editingIngInPanel?.id || 'ing_' + Math.random().toString(36).substr(2, 9);
    const nuevoIng: Ingrediente = {
      id: ingId,
      nombre: ingForm.nombre,
      unidadReceta: ingForm.unidadReceta as any,
      precioActivo: editingIngInPanel?.precioActivo || 0,
      stockActual: editingIngInPanel?.stockActual || 0,
      stockMinimo: editingIngInPanel?.stockMinimo,
      fechaVencimiento: editingIngInPanel?.fechaVencimiento,
      conservacion: ingForm.conservacion,
      perecibilidad: ingForm.perecibilidad,
      diasVidaUtil: ingForm.diasVidaUtil !== '' ? Number(ingForm.diasVidaUtil) : undefined,
      ultimaActualizacion: new Date().toISOString()
    };

    await db.saveIngrediente(nuevoIng);
    onSave(ingId);
    resetForm();
  };

  return (
    <>
      {/* Backdrop del Drawer de Insumos */}
      <div 
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
        style={{ zIndex: 1250 }}
      />

      {/* Drawer Panel de Insumos */}
      <div className={`drawer-panel ${isOpen ? 'open' : ''}`} style={{ zIndex: 1300 }}>
        <form onSubmit={handleSaveIngrediente} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="drawer-header">
            <h2>Nuevo Insumo</h2>
            <button 
              type="button" 
              className="drawer-close-btn" 
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="drawer-body">
            {editingIngInPanel && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                marginBottom: '12px'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Editando: <strong style={{ color: 'var(--color-text-primary)' }}>{editingIngInPanel.nombre}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIngInPanel(null);
                    setIngForm({
                      nombre: '',
                      unidadReceta: 'g',
                      conservacion: 'secos',
                      perecibilidad: 'media',
                      diasVidaUtil: ''
                    });
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0' }}
                >
                  ×
                </button>
              </div>
            )}

            <span className="text-secondary" style={{ fontSize: '13px' }}>
              Defina las propiedades base del insumo para agregarlo al catálogo.
            </span>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>Nombre del Insumo</label>
              <input 
                type="text" 
                placeholder="ej. Tomate Chonto, Lomo Res" 
                value={ingForm.nombre}
                onChange={e => setIngForm({ ...ingForm, nombre: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Método de Conservación</label>
              <CustomSelect
                options={[
                  { value: 'secos', label: 'Secos / Almacén' },
                  { value: 'refrigerado', label: 'Refrigerado' },
                  { value: 'congelado', label: 'Congelado' }
                ]}
                value={ingForm.conservacion}
                onChange={val => setIngForm(prev => ({ ...prev, conservacion: val as any }))}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Nivel de Perecibilidad</label>
              <CustomSelect
                options={[
                  { value: 'alta', label: 'Alta Perecibilidad (< 7 días)' },
                  { value: 'media', label: 'Media Perecibilidad (7 a 30 días)' },
                  { value: 'baja', label: 'No Perecedero / Baja Perecibilidad (> 30 días)' }
                ]}
                value={ingForm.perecibilidad}
                onChange={val => setIngForm(prev => ({ ...prev, perecibilidad: val as any }))}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Días de Vida Útil sugeridos</label>
              <input 
                type="number" 
                min="0"
                placeholder="ej. 7" 
                value={ingForm.diasVidaUtil}
                onChange={e => setIngForm(prev => ({ ...prev, diasVidaUtil: e.target.value }))}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '28px',
                  padding: '0 16px',
                  backgroundColor: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>

            <div className="form-group">
              <label>Unidad del Insumo</label>
              <CustomSelect
                options={[
                  { value: 'g', label: 'Gramo (g)' },
                  { value: 'ml', label: 'Mililitro (ml)' },
                  { value: 'unidad', label: 'Unidad (ud.)' }
                ]}
                value={ingForm.unidadReceta}
                onChange={val => setIngForm(prev => ({ ...prev, unidadReceta: val }))}
              />
            </div>

            {/* Referencia de insumos ya registrados */}
            <div style={{ marginTop: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  Insumos ya registrados
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              </div>

              <input
                type="text"
                className="search-input"
                placeholder="Buscar insumo existente..."
                value={refSearch}
                onChange={e => setRefSearch(e.target.value)}
                style={{ marginBottom: '8px', fontSize: '13px', height: '36px' }}
              />

              <div className="ref-insumos-container" style={{
                maxHeight: '200px',
                overflowY: 'auto',
                overflowX: 'hidden',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: 'var(--color-bg-base)'
              }}>
                {(() => {
                  const refLower = refSearch.toLowerCase();
                  const filtered = ingredientes.filter(ing => {
                    const conservacionText = ing.conservacion === 'secos' ? 'secos almacén' : ing.conservacion === 'refrigerado' ? 'refrigerado' : 'congelado';
                    return (
                      ing.nombre.toLowerCase().includes(refLower) ||
                      conservacionText.includes(refLower)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        Sin resultados
                      </div>
                    );
                  }

                  return (
                    <table className="ref-insumos-table" style={{ width: '100%' }}>
                      <tbody>
                        {filtered.map(ing => {
                          const unidadLabel = ing.unidadReceta === 'g' ? 'g' : ing.unidadReceta === 'ml' ? 'ml' : 'ud.';
                          return (
                            <tr key={ing.id}>
                              <td className="text-left cell-truncate" title={ing.nombre} style={{ fontWeight: 500 }}>
                                {ing.nombre}
                              </td>
                              <td className="text-left cell-truncate" title={ing.conservacion} style={{ color: 'var(--color-text-secondary)' }}>
                                {ing.conservacion === 'secos' ? 'Secos' : ing.conservacion === 'refrigerado' ? 'Refrigerado' : 'Congelado'}
                              </td>
                              <td className="text-center" style={{ width: '50px' }}>
                                <span className="badge" style={{ display: 'inline-block', minWidth: '32px', textAlign: 'center' }}>
                                  {unidadLabel}
                                </span>
                              </td>
                              <td className="text-right" style={{ width: '70px' }}>
                                <button 
                                  type="button" 
                                  className="btn-ref-edit" 
                                  onClick={() => {
                                    setEditingIngInPanel(ing);
                                    setIngForm({
                                      nombre: ing.nombre,
                                      unidadReceta: ing.unidadReceta,
                                      conservacion: ing.conservacion || 'secos',
                                      perecibilidad: ing.perecibilidad || 'media',
                                      diasVidaUtil: ing.diasVidaUtil !== undefined ? ing.diasVidaUtil : ''
                                    });
                                    (document.querySelector('.drawer-panel.open .drawer-body') as HTMLElement)?.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-accent)',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 500
                                  }}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

          </div>

          <div className="drawer-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              {editingIngInPanel ? 'Guardar Cambios' : 'Añadir Insumo'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
