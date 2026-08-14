// Tipos de Datos Fuertes para el Ecosistema Mixo

export interface Ingrediente {
  id: string;
  nombre: string;
  unidadReceta: 'g' | 'ml' | 'unidad';
  precioActivo?: number; // Último precio de compra por unidadReceta
  ultimaActualizacion: string;
  stockActual?: number;
  stockMinimo?: number;
  fechaVencimiento?: string; // ISO date string
  conservacion: 'secos' | 'refrigerado' | 'congelado';
  perecibilidad: 'alta' | 'media' | 'baja';
  diasVidaUtil?: number;
}

export interface PasoPreparacion {
  numeroPaso: number;
  estacion: 'preparacion_fria' | 'estufa' | 'parrilla' | 'horno' | 'emplatado';
  descripcion: string;
  tiempoMinutos: number;
  temperaturaObjetivo?: number;
  ingredientesAsociados: string[]; // array de ingredienteId
}

export interface IngredienteReceta {
  ingredienteId: string; // ID de Ingrediente o Receta (sub-receta)
  esRecetaAnidada: boolean;
  cantidadRequerida: number; // en unidad de uso
}

export interface Receta {
  id: string;
  nombre: string;
  esSubReceta: boolean;
  codigoIntegracionPOS?: string; // SKU para Unify
  unidadRendimiento: 'kg' | 'litro' | 'porciones';
  cantidadRendimiento: number;
  vidaUtilHoras?: number;
  temperaturaAlmacenado?: string;
  alergenos: ('gluten' | 'lactosa' | 'frutos_secos' | 'mariscos' | 'huevo' | 'soya')[];
  ingredientes: IngredienteReceta[];
  pasos: PasoPreparacion[];
  tiempoPreparacionTotal: number;
  actualizadoPor: string;
  ultimaActualizacion: string;
  precioVentaMenu?: number; // Precio real al que se vende el plato en el restaurante
  stockActual?: number;
  stockMinimo?: number;
  modoDescuento?: 'explosion_ventas' | 'produccion_previa';
}

export interface ItemVenta {
  recetaId: string;
  cantidadVendida: number;
  precioCobrado: number;
}

export interface RegistroVentas {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  items: ItemVenta[];
  fechaRegistro: string;
  registradoPor: string;
}

export interface Proveedor {
  id: string;
  nombreComercial: string;
  nit: string;
  contactoNombre: string;
  telefono: string;
  correo: string;
}

export interface ItemFactura {
  ingredienteId: string;
  cantidadComprada: number;
  precioCompraAP: number;
  fechaVencimiento?: string;
}

export interface FacturaCompra {
  id: string;
  facturaNumero: string;
  proveedorId: string;
  fechaCompra: string;
  items: ItemFactura[];
  registradoPor: string;
}

export interface RegistroMermaOperativa {
  id: string;
  fechaMerma: string;
  tipoOrigen: 'ingrediente' | 'receta';
  referenciaId: string; // ID de ingrediente o receta
  cantidadPerdida: number;
  motivo: 'vencido' | 'quemado' | 'derrame_caida' | 'error_preparacion';
  costoPerdida: number;
  registradoPor: string;
}

export interface RegistroHistoricoPrecio {
  id: string;
  timestamp: string;
  ingredienteId: string;
  proveedorId: string;
  precioUnitarioAP: number;
  cantidad: number;
}

export interface InsumoUtilizado {
  ingredienteId: string;
  esRecetaAnidada: boolean;
  cantidadReal: number; // en unidadReceta
}

export interface LoteProduccion {
  id: string;
  fecha: string;
  recetaId: string;
  cantidadProducida: number; // Porciones reales obtenidas
  costoTotalInsumos: number; // Suma de costo uso de insumos reales
  costoPorcionReal: number;  // costoTotalInsumos / cantidadProducida
  insumos: InsumoUtilizado[];
  registradoPor: string;
}

