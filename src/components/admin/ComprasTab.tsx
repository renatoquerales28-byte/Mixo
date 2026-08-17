import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { Proveedor, Ingrediente, FacturaCompra } from '../../services/db';
import { CustomSelect } from '../CustomSelect';
import { useToast } from '../../hooks/useToast';

interface ComprasTabProps {
  onRefresh?: () => void;
}

interface CompraItemState {
  ingredienteId: string;
  empaque: string;
  cantidadEmpaques: string | number;
  contenidoEmpaque: string | number;
  unidadContenido: string;
  precioTotal: string | number;
  fechaVencimiento: string;
}

export const ComprasTab: React.FC<ComprasTabProps> = ({ onRefresh }) => {
  const { showToast } = useToast();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [facturaNumero, setFacturaNumero] = useState('');
  const [facturaFecha, setFacturaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [compraItems, setCompraItems] = useState<CompraItemState[]>([]);

  const loadCatalogos = async () => {
    const listIng = await db.getIngredientes();
    const listProv = await db.getProveedores();
    setIngredientes(listIng);
    setProveedores(listProv);

    if (listProv.length > 0 && !selectedProveedor) {
      setSelectedProveedor(listProv[0].id);
    }
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  const handleAddItemCompra = () => {
    if (ingredientes.length === 0) return;
    const firstIng = ingredientes[0];
    setCompraItems([...compraItems, {
      ingredienteId: firstIng.id,
      empaque: 'Caja',
      cantidadEmpaques: '',
      contenidoEmpaque: '',
      unidadContenido: firstIng.unidadReceta === 'g' ? 'g' : firstIng.unidadReceta === 'ml' ? 'ml' : 'unidad',
      precioTotal: '',
      fechaVencimiento: ''
    }]);
  };

  const handleRemoveItemCompra = (index: number) => {
    setCompraItems(compraItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemCompra = (index: number, field: keyof CompraItemState, value: any) => {
    const list = [...compraItems];
    (list[index] as any)[field] = value;
    
    // Si cambia el ingrediente, reconfigurar la unidad de contenido por defecto
    if (field === 'ingredienteId') {
      const selected = ingredientes.find(i => i.id === value);
      if (selected) {
        list[index].unidadContenido = selected.unidadReceta === 'g' ? 'g' : selected.unidadReceta === 'ml' ? 'ml' : 'unidad';
        if (selected.perecibilidad === 'baja') {
          list[index].fechaVencimiento = '';
        }
      }
    }
    
    setCompraItems(list);
  };

  const handleSaveCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaNumero || compraItems.length === 0 || !selectedProveedor) return;

    const nuevaFactura: FacturaCompra = {
      id: 'fac_' + Math.random().toString(36).substr(2, 9),
      facturaNumero,
      proveedorId: selectedProveedor,
      fechaCompra: new Date(facturaFecha).toISOString(),
      items: compraItems.map(item => {
        const selectedIng = ingredientes.find(i => i.id === item.ingredienteId);
        const qtyEmp = Number(item.cantidadEmpaques) || 0;
        const contEmp = Number(item.contenidoEmpaque) || 0;
        const totalContent = qtyEmp * contEmp;
        let cantidadNetaBase = totalContent;

        if (item.unidadContenido === 'kg' || item.unidadContenido === 'litro') {
          cantidadNetaBase = totalContent * 1000;
        }

        return {
          ingredienteId: item.ingredienteId,
          cantidadComprada: cantidadNetaBase,
          precioCompraAP: Number(item.precioTotal) || 0,
          fechaVencimiento: item.fechaVencimiento && selectedIng?.perecibilidad !== 'baja'
            ? new Date(item.fechaVencimiento).toISOString()
            : undefined
        };
      }),
      registradoPor: 'admin_lorena'
    };

    await db.saveFactura(nuevaFactura);
    setFacturaNumero('');
    setCompraItems([]);
    if (onRefresh) onRefresh();
    showToast('Factura guardada. Inventario actualizado.', 'success');
  };

  return (
    <form className="mixo-card" onSubmit={handleSaveCompra} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <h2>Captura Rápida de Facturas</h2>
      <span className="text-secondary">Capture los insumos de su proveedor de forma rápida sin interrupciones.</span>

      <div className="form-row" style={{ marginTop: '12px', flexShrink: 0 }}>
        <div className="form-group">
          <label>Proveedor</label>
          <CustomSelect
            options={proveedores.map(p => ({ value: p.id, label: p.nombreComercial }))}
            value={selectedProveedor}
            onChange={val => setSelectedProveedor(val)}
          />
        </div>

        <div className="form-group">
          <label>Número de Factura</label>
          <input 
            type="text" 
            placeholder="ej. FAC-4589"
            value={facturaNumero}
            onChange={e => setFacturaNumero(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Fecha de Compra</label>
          <input 
            type="date"
            value={facturaFecha}
            onChange={e => setFacturaFecha(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Grilla de ítems de factura */}
      <div className="mixo-card" style={{ 
        flex: 1, 
        minHeight: 0,
        padding: '16px', 
        backgroundColor: 'var(--color-bg-base)', 
        marginTop: '12px', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div className="flex-row-between" style={{ flexShrink: 0, marginBottom: '12px' }}>
          <h3>Insumos Facturados</h3>
          <button type="button" className="btn btn-secondary" onClick={handleAddItemCompra}>
            Añadir Ítem de Compra
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ paddingBottom: '160px' }}>
            {compraItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                No ha añadido ítems a esta factura.
              </div>
            ) : (
              compraItems.map((item, idx) => {
                const selectedIng = ingredientes.find(i => i.id === item.ingredienteId);
                
                const getUnidadContenidoOptions = (baseUnit: string) => {
                  if (baseUnit === 'g') {
                    return [
                      { value: 'g', label: 'g' },
                      { value: 'kg', label: 'kg' }
                    ];
                  }
                  if (baseUnit === 'ml') {
                    return [
                      { value: 'ml', label: 'ml' },
                      { value: 'litro', label: 'Litro (L)' }
                    ];
                  }
                  return [
                    { value: 'unidad', label: 'ud.' }
                  ];
                };

                const contentUnitOptions = selectedIng ? getUnidadContenidoOptions(selectedIng.unidadReceta) : [];

                return (
                  <div className="form-row" key={idx} style={{ alignItems: 'flex-end', marginTop: '12px', gap: '8px' }}>
                    <div className="form-group" style={{ flex: '2', minWidth: '180px' }}>
                      <label>Insumo del Inventario</label>
                      <CustomSelect
                        options={ingredientes.map(i => ({ value: i.id, label: `${i.nombre} (${i.unidadReceta})` }))}
                        value={item.ingredienteId}
                        onChange={val => handleUpdateItemCompra(idx, 'ingredienteId', val)}
                      />
                    </div>

                    <div className="form-group" style={{ width: '110px' }}>
                      <label>Empaque</label>
                      <CustomSelect
                        options={[
                          { value: 'Caja', label: 'Caja' },
                          { value: 'Bolsa', label: 'Bolsa' },
                          { value: 'Botella', label: 'Botella' },
                          { value: 'Bulto', label: 'Bulto' },
                          { value: 'Saco', label: 'Saco' },
                          { value: 'Unidad', label: 'Unidad' },
                          { value: 'Lata', label: 'Lata' },
                          { value: 'Paquete', label: 'Paquete' },
                          { value: 'Granel', label: 'Granel' }
                        ]}
                        value={item.empaque}
                        onChange={val => handleUpdateItemCompra(idx, 'empaque', val)}
                      />
                    </div>

                    <div className="form-group" style={{ width: '85px' }}>
                      <label>Cant. Emp.</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="ej. 5"
                        value={item.cantidadEmpaques}
                        onChange={e => handleUpdateItemCompra(idx, 'cantidadEmpaques', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ width: '85px' }}>
                      <label>Contenido</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="ej. 1.25"
                        value={item.contenidoEmpaque}
                        onChange={e => handleUpdateItemCompra(idx, 'contenidoEmpaque', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ width: '95px' }}>
                      <label>Unidad</label>
                      <CustomSelect
                        options={contentUnitOptions}
                        value={item.unidadContenido}
                        onChange={val => handleUpdateItemCompra(idx, 'unidadContenido', val)}
                      />
                    </div>

                    <div className="form-group" style={{ width: '110px' }}>
                      <label>Total Pagado ($)</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="ej. 15.50"
                        value={item.precioTotal}
                        onChange={e => handleUpdateItemCompra(idx, 'precioTotal', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ width: '120px' }}>
                      <label>Vencimiento</label>
                      <input 
                        type="date"
                        value={selectedIng?.perecibilidad === 'baja' ? '' : item.fechaVencimiento}
                        onChange={e => handleUpdateItemCompra(idx, 'fechaVencimiento', e.target.value)}
                        disabled={selectedIng?.perecibilidad === 'baja'}
                        style={selectedIng?.perecibilidad === 'baja' ? { 
                          opacity: 0.5, 
                          cursor: 'not-allowed', 
                          backgroundColor: 'var(--color-bg-base)',
                          borderColor: 'var(--color-border)'
                        } : undefined}
                      />
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-action danger" 
                      style={{ height: '44px', minWidth: 'auto', padding: '0 8px', marginBottom: '0' }}
                      onClick={() => handleRemoveItemCompra(idx)}
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

      <div className="flex-row-between" style={{ marginTop: '16px', flexShrink: 0 }}>
        <div></div>
        <button type="submit" className="btn btn-primary" disabled={compraItems.length === 0}>
          Registrar Factura y Actualizar Costos
        </button>
      </div>
    </form>
  );
};
