import {
  AIInsightsResult,
  BusinessDecisionCard,
  Dataset,
  SectorKey,
  TrainedTreeModel,
} from '../types/analytics';

export function generateSectorBusinessDecisions(
  sector: SectorKey,
  model: TrainedTreeModel
): BusinessDecisionCard[] {
  const topVars = model.featureImportance.slice(0, 3);
  const primaryVar = topVars[0]?.variable || 'Variable principal';
  const primaryPct = topVars[0]?.importancePct || 0;
  const secondaryVar = topVars[1]?.variable || 'Segunda variable';
  const secondaryPct = topVars[1]?.importancePct || 0;

  const positiveRules = model.rules.filter((r) => r.prediction === model.positiveClass);
  const topPosRule = positiveRules[0] || model.rules[0];
  const negativeRules = model.rules.filter((r) => r.prediction !== model.positiveClass);
  const topNegRule = negativeRules[0] || model.rules[0];

  const cm = model.testMetrics.confusionMatrix;

  if (sector === 'marketing') {
    return [
      {
        category: 'Clientes Propensos a Comprar',
        title: `Segmento de máxima conversión guiado por ${primaryVar}`,
        description: `La regla principal (${topPosRule?.condition || primaryVar}) concentra una probabilidad de compra del ${topPosRule?.confidencePct ?? model.testMetrics.precision}% sobre ${topPosRule?.support ?? 0} clientes de entrenamiento.`,
        metricHighlight: `${topPosRule?.confidencePct ?? model.testMetrics.precision}% Confianza`,
        priority: 'Alta',
      },
      {
        category: 'Segmentos Prioritarios',
        title: `Focalización en ${primaryVar} (${primaryPct}%) y ${secondaryVar} (${secondaryPct}%)`,
        description: `Estas dos variables explican el ${(primaryPct + secondaryPct).toFixed(1)}% de las decisiones del árbol. Priorizar audiencias que cumplan estos umbrales optimiza el ROAS.`,
        metricHighlight: `${(primaryPct + secondaryPct).toFixed(1)}% Poder Explicativo`,
        priority: 'Alta',
      },
      {
        category: 'Campañas Recomendadas',
        title: 'Automatización de ofertas dinámicas sobre perfiles de alta propensión',
        description: `Activar campañas multicanal personalizadas para los ${cm.vp + cm.fp} perfiles clasificados como "${model.positiveClass}" en evaluación, reduciendo desperdicio en ${cm.vn} contactos de baja propensión.`,
        metricHighlight: `${model.testMetrics.precision}% Precisión`,
        priority: 'Estratégica',
      },
      {
        category: 'Estrategias de Fidelización',
        title: 'Retención y reactivación de segmentos con baja tasa de respuesta',
        description: `Para los perfiles bajo la regla "${topNegRule?.condition || 'baja conversión'}", diseñar flujos de nurturing educativo y cupones de entrada antes de invertir en pauta directa.`,
        metricHighlight: `${topNegRule?.supportPct ?? 0}% Base Analizada`,
        priority: 'Media',
      },
    ];
  }

  if (sector === 'ventas') {
    return [
      {
        category: 'Oportunidades de Negocio',
        title: `Calificación predictiva liderada por ${primaryVar}`,
        description: `Las oportunidades que cumplen "${topPosRule?.condition || primaryVar}" alcanzan una tasa de cierre del ${topPosRule?.confidencePct ?? 0}%. Asignar prioridad inmediata en el pipeline.`,
        metricHighlight: `${topPosRule?.confidencePct ?? 0}% Prob. Cierre`,
        priority: 'Alta',
      },
      {
        category: 'Clientes de Alto Valor',
        title: `Aceleración comercial combinando ${primaryVar} y ${secondaryVar}`,
        description: `El ${(primaryPct + secondaryPct).toFixed(1)}% del resultado comercial depende de estas variables. Enfocar ejecutivos senior y demos personalizadas en cuentas que superen estos cortes.`,
        metricHighlight: `${(primaryPct + secondaryPct).toFixed(1)}% Impacto`,
        priority: 'Alta',
      },
      {
        category: 'Eficiencia del Embudo',
        title: 'Descalificación temprana de oportunidades estancadas',
        description: `Con una especificidad del ${model.testMetrics.specificity}%, el modelo filtra prospectos de baja probabilidad evitando sobrecarga operativa del equipo comercial.`,
        metricHighlight: `${model.testMetrics.specificity}% Especificidad`,
        priority: 'Media',
      },
      {
        category: 'Gobierno de Descuentos',
        title: 'Protección de margen en negociaciones recurrentes',
        description: `Revisar reglas asociadas a ciclos largos o descuentos altos para estandarizar aprobaciones comerciales basadas en score del árbol.`,
        metricHighlight: `${model.testMetrics.aucRoc} AUC-ROC`,
        priority: 'Estratégica',
      },
    ];
  }

  if (sector === 'gestion_documental') {
    return [
      {
        category: 'Tipos Documentales con Mayor Riesgo',
        title: `Concentración de hallazgos según ${primaryVar}`,
        description: `Los expedientes bajo la ruta "${topPosRule?.condition || primaryVar}" presentan ${topPosRule?.confidencePct ?? 0}% de probabilidad de error o rechazo documental.`,
        metricHighlight: `${topPosRule?.confidencePct ?? 0}% Riesgo Error`,
        priority: 'Alta',
      },
      {
        category: 'Variables Asociadas a Errores de Radicación',
        title: `${primaryVar} (${primaryPct}%) y ${secondaryVar} (${secondaryPct}%)`,
        description: `Estos factores determinan la mayoría de devoluciones. Implementar validaciones automáticas en formulario y listas de chequeo antes de radicar.`,
        metricHighlight: `${(primaryPct + secondaryPct).toFixed(1)}% Peso en Modelo`,
        priority: 'Alta',
      },
      {
        category: 'Riesgos Operativos',
        title: 'Alertas tempranas en franjas y canales críticos',
        description: `Con una sensibilidad del ${model.testMetrics.recall}%, el modelo intercepta ${cm.vp} expedientes defectuosos antes de pasar a custodia o respuesta oficial.`,
        metricHighlight: `${model.testMetrics.recall}% Detección`,
        priority: 'Estratégica',
      },
      {
        category: 'Control de Calidad SLA',
        title: 'Muestreo inteligente de auditoría documental',
        description: `Enrutar revisión humana doble exclusivamente a casos marcados como "${model.positiveClass}", liberando capacidad operativa en los ${cm.vn} expedientes conformes.`,
        metricHighlight: `${model.testMetrics.accuracy}% Exactitud`,
        priority: 'Media',
      },
    ];
  }

  if (sector === 'servicio_cliente') {
    return [
      {
        category: 'Clientes con Riesgo de Abandono',
        title: `Alerta temprana de churn impulsada por ${primaryVar}`,
        description: `El segmento definido por "${topPosRule?.condition || primaryVar}" exhibe un riesgo de abandono del ${topPosRule?.confidencePct ?? 0}% (${topPosRule?.support ?? 0} clientes).`,
        metricHighlight: `${topPosRule?.confidencePct ?? 0}% Riesgo Churn`,
        priority: 'Alta',
      },
      {
        category: 'Factores de Insatisfacción',
        title: `${primaryVar} (${primaryPct}%) y ${secondaryVar} (${secondaryPct}%)`,
        description: `El árbol confirma que los tiempos de respuesta, recurrencia de tickets y CSAT explican el núcleo de la deserción. Priorizar SLA en cuentas afectadas.`,
        metricHighlight: `${(primaryPct + secondaryPct).toFixed(1)}% Importancia`,
        priority: 'Alta',
      },
      {
        category: 'Intervención Proactiva',
        title: 'Mesa de retención preventiva sobre alertas positivas',
        description: `Contactar de forma proactiva a los clientes clasificados en riesgo (${model.testMetrics.recall}% de sensibilidad) con revisión técnica y beneficios de permanencia.`,
        metricHighlight: `${model.testMetrics.recall}% Sensibilidad`,
        priority: 'Estratégica',
      },
      {
        category: 'Experiencia Omnicanal',
        title: 'Migración asistida a renovación automática y autoservicio',
        description: `Reducir fricciones administrativas detectadas en nodos críticos para estabilizar el ingreso recurrente mensual.`,
        metricHighlight: `${model.testMetrics.f1Score}% F1 Score`,
        priority: 'Media',
      },
    ];
  }

  if (sector === 'rrhh') {
    return [
      {
        category: 'Riesgo de Rotación',
        title: `Detección de talento en riesgo vía ${primaryVar}`,
        description: `Los colaboradores en la rama "${topPosRule?.condition || primaryVar}" registran una probabilidad de renuncia del ${topPosRule?.confidencePct ?? 0}%.`,
        metricHighlight: `${topPosRule?.confidencePct ?? 0}% Riesgo Salida`,
        priority: 'Alta',
      },
      {
        category: 'Factores de Permanencia',
        title: `Equilibrio entre ${primaryVar} (${primaryPct}%) y ${secondaryVar} (${secondaryPct}%)`,
        description: `Las variables clave apuntan a carga operativa, satisfacción y compensación. Intervenir estos factores reduce el costo de reemplazo y curva de aprendizaje.`,
        metricHighlight: `${(primaryPct + secondaryPct).toFixed(1)}% Explicación`,
        priority: 'Alta',
      },
      {
        category: 'Planes de Retención',
        title: 'Entrevistas de permanencia y ajuste de modalidad laboral',
        description: `El modelo identifica el ${model.testMetrics.recall}% de salidas potenciales antes de la renuncia formal, habilitando planes de carrera dirigidos.`,
        metricHighlight: `${model.testMetrics.recall}% Cobertura`,
        priority: 'Estratégica',
      },
      {
        category: 'Clima y Carga Laboral',
        title: 'Monitoreo preventivo de horas extra por departamento',
        description: `Establecer umbrales de alerta para líderes cuando las variables críticas superen los cortes detectados por el árbol.`,
        metricHighlight: `${model.testMetrics.aucRoc} AUC-ROC`,
        priority: 'Media',
      },
    ];
  }

  // Banca, Salud, Logística, Personalizado
  const sectorDefaults: Record<SectorKey, { c1: string; c2: string; c3: string; c4: string }> = {
    banca: {
      c1: 'Riesgo Crediticio y Mora',
      c2: 'Drivers de Scoring',
      c3: 'Política de Originación',
      c4: 'Cobranza Preventiva',
    },
    salud: {
      c1: 'Riesgo de Reingreso Clínico',
      c2: 'Factores Clínicos Críticos',
      c3: 'Seguimiento Post-Alta',
      c4: 'Gestión Hospitalaria',
    },
    logistica: {
      c1: 'Riesgo de Entrega Tardía',
      c2: 'Cuellos de Botella en Ruta',
      c3: 'Despacho y Planeación',
      c4: 'Cumplimiento SLA',
    },
    personalizado: {
      c1: 'Segmento Objetivo Principal',
      c2: 'Variables Determinantes',
      c3: 'Acción Operativa',
      c4: 'Control de Riesgo',
    },
    marketing: { c1: '', c2: '', c3: '', c4: '' },
    ventas: { c1: '', c2: '', c3: '', c4: '' },
    gestion_documental: { c1: '', c2: '', c3: '', c4: '' },
    servicio_cliente: { c1: '', c2: '', c3: '', c4: '' },
    rrhh: { c1: '', c2: '', c3: '', c4: '' },
  };

  const labels = sectorDefaults[sector];

  return [
    {
      category: labels.c1,
      title: `Perfil crítico determinado por ${primaryVar}`,
      description: `La regla de mayor concentración ("${topPosRule?.condition || primaryVar}") predice "${model.positiveClass}" con ${topPosRule?.confidencePct ?? 0}% de confianza en ${topPosRule?.support ?? 0} casos.`,
      metricHighlight: `${topPosRule?.confidencePct ?? 0}% Confianza`,
      priority: 'Alta',
    },
    {
      category: labels.c2,
      title: `${primaryVar} (${primaryPct}%) y ${secondaryVar} (${secondaryPct}%)`,
      description: `Estas variables concentran el ${(primaryPct + secondaryPct).toFixed(1)}% de la importancia del árbol y definen los umbrales de decisión operativa.`,
      metricHighlight: `${(primaryPct + secondaryPct).toFixed(1)}% Importancia`,
      priority: 'Alta',
    },
    {
      category: labels.c3,
      title: 'Implementación de reglas de decisión en flujo operativo',
      description: `Con exactitud del ${model.testMetrics.accuracy}% y AUC-ROC de ${model.testMetrics.aucRoc}, las reglas del árbol pueden integrarse como matriz de evaluación automática.`,
      metricHighlight: `${model.testMetrics.aucRoc} AUC-ROC`,
      priority: 'Estratégica',
    },
    {
      category: labels.c4,
      title: 'Balance entre detección (VP) y falsas alertas (FP)',
      description: `Se registraron ${cm.fp} falsos positivos y ${cm.fn} falsos negativos en prueba. Calibrar el punto de corte según el costo financiero de cada tipo de error.`,
      metricHighlight: `${model.testMetrics.f1Score}% F1 Score`,
      priority: 'Media',
    },
  ];
}