export interface ConfiguracionCostos {
  alquiler: number;
  servicesPublicos?: number; // compatibilidad
  serviciosPublicos: number;
  nominaAdministrativa: number;
  otrosGastos: number;
  platosProyectadosMensuales: number;
  factorCondimentoGlobal: number; // ej: 2.0%
  margenAlimentosObjetivo: number; // ej: 30%
  porcentajeImpuestos: number; // ej: 8%
}

// Datos de Inicialización (Premium Mock Data)
const INGREDIENTES_INICIALES: Ingrediente[] = [
  {
    id: "ing_tomate_chonto",
    nombre: "Tomate Chonto",
    unidadReceta: "g",
    precioActivo: 0.0025,
    ultimaActualizacion: new Date().toISOString(),
    stockActual: 1500,
    stockMinimo: 5000,
    fechaVencimiento: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // vence en 2 días
    conservacion: "refrigerado",
    perecibilidad: "alta",
    diasVidaUtil: 7
  },
  {
    id: "ing_carne_molida",
    nombre: "Carne Molida de Res Premium",
    unidadReceta: "g",
    precioActivo: 0.0085,
    ultimaActualizacion: new Date().toISOString(),
    stockActual: 8000,
    stockMinimo: 3000,
    fechaVencimiento: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    conservacion: "refrigerado",
    perecibilidad: "alta",
    diasVidaUtil: 5
  },
  {
    id: "ing_pasta_lasana",
    nombre: "Placas de Pasta para Lasaña",
    unidadReceta: "g",
    precioActivo: 0.0024,
    ultimaActualizacion: new Date().toISOString(),
    stockActual: 5000,
    stockMinimo: 10000,
    fechaVencimiento: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // vencido hace 1 día
    conservacion: "secos",
    perecibilidad: "baja",
    diasVidaUtil: 365
  },
  {
    id: "ing_queso_mozzarella",
    nombre: "Queso Mozzarella Bloque",
    unidadReceta: "g",
    precioActivo: 0.007,
    ultimaActualizacion: new Date().toISOString(),
    stockActual: 4000,
    stockMinimo: 2000,
    fechaVencimiento: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000).toISOString(), // vence en 1.5 días
    conservacion: "refrigerado",
    perecibilidad: "media",
    diasVidaUtil: 21
  },
  {
    id: "ing_aceite_oliva",
    nombre: "Aceite de Oliva Extra Virgen",
    unidadReceta: "ml",
    precioActivo: 0.01,
    ultimaActualizacion: new Date().toISOString(),
    stockActual: 10000,
    stockMinimo: 5000,
    fechaVencimiento: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    conservacion: "secos",
    perecibilidad: "baja",
    diasVidaUtil: 365
  }
];

const CONFIGURACION_INICIAL: ConfiguracionCostos = {
  alquiler: 1200.0,
  serviciosPublicos: 450.0,
  nominaAdministrativa: 1800.0,
  otrosGastos: 250.0,
  platosProyectadosMensuales: 2500,
  factorCondimentoGlobal: 2.0,
  margenAlimentosObjetivo: 30.0,
  porcentajeImpuestos: 8.0
};

const PROVEEDORES_INICIALES: Proveedor[] = [
  {
    id: "prov_distribuidora_fb",
    nombreComercial: "Distribuidora F&B S.A.",
    nit: "800.124.556-9",
    contactoNombre: "Juan Carlos Gómez",
    telefono: "+57 312 456 7890",
    correo: "ventas@distribuidorafb.com"
  },
  {
    id: "prov_frubana",
    nombreComercial: "Frutas y Verduras El Proveedor",
    nit: "901.332.115-2",
    contactoNombre: "Marta Lucía Rincón",
    telefono: "+57 315 789 1234",
    correo: "pedidos@elproveedor.co"
  }
];

