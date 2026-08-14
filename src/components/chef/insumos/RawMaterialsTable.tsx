import React, { useState } from 'react';
import { db } from '../../../services/db';
import type { Ingrediente } from '../../../services/db';

interface RawMaterialsTableProps {
  ingredientes: Ingrediente[];
  onEdit: (ing: Ingrediente) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export const RawMaterialsTable: React.FC<RawMaterialsTableProps> = ({
  ingredientes,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRowActions, setActiveRowActions] = useState<string | null>(null);
  const itemsPerPage = 10;

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.actions-container')) {
        setActiveRowActions(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const formatCostDisplay = (precioBase: number, unidad: string) => {
    if (precioBase === 0) return 'Sin compra registrada';
    if (unidad === 'g') return `$${(precioBase * 1000).toFixed(2)} / kg`;
    if (unidad === 'ml') return `$${(precioBase * 1000).toFixed(2)} / L`;
    return `$${precioBase.toFixed(2)} / ud.`;
  };

  const formatStockDisplay = (stock: number | undefined, unidad: string) => {
    if (stock === undefined) return '-';
    if (unidad === 'g') {
      if (stock >= 1000) return `${(stock / 1000).toFixed(2)} kg`;
      return `${stock} g`;
    }
    if (unidad === 'ml') {
      if (stock >= 1000) return `${(stock / 1000).toFixed(2)} L`;
      return `${stock} ml`;
    }
    return `${stock} ud.`;
  };

  const handleStockMinBlur = async (ing: Ingrediente, value: string) => {
    const val = value === '' ? undefined : Number(value);
    if (val !== ing.stockMinimo) {
      const updated = { ...ing, stockMinimo: val };
      await db.saveIngrediente(updated);
      onRefresh();
    }
  };

  const handleStockMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const filteredIngredientes = ingredientes.filter(ing => {
    const searchLower = searchQuery.toLowerCase();
    const conservacionLabel = ing.conservacion === 'secos' ? 'secos almacén despensa' : ing.conservacion === 'refrigerado' ? 'refrigerado refrigeración' : 'congelado congelación';
    const perecibilidadLabel = ing.perecibilidad === 'alta' ? 'alta perecibilidad' : ing.perecibilidad === 'media' ? 'media' : 'baja no perecedero';
    return (
      ing.nombre.toLowerCase().includes(searchLower) ||
      conservacionLabel.includes(searchLower) ||
      perecibilidadLabel.includes(searchLower)
    );
  });

  const totalItems = filteredIngredientes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedIngredientes = filteredIngredientes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Buscador */}
      <div style={{ marginBottom: '16px' }}>
        <input 
          type="text" 
          className="search-input"
          placeholder="Buscar insumos por nombre o categoría..." 
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="text-left">Insumo</th>
              <th className="text-center" style={{ width: '220px' }}>Conservación / Rotación</th>
              <th className="text-right">Costo Compra</th>
              <th className="text-right">Costo Uso</th>
              <th className="text-right">Stock Actual</th>
              <th className="text-right" style={{ width: '140px' }}>Stock Mínimo</th>
              <th className="text-center">Vencimiento</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedIngredientes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No se encontraron insumos.
                </td>
              </tr>
            ) : (
              paginatedIngredientes.map(ing => {
                const precioActivo = ing.precioActivo || 0;
                const costoDeUso = precioActivo;
                const conservacionText = ing.conservacion === 'secos' ? 'Secos' : ing.conservacion === 'refrigerado' ? 'Refrigerado' : 'Congelado';
                const perecibilidadText = ing.perecibilidad === 'alta' ? 'Alta' : ing.perecibilidad === 'media' ? 'Media' : 'Baja (No perecedero)';
                const vidaUtilText = ing.diasVidaUtil ? ` (${ing.diasVidaUtil}d)` : '';
                return (
                  <tr key={ing.id}>
                    <td className="text-left cell-truncate" title={ing.nombre}>
                      <strong>{ing.nombre}</strong>
                    </td>
                    <td className="text-center">
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                        {`${conservacionText} / ${perecibilidadText}${vidaUtilText}`}
                      </span>
                    </td>
                    <td className="text-right">
                      {precioActivo === 0 ? (
                        <span style={{ color: 'var(--color-badge-warning-text)', fontSize: '14px', fontWeight: 500 }}>
                          Sin compra registrada
                        </span>
                      ) : (
                        formatCostDisplay(precioActivo, ing.unidadReceta)
                      )}
                    </td>
                    <td className="text-right">
                      {precioActivo === 0 ? (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>-</span>
                      ) : (
                        <>
                          <strong>${costoDeUso.toFixed(4)}</strong> / {ing.unidadReceta}
                        </>
                      )}
                    </td>
                    <td className="text-right">
                      {ing.stockActual !== undefined ? (
                        <span style={{
                          fontWeight: ing.stockMinimo !== undefined && ing.stockActual < ing.stockMinimo ? 600 : 400,
                          color: ing.stockMinimo !== undefined && ing.stockActual < ing.stockMinimo
                            ? 'var(--color-badge-danger-text)'
                            : 'inherit',
                        }}
                        title={ing.stockMinimo !== undefined && ing.stockActual < ing.stockMinimo ? 'Stock por debajo del mínimo' : undefined}
                        >
                          {formatStockDisplay(ing.stockActual, ing.unidadReceta)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          key={ing.id + '_min_' + (ing.stockMinimo ?? 'none')}
                          type="number"
                          min="0"
                          step="any"
                          defaultValue={ing.stockMinimo !== undefined ? ing.stockMinimo : ''}
                          placeholder="Sin mín"
                          onBlur={(e) => handleStockMinBlur(ing, e.target.value)}
                          onKeyDown={handleStockMinKeyDown}
                          style={{
                            width: '80px',
                            height: '32px',
                            padding: '0 8px',
                            fontSize: '13px',
                            textAlign: 'right',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-bg-base)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)'
                          }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', width: '24px', minWidth: '24px', textAlign: 'left' }}>
                          {ing.unidadReceta === 'unidad' ? 'ud.' : ing.unidadReceta}
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      {ing.fechaVencimiento ? (
                        (() => {
                          const fechaObj = new Date(ing.fechaVencimiento);
                          const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                          const diff = fechaObj.getTime() - Date.now();
                          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                          if (days < 0) {
                            return (
                              <span style={{ fontSize: '14px', color: 'var(--color-badge-danger-text)', fontWeight: 500 }}>
                                {fechaFormateada} — Vencido
                              </span>
                            );
                          } else if (days <= 3) {
                            return (
                              <span style={{ fontSize: '14px', color: 'var(--color-badge-warning-text)', fontWeight: 500 }}>
                                {fechaFormateada} — Vence en {days}d
                              </span>
                            );
                          }
                          return (
                            <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                              {fechaFormateada}
                            </span>
                          );
                        })()
                      ) : <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>—</span>}
                    </td>
                    <td className="text-right">
                      <div className="actions-container">
                        <button 
                          type="button" 
                          className="btn-actions-trigger" 
                          onClick={() => setActiveRowActions(activeRowActions === ing.id ? null : ing.id)}
                        >
                          ⋮
                        </button>
                        {activeRowActions === ing.id && (
                          <div className="actions-dropdown">
                            <button type="button" onClick={() => { onEdit(ing); setActiveRowActions(null); }}>
                              Editar
                            </button>
                            <button type="button" className="danger" onClick={() => { onDelete(ing.id); setActiveRowActions(null); }}>
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
          Mostrando {totalItems === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} insumos
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
  );
};
