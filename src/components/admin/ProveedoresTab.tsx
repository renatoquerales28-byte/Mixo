import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import type { Proveedor } from '../../services/db';
import { useToast } from '../../hooks/useToast';

interface ProveedoresTabProps {
  onRefresh?: () => void;
}

export const ProveedoresTab: React.FC<ProveedoresTabProps> = ({ onRefresh }) => {
  const { showToast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [provForm, setProvForm] = useState({
    nombreComercial: '',
    nit: '',
    contactoNombre: '',
    telefono: '',
    correo: ''
  });
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [showProvForm, setShowProvForm] = useState(false);
  const [provSearch, setProvSearch] = useState('');
  const [provPage, setProvPage] = useState(1);
  const [activeProvRowActions, setActiveProvRowActions] = useState<string | null>(null);
  const itemsPerPage = 10;

  const loadCatalogos = async () => {
    const listProv = await db.getProveedores();
    setProveedores(listProv);
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.actions-container')) {
        setActiveProvRowActions(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleCloseProvDrawer = () => {
    setEditingProveedor(null);
    setShowProvForm(false);
    setProvForm({ nombreComercial: '', nit: '', contactoNombre: '', telefono: '', correo: '' });
  };

  const handleSaveProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provForm.nombreComercial || !provForm.nit) return;

    const nuevoProv: Proveedor = {
      id: editingProveedor?.id || 'prov_' + Math.random().toString(36).substr(2, 9),
      nombreComercial: provForm.nombreComercial,
      nit: provForm.nit,
      contactoNombre: provForm.contactoNombre,
      telefono: provForm.telefono,
      correo: provForm.correo
    };

    await db.saveProveedor(nuevoProv);
    handleCloseProvDrawer();
    loadCatalogos();
    if (onRefresh) onRefresh();
    showToast(editingProveedor ? 'Proveedor actualizado correctamente.' : 'Proveedor registrado correctamente.', 'success');
  };

  const handleEditProveedor = (prov: Proveedor) => {
    setEditingProveedor(prov);
    setProvForm({
      nombreComercial: prov.nombreComercial,
      nit: prov.nit,
      contactoNombre: prov.contactoNombre || '',
      telefono: prov.telefono || '',
      correo: prov.correo || ''
    });
  };

  const handleDeleteProveedor = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este proveedor? Las facturas asociadas a él mostrarán "Desconocido".')) {
      await db.deleteProveedor(id);
      loadCatalogos();
      if (onRefresh) onRefresh();
    }
  };

  // --- LÓGICA FILTRADO Y PAGINACIÓN PROVEEDORES ---
  const filteredProveedores = proveedores.filter(p => {
    const searchLower = provSearch.toLowerCase();
    return (
      p.nombreComercial.toLowerCase().includes(searchLower) ||
      p.nit.toLowerCase().includes(searchLower) ||
      (p.contactoNombre || '').toLowerCase().includes(searchLower)
    );
  });
  const totalProvItems = filteredProveedores.length;
  const totalProvPages = Math.ceil(totalProvItems / itemsPerPage) || 1;
  const activeProvPage = Math.min(provPage, totalProvPages);
  const startProvIdx = (activeProvPage - 1) * itemsPerPage;
  const paginatedProveedores = filteredProveedores.slice(startProvIdx, startProvIdx + itemsPerPage);

  return (
    <>
      <div className="mixo-card" style={{ padding: '24px', width: '100%' }}>
        <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h2>Catálogo de Proveedores Activos</h2>
          <button 
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingProveedor(null);
              setShowProvForm(true);
            }}
          >
            Registrar Proveedor
          </button>
        </div>
        <span className="text-secondary">Proveedores registrados disponibles para registrar facturas de compra.</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, marginTop: '12px' }}>
          {/* Buscador */}
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              className="search-input"
              placeholder="Buscar por nombre, NIT o contacto..." 
              value={provSearch}
              onChange={e => { setProvSearch(e.target.value); setProvPage(1); }}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="text-left">Nombre Comercial</th>
                  <th className="text-left">NIT</th>
                  <th className="text-left">Contacto</th>
                  <th className="text-left">Teléfono / Correo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProveedores.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No se encontraron proveedores.
                    </td>
                  </tr>
                ) : (
                  paginatedProveedores.map(p => (
                    <tr key={p.id}>
                      <td className="text-left cell-truncate" title={p.nombreComercial}>
                        <strong>{p.nombreComercial}</strong>
                      </td>
                      <td className="text-left cell-truncate" title={p.nit}>{p.nit}</td>
                      <td className="text-left cell-truncate" title={p.contactoNombre || '-'}>{p.contactoNombre || '-'}</td>
                      <td className="text-left">
                        {p.telefono || p.correo ? (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }} title={`${p.telefono || ''} ${p.correo || ''}`}>
                            {p.telefono || p.correo}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-right">
                        <div className="actions-container">
                          <button 
                            type="button" 
                            className="btn-actions-trigger" 
                            onClick={() => setActiveProvRowActions(activeProvRowActions === p.id ? null : p.id)}
                          >
                            ⋮
                          </button>
                          {activeProvRowActions === p.id && (
                            <div className="actions-dropdown">
                              <button type="button" onClick={() => { handleEditProveedor(p); setShowProvForm(true); setActiveProvRowActions(null); }}>
                                Editar
                              </button>
                              <button type="button" className="danger" onClick={() => { handleDeleteProveedor(p.id); setActiveProvRowActions(null); }}>
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex-row-between" style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <span className="text-secondary" style={{ fontSize: '13px' }}>
              Mostrando {totalProvItems === 0 ? 0 : startProvIdx + 1} - {Math.min(startProvIdx + itemsPerPage, totalProvItems)} de {totalProvItems} proveedores
            </span>
            <div className="flex-gap-16">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setProvPage(prev => Math.max(prev - 1, 1))}
                disabled={activeProvPage === 1}
                style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
              >
                Anterior
              </button>
              <span className="flex-center" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                Pág. {activeProvPage} de {totalProvPages}
              </span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setProvPage(prev => Math.min(prev + 1, totalProvPages))}
                disabled={activeProvPage === totalProvPages}
                style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop del Drawer de Proveedores */}
      <div 
        className={`drawer-backdrop ${showProvForm || editingProveedor !== null ? 'open' : ''}`} 
        onClick={handleCloseProvDrawer}
      />

      {/* Drawer Panel de Proveedores */}
      <div className={`drawer-panel ${showProvForm || editingProveedor !== null ? 'open' : ''}`}>
        <form onSubmit={handleSaveProveedor} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="drawer-header">
            <h2>{editingProveedor ? 'Modificar Proveedor' : 'Nuevo Proveedor'}</h2>
            <button 
              type="button" 
              className="drawer-close-btn" 
              onClick={handleCloseProvDrawer}
            >
              ×
            </button>
          </div>

          <div className="drawer-body">
            <span className="text-secondary" style={{ fontSize: '13px' }}>
              Defina los detalles fiscales y de contacto de su proveedor.
            </span>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>Nombre Comercial / Razón Social</label>
              <input 
                type="text" 
                placeholder="ej. Distribuidora F&B S.A." 
                value={provForm.nombreComercial}
                onChange={e => setProvForm({ ...provForm, nombreComercial: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>NIT / Identificador Fiscal</label>
              <input 
                type="text" 
                placeholder="ej. 800.124.556-9" 
                value={provForm.nit}
                onChange={e => setProvForm({ ...provForm, nit: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Nombre del Contacto</label>
              <input 
                type="text" 
                placeholder="ej. Juan Carlos Gómez" 
                value={provForm.contactoNombre}
                onChange={e => setProvForm({ ...provForm, contactoNombre: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <input 
                type="text" 
                placeholder="ej. +57 312 456 7890" 
                value={provForm.telefono}
                onChange={e => setProvForm({ ...provForm, telefono: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                placeholder="ej. ventas@distribuidorafb.com" 
                value={provForm.correo}
                onChange={e => setProvForm({ ...provForm, correo: e.target.value })}
              />
            </div>
          </div>

          <div className="drawer-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCloseProvDrawer}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '160px' }}>
              {editingProveedor ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
