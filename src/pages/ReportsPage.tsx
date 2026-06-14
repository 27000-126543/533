import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  BarChart3,
  PieChart,
  Leaf,
  Droplets,
  Download,
  Eye,
  RefreshCw,
  Filter,
  DownloadCloud,
  Search,
  X,
  ChevronDown,
  Loader2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Report, Variety, DataPoint, BiomassDataPoint, NitrogenBalance, CarbonFootprint } from '@@/shared/types';
import { formatNumber, formatDate } from '@/utils/format';

const MOCK_LAI_SERIES: DataPoint[] = [
  { time: 'D0', value: 0.1 }, { time: 'D10', value: 0.5 }, { time: 'D20', value: 1.2 },
  { time: 'D30', value: 2.5 }, { time: 'D40', value: 3.8 }, { time: 'D50', value: 4.5 },
  { time: 'D60', value: 5.2 }, { time: 'D70', value: 5.8 }, { time: 'D80', value: 6.2 },
  { time: 'D90', value: 5.5 }, { time: 'D100', value: 4.2 }, { time: 'D110', value: 2.8 },
  { time: 'D120', value: 1.5 },
];

const MOCK_BIOMASS: BiomassDataPoint[] = [
  { stage: '苗期', leaf: 120, stem: 80, root: 60, grain: 0 },
  { stage: '拔节期', leaf: 350, stem: 280, root: 180, grain: 0 },
  { stage: '抽穗期', leaf: 520, stem: 450, root: 280, grain: 150 },
  { stage: '灌浆期', leaf: 480, stem: 520, root: 320, grain: 650 },
  { stage: '成熟期', leaf: 380, stem: 480, root: 280, grain: 950 },
];

const MOCK_YIELD_CONTOUR = [
  [7.2, 7.5, 7.8, 8.1, 8.3, 8.5, 8.4, 8.2, 7.9, 7.6, 7.3, 7.0],
  [7.4, 7.7, 8.0, 8.3, 8.6, 8.8, 8.7, 8.5, 8.2, 7.9, 7.6, 7.2],
  [7.6, 7.9, 8.2, 8.5, 8.8, 9.0, 9.1, 8.8, 8.5, 8.1, 7.8, 7.4],
  [7.8, 8.1, 8.4, 8.7, 9.0, 9.2, 9.3, 9.0, 8.7, 8.3, 8.0, 7.6],
  [8.0, 8.3, 8.6, 8.9, 9.2, 9.4, 9.5, 9.2, 8.9, 8.5, 8.2, 7.8],
  [8.2, 8.5, 8.8, 9.1, 9.3, 9.5, 9.6, 9.3, 9.0, 8.6, 8.3, 8.0],
  [8.0, 8.3, 8.6, 8.9, 9.1, 9.3, 9.4, 9.1, 8.8, 8.4, 8.1, 7.8],
  [7.8, 8.1, 8.4, 8.7, 8.9, 9.1, 9.2, 8.9, 8.6, 8.2, 7.9, 7.6],
];

const MOCK_NITROGEN_BALANCE: NitrogenBalance = {
  input: 280,
  uptake: 185,
  leaching: 35,
  volatilization: 25,
  residue: 35,
};

const MOCK_CARBON_FOOTPRINT: CarbonFootprint = {
  totalEmission: 1250,
  perUnitYield: 0.125,
  fertilizerEmission: 450,
  irrigationEmission: 280,
  soilEmission: 520,
};

const FERTILIZER_TREATMENTS = ['常规施肥', '优化施肥', '有机替代', '减氮20%', '控释肥'];
const GROWTH_STAGES = ['全生育期', '苗期', '拔节期', '抽穗期', '灌浆期', '成熟期'];

const PIE_COLORS = ['#1B5E20', '#2E7D32', '#66BB6A', '#81C784', '#A5D6A7'];
const BAR_COLORS = ['#1B5E20', '#66BB6A', '#5D4037', '#8D6E63', '#388E3C'];

const YIELD_COLORS = [
  { min: 0, max: 7, color: '#E8F5E9' },
  { min: 7, max: 7.5, color: '#C8E6C9' },
  { min: 7.5, max: 8, color: '#A5D6A7' },
  { min: 8, max: 8.5, color: '#81C784' },
  { min: 8.5, max: 9, color: '#66BB6A' },
  { min: 9, max: 9.5, color: '#4CAF50' },
  { min: 9.5, max: 10, color: '#2E7D32' },
];

