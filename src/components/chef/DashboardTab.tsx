import React from 'react';
import type { Ingrediente, Receta, LoteProduccion, IngredienteReceta } from '../../services/db';

interface DashboardTabProps {
  ingredientes: Ingrediente[];
  recetas: Receta[];
  lotesProduccion: LoteProduccion[];
  onSwitchTab: (tab: 'dashboard' | 'insumos' | 'recetas' | 'lotes') => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  ingredientes,
  recetas,
  lotesProduccion,
  onSwitchTab
}) => {

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

  // 1. Insumos sin compras registradas
  const insumosSinCosto = ingredientes.filter(ing => (ing.precioActivo || 0) === 0);

  // Insumos con Stock Bajo
  const insumosBajoStock = ingredientes.filter(ing => 
    ing.stockActual !== undefined && 
    ing.stockMinimo !== undefined && 
    ing.stockActual < ing.stockMinimo
  );

  // Insumos vencidos o próximos a vencer (dentro de los próximos 3 días)
  const insumosVencimiento = ingredientes
    .map(ing => {
      if (!ing.fechaVencimiento) return null;
      const diff = new Date(ing.fechaVencimiento).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return { ing, days };
    })
    .filter((item): item is NonNullable<typeof item> => 
      item !== null && (item.days < 0 || item.days <= 3)
    )
    .sort((a, b) => a.days - b.days);

  // 2. Últimos 3 lotes de producción cocinados
  const ultimosLotes = [...lotesProduccion]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 3);

  // Helper para costo total teórico de una receta
  const getCostoTotalTeoricoLote = (ings: IngredienteReceta[]): number => {
    let total = 0;
    ings.forEach(item => {
      if (item.esRecetaAnidada) {
        const sub = recetas.find(r => r.id === item.ingredienteId);
        if (sub) {
          const costoSubTotal = getCostoTotalTeoricoLote(sub.ingredientes);
          const costoGramo = costoSubTotal / sub.cantidadRendimiento;
          total += costoGramo * item.cantidadRequerida;
        }
      } else {
        const ing = ingredientes.find(i => i.id === item.ingredienteId);
        if (ing) {
          total += (ing.precioActivo || 0) * item.cantidadRequerida;
        }
      }
    });
    return total;
  };

  // 3. Calcular desviaciones críticas (Costo Real vs Teórico de las recetas)
  const desviaciones = recetas
    .map(rec => {
      const costoTeoricoLote = getCostoTotalTeoricoLote(rec.ingredientes);
      const costoTeoricoPorcion = costoTeoricoLote / rec.cantidadRendimiento;

      // Buscar último lote
      const lotes = lotesProduccion
        .filter(l => l.recetaId === rec.id)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const ultimoLote = lotes[0];

      if (!ultimoLote) return null;

      const desviacionAbs = ultimoLote.costoPorcionReal - costoTeoricoPorcion;
      const desviacionPct = costoTeoricoPorcion > 0 ? (desviacionAbs / costoTeoricoPorcion) * 100 : 0;

      return {
        receta: rec,
        teorico: costoTeoricoPorcion,
        real: ultimoLote.costoPorcionReal,
        pct: desviacionPct
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.pct > 3) // Desviación mayor al 3%
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  // 4. Calcular recetas/sub-recetas que están por debajo de su stock mínimo
  const recetasBajoStock = recetas.filter(rec => 
    (rec.esSubReceta || rec.modoDescuento === 'produccion_previa') &&
    rec.stockMinimo !== undefined && 
    (rec.stockActual || 0) < rec.stockMinimo
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* SECCIÓN 1: FINANZAS Y CONTROL DE COSTOS */}
      <div className="grid-cols-2" style={{ gap: '16px' }}>
        {/* Alerta de Aumento de Costos */}
        <div className="mixo-card">
          <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3>Aumento de Costos en Platos</h3>
            <button className="btn btn-action" onClick={() => onSwitchTab('recetas')} style={{ fontSize: '12px' }}>
              Ver Recetario →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {desviaciones.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px', color: '#81c784' }}>
                ✓ ¡Excelente! Ningún plato ha registrado un aumento de costos en sus últimos lotes.
              </p>
            ) : (
              desviaciones.map(item => (
                <div key={item.receta.id} className="flex-row-between" style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 138, 128, 0.03)', borderRadius: 'var(--border-radius-card)' }}>
                  <div>
                    <strong>{item.receta.nombre}</strong>
                    <div className="text-secondary" style={{ fontSize: '11px', marginTop: '2px' }}>
                      Costo Teórico: ${item.teorico.toFixed(2)} vs. Costo Lote: ${item.real.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-danger" style={{ fontWeight: 'bold', fontSize: '11px', padding: '2px 8px', borderRadius: '8px' }}>
                      +{item.pct.toFixed(1)}% Costo
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alertas de Costeo */}
        <div className="mixo-card">
          <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3>Falta Registrar Costo de Compra</h3>
            <button className="btn btn-action" onClick={() => onSwitchTab('insumos')} style={{ fontSize: '12px' }}>
              Ver Insumos →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insumosSinCosto.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px', color: '#81c784' }}>
                ✓ Todos los insumos tienen su costo registrado correctamente.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p className="text-secondary" style={{ fontSize: '12px', color: '#ffb300', margin: '0 0 4px 0' }}>
                  Hay insumos registrados sin costo. Registra facturas de compras para calcular costos reales.
                </p>
                {insumosSinCosto.slice(0, 3).map(ing => (
                  <div key={ing.id} className="flex-row-between" style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 179, 0, 0.03)', borderRadius: 'var(--border-radius-card)' }}>
                    <strong>{ing.nombre}</strong>
                    <span className="badge badge-warning" style={{ fontWeight: 'bold', fontSize: '11px' }}>
                      Sin Costo ($0.00)
                    </span>
                  </div>
                ))}
                {insumosSinCosto.length > 3 && (
                  <button
                    className="btn btn-action"
                    style={{ width: '100%', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}
                    onClick={() => onSwitchTab('insumos')}
                  >
                    Ver {insumosSinCosto.length - 3} insumos más →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CONTROL DE MATERIAS PRIMAS (STOCK Y VENCIMIENTOS) */}
      <div className="grid-cols-2" style={{ gap: '16px' }}>
        {/* Alerta de Stock Bajo */}
        <div className="mixo-card">
          <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3>Alertas de Stock Bajo</h3>
            <button className="btn btn-action" onClick={() => onSwitchTab('insumos')} style={{ fontSize: '12px' }}>
              Ver Inventario →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insumosBajoStock.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px', color: '#81c784' }}>
                ✓ Todos los insumos tienen niveles de stock saludables.
              </p>
            ) : (
              insumosBajoStock.slice(0, 3).map(ing => (
                <div key={ing.id} className="flex-row-between" style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 179, 0, 0.03)', borderRadius: 'var(--border-radius-card)' }}>
                  <div>
                    <strong>{ing.nombre}</strong>
                    <div className="text-secondary" style={{ fontSize: '11px', marginTop: '2px' }}>
                      Stock actual: {formatStockDisplay(ing.stockActual, ing.unidadReceta)} (Mín: {formatStockDisplay(ing.stockMinimo, ing.unidadReceta)})
                    </div>
                  </div>
                  <span className="badge badge-warning" style={{ fontWeight: 'bold', fontSize: '11px' }}>
                    Stock Bajo
                  </span>
                </div>
              ))
            )}
            {insumosBajoStock.length > 3 && (
              <button
                className="btn btn-action"
                style={{ width: '100%', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}
                onClick={() => onSwitchTab('insumos')}
              >
                Ver {insumosBajoStock.length - 3} insumos más →
              </button>
            )}
          </div>
        </div>

        {/* Alerta de Vencimiento */}
        <div className="mixo-card">
          <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3>Próximos a Vencer o Vencidos</h3>
            <button className="btn btn-action" onClick={() => onSwitchTab('insumos')} style={{ fontSize: '12px' }}>
              Ver Inventario →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insumosVencimiento.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px', color: '#81c784' }}>
                ✓ No hay insumos vencidos ni próximos a vencer.
              </p>
            ) : (
              insumosVencimiento.slice(0, 3).map(item => {
                const isExpired = item.days < 0;
                return (
                  <div key={item.ing.id} className="flex-row-between" style={{ 
                    padding: '10px 14px', 
                    backgroundColor: isExpired ? 'rgba(255, 138, 128, 0.03)' : 'rgba(255, 179, 0, 0.03)', 
                    borderRadius: 'var(--border-radius-card)'
                  }}>
                    <div>
                      <strong>{item.ing.nombre}</strong>
                      <div className="text-secondary" style={{ fontSize: '11px', marginTop: '2px' }}>
                        {isExpired 
                          ? `Venció el ${new Date(item.ing.fechaVencimiento!).toLocaleDateString()}` 
                          : `Vence el ${new Date(item.ing.fechaVencimiento!).toLocaleDateString()}`}
                      </div>
                    </div>
                    <span className={`badge ${isExpired ? 'badge-danger' : 'badge-warning'}`} style={{ 
                      fontWeight: 'bold', 
                      fontSize: '11px' 
                    }}>
                      {isExpired ? 'Vencido' : `Vence en ${item.days}d`}
                    </span>
                  </div>
                );
              })
            )}
            {insumosVencimiento.length > 3 && (
              <button
                className="btn btn-action"
                style={{ width: '100%', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}
                onClick={() => onSwitchTab('insumos')}
              >
                Ver {insumosVencimiento.length - 3} alertas más →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: COCINA Y TAREAS DE PRODUCCIÓN */}
      <div className="grid-cols-2" style={{ gap: '16px' }}>
        
        {/* Tareas de Producción */}
        <div className="mixo-card">
          <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3>Tareas de Producción para Hoy</h3>
            <button className="btn btn-action" onClick={() => onSwitchTab('lotes')} style={{ fontSize: '12px' }}>
              Cocinar Lote →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recetasBajoStock.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px', color: '#81c784' }}>
                ✓ Todo preparado. Tu stock de producción está completo.
              </p>
            ) : (
              recetasBajoStock.slice(0, 3).map(rec => {
                const stock = rec.stockActual || 0;
                const min = rec.stockMinimo || 0;
                const unitLabel = rec.unidadRendimiento === 'porciones' ? 'ud.' : rec.unidadRendimiento === 'litro' ? 'L' : rec.unidadRendimiento;
                return (
                  <div key={rec.id} className="flex-row-between" style={{ padding: '10px 14px', backgroundColor: 'rgba(99, 102, 241, 0.03)', borderRadius: 'var(--border-radius-card)', borderLeft: '3px solid var(--color-accent)' }}>
                    <div>
                      <strong>{rec.nombre}</strong>
                      <div className="text-secondary" style={{ fontSize: '11px', marginTop: '2px' }}>
                        Stock actual: {stock} {unitLabel} (Mínimo requerido: {min} {unitLabel})
                      </div>
                    </div>
                    <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '11px', padding: '2px 8px', borderRadius: '8px' }}>
                      Preparar Lote
                    </span>
                  </div>
                );
              })
            )}
            {recetasBajoStock.length > 3 && (
              <button
                className="btn btn-action"
                style={{ width: '100%', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}
                onClick={() => onSwitchTab('lotes')}
              >
                Ver {recetasBajoStock.length - 3} platos más →
              </button>
            )}
          </div>
        </div>

        {/* Historial de Cocina */}
        <div className="mixo-card">
          <div className="flex-row-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3>Últimos Lotes Producidos</h3>
            <button className="btn btn-action" onClick={() => onSwitchTab('lotes')} style={{ fontSize: '12px' }}>
              Ver Producción →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ultimosLotes.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                No hay lotes cocinados registrados. Inicia una sesión de cocina para calibrar tus costos reales.
              </p>
            ) : (
              ultimosLotes.map(lote => {
                const rec = recetas.find(r => r.id === lote.recetaId);
                return (
                  <div key={lote.id} className="flex-row-between" style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--border-radius-card)' }}>
                    <div>
                      <strong>{rec ? rec.nombre : 'Receta Eliminada'}</strong>
                      <div className="text-secondary" style={{ fontSize: '11px', marginTop: '2px' }}>
                        {new Date(lote.fecha).toLocaleDateString()} • {lote.cantidadProducida} {rec ? (rec.unidadRendimiento === 'porciones' ? 'porciones' : rec.unidadRendimiento === 'litro' ? 'L' : rec.unidadRendimiento) : 'porciones'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>${lote.costoPorcionReal.toFixed(2)}</strong>
                      <div className="text-secondary" style={{ fontSize: '10px' }}>c/u real</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