export function buildLocalFallbackInsights(
  dataset: Dataset,
  model: TrainedTreeModel,
  sectorLabel: string
): AIInsightsResult {
  const top1 = model.featureImportance[0];
  const top2 = model.featureImportance[1];
  const posRule = model.rules.find((r) => r.prediction === model.positiveClass) || model.rules[0];
  const cm = model.testMetrics.confusionMatrix;
  const posRate = Number(
    (((cm.vp + cm.fn) / Math.max(1, cm.total)) * 100).toFixed(1)
  );
  const accGap = Number(
    (model.trainMetrics.accuracy - model.testMetrics.accuracy).toFixed(1)
  );

  return {
    resumenEjecutivo: `El modelo de Árbol de Decisión (${model.params.algorithm}, profundidad ${model.actualDepth}, ${model.nodeCount} nodos) alcanza una exactitud de ${model.testMetrics.accuracy}% y un AUC-ROC de ${model.testMetrics.aucRoc} en datos de prueba para ${sectorLabel}, ofreciendo reglas transparentes y accionables.`,
    hallazgos: [
      {
        titulo: `${top1?.variable || 'Variable principal'} lidera la capacidad predictiva`,
        detalle: `La variable ${top1?.variable || 'principal'} explica el ${top1?.importancePct ?? 0}% de las decisiones de partición del modelo, seguida por ${top2?.variable || 'la segunda variable'} con ${top2?.importancePct ?? 0}%.`,
        impacto: `${((top1?.importancePct || 0) + (top2?.importancePct || 0)).toFixed(1)}% del modelo`,
      },
      {
        titulo: 'Regla de negocio con mayor concentración de clase objetivo',
        detalle: `Los registros que cumplen "${posRule?.condition || 'la regla raíz'}" presentan una tasa de "${model.positiveClass}" del ${posRule?.confidencePct ?? 0}% (soporte de ${posRule?.support ?? 0} registros en entrenamiento).`,
        impacto: `${posRule?.confidencePct ?? 0}% confianza`,
      },
      {
        titulo: 'Desempeño equilibrado en evaluación sobre conjunto de prueba',
        detalle: `Se obtuvieron ${cm.vp} verdaderos positivos y ${cm.vn} verdaderos negativos, logrando una sensibilidad de ${model.testMetrics.recall}% y especificidad de ${model.testMetrics.specificity}%.`,
        impacto: `${model.testMetrics.f1Score}% F1 Score`,
      },
    ],
    recomendaciones: [
      {
        titulo: `Priorizar acciones sobre umbrales críticos de ${top1?.variable || 'la variable líder'}`,
        accion: `Traducir los cortes de las ${Math.min(4, model.rules.length)} reglas principales en alertas operativas dentro del CRM o ERP de ${sectorLabel}.`,
        area: sectorLabel,
      },
      {
        titulo: 'Calibrar intervención según matriz de costos',
        accion: `Evaluar si los ${cm.fn} falsos negativos representan mayor costo que los ${cm.fp} falsos positivos para ajustar las reglas de seguimiento.`,
        area: 'Operaciones y Riesgo',
      },
      {
        titulo: 'Monitoreo continuo y reentrenamiento periódico',
        accion: `Reevaluar el árbol trimestralmente con nuevos registros para evitar deriva de datos en ${dataset.name}.`,
        area: 'Gobierno Analítico',
      },
    ],
    riesgos: [
      {
        titulo: accGap > 6 ? 'Indicio de sobreajuste (overfitting)' : 'Complejidad y estabilidad estructural',
        detalle:
          accGap > 6
            ? `La exactitud en entrenamiento (${model.trainMetrics.accuracy}%) supera en ${accGap} puntos a la de prueba (${model.testMetrics.accuracy}%).`
            : `La brecha entrenamiento-prueba es de ${accGap} puntos con ${model.nodeCount} nodos totales.`,
        mitigacion:
          accGap > 6
            ? 'Aplicar poda Cost-Complexity (CCP) o reducir la profundidad máxima en el módulo de Optimización y Poda.'
            : 'Mantener validación cruzada de 5 pliegues al incorporar nuevas variables.',
      },
      {
        titulo:
          posRate < 25 || posRate > 75
            ? 'Desbalance moderado o alto en la variable objetivo'
            : 'Sensibilidad ante valores atípicos y nulos',
        detalle: `La clase "${model.positiveClass}" representa el ${posRate}% de los datos de prueba. ${dataset.quality.totalNulls > 0 ? `El dataset original reportó ${dataset.quality.totalNulls} valores nulos.` : ''}`,
        mitigacion:
          'Monitorear F1 Score y AUC-ROC por encima de la exactitud simple y ejecutar limpieza previa de registros.',
      },
    ],
    generatedAt: new Date().toISOString(),
    source: 'local',
  };
}