const KEYS = {
  INGREDIENTES: 'mixo_ingredientes',
  RECETAS: 'mixo_recetas',
  CONFIGURACION: 'mixo_configuracion',
  PROVEEDORES: 'mixo_proveedores',
  FACTURAS: 'mixo_facturas',
  HISTORICO_PRECIOS: 'mixo_historico_precios',
  MERMAS: 'mixo_mermas',
  LOTES_PRODUCCION: 'mixo_lotes_produccion',
  VENTAS: 'mixo_ventas'
};

class LocalDatabase {
  private get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  constructor() {
    // Limpiar categorías obsoletas
    localStorage.removeItem('mixo_categorias');

    // Inicializar tablas vacías/semilla
    if (!localStorage.getItem(KEYS.INGREDIENTES)) {
      this.set(KEYS.INGREDIENTES, INGREDIENTES_INICIALES);
    } else {
      // Migración: Si hay algún ingrediente con el esquema viejo, resetear o migrar
      const ingreds = this.get<any[]>(KEYS.INGREDIENTES, []);
      const tieneEsquemaViejo = ingreds.some(ing => 'unidadCompra' in ing || 'factorConversion' in ing);
      if (tieneEsquemaViejo) {
        this.set(KEYS.INGREDIENTES, INGREDIENTES_INICIALES);
        this.set(KEYS.FACTURAS, []);
        this.set(KEYS.HISTORICO_PRECIOS, []);
        this.set(KEYS.MERMAS, []);
        this.set(KEYS.LOTES_PRODUCCION, []);
        this.set(KEYS.VENTAS, []);
      } else {
        let migrado = false;
        const actualizados = ingreds.map(ing => {
          let updated = { ...ing };
          if ('categoriaId' in updated) {
            migrado = true;
            const catId = updated.categoriaId;
            if (catId === 'cat_verduras') {
              updated.conservacion = 'refrigerado';
              updated.perecibilidad = 'alta';
              updated.diasVidaUtil = 7;
            } else if (catId === 'cat_carnes') {
              updated.conservacion = 'refrigerado';
              updated.perecibilidad = 'alta';
              updated.diasVidaUtil = 5;
            } else if (catId === 'cat_lacteos') {
              updated.conservacion = 'refrigerado';
              updated.perecibilidad = 'media';
              updated.diasVidaUtil = 21;
            } else if (catId === 'cat_abarrotes') {
              updated.conservacion = 'secos';
              updated.perecibilidad = 'baja';
              updated.diasVidaUtil = 365;
            } else if (catId === 'cat_panaderia') {
              updated.conservacion = 'secos';
              updated.perecibilidad = 'media';
              updated.diasVidaUtil = 5;
            } else {
              updated.conservacion = 'secos';
              updated.perecibilidad = 'media';
              updated.diasVidaUtil = 7;
            }
            delete updated.categoriaId;
          }
          if (updated.stockActual === undefined) {
            migrado = true;
            updated.stockActual = 10000;
            updated.stockMinimo = 5000;
            updated.fechaVencimiento = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
          }
          if (updated.conservacion === undefined) {
            migrado = true;
            updated.conservacion = 'secos';
            updated.perecibilidad = 'media';
            updated.diasVidaUtil = 7;
          }
          return updated;
        });
        if (migrado) {
          this.set(KEYS.INGREDIENTES, actualizados);
        }
      }
    }
    if (!localStorage.getItem(KEYS.CONFIGURACION)) {
      this.set(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
    }
    if (!localStorage.getItem(KEYS.PROVEEDORES)) {
      this.set(KEYS.PROVEEDORES, PROVEEDORES_INICIALES);
    }
    if (!localStorage.getItem(KEYS.RECETAS)) {
      this.set(KEYS.RECETAS, []);
    }
    if (!localStorage.getItem(KEYS.FACTURAS)) {
      this.set(KEYS.FACTURAS, []);
    }
    if (!localStorage.getItem(KEYS.HISTORICO_PRECIOS)) {
      this.set(KEYS.HISTORICO_PRECIOS, []);
    }
    if (!localStorage.getItem(KEYS.MERMAS)) {
      this.set(KEYS.MERMAS, []);
    }
    if (!localStorage.getItem(KEYS.LOTES_PRODUCCION)) {
      this.set(KEYS.LOTES_PRODUCCION, []);
    }
    if (!localStorage.getItem(KEYS.VENTAS)) {
      this.set(KEYS.VENTAS, []);
    }
  }

  // --- MÓDULO 1: INGREDIENTES ---
  async getIngredientes(): Promise<Ingrediente[]> {
    return this.get<Ingrediente[]>(KEYS.INGREDIENTES, []);
  }

  async saveIngrediente(ingrediente: Ingrediente): Promise<Ingrediente[]> {
    const ingredientes = await this.getIngredientes();
    const index = ingredientes.findIndex(i => i.id === ingrediente.id);
    const anterior = index >= 0 ? ingredientes[index] : null;
    
    ingrediente.ultimaActualizacion = new Date().toISOString();
    
    const precioCambio = !anterior || anterior.precioActivo !== ingrediente.precioActivo;
    if (precioCambio && ingrediente.precioActivo !== undefined && ingrediente.precioActivo > 0) {
      const historicos = this.get<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);
      const nuevoHistorico: RegistroHistoricoPrecio = {
        id: 'hist_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ingredienteId: ingrediente.id,
        proveedorId: 'ajuste_manual',
        precioUnitarioAP: ingrediente.precioActivo,
        cantidad: 0
      };
      historicos.push(nuevoHistorico);
      this.set(KEYS.HISTORICO_PRECIOS, historicos);
    }

    if (index >= 0) {
      ingredientes[index] = ingrediente;
    } else {
      ingredientes.push(ingrediente);
    }
    
    this.set(KEYS.INGREDIENTES, ingredientes);
    return ingredientes;
  }

