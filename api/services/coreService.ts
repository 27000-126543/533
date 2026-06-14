import type {
  SimulationTask,
  SoilParams,
  WeatherRecord,
  FertilizerPlan,
  DataPoint,
  Alert,
  AdjustmentLog,
  Approval,
  Report,
  Recommendation,
  Variety,
  DailyStats,
  YieldTrend,
  DashboardData,
  BiomassDataPoint,
  NitrogenBalance,
  CarbonFootprint,
  SimulationStatus,
} from '../../shared/types.js';
import { execute, queryAll, queryOne, runTransaction } from '../db/database.js';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const STATUS_FLOW: SimulationStatus[] = [
  'pending_validation',
  'parsing',
  'initializing',
  'crop_growth',
  'soil_process',
  'nitrogen_cycle',
  'completed',
];

const STATUS_LABELS: Record<SimulationStatus | 'error_rollback', string> = {
  pending_validation: '待校验',
  parsing: '数据解析中',
  initializing: '模型初始化',
  crop_growth: '作物生长模拟',
  soil_process: '土壤过程模拟',
  nitrogen_cycle: '氮素循环模拟',
  completed: '已完成',
  error_rollback: '错误回滚',
};

function statusLabel(status: string): string {
  return (STATUS_LABELS as any)[status] || status;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');
const reportsDir = path.join(dataDir, 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

export function parseTaskFromRow(row: any): SimulationTask {
  return {
    id: row.id,
    name: row.name,
    status: row.status as SimulationStatus,
    varietyId: row.variety_id,
    createdBy: row.created_by,
    progress: row.progress,
    yieldPrediction: row.yield_prediction,
    soilParams: JSON.parse(row.soil_params),
    weatherData: JSON.parse(row.weather_data),
    fertilizerPlan: JSON.parse(row.fertilizer_plan),
    laiSeries: row.lai_series ? JSON.parse(row.lai_series) : null,
    soilMoistureSeries: row.soil_moisture_series ? JSON.parse(row.soil_moisture_series) : null,
    mineralNitrogenSeries: row.mineral_nitrogen_series ? JSON.parse(row.mineral_nitrogen_series) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function generateSeries(days = 120, base: number, amp: number): DataPoint[] {
  const arr: DataPoint[] = [];
  for (let i = 1; i <= days; i++) {
    const day = `D${i}`;
    const noise = (Math.random() - 0.5) * amp * 0.2;
    let v = 0;
    if (base > 0) {
      const peak = days * 0.55;
      const t = i / peak;
      v = base * (1 - Math.exp(-3 * t)) * Math.exp(-0.8 * Math.max(0, t - 1)) + noise;
    } else {
      v = -amp * (0.6 + 0.4 * Math.sin(i / 18)) + noise;
    }
    arr.push({ time: day, value: Math.max(0, +v.toFixed(3)) });
  }
  return arr;
}

function generateWeather(days = 120): WeatherRecord[] {
  const arr: WeatherRecord[] = [];
  const start = new Date();
  start.setMonth(start.getMonth() - 4);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    arr.push({
      date: d.toISOString().slice(0, 10),
      tempMax: +(25 + 8 * Math.sin(i / 40) + (Math.random() - 0.5) * 4).toFixed(1),
      tempMin: +(15 + 5 * Math.sin(i / 40) + (Math.random() - 0.5) * 3).toFixed(1),
      radiation: +(14 + 8 * Math.sin(i / 40) + Math.random() * 4).toFixed(1),
      precipitation: +(Math.random() > 0.75 ? Math.random() * 30 : 0).toFixed(1),
      windSpeed: +(2 + Math.random() * 3).toFixed(1),
      humidity: +(60 + Math.random() * 30).toFixed(1),
    });
  }
  return arr;
}

export const defaultSoil: SoilParams = {
  organicMatter: 2.4,
  totalNitrogen: 0.12,
  phValue: 6.8,
  bulkDensity: 1.35,
  fieldCapacity: 28,
  wiltingPoint: 12,
  initialMoisture: 22,
  initialMineralN: 85,
};

export function defaultFertilizer(): FertilizerPlan {
  return {
    applications: [
      { date: 'D0', type: '尿素', amount: 120, method: '基肥' },
      { date: 'D40', type: '复合肥', amount: 200, method: '追肥' },
      { date: 'D80', type: '尿素', amount: 80, method: '追肥' },
    ],
  };
}

export function createSimulationTask(input: {
  name: string;
  varietyId: string;
  soilParams?: SoilParams;
  weatherData?: WeatherRecord[];
  fertilizerPlan?: FertilizerPlan;
  createdBy: string;
}): SimulationTask {
  const id = uuid();
  const soil = input.soilParams ?? defaultSoil;
  const weather = input.weatherData ?? generateWeather();
  const fert = input.fertilizerPlan ?? defaultFertilizer();
  execute(
    `INSERT INTO simulation_tasks (id, name, status, variety_id, created_by, progress, soil_params, weather_data, fertilizer_plan)
     VALUES (?, ?, 'pending_validation', ?, ?, 0, ?, ?, ?)`,
    [id, input.name, input.varietyId, input.createdBy, JSON.stringify(soil), JSON.stringify(weather), JSON.stringify(fert)],
  );
  return getSimulation(id)!;
}

export function getSimulation(id: string): SimulationTask | null {
  const row = queryOne(
    `SELECT st.*, v.name as vname, u.username as uname
     FROM simulation_tasks st
     LEFT JOIN varieties v ON v.id = st.variety_id
     LEFT JOIN users u ON u.id = st.created_by
     WHERE st.id = ?`,
    [id],
  );
  if (!row) return null;
  const task = parseTaskFromRow(row);
  return { ...task, varietyName: (row as any).vname, creatorName: (row as any).uname };
}

export function listSimulations(status?: string): SimulationTask[] {
  let sql = `SELECT st.*, v.name as vname, u.username as uname
             FROM simulation_tasks st
             LEFT JOIN varieties v ON v.id = st.variety_id
             LEFT JOIN users u ON u.id = st.created_by`;
  const params: any[] = [];
  if (status) {
    sql += ` WHERE st.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY st.created_at DESC LIMIT 100`;
  const rows = queryAll(sql, params);
  return rows.map((r) => {
    const t = parseTaskFromRow(r);
    return { ...t, varietyName: (r as any).vname, creatorName: (r as any).uname };
  });
}

export function updateTaskStatus(id: string, status: SimulationStatus): SimulationTask | null {
  const idx = STATUS_FLOW.indexOf(status);
  const progress = idx >= 0 ? Math.round((idx / (STATUS_FLOW.length - 1)) * 100) : 0;
  execute(
    `UPDATE simulation_tasks SET status = ?, progress = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, progress, id],
  );
  if (status === 'completed') {
    finalizeSimulation(id);
  }
  return getSimulation(id);
}

export function advanceSimulation(id: string): SimulationTask | null {
  const task = getSimulation(id);
  if (!task) return null;
  const idx = STATUS_FLOW.indexOf(task.status);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return task;
  const nextStatus = STATUS_FLOW[idx + 1];
  const progress = Math.round(((idx + 1) / (STATUS_FLOW.length - 1)) * 100);

  let lai = task.laiSeries ?? [];
  let sm = task.soilMoistureSeries ?? [];
  let mn = task.mineralNitrogenSeries ?? [];
  const totalDays = 120;
  const dayCount = Math.round(((idx + 1) / STATUS_FLOW.length) * totalDays);
  lai = generateSeries(dayCount, 6.5, 1.2);
  sm = generateSeries(dayCount, 0, 12).map((d) => ({
    time: d.time,
    value: +(20 + d.value - 6).toFixed(3),
  }));
  mn = generateSeries(dayCount, 0, 40).map((d) => ({
    time: d.time,
    value: +(80 - d.value).toFixed(3),
  }));

  execute(
    `UPDATE simulation_tasks SET status = ?, progress = ?, lai_series = ?, soil_moisture_series = ?, mineral_nitrogen_series = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [nextStatus, progress, JSON.stringify(lai), JSON.stringify(sm), JSON.stringify(mn), id],
  );

  if (nextStatus === 'nitrogen_cycle' && Math.random() > 0.45) {
    maybeTriggerAlert(id, sm, mn);
  }
  if (nextStatus === 'completed') {
    finalizeSimulation(id);
  }
  return getSimulation(id);
}

function maybeTriggerAlert(simId: string, sm: DataPoint[], mn: DataPoint[]) {
  const lastSm = sm[sm.length - 1]?.value ?? 20;
  const lastMn = mn[mn.length - 1]?.value ?? 60;
  if (lastSm < 15) {
    const level = lastSm < 10 ? 3 : lastSm < 12 ? 2 : 1;
    const thr = 15;
    createAlert({
      simulationId: simId,
      level: level as 1 | 2 | 3,
      type: 'water_deficit',
      message: `土壤含水量低至${lastSm.toFixed(1)}%，阈值${thr}%，存在水分亏缺风险`,
      threshold: thr,
      currentValue: lastSm,
    });
  }
  if (lastMn > 65 || lastMn < 40) {
    const diff = lastMn > 65 ? lastMn - 65 : 40 - lastMn;
    const level = diff > 15 ? 3 : diff > 8 ? 2 : 1;
    const type = lastMn > 65 ? 'nitrogen_leaching' : 'nitrogen_leaching';
    const thr = 65;
    createAlert({
      simulationId: simId,
      level: level as 1 | 2 | 3,
      type,
      message: `矿质氮浓度${lastMn.toFixed(1)}mg/kg异常，氮素淋失风险升高`,
      threshold: thr,
      currentValue: lastMn,
    });
  }
}

function finalizeSimulation(id: string) {
  const task = getSimulation(id);
  if (!task) return;
  const variety = getVariety(task.varietyId);
  const baseYield = variety?.type === '玉米' ? 9200 : variety?.type === '小麦' ? 6800 : 8500;
  const yieldPrediction = +(baseYield * (0.88 + Math.random() * 0.2)).toFixed(0);
  execute(`UPDATE simulation_tasks SET yield_prediction = ?, updated_at = datetime('now') WHERE id = ?`, [yieldPrediction, id]);
  if (!getReport(id)) {
    createReport(id, task.varietyId, yieldPrediction);
  }
  if (!getApproval(id, 1)) {
    createApproval(id, 1);
  }
  if (!getApproval(id, 2)) {
    createApproval(id, 2);
  }
  updateVarietyDeviation(task.varietyId, yieldPrediction);
}

function updateVarietyDeviation(varietyId: string, newYield: number) {
  const past = queryAll<{ yield_prediction: number }>(
    `SELECT yield_prediction FROM simulation_tasks WHERE variety_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 4`,
    [varietyId],
  );
  const yields = past.map((r) => r.yield_prediction).filter((y) => y);
  if (yields.length < 2) return;
  const avg = yields.slice(1).reduce((a, b) => a + b, 0) / (yields.length - 1);
  const deviation = Math.abs((newYield - avg) / avg) * 100;
  const v = getVariety(varietyId);
  if (!v) return;
  let consecutiveDeviations = deviation > 15 ? v.consecutiveDeviations + 1 : 0;
  let isSuspended = v.isSuspended;
  let suspendedAt = v.suspendedAt;
  let suspendedReason = v.suspendedReason;
  if (consecutiveDeviations >= 3) {
    isSuspended = true;
    suspendedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    suspendedReason = `连续三次模拟产量预测偏差超过15%（最新偏差${deviation.toFixed(1)}%）`;
  }
  execute(
    `UPDATE varieties SET consecutive_deviations = ?, last_yield_deviation = ?, is_suspended = ?, suspended_at = ?, suspended_reason = ? WHERE id = ?`,
    [consecutiveDeviations, +deviation.toFixed(1), isSuspended ? 1 : 0, suspendedAt, suspendedReason, varietyId],
  );
}

export function validateData(input: { soilParams?: SoilParams; weatherData?: WeatherRecord[] }) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = input.soilParams;
  if (s) {
    if (s.organicMatter < 0.1 || s.organicMatter > 15) errors.push(`有机质${s.organicMatter}超出合理范围0.1-15%`);
    if (s.totalNitrogen < 0.01 || s.totalNitrogen > 1) errors.push(`全氮${s.totalNitrogen}超出合理范围0.01-1%`);
    if (s.phValue < 3 || s.phValue > 10) errors.push(`pH值${s.phValue}超出合理范围3-10`);
    if (s.bulkDensity < 0.9 || s.bulkDensity > 1.8) errors.push(`容重${s.bulkDensity}超出合理范围0.9-1.8g/cm³`);
    if (s.fieldCapacity <= s.wiltingPoint) errors.push(`田间持水量必须大于凋萎系数`);
    if (s.initialMoisture < s.wiltingPoint || s.initialMoisture > s.fieldCapacity + 8)
      warnings.push(`初始含水量${s.initialMoisture}建议在凋萎系数与田间持水量之间`);
  }
  const w = input.weatherData;
  if (w && w.length) {
    for (let i = 0; i < Math.min(w.length, 10); i++) {
      if (w[i].tempMax < w[i].tempMin) {
        errors.push(`第${i + 1}天气象记录最高温<最低温`);
        break;
      }
    }
    if (w.length < 60) warnings.push(`气象数据建议不少于60天以保证模拟精度`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function listVarieties(): Variety[] {
  const rows = queryAll(`SELECT * FROM varieties ORDER BY is_suspended, name`);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    isSuspended: !!r.is_suspended,
    consecutiveDeviations: r.consecutive_deviations,
    lastYieldDeviation: r.last_yield_deviation,
    suspendedAt: r.suspended_at,
    suspendedReason: r.suspended_reason,
  }));
}

export function getVariety(id: string): Variety | null {
  const row = queryOne(`SELECT * FROM varieties WHERE id = ?`, [id]);
  if (!row) return null;
  const r = row as any;
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    isSuspended: !!r.is_suspended,
    consecutiveDeviations: r.consecutive_deviations,
    lastYieldDeviation: r.last_yield_deviation,
    suspendedAt: r.suspended_at,
    suspendedReason: r.suspended_reason,
  };
}

export function setVarietySuspend(id: string, isSuspended: boolean, reason?: string) {
  execute(
    `UPDATE varieties SET is_suspended = ?, suspended_at = ?, suspended_reason = ? WHERE id = ?`,
    [isSuspended ? 1 : 0, isSuspended ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null, isSuspended ? reason ?? '手动暂停' : null, id],
  );
  if (!isSuspended) {
    execute(`UPDATE varieties SET consecutive_deviations = 0 WHERE id = ?`, [id]);
  }
  return getVariety(id);
}

export function listUsers() {
  const rows = queryAll(`SELECT id, username, role, active, created_at FROM users ORDER BY role, username`);
  return rows.map((r: any) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    active: !!r.active,
    createdAt: r.created_at,
  }));
}

