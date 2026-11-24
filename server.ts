import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/insights', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(400).json({
        error: 'La clave GEMINI_API_KEY no está configurada en los secretos del entorno.',
      });
      return;
    }

    const payload = req.body;
    if (!payload || !payload.sector || !payload.targetColumn) {
      res.status(400).json({
        error: 'Se requieren los parámetros del modelo (sector, variable objetivo y métricas) para generar insights.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Actúa como un Científico de Datos Senior y Consultor Estratégico de Negocios.
Analiza los siguientes resultados reales de un modelo de Árbol de Decisión entrenado y evaluado en datos de prueba.
Responde exclusivamente en español corporativo claro, ejecutivo, preciso y accionable.

CONTEXTO DEL MODELO:
- Sector empresarial: ${payload.sectorLabel}
- Dataset: ${payload.datasetName} (${payload.totalRows} registros totales, ${payload.trainRows} entrenamiento, ${payload.testRows} prueba)
- Variable objetivo: ${payload.targetColumn} (Clase positiva: "${payload.positiveClass}")
- Algoritmo y criterios: ${payload.algorithm} | Profundidad máx: ${payload.maxDepth} | Nodos totales: ${payload.nodeCount} | Hojas: ${payload.leafCount}
- Calidad de datos: ${payload.nullCount} valores nulos detectados, ${payload.duplicateCount} duplicados, balance de clase positiva: ${payload.positiveRatePct}%

MÉTRICAS DE EVALUACIÓN (TEST):
- Accuracy: ${payload.metrics.accuracy}%
- Precision: ${payload.metrics.precision}%
- Recall / Sensibilidad: ${payload.metrics.recall}%
- Especificidad: ${payload.metrics.specificity}%
- F1 Score: ${payload.metrics.f1Score}%
- AUC-ROC: ${payload.metrics.aucRoc}
- Matriz de confusión: VP=${payload.metrics.vp}, VN=${payload.metrics.vn}, FP=${payload.metrics.fp}, FN=${payload.metrics.fn}

IMPORTANCIA DE VARIABLES (TOP):
${(payload.featureImportance || []).slice(0, 6).map((f: { variable: string; importancePct: number }) => `- ${f.variable}: ${f.importancePct}%`).join('\n')}

REGLAS DE DECISIÓN PRINCIPALES DEL ÁRBOL:
${(payload.topRules || []).slice(0, 6).map((r: { condition: string; prediction: string; confidencePct: number; support: number }) => `- SI ${r.condition} ENTONCES ${r.prediction} (Confianza: ${r.confidencePct}%, Soporte: ${r.support} registros)`).join('\n')}

Genera un análisis estructurado con:
1. "hallazgos": 4 hallazgos clave cuantitativos basados en la importancia de variables y las reglas reales del árbol.
2. "recomendaciones": 4 recomendaciones estratégicas y operativas concretas para el sector ${payload.sectorLabel}.
3. "riesgos": 3 riesgos técnicos o de negocio detectados (por ejemplo: sobreajuste por profundidad/nodos, desbalance de clases, falsos positivos o falsos negativos según la matriz de confusión).
4. "resumenEjecutivo": Un párrafo ejecutivo breve (máximo 3 líneas) que resuma la viabilidad de desplegar este modelo en producción.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un consultor experto en Analítica Empresarial y Machine Learning. Cita cifras reales del contexto entregado sin inventar datos.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumenEjecutivo: {
                type: Type.STRING,
                description: 'Resumen ejecutivo de 2 a 3 oraciones sobre el desempeño y utilidad del modelo.',
              },
              hallazgos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    detalle: { type: Type.STRING },
                    impacto: { type: Type.STRING },
                  },
                },
              },
              recomendaciones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    accion: { type: Type.STRING },
                    area: { type: Type.STRING },
                  },
                },
              },
              riesgos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    detalle: { type: Type.STRING },
                    mitigacion: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al comunicarse con Gemini API.';
      console.error('Gemini API /api/insights error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Arboris Analytics server running on http://0.0.0.0:${PORT}`);
  });
}

createServer();
