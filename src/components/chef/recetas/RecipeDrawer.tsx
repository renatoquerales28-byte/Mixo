import React, { useState, useEffect } from 'react';
import { db } from '../../../services/db';
import type { Ingrediente, Receta, PasoPreparacion, IngredienteReceta } from '../../../services/db';
import { CustomSelect } from '../../CustomSelect';
import { QuickIngredientDrawer } from './QuickIngredientDrawer';
import { ConfirmModal } from '../../ConfirmModal';

interface RecipeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingReceta: Receta | null;
  recetas: Receta[];
  ingredientes: Ingrediente[];
  onRefresh: () => void;
}

export const RecipeDrawer: React.FC<RecipeDrawerProps> = ({
  isOpen,
  onClose,
  editingReceta,
  recetas,
  ingredientes,
  onRefresh
}) => {
  const [drawerTab, setDrawerTab] = useState<'general' | 'ingredientes' | 'preparacion'>('general');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [recetaForm, setRecetaForm] = useState({
    nombre: '',
    esSubReceta: false,
    codigoIntegracionPOS: '',
    unidadRendimiento: 'porciones' as 'kg' | 'litro' | 'porciones',
    cantidadRendimiento: 1 as number | string,
    vidaUtilHoras: 24 as number | string,
    temperaturaAlmacenado: 'Refrigerado (2°C - 4°C)',
    alergenos: [] as ('gluten' | 'lactosa' | 'frutos_secos' | 'mariscos' | 'huevo' | 'soya')[],
    precioVentaMenu: '' as number | string,
    modoDescuento: 'explosion_ventas' as 'explosion_ventas' | 'produccion_previa'
  });

  const [recetaIngredientes, setRecetaIngredientes] = useState<any[]>([]);
  const [recetaPasos, setRecetaPasos] = useState<any[]>([]);

  // Estados para Registro Rápido de Insumo dentro del Drawer
  const [showQuickIngrediente, setShowQuickIngrediente] = useState(false);
  const [quickRegisterRowIndex, setQuickRegisterRowIndex] = useState<number | null>(null);

  useEffect(() => {
    if (editingReceta && isOpen) {
      setDrawerTab('general');
      if (editingReceta.id === 'new') {
        setRecetaForm({
          nombre: '',
          esSubReceta: false,
          codigoIntegracionPOS: '',
          unidadRendimiento: 'porciones',
          cantidadRendimiento: 1,
          vidaUtilHoras: 24,
          temperaturaAlmacenado: 'Refrigerado (2°C - 4°C)',
          alergenos: [],
          precioVentaMenu: '',
          modoDescuento: 'explosion_ventas'
        });
        setRecetaIngredientes([]);
        setRecetaPasos([]);
      } else {
        setRecetaForm({
          nombre: editingReceta.nombre,
          esSubReceta: editingReceta.esSubReceta,
          codigoIntegracionPOS: editingReceta.codigoIntegracionPOS || '',
          unidadRendimiento: editingReceta.unidadRendimiento,
          cantidadRendimiento: editingReceta.cantidadRendimiento,
          vidaUtilHoras: editingReceta.vidaUtilHoras || 24,
          temperaturaAlmacenado: editingReceta.temperaturaAlmacenado || 'Refrigerado (2°C - 4°C)',
          alergenos: editingReceta.alergenos || [],
          precioVentaMenu: editingReceta.precioVentaMenu !== undefined ? editingReceta.precioVentaMenu : '',
          modoDescuento: editingReceta.modoDescuento || 'explosion_ventas'
        });
        setRecetaIngredientes(editingReceta.ingredientes || []);
        setRecetaPasos(editingReceta.pasos || []);
      }
    }
  }, [editingReceta, isOpen]);

  const handleClose = () => {
    if (isDirty) {
      setPendingClose(true);
    } else {
      onClose();
    }
  };

  const handleOpenQuickIngredient = (rowIndex: number) => {
    setQuickRegisterRowIndex(rowIndex);
    setShowQuickIngrediente(true);
  };

  const handleQuickIngredientSave = (ingId: string) => {
    if (quickRegisterRowIndex !== null) {
      handleUpdateRecetaIngrediente(quickRegisterRowIndex, 'ingredienteId', ingId);
    }
    setShowQuickIngrediente(false);
    setQuickRegisterRowIndex(null);
    onRefresh();
  };

  const handleAddIngredienteToReceta = () => {
    setRecetaIngredientes([{
      ingredienteId: ingredientes[0]?.id || '',
      esRecetaAnidada: false,
      cantidadRequerida: 0
    }, ...recetaIngredientes]);
  };

  const handleRemoveIngredienteFromReceta = (index: number) => {
    setRecetaIngredientes(recetaIngredientes.filter((_, i) => i !== index));
  };

  const handleUpdateRecetaIngrediente = (index: number, field: keyof IngredienteReceta, value: any) => {
    const list = [...recetaIngredientes];
    if (field === 'ingredienteId') {
      list[index].ingredienteId = value;
      const isSub = recetas.some(r => r.id === value);
      list[index].esRecetaAnidada = isSub;
    } else {
      (list[index] as any)[field] = value;
    }
    setRecetaIngredientes(list);
  };

  const handleAddPasoToReceta = () => {
    const nPaso = recetaPasos.length + 1;
    setRecetaPasos([...recetaPasos, {
      numeroPaso: nPaso,
      estacion: 'preparacion_fria',
      descripcion: '',
      tiempoMinutos: 5,
      ingredientesAsociados: []
    }]);
  };

  const handleRemovePasoFromReceta = (index: number) => {
    const list = recetaPasos.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      numeroPaso: i + 1
    }));
    setRecetaPasos(list);
  };

  const handleUpdateRecetaPaso = (index: number, field: keyof PasoPreparacion, value: any) => {
    const list = [...recetaPasos];
    (list[index] as any)[field] = value;
    setRecetaPasos(list);
  };

  const handleToggleAlergeno = (alergeno: any) => {
    const active = recetaForm.alergenos.includes(alergeno);
    if (active) {
      setRecetaForm({
        ...recetaForm,
        alergenos: recetaForm.alergenos.filter(a => a !== alergeno)
      });
    } else {
      setRecetaForm({
        ...recetaForm,
        alergenos: [...recetaForm.alergenos, alergeno]
      });
    }
  };

  const handleSaveReceta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recetaForm.nombre || !editingReceta) return;

    const nuevaReceta: Receta = {
      id: editingReceta.id === 'new'
        ? 'rec_' + Math.random().toString(36).substr(2, 9)
        : editingReceta.id,
      nombre: recetaForm.nombre,
      esSubReceta: recetaForm.esSubReceta,
      codigoIntegracionPOS: recetaForm.codigoIntegracionPOS || undefined,
      unidadRendimiento: recetaForm.unidadRendimiento,
      cantidadRendimiento: Number(recetaForm.cantidadRendimiento),
      vidaUtilHoras: recetaForm.vidaUtilHoras ? Number(recetaForm.vidaUtilHoras) : undefined,
      temperaturaAlmacenado: recetaForm.temperaturaAlmacenado || undefined,
      alergenos: recetaForm.alergenos,
      ingredientes: recetaIngredientes
        .filter(i => Number(i.cantidadRequerida) > 0)
        .map(i => ({
          ingredienteId: i.ingredienteId,
          esRecetaAnidada: i.esRecetaAnidada,
          cantidadRequerida: Number(i.cantidadRequerida)
        })),
      pasos: recetaPasos.filter(p => p.descripcion).map(p => ({
        numeroPaso: Number(p.numeroPaso),
        estacion: p.estacion,
        descripcion: p.descripcion,
        tiempoMinutos: Number(p.tiempoMinutos || 0),
        temperaturaObjetivo: p.temperaturaObjetivo ? Number(p.temperaturaObjetivo) : undefined,
        ingredientesAsociados: p.ingredientesAsociados
      })),
      tiempoPreparacionTotal: recetaPasos.reduce((acc, curr) => acc + Number(curr.tiempoMinutos || 0), 0),
      actualizadoPor: 'chef_ramon',
      ultimaActualizacion: new Date().toISOString(),
      precioVentaMenu: recetaForm.precioVentaMenu ? Number(recetaForm.precioVentaMenu) : undefined,
      stockActual: editingReceta.id !== 'new' ? editingReceta.stockActual : 0,
      stockMinimo: editingReceta.id !== 'new' ? editingReceta.stockMinimo : undefined,
      modoDescuento: recetaForm.esSubReceta ? 'produccion_previa' : recetaForm.modoDescuento
    };

    await db.saveReceta(nuevaReceta);
    setIsDirty(false);
    onRefresh();
    onClose();
  };

  const isDrawerOpen = editingReceta !== null;

  return (
    <>
      {/* Backdrop del Drawer */}
      <div 
        className={`drawer-backdrop ${isDrawerOpen ? 'open' : ''}`} 
        onClick={handleClose}
      />

      {/* Drawer Panel (Ancho / Wide) */}
      <div className={`drawer-panel wide ${isDrawerOpen ? 'open' : ''}`}>
        {editingReceta && (
          <form onSubmit={handleSaveReceta} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="drawer-header">
              <h2>{editingReceta.id === 'new' ? 'Nueva Receta de Cocina' : 'Modificar Receta'}</h2>
              <button 
                type="button" 
                className="drawer-close-btn" 
                onClick={handleClose}
              >
                ×
              </button>
            </div>

            {/* Tab Switcher */}
            <div style={{ padding: '0 24px 0 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0' }}>
              <button
                type="button"
                onClick={() => setDrawerTab('general')}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: drawerTab === 'general' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  color: drawerTab === 'general' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px'
                }}
              >
                Datos Generales
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('ingredientes')}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: drawerTab === 'ingredientes' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  color: drawerTab === 'ingredientes' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px'
                }}
              >
                Ingredientes
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('preparacion')}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: drawerTab === 'preparacion' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  color: drawerTab === 'preparacion' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px'
                }}
              >
                Preparación
              </button>
            </div>

            <div className="drawer-body">
              {drawerTab === 'general' && (
              <>
              <div className="form-row">
                <div className="form-group col-2x">
                  <label>Nombre de la Receta</label>
                  <input 
                    type="text" 
                    placeholder="ej. Pasta Boloñesa, Salsa de Ajo Base"
                    value={recetaForm.nombre}
                    onChange={e => { setRecetaForm({ ...recetaForm, nombre: e.target.value }); setIsDirty(true); }}
                    required
                  />
                </div>
                
                <div className="form-group col-1x">
                  <label>Código POS (SKU)</label>
                  <input 
                    type="text" 
                    placeholder="ej. PAS-BOL-01"
                    value={recetaForm.codigoIntegracionPOS}
                    onChange={e => setRecetaForm({ ...recetaForm, codigoIntegracionPOS: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-1x">
                  <label>Tipo de Fórmula</label>
                  <CustomSelect
                    options={[
                      { value: 'no', label: 'Plato Final (Menú)' },
                      { value: 'si', label: 'Sub-receta de Lote' }
                    ]}
                    value={recetaForm.esSubReceta ? 'si' : 'no'}
                    onChange={val => setRecetaForm({ ...recetaForm, esSubReceta: val === 'si' })}
                  />
                </div>

                <div className="form-group col-1x">
                  <label>Unidad del Lote</label>
                  <CustomSelect
                    options={[
                      { value: 'porciones', label: 'Porciones' },
                      { value: 'kg', label: 'Kilogramos (kg)' },
                      { value: 'litro', label: 'Litros (l)' }
                    ]}
                    value={recetaForm.unidadRendimiento}
                    onChange={val => setRecetaForm({ ...recetaForm, unidadRendimiento: val as any })}
                  />
                </div>

                <div className="form-group col-1x">
                  <label>Rendimiento de Lote</label>
                  <input 
                    type="number" 
                    min="0.01" 
                    step="0.01" 
                    value={recetaForm.cantidadRendimiento}
                    onChange={e => setRecetaForm({ ...recetaForm, cantidadRendimiento: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-1x">
                  <label>Vida Útil (Horas)</label>
                  <input 
                    type="number" 
                    value={recetaForm.vidaUtilHoras}
                    onChange={e => setRecetaForm({ ...recetaForm, vidaUtilHoras: e.target.value })}
                  />
                </div>
                
                <div className="form-group col-1x">
                  <label>Conservación</label>
                  <input 
                    type="text" 
                    value={recetaForm.temperaturaAlmacenado}
                    onChange={e => setRecetaForm({ ...recetaForm, temperaturaAlmacenado: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>Modo de Descuento de Inventario</label>
                {recetaForm.esSubReceta ? (
                  <div style={{
                    padding: '10px 16px',
                    borderRadius: '28px',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: 'var(--color-accent)',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    📦 Producción Previa (Por defecto para Sub-recetas)
                  </div>
                ) : (
                  <CustomSelect
                    options={[
                      { value: 'explosion_ventas', label: 'Descontar insumos al vender (Hecho al momento)' },
                      { value: 'produccion_previa', label: 'Descontar al preparar Lote (Producción previa / En stock)' }
                    ]}
                    value={recetaForm.modoDescuento}
                    onChange={val => setRecetaForm({ ...recetaForm, modoDescuento: val as any })}
                  />
                )}
                <div style={{
                  marginTop: '8px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--color-text-secondary)'
                }}>
                  {recetaForm.esSubReceta ? (
                    <div>
                      💡 <strong style={{ color: 'var(--color-text-primary)' }}>Sub-receta de Lote:</strong> Al ser una sub-receta (ej. Salsa Napolitana), se asume siempre producción previa. Sus insumos se consumen solo al registrar el lote, y los platos que la incluyan solo restarán de su stock preparado.
                    </div>
                  ) : recetaForm.modoDescuento === 'produccion_previa' ? (
                    <div>
                      💡 <strong style={{ color: 'var(--color-text-primary)' }}>Producción Previa (Lote):</strong> Ideal para postres o platos pre-armados. Los ingredientes base se descontarán únicamente al registrar un <strong style={{ color: 'var(--color-accent)' }}>Lote de Producción</strong>. La venta solo restará del stock de porciones preparadas.
                    </div>
                  ) : (
                    <div>
                      💡 <strong style={{ color: 'var(--color-text-primary)' }}>Hecho al momento (Explosión):</strong> La preparación se realiza al instante de la compra. Al registrar una venta, el sistema explotará esta receta y descontará los ingredientes individuales y sub-recetas (de su respectivo stock) en tiempo real.
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Alérgenos del Plato</label>
                <div className="flex-gap-16" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  {['gluten', 'lactosa', 'frutos_secos', 'mariscos', 'huevo', 'soya'].map(a => {
                    const active = recetaForm.alergenos.includes(a as any);
                    return (
                      <button 
                        key={a}
                        type="button"
                        className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ height: '36px', minWidth: 'auto', padding: '0 16px' }}
                        onClick={() => handleToggleAlergeno(a)}
                      >
                        {a.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
              </>
              )}

              {/* INGREDIENTES EN RECETA */}
              {drawerTab === 'ingredientes' && (
              <div className="mixo-card" style={{ 
                flex: 1, 
                height: '100%', 
                padding: '16px', 
                backgroundColor: 'var(--color-bg-base)', 
                border: '1px solid var(--color-border)', 
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div className="flex-row-between" style={{ flexShrink: 0, marginBottom: '12px' }}>
                  <h3>Ingredientes y Sub-recetas</h3>
                  <button type="button" className="btn btn-secondary" style={{ height: '36px', padding: '0 16px' }} onClick={handleAddIngredienteToReceta}>
                    + Añadir Insumo
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                  <div style={{ paddingBottom: '160px' }}>
                    {recetaIngredientes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Añada los ingredientes necesarios para calcular el costo.
                      </div>
                    ) : (
                      recetaIngredientes.map((item, idx) => {
                        const optionsRecetas = recetas.filter(r => r.esSubReceta && r.id !== editingReceta.id);
                        const selectedIng = ingredientes.find(i => i.id === item.ingredienteId);
                        const selectedSub = optionsRecetas.find(r => r.id === item.ingredienteId);
                        const unit = selectedIng ? selectedIng.unidadReceta : selectedSub ? selectedSub.unidadRendimiento : '';

                        return (
                          <div className="form-row" key={idx} style={{ alignItems: 'flex-end', marginTop: '12px' }}>
                            <div className="form-group" style={{ flexGrow: 2 }}>
                              <label>Insumo o Sub-receta</label>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <CustomSelect
                                  options={[
                                    ...ingredientes.map(i => {
                                      const price = i.precioActivo || 0;
                                      let priceText = '';
                                      if (i.unidadReceta === 'g') priceText = `$${(price * 1000).toFixed(2)}/kg`;
                                      else if (i.unidadReceta === 'ml') priceText = `$${(price * 1000).toFixed(2)}/L`;
                                      else priceText = `$${price.toFixed(2)}/ud.`;
                                      return {
                                        value: i.id,
                                        label: `${i.nombre} (${priceText})`,
                                        group: 'Ingredientes Base'
                                      };
                                    }),
                                    ...optionsRecetas.map(r => ({
                                      value: r.id,
                                      label: `${r.nombre} (Lote)`,
                                      group: 'Sub-recetas de Bodega'
                                    }))
                                  ]}
                                  value={item.ingredienteId}
                                  onChange={val => handleUpdateRecetaIngrediente(idx, 'ingredienteId', val)}
                                  style={{ flexGrow: 1 }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ height: '44px', minWidth: 'auto', padding: '0 12px' }}
                                  onClick={() => handleOpenQuickIngredient(idx)}
                                  title="Registrar Nuevo Insumo"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="form-group" style={{ maxWidth: '120px' }}>
                              <label>Cant. ({unit})</label>
                              <input 
                                type="number" 
                                step="0.01"
                                value={item.cantidadRequerida === 0 || item.cantidadRequerida === '' ? '' : item.cantidadRequerida}
                                onChange={e => handleUpdateRecetaIngrediente(idx, 'cantidadRequerida', e.target.value)}
                                required
                              />
                            </div>

                            <button 
                              type="button" 
                              className="btn btn-action danger" 
                              style={{ height: '44px', minWidth: 'auto', padding: '0 8px' }}
                              onClick={() => handleRemoveIngredienteFromReceta(idx)}
                            >
                              Eliminar
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* PASOS DE PREPARACIÓN */}
              {drawerTab === 'preparacion' && (
              <div className="mixo-card" style={{ 
                flex: 1, 
                height: '100%', 
                padding: '16px', 
                backgroundColor: 'var(--color-bg-base)', 
                border: '1px solid var(--color-border)', 
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div className="flex-row-between" style={{ flexShrink: 0, marginBottom: '12px' }}>
                  <h3>Guía de Preparación</h3>
                  <button type="button" className="btn btn-secondary" style={{ height: '36px', padding: '0 16px' }} onClick={handleAddPasoToReceta}>
                    + Añadir Paso
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                  <div style={{ paddingBottom: '160px' }}>
                    {recetaPasos.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Registre los pasos operativos para estandarizar la receta.
                      </div>
                    ) : (
                      recetaPasos.map((paso, idx) => (
                        <div className="mixo-card" key={idx} style={{ padding: '12px', backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-border)', marginTop: '12px' }}>
                          <div className="flex-row-between">
                            <h4>Paso #{paso.numeroPaso}</h4>
                            <button type="button" className="btn btn-action danger" onClick={() => handleRemovePasoFromReceta(idx)}>
                              Eliminar Paso
                            </button>
                          </div>

                          <div className="form-row" style={{ marginTop: '8px' }}>
                            <div className="form-group col-2x">
                              <label>Estación de Cocina</label>
                              <CustomSelect
                                options={[
                                  { value: 'preparacion_fria', label: 'Preparación Fría / Mesa' },
                                  { value: 'estufa', label: 'Estufa / Cocción' },
                                  { value: 'parrilla', label: 'Parrilla / Plancha' },
                                  { value: 'horno', label: 'Horno' },
                                  { value: 'emplatado', label: 'Emplatado / Servicio' }
                                ]}
                                value={paso.estacion}
                                onChange={val => handleUpdateRecetaPaso(idx, 'estacion', val)}
                              />
                            </div>

                            <div className="form-group col-1x">
                              <label>Tiempo (Min)</label>
                              <input 
                                type="number"
                                value={paso.tiempoMinutos === 0 || paso.tiempoMinutos === '' ? '' : paso.tiempoMinutos}
                                onChange={e => handleUpdateRecetaPaso(idx, 'tiempoMinutos', e.target.value)}
                                required
                              />
                            </div>

                            <div className="form-group col-1x">
                              <label>Temp. (ºC)</label>
                              <input 
                                type="number"
                                placeholder="Opcional"
                                value={paso.temperaturaObjetivo || ''}
                                onChange={e => handleUpdateRecetaPaso(idx, 'temperaturaObjetivo', e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginTop: '8px' }}>
                            <label>Instrucciones de Cocción</label>
                            <textarea 
                              placeholder="Describa la acción..."
                              value={paso.descripcion}
                              onChange={e => handleUpdateRecetaPaso(idx, 'descripcion', e.target.value)}
                              required
                            />
                          </div>

                          {/* Vincular ingredientes a este paso */}
                          <div className="form-group" style={{ marginTop: '8px' }}>
                            <label>Insumos Usados en este Paso</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {recetaIngredientes.map(item => {
                                const ing = ingredientes.find(i => i.id === item.ingredienteId);
                                const sub = recetas.find(r => r.id === item.ingredienteId);
                                const name = ing ? ing.nombre : sub ? sub.nombre : 'Insumo';
                                const id = item.ingredienteId;
                                const isAssociated = paso.ingredientesAsociados.includes(id);

                                return (
                                  <button
                                    key={id}
                                    type="button"
                                    className={`btn ${isAssociated ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ height: '32px', minWidth: 'auto', padding: '0 12px', fontSize: '12px' }}
                                    onClick={() => {
                                      const list = [...paso.ingredientesAsociados];
                                      if (isAssociated) {
                                        handleUpdateRecetaPaso(idx, 'ingredientesAsociados', list.filter(i => i !== id));
                                      } else {
                                        handleUpdateRecetaPaso(idx, 'ingredientesAsociados', [...list, id]);
                                      }
                                    }}
                                  >
                                    {name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              )}

            </div>

            <div className="drawer-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '160px' }}>
                Guardar Receta
              </button>
            </div>
          </form>
        )}
      </div>

      <QuickIngredientDrawer 
        isOpen={showQuickIngrediente}
        onClose={() => {
          setShowQuickIngrediente(false);
          setQuickRegisterRowIndex(null);
        }}
        onSave={handleQuickIngredientSave}
        ingredientes={ingredientes}
      />

      <ConfirmModal
        isOpen={pendingClose}
        title="¿Cerrar sin guardar?"
        message="Tienes cambios en esta receta sin guardar. Si cierras ahora, se perderán."
        confirmText="Descartar cambios"
        cancelText="Seguir editando"
        isDanger={false}
        onCancel={() => setPendingClose(false)}
        onConfirm={() => { setPendingClose(false); setIsDirty(false); onClose(); }}
      />
    </>
  );
};
