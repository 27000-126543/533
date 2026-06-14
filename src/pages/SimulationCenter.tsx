import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Upload,
  FileSpreadsheet,
  Sprout,
  Droplets,
  FlaskConical,
  Activity,
  ChevronRight,
  Search,
  Filter,
  PlayCircle,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Thermometer,
  Gauge,
  X,
  Minus,
  ArrowUpDown,
  ChevronDown,
  CloudRain,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type {
  SimulationTask,
  SoilParams,
  Variety,
  DataPoint,
  SimulationStatus,
  FertilizerApplication,
} from '@@/shared/types';
import { formatNumber, formatDate, statusLabel, statusColor } from '@/utils/format';

const STATUS_ORDER: SimulationStatus[] = [
  'pending_validation',
  'parsing',
  'initializing',
  'crop_growth',
  'soil_process',
  'nitrogen_cycle',
  'completed',
  'error_rollback',
];

const STATUS_TIMELINE_LABELS: Record<SimulationStatus, string> = {
  pending_validation: '待校验',
  parsing: '参数解析',
  initializing: '模型初始化',
  crop_growth: '作物生长',
  soil_process: '土壤过程',
  nitrogen_cycle: '氮循环',
  completed: '完成',
  error_rollback: '异常回退',
};

const FERTILIZER_TYPES = ['尿素', '复合肥', '有机肥', '磷酸二铵', '硫酸钾'];
const FERTILIZER_METHODS = ['撒施', '条施', '穴施', '喷施', '灌溉施肥'];

const MOCK_LAI: DataPoint[] = [
  { time: 'D0', value: 0.1 }, { time: 'D10', value: 0.5 }, { time: 'D20', value: 1.2 },
  { time: 'D30', value: 2.5 }, { time: 'D40', value: 3.8 }, { time: 'D50', value: 4.5 },
  { time: 'D60', value: 5.2 }, { time: 'D70', value: 5.8 }, { time: 'D80', value: 6.2 },
  { time: 'D90', value: 5.5 }, { time: 'D100', value: 4.2 }, { time: 'D110', value: 2.8 },
  { time: 'D120', value: 1.5 },
];
const MOCK_SOIL: DataPoint[] = [
  { time: 'D0', value: 22 }, { time: 'D10', value: 25 }, { time: 'D20', value: 20 },
  { time: 'D30', value: 18 }, { time: 'D40', value: 14 }, { time: 'D50', value: 22 },
  { time: 'D60', value: 26 }, { time: 'D70', value: 30 }, { time: 'D80', value: 24 },
  { time: 'D90', value: 19 }, { time: 'D100', value: 16 }, { time: 'D110', value: 21 },
  { time: 'D120', value: 23 },
];
const MOCK_N: DataPoint[] = [
  { time: 'D0', value: 45 }, { time: 'D10', value: 52 }, { time: 'D20', value: 58 },
  { time: 'D30', value: 48 }, { time: 'D40', value: 38 }, { time: 'D50', value: 42 },
  { time: 'D60', value: 68 }, { time: 'D70', value: 62 }, { time: 'D80', value: 55 },
  { time: 'D90', value: 45 }, { time: 'D100', value: 36 }, { time: 'D110', value: 32 },
  { time: 'D120', value: 28 },
];

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

interface HistoryWeather {
  id: string;
  name: string;
  dateRange: string;
  records: number;
  usedTimes: number;
}

const HISTORY_WEATHER_LIST: HistoryWeather[] = [
  { id: 'w1', name: '华北平原2024夏玉米季', dateRange: '2024-06-10 ~ 2024-10-15', records: 128, usedTimes: 23 },
  { id: 'w2', name: '东北黑土区2024大豆', dateRange: '2024-05-01 ~ 2024-09-30', records: 153, usedTimes: 18 },
  { id: 'w3', name: '长江中下游2024水稻', dateRange: '2024-04-20 ~ 2024-09-20', records: 154, usedTimes: 31 },
  { id: 'w4', name: '四川盆地2024小麦', dateRange: '2024-11-01 ~ 2025-05-20', records: 201, usedTimes: 12 },
  { id: 'w5', name: '黄淮海2024冬小麦', dateRange: '2024-10-10 ~ 2025-06-05', records: 239, usedTimes: 45 },
  { id: 'w6', name: '西北旱区2024春玉米', dateRange: '2024-04-15 ~ 2024-09-10', records: 149, usedTimes: 9 },
  { id: 'w7', name: '华南双季稻2024早季', dateRange: '2024-02-20 ~ 2024-07-15', records: 146, usedTimes: 27 },
  { id: 'w8', name: '云贵高原2024烟草', dateRange: '2024-04-01 ~ 2024-09-25', records: 178, usedTimes: 7 },
  { id: 'w9', name: '江淮地区2024棉花', dateRange: '2024-04-10 ~ 2024-11-05', records: 210, usedTimes: 14 },
  { id: 'w10', name: '东北2024春小麦', dateRange: '2024-03-25 ~ 2024-08-10', records: 139, usedTimes: 20 },
];

