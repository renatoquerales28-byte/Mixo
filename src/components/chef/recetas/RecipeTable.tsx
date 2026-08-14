import React, { useState } from 'react';
import type { Ingrediente, Receta, LoteProduccion, IngredienteReceta } from '../../../services/db';
import { db } from '../../../services/db';

interface RecipeTableProps {
  recetas: Receta[];
  lotesProduccion: LoteProduccion[];
  ingredientes: Ingrediente[];
  onEdit: (rec: Receta) => void;
  onDelete: (rec: Receta) => void;
  onShowTechnicalSheet: (rec: Receta) => void;
}

export const RecipeTable: React.FC<RecipeTableProps> = ({
  recetas,
  lotesProduccion,
  ingredientes,
  onEdit,
  onDelete,
  onShowTechnicalSheet
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

  const filteredRecetas = recetas.filter(rec => {
    const searchLower = searchQuery.toLowerCase();
    return (
      rec.nombre.toLowerCase().includes(searchLower) ||
      (rec.esSubReceta ? 'sub-receta' : 'plato final').includes(searchLower) ||
      (rec.codigoIntegracionPOS || '').toLowerCase().includes(searchLower)
    );
  });

  const totalItems = filteredRecetas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedRecetas = filteredRecetas.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Buscador */}
      <div style={{ marginBottom: '16px' }}>
        <input 
          type="text" 
          className="search-input"
          placeholder="Buscar fórmulas por nombre, tipo o código SKU..." 
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="text-left">Receta / Plato</th>
              <th className="text-center">Tipo</th>
              <th className="text-right">Rendimiento del Lote</th>
              <th className="text-right">Costo de Insumos</th>
              <th className="text-right">Costo por Porción</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecetas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No se encontraron recetas.
                </td>
              </tr>
            ) : (
              paginatedRecetas.map(rec => {
                const costoLote = getCostoTotalLote(rec.ingredientes);
                const costoPorcion = costoLote / rec.cantidadRendimiento;

                // Buscar último lote de producción de esta receta
                const lotesReceta = lotesProduccion
                  .filter(l => l.recetaId === rec.id)
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                const ultimoLote = lotesReceta[0];

                return (
                  <tr key={rec.id}>
                    <td className="text-left">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="cell-truncate" title={rec.nombre} style={{ fontWeight: 'bold' }}>
                          {rec.nombre}
                        </span>
                        {rec.codigoIntegracionPOS && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '4px' }} title={`SKU POS: ${rec.codigoIntegracionPOS}`}>
                            (SKU: {rec.codigoIntegracionPOS})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        {rec.esSubReceta ? 'Sub-receta' : 'Plato Final'}
                      </span>
                    </td>
                    <td className="text-right">
                      {rec.cantidadRendimiento} {rec.unidadRendimiento === 'porciones' ? 'porciones' : rec.unidadRendimiento === 'litro' ? 'L' : rec.unidadRendimiento}
                    </td>
                    <td className="text-right">
                      Teór: ${costoLote.toFixed(2)}{ultimoLote && ` | Real: $${ultimoLote.costoTotalInsumos.toFixed(2)}`}
                    </td>
                    <td className="text-right">
                      <strong>Teór: ${costoPorcion.toFixed(2)}</strong>{ultimoLote && ` | Real: $${ultimoLote.costoPorcionReal.toFixed(2)}`}
                    </td>
                    <td className="text-right">
                      <div className="actions-container">
                        <button 
                          type="button" 
                          className="btn-actions-trigger" 
                          onClick={() => setActiveRowActions(activeRowActions === rec.id ? null : rec.id)}
                        >
                          ⋮
                        </button>
                        {activeRowActions === rec.id && (
                          <div className="actions-dropdown">
                            <button type="button" onClick={() => { onShowTechnicalSheet(rec); setActiveRowActions(null); }}>
                              Ficha Técnica
                            </button>
                            <button type="button" onClick={() => { onEdit(rec); setActiveRowActions(null); }}>
                              Editar
                            </button>
                            <button type="button" className="danger" onClick={() => { onDelete(rec); setActiveRowActions(null); }}>
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
          Mostrando {totalItems === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} recetas
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
