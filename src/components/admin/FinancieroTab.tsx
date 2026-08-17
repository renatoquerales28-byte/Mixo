import React, { useState, useEffect } from 'react';
import type { ConfiguracionCostos } from '../../services/db';
import { useToast } from '../../hooks/useToast';

interface FinancieroTabProps {
  config: ConfiguracionCostos;
  onUpdateConfig: (newConfig: ConfiguracionCostos) => void;
}

export const FinancieroTab: React.FC<FinancieroTabProps> = ({ config, onUpdateConfig }) => {
  const { showToast } = useToast();
  const [localConfig, setLocalConfig] = useState<any | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localConfig) return;
    const parsedConfig: ConfiguracionCostos = {
      alquiler: Number(localConfig.alquiler) || 0,
      serviciosPublicos: Number(localConfig.serviciosPublicos) || 0,
      nominaAdministrativa: Number(localConfig.nominaAdministrativa) || 0,
      otrosGastos: Number(localConfig.otrosGastos) || 0,
      platosProyectadosMensuales: Number(localConfig.platosProyectadosMensuales) || 1,
      margenAlimentosObjetivo: Number(localConfig.margenAlimentosObjetivo) || 30,
      factorCondimentoGlobal: Number(localConfig.factorCondimentoGlobal) || 0,
      porcentajeImpuestos: Number(localConfig.porcentajeImpuestos) || 0
    };
    onUpdateConfig(parsedConfig);
    showToast('Configuración guardada correctamente.', 'success');
  };

  return (
    <form className="mixo-card" onSubmit={handleSubmit} style={{ padding: '16px' }}>
      <h2>Configuración Financiera</h2>
      <span className="text-secondary">Define los costos fijos del local y las metas de rentabilidad por plato.</span>

      <div className="grid-cols-2" style={{ marginTop: '16px' }}>
        <div className="mixo-card" style={{ padding: '16px', backgroundColor: 'var(--color-bg-base)' }}>
          <h3>Gastos Fijos Mensuales</h3>
          
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Alquiler / Arrendamiento local</label>
            <input 
              type="number"
              value={localConfig?.alquiler !== undefined ? localConfig.alquiler : config.alquiler}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, alquiler: e.target.value } : null)}
            />
          </div>

          <div className="form-group">
            <label>Servicios Públicos (Gas, Energía, Agua, Net)</label>
            <input 
              type="number"
              value={localConfig?.serviciosPublicos !== undefined ? localConfig.serviciosPublicos : config.serviciosPublicos}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, serviciosPublicos: e.target.value } : null)}
            />
          </div>

          <div className="form-group">
            <label>Nómina Administrativa (Propietario, admin)</label>
            <input 
              type="number"
              value={localConfig?.nominaAdministrativa !== undefined ? localConfig.nominaAdministrativa : config.nominaAdministrativa}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, nominaAdministrativa: e.target.value } : null)}
            />
          </div>

          <div className="form-group">
            <label>Otros Costos Operativos Generales</label>
            <input 
              type="number"
              value={localConfig?.otrosGastos !== undefined ? localConfig.otrosGastos : config.otrosGastos}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, otrosGastos: e.target.value } : null)}
            />
          </div>

          <div className="form-group" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '12px' }}>
            <label><strong>Volumen Proyectado Mensual (Platos Vendidos)</strong></label>
            <input 
              type="number"
              value={localConfig?.platosProyectadosMensuales !== undefined ? localConfig.platosProyectadosMensuales : config.platosProyectadosMensuales}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, platosProyectadosMensuales: e.target.value } : null)}
            />
            <span className="text-secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
              Usado para prorratear los gastos fijos por plato de forma automática. 
              Costo Indirecto actual por plato: <strong>${((Number(localConfig?.alquiler || config.alquiler) + Number(localConfig?.serviciosPublicos || config.serviciosPublicos) + Number(localConfig?.nominaAdministrativa || config.nominaAdministrativa) + Number(localConfig?.otrosGastos || config.otrosGastos)) / Number(localConfig?.platosProyectadosMensuales || config.platosProyectadosMensuales || 1)).toFixed(2)}</strong>
            </span>
          </div>
        </div>

        <div className="mixo-card" style={{ padding: '16px', backgroundColor: 'var(--color-bg-base)' }}>
          <h3>Metas de Rentabilidad</h3>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label><strong>Food Cost Objetivo (%)</strong></label>
            <input 
              type="number"
              min="1"
              max="99"
              value={localConfig?.margenAlimentosObjetivo !== undefined ? localConfig.margenAlimentosObjetivo : config.margenAlimentosObjetivo}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, margenAlimentosObjetivo: e.target.value } : null)}
            />
            <span className="text-secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
              El estándar gastronómico sugerido es del 28% al 35%.
              Actualmente: <strong>Los insumos representan el {localConfig?.margenAlimentosObjetivo || config.margenAlimentosObjetivo}%</strong> del precio de venta, el <strong>{100 - Number(localConfig?.margenAlimentosObjetivo || config.margenAlimentosObjetivo)}%</strong> restante cubre operación y utilidad.
            </span>
          </div>

          <div className="form-group">
            <label><strong>Ajuste de Condimentos (%)</strong></label>
            <input 
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={localConfig?.factorCondimentoGlobal !== undefined ? localConfig.factorCondimentoGlobal : config.factorCondimentoGlobal}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, factorCondimentoGlobal: e.target.value } : null)}
            />
            <span className="text-secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
              Mixo sumará automáticamente este porcentaje al costo de insumos de cada receta para cubrir especias, sal y aceites base sin forzar al chef a medirlos.
            </span>
          </div>

          <div className="form-group">
            <label>Impuesto de Ventas / Impuesto al Consumo / IVA (%)</label>
            <input 
              type="number"
              value={localConfig?.porcentajeImpuestos !== undefined ? localConfig.porcentajeImpuestos : config.porcentajeImpuestos}
              onChange={e => setLocalConfig((prev: any) => prev ? { ...prev, porcentajeImpuestos: e.target.value } : null)}
            />
            <span className="text-secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
              Se aplica de forma aditiva sobre el precio de venta sugerido neto, protegiendo su margen real.
            </span>
          </div>

          <div className="mixo-card" style={{ marginTop: '16px', padding: '12px' }}>
            <h4>Ejemplo de Cálculo de Precio Sugerido:</h4>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              Si un plato tiene costo de insumos de <strong>$2.00</strong>:
              <br />• Con ajuste de condimentos ({localConfig?.factorCondimentoGlobal || config.factorCondimentoGlobal}%): <strong>${(2.00 * (1 + Number(localConfig?.factorCondimentoGlobal || config.factorCondimentoGlobal)/100)).toFixed(2)}</strong>
              <br />• Sumando gastos fijos prorrateados: <strong>${(2.00 * (1 + Number(localConfig?.factorCondimentoGlobal || config.factorCondimentoGlobal)/100) + ((Number(localConfig?.alquiler || config.alquiler) + Number(localConfig?.serviciosPublicos || config.serviciosPublicos) + Number(localConfig?.nominaAdministrativa || config.nominaAdministrativa) + Number(localConfig?.otrosGastos || config.otrosGastos)) / Number(localConfig?.platosProyectadosMensuales || config.platosProyectadosMensuales || 1))).toFixed(2)}</strong>
              <br />• Precio sugerido neto (Food Cost {localConfig?.margenAlimentosObjetivo || config.margenAlimentosObjetivo}%): <strong>${((2.00 * (1 + Number(localConfig?.factorCondimentoGlobal || config.factorCondimentoGlobal)/100) + ((Number(localConfig?.alquiler || config.alquiler) + Number(localConfig?.serviciosPublicos || config.serviciosPublicos) + Number(localConfig?.nominaAdministrativa || config.nominaAdministrativa) + Number(localConfig?.otrosGastos || config.otrosGastos)) / Number(localConfig?.platosProyectadosMensuales || config.platosProyectadosMensuales || 1))) / (Number(localConfig?.margenAlimentosObjetivo || config.margenAlimentosObjetivo) / 100)).toFixed(2)}</strong>
              <br />• Precio con impuestos ({localConfig?.porcentajeImpuestos || config.porcentajeImpuestos}% IVA): <strong>${(((2.00 * (1 + Number(localConfig?.factorCondimentoGlobal || config.factorCondimentoGlobal)/100) + ((Number(localConfig?.alquiler || config.alquiler) + Number(localConfig?.serviciosPublicos || config.serviciosPublicos) + Number(localConfig?.nominaAdministrativa || config.nominaAdministrativa) + Number(localConfig?.otrosGastos || config.otrosGastos)) / Number(localConfig?.platosProyectadosMensuales || config.platosProyectadosMensuales || 1))) / (Number(localConfig?.margenAlimentosObjetivo || config.margenAlimentosObjetivo) / 100)) * (1 + Number(localConfig?.porcentajeImpuestos || config.porcentajeImpuestos) / 100)).toFixed(2)}</strong>
            </p>
          </div>
        </div>
      </div>
      <div className="flex-row-between" style={{ marginTop: '16px' }}>
        <div></div>
        <button type="submit" className="btn btn-primary" style={{ minWidth: '180px' }}>
          Guardar Configuración
        </button>
      </div>
    </form>
  );
};