const INITIAL_SOIL_PARAMS: SoilParams = {
  organicMatter: 15.6,
  totalNitrogen: 1.2,
  phValue: 7.2,
  bulkDensity: 1.35,
  fieldCapacity: 28,
  wiltingPoint: 12,
  initialMoisture: 22,
  initialMineralN: 45,
};

const STEPS = [
  { key: 1, label: '田块土壤参数', icon: FlaskConical },
  { key: 2, label: '作物基因型', icon: Sprout },
  { key: 3, label: '气象数据', icon: CloudRain },
  { key: 4, label: '水肥管理', icon: Droplets },
];

export default function SimulationCenter() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [soilParams, setSoilParams] = useState<SoilParams>(INITIAL_SOIL_PARAMS);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [selectedVariety, setSelectedVariety] = useState('');
  const [genotypeNote, setGenotypeNote] = useState('');
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [selectedHistoryWeather, setSelectedHistoryWeather] = useState<string | null>(null);
  const [fertilizerRows, setFertilizerRows] = useState<FertilizerApplication[]>([
    { date: '2024-06-10', type: '复合肥', amount: 300, method: '撒施' },
    { date: '2024-07-20', type: '尿素', amount: 150, method: '条施' },
  ]);
  const [irrigationValue, setIrrigationValue] = useState(60);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [simulations, setSimulations] = useState<SimulationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SimulationStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedTask, setSelectedTask] = useState<SimulationTask | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState('');
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [simRes, varRes] = await Promise.all([
        fetch('/api/simulations'),
        fetch('/api/varieties'),
      ]);
      if (simRes.ok) {
        const json = await simRes.json();
        if (json.success) setSimulations(json.data || mockSimulations());
        else setSimulations(mockSimulations());
      } else {
        setSimulations(mockSimulations());
      }
      if (varRes.ok) {
        const json = await varRes.json();
        if (json.success) setVarieties(json.data || mockVarieties());
        else setVarieties(mockVarieties());
      } else {
        setVarieties(mockVarieties());
      }
    } catch {
      setSimulations(mockSimulations());
      setVarieties(mockVarieties());
    } finally {
      setLoading(false);
    }
  }

  function mockVarieties(): Variety[] {
    return [
      { id: 'v1', name: '郑单958', type: '玉米', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
      { id: 'v2', name: '先玉335', type: '玉米', isSuspended: false, consecutiveDeviations: 1, lastYieldDeviation: 8.5, suspendedAt: null, suspendedReason: null },
      { id: 'v3', name: '登海605', type: '玉米', isSuspended: true, consecutiveDeviations: 3, lastYieldDeviation: 18.2, suspendedAt: '2024-05-01', suspendedReason: '连续三季产量偏差超过阈值' },
      { id: 'v4', name: '农大108', type: '玉米', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
      { id: 'v5', name: '中黄37', type: '大豆', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
      { id: 'v6', name: '徐豆18', type: '大豆', isSuspended: false, consecutiveDeviations: 2, lastYieldDeviation: 12.1, suspendedAt: null, suspendedReason: null },
    ];
  }

  function mockSimulations(): SimulationTask[] {
    const base = new Date('2024-06-01T08:00:00').getTime();
    return [
      {
        id: 's1', name: '华北夏玉米-郑单958-高水高肥', status: 'completed',
        varietyId: 'v1', varietyName: '郑单958', createdBy: 'u1', creatorName: '张农艺师',
        progress: 100, yieldPrediction: 9850,
        soilParams: INITIAL_SOIL_PARAMS, weatherData: [],
        fertilizerPlan: { applications: fertilizerRows },
        laiSeries: MOCK_LAI, soilMoistureSeries: MOCK_SOIL, mineralNitrogenSeries: MOCK_N,
        createdAt: new Date(base).toISOString(), updatedAt: new Date(base + 3600000 * 2).toISOString(),
      },
      {
        id: 's2', name: '东北大豆-中黄37-常规管理', status: 'nitrogen_cycle',
        varietyId: 'v5', varietyName: '中黄37', createdBy: 'u2', creatorName: '李专家',
        progress: 78, yieldPrediction: null,
        soilParams: INITIAL_SOIL_PARAMS, weatherData: [],
        fertilizerPlan: { applications: fertilizerRows },
        laiSeries: MOCK_LAI.slice(0, 10), soilMoistureSeries: MOCK_SOIL.slice(0, 10), mineralNitrogenSeries: MOCK_N.slice(0, 10),
        createdAt: new Date(base + 86400000).toISOString(), updatedAt: new Date(base + 86400000 + 3600000).toISOString(),
      },
      {
        id: 's3', name: '黄淮海小麦-节水方案A', status: 'crop_growth',
        varietyId: 'v1', varietyName: '农大108', createdBy: 'u1', creatorName: '张农艺师',
        progress: 42, yieldPrediction: null,
        soilParams: INITIAL_SOIL_PARAMS, weatherData: [],
        fertilizerPlan: { applications: fertilizerRows },
        laiSeries: MOCK_LAI.slice(0, 6), soilMoistureSeries: MOCK_SOIL.slice(0, 6), mineralNitrogenSeries: MOCK_N.slice(0, 6),
        createdAt: new Date(base + 86400000 * 2).toISOString(), updatedAt: new Date(base + 86400000 * 2 + 1800000).toISOString(),
      },
      {
        id: 's4', name: '长江水稻-氮肥梯度试验-T3', status: 'initializing',
        varietyId: 'v2', varietyName: '先玉335', createdBy: 'u3', creatorName: '王科学家',
        progress: 25, yieldPrediction: null,
        soilParams: INITIAL_SOIL_PARAMS, weatherData: [],
        fertilizerPlan: { applications: fertilizerRows },
        laiSeries: null, soilMoistureSeries: null, mineralNitrogenSeries: null,
        createdAt: new Date(base + 86400000 * 3).toISOString(), updatedAt: new Date(base + 86400000 * 3 + 900000).toISOString(),
      },
      {
        id: 's5', name: '西北旱区玉米-覆膜方案', status: 'pending_validation',
        varietyId: 'v1', varietyName: '郑单958', createdBy: 'u1', creatorName: '张农艺师',
        progress: 5, yieldPrediction: null,
        soilParams: INITIAL_SOIL_PARAMS, weatherData: [],
        fertilizerPlan: { applications: fertilizerRows },
        laiSeries: null, soilMoistureSeries: null, mineralNitrogenSeries: null,
        createdAt: new Date(base + 86400000 * 4).toISOString(), updatedAt: new Date(base + 86400000 * 4 + 600000).toISOString(),
      },
      {
        id: 's6', name: '江淮棉花-有机替代试验', status: 'error_rollback',
        varietyId: 'v6', varietyName: '徐豆18', createdBy: 'u2', creatorName: '李专家',
        progress: 55, yieldPrediction: null,
        soilParams: INITIAL_SOIL_PARAMS, weatherData: [],
        fertilizerPlan: { applications: fertilizerRows },
        laiSeries: MOCK_LAI.slice(0, 8), soilMoistureSeries: MOCK_SOIL.slice(0, 8), mineralNitrogenSeries: MOCK_N.slice(0, 8),
        createdAt: new Date(base + 86400000 * 5).toISOString(), updatedAt: new Date(base + 86400000 * 5 + 7200000).toISOString(),
      },
    ];
  }

  const activeVarieties = useMemo(
    () => varieties.filter((v) => !v.isSuspended),
    [varieties]
  );

  const filteredSimulations = useMemo(() => {
    let list = [...simulations];
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.varietyName || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const t1 = new Date(a.createdAt).getTime();
      const t2 = new Date(b.createdAt).getTime();
      return sortAsc ? t1 - t2 : t2 - t1;
    });
    return list;
  }, [simulations, statusFilter, searchText, sortAsc]);

  function updateSoil(key: keyof SoilParams, value: string) {
    const num = parseFloat(value);
    setSoilParams((p) => ({ ...p, [key]: isNaN(num) ? 0 : num }));
  }

  function addFertilizerRow() {
    setFertilizerRows((rows) => [
      ...rows,
      { date: new Date().toISOString().slice(0, 10), type: '尿素', amount: 0, method: '撒施' },
    ]);
  }

  function removeFertilizerRow(idx: number) {
    setFertilizerRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function updateFertilizerRow(idx: number, key: keyof FertilizerApplication, value: string | number) {
    setFertilizerRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setWeatherFile(f);
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setWeatherFile(f);
  }

  function nextStep() {
    setCurrentStep((s) => Math.min(4, s + 1));
  }

  function prevStep() {
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  async function handleValidate() {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/simulations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soilParams,
          varietyId: selectedVariety,
          genotypeNote,
          weatherFile: weatherFile?.name,
          selectedHistoryWeather,
          fertilizerPlan: { applications: fertilizerRows },
          irrigationValue,
          taskName,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setValidationResult({
            errors: json.data?.errors || [],
            warnings: json.data?.warnings || [],
          });
        } else {
          setValidationResult({ errors: [json.error || '校验失败'], warnings: [] });
        }
      } else {
        setValidationResult(mockValidate());
      }
    } catch {
      setValidationResult(mockValidate());
    } finally {
      setValidating(false);
    }
  }

  function mockValidate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!taskName.trim()) errors.push('任务名称不能为空');
    if (!selectedVariety) errors.push('请选择作物品种');
    if (!weatherFile && !selectedHistoryWeather) errors.push('请上传气象数据或选用历史气象序列');
    if (soilParams.phValue < 3 || soilParams.phValue > 11) errors.push('pH值应在合理范围(3-11)内');
    if (soilParams.fieldCapacity <= soilParams.wiltingPoint) errors.push('田间持水量必须大于凋萎系数');
    if (soilParams.initialMoisture < soilParams.wiltingPoint || soilParams.initialMoisture > soilParams.fieldCapacity) {
      warnings.push('初始含水量建议处于凋萎系数与田间持水量之间');
    }
    if (fertilizerRows.length === 0) warnings.push('未配置任何施肥方案，建议至少添加一条记录');
    if (fertilizerRows.some((r) => r.amount <= 0)) warnings.push('存在施肥用量为0或负数的记录');
    return { errors, warnings };
  }

  async function handleStartSimulation() {
    if (!validationResult || validationResult.errors.length > 0) {
      await handleValidate();
      return;
    }
    try {
      setCreating(true);
      const res = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taskName || `模拟任务-${new Date().toLocaleDateString()}`,
          soilParams,
          varietyId: selectedVariety,
          genotypeNote,
          fertilizerPlan: { applications: fertilizerRows },
        }),
      });
      let newTask: SimulationTask;
      if (res.ok) {
        const json = await res.json();
        newTask = json.data;
      } else {
        newTask = {
          id: `s${Date.now()}`,
          name: taskName || `模拟任务-${new Date().toLocaleDateString()}`,
          status: 'pending_validation',
          varietyId: selectedVariety,
          varietyName: varieties.find((v) => v.id === selectedVariety)?.name,
          createdBy: 'u1',
          creatorName: '当前用户',
          progress: 5,
          yieldPrediction: null,
          soilParams,
          weatherData: [],
          fertilizerPlan: { applications: fertilizerRows },
          laiSeries: null,
          soilMoistureSeries: null,
          mineralNitrogenSeries: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      setSimulations((prev) => [newTask, ...prev]);
      setUploadOpen(false);
      setSelectedTask(newTask);
      setTimeout(() => advanceStep(newTask.id, 3), 500);
    } finally {
      setCreating(false);
    }
  }

  async function advanceTask(id: string) {
    setAdvancingId(id);
    try {
      const res = await fetch(`/api/simulations/${id}/advance`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSimulations((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...json.data } : s))
          );
          if (selectedTask?.id === id) {
            setSelectedTask((t) => (t?.id === id ? { ...t, ...json.data } : t));
          }
          return;
        }
      }
      advanceStep(id, 1);
    } catch {
      advanceStep(id, 1);
    } finally {
      setAdvancingId(null);
    }
  }

  function advanceStep(id: string, times: number) {
    let remaining = times;
    const doOnce = () => {
      if (remaining <= 0) return;
      setSimulations((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          if (s.status === 'completed' || s.status === 'error_rollback') return s;
          const idx = STATUS_ORDER.indexOf(s.status);
          const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
          const progMap: Record<SimulationStatus, number> = {
            pending_validation: 5,
            parsing: 18,
            initializing: 30,
            crop_growth: 48,
            soil_process: 65,
            nitrogen_cycle: 82,
            completed: 100,
            error_rollback: 55,
          };
          const withSeries =
            next === 'crop_growth' || next === 'soil_process' || next === 'nitrogen_cycle' || next === 'completed'
              ? {
                  laiSeries: MOCK_LAI,
                  soilMoistureSeries: MOCK_SOIL,
                  mineralNitrogenSeries: MOCK_N,
                }
              : {};
          return {
            ...s,
            status: next,
            progress: progMap[next],
            updatedAt: new Date().toISOString(),
            yieldPrediction: next === 'completed' ? 9200 + Math.random() * 800 : null,
            ...withSeries,
          };
        })
      );
      setSelectedTask((t) => {
        if (t?.id !== id) return t;
        if (!t || t.status === 'completed' || t.status === 'error_rollback') return t;
        const idx = STATUS_ORDER.indexOf(t.status);
        const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
        const progMap: Record<SimulationStatus, number> = {
          pending_validation: 5, parsing: 18, initializing: 30, crop_growth: 48,
          soil_process: 65, nitrogen_cycle: 82, completed: 100, error_rollback: 55,
        };
        return {
          ...t,
          status: next,
          progress: progMap[next],
          updatedAt: new Date().toISOString(),
          yieldPrediction: next === 'completed' ? 9200 + Math.random() * 800 : null,
          laiSeries: MOCK_LAI,
          soilMoistureSeries: MOCK_SOIL,
          mineralNitrogenSeries: MOCK_N,
        };
      });
      remaining -= 1;
      if (remaining > 0) setTimeout(doOnce, 800);
    };
    setTimeout(doOnce, 400);
  }

  async function deleteTask(id: string) {
    if (!confirm('确认删除该模拟任务？')) return;
    try {
      await fetch(`/api/simulations/${id}`, { method: 'DELETE' });
    } catch {
      // 静默处理：本地状态仍需要更新
    }
    setSimulations((prev) => prev.filter((s) => s.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  }

  function closeUpload() {
    setUploadOpen(false);
    setCurrentStep(1);
    setValidationResult(null);
    setTaskName('');
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-agri-800 flex items-center gap-3">
              <Activity className="w-7 h-7 text-agri-700" />
              模拟中心
            </h1>
            <p className="mt-1 text-sm text-soil-500">
              创建、管理作物生长模拟任务，实时监控模型计算过程与关键指标
            </p>
          </div>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setUploadOpen(true)}
          >
            <Plus className="w-4 h-4" />
            新建模拟任务
          </button>
        </div>
      </div>

      {uploadOpen && (
        <div className="card p-6 mb-6 animate-fade-in animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="section-title !mb-1">创建模拟任务</h2>
              <p className="text-xs text-soil-500">按步骤完成参数配置，启动作物生长模拟计算</p>
            </div>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 text-soil-500 transition-colors"
              onClick={closeUpload}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-2">
            <label className="label-text">任务名称</label>
            <input
              type="text"
              className="input-field"
              placeholder="请输入模拟任务名称，便于后续检索"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>

          <div className="flex border-b border-soil-100 mb-5 mt-5">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = currentStep === s.key;
              const done = currentStep > s.key;
              return (
                <button
                  key={s.key}
                  className={active ? 'tab-active flex-1' : 'tab-inactive flex-1'}
                  onClick={() => setCurrentStep(s.key)}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-agri-600 text-white'
                          : done
                            ? 'bg-agri-100 text-agri-700'
                            : 'bg-soil-100 text-soil-500'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : s.key}
                    </span>
                    <Icon className={`w-4 h-4 ${active ? 'text-agri-600' : 'text-soil-400'}`} />
                    <span className={active ? 'text-agri-700' : done ? 'text-agri-600' : 'text-soil-500'}>
                      {s.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {currentStep === 1 && (
            <div className="grid grid-cols-4 gap-5 animate-fade-in">
              <div>
                <label className="label-text">有机碳 (g/kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={soilParams.organicMatter}
                  onChange={(e) => updateSoil('organicMatter', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">全氮 (g/kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={soilParams.totalNitrogen}
                  onChange={(e) => updateSoil('totalNitrogen', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">pH</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={soilParams.phValue}
                  onChange={(e) => updateSoil('phValue', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">容重 (g/cm³)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={soilParams.bulkDensity}
                  onChange={(e) => updateSoil('bulkDensity', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">田间持水量 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={soilParams.fieldCapacity}
                  onChange={(e) => updateSoil('fieldCapacity', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">凋萎系数 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={soilParams.wiltingPoint}
                  onChange={(e) => updateSoil('wiltingPoint', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">初始含水量 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={soilParams.initialMoisture}
                  onChange={(e) => updateSoil('initialMoisture', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">初始矿质氮 (mg/kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={soilParams.initialMineralN}
                  onChange={(e) => updateSoil('initialMineralN', e.target.value)}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="label-text flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-agri-600" />
                  作物品种
                </label>
                <select
                  className="select-field"
                  value={selectedVariety}
                  onChange={(e) => setSelectedVariety(e.target.value)}
                >
                  <option value="">请选择品种（已暂停品种已自动过滤）</option>
                  {activeVarieties.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}（{v.type}）
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-soil-400">
                  共 {varieties.length} 个品种，其中 {varieties.filter((v) => v.isSuspended).length} 个已暂停
                </p>
              </div>
              <div>
                <label className="label-text">基因型备注信息</label>
                <textarea
                  className="input-field min-h-[140px] resize-y"
                  placeholder="可填写该基因型的来源、特性、选育信息、参考株型参数等..."
                  value={genotypeNote}
                  onChange={(e) => setGenotypeNote(e.target.value)}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-fade-in">
              <div
                className="border-2 border-dashed border-soil-200 rounded-xl p-10 text-center bg-agri-50/30 hover:bg-agri-50/50 hover:border-agri-300 transition-all cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFilePick}
                />
                <div className="w-14 h-14 rounded-2xl bg-white border border-soil-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Upload className="w-7 h-7 text-agri-600" />
                </div>
                <p className="font-medium text-soil-700 mb-1">
                  拖拽文件到此处，或<span className="text-agri-600 underline">点击选择</span>
                </p>
                <p className="text-xs text-soil-400">支持 CSV / Excel（.xlsx, .xls）格式</p>
                {weatherFile && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-agri-200 shadow-sm">
                    <FileSpreadsheet className="w-4 h-4 text-agri-600" />
                    <span className="text-sm text-soil-700 font-medium">{weatherFile.name}</span>
                    <button
                      className="ml-2 text-soil-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWeatherFile(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-soil-700 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-soil-400" />
                    或直接选用历史气象序列
                  </h3>
                  <span className="text-xs text-soil-400">最近 10 条</span>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2">
                  {HISTORY_WEATHER_LIST.map((w) => {
                    const sel = selectedHistoryWeather === w.id;
                    return (
                      <div
                        key={w.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          sel
                            ? 'border-agri-500 bg-agri-50/70 shadow-sm ring-2 ring-agri-500/20'
                            : 'border-soil-100 bg-white hover:border-agri-200 hover:bg-agri-50/30'
                        }`}
                        onClick={() =>
                          setSelectedHistoryWeather((cur) => (cur === w.id ? null : w.id))
                        }
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-sm font-medium text-soil-800 line-clamp-1">
                            {w.name}
                          </span>
                          {sel && <CheckCircle2 className="w-4 h-4 text-agri-600 flex-shrink-0" />}
                        </div>
                        <div className="text-xs text-soil-500 mb-1">{w.dateRange}</div>
                        <div className="flex items-center gap-3 text-xs text-soil-400">
                          <span>{w.records} 条记录</span>
                          <span>·</span>
                          <span>已使用 {w.usedTimes} 次</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-fade-in space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-soil-700 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-brand" />
                    施肥方案（可动态增删行）
                  </h3>
                  <button
                    className="text-xs font-medium text-agri-700 hover:text-agri-800 px-3 py-1.5 bg-agri-50 rounded-lg hover:bg-agri-100 transition-colors flex items-center gap-1"
                    onClick={addFertilizerRow}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增一行
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-soil-100">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-agri-50/60">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600 w-44">日期</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">肥料类型</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600 w-36">用量 (kg/ha)</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">施肥方式</th>
                        <th className="px-4 py-2.5 w-14"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fertilizerRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              className="input-field"
                              value={row.date}
                              onChange={(e) => updateFertilizerRow(idx, 'date', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="select-field"
                              value={row.type}
                              onChange={(e) => updateFertilizerRow(idx, 'type', e.target.value)}
                            >
                              {FERTILIZER_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="input-field"
                              value={row.amount}
                              onChange={(e) =>
                                updateFertilizerRow(idx, 'amount', parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="select-field"
                              value={row.method}
                              onChange={(e) => updateFertilizerRow(idx, 'method', e.target.value)}
                            >
                              {FERTILIZER_METHODS.map((m) => (
                                <option key={m}>{m}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <button
                              className="p-1.5 rounded-lg text-soil-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                              disabled={fertilizerRows.length <= 1}
                              onClick={() => removeFertilizerRow(idx)}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label-text !mb-0 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-sky-brand" />
                    灌溉方案总览（全季总用水量）
                  </label>
                  <span className="text-sm font-semibold text-sky-brand">
                    {irrigationValue * 5} m³/ha
                    <span className="text-xs font-normal text-soil-400 ml-1">（共 {fertilizerRows.length} 次灌水）</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={irrigationValue}
                  onChange={(e) => setIrrigationValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-soil-100 rounded-lg appearance-none cursor-pointer accent-sky-brand"
                />
                <div className="flex justify-between text-xs text-soil-400 mt-1">
                  <span>节水 (1000 m³/ha)</span>
                  <span>常规 (3000 m³/ha)</span>
                  <span>丰水 (6000 m³/ha)</span>
                </div>
              </div>

              {validationResult && (
                <div className="space-y-2">
                  {validationResult.errors.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-red-800">
                          校验发现 {validationResult.errors.length} 个错误
                        </span>
                      </div>
                      <ul className="ml-7 space-y-1">
                        {validationResult.errors.map((err, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">●</span>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 animate-fade-in">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <span className="font-medium text-yellow-800">
                          {validationResult.warnings.length} 条提示
                        </span>
                      </div>
                      <ul className="ml-7 space-y-1">
                        {validationResult.warnings.map((w, i) => (
                          <li key={i} className="text-sm text-yellow-700 flex items-start gap-1.5">
                            <span className="text-yellow-400 mt-0.5">●</span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium text-emerald-800">参数校验通过，可以启动模拟</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-soil-100">
                <button
                  className="btn-secondary flex items-center gap-2"
                  onClick={handleValidate}
                  disabled={validating}
                >
                  {validating ? (
                    <span className="w-4 h-4 border-2 border-agri-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  数据校验
                </button>
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={handleStartSimulation}
                  disabled={creating}
                >
                  {creating ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  启动模拟
                </button>
              </div>
            </div>
          )}

          {currentStep < 4 && (
            <div className="flex justify-between pt-5 border-t border-soil-100 mt-5">
              <button
                className="btn-secondary"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                上一步
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={nextStep}>
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="card p-6 animate-fade-in animate-slide-up">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="section-title !mb-0">
                <Activity className="w-5 h-5 text-agri-600" />
                模拟任务列表
                <span className="ml-2 text-xs font-normal text-soil-400 bg-soil-50 px-2 py-0.5 rounded-full">
                  {filteredSimulations.length} / {simulations.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-soil-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    className="input-field pl-9 w-56"
                    placeholder="搜索任务名/品种..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Filter className="w-4 h-4 text-soil-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    className="select-field pl-9 appearance-none pr-9"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as SimulationStatus | 'all')
                    }
                  >
                    <option value="all">全部状态</option>
                    <option value="pending_validation">待校验</option>
                    <option value="parsing">解析中</option>
                    <option value="initializing">初始化</option>
                    <option value="crop_growth">作物生长</option>
                    <option value="soil_process">土壤过程</option>
                    <option value="nitrogen_cycle">氮循环</option>
                    <option value="completed">完成</option>
                    <option value="error_rollback">异常回退</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-soil-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  className="btn-secondary !px-3 flex items-center gap-1.5"
                  onClick={() => setSortAsc((v) => !v)}
                  title={sortAsc ? '按创建时间升序' : '按创建时间降序'}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs">{sortAsc ? '升序' : '降序'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-soil-100">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">任务名称</th>
                    <th className="table-header w-32">品种</th>
                    <th className="table-header w-32">状态</th>
                    <th className="table-header w-48">进度</th>
                    <th className="table-header w-40">创建时间</th>
                    <th className="table-header w-36 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="table-cell">
                            <div className="h-5 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredSimulations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-cell text-center py-12 text-soil-400">
                        <div className="flex flex-col items-center gap-2">
                          <Activity className="w-10 h-10 text-soil-200" />
                          <span>暂无匹配的模拟任务</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSimulations.map((task) => {
                      const isSelected = selectedTask?.id === task.id;
                      const canAdvance =
                        task.status !== 'completed' && task.status !== 'error_rollback';
                      return (
                        <tr
                          key={task.id}
                          className={`hover:bg-agri-50/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-agri-50/60' : ''
                          }`}
                          onClick={() => setSelectedTask(task)}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-agri-600 flex-shrink-0" />
                              <span className="text-soil-800 font-medium truncate max-w-[240px]">
                                {task.name}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell text-soil-700">{task.varietyName ?? '-'}</td>
                          <td className="table-cell">
                            <span className={`badge ${statusColor(task.status)}`}>
                              {statusLabel(task.status)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    task.progress === 100
                                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                      : task.status === 'error_rollback'
                                        ? 'bg-gradient-to-r from-red-500 to-red-400'
                                        : 'bg-gradient-to-r from-agri-600 via-agri-500 to-agri-400'
                                  }`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-soil-600 w-10 text-right">
                                {task.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="text-xs text-soil-600">
                              {formatDate(task.createdAt, true)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div
                              className="flex items-center justify-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="p-1.5 rounded-lg text-soil-500 hover:bg-agri-50 hover:text-agri-700 transition-colors"
                                onClick={() => setSelectedTask(task)}
                                title="查看详情"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                  canAdvance
                                    ? 'text-soil-500 hover:bg-agri-50 hover:text-agri-700'
                                    : 'text-soil-300'
                                } ${advancingId === task.id ? 'animate-pulse' : ''}`}
                                onClick={() => advanceTask(task.id)}
                                disabled={!canAdvance || advancingId === task.id}
                                title={canAdvance ? '推进下一状态' : '已完成或异常'}
                              >
                                <PlayCircle className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1.5 rounded-lg text-soil-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                onClick={() => deleteTask(task.id)}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          {selectedTask ? (
            <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center animate-fade-in min-h-[600px]">
              <div className="w-20 h-20 rounded-2xl bg-agri-50 flex items-center justify-center mb-4">
                <Activity className="w-10 h-10 text-agri-200" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-soil-700 mb-1">
                选择一个任务查看详情
              </h3>
              <p className="text-sm text-soil-400">
                在左侧表格中点击任意模拟任务行，即可在此查看状态时间线与实时监控图表
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TaskDetailProps {
  task: SimulationTask;
  onClose: () => void;
}

function TaskDetailPanel({ task, onClose }: TaskDetailProps) {
  const currentIdx = STATUS_ORDER.indexOf(task.status);

  return (
    <div className="animate-fade-in space-y-6" key={task.id}>
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-semibold text-soil-800 truncate pr-2">
              {task.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${statusColor(task.status)}`}>
                {statusLabel(task.status)}
              </span>
              <span className="text-xs text-soil-500">
                {task.varietyName || '未指定品种'}
              </span>
            </div>
          </div>
          <button
            className="p-1.5 rounded-lg text-soil-400 hover:bg-gray-100 hover:text-soil-600 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative pl-2">
          {STATUS_ORDER.map((st, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const isError = task.status === 'error_rollback' && idx === STATUS_ORDER.length - 1;
            return (
              <div key={st} className="flex items-start gap-3 relative pb-5 last:pb-0">
                {idx < STATUS_ORDER.length - 1 && (
                  <div
                    className={`absolute left-[14px] top-7 w-0.5 h-[calc(100%-8px)] ${
                      done ? 'bg-agri-400' : 'bg-soil-100'
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                    isError
                      ? 'bg-red-500 border-red-500 text-white'
                      : active
                        ? 'bg-white border-agri-500 ring-4 ring-agri-100 text-agri-600'
                        : done
                          ? 'bg-agri-500 border-agri-500 text-white'
                          : 'bg-white border-soil-200 text-soil-300'
                  }`}
                >
                  {active ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-agri-500 animate-pulse-slow" />
                  ) : done ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-soil-200" />
                  )}
                </div>
                <div className="pt-0.5 flex-1">
                  <div
                    className={`text-sm font-medium ${
                      active
                        ? 'text-agri-700'
                        : done
                          ? 'text-soil-700'
                          : isError
                            ? 'text-red-700'
                            : 'text-soil-400'
                    }`}
                  >
                    {STATUS_TIMELINE_LABELS[st]}
                  </div>
                  <div className="text-xs text-soil-400 mt-0.5">
                    {done
                      ? '已完成'
                      : active
                        ? '进行中...'
                        : '待处理'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MonitorChart
        title="叶面积指数 LAI"
        subtitle="阈值 6.0"
        icon={<Sprout className="w-4 h-4 text-agri-600" />}
        data={task.laiSeries || []}
        color="#2E7D32"
        thresholds={[{ value: 6, color: '#E53935', label: '上限' }]}
        dangerAreas={[{ y1: 6, y2: 10, color: '#E53935', opacity: 0.08 }]}
        yUnit=""
        yDomain={[0, 8]}
      />

      <MonitorChart
        title="土壤含水量"
        subtitle="适宜区间 15% ~ 28%"
        icon={<Droplets className="w-4 h-4 text-soil-500" />}
        data={task.soilMoistureSeries || []}
        color="#6D4C41"
        thresholds={[
          { value: 15, color: '#E53935', label: '低限', dash: true },
          { value: 28, color: '#E53935', label: '高限', dash: true },
        ]}
        dangerAreas={[
          { y1: 0, y2: 15, color: '#E53935', opacity: 0.08 },
          { y1: 28, y2: 40, color: '#E53935', opacity: 0.08 },
        ]}
        yUnit="%"
        yDomain={[8, 36]}
      />

      <MonitorChart
        title="矿质氮浓度"
        subtitle="适宜区间 40 ~ 65 mg/kg"
        icon={<FlaskConical className="w-4 h-4 text-sky-brand" />}
        data={task.mineralNitrogenSeries || []}
        color="#0288D1"
        thresholds={[
          { value: 40, color: '#E53935', label: '低限', dash: true },
          { value: 65, color: '#E53935', label: '高限', dash: true },
        ]}
        dangerAreas={[
          { y1: 0, y2: 40, color: '#E53935', opacity: 0.08 },
          { y1: 65, y2: 100, color: '#E53935', opacity: 0.08 },
        ]}
        yUnit=" mg/kg"
        yDomain={[20, 85]}
      />
    </div>
  );
}

interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
  dash?: boolean;
}

interface DangerArea {
  y1: number;
  y2: number;
  color: string;
  opacity?: number;
}

interface MonitorChartProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: DataPoint[];
  color: string;
  thresholds: ThresholdConfig[];
  dangerAreas: DangerArea[];
  yUnit: string;
  yDomain: [number, number];
}

function MonitorChart({
  title,
  subtitle,
  icon,
  data,
  color,
  thresholds,
  dangerAreas,
  yUnit,
  yDomain,
}: MonitorChartProps) {
  const hasData = data && data.length > 0;

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-agri-50 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-soil-800 flex items-center gap-1.5">
              {title}
            </h3>
            <p className="text-xs text-soil-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {hasData && (
          <div className="flex items-center gap-1 text-xs">
            <Thermometer className="w-3 h-3 text-soil-400" />
            <span className="text-soil-500">
              {formatNumber(Math.min(...data.map((d) => d.value)), 1)}
              <span className="text-soil-300 mx-1">~</span>
              {formatNumber(Math.max(...data.map((d) => d.value)), 1)}
              {yUnit}
            </span>
          </div>
        )}
      </div>

      {hasData ? (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: -8 }}>
              <defs>
                {dangerAreas.map((area, i) => (
                  <linearGradient key={i} id={`danger-${title}-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={area.color} stopOpacity={area.opacity ?? 0.1} />
                    <stop offset="100%" stopColor={area.color} stopOpacity={area.opacity ?? 0.05} />
                  </linearGradient>
                ))}
                <linearGradient id={`line-${title}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE9" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#8D6E63' }}
                axisLine={{ stroke: '#D7CCC8' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 10, fill: '#8D6E63' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}${yUnit === ' mg/kg' ? '' : yUnit}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #A5D6A7',
                  boxShadow: '0 6px 20px -8px rgba(27,94,32,0.2)',
                  backgroundColor: '#FFFEF7',
                  fontSize: 12,
                }}
                labelStyle={{ fontWeight: 600, color: '#145214', marginBottom: 4 }}
                formatter={(value: number) => [
                  `${formatNumber(value, 2)}${yUnit}`,
                  title,
                ]}
              />
              {dangerAreas.map((area, i) => (
                <ReferenceArea
                  key={i}
                  y1={area.y1}
                  y2={area.y2}
                  fill={`url(#danger-${title}-${i})`}
                  strokeOpacity={0}
                />
              ))}
              {thresholds.map((t, i) => (
                <ReferenceLine
                  key={i}
                  y={t.value}
                  stroke={t.color}
                  strokeWidth={1.5}
                  strokeDasharray={t.dash ? '5 4' : undefined}
                  label={{
                    value: t.label ? `${t.label} ${t.value}${yUnit === ' mg/kg' ? '' : yUnit}` : `${t.value}`,
                    position: 'right',
                    fill: t.color,
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="value"
                stroke={`url(#line-${title})`}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#fff', stroke: color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[220px] flex flex-col items-center justify-center text-soil-400">
          <Activity className="w-8 h-8 text-soil-200 mb-2" />
          <p className="text-sm">暂无监测数据</p>
          <p className="text-xs text-soil-300 mt-1">推进模拟任务后将自动生成时序曲线</p>
        </div>
      )}
    </div>
  );
}
