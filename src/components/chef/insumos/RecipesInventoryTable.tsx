import React, { useState } from 'react';
import { db } from '../../../services/db';
import type { Receta } from '../../../services/db';

interface RecipesInventoryTableProps {
  recetas: Receta[];
  onRefresh: () => void;
}

export const RecipesInventoryTable: React.FC<RecipesInventoryTableProps> = ({
  recetas,
  onRefresh
}) => {
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeCurrentPage, setRecipeCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatRecipeStockDisplay = (stock: number | undefined, unidad: string) => {
    if (stock === undefined || stock === 0) return '0 ud.';
    const unitLabel = unidad === 'porciones' ? 'ud.' : unidad === 'litro' ? 'L' : unidad;
    return `${stock} ${unitLabel}`;
  };

  const handleRecipeStockMinBlur = async (rec: Receta, value: string) => {
    const val = value === '' ? undefined : Number(value);
    if (val !== rec.stockMinimo) {
      const updated = { ...rec, stockMinimo: val };
      await db.saveReceta(updated);
      onRefresh();
    }
  };

  const handleStockMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const filteredRecetas = recetas.filter(rec => {
    const searchLower = recipeSearchQuery.toLowerCase();
    const modoText = (rec.esSubReceta || rec.modoDescuento === 'produccion_previa') ? 'lote tanda bodega' : 'hecho al momento';
    return (
      rec.nombre.toLowerCase().includes(searchLower) ||
      (rec.esSubReceta ? 'sub-receta' : 'plato final').includes(searchLower) ||
      modoText.includes(searchLower)
    );
  });

  const totalRecipeItems = filteredRecetas.length;
  const totalRecipePages = Math.ceil(totalRecipeItems / itemsPerPage) || 1;
  const activeRecipePage = Math.min(recipeCurrentPage, totalRecipePages);
  const startRecipeIndex = (activeRecipePage - 1) * itemsPerPage;
  const paginatedRecetas = filteredRecetas.slice(startRecipeIndex, startRecipeIndex + itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Buscador de Recetas */}
      <div style={{ marginBottom: '16px' }}>
        <input 
          type="text" 
          className="search-input"
          placeholder="Buscar recetas por nombre o modo..." 
          value={recipeSearchQuery}
          onChange={e => { setRecipeSearchQuery(e.target.value); setRecipeCurrentPage(1); }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="text-left">Receta / Fórmula</th>
              <th className="text-center">Tipo</th>
              <th className="text-center" style={{ width: '280px' }}>Modo de Descuento</th>
              <th className="text-right">Stock Actual</th>
              <th className="text-right" style={{ width: '140px' }}>Stock Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecetas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No se encontraron recetas en el inventario.
                </td>
              </tr>
            ) : (
              paginatedRecetas.map(rec => {
                const isUnderMin = rec.stockMinimo !== undefined && (rec.stockActual || 0) < rec.stockMinimo;
                return (
                  <tr key={rec.id}>
                    <td className="text-left cell-truncate" title={rec.nombre}>
                      <strong>{rec.nombre}</strong>
                    </td>
                    <td className="text-center">
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        {rec.esSubReceta ? 'Sub-receta' : 'Plato Final'}
                      </span>
                    </td>
                    <td className="text-center">
                      {rec.esSubReceta || rec.modoDescuento === 'produccion_previa' ? (
                        <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
                          Lote / Stock (Bodega)
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success, #10b981)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
                          Hecho al momento
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <span style={{
                        fontWeight: isUnderMin ? 600 : 400,
                        color: isUnderMin ? 'var(--color-badge-danger-text)' : 'inherit'
                      }}>
                        {formatRecipeStockDisplay(rec.stockActual, rec.unidadRendimiento)}
                      </span>
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          key={rec.id + '_min_' + (rec.stockMinimo ?? 'none')}
                          type="number"
                          min="0"
                          step="any"
                          defaultValue={rec.stockMinimo !== undefined ? rec.stockMinimo : ''}
                          placeholder="Sin mín"
                          onBlur={(e) => handleRecipeStockMinBlur(rec, e.target.value)}
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
                          {rec.unidadRendimiento === 'porciones' ? 'ud.' : rec.unidadRendimiento === 'litro' ? 'L' : rec.unidadRendimiento}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación de Recetas */}
      <div className="flex-row-between" style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
        <span className="text-secondary" style={{ fontSize: '13px' }}>
          Mostrando {totalRecipeItems === 0 ? 0 : startRecipeIndex + 1} - {Math.min(startRecipeIndex + itemsPerPage, totalRecipeItems)} de {totalRecipeItems} recetas
        </span>
        <div className="flex-gap-16">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setRecipeCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={activeRecipePage === 1}
            style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
          >
            Anterior
          </button>
          <span className="flex-center" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Pág. {activeRecipePage} de {totalRecipePages}
          </span>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setRecipeCurrentPage(prev => Math.min(prev + 1, totalRecipePages))}
            disabled={activeRecipePage === totalRecipePages}
            style={{ height: '36px', minWidth: '80px', padding: '0 16px' }}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};
