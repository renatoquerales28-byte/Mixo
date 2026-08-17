import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { Proveedor, Ingrediente, FacturaCompra } from '../../services/db';
import { useToast } from '../../hooks/useToast';

interface AuditoriaTabProps {
  onRefresh?: () => void;
}

export const AuditoriaTab: React.FC<AuditoriaTabProps> = ({ onRefresh }) => {
  const { showToast } = useToast();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [facturas, setFacturas] = useState<FacturaCompra[]>([]);
  const [editingFactura, setEditingFactura] = useState<any | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [activeAuditRowActions, setActiveAuditRowActions] = useState<string | null>(null);
  const itemsPerPage = 10;

  const loadCatalogos = async () => {
    const listIng = await db.getIngredientes();
    const listProv = await db.getProveedores();
    const listFac = await db.getFacturas();
    setIngredientes(listIng);
    setProveedores(listProv);
    setFacturas(listFac);
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.actions-container')) {
        setActiveAuditRowActions(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSaveEditFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactura) return;

    // Obtener todas las facturas del LocalStorage para modificarla
    const facturasList = await db.getFacturas();
    const idx = facturasList.findIndex(f => f.id === editingFactura.id);

    if (idx >= 0) {
      const antiguaFactura = facturasList[idx];
      const parsedFactura = {
        ...editingFactura,
        items: editingFactura.items.map((item: any) => ({
          ...item,
          cantidadComprada: Number(item.cantidadComprada) || 0,
          precioCompraAP: Number(item.precioCompraAP) || 0,
          fechaVencimiento: item.fechaVencimiento || undefined
        }))
      };
      facturasList[idx] = parsedFactura;
      localStorage.setItem('mixo_facturas', JSON.stringify(facturasList));

      // TRIGGER DE RECALCULACIÓN EN CASCADA Y REVERSIÓN DE STOCK
      const ingredientesList = await db.getIngredientes();

      // 1. Restar el stock comprado en la factura original
      for (const item of antiguaFactura.items) {
        const ingIdx = ingredientesList.findIndex(i => i.id === item.ingredienteId);
        if (ingIdx >= 0) {
          ingredientesList[ingIdx].stockActual = Math.max(0, (ingredientesList[ingIdx].stockActual || 0) - item.cantidadComprada);
        }
      }

      // 2. Sumar el nuevo stock y actualizar precios del catálogo
      for (const item of parsedFactura.items) {
        const ingIdx = ingredientesList.findIndex(i => i.id === item.ingredienteId);
        if (ingIdx >= 0) {
          ingredientesList[ingIdx].precioActivo = item.precioCompraAP / item.cantidadComprada;
          ingredientesList[ingIdx].stockActual = (ingredientesList[ingIdx].stockActual || 0) + item.cantidadComprada;
          if (item.fechaVencimiento) {
            ingredientesList[ingIdx].fechaVencimiento = item.fechaVencimiento;
          }
          ingredientesList[ingIdx].ultimaActualizacion = new Date().toISOString();
        }
      }
      localStorage.setItem('mixo_ingredientes', JSON.stringify(ingredientesList));
      
      // 3. Notificar recarga
      loadCatalogos();
      setEditingFactura(null);
      if (onRefresh) onRefresh();
      showToast('Factura auditada. Costos de recetas e inventario actualizados.', 'success');
    }
  };

  // --- LÓGICA FILTRADO Y PAGINACIÓN AUDITORÍA ---
  const filteredFacturas = facturas.filter(fac => {
    const prov = proveedores.find(p => p.id === fac.proveedorId);
    const searchLower = auditSearch.toLowerCase();
    return (
      fac.facturaNumero.toLowerCase().includes(searchLower) ||
      (prov ? prov.nombreComercial : '').toLowerCase().includes(searchLower) ||
      new Date(fac.fechaCompra).toLocaleDateString().includes(searchLower)
    );
  });
  const totalAuditItems = filteredFacturas.length;
  const totalAuditPages = Math.ceil(totalAuditItems / itemsPerPage) || 1;
  const activeAuditPage = Math.min(auditPage, totalAuditPages);
  const startAuditIdx = (activeAuditPage - 1) * itemsPerPage;
  const paginatedFacturas = filteredFacturas.slice(startAuditIdx, startAuditIdx + itemsPerPage);

  return (
    <>
      <div className="mixo-card" style={{ height: '100%', padding: '24px' }}>
        <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h2>Historial y Corrección de Compras</h2>
        </div>
        <span className="text-secondary">Identifique y corrija errores de digitación del día. Mixo actualizará las recetas en cascada.</span>

        {/* Buscador */}
        <div style={{ marginTop: '12px', marginBottom: '4px' }}>
          <input 
            type="text" 
            className="search-input"
            placeholder="Buscar por factura, proveedor o fecha..." 
            value={auditSearch}
            onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }}
          />
        </div>

        <div className="table-container" style={{ marginTop: '12px' }}>
          <table>
            <thead>
              <tr>
                <th className="text-left">Factura</th>
                <th className="text-left">Proveedor</th>
                <th className="text-center">Fecha de Registro</th>
                <th className="text-right">Ítems</th>
                <th className="text-right">Monto Total</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFacturas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No se encontraron facturas.
                  </td>
                </tr>
              ) : (
                paginatedFacturas.map(fac => {
                  const prov = proveedores.find(p => p.id === fac.proveedorId);
                  const totalCost = fac.items.reduce((acc, curr) => acc + curr.precioCompraAP, 0);
                  const provName = prov ? prov.nombreComercial : 'Desconocido';
                  return (
                    <tr key={fac.id}>
                      <td className="text-left"><strong>#{fac.facturaNumero}</strong></td>
                      <td className="text-left cell-truncate" title={provName}>{provName}</td>
                      <td className="text-center">{new Date(fac.fechaCompra).toLocaleDateString()}</td>
                      <td className="text-right">{fac.items.length} prod.</td>
                      <td className="text-right"><strong>${totalCost.toFixed(2)}</strong></td>
                      <td className="text-right">
                        <div className="actions-container">
                          <button 
                            type="button" 
                            className="btn-actions-trigger" 
                            onClick={() => setActiveAuditRowActions(activeAuditRowActions === fac.id ? null : fac.id)}
                          >
                            ⋮
                          </button>
                          {activeAuditRowActions === fac.id && (
                            <div className="actions-dropdown">
                              <button type="button" onClick={() => { setEditingFactura(fac); setActiveAuditRowActions(null); }}>
                                Corregir Factura
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
            Mostrando {totalAuditItems === 0 ? 0 : startAuditIdx + 1} - {Math.min(startAuditIdx + itemsPerPage, totalAuditItems)} de {totalAuditItems} facturas
          </span>
          <div className="flex-gap-16">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
              disabled={activeAuditPage === 1}
              style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
            >
              Anterior
            </button>
            <span className="flex-center" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Pág. {activeAuditPage} de {totalAuditPages}
            </span>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setAuditPage(prev => Math.min(prev + 1, totalAuditPages))}
              disabled={activeAuditPage === totalAuditPages}
              style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop del Drawer de Auditoría */}
      <div 
        className={`drawer-backdrop ${editingFactura !== null ? 'open' : ''}`} 
        onClick={() => setEditingFactura(null)}
      />

      {/* Drawer Panel de Auditoría */}
      <div className={`drawer-panel ${editingFactura !== null ? 'open' : ''}`}>
        {editingFactura && (
          <form onSubmit={handleSaveEditFactura} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="drawer-header">
              <h2>Auditar Factura #{editingFactura.facturaNumero}</h2>
              <button 
                type="button" 
                className="drawer-close-btn" 
                onClick={() => setEditingFactura(null)}
              >
                ×
              </button>
            </div>

            <div className="drawer-body">
              <span className="text-secondary" style={{ fontSize: '13px' }}>
                Corrija las cantidades o costos brutos. Los cambios se propagarán automáticamente.
              </span>
              {editingFactura.items.map((item: any, idx: number) => {
                const ing = ingredientes.find(i => i.id === item.ingredienteId);
                const unit = ing ? ing.unidadReceta : '';

                return (
                  <div className="mixo-card" key={idx} style={{ padding: '16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', marginTop: '8px' }}>
                    <div className="form-group">
                      <label>Insumo</label>
                      <input type="text" value={ing ? ing.nombre : 'Insumo'} disabled style={{ opacity: 0.7 }} />
                    </div>

                    <div className="form-row" style={{ marginTop: '8px' }}>
                      <div className="form-group">
                        <label>Cantidad ({unit})</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={item.cantidadComprada}
                          onChange={e => {
                            const itemsCopy = [...editingFactura.items];
                            itemsCopy[idx].cantidadComprada = e.target.value;
                            setEditingFactura({ ...editingFactura, items: itemsCopy });
                          }}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Total Facturado</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={item.precioCompraAP}
                          onChange={e => {
                            const itemsCopy = [...editingFactura.items];
                            itemsCopy[idx].precioCompraAP = e.target.value;
                            setEditingFactura({ ...editingFactura, items: itemsCopy });
                          }}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Vencimiento</label>
                        <input 
                          type="date"
                          value={item.fechaVencimiento ? item.fechaVencimiento.split('T')[0] : ''}
                          onChange={e => {
                            const itemsCopy = [...editingFactura.items];
                            itemsCopy[idx].fechaVencimiento = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                            setEditingFactura({ ...editingFactura, items: itemsCopy });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="drawer-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingFactura(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '160px' }}>
                Aplicar Cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};
