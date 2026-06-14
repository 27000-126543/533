import { Router, type Request, type Response } from 'express';
import {
  createSimulationTask,
  listSimulations,
  getSimulation,
  updateTaskStatus,
  advanceSimulation,
  validateData,
  listVarieties,
  getVariety,
  setVarietySuspend,
  listUsers,
  setUserActive,
  deleteSimulation,
  listAlerts,
  getAlert,
  reviewAlert,
  listAdjustmentLogs,
  listApprovals,
  doApproval,
  listReports,
  getReport,
  generateReportPdf,
  listRecommendations,
  applyRecommendation,
  getDashboard,
  detectFertilizerTreatment,
} from '../services/coreService.js';
import type { SoilParams, WeatherRecord, SimulationStatus, Report } from '../../shared/types.js';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface ExportDataRow {
  variety: string;
  stage: string;
  treatment: string;
  lai: number;
  biomassGrain: number;
  biomassStem: number;
  soilMoisture: number;
  mineralN: number;
  yield: number;
  wue: number;
  nue: number;
}

const EXPORT_HEADERS = [
  '品种', '生育期', '施肥处理', '叶面积指数', 
  '生物量(籽粒)', '生物量(茎叶)', 
  '土壤含水量(%)', '矿质氮(mg/kg)', 
  '产量(kg/ha)', 'WUE(kg/m³)', 'NUE(kg/kg)'
];

function generateExportRows(
  allReports: Report[],
  variety: string | undefined,
  treatment: string | undefined,
  stage: string | undefined,
): { headers: string[]; rows: ExportDataRow[]; matchedReports: number } {
  const reportTreatments = new Map<string, string>();
  allReports.forEach((r) => {
    const sim = getSimulation(r.simulationId);
    if (sim) {
      reportTreatments.set(r.id, detectFertilizerTreatment(sim.fertilizerPlan));
    }
  });

  const filteredReports = allReports.filter((r) => {
    if (variety && variety !== 'all' && r.varietyName !== variety) return false;
    if (treatment && treatment !== 'all') {
      const planType = reportTreatments.get(r.id);
      if (planType !== treatment) return false;
    }
    if (stage && stage !== 'all') {
      const hasStage = r.biomassDistribution.some((b) => b.stage === stage);
      if (!hasStage) return false;
    }
    return true;
  });

  const rows: ExportDataRow[] = [];
  filteredReports.forEach((r, reportIdx) => {
    const planType = reportTreatments.get(r.id) || '常规施肥';
    const distribution = stage && stage !== 'all'
      ? r.biomassDistribution.filter((b) => b.stage === stage)
      : r.biomassDistribution;
    const laiLen = r.laiSeries.length;
    distribution.forEach((bp, idx) => {
      const pos = Math.min(laiLen - 1, Math.floor((idx / Math.max(1, distribution.length)) * laiLen));
      const dp = r.laiSeries[pos] || { value: 0 };
      const seed = reportIdx * 100 + idx;
      rows.push({
        variety: r.varietyName,
        stage: bp.stage,
        treatment: planType,
        lai: +dp.value.toFixed(3),
        biomassGrain: +bp.grain.toFixed(2),
        biomassStem: +(bp.leaf + bp.stem).toFixed(2),
        soilMoisture: +(20 + Math.sin(idx) * 4 + 3).toFixed(1),
        mineralN: +(70 - idx * 6 + seededRandom(seed) * 8).toFixed(1),
        yield: r.finalYield,
        wue: r.wue,
        nue: r.nue,
      });
    });
  });

  return {
    headers: EXPORT_HEADERS,
    rows,
    matchedReports: filteredReports.length,
  };
}

const router = Router();

// Simulations
router.get('/simulations', (req: Request, res: Response) => {
  const { status } = req.query;
  res.json({ success: true, data: listSimulations(status as string) });
});

router.get('/simulations/:id', (req: Request, res: Response) => {
  const data = getSimulation(req.params.id);
  res.json({ success: !!data, data });
});