export function getUserById(id: string) {
  const row = queryOne(`SELECT id, username, role, active, created_at FROM users WHERE id = ?`, [id]);
  if (!row) return null;
  const r = row as any;
  return {
    id: r.id,
    username: r.username,
    role: r.role,
    active: !!r.active,
    createdAt: r.created_at,
  };
}

export function setUserActive(id: string, active: boolean, currentUserId: string) {
  const targetUser = getUserById(id);
  if (!targetUser) return { success: false, error: '用户不存在' };
  if (id === currentUserId) return { success: false, error: '不能禁用当前登录用户自己' };
  const currentUser = getUserById(currentUserId);
  if (!currentUser || currentUser.role !== 'admin') return { success: false, error: '只有管理员才能修改用户状态' };
  execute(`UPDATE users SET active = ? WHERE id = ?`, [active ? 1 : 0, id]);
  return { success: true, data: getUserById(id)! };
}

export function deleteSimulation(id: string): { success: boolean; error?: string } {
  const sim = getSimulation(id);
  if (!sim) return { success: false, error: '模拟任务不存在' };
  const deletableStatuses: SimulationStatus[] = ['pending_validation', 'parsing', 'initializing', 'error_rollback'];
  if (!deletableStatuses.includes(sim.status)) {
    return { success: false, error: `任务已进入「${statusLabel(sim.status)}」阶段，不允许删除` };
  }
  const alertIds = queryAll<{ id: string }>(`SELECT id FROM alerts WHERE simulation_id = ?`, [id]).map((a) => a.id);
  if (alertIds.length > 0) {
    const placeholders = alertIds.map(() => '?').join(',');
    execute(`DELETE FROM adjustment_logs WHERE alert_id IN (${placeholders})`, alertIds);
    execute(`DELETE FROM alerts WHERE simulation_id = ?`, [id]);
  }
  execute(`DELETE FROM approvals WHERE simulation_id = ?`, [id]);
  execute(`DELETE FROM reports WHERE simulation_id = ?`, [id]);
  execute(`DELETE FROM simulation_tasks WHERE id = ?`, [id]);
  return { success: true };
}

