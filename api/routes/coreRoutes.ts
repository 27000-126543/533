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
  listAlerts,
  getAlert,
  reviewAlert,
  listAdjustmentLogs,
  listApprovals,
  doApproval,
  listReports,
  getReport,
  listRecommendations,
  applyRecommendation,
  getDashboard,
} from '../services/coreService.js';
import type { SoilParams, WeatherRecord, SimulationStatus } from '../../shared/types.js';

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

router.post('/reports/:id/pdf', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'PDF生成请求已提交，将在后台完成后可下载',
      downloadUrl: `/api/reports/${req.params.id}/download`,
    },
  });
});

router.get('/reports/export', (req: Request, res: Response) => {
  const { variety, treatment, stage } = req.query;
  const rows = listReports().filter((r) => {
    if (variety && variety !== 'all' && r.varietyName !== variety) return false;
    return true;
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="growth_soil_data.csv"');
  const header = ['品种', '生育期', '处理', '叶面积指数', '生物量', '土壤含水量', '矿质氮', '产量', 'WUE', 'NUE'];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    r.laiSeries.slice(0, 10).forEach((dp, i) => {
      lines.push(
        [
          r.varietyName,
          (stage as string) || '全生育期',
          (treatment as string) || '标准对照',
          dp.value,
          (r.biomassDistribution[i % r.biomassDistribution.length]?.grain ?? 0),
          20 + Math.random() * 8,
          60 + Math.random() * 30,
          r.finalYield,
          r.wue,
          r.nue,
        ].join(','),
      );
    });
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
