import { DataRow, SectorKey } from '../types/analytics';
import { clamp, createRng, pickWeighted, randInt, randNormal } from './prng';

export interface SectorInfo {
  key: SectorKey;
  label: string;
  shortDesc: string;
  defaultTarget: string;
  positiveClass: string;
  dictionary: Record<string, string>;
}

export const SECTORS: SectorInfo[] = [
  {
    key: 'marketing',
    label: 'Marketing',
    shortDesc: 'Propensión de compra, segmentación de campañas y conversión multicanal.',
    defaultTarget: 'Compra',
    positiveClass: 'Sí',
    dictionary: {
      Edad: 'Edad del cliente en años cumplidos (18 a 72).',
      Ingresos_Mensuales: 'Ingreso mensual estimado en USD.',
      Antiguedad_Meses: 'Meses desde el primer registro o interacción con la marca.',
      Frecuencia_Visitas: 'Número de sesiones digitales en los últimos 30 días.',
      Valor_Compra_Promedio: 'Ticket promedio histórico por transacción en USD.',
      Canal_Adquisicion: 'Canal principal de captación (Orgánico, Paid Media, Email, Referido).',
      Segmento_Cliente: 'Clasificación comercial actual (Nuevo, Recurrente, VIP).',
      Ciudad: 'Ciudad metropolitana principal del contacto.',
      Genero: 'Género declarado del cliente.',
      Compra: 'Variable objetivo: indica si realizó una compra en la campaña (Sí/No).',
    },
  },
  {
    key: 'ventas',
    label: 'Ventas',
    shortDesc: 'Calificación de oportunidades B2B/B2C, cierre comercial y clientes de alto valor.',
    defaultTarget: 'Cierre_Exitoso',
    positiveClass: 'Sí',
    dictionary: {
      Valor_Oportunidad: 'Monto proyectado del contrato o pedido en USD.',
      Reuniones_Realizadas: 'Cantidad de reuniones comerciales o demos efectuadas.',
      Dias_Ciclo_Venta: 'Días transcurridos desde la creación de la oportunidad.',
      Descuento_Ofrecido_Pct: 'Porcentaje de descuento comercial aplicado en la propuesta.',
      Tamano_Cuenta: 'Nivel de empresa prospecto (PyME, Mid-Market, Enterprise).',
      Industria: 'Sector económico del cliente potencial.',
      Region: 'Territorio comercial asignado.',
      Origen_Lead: 'Fuente de origen comercial (Inbound, Outbound, Partner).',
      Cierre_Exitoso: 'Variable objetivo: indica si la oportunidad se cerró ganada (Sí/No).',
    },
  },
  {
    key: 'rrhh',
    label: 'Recursos Humanos',
    shortDesc: 'Predicción de rotación voluntaria, factores de permanencia y clima laboral.',
    defaultTarget: 'Renuncia',
    positiveClass: 'Sí',
    dictionary: {
      Edad: 'Edad del colaborador en años.',
      Antiguedad_Anos: 'Años de permanencia continua en la organización.',
      Salario_Mensual: 'Compensación salarial mensual bruta en USD.',
      Horas_Extra_Mes: 'Promedio de horas adicionales trabajadas al mes.',
      Satisfaccion_Laboral: 'Puntaje de encuesta interna de satisfacción (1 a 10).',
      Distancia_Km: 'Distancia desde el domicilio hasta la sede principal en km.',
      Departamento: 'Área organizacional a la que pertenece.',
      Modalidad: 'Esquema de trabajo (Presencial, Híbrido, Remoto).',
      Nivel_Cargo: 'Categoría jerárquica del rol (Analista, Especialista, Líder, Gerencia).',
      Renuncia: 'Variable objetivo: salida voluntaria registrada en los últimos 12 meses (Sí/No).',
    },
  },
  {
    key: 'banca',
    label: 'Banca y Finanzas',
    shortDesc: 'Riesgo crediticio, probabilidad de mora y evaluación de aprobación financiera.',
    defaultTarget: 'Mora',
    positiveClass: 'Sí',
    dictionary: {
      Edad: 'Edad del titular del crédito.',
      Ingresos_Mensuales: 'Ingresos mensuales verificados en USD.',
      Monto_Credito: 'Capital total otorgado o solicitado en USD.',
      Ratio_Endeudamiento_Pct: 'Porcentaje de ingreso comprometido en obligaciones financieras.',
      Score_Crediticio: 'Puntaje histórico en buró financiero (300 a 850).',
      Antiguedad_Laboral_Anos: 'Estabilidad laboral comprobada en años.',
      Tipo_Producto: 'Línea de producto (Consumo, Hipotecario, Tarjeta, PyME).',
      Historial_Pagos: 'Comportamiento previo (Al Día, Atraso Leve, Reestructurado).',
      Ciudad: 'Plaza financiera de originación.',
      Mora: 'Variable objetivo: incumplimiento mayor a 30 días (Sí/No).',
    },
  },
  {
    key: 'salud',
    label: 'Salud',
    shortDesc: 'Riesgo de reingreso hospitalario, adherencia clínica y priorización asistencial.',
    defaultTarget: 'Reingreso',
    positiveClass: 'Sí',
    dictionary: {
      Edad: 'Edad del paciente en años.',
      Dias_Estancia: 'Duración de la hospitalización inicial en días.',
      Numero_Comorbilidades: 'Cantidad de diagnósticos crónicos asociados.',
      Consultas_Previas_Ano: 'Visitas a urgencias o consulta externa en el último año.',
      Indice_Adherencia: 'Puntaje estimado de adherencia al tratamiento (0 a 100).',
      Tipo_Ingreso: 'Modalidad de admisión (Urgencias, Programado, Derivación).',
      Servicio_Clinico: 'Especialidad tratante (Medicina Interna, Cardiología, Cirugía, Pediatría).',
      Cobertura: 'Tipo de aseguramiento médico.',
      Reingreso: 'Variable objetivo: reingreso no programado dentro de 30 días (Sí/No).',
    },
  },
  {
    key: 'gestion_documental',
    label: 'Gestión Documental',
    shortDesc: 'Control de calidad en radicación, tiempos SLA y detección de errores documentales.',
    defaultTarget: 'Error_Radicacion',
    positiveClass: 'Sí',
    dictionary: {
      Paginas_Documento: 'Cantidad de folios o páginas del expediente digitalizado.',
      Tiempo_Procesamiento_Min: 'Minutos invertidos en validación y captura.',
      Complejidad_Indice: 'Índice de densidad de campos obligatorios (1 a 10).',
      Reprocesos_Previos: 'Número de devoluciones previas del mismo remitente.',
      Tipo_Documental: 'Categoría del documento (Contrato, Factura, PQR, Escritura, Tutela).',
      Canal_Recepcion: 'Medio de ingreso (Portal Web, Correo, Ventanilla, API).',
      Turno_Operativo: 'Franja de radicación (Mañana, Tarde, Cierre).',
      Sede_Radicacion: 'Centro operativo de procesamiento.',
      Error_Radicacion: 'Variable objetivo: expediente con hallazgo de error o rechazo (Sí/No).',
    },
  },
  {
    key: 'servicio_cliente',
    label: 'Servicio al Cliente',
    shortDesc: 'Riesgo de abandono (churn), insatisfacción y análisis de tickets de soporte.',
    defaultTarget: 'Abandono',
    positiveClass: 'Sí',
    dictionary: {
      Antiguedad_Meses: 'Meses activos como cliente del servicio.',
      Tickets_Ultimos_90d: 'Cantidad de solicitudes de soporte abiertas en el trimestre.',
      Tiempo_Respuesta_Horas: 'Tiempo promedio de primera respuesta en horas.',
      CSAT_Score: 'Calificación promedio de satisfacción post-atención (1 a 5).',
      Cuota_Mensual: 'Valor mensual del plan contratado en USD.',
      Plan_Servicio: 'Nivel de suscripción (Básico, Profesional, Corporativo).',
      Canal_Preferido: 'Canal principal de contacto (Chat, Teléfono, Correo, Autoservicio).',
      Renovacion_Automatica: 'Estado de renovación automática configurada (Activa, Manual).',
      Abandono: 'Variable objetivo: cancelación o no renovación del servicio (Sí/No).',
    },
  },
  {
    key: 'logistica',
    label: 'Logística',
    shortDesc: 'Cumplimiento de entregas a tiempo, riesgo de retraso y eficiencia de rutas.',
    defaultTarget: 'Entrega_Tardia',
    positiveClass: 'Sí',
    dictionary: {
      Distancia_Km: 'Distancia total de la ruta asignada en kilómetros.',
      Peso_Kg: 'Peso consolidado del despacho en kilogramos.',
      Paradas_Ruta: 'Número de paradas programadas en el recorrido.',
      Hora_Despacho: 'Hora de salida del centro de distribución (6 a 20).',
      Tipo_Vehiculo: 'Categoría de flota (Van, Camión Ligero, Tractocamión).',
      Zona_Destino: 'Clasificación geográfica (Urbana, Periurbana, Nacional).',
      Condicion_Climatica: 'Estado meteorológico reportado en ruta (Despejado, Lluvia, Congestión).',
      Prioridad_Envio: 'Nivel de acuerdo de servicio (Estándar, Express, Crítico).',
      Entrega_Tardia: 'Variable objetivo: entrega fuera de la ventana comprometida (Sí/No).',
    },
  },
  {
    key: 'personalizado',
    label: 'Personalizado',
    shortDesc: 'Escenario analítico multipropósito con variables numéricas, categóricas y factor.',
    defaultTarget: 'Aprobacion',
    positiveClass: 'Sí',
    dictionary: {
      Indice_Desempeno: 'Indicador cuantitativo principal de desempeño operativo (0 a 100).',
      Monto_Operacion: 'Valor económico asociado al registro en USD.',
      Antiguedad_Meses: 'Meses de trayectoria o antigüedad en el sistema.',
      Incidencias_Reportadas: 'Conteo de eventos o alertas registradas.',
      Categoria_Riesgo: 'Nivel de riesgo preliminar asignado (Bajo, Medio, Alto).',
      Segmento: 'Clasificación operativa del registro (Alpha, Beta, Gamma).',
      Region: 'Macrozona operativa (Norte, Centro, Sur, Oriente).',
      Canal: 'Origen de la solicitud (Digital, Presencial, Mixto).',
      Aprobacion: 'Variable objetivo: dictamen final favorable del caso (Sí/No).',
    },
  },
];