  async deleteIngrediente(id: string): Promise<Ingrediente[]> {
    const ingredientes = await this.getIngredientes();
    const filtrados = ingredientes.filter(i => i.id !== id);
    this.set(KEYS.INGREDIENTES, filtrados);
    return filtrados;
  }

  // --- MÓDULO 4: CONFIGURACIÓN FINANCIERA ---
  async getConfiguracion(): Promise<ConfiguracionCostos> {
    return this.get<ConfiguracionCostos>(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
  }

  async saveConfiguracion(config: ConfiguracionCostos): Promise<ConfiguracionCostos> {
    this.set(KEYS.CONFIGURACION, config);
    return config;
  }

  // --- MÓDULO 2: RECETAS ---
  async getRecetas(): Promise<Receta[]> {
    return this.get<Receta[]>(KEYS.RECETAS, []);
  }

  async saveReceta(receta: Receta): Promise<Receta[]> {
    const recetas = await this.getRecetas();
    const index = recetas.findIndex(r => r.id === receta.id);
    
    receta.ultimaActualizacion = new Date().toISOString();
    
    if (index >= 0) {
      recetas[index] = receta;
    } else {
      recetas.push(receta);
    }
    
    this.set(KEYS.RECETAS, recetas);
    return recetas;
  }

  async deleteReceta(id: string): Promise<Receta[]> {
    const recetas = await this.getRecetas();
    const filtrados = recetas.filter(r => r.id !== id);
    this.set(KEYS.RECETAS, filtrados);
    return filtrados;
  }

  // --- MÓDULO 3: PROVEEDORES ---
  async getProveedores(): Promise<Proveedor[]> {
    return this.get<Proveedor[]>(KEYS.PROVEEDORES, []);
  }

  async saveProveedor(proveedor: Proveedor): Promise<Proveedor[]> {
    const proveedores = await this.getProveedores();
    const index = proveedores.findIndex(p => p.id === proveedor.id);
    
    if (index >= 0) {
      proveedores[index] = proveedor;
    } else {
      proveedores.push(proveedor);
    }
    
    this.set(KEYS.PROVEEDORES, proveedores);
    return proveedores;
  }

  async deleteProveedor(id: string): Promise<Proveedor[]> {
    const proveedores = await this.getProveedores();
    const filtrados = proveedores.filter(p => p.id !== id);
    this.set(KEYS.PROVEEDORES, filtrados);
    return filtrados;
  }

  // --- REGISTRO DE COMPRAS (FACTURAS) Y HISTORIAL ---
  async getFacturas(): Promise<FacturaCompra[]> {
    return this.get<FacturaCompra[]>(KEYS.FACTURAS, []);
  }

  async saveFactura(factura: FacturaCompra): Promise<FacturaCompra[]> {
    const facturas = await this.getFacturas();
    facturas.push(factura);
    this.set(KEYS.FACTURAS, facturas);

    // Actualizar precios de ingredientes e inyectar al historial
    const ingredientes = await this.getIngredientes();
    const historicos = this.get<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);

    for (const item of factura.items) {
      // 1. Inyectar histórico
      const nuevoHistorico: RegistroHistoricoPrecio = {
        id: 'hist_' + Math.random().toString(36).substr(2, 9),
        timestamp: factura.fechaCompra,
        ingredienteId: item.ingredienteId,
        proveedorId: factura.proveedorId,
        precioUnitarioAP: item.precioCompraAP / item.cantidadComprada,
        cantidad: item.cantidadComprada
      };
      historicos.push(nuevoHistorico);

      // 2. Actualizar precio activo en el catálogo (Último Precio - Fase 1) y sumar stock, y fecha de vencimiento
      const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
      if (ingIndex >= 0) {
        ingredientes[ingIndex].precioActivo = item.precioCompraAP / item.cantidadComprada;
        ingredientes[ingIndex].stockActual = (ingredientes[ingIndex].stockActual || 0) + item.cantidadComprada;
        if (item.fechaVencimiento) {
          ingredientes[ingIndex].fechaVencimiento = item.fechaVencimiento;
        }
        ingredientes[ingIndex].ultimaActualizacion = new Date().toISOString();
      }
    }

    this.set(KEYS.INGREDIENTES, ingredientes);
    this.set(KEYS.HISTORICO_PRECIOS, historicos);

    return facturas;
  }