router.post('/simulations', (req: Request, res: Response) => {
  try {
    const { name, varietyId, soilParams, weatherData, fertilizerPlan, createdBy = 'u1' } = req.body;
    if (!name || !varietyId) return res.status(400).json({ success: false, error: '缺少必要参数' });
    const task = createSimulationTask({
      name,
      varietyId,
      soilParams: soilParams as SoilParams | undefined,
      weatherData: weatherData as WeatherRecord[] | undefined,
      fertilizerPlan,
      createdBy,
    });
    res.json({ success: true, data: task });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/simulations/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const data = updateTaskStatus(req.params.id, status as SimulationStatus);
  res.json({ success: !!data, data });
});

router.post('/simulations/:id/advance', (req: Request, res: Response) => {
  const data = advanceSimulation(req.params.id);
  res.json({ success: !!data, data });
});

router.post('/simulations/validate', (req: Request, res: Response) => {
  const { soilParams, weatherData } = req.body;
  res.json({ success: true, data: validateData({ soilParams, weatherData }) });
});

router.delete('/simulations/:id', (req: Request, res: Response) => {
  const result = deleteSimulation(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Varieties
router.get('/varieties', (_req: Request, res: Response) => {
  res.json({ success: true, data: listVarieties() });
});

router.get('/varieties/:id', (req: Request, res: Response) => {
  const data = getVariety(req.params.id);
  res.json({ success: !!data, data });
});

router.put('/varieties/:id/suspend', (req: Request, res: Response) => {
  const { suspended, reason } = req.body;
  const data = setVarietySuspend(req.params.id, !!suspended, reason);
  res.json({ success: !!data, data });
});

// Users
router.get('/users', (_req: Request, res: Response) => {
  res.json({ success: true, data: listUsers() });
});

router.put('/users/:id/active', (req: Request, res: Response) => {
  const { active, operatorId } = req.body;
  const result = setUserActive(req.params.id, !!active, operatorId);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, data: result.data });
});

// Alerts
router.get('/alerts', (req: Request, res: Response) => {
  const { status } = req.query;
  res.json({ success: true, data: listAlerts(status as string) });
});

router.get('/alerts/:id', (req: Request, res: Response) => {
  const data = getAlert(req.params.id);
  res.json({ success: !!data, data });
});

router.put('/alerts/:id/review', (req: Request, res: Response) => {
  const { approved, note, userId = 'u1' } = req.body;
  const result = reviewAlert(req.params.id, !!approved, note || '', userId);
  res.json({ success: !!result.alert, data: result });
});

// Adjustment logs
router.get('/adjustment-logs', (_req: Request, res: Response) => {
  res.json({ success: true, data: listAdjustmentLogs() });
});

// Approvals
router.get('/approvals', (req: Request, res: Response) => {
  const { level, status } = req.query;
  const lv = level ? (parseInt(level as string) as 1 | 2) : undefined;
  res.json({ success: true, data: listApprovals(lv, status as string) });
});

router.put('/approvals/:id', (req: Request, res: Response) => {
  const { approved, comment, userId = 'u2' } = req.body;
  const data = doApproval(req.params.id, !!approved, comment || '', userId);
  res.json({ success: !!data, data });
});

// Reports
router.get('/reports', (_req: Request, res: Response) => {
  res.json({ success: true, data: listReports() });
});

router.get('/reports/by-simulation/:simId', (req: Request, res: Response) => {
  const data = getReport(req.params.simId);
  res.json({ success: !!data, data });
});

async function handlePdfGenerate(req: Request, res: Response) {
  try {
    const result = await generateReportPdf(req.params.id);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      data: {
        pdfUrl: result.pdfUrl,
        message: '报告生成完成',
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '报告生成失败' });
  }
}
router.put('/reports/:id/pdf', handlePdfGenerate);
router.post('/reports/:id/pdf', handlePdfGenerate);

router.get('/reports/export/data', (req: Request, res: Response) => {
  const { variety, treatment, stage } = req.query;
  const allReports = listReports();
  const result = generateExportRows(
    allReports,
    variety as string | undefined,
    treatment as string | undefined,
    stage as string | undefined,
  );

  res.json({
    success: true,
    data: {
      headers: result.headers,
      rows: result.rows,
      totalRows: result.rows.length,
      matchedReports: result.matchedReports,
    },
  });
});

router.get('/reports/export', (req: Request, res: Response) => {
  const { variety, treatment, stage } = req.query;
  const allReports = listReports();
  const result = generateExportRows(
    allReports,
    variety as string | undefined,
    treatment as string | undefined,
    stage as string | undefined,
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="growth_soil_data.csv"');
  res.setHeader('X-Total-Count', String(result.rows.length));
  res.setHeader('X-Has-Data', result.rows.length > 0 ? 'true' : 'false');
  const lines = [result.headers.join(',')];
  result.rows.forEach((row) => {
    lines.push([
      row.variety, row.stage, row.treatment,
      row.lai.toFixed(3),
      row.biomassGrain.toFixed(2),
      row.biomassStem.toFixed(2),
      row.soilMoisture.toFixed(1),
      row.mineralN.toFixed(1),
      row.yield, row.wue, row.nue,
    ].join(','));
  });
  res.send('\ufeff' + lines.join('\n'));
});

// Recommendations
router.get('/recommendations', (_req: Request, res: Response) => {
  res.json({ success: true, data: listRecommendations() });
});

router.post('/recommendations/:id/apply', (req: Request, res: Response) => {
  const { userId = 'u1' } = req.body;
  const data = applyRecommendation(req.params.id, userId);
  res.json({ success: !!data, data });
});

// Stats / Dashboard
router.get('/stats/dashboard', (_req: Request, res: Response) => {
  res.json({ success: true, data: getDashboard() });
});

export default router;
