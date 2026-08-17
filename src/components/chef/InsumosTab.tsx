import React, { useState } from 'react';
import { db } from '../../services/db';
import type { Ingrediente, Receta } from '../../services/db';
import { RawMaterialsTable } from './insumos/RawMaterialsTable';
import { RecipesInventoryTable } from './insumos/RecipesInventoryTable';
import { InsumoDrawer } from './insumos/InsumoDrawer';

interface InsumosTabProps {
  ingredientes: Ingrediente[];
  recetas: Receta[];
  onRefresh: () => void;
}

export const InsumosTab: React.FC<InsumosTabProps> = ({
  ingredientes,
  recetas,
  onRefresh
}) => {
  const [activeInventoryTab, setActiveInventoryTab] = useState<'materias_primas' | 'recetas'>('materias_primas');
  const [showInsumoForm, setShowInsumoForm] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingrediente | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleEditIngrediente = (ing: Ingrediente) => {
    setEditingIng(ing);
    setShowInsumoForm(true);
  };

  const handleDeleteIngrediente = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    await db.deleteIngrediente(confirmDeleteId);
    setConfirmDeleteId(null);
    onRefresh();
  };

  const tabs = [
    { key: 'materias_primas' as const, label: 'Materias Primas (Insumos)' },
    { key: 'recetas' as const, label: 'Productos Preparados (Recetas)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      <div className="mixo-card" style={{ padding: '24px', width: '100%' }}>
        {/* Cabecera Interna */}
        <div 
          className="flex-row-between" 
          style={{ 
            borderBottom: '1px solid var(--color-border)', 
            paddingBottom: '16px', 
            marginBottom: '16px', 
            minHeight: '40px', 
            alignItems: 'center',
            boxSizing: 'content-box'
          }}
        >
          <h2 style={{ margin: 0, lineHeight: 1.2 }}>Inventario y Costos de Insumos</h2>
          <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
            {activeInventoryTab === 'materias_primas' && (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => {
                  setEditingIng(null);
                  setShowInsumoForm(true);
                }}
              >
                + Nuevo Insumo
              </button>
            )}
          </div>
        </div>

        {/* Tabs internas */}
        <div
          className="tab-navigation"
          style={{
            display: 'flex',
            gap: '4px',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '16px',
            paddingBottom: '0',
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveInventoryTab(tab.key)}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: activeInventoryTab === tab.key ? '600' : '400',
                color: activeInventoryTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeInventoryTab === tab.key
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
                borderRadius: '0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeInventoryTab === 'materias_primas' ? (
          <RawMaterialsTable
            ingredientes={ingredientes}
            onEdit={handleEditIngrediente}
            onDelete={handleDeleteIngrediente}
            onRefresh={onRefresh}
          />
        ) : (
          <RecipesInventoryTable
            recetas={recetas}
            onRefresh={onRefresh}
          />
        )}
      </div>

      <InsumoDrawer
        isOpen={showInsumoForm}
        onClose={() => {
          setShowInsumoForm(false);
          setEditingIng(null);
        }}
        editingIng={editingIng}
        ingredientes={ingredientes}
        onRefresh={onRefresh}
      />

      {/* Modal de confirmación de eliminación */}
      {confirmDeleteId && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onClick={() => setConfirmDeleteId(null)}
          />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 1001, background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-card)',
              padding: '24px', minWidth: '320px', maxWidth: '400px'
            }}
          >
            <h3 style={{ marginBottom: '8px' }}>¿Eliminar insumo?</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Esta acción no se puede deshacer. El insumo será eliminado del catálogo.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" style={{ background: 'var(--color-danger, #ef5350)', borderColor: 'var(--color-danger, #ef5350)' }} onClick={handleConfirmDelete}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