export function getSectorInfo(sector: SectorKey): SectorInfo {
  return SECTORS.find((s) => s.key === sector) || SECTORS[0];
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function generateSyntheticDataset(
  sector: SectorKey,
  rowCount = 1200,
  seed = 202611,
  includeQualityNuances = true
): DataRow[] {
  const count = Math.max(1000, rowCount);
  const rng = createRng(seed + sector.length * 131);
  const rows: DataRow[] = [];

  for (let i = 0; i < count; i++) {
    let row: DataRow = {};

    if (sector === 'marketing') {
      const edad = Math.round(clamp(randNormal(rng, 37, 11), 18, 72));
      const ingresos = Math.round(clamp(randNormal(rng, 3100, 1400), 600, 12000));
      const antiguedad = Math.round(clamp(randNormal(rng, 22, 16), 1, 84));
      const visitas = Math.round(clamp(randNormal(rng, 7.5, 4.2), 0, 30));
      const valorPromedio = Math.round(clamp(ingresos * 0.045 + randNormal(rng, 45, 35), 15, 850));
      const canal = pickWeighted(rng, ['Orgánico', 'Paid Media', 'Email', 'Referido'], [0.3, 0.35, 0.2, 0.15]);
      const segmento = antiguedad < 8 ? 'Nuevo' : valorPromedio > 210 ? 'VIP' : 'Recurrente';
      const ciudad = pickWeighted(rng, ['Bogotá', 'Madrid', 'CDMX', 'Lima', 'Santiago'], [0.28, 0.22, 0.22, 0.15, 0.13]);
      const genero = pickWeighted(rng, ['Femenino', 'Masculino', 'Otro'], [0.51, 0.46, 0.03]);

      let logit = -1.6;
      if (edad >= 25 && edad <= 42) logit += 0.95;
      if (ingresos > 3200) logit += 1.05;
      if (visitas >= 8) logit += 1.15;
      if (antiguedad <= 10) logit += 0.65;
      if (canal === 'Email' || canal === 'Referido') logit += 0.55;
      if (segmento === 'VIP') logit += 0.7;
      logit += randNormal(rng, 0, 0.55);

      row = {
        Edad: edad,
        Ingresos_Mensuales: ingresos,
        Antiguedad_Meses: antiguedad,
        Frecuencia_Visitas: visitas,
        Valor_Compra_Promedio: valorPromedio,
        Canal_Adquisicion: canal,
        Segmento_Cliente: segmento,
        Ciudad: ciudad,
        Genero: genero,
        Compra: sigmoid(logit) > 0.52 ? 'Sí' : 'No',
      };
    } else if (sector === 'ventas') {
      const tamano = pickWeighted(rng, ['PyME', 'Mid-Market', 'Enterprise'], [0.45, 0.35, 0.2]);
      const baseValor = tamano === 'Enterprise' ? 68000 : tamano === 'Mid-Market' ? 24000 : 7500;
      const valorOp = Math.round(clamp(randNormal(rng, baseValor, baseValor * 0.35), 1500, 180000));
      const reuniones = Math.round(clamp(randNormal(rng, 4.5, 2.3), 1, 14));
      const diasCiclo = Math.round(clamp(randNormal(rng, 38, 22), 5, 130));
      const descuento = Math.round(clamp(randNormal(rng, 9, 6), 0, 30));
      const industria = pickWeighted(rng, ['Tecnología', 'Retail', 'Manufactura', 'Servicios', 'Salud'], [0.26, 0.22, 0.18, 0.2, 0.14]);
      const region = pickWeighted(rng, ['Norte', 'Centro', 'Sur', 'Internacional'], [0.28, 0.34, 0.22, 0.16]);
      const origen = pickWeighted(rng, ['Inbound', 'Outbound', 'Partner'], [0.44, 0.36, 0.2]);

      let logit = -1.2;
      if (reuniones >= 4) logit += 1.25;
      if (diasCiclo < 45) logit += 0.85;
      if (origen === 'Inbound' || origen === 'Partner') logit += 0.7;
      if (descuento >= 5 && descuento <= 15) logit += 0.55;
      if (tamano === 'Mid-Market') logit += 0.45;
      if (diasCiclo > 80) logit -= 1.05;
      logit += randNormal(rng, 0, 0.55);

      row = {
        Valor_Oportunidad: valorOp,
        Reuniones_Realizadas: reuniones,
        Dias_Ciclo_Venta: diasCiclo,
        Descuento_Ofrecido_Pct: descuento,
        Tamano_Cuenta: tamano,
        Industria: industria,
        Region: region,
        Origen_Lead: origen,
        Cierre_Exitoso: sigmoid(logit) > 0.5 ? 'Sí' : 'No',
      };
    } else if (sector === 'rrhh') {
      const edad = Math.round(clamp(randNormal(rng, 34, 8.5), 21, 62));
      const antiguedad = Number(clamp(randNormal(rng, 4.8, 3.6), 0.3, 22).toFixed(1));
      const salario = Math.round(clamp(randNormal(rng, 2400, 1100), 700, 8500));
      const horasExtra = Math.round(clamp(randNormal(rng, 11, 9), 0, 48));
      const satisfaccion = Number(clamp(randNormal(rng, 6.7, 2.0), 1, 10).toFixed(1));
      const distancia = Math.round(clamp(randNormal(rng, 14, 10), 1, 55));
      const depto = pickWeighted(rng, ['Operaciones', 'Tecnología', 'Comercial', 'Finanzas', 'Talento Humano'], [0.3, 0.24, 0.24, 0.12, 0.1]);
      const modalidad = pickWeighted(rng, ['Presencial', 'Híbrido', 'Remoto'], [0.42, 0.38, 0.2]);
      const nivel = pickWeighted(rng, ['Analista', 'Especialista', 'Líder', 'Gerencia'], [0.46, 0.32, 0.15, 0.07]);

      let logit = -1.4;
      if (satisfaccion < 5.0) logit += 1.65;
      if (horasExtra > 18) logit += 1.25;
      if (salario < 1600) logit += 0.85;
      if (antiguedad < 2.0) logit += 0.65;
      if (modalidad === 'Presencial' && distancia > 22) logit += 0.7;
      if (satisfaccion >= 7.8) logit -= 1.1;
      logit += randNormal(rng, 0, 0.55);

      row = {
        Edad: edad,
        Antiguedad_Anos: antiguedad,
        Salario_Mensual: salario,
        Horas_Extra_Mes: horasExtra,
        Satisfaccion_Laboral: satisfaccion,
        Distancia_Km: distancia,
        Departamento: depto,
        Modalidad: modalidad,
        Nivel_Cargo: nivel,
        Renuncia: sigmoid(logit) > 0.56 ? 'Sí' : 'No',
      };
    } else if (sector === 'banca') {
      const edad = Math.round(clamp(randNormal(rng, 40, 11.5), 20, 74));
      const ingresos = Math.round(clamp(randNormal(rng, 2900, 1500), 650, 14000));
      const monto = Math.round(clamp(randNormal(rng, 14500, 11000), 1000, 85000));
      const ratio = Number(clamp(randNormal(rng, 34, 14), 5, 78).toFixed(1));
      const score = Math.round(clamp(randNormal(rng, 665, 95), 320, 850));
      const antiguedadLab = Number(clamp(randNormal(rng, 5.5, 4.1), 0.2, 28).toFixed(1));
      const producto = pickWeighted(rng, ['Consumo', 'Tarjeta', 'PyME', 'Hipotecario'], [0.38, 0.32, 0.18, 0.12]);
      const historial = pickWeighted(rng, ['Al Día', 'Atraso Leve', 'Reestructurado'], [0.68, 0.23, 0.09]);
      const ciudad = pickWeighted(rng, ['Capital', 'Medellín', 'Monterrey', 'Valencia', 'Quito'], [0.36, 0.2, 0.18, 0.14, 0.12]);

      let logit = -1.7;
      if (score < 600) logit += 1.65;
      if (ratio > 45) logit += 1.25;
      if (historial === 'Reestructurado') logit += 1.4;
      if (historial === 'Atraso Leve') logit += 0.7;
      if (antiguedadLab < 1.5) logit += 0.65;
      if (score > 740) logit -= 1.25;
      logit += randNormal(rng, 0, 0.52);

      row = {
        Edad: edad,
        Ingresos_Mensuales: ingresos,
        Monto_Credito: monto,
        Ratio_Endeudamiento_Pct: ratio,
        Score_Crediticio: score,
        Antiguedad_Laboral_Anos: antiguedadLab,
        Tipo_Producto: producto,
        Historial_Pagos: historial,
        Ciudad: ciudad,
        Mora: sigmoid(logit) > 0.55 ? 'Sí' : 'No',
      };
    } else if (sector === 'salud') {
      const edad = Math.round(clamp(randNormal(rng, 54, 17), 18, 92));
      const estancia = Math.round(clamp(randNormal(rng, 5.2, 3.6), 1, 26));
      const comorbilidades = Math.round(clamp(randNormal(rng, 2.1, 1.5), 0, 7));
      const consultas = Math.round(clamp(randNormal(rng, 3.4, 2.5), 0, 15));
      const adherencia = Math.round(clamp(randNormal(rng, 72, 18), 15, 100));
      const tipoIngreso = pickWeighted(rng, ['Urgencias', 'Programado', 'Derivación'], [0.5, 0.35, 0.15]);
      const servicio = pickWeighted(rng, ['Medicina Interna', 'Cardiología', 'Cirugía', 'Neumología'], [0.34, 0.26, 0.24, 0.16]);
      const cobertura = pickWeighted(rng, ['Contributivo', 'Subsidiado', 'Privado'], [0.48, 0.3, 0.22]);

      let logit = -1.75;
      if (comorbilidades >= 3) logit += 1.25;
      if (adherencia < 58) logit += 1.35;
      if (estancia >= 7) logit += 0.85;
      if (tipoIngreso === 'Urgencias') logit += 0.65;
      if (edad > 68) logit += 0.6;
      logit += randNormal(rng, 0, 0.52);

      row = {
        Edad: edad,
        Dias_Estancia: estancia,
        Numero_Comorbilidades: comorbilidades,
        Consultas_Previas_Ano: consultas,
        Indice_Adherencia: adherencia,
        Tipo_Ingreso: tipoIngreso,
        Servicio_Clinico: servicio,
        Cobertura: cobertura,
        Reingreso: sigmoid(logit) > 0.55 ? 'Sí' : 'No',
      };
    } else if (sector === 'gestion_documental') {
      const paginas = Math.round(clamp(randNormal(rng, 18, 14), 1, 120));
      const tiempo = Number(clamp(randNormal(rng, 9.5, 5.5), 1.5, 38).toFixed(1));
      const complejidad = Math.round(clamp(randNormal(rng, 5.4, 2.3), 1, 10));
      const reprocesos = Math.round(clamp(randNormal(rng, 0.9, 1.1), 0, 6));
      const tipoDoc = pickWeighted(rng, ['Contrato', 'Factura', 'PQR', 'Escritura', 'Tutela'], [0.24, 0.3, 0.22, 0.12, 0.12]);
      const canal = pickWeighted(rng, ['Portal Web', 'Correo', 'Ventanilla', 'API'], [0.35, 0.28, 0.22, 0.15]);
      const turno = pickWeighted(rng, ['Mañana', 'Tarde', 'Cierre'], [0.4, 0.38, 0.22]);
      const sede = pickWeighted(rng, ['Central', 'Norte', 'Occidente'], [0.5, 0.28, 0.22]);

      let logit = -1.65;
      if (reprocesos >= 2) logit += 1.4;
      if (complejidad >= 7) logit += 1.1;
      if (turno === 'Cierre') logit += 0.85;
      if (canal === 'Correo' || canal === 'Ventanilla') logit += 0.55;
      if (tipoDoc === 'Escritura' || tipoDoc === 'Tutela') logit += 0.7;
      if (paginas > 35) logit += 0.5;
      logit += randNormal(rng, 0, 0.52);

      row = {
        Paginas_Documento: paginas,
        Tiempo_Procesamiento_Min: tiempo,
        Complejidad_Indice: complejidad,
        Reprocesos_Previos: reprocesos,
        Tipo_Documental: tipoDoc,
        Canal_Recepcion: canal,
        Turno_Operativo: turno,
        Sede_Radicacion: sede,
        Error_Radicacion: sigmoid(logit) > 0.54 ? 'Sí' : 'No',
      };
    } else if (sector === 'servicio_cliente') {
      const antiguedad = Math.round(clamp(randNormal(rng, 20, 15), 1, 72));
      const tickets = Math.round(clamp(randNormal(rng, 2.6, 2.2), 0, 12));
      const tiempoResp = Number(clamp(randNormal(rng, 11.5, 8.5), 0.5, 54).toFixed(1));
      const csat = Number(clamp(randNormal(rng, 3.6, 1.0), 1, 5).toFixed(1));
      const cuota = Math.round(clamp(randNormal(rng, 79, 42), 19, 299));
      const plan = pickWeighted(rng, ['Básico', 'Profesional', 'Corporativo'], [0.44, 0.38, 0.18]);
      const canal = pickWeighted(rng, ['Chat', 'Teléfono', 'Correo', 'Autoservicio'], [0.36, 0.28, 0.22, 0.14]);
      const renovacion = pickWeighted(rng, ['Activa', 'Manual'], [0.64, 0.36]);

      let logit = -1.65;
      if (csat < 3.0) logit += 1.55;
      if (tickets >= 4) logit += 1.25;
      if (tiempoResp > 18) logit += 0.85;
      if (renovacion === 'Manual') logit += 0.75;
      if (antiguedad < 6) logit += 0.65;
      logit += randNormal(rng, 0, 0.52);

      row = {
        Antiguedad_Meses: antiguedad,
        Tickets_Ultimos_90d: tickets,
        Tiempo_Respuesta_Horas: tiempoResp,
        CSAT_Score: csat,
        Cuota_Mensual: cuota,
        Plan_Servicio: plan,
        Canal_Preferido: canal,
        Renovacion_Automatica: renovacion,
        Abandono: sigmoid(logit) > 0.55 ? 'Sí' : 'No',
      };
    } else if (sector === 'logistica') {
      const distancia = Math.round(clamp(randNormal(rng, 145, 95), 8, 650));
      const peso = Math.round(clamp(randNormal(rng, 320, 220), 10, 1800));
      const paradas = Math.round(clamp(randNormal(rng, 11, 5.5), 1, 32));
      const hora = randInt(rng, 6, 20);
      const vehiculo = pickWeighted(rng, ['Van', 'Camión Ligero', 'Tractocamión'], [0.46, 0.38, 0.16]);
      const zona = pickWeighted(rng, ['Urbana', 'Periurbana', 'Nacional'], [0.45, 0.32, 0.23]);
      const clima = pickWeighted(rng, ['Despejado', 'Lluvia', 'Congestión'], [0.56, 0.22, 0.22]);
      const prioridad = pickWeighted(rng, ['Estándar', 'Express', 'Crítico'], [0.54, 0.32, 0.14]);

      let logit = -1.6;
      if (paradas > 14) logit += 1.2;
      if (clima === 'Congestión' || clima === 'Lluvia') logit += 1.05;
      if (distancia > 220) logit += 0.85;
      if (hora >= 15) logit += 0.75;
      if (prioridad === 'Crítico') logit -= 0.7;
      logit += randNormal(rng, 0, 0.52);

      row = {
        Distancia_Km: distancia,
        Peso_Kg: peso,
        Paradas_Ruta: paradas,
        Hora_Despacho: hora,
        Tipo_Vehiculo: vehiculo,
        Zona_Destino: zona,
        Condicion_Climatica: clima,
        Prioridad_Envio: prioridad,
        Entrega_Tardia: sigmoid(logit) > 0.54 ? 'Sí' : 'No',
      };
    } else {
      // Personalizado
      const indice = Math.round(clamp(randNormal(rng, 68, 16), 10, 100));
      const monto = Math.round(clamp(randNormal(rng, 4800, 2600), 300, 18000));
      const antiguedad = Math.round(clamp(randNormal(rng, 24, 14), 1, 72));
      const incidencias = Math.round(clamp(randNormal(rng, 1.4, 1.4), 0, 8));
      const riesgo = incidencias >= 3 ? 'Alto' : indice < 58 ? 'Medio' : 'Bajo';
      const segmento = pickWeighted(rng, ['Alpha', 'Beta', 'Gamma'], [0.4, 0.35, 0.25]);
      const region = pickWeighted(rng, ['Norte', 'Centro', 'Sur', 'Oriente'], [0.28, 0.32, 0.22, 0.18]);
      const canal = pickWeighted(rng, ['Digital', 'Presencial', 'Mixto'], [0.48, 0.3, 0.22]);

      let logit = -1.1;
      if (indice >= 70) logit += 1.35;
      if (incidencias <= 1) logit += 0.95;
      if (riesgo === 'Bajo') logit += 0.75;
      if (antiguedad >= 18) logit += 0.5;
      if (riesgo === 'Alto') logit -= 1.3;
      logit += randNormal(rng, 0, 0.5);

      row = {
        Indice_Desempeno: indice,
        Monto_Operacion: monto,
        Antiguedad_Meses: antiguedad,
        Incidencias_Reportadas: incidencias,
        Categoria_Riesgo: riesgo,
        Segmento: segmento,
        Region: region,
        Canal: canal,
        Aprobacion: sigmoid(logit) > 0.5 ? 'Sí' : 'No',
      };
    }

    rows.push(row);
  }

  // Add subtle realistic data quality nuances (~1.5% missing predictor values + 6 duplicates)
  if (includeQualityNuances && rows.length > 50) {
    const keys = Object.keys(rows[0]);
    const featureKeys = keys.slice(0, keys.length - 1);
    const nullInjections = Math.floor(rows.length * 0.014);
    for (let k = 0; k < nullInjections; k++) {
      const rIdx = randInt(rng, 5, rows.length - 1);
      const colKey = featureKeys[randInt(rng, 0, featureKeys.length - 1)];
      rows[rIdx][colKey] = null;
    }
    // 6 exact duplicate rows for realistic quality audit
    for (let d = 0; d < 6; d++) {
      const srcIdx = randInt(rng, 10, 120);
      rows.push({ ...rows[srcIdx] });
    }
  }

  return rows;
}