  async getHistoricoPrecios(): Promise<RegistroHistoricoPrecio[]> {
    return this.get<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);
  }

  // --- REGISTRO DE MERMAS OPERATIVAS ---
  async getMermas(): Promise<RegistroMermaOperativa[]> {
    return this.get<RegistroMermaOperativa[]>(KEYS.MERMAS, []);
  }

  async saveMerma(merma: RegistroMermaOperativa): Promise<RegistroMermaOperativa[]> {
    const mermas = await this.getMermas();
    mermas.push(merma);
    this.set(KEYS.MERMAS, mermas);

    // Deducir stock del ingrediente si es merma de materia prima, o de la receta si es merma de producto terminado
    if (merma.tipoOrigen === 'ingrediente') {
      const ingredientes = await this.getIngredientes();
      const ingIndex = ingredientes.findIndex(i => i.id === merma.referenciaId);
      if (ingIndex >= 0) {
        ingredientes[ingIndex].stockActual = Math.max(0, (ingredientes[ingIndex].stockActual || 0) - merma.cantidadPerdida);
        this.set(KEYS.INGREDIENTES, ingredientes);
      }
    } else if (merma.tipoOrigen === 'receta') {
      const recetas = await this.getRecetas();
      const recIndex = recetas.findIndex(r => r.id === merma.referenciaId);
      if (recIndex >= 0) {
        recetas[recIndex].stockActual = Math.max(0, (recetas[recIndex].stockActual || 0) - merma.cantidadPerdida);
        this.set(KEYS.RECETAS, recetas);
      }
    }
    return mermas;
  }

  async deleteMerma(id: string): Promise<RegistroMermaOperativa[]> {
    const mermas = await this.getMermas();
    const mermaToDelete = mermas.find(m => m.id === id);
    const filtradas = mermas.filter(m => m.id !== id);
    this.set(KEYS.MERMAS, filtradas);

    if (mermaToDelete) {
      if (mermaToDelete.tipoOrigen === 'ingrediente') {
        const ingredientes = await this.getIngredientes();
        const ingIndex = ingredientes.findIndex(i => i.id === mermaToDelete.referenciaId);
        if (ingIndex >= 0) {
          ingredientes[ingIndex].stockActual = (ingredientes[ingIndex].stockActual || 0) + mermaToDelete.cantidadPerdida;
          this.set(KEYS.INGREDIENTES, ingredientes);
        }
      } else if (mermaToDelete.tipoOrigen === 'receta') {
        const recetas = await this.getRecetas();
        const recIndex = recetas.findIndex(r => r.id === mermaToDelete.referenciaId);
        if (recIndex >= 0) {
          recetas[recIndex].stockActual = (recetas[recIndex].stockActual || 0) + mermaToDelete.cantidadPerdida;
          this.set(KEYS.RECETAS, recetas);
        }
      }
    }
    return filtradas;
  }

  // --- MÓDULO 5: LOTES DE PRODUCCIÓN REAL ---
  async getLotesProduccion(): Promise<LoteProduccion[]> {
    return this.get<LoteProduccion[]>(KEYS.LOTES_PRODUCCION, []);
  }

  async saveLoteProduccion(lote: LoteProduccion): Promise<LoteProduccion[]> {
    const lotes = await this.getLotesProduccion();
    const index = lotes.findIndex(l => l.id === lote.id);
    
    if (index >= 0) {
      lotes[index] = lote;
    } else {
      lotes.push(lote);

      // Deducir stock de insumos reales consumidos
      const ingredientes = await this.getIngredientes();
      for (const item of lote.insumos) {
        if (!item.esRecetaAnidada) {
          const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
          if (ingIndex >= 0) {
            const ing = ingredientes[ingIndex];
            ingredientes[ingIndex].stockActual = Math.max(0, (ing.stockActual || 0) - item.cantidadReal);
          }
        }
      }
      this.set(KEYS.INGREDIENTES, ingredientes);

      // Incrementar stock de la receta producida
      const recetas = await this.getRecetas();
      const recIndex = recetas.findIndex(r => r.id === lote.recetaId);
      if (recIndex >= 0) {
        recetas[recIndex].stockActual = (recetas[recIndex].stockActual || 0) + lote.cantidadProducida;
        this.set(KEYS.RECETAS, recetas);
      }
    }
    
    this.set(KEYS.LOTES_PRODUCCION, lotes);
    return lotes;
  }

  async deleteLoteProduccion(id: string): Promise<LoteProduccion[]> {
    const lotes = await this.getLotesProduccion();
    const loteToDelete = lotes.find(l => l.id === id);
    const filtrados = lotes.filter(l => l.id !== id);
    this.set(KEYS.LOTES_PRODUCCION, filtrados);

    if (loteToDelete) {
      const ingredientes = await this.getIngredientes();
      for (const item of loteToDelete.insumos) {
        if (!item.esRecetaAnidada) {
          const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
          if (ingIndex >= 0) {
            const ing = ingredientes[ingIndex];
            ingredientes[ingIndex].stockActual = (ing.stockActual || 0) + item.cantidadReal;
          }
        }
      }
      this.set(KEYS.INGREDIENTES, ingredientes);

      // Decrementar stock de la receta producida
      const recetas = await this.getRecetas();
      const recIndex = recetas.findIndex(r => r.id === loteToDelete.recetaId);
      if (recIndex >= 0) {
        recetas[recIndex].stockActual = Math.max(0, (recetas[recIndex].stockActual || 0) - loteToDelete.cantidadProducida);
        this.set(KEYS.RECETAS, recetas);
      }
    }
    return filtrados;
  }

  // --- MÓDULO DE VENTAS (REPORTES POS) ---
  async getVentas(): Promise<RegistroVentas[]> {
    return this.get<RegistroVentas[]>(KEYS.VENTAS, []);
  }

  async saveVenta(venta: RegistroVentas): Promise<RegistroVentas[]> {
    const ventas = await this.getVentas();
    ventas.push(venta);
    this.set(KEYS.VENTAS, ventas);

    // Deducir stock de ingredientes en cascada o de recetas producidas
    const recetas = await this.getRecetas();
    const ingredientes = await this.getIngredientes();
    
    const deducirIngredientes: { [id: string]: number } = {};
    const deducirRecetas: { [id: string]: number } = {};

    const explotarReceta = (recetaId: string, qty: number, visited = new Set<string>()) => {
      if (visited.has(recetaId)) return;
      visited.add(recetaId);

      const rec = recetas.find(r => r.id === recetaId);
      if (!rec) return;

      // Si la receta es una sub-receta o está configurada como producción previa, se descuenta de su stock de lote
      if (rec.esSubReceta || rec.modoDescuento === 'produccion_previa') {
        deducirRecetas[recetaId] = (deducirRecetas[recetaId] || 0) + qty;
        return;
      }

      const scaleFactor = qty / rec.cantidadRendimiento;

      rec.ingredientes.forEach(item => {
        const qtyNeeded = item.cantidadRequerida * scaleFactor;
        if (item.esRecetaAnidada) {
          explotarReceta(item.ingredienteId, qtyNeeded, new Set(visited));
        } else {
          deducirIngredientes[item.ingredienteId] = (deducirIngredientes[item.ingredienteId] || 0) + qtyNeeded;
        }
      });
    };

    for (const item of venta.items) {
      const rec = recetas.find(r => r.id === item.recetaId);
      if (rec && (rec.esSubReceta || rec.modoDescuento === 'produccion_previa')) {
        deducirRecetas[item.recetaId] = (deducirRecetas[item.recetaId] || 0) + item.cantidadVendida;
      } else {
        explotarReceta(item.recetaId, item.cantidadVendida);
      }
    }

    // 1. Deducir ingredientes crudos
    for (const ingId of Object.keys(deducirIngredientes)) {
      const ingIdx = ingredientes.findIndex(i => i.id === ingId);
      if (ingIdx >= 0) {
        const ing = ingredientes[ingIdx];
        ingredientes[ingIdx].stockActual = Math.max(0, (ing.stockActual || 0) - deducirIngredientes[ingId]);
      }
    }
    this.set(KEYS.INGREDIENTES, ingredientes);

    // 2. Deducir recetas preparadas
    for (const recId of Object.keys(deducirRecetas)) {
      const recIdx = recetas.findIndex(r => r.id === recId);
      if (recIdx >= 0) {
        const rec = recetas[recIdx];
        recetas[recIdx].stockActual = Math.max(0, (rec.stockActual || 0) - deducirRecetas[recId]);
      }
    }
    this.set(KEYS.RECETAS, recetas);

    return ventas;
  }

  async deleteVenta(id: string): Promise<RegistroVentas[]> {
    const ventas = await this.getVentas();
    const ventaToDelete = ventas.find(v => v.id === id);
    const filtradas = ventas.filter(v => v.id !== id);
    this.set(KEYS.VENTAS, filtradas);

    if (ventaToDelete) {
      const recetas = await this.getRecetas();
      const ingredientes = await this.getIngredientes();
      const resultDevolucion: { [id: string]: number } = {};
      const devolucionRecetas: { [id: string]: number } = {};

      const explotarReceta = (recetaId: string, qty: number, visited = new Set<string>()) => {
        if (visited.has(recetaId)) return;
        visited.add(recetaId);

        const rec = recetas.find(r => r.id === recetaId);
        if (!rec) return;

        if (rec.esSubReceta || rec.modoDescuento === 'produccion_previa') {
          devolucionRecetas[recetaId] = (devolucionRecetas[recetaId] || 0) + qty;
          return;
        }

        const scaleFactor = qty / rec.cantidadRendimiento;

        rec.ingredientes.forEach(item => {
          const qtyNeeded = item.cantidadRequerida * scaleFactor;
          if (item.esRecetaAnidada) {
            explotarReceta(item.ingredienteId, qtyNeeded, new Set(visited));
          } else {
            resultDevolucion[item.ingredienteId] = (resultDevolucion[item.ingredienteId] || 0) + qtyNeeded;
          }
        });
      };

      for (const item of ventaToDelete.items) {
        const rec = recetas.find(r => r.id === item.recetaId);
        if (rec && (rec.esSubReceta || rec.modoDescuento === 'produccion_previa')) {
          devolucionRecetas[item.recetaId] = (devolucionRecetas[item.recetaId] || 0) + item.cantidadVendida;
        } else {
          explotarReceta(item.recetaId, item.cantidadVendida);
        }
      }

      // Devolver stock al catálogo de ingredientes
      for (const ingId of Object.keys(resultDevolucion)) {
        const ingIdx = ingredientes.findIndex(i => i.id === ingId);
        if (ingIdx >= 0) {
          const ing = ingredientes[ingIdx];
          ingredientes[ingIdx].stockActual = (ing.stockActual || 0) + resultDevolucion[ingId];
        }
      }
      this.set(KEYS.INGREDIENTES, ingredientes);

      // Devolver stock al catálogo de recetas
      for (const recId of Object.keys(devolucionRecetas)) {
        const recIdx = recetas.findIndex(r => r.id === recId);
        if (recIdx >= 0) {
          const rec = recetas[recIdx];
          recetas[recIdx].stockActual = (rec.stockActual || 0) + devolucionRecetas[recId];
        }
      }
      this.set(KEYS.RECETAS, recetas);
    }

    return filtradas;
  }

  // --- MOTOR DE CÁLCULO GASTRONÓMICO ---
  
  /**
   * Calcula el costo neto de uso de un ingrediente en una receta (con merma y densidad)
   */
  calcularCostoUsoIngrediente(ingrediente: Ingrediente, cantidadRequerida: number): number {
    const costoAP = ingrediente.precioActivo || 0;
    return costoAP * cantidadRequerida;
  }

  /**
   * Calcula de forma recursiva y profunda el costo de una Receta (soportando sub-recetas)
   */
  async calcularCostoReceta(recetaId: string, recetasDisponibles?: Receta[]): Promise<number> {
    const recetas = recetasDisponibles || await this.getRecetas();
    const receta = recetas.find(r => r.id === recetaId);
    if (!receta) return 0;

    const ingredientes = await this.getIngredientes();
    let costoTotalLote = 0;

    for (const item of receta.ingredientes) {
      if (item.esRecetaAnidada) {
        const subReceta = recetas.find(r => r.id === item.ingredienteId);
        if (subReceta) {
          const costoSubLote = await this.calcularCostoReceta(subReceta.id, recetas);
          let cantidadLote = subReceta.cantidadRendimiento;
          const costoPorUnidadSub = costoSubLote / cantidadLote;
          costoTotalLote += costoPorUnidadSub * item.cantidadRequerida;
        }
      } else {
        const ing = ingredientes.find(i => i.id === item.ingredienteId);
        if (ing) {
          costoTotalLote += this.calcularCostoUsoIngrediente(ing, item.cantidadRequerida);
        }
      }
    }

    return costoTotalLote;
  }
}

export const db = new LocalDatabase();