type TabType = 'all' | 'export';
type DetailTabType = 'lai' | 'biomass' | 'yield' | 'nitrogen' | 'carbon';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [varietyFilter, setVarietyFilter] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTabType>('lai');
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [exportVariety, setExportVariety] = useState<string>('');
  const [exportTreatment, setExportTreatment] = useState<string>('');
  const [exportStage, setExportStage] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [repRes, varRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/varieties'),
      ]);

      let reportsData: Report[] = [];
      let varietiesData: Variety[] = [];

      if (repRes.ok) {
        const json = await repRes.json();
        if (json.success) reportsData = json.data || mockReports();
        else reportsData = mockReports();
      } else {
        reportsData = mockReports();
      }

      if (varRes.ok) {
        const json = await varRes.json();
        if (json.success) varietiesData = json.data || mockVarieties();
        else varietiesData = mockVarieties();
      } else {
        varietiesData = mockVarieties();
      }

      setReports(reportsData);
      setVarieties(varietiesData);
    } catch {
      setReports(mockReports());
      setVarieties(mockVarieties());
    } finally {
      setLoading(false);
    }
  }

  function mockVarieties(): Variety[] {
    return [
      { id: 'v1', name: '郑单958', type: '玉米', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
      { id: 'v2', name: '先玉335', type: '玉米', isSuspended: false, consecutiveDeviations: 1, lastYieldDeviation: 8.5, suspendedAt: null, suspendedReason: null },
      { id: 'v3', name: '登海605', type: '玉米', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
      { id: 'v4', name: '农大108', type: '玉米', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
      { id: 'v5', name: '中黄37', type: '大豆', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
      { id: 'v6', name: '徐豆18', type: '大豆', isSuspended: false, consecutiveDeviations: 2, lastYieldDeviation: 12.1, suspendedAt: null, suspendedReason: null },
    ];
  }

  function mockReports(): Report[] {
    const base = new Date('2024-06-01T08:00:00').getTime();
    return [
      {
        id: 'r1', simulationId: 's1', simulationName: '华北夏玉米-郑单958-高水高肥',
        varietyName: '郑单958',
        laiSeries: MOCK_LAI_SERIES,
        biomassDistribution: MOCK_BIOMASS,
        yieldContour: MOCK_YIELD_CONTOUR,
        nitrogenBalance: MOCK_NITROGEN_BALANCE,
        carbonFootprint: MOCK_CARBON_FOOTPRINT,
        wue: 2.85, nue: 0.62, finalYield: 9850,
        pdfUrl: null, createdAt: new Date(base).toISOString(),
      },
      {
        id: 'r2', simulationId: 's2', simulationName: '东北大豆-中黄37-常规管理',
        varietyName: '中黄37',
        laiSeries: MOCK_LAI_SERIES.map(d => ({ ...d, value: d.value * 0.85 })),
        biomassDistribution: MOCK_BIOMASS.map(d => ({ ...d, leaf: d.leaf * 0.9, stem: d.stem * 0.85 })),
        yieldContour: MOCK_YIELD_CONTOUR.map(row => row.map(v => v * 0.85)),
        nitrogenBalance: { ...MOCK_NITROGEN_BALANCE, input: 220, uptake: 150, leaching: 28, volatilization: 20, residue: 22 },
        carbonFootprint: { ...MOCK_CARBON_FOOTPRINT, totalEmission: 980, fertilizerEmission: 380, irrigationEmission: 200, soilEmission: 400 },
        wue: 2.45, nue: 0.58, finalYield: 4200,
        pdfUrl: null, createdAt: new Date(base + 86400000).toISOString(),
      },
      {
        id: 'r3', simulationId: 's3', simulationName: '黄淮海小麦-节水方案A',
        varietyName: '农大108',
        laiSeries: MOCK_LAI_SERIES.map(d => ({ ...d, value: d.value * 0.92 })),
        biomassDistribution: MOCK_BIOMASS,
        yieldContour: MOCK_YIELD_CONTOUR.map(row => row.map(v => v * 0.9)),
        nitrogenBalance: { ...MOCK_NITROGEN_BALANCE, input: 250, uptake: 168, leaching: 30, volatilization: 22, residue: 30 },
        carbonFootprint: { ...MOCK_CARBON_FOOTPRINT, totalEmission: 1050, fertilizerEmission: 400, irrigationEmission: 220, soilEmission: 430 },
        wue: 3.12, nue: 0.60, finalYield: 8400,
        pdfUrl: '/reports/r3.pdf', createdAt: new Date(base + 86400000 * 2).toISOString(),
      },
      {
        id: 'r4', simulationId: 's4', simulationName: '长江水稻-氮肥梯度试验-T3',
        varietyName: '先玉335',
        laiSeries: MOCK_LAI_SERIES,
        biomassDistribution: MOCK_BIOMASS.map(d => ({ ...d, leaf: d.leaf * 1.1, stem: d.stem * 1.05 })),
        yieldContour: MOCK_YIELD_CONTOUR.map(row => row.map(v => v * 1.05)),
        nitrogenBalance: { ...MOCK_NITROGEN_BALANCE, input: 320, uptake: 210, leaching: 42, volatilization: 32, residue: 36 },
        carbonFootprint: { ...MOCK_CARBON_FOOTPRINT, totalEmission: 1450, fertilizerEmission: 520, irrigationEmission: 320, soilEmission: 610 },
        wue: 2.68, nue: 0.65, finalYield: 10200,
        pdfUrl: null, createdAt: new Date(base + 86400000 * 3).toISOString(),
      },
      {
        id: 'r5', simulationId: 's5', simulationName: '西北旱区玉米-覆膜方案',
        varietyName: '郑单958',
        laiSeries: MOCK_LAI_SERIES.map(d => ({ ...d, value: d.value * 0.88 })),
        biomassDistribution: MOCK_BIOMASS,
        yieldContour: MOCK_YIELD_CONTOUR.map(row => row.map(v => v * 0.92)),
        nitrogenBalance: { ...MOCK_NITROGEN_BALANCE, input: 260, uptake: 175, leaching: 32, volatilization: 24, residue: 29 },
        carbonFootprint: { ...MOCK_CARBON_FOOTPRINT, totalEmission: 1180, fertilizerEmission: 420, irrigationEmission: 260, soilEmission: 500 },
        wue: 3.25, nue: 0.63, finalYield: 8900,
        pdfUrl: null, createdAt: new Date(base + 86400000 * 4).toISOString(),
      },
      {
        id: 'r6', simulationId: 's6', simulationName: '江淮棉花-有机替代试验',
        varietyName: '徐豆18',
        laiSeries: MOCK_LAI_SERIES.map(d => ({ ...d, value: d.value * 0.75 })),
        biomassDistribution: MOCK_BIOMASS.map(d => ({ ...d, leaf: d.leaf * 0.8, stem: d.stem * 0.78 })),
        yieldContour: MOCK_YIELD_CONTOUR.map(row => row.map(v => v * 0.82)),
        nitrogenBalance: { ...MOCK_NITROGEN_BALANCE, input: 200, uptake: 135, leaching: 22, volatilization: 18, residue: 25 },
        carbonFootprint: { ...MOCK_CARBON_FOOTPRINT, totalEmission: 890, fertilizerEmission: 320, irrigationEmission: 180, soilEmission: 390 },
        wue: 2.72, nue: 0.56, finalYield: 3250,
        pdfUrl: '/reports/r6.pdf', createdAt: new Date(base + 86400000 * 5).toISOString(),
      },
    ];
  }

  const filteredReports = useMemo(() => {
    let list = [...reports];
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.simulationName || '').toLowerCase().includes(q) ||
          r.varietyName.toLowerCase().includes(q)
      );
    }
    if (varietyFilter) {
      list = list.filter((r) => r.varietyName === varietyFilter);
    }
    return list;
  }, [reports, searchText, varietyFilter]);

  async function handlePreview(report: Report) {
    try {
      const res = await fetch(`/api/reports/by-simulation/${report.simulationId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSelectedReport(json.data);
        } else {
          setSelectedReport(report);
        }
      } else {
        setSelectedReport(report);
      }
    } catch {
      setSelectedReport(report);
    }
  }

  async function handleGeneratePdf(reportId: string) {
    setGeneratingPdf(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReports((prev) =>
            prev.map((r) =>
              r.id === reportId ? { ...r, pdfUrl: json.data.pdfUrl || `/reports/${reportId}.pdf` } : r
            )
          );
          if (selectedReport?.id === reportId) {
            setSelectedReport((prev) => prev ? { ...prev, pdfUrl: json.data.pdfUrl || `/reports/${reportId}.pdf` } : null);
          }
        }
      }
    } finally {
      setGeneratingPdf(null);
    }
  }

  function handleDownload(report: Report) {
    if (report.pdfUrl) {
      window.open(report.pdfUrl, '_blank');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportVariety) params.append('variety', exportVariety);
      if (exportTreatment) params.append('treatment', exportTreatment);
      if (exportStage) params.append('stage', exportStage);

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      const csvContent = generateMockCsv();
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function generateMockCsv(): string {
    const headers = ['模拟名称', '品种', 'WUE', 'NUE', '产量(kg/ha)', '生成日期'];
    const rows = filteredReports.map((r) => [
      r.simulationName,
      r.varietyName,
      r.wue.toFixed(2),
      r.nue.toFixed(2),
      r.finalYield.toString(),
      formatDate(r.createdAt),
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  function getYieldColor(value: number): string {
    for (const range of YIELD_COLORS) {
      if (value >= range.min && value < range.max) {
        return range.color;
      }
    }
    return '#1B5E20';
  }

  const nitrogenPieData = selectedReport
    ? [
        { name: '作物吸收', value: selectedReport.nitrogenBalance.uptake },
        { name: '淋失', value: selectedReport.nitrogenBalance.leaching },
        { name: '挥发', value: selectedReport.nitrogenBalance.volatilization },
        { name: '残留', value: selectedReport.nitrogenBalance.residue },
        { name: '其他', value: selectedReport.nitrogenBalance.input - selectedReport.nitrogenBalance.uptake - selectedReport.nitrogenBalance.leaching - selectedReport.nitrogenBalance.volatilization - selectedReport.nitrogenBalance.residue },
      ]
    : [];

  const carbonBarData = selectedReport
    ? [
        { name: '肥料生产', value: selectedReport.carbonFootprint.fertilizerEmission },
        { name: '灌溉能源', value: selectedReport.carbonFootprint.irrigationEmission },
        { name: '土壤排放', value: selectedReport.carbonFootprint.soilEmission },
      ]
    : [];

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-agri-800 flex items-center gap-3">
              <FileText className="w-7 h-7 text-agri-700" />
              报告与导出
            </h1>
            <p className="mt-1 text-sm text-soil-500">
              查看模拟报告、可视化分析结果，支持多格式数据导出
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-soil-100 mb-6">
        <button
          className={activeTab === 'all' ? 'tab-active' : 'tab-inactive'}
          onClick={() => setActiveTab('all')}
        >
          <FileText className="w-4 h-4" />
          全部报告
        </button>
        <button
          className={activeTab === 'export' ? 'tab-active' : 'tab-inactive'}
          onClick={() => setActiveTab('export')}
        >
          <DownloadCloud className="w-4 h-4" />
          数据导出
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="animate-fade-in">
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-soil-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="input-field pl-9"
                  placeholder="搜索报告名称或品种..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 text-soil-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  className="select-field pl-9 appearance-none pr-9 min-w-[160px]"
                  value={varietyFilter}
                  onChange={(e) => setVarietyFilter(e.target.value)}
                >
                  <option value="">全部品种</option>
                  {varieties.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}（{v.type}）
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-soil-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                className="btn-secondary !px-3 flex items-center gap-2"
                onClick={loadData}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-6 bg-gray-100 rounded mb-3" />
                  <div className="h-4 bg-gray-100 rounded mb-2 w-24" />
                  <div className="h-4 bg-gray-100 rounded mb-4 w-32" />
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="h-16 bg-gray-100 rounded" />
                    <div className="h-16 bg-gray-100 rounded" />
                    <div className="h-16 bg-gray-100 rounded" />
                  </div>
                  <div className="h-9 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="card p-12 text-center text-soil-400">
              <FileText className="w-12 h-12 text-soil-200 mx-auto mb-3" />
              <p>暂无匹配的报告</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="card p-5 hover:shadow-lg transition-all cursor-pointer group animate-fade-in"
                  onClick={() => handlePreview(report)}
                >
                  <h3 className="font-semibold text-soil-800 mb-2 line-clamp-1 group-hover:text-agri-600 transition-colors">
                    {report.simulationName}
                  </h3>
                  <div className="text-sm text-soil-500 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Leaf className="w-3.5 h-3.5 text-agri-500" />
                      {report.varietyName}
                    </span>
                  </div>
                  <div className="text-xs text-soil-400 mb-4">
                    {formatDate(report.createdAt, true)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-agri-50 rounded-lg">
                      <div className="text-xs text-soil-500 mb-1">WUE</div>
                      <div className="font-semibold text-agri-700">
                        {formatNumber(report.wue, 2)}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-sky-50 rounded-lg">
                      <div className="text-xs text-soil-500 mb-1">NUE</div>
                      <div className="font-semibold text-sky-700">
                        {formatNumber(report.nue, 2)}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-amber-50 rounded-lg">
                      <div className="text-xs text-soil-500 mb-1">产量</div>
                      <div className="font-semibold text-amber-700">
                        {formatNumber(report.finalYield, 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="flex-1 btn-secondary !py-1.5 !text-xs flex items-center justify-center gap-1"
                      onClick={() => handlePreview(report)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      预览
                    </button>
                    <button
                      className="flex-1 btn-secondary !py-1.5 !text-xs flex items-center justify-center gap-1"
                      onClick={() => handleGeneratePdf(report.id)}
                      disabled={generatingPdf === report.id}
                    >
                      {generatingPdf === report.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      PDF
                    </button>
                    <button
                      className="flex-1 btn-primary !py-1.5 !text-xs flex items-center justify-center gap-1"
                      onClick={() => handleDownload(report)}
                      disabled={!report.pdfUrl}
                    >
                      <Download className="w-3.5 h-3.5" />
                      下载
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="animate-fade-in">
          <div className="card p-6">
            <h2 className="section-title mb-6">
              <DownloadCloud className="w-5 h-5 text-agri-600" />
              数据导出
            </h2>
            <p className="text-sm text-soil-500 mb-6">
              选择筛选条件，导出CSV格式的模拟报告数据
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="label-text">品种类型</label>
                <select
                  className="select-field"
                  value={exportVariety}
                  onChange={(e) => setExportVariety(e.target.value)}
                >
                  <option value="">全部品种</option>
                  {varieties.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}（{v.type}）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">施肥处理</label>
                <select
                  className="select-field"
                  value={exportTreatment}
                  onChange={(e) => setExportTreatment(e.target.value)}
                >
                  <option value="">全部处理</option>
                  {FERTILIZER_TREATMENTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">生育期分期</label>
                <select
                  className="select-field"
                  value={exportStage}
                  onChange={(e) => setExportStage(e.target.value)}
                >
                  <option value="">全生育期</option>
                  {GROWTH_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-soil-100">
              <div className="text-sm text-soil-500">
                将导出 <span className="font-semibold text-soil-700">{filteredReports.length}</span> 条报告数据
              </div>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                导出 CSV
              </button>
              </div>
          </div>

          <div className="card p-6 mt-6">
            <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-agri-600" />
              数据预览
            </h3>
            <div className="overflow-x-auto rounded-lg border border-soil-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-agri-50/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">模拟名称</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">品种</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">WUE</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">NUE</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">产量 (kg/ha)</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">生成日期</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.slice(0, 5).map((report) => (
                    <tr key={report.id} className="border-t border-gray-100">
                      <td className="table-cell">{report.simulationName}</td>
                      <td className="table-cell">{report.varietyName}</td>
                      <td className="table-cell">{formatNumber(report.wue, 2)}</td>
                      <td className="table-cell">{formatNumber(report.nue, 2)}</td>
                      <td className="table-cell">{formatNumber(report.finalYield, 0)}</td>
                      <td className="table-cell">{formatDate(report.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredReports.length > 5 && (
              <div className="text-center text-sm text-soil-400 mt-3">
                仅显示前 5 条，完整数据请导出后查看
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={() => setSelectedReport(null)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full bg-white shadow-2xl animate-slide-in-right overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-soil-100 z-10">
              <div className="flex items-center justify-between p-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-agri-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-agri-600" />
                  {selectedReport.simulationName}
                </h2>
                  <p className="text-sm text-soil-500 mt-1">
                    品种：{selectedReport.varietyName} · 生成时间：{formatDate(selectedReport.createdAt, true)}
                  </p>
                </div>
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 text-soil-500 transition-colors"
                  onClick={() => setSelectedReport(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-t border-soil-100 px-6">
                <button
                  className={detailTab === 'lai' ? 'tab-active' : 'tab-inactive'}
                  onClick={() => setDetailTab('lai')}
                >
                  <TrendingUp className="w-4 h-4" />
                  叶面积时序
                </button>
                <button
                  className={detailTab === 'biomass' ? 'tab-active' : 'tab-inactive'}
                  onClick={() => setDetailTab('biomass')}
                >
                  <BarChart3 className="w-4 h-4" />
                  生物量分布
                </button>
                <button
                  className={detailTab === 'yield' ? 'tab-active' : 'tab-inactive'}
                  onClick={() => setDetailTab('yield')}
                >
                  <Leaf className="w-4 h-4" />
                  产量等值线
                </button>
                <button
                  className={detailTab === 'nitrogen' ? 'tab-active' : 'tab-inactive'}
                  onClick={() => setDetailTab('nitrogen')}
                >
                  <PieChart className="w-4 h-4" />
                  氮素平衡
                </button>
                <button
                  className={detailTab === 'carbon' ? 'tab-active' : 'tab-inactive'}
                  onClick={() => setDetailTab('carbon')}
                >
                  <Droplets className="w-4 h-4" />
                  碳足迹
                </button>
              </div>
            </div>

            <div className="p-6">
              {detailTab === 'lai' && (
                <div className="animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="card p-6">
                      <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-agri-600" />
                        叶面积指数时序曲线
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selectedReport.laiSeries}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
                            <XAxis dataKey="time" stroke="#6B7280" fontSize={12} />
                            <YAxis stroke="#6B7280" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E8F5E9',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="value"
                              name="叶面积指数"
                              stroke="#1B5E20"
                              strokeWidth={3}
                              dot={{ fill: '#1B5E20', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-agri-600" />
                        叶面积指数面积图
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedReport.laiSeries}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#66BB6A" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#66BB6A" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
                            <XAxis dataKey="time" stroke="#6B7280" fontSize={12} />
                            <YAxis stroke="#6B7280" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E8F5E9',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="value"
                              name="叶面积指数"
                              stroke="#2E7D32"
                              strokeWidth={2}
                              fill="url(#colorValue)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">最大叶面积指数</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {formatNumber(Math.max(...selectedReport.laiSeries.map((d) => d.value)), 2)}
                      </div>
                    </div>
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">平均叶面积指数</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {formatNumber(
                          selectedReport.laiSeries.reduce((sum, d) => sum + d.value, 0) / selectedReport.laiSeries.length,
                          2
                        )}
                      </div>
                    </div>
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">成熟期叶面积指数</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {formatNumber(selectedReport.laiSeries[selectedReport.laiSeries.length - 1].value, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'biomass' && (
                <div className="animate-fade-in">
                  <div className="card p-6 mb-6">
                    <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-agri-600" />
                      各生育期生物量分布
                    </h3>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedReport.biomassDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
                          <XAxis dataKey="stage" stroke="#6B7280" fontSize={12} />
                          <YAxis stroke="#6B7280" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #E8F5E9',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="leaf" name="叶片" stackId="a" fill="#1B5E20" />
                          <Bar dataKey="stem" name="茎秆" stackId="a" fill="#66BB6A" />
                          <Bar dataKey="root" name="根系" stackId="a" fill="#5D4037" />
                          <Bar dataKey="grain" name="籽粒" stackId="a" fill="#8D6E63" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="card p-6">
                      <h4 className="font-semibold text-soil-700 mb-4">生物量统计 (kg/ha)
                      </h4>
                      <div className="space-y-3">
                        {selectedReport.biomassDistribution.map((item) => {
                          const totalBiomass = item.leaf + item.stem + item.root + item.grain;
                          return (
                            <div key={item.stage} className="flex items-center justify-between">
                              <span className="text-sm text-soil-600">{item.stage}</span>
                              <span className="font-semibold text-agri-700">{formatNumber(totalBiomass, 0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="card p-6">
                      <h4 className="font-semibold text-soil-700 mb-4">成熟期器官分配
                      </h4>
                      {(() => {
                        const mature = selectedReport.biomassDistribution[selectedReport.biomassDistribution.length - 1];
                        return (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={[
                                    { name: '叶片', value: mature.leaf },
                                    { name: '茎秆', value: mature.stem },
                                    { name: '根系', value: mature.root },
                                    { name: '籽粒', value: mature.grain },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                >
                                  {PIE_COLORS.map((color, index) => (
                                    <Cell key={`cell-${index}`} fill={color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'yield' && (
                <div className="animate-fade-in">
                  <div className="card p-6 mb-6">
                    <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-agri-600" />
                      产量空间分布 (t/ha)
                    </h3>
                    <div className="flex justify-center">
                      <div className="inline-block p-4 bg-agri-50/50 rounded-xl">
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${selectedReport.yieldContour[0].length}, minmax(0, 1fr)` }}>
                          {selectedReport.yieldContour.map((row, rowIndex) => (
                            row.map((value, colIndex) => (
                              <div
                                key={`${rowIndex}-${colIndex}`}
                                className="w-12 h-12 rounded flex items-center justify-center text-xs font-medium text-white shadow-sm transition-transform hover:scale-110 cursor-pointer"
                                style={{ backgroundColor: getYieldColor(value) }}
                                title={`${value.toFixed(1)} t/ha`}
                              >
                                {value.toFixed(1)}
                              </div>
                            ))
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-6">
                      <div className="flex items-center gap-2">
                        {YIELD_COLORS.map((range, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: range.color }}
                            />
                            <span className="text-xs text-soil-500">
                              {range.min}-{range.max}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">最高产量</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {formatNumber(
                          Math.max(...selectedReport.yieldContour.flat()) * 1000,
                          0
                        )}{' '}
                        kg/ha
                      </div>
                    </div>
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">最低产量</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {formatNumber(
                          Math.min(...selectedReport.yieldContour.flat()) * 1000,
                          0
                        )}{' '}
                        kg/ha
                      </div>
                    </div>
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">平均产量</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {formatNumber(
                          selectedReport.yieldContour.flat().reduce((a, b) => a + b, 0) /
                            selectedReport.yieldContour.flat().length *
                            1000,
                          0
                        )}{' '}
                        kg/ha
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'nitrogen' && (
                <div className="animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="card p-6">
                      <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-agri-600" />
                        氮素去向分布
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={nitrogenPieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              innerRadius={60}
                              dataKey="value"
                              label={({ name, value, percent }) =>
                                `${name} ${value} kg/ha (${(percent * 100).toFixed(1)}%`}
                            >
                              {PIE_COLORS.map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [`${value} kg/ha`]}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E8F5E9',
                                borderRadius: '8px',
                              }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-agri-600" />
                        氮素平衡表 (kg/ha)
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-soil-100">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-agri-50/60">
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-soil-600">项目</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-soil-600">数量</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-soil-600">占比</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-gray-100">
                              <td className="table-cell font-medium">总投入</td>
                              <td className="table-cell text-right font-semibold text-agri-700">
                                {selectedReport.nitrogenBalance.input}
                              </td>
                              <td className="table-cell text-right">100%</td>
                            </tr>
                            <tr className="border-t border-gray-100">
                              <td className="table-cell">作物吸收</td>
                              <td className="table-cell text-right">
                                {selectedReport.nitrogenBalance.uptake}
                              </td>
                              <td className="table-cell text-right">
                                {(
                                  (selectedReport.nitrogenBalance.uptake /
                                    selectedReport.nitrogenBalance.input) *
                                  100
                                ).toFixed(1)}%
                              </td>
                            </tr>
                            <tr className="border-t border-gray-100">
                              <td className="table-cell">淋失</td>
                              <td className="table-cell text-right">
                                {selectedReport.nitrogenBalance.leaching}
                              </td>
                              <td className="table-cell text-right">
                                {(
                                  (selectedReport.nitrogenBalance.leaching /
                                    selectedReport.nitrogenBalance.input) *
                                  100
                                ).toFixed(1)}%
                              </td>
                            </tr>
                            <tr className="border-t border-gray-100">
                              <td className="table-cell">挥发</td>
                              <td className="table-cell text-right">
                                {selectedReport.nitrogenBalance.volatilization}
                              </td>
                              <td className="table-cell text-right">
                                {(
                                  (selectedReport.nitrogenBalance.volatilization /
                                    selectedReport.nitrogenBalance.input) *
                                  100
                                ).toFixed(1)}%
                              </td>
                            </tr>
                            <tr className="border-t border-gray-100">
                              <td className="table-cell">土壤残留</td>
                              <td className="table-cell text-right">
                                {selectedReport.nitrogenBalance.residue}
                              </td>
                              <td className="table-cell text-right">
                                {(
                                  (selectedReport.nitrogenBalance.residue /
                                    selectedReport.nitrogenBalance.input) *
                                  100
                                ).toFixed(1)}%
                              </td>
                            </tr>
                            <tr className="border-t border-gray-100 bg-agri-50/30">
                              <td className="table-cell font-medium text-agri-700">氮素利用效率 (NUE)</td>
                              <td className="table-cell text-right font-semibold text-agri-700">
                                {formatNumber(selectedReport.nue, 2)}
                              </td>
                              <td className="table-cell text-right">-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">氮素投入总量</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {selectedReport.nitrogenBalance.input} kg/ha
                      </div>
                    </div>
                    <div className="card p-5 text-center">
                      <div className="text-sm text-soil-500 mb-1">氮素利用效率</div>
                      <div className="text-2xl font-bold text-agri-700">
                        {formatNumber(selectedReport.nue, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'carbon' && (
                <div className="animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="card p-6">
                      <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-agri-600" />
                        碳排放源分布 (kg CO₂e
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={carbonBarData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
                            <XAxis type="number" stroke="#6B7280" fontSize={12} />
                            <YAxis
                              dataKey="name"
                              type="category"
                              stroke="#6B7280" fontSize={12}
                              width={80}
                            />
                            <Tooltip
                              formatter={(value: number) => [`${value} kg CO₂e`, '排放量']}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E8F5E9',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar
                              dataKey="value"
                              name="排放量"
                              radius={[0, 4, 4, 0]}
                            >
                              {BAR_COLORS.map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="font-semibold text-soil-700 mb-4 flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-agri-600" />
                        碳排放统计
                      </h3>
                      <div className="space-y-6">
                        <div className="p-4 bg-gradient-to-r from-agri-50 to-white rounded-xl border border-agri-100">
                          <div className="text-sm text-soil-500 mb-1">总碳排放</div>
                          <div className="text-3xl font-bold text-agri-700">
                            {formatNumber(selectedReport.carbonFootprint.totalEmission, 0)}{' '}
                            <span className="text-sm font-normal text-soil-500">kg CO₂e</span>
                          </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-sky-50 to-white rounded-xl border border-sky-100">
                          <div className="text-sm text-soil-500 mb-1">单位产量碳排放</div>
                          <div className="text-3xl font-bold text-sky-700">
                            {formatNumber(selectedReport.carbonFootprint.perUnitYield, 3)}{' '}
                            <span className="text-sm font-normal text-soil-500">kg CO₂e/kg</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-white rounded-lg border border-soil-100">
                            <div className="text-xs text-soil-500 mb-1">肥料生产</div>
                            <div className="font-semibold text-agri-700">
                              {formatNumber(selectedReport.carbonFootprint.fertilizerEmission, 0)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-soil-100">
                            <div className="text-xs text-soil-500 mb-1">灌溉能源</div>
                            <div className="font-semibold text-agri-700">
                              {formatNumber(selectedReport.carbonFootprint.irrigationEmission, 0)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-soil-100">
                            <div className="text-xs text-soil-500 mb-1">土壤排放</div>
                            <div className="font-semibold text-agri-700">
                              {formatNumber(selectedReport.carbonFootprint.soilEmission, 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card p-6">
                    <h4 className="font-semibold text-soil-700 mb-4">排放源占比分析
                    </h4>
                    <div className="space-y-4">
                      {[
                        {
                          name: '肥料生产',
                          value: selectedReport.carbonFootprint.fertilizerEmission,
                          color: BAR_COLORS[0],
                        },
                        {
                          name: '灌溉能源',
                          value: selectedReport.carbonFootprint.irrigationEmission,
                          color: BAR_COLORS[1],
                        },
                        {
                          name: '土壤排放',
                          value: selectedReport.carbonFootprint.soilEmission,
                          color: BAR_COLORS[2],
                        },
                      ].map((item) => {
                        const percent =
                          (item.value / selectedReport.carbonFootprint.totalEmission) * 100;
                        return (
                          <div key={item.name}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-soil-600">{item.name}</span>
                              <span className="text-sm font-medium text-soil-700">
                                {formatNumber(item.value, 0)} kg CO₂e ({percent.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
