import React, { useState } from 'react';
import { db } from '../../services/db';
import type { Ingrediente, Receta, LoteProduccion, ConfiguracionCostos } from '../../services/db';
import { ConfirmModal } from '../ConfirmModal';
import { RecipeTable } from './recetas/RecipeTable';
import { RecipeDrawer } from './recetas/RecipeDrawer';

interface RecetasTabProps {
  recetas: Receta[];
  ingredientes: Ingrediente[];
  lotesProduccion: LoteProduccion[];
  config: ConfiguracionCostos;
  onRefresh: () => void;
  onShowTechnicalSheet: (receta: Receta) => void;
}

export const RecetasTab: React.FC<RecetasTabProps> = ({
  recetas,
  ingredientes,
  lotesProduccion,
  onRefresh,
  onShowTechnicalSheet
}) => {
  const [editingReceta, setEditingReceta] = useState<Receta | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Receta | null>(null);

  const handleEditReceta = (rec: Receta) => {
    setEditingReceta(rec);
  };

  const handleCreateNewReceta = () => {
    setEditingReceta({ id: 'new' } as any);
  };

  const handleDeleteReceta = (receta: Receta) => {
    setRecipeToDelete(receta);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Listado de Recetas */}
      <div className="mixo-card" style={{ padding: '24px', width: '100%' }}>
        <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h2>Recetario y Fichas Técnicas</h2>
          <div className="flex-gap-16">
            <button className="btn btn-primary" onClick={handleCreateNewReceta}>
              Crear Nueva Receta
            </button>
          </div>
        </div>

        <RecipeTable
          recetas={recetas}
          lotesProduccion={lotesProduccion}
          ingredientes={ingredientes}
          onEdit={handleEditReceta}
          onDelete={handleDeleteReceta}
          onShowTechnicalSheet={onShowTechnicalSheet}
        />
      </div>

      {/* Drawer Panel Principal de Receta */}
      <RecipeDrawer
        isOpen={editingReceta !== null}
        onClose={() => setEditingReceta(null)}
        editingReceta={editingReceta}
        recetas={recetas}
        ingredientes={ingredientes}
        onRefresh={onRefresh}
      />

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={recipeToDelete !== null}
        title="Eliminar Receta"
        message={recipeToDelete ? `¿Estás seguro de que deseas eliminar la receta ${recipeToDelete.nombre}? Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDanger={true}
        onCancel={() => setRecipeToDelete(null)}
        onConfirm={async () => {
          if (recipeToDelete) {
            await db.deleteReceta(recipeToDelete.id);
            setRecipeToDelete(null);
            onRefresh();
          }
        }}
      />
    </div>
  );
};