export function getReportById(reportId: string): Report | null {
  const row = queryOne(
    `SELECT r.*, s.name as sname FROM reports r LEFT JOIN simulation_tasks s ON s.id = r.simulation_id WHERE r.id = ?`,
    [reportId],
  );
  if (!row) return null;
  const r = row as any;
  return {
    id: r.id,
    simulationId: r.simulation_id,
    simulationName: r.sname,
    varietyName: r.variety_name,
    laiSeries: JSON.parse(r.lai_series || '[]'),
    biomassDistribution: JSON.parse(r.biomass_distribution || '[]'),
    yieldContour: JSON.parse(r.yield_contour || '[]'),
    nitrogenBalance: JSON.parse(r.nitrogen_balance || '{}'),
    carbonFootprint: JSON.parse(r.carbon_footprint || '{}'),
    wue: r.wue,
    nue: r.nue,
    finalYield: r.final_yield,
    pdfUrl: r.pdf_url,
    createdAt: r.created_at,
  };
}

export function generateReportPdf(reportId: string): { success: boolean; pdfUrl?: string; error?: string } {
  const report = getReportById(reportId);
  if (!report) return { success: false, error: '报告不存在' };
  const filePath = path.join(reportsDir, `${reportId}.html`);
  const pdfUrl = `/data/reports/${reportId}.html`;
  const nb = report.nitrogenBalance;
  const cf = report.carbonFootprint;
  const stages = report.biomassDistribution.map((b) => b.stage).join('、') || '苗期、拔节期、抽穗期、灌浆期、成熟期';
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>作物生长模拟报告 - ${report.simulationName || report.id}</title>
<style>
body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; }
h1 { color: #2d5016; border-bottom: 3px solid #4a7c23; padding-bottom: 12px; }
h2 { color: #3a6b1e; margin-top: 32px; border-left: 4px solid #6aa84f; padding-left: 12px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
.info-item { background: #f5f9f0; padding: 14px 18px; border-radius: 8px; }
.info-item .label { color: #666; font-size: 13px; margin-bottom: 4px; }
.info-item .value { font-size: 18px; font-weight: 600; color: #2d5016; }
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
.metric { background: linear-gradient(135deg, #e8f5e0, #d4ecd0); padding: 20px; border-radius: 10px; text-align: center; }
.metric .name { font-size: 13px; color: #5a7a4a; margin-bottom: 8px; }
.metric .val { font-size: 24px; font-weight: 700; color: #2d5016; }
.metric .unit { font-size: 12px; color: #888; font-weight: 400; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e0e0e0; }
th { background: #f0f7ea; color: #2d5016; font-weight: 600; }
.section { margin: 20px 0; }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px; text-align: center; }
</style>
</head>
<body>
<h1>📊 作物生长模拟报告</h1>
<div class="section">
  <h2>📋 基本信息</h2>
  <div class="info-grid">
    <div class="info-item"><div class="label">模拟任务名称</div><div class="value">${report.simulationName || '-'}</div></div>
    <div class="info-item"><div class="label">作物品种</div><div class="value">${report.varietyName}</div></div>
    <div class="info-item"><div class="label">报告编号</div><div class="value">${report.id.slice(0, 8)}</div></div>
    <div class="info-item"><div class="label">生成时间</div><div class="value">${report.createdAt || new Date().toLocaleString('zh-CN')}</div></div>
  </div>
</div>
<div class="section">
  <h2>🎯 核心指标</h2>
  <div class="metrics">
    <div class="metric"><div class="name">最终产量</div><div class="val">${report.finalYield || 0}<span class="unit"> kg/ha</span></div></div>
    <div class="metric"><div class="name">水分利用效率 WUE</div><div class="val">${report.wue || 0}<span class="unit"> kg/m³</span></div></div>
    <div class="metric"><div class="name">氮素利用效率 NUE</div><div class="val">${report.nue || 0}<span class="unit"> kg/kg</span></div></div>
    <div class="metric"><div class="name">模拟生育期</div><div class="val" style="font-size:14px;">${stages}</div></div>
  </div>
</div>
<div class="section">
  <h2>🌿 生物量分配（各生育期）</h2>
  <table>
    <thead><tr><th>生育期</th><th>叶片 (t/ha)</th><th>茎秆 (t/ha)</th><th>根系 (t/ha)</th><th>籽粒 (t/ha)</th></tr></thead>
    <tbody>
      ${report.biomassDistribution.map((b) => `<tr><td>${b.stage}</td><td>${b.leaf.toFixed(2)}</td><td>${b.stem.toFixed(2)}</td><td>${b.root.toFixed(2)}</td><td>${b.grain.toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>
</div>
<div class="section">
  <h2>💧 氮素平衡</h2>
  <table>
    <thead><tr><th>项目</th><th>数值 (kg N/ha)</th><th>占比</th></tr></thead>
    <tbody>
      <tr><td>总投入</td><td>${nb.input?.toFixed(1) || '-'}</td><td>100%</td></tr>
      <tr><td>作物吸收</td><td>${nb.uptake?.toFixed(1) || '-'}</td><td>${nb.input ? ((nb.uptake / nb.input) * 100).toFixed(1) : '-'}%</td></tr>
      <tr><td>淋失损失</td><td>${nb.leaching?.toFixed(1) || '-'}</td><td>${nb.input ? ((nb.leaching / nb.input) * 100).toFixed(1) : '-'}%</td></tr>
      <tr><td>挥发损失</td><td>${nb.volatilization?.toFixed(1) || '-'}</td><td>${nb.input ? ((nb.volatilization / nb.input) * 100).toFixed(1) : '-'}%</td></tr>
      <tr><td>土壤残留</td><td>${nb.residue?.toFixed(1) || '-'}</td><td>${nb.input ? ((nb.residue / nb.input) * 100).toFixed(1) : '-'}%</td></tr>
    </tbody>
  </table>
</div>
<div class="section">
  <h2>🌍 碳足迹分析</h2>
  <table>
    <thead><tr><th>排放源</th><th>排放量 (kg CO₂e/ha)</th><th>占比</th></tr></thead>
    <tbody>
      <tr><td>肥料生产与施用</td><td>${cf.fertilizerEmission?.toFixed(1) || '-'}</td><td>${cf.totalEmission ? ((cf.fertilizerEmission / cf.totalEmission) * 100).toFixed(1) : '-'}%</td></tr>
      <tr><td>灌溉能耗</td><td>${cf.irrigationEmission?.toFixed(1) || '-'}</td><td>${cf.totalEmission ? ((cf.irrigationEmission / cf.totalEmission) * 100).toFixed(1) : '-'}%</td></tr>
      <tr><td>土壤排放</td><td>${cf.soilEmission?.toFixed(1) || '-'}</td><td>${cf.totalEmission ? ((cf.soilEmission / cf.totalEmission) * 100).toFixed(1) : '-'}%</td></tr>
      <tr style="font-weight:600;background:#f0f7ea;"><td>总排放量</td><td>${cf.totalEmission?.toFixed(1) || '-'}</td><td>100%</td></tr>
      <tr><td>单位产量排放</td><td colspan="2">${cf.perUnitYield?.toFixed(3) || '-'} kg CO₂e / t 产量</td></tr>
    </tbody>
  </table>
</div>
<div class="footer">
  <p>本报告由作物生长模拟系统自动生成 | 仅供科研和生产决策参考</p>
  <p>Report ID: ${report.id}</p>
</div>
</body>
</html>`;
  fs.writeFileSync(filePath, html, 'utf-8');
  execute(`UPDATE reports SET pdf_url = ? WHERE id = ?`, [pdfUrl, reportId]);
  return { success: true, pdfUrl };
}

export function createAlert(input: Omit<Alert, 'id' | 'status' | 'reviewedBy' | 'reviewNote' | 'createdAt'>): Alert {
  const id = uuid();
  execute(
    `INSERT INTO alerts (id, simulation_id, level, type, message, threshold, current_value, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, input.simulationId, input.level, input.type, input.message, input.threshold, input.currentValue],
  );
  return getAlert(id)!;
}

export function getAlert(id: string): Alert | null {
  const row = queryOne(
    `SELECT a.*, s.name as sname, u.username as rname
     FROM alerts a
     LEFT JOIN simulation_tasks s ON s.id = a.simulation_id
     LEFT JOIN users u ON u.id = a.reviewed_by
     WHERE a.id = ?`,
    [id],
  );
  if (!row) return null;
  const r = row as any;
  return {
    id: r.id,
    simulationId: r.simulation_id,
    simulationName: r.sname,
    level: r.level,
    type: r.type,
    message: r.message,
    threshold: r.threshold,
    currentValue: r.current_value,
    status: r.status,
    reviewedBy: r.reviewed_by,
    reviewerName: r.rname,
    reviewNote: r.review_note,
    createdAt: r.created_at,
  };
}

export function listAlerts(status?: string): Alert[] {
  let sql = `SELECT a.*, s.name as sname, u.username as rname
             FROM alerts a
             LEFT JOIN simulation_tasks s ON s.id = a.simulation_id
             LEFT JOIN users u ON u.id = a.reviewed_by`;
  const params: any[] = [];
  if (status) {
    sql += ` WHERE a.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY a.created_at DESC LIMIT 100`;
  const rows = queryAll(sql, params);
  return rows.map((r: any) => ({
    id: r.id,
    simulationId: r.simulation_id,
    simulationName: r.sname,
    level: r.level,
    type: r.type,
    message: r.message,
    threshold: r.threshold,
    currentValue: r.current_value,
    status: r.status,
    reviewedBy: r.reviewed_by,
    reviewerName: r.rname,
    reviewNote: r.review_note,
    createdAt: r.created_at,
  }));
}

export function reviewAlert(id: string, approved: boolean, note: string, userId: string): { alert: Alert | null; log?: AdjustmentLog | null } {
  let status = approved ? 'adjusted' : 'dismissed';
  execute(
    `UPDATE alerts SET status = ?, reviewed_by = ?, review_note = ? WHERE id = ?`,
    [status, userId, note, id],
  );
  let log: AdjustmentLog | null = null;
  if (approved) {
    const alert = getAlert(id);
    const task = alert ? getSimulation(alert.simulationId) : null;
    if (task) {
      const plan = task.fertilizerPlan;
      const totalFert = plan.applications.reduce((a, b) => a + b.amount, 0);
      let newIrr = task.soilParams.initialMoisture + 5;
      let newFert = alert?.type === 'nitrogen_leaching' ? totalFert * 0.8 : totalFert;
      if (alert?.type === 'water_deficit') newIrr = 28;
      log = createAdjustmentLog({
        alertId: id,
        previousIrrigation: task.soilParams.initialMoisture,
        newIrrigation: newIrr,
        previousFertilizer: totalFert,
        newFertilizer: +newFert.toFixed(0),
        reason: note || '自动调整',
        adjustedBy: userId,
      });
    }
  }
  return { alert: getAlert(id), log };
}

export function createAdjustmentLog(input: Omit<AdjustmentLog, 'id' | 'adjustedAt'>): AdjustmentLog {
  const id = uuid();
  execute(
    `INSERT INTO adjustment_logs (id, alert_id, previous_irrigation, new_irrigation, previous_fertilizer, new_fertilizer, reason, adjusted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.alertId, input.previousIrrigation, input.newIrrigation, input.previousFertilizer, input.newFertilizer, input.reason, input.adjustedBy],
  );
  return getAdjustmentLogByAlert(input.alertId)!;
}

export function getAdjustmentLogByAlert(alertId: string): AdjustmentLog | null {
  const row = queryOne(
    `SELECT a.*, u.username as aname FROM adjustment_logs a LEFT JOIN users u ON u.id = a.adjusted_by WHERE a.alert_id = ?`,
    [alertId],
  );
  if (!row) return null;
  const r = row as any;
  return {
    id: r.id,
    alertId: r.alert_id,
    previousIrrigation: r.previous_irrigation,
    newIrrigation: r.new_irrigation,
    previousFertilizer: r.previous_fertilizer,
    newFertilizer: r.new_fertilizer,
    reason: r.reason,
    adjustedBy: r.adjusted_by,
    adjustedByName: r.aname,
    adjustedAt: r.adjusted_at,
  };
}

export function listAdjustmentLogs(): AdjustmentLog[] {
  const rows = queryAll(
    `SELECT a.*, u.username as aname FROM adjustment_logs a LEFT JOIN users u ON u.id = a.adjusted_by ORDER BY a.adjusted_at DESC LIMIT 100`,
  );
  return rows.map((r: any) => ({
    id: r.id,
    alertId: r.alert_id,
    previousIrrigation: r.previous_irrigation,
    newIrrigation: r.new_irrigation,
    previousFertilizer: r.previous_fertilizer,
    newFertilizer: r.new_fertilizer,
    reason: r.reason,
    adjustedBy: r.adjusted_by,
    adjustedByName: r.aname,
    adjustedAt: r.adjusted_at,
  }));
}

export function createApproval(simulationId: string, level: 1 | 2): Approval {
  const id = uuid();
  execute(
    `INSERT INTO approvals (id, simulation_id, level, status) VALUES (?, ?, ?, 'pending')`,
    [id, simulationId, level],
  );
  return getApprovalById(id)!;
}

export function getApproval(simulationId: string, level: 1 | 2): Approval | null {
  const row = queryOne(
    `SELECT a.*, s.name as sname, v.name as vname, u.username as rname
     FROM approvals a
     LEFT JOIN simulation_tasks s ON s.id = a.simulation_id
     LEFT JOIN varieties v ON v.id = s.variety_id
     LEFT JOIN users u ON u.id = a.reviewer_id
     WHERE a.simulation_id = ? AND a.level = ?`,
    [simulationId, level],
  );
  return row ? parseApproval(row) : null;
}

export function getApprovalById(id: string): Approval | null {
  const row = queryOne(
    `SELECT a.*, s.name as sname, v.name as vname, u.username as rname
     FROM approvals a
     LEFT JOIN simulation_tasks s ON s.id = a.simulation_id
     LEFT JOIN varieties v ON v.id = s.variety_id
     LEFT JOIN users u ON u.id = a.reviewer_id
     WHERE a.id = ?`,
    [id],
  );
  return row ? parseApproval(row) : null;
}

function parseApproval(row: any): Approval {
  return {
    id: row.id,
    simulationId: row.simulation_id,
    simulationName: row.sname,
    varietyName: row.vname,
    level: row.level,
    status: row.status,
    reviewerId: row.reviewer_id,
    reviewerName: row.rname,
    comment: row.comment,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export function listApprovals(level?: 1 | 2, status?: string): Approval[] {
  let sql = `SELECT a.*, s.name as sname, v.name as vname, u.username as rname
             FROM approvals a
             LEFT JOIN simulation_tasks s ON s.id = a.simulation_id
             LEFT JOIN varieties v ON v.id = s.variety_id
             LEFT JOIN users u ON u.id = a.reviewer_id WHERE 1=1`;
  const params: any[] = [];
  if (level) {
    sql += ` AND a.level = ?`;
    params.push(level);
  }
  if (status) {
    sql += ` AND a.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY a.created_at DESC LIMIT 100`;
  return queryAll(sql, params).map(parseApproval);
}

export function doApproval(id: string, approved: boolean, comment: string, userId: string): Approval | null {
  execute(
    `UPDATE approvals SET status = ?, reviewer_id = ?, comment = ?, reviewed_at = datetime('now') WHERE id = ?`,
    [approved ? 'approved' : 'rejected', userId, comment, id],
  );
  return getApprovalById(id);
}

export function createReport(simulationId: string, varietyId: string, finalYield: number): Report {
  const v = getVariety(varietyId);
  const id = uuid();
  const lai = generateSeries(120, 6.2, 1.0);
  const biomass: BiomassDataPoint[] = [
    { stage: '苗期', leaf: 0.8, stem: 0.5, root: 0.4, grain: 0 },
    { stage: '拔节期', leaf: 2.4, stem: 1.8, root: 1.1, grain: 0 },
    { stage: '抽穗期', leaf: 4.2, stem: 4.5, root: 2.0, grain: 1.0 },
    { stage: '灌浆期', leaf: 3.8, stem: 5.0, root: 1.8, grain: 3.2 },
    { stage: '成熟期', leaf: 2.2, stem: 4.2, root: 1.2, grain: 5.6 },
  ];
  const contour: number[][] = [];
  for (let i = 0; i < 8; i++) {
    const row: number[] = [];
    for (let j = 0; j < 12; j++) {
      row.push(+(finalYield / 1000 + Math.sin(i / 2) + Math.cos(j / 3)).toFixed(1));
    }
    contour.push(row);
  }
  const nb: NitrogenBalance = {
    input: 320 + Math.random() * 40,
    uptake: 230 + Math.random() * 30,
    leaching: 28 + Math.random() * 15,
    volatilization: 18 + Math.random() * 8,
    residue: 44 + Math.random() * 20,
  };
  nb.input = +nb.input.toFixed(1);
  nb.uptake = +nb.uptake.toFixed(1);
  nb.leaching = +nb.leaching.toFixed(1);
  nb.volatilization = +nb.volatilization.toFixed(1);
  nb.residue = +nb.residue.toFixed(1);
  const cf: CarbonFootprint = {
    fertilizerEmission: +(180 + Math.random() * 50).toFixed(1),
    irrigationEmission: +(60 + Math.random() * 30).toFixed(1),
    soilEmission: +(280 + Math.random() * 80).toFixed(1),
    totalEmission: 0,
    perUnitYield: 0,
  };
  cf.totalEmission = +(cf.fertilizerEmission + cf.irrigationEmission + cf.soilEmission).toFixed(1);
  cf.perUnitYield = +(cf.totalEmission / finalYield * 1000).toFixed(3);
  const wue = +(1.4 + Math.random() * 0.6).toFixed(2);
  const nue = +(0.55 + Math.random() * 0.2).toFixed(3);

  execute(
    `INSERT INTO reports (id, simulation_id, variety_name, lai_series, biomass_distribution, yield_contour, nitrogen_balance, carbon_footprint, wue, nue, final_yield)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      simulationId,
      v?.name ?? '未知品种',
      JSON.stringify(lai),
      JSON.stringify(biomass),
      JSON.stringify(contour),
      JSON.stringify(nb),
      JSON.stringify(cf),
      wue,
      nue,
      finalYield,
    ],
  );
  return getReport(simulationId)!;
}

export function getReport(simulationId: string): Report | null {
  const row = queryOne(
    `SELECT r.*, s.name as sname FROM reports r LEFT JOIN simulation_tasks s ON s.id = r.simulation_id WHERE r.simulation_id = ?`,
    [simulationId],
  );
  if (!row) return null;
  const r = row as any;
  return {
    id: r.id,
    simulationId: r.simulation_id,
    simulationName: r.sname,
    varietyName: r.variety_name,
    laiSeries: JSON.parse(r.lai_series || '[]'),
    biomassDistribution: JSON.parse(r.biomass_distribution || '[]'),
    yieldContour: JSON.parse(r.yield_contour || '[]'),
    nitrogenBalance: JSON.parse(r.nitrogen_balance || '{}'),
    carbonFootprint: JSON.parse(r.carbon_footprint || '{}'),
    wue: r.wue,
    nue: r.nue,
    finalYield: r.final_yield,
    pdfUrl: r.pdf_url,
    createdAt: r.created_at,
  };
}

export function listReports(): Report[] {
  const rows = queryAll(
    `SELECT r.*, s.name as sname FROM reports r LEFT JOIN simulation_tasks s ON s.id = r.simulation_id ORDER BY r.created_at DESC LIMIT 50`,
  );
  return rows.map((r: any) => ({
    id: r.id,
    simulationId: r.simulation_id,
    simulationName: r.sname,
    varietyName: r.variety_name,
    laiSeries: JSON.parse(r.lai_series || '[]'),
    biomassDistribution: JSON.parse(r.biomass_distribution || '[]'),
    yieldContour: JSON.parse(r.yield_contour || '[]'),
    nitrogenBalance: JSON.parse(r.nitrogen_balance || '{}'),
    carbonFootprint: JSON.parse(r.carbon_footprint || '{}'),
    wue: r.wue,
    nue: r.nue,
    finalYield: r.final_yield,
    pdfUrl: r.pdf_url,
    createdAt: r.created_at,
  }));
}

export function listRecommendations(): Recommendation[] {
  const rows = queryAll(`SELECT * FROM recommendations ORDER BY confidence DESC`);
  if (rows.length) {
    return rows.map((r: any) => ({
      id: r.id,
      varietyId: r.variety_id,
      varietyName: r.variety_name,
      strategy: JSON.parse(r.strategy),
      expectedYield: r.expected_yield,
      expectedWUE: r.expected_wue,
      expectedNUE: r.expected_nue,
      confidence: r.confidence,
      basedOnSimulations: JSON.parse(r.based_on_simulations),
    }));
  }
  const vs = listVarieties().filter((v) => !v.isSuspended).slice(0, 4);
  const recs: Recommendation[] = [];
  for (const v of vs) {
    const id = uuid();
    const base = v.type === '玉米' ? 9500 : v.type === '小麦' ? 7000 : 8800;
    const strategy = {
      applications: [
        { date: 'D0', type: '控释肥', amount: 180, method: '基肥深施' },
        { date: 'D45', type: '尿素', amount: 100, method: '侧深追肥' },
        { date: 'D75', type: '磷酸二氢钾', amount: 15, method: '叶面喷施' },
      ],
    };
    const simIds = [uuid(), uuid(), uuid()];
    const rec: Recommendation = {
      id,
      varietyId: v.id,
      varietyName: v.name,
      strategy,
      expectedYield: +(base * (0.96 + Math.random() * 0.08)).toFixed(0),
      expectedWUE: +(1.75 + Math.random() * 0.25).toFixed(2),
      expectedNUE: +(0.68 + Math.random() * 0.1).toFixed(3),
      confidence: +(0.82 + Math.random() * 0.13).toFixed(2),
      basedOnSimulations: simIds,
    };
    execute(
      `INSERT INTO recommendations (id, variety_id, variety_name, strategy, expected_yield, expected_wue, expected_nue, confidence, based_on_simulations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, v.id, v.name, JSON.stringify(strategy), rec.expectedYield, rec.expectedWUE, rec.expectedNUE, rec.confidence, JSON.stringify(simIds)],
    );
    recs.push(rec);
  }
  return recs;
}

export function applyRecommendation(recommendationId: string, userId: string) {
  const row = queryOne(`SELECT * FROM recommendations WHERE id = ?`, [recommendationId]);
  if (!row) return null;
  const r = row as any;
  const strategy = JSON.parse(r.strategy);
  const name = `${r.variety_name}-推荐策略模拟-${new Date().toISOString().slice(5, 10)}`;
  return createSimulationTask({
    name,
    varietyId: r.variety_id,
    fertilizerPlan: strategy,
    createdBy: userId,
  });
}

export function getDashboard(): DashboardData {
  const sims = listSimulations();
  const completed = sims.filter((s) => s.status === 'completed').length;
  const total = sims.length || 1;
  const reports = listReports();
  const alerts = listAlerts();
  const activeAlerts = alerts.filter((a) => a.status === 'pending').length;
  const approvals = listApprovals();
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const avgWUE = reports.length ? +(reports.reduce((a, b) => a + b.wue, 0) / reports.length).toFixed(2) : 0;
  const avgNUE = reports.length ? +(reports.reduce((a, b) => a + b.nue, 0) / reports.length).toFixed(3) : 0;

  const yieldTrends: YieldTrend[] = listVarieties().map((v) => {
    const completedSims = sims.filter((s) => s.varietyId === v.id && s.status === 'completed').slice(0, 6);
    const data = completedSims.map((s, i) => ({
      time: `#${i + 1}`,
      value: s.yieldPrediction ?? 0,
    }));
    if (data.length === 0) {
      const base = v.type === '玉米' ? 9000 : v.type === '小麦' ? 6500 : 8200;
      for (let i = 0; i < 5; i++) data.push({ time: `#${i + 1}`, value: Math.round(base * (0.9 + Math.random() * 0.2)) });
    }
    return {
      varietyId: v.id,
      varietyName: v.name,
      data,
      isSuspended: v.isSuspended,
      consecutiveDeviations: v.consecutiveDeviations,
    };
  });

  const radarData = [
    { metric: '水分利用效率', current: Math.min(100, Math.round(avgWUE / 2.2 * 100)), target: 100 },
    { metric: '氮素利用效率', current: Math.min(100, Math.round(avgNUE / 0.8 * 100)), target: 100 },
    { metric: '产量预测精度', current: 86, target: 95 },
    { metric: '预警响应率', current: 92, target: 90 },
    { metric: '审批通过率', current: 88, target: 90 },
  ];

  return {
    todayStats: {
      completionRate: +((completed / total) * 100).toFixed(1),
      avgWUE,
      avgNUE,
      activeAlerts,
      totalSimulations: total,
      pendingApprovals,
    },
    yieldTrends,
    radarData,
    suspendedVarieties: listVarieties().filter((v) => v.isSuspended),
    recentSimulations: sims.slice(0, 8),
  };
}

export function ensureSeedSimulations() {
  const sims = listSimulations();
  if (sims.length >= 8) return;
  const vs = listVarieties();
  const users = listUsers();
  const agronomist = users.find((u) => u.role === 'agronomist')?.id ?? 'u1';
  const toCreate = Math.max(0, 8 - sims.length);
  for (let i = 0; i < toCreate; i++) {
    const v = vs[i % vs.length];
    if (v.isSuspended) continue;
    const name = `${v.name}-${['春季试验', '秋季验证', '优化方案', '标准对照', '增量施肥', '节水灌溉'][i % 6]}-${String.fromCharCode(65 + i)}`;
    const t = createSimulationTask({
      name,
      varietyId: v.id,
      createdBy: agronomist,
    });
    const jumps = 3 + (i % 5);
    for (let j = 0; j < jumps; j++) advanceSimulation(t.id);
  }
}
