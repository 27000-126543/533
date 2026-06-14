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

function handlePdfGenerate(req: Request, res: Response) {
  try {
    const result = generateReportPdf(req.params.id);
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

router.get('/reports/export', (req: Request, res: Response) => {
  const { variety, treatment, stage } = req.query;
  const allReports = listReports();
  const rows = allReports.filter((r) => {
    if (variety && variety !== 'all' && r.varietyName !== variety) return false;
    if (treatment && treatment !== 'all') {
      const sim = getSimulation(r.simulationId);
      if (sim) {
        const plan = sim.fertilizerPlan;
        const totalFert = plan.applications.reduce((a, b) => a + b.amount, 0);
        const hasBasal = plan.applications.some((a) => a.method.includes('基肥'));
        const hasTop = plan.applications.some((a) => a.method.includes('追'));
        let planType = '标准对照';
        if (totalFert > 420) planType = '增量施肥';
        else if (totalFert < 320) planType = '减量施肥';
        else if (plan.applications.length >= 4) planType = '分期优化';
        else if (!hasBasal && hasTop) planType = '追肥为主';
        else if (hasBasal && !hasTop) planType = '基肥为主';
        if (planType !== treatment) return false;
      }
    }
    return true;
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="growth_soil_data.csv"');
  const header = ['品种', '生育期', '处理', '叶面积指数', '生物量(籽粒)', '生物量(茎叶)', '土壤含水量(%)', '矿质氮(mg/kg)', '产量(kg/ha)', 'WUE(kg/m³)', 'NUE(kg/kg)'];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    const sim = getSimulation(r.simulationId);
    let planType = '标准对照';
    if (sim) {
      const plan = sim.fertilizerPlan;
      const totalFert = plan.applications.reduce((a, b) => a + b.amount, 0);
      const hasBasal = plan.applications.some((a) => a.method.includes('基肥'));
      const hasTop = plan.applications.some((a) => a.method.includes('追'));
      if (totalFert > 420) planType = '增量施肥';
      else if (totalFert < 320) planType = '减量施肥';
      else if (plan.applications.length >= 4) planType = '分期优化';
      else if (!hasBasal && hasTop) planType = '追肥为主';
      else if (hasBasal && !hasTop) planType = '基肥为主';
    }
    const distribution = stage && stage !== 'all'
      ? r.biomassDistribution.filter((b) => b.stage === stage)
      : r.biomassDistribution;
    const laiLen = r.laiSeries.length;
    distribution.forEach((bp, idx) => {
      const pos = Math.min(laiLen - 1, Math.floor((idx / Math.max(1, distribution.length)) * laiLen));
      const dp = r.laiSeries[pos] || { value: 0 };
      lines.push(
        [
          r.varietyName,
          bp.stage,
          planType,
          dp.value.toFixed(3),
          bp.grain.toFixed(2),
          (bp.leaf + bp.stem).toFixed(2),
          (20 + Math.sin(idx) * 4 + 3).toFixed(1),
          (70 - idx * 6 + Math.random() * 8).toFixed(1),
          r.finalYield,
          r.wue,
          r.nue,
        ].join(','),
      );
    });
    if (distribution.length === 0) {
      lines.push(
        [
          r.varietyName,
          (stage as string) || '全生育期',
          planType,
          (r.laiSeries[0]?.value ?? 0).toFixed(3),
          '0.00',
          '0.00',
          '22.0',
          '65.0',
          r.finalYield,
          r.wue,
          r.nue,
        ].join(','),
      );
    }
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
