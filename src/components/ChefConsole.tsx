import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import type { Ingrediente, Receta, ConfiguracionCostos, LoteProduccion } from '../services/db';
import { DashboardTab } from './chef/DashboardTab';
import { RecetasTab } from './chef/RecetasTab';
import { LotesTab } from './chef/LotesTab';
import { FichaTecnicaModal } from './chef/FichaTecnicaModal';
import { PlanificadorTab } from './chef/PlanificadorTab';

type ChefTab = 'dashboard' | 'recetas' | 'lotes' | 'planificador';

interface ChefConsoleProps {
  config: ConfiguracionCostos;
  activeTab: ChefTab;
  onChangeTab: (tab: ChefTab) => void;
  onRefreshData?: () => void;
  onSwitchTabGlobal?: (tab: string, section?: 'chef' | 'admin') => void;
}

export const ChefConsole: React.FC<ChefConsoleProps> = ({ config, activeTab, onChangeTab, onRefreshData, onSwitchTabGlobal }) => {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [lotesProduccion, setLotesProduccion] = useState<LoteProduccion[]>([]);
  const [showTechnicalSheet, setShowTechnicalSheet] = useState<Receta | null>(null);

  const loadData = async () => {
    const listIng = await db.getIngredientes();
    const listRec = await db.getRecetas();
    const listLotes = await db.getLotesProduccion();

    setIngredientes(listIng);
    setRecetas(listRec);
    setLotesProduccion(listLotes);

    if (onRefreshData) onRefreshData();
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset ficha técnica al cambiar de tab
  useEffect(() => {
    if (activeTab !== 'recetas') setShowTechnicalSheet(null);
  }, [activeTab]);

  return (
    <>
      {activeTab === 'dashboard' && (
        <DashboardTab
          ingredientes={ingredientes}
          recetas={recetas}
          lotesProduccion={lotesProduccion}
          onSwitchTab={(tab) => {
            if (tab === 'insumos') {
              if (onSwitchTabGlobal) onSwitchTabGlobal('insumos', 'admin');
            } else {
              onChangeTab(tab as ChefTab);
            }
          }}
        />
      )}



      {activeTab === 'recetas' && (
        <>
          <RecetasTab
            recetas={recetas}
            ingredientes={ingredientes}
            lotesProduccion={lotesProduccion}
            config={config}
            onRefresh={loadData}
            onShowTechnicalSheet={setShowTechnicalSheet}
          />
          {/* Ficha Técnica como drawer overlay — no reemplaza RecetasTab */}
          <div
            className={`drawer-backdrop ${showTechnicalSheet ? 'open' : ''}`}
            onClick={() => setShowTechnicalSheet(null)}
          />
          <div
            className={`drawer-panel ${showTechnicalSheet ? 'open' : ''}`}
            style={{ width: 'clamp(400px, 50vw, 700px)' }}
          >
            {showTechnicalSheet && (
              <div className="drawer-header">
                <h2 className="drawer-title">Ficha Técnica</h2>
                <button
                  type="button"
                  className="drawer-close"
                  onClick={() => setShowTechnicalSheet(null)}
                >
                  ×
                </button>
              </div>
            )}
            <div className="drawer-body" style={{ overflowY: 'auto', flex: 1 }}>
              {showTechnicalSheet && (
                <FichaTecnicaModal
                  receta={showTechnicalSheet}
                  recetas={recetas}
                  ingredientes={ingredientes}
                  lotesProduccion={lotesProduccion}
                  onClose={() => setShowTechnicalSheet(null)}
                />
              )}
            </div>
          </div>
        </>
      )}


      {activeTab === 'lotes' && (
        <LotesTab
          lotesProduccion={lotesProduccion}
          recetas={recetas}
          ingredientes={ingredientes}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'planificador' && (
        <PlanificadorTab
          recetas={recetas}
          ingredientes={ingredientes}
          config={config}
        />
      )}
    </>
  );
};
