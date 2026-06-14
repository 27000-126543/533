import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Droplets,
  Leaf,
  AlertTriangle,
  TrendingUp,
  Activity,
  AlertOctagon,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import type { DashboardData, SimulationTask, Variety, YieldTrend } from '@@/shared/types';
import { formatNumber, formatPercent, formatDate, statusLabel, statusColor } from '@/utils/format';

const SKY_GRADIENT = 'linear-gradient(135deg, #0288D1 0%, #03A9F4 100%)';

const LINE_COLORS = [
  '#1B5E20',
  '#2E7D32',
  '#66BB6A',
  '#5D4037',
  '#8D6E63',
  '#A1887F',
  '#388E3C',
  '#43A047',
];

function StatCardSkeleton() {
  return <div className="h-36 rounded-xl bg-gray-100 animate-pulse" />;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-agri-100/60 bg-white p-6 animate-pulse">
      <div className="h-6 w-48 bg-gray-100 rounded mb-4" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-agri-100/60 bg-white p-6 animate-pulse">
      <div className="h-6 w-48 bg-gray-100 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded" />
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
}

function StatCard({ title, value, subtitle, icon, gradient, delay }: StatCardProps) {
  return (
    <div
      className="relative rounded-xl p-6 text-white shadow-lg overflow-hidden animate-fade-in animate-slide-up hover:-translate-y-1 transition-transform duration-300"
      style={{ background: gradient, animationDelay: `${delay}ms` }}
    >
      <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -right-8 bottom-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-white/85 mb-1">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            {icon}
          </div>
        </div>
        <p className="text-sm text-white/80">{subtitle}</p>
      </div>
    </div>
  );
}

interface YieldChartProps {
  trends: YieldTrend[];
}

function YieldChart({ trends }: YieldChartProps) {
  const xAxisKeys = useMemo(() => {
    const allKeys = new Set<string>();
    trends.forEach((t) => t.data.forEach((d) => allKeys.add(d.time)));
    return Array.from(allKeys).sort((a, b) => {
      const na = parseInt(a.replace('#', ''));
      const nb = parseInt(b.replace('#', ''));
      return na - nb;
    });
  }, [trends]);

  const chartData = useMemo(() => {
    return xAxisKeys.map((key) => {
      const row: Record<string, string | number> = { time: key };
      trends.forEach((t) => {
        const point = t.data.find((d) => d.time === key);
        if (point) row[t.varietyName] = point.value;
      });
      return row;
    });
  }, [trends, xAxisKeys]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          {trends.map((t, idx) => {
            const color = t.isSuspended ? '#E53935' : LINE_COLORS[idx % LINE_COLORS.length];
            return (
              <linearGradient key={t.varietyId} id={`color-${t.varietyId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE9" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 12, fill: '#6D4C41' }}
          axisLine={{ stroke: '#D7CCC8' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6D4C41' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #A5D6A7',
            boxShadow: '0 8px 24px -8px rgba(27,94,32,0.2)',
            backgroundColor: '#FFFEF7',
          }}
          labelStyle={{ fontWeight: 600, color: '#145214', marginBottom: 6 }}
          formatter={(value: number, name: string) => [
            `${formatNumber(value, 0)} kg/ha`,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ paddingTop: 16 }}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-sm text-soil-700">{value}</span>}
        />
        {trends.map((t, idx) => {
          const color = t.isSuspended ? '#E53935' : LINE_COLORS[idx % LINE_COLORS.length];
          return (
            <Area
              key={t.varietyId}
              type="monotone"
              dataKey={t.varietyName}
              stroke={color}
              strokeWidth={t.isSuspended ? 2.5 : 2}
              strokeDasharray={t.isSuspended ? '6 4' : undefined}
              fill={`url(#color-${t.varietyId})`}
              connectNulls
              dot={{ r: t.isSuspended ? 4 : 3, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5 }}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface RadarDataPoint {
  metric: string;
  current: number;
  target: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
}

function ManagementRadar({ data }: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="#D7CCC8" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fontSize: 12, fill: '#5D4037', fontWeight: 500 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#A1887F' }}
          axisLine={false}
          tickCount={6}
        />
        <Radar
          name="目标值"
          dataKey="target"
          stroke="#8D6E63"
          fill="#8D6E63"
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={{ r: 3 }}
        />
        <Radar
          name="当前值"
          dataKey="current"
          stroke="#1B5E20"
          fill="#1B5E20"
          fillOpacity={0.35}
          strokeWidth={2}
          dot={{ r: 4, fill: '#2E7D32' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-sm text-soil-700">{value}</span>}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #A5D6A7',
            boxShadow: '0 8px 24px -8px rgba(27,94,32,0.2)',
            backgroundColor: '#FFFEF7',
          }}
          formatter={(value: number) => [`${value}%`]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

interface VarietyAlertTableProps {
  trends: YieldTrend[];
  suspended: Variety[];
}

function VarietyAlertTable({ trends, suspended }: VarietyAlertTableProps) {
  const suspendedMap = useMemo(() => {
    const m = new Map<string, Variety>();
    suspended.forEach((v) => m.set(v.id, v));
    return m;
  }, [suspended]);

  const rows = useMemo(() => {
    return trends.map((t) => {
      const v = suspendedMap.get(t.varietyId);
      return {
        id: t.varietyId,
        name: t.varietyName,
        isSuspended: t.isSuspended,
        consecutiveDeviations: t.consecutiveDeviations,
        lastDeviation: v?.lastYieldDeviation ?? null,
        suspendedReason: v?.suspendedReason ?? null,
      };
    });
  }, [trends, suspendedMap]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="table-header w-40">品种名称</th>
            <th className="table-header w-28 text-center">状态</th>
            <th className="table-header w-32 text-center">连续偏差</th>
            <th className="table-header w-32 text-center">最后偏差</th>
            <th className="table-header">备注</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-agri-50/40 transition-colors">
              <td className="table-cell font-medium text-soil-800">{row.name}</td>
              <td className="table-cell text-center">
                {row.isSuspended ? (
                  <span className="badge bg-red-100 text-red-700 border border-red-200">
                    <AlertOctagon className="w-3 h-3 mr-1" />
                    已暂停
                  </span>
                ) : (
                  <span className="badge bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    正常
                  </span>
                )}
              </td>
              <td className="table-cell text-center">
                <span
                  className={`font-semibold ${
                    row.consecutiveDeviations >= 2 ? 'text-orange-600' : 'text-soil-600'
                  }`}
                >
                  {row.consecutiveDeviations} 次
                </span>
              </td>
              <td className="table-cell text-center">
                {row.lastDeviation !== null ? (
                  <span
                    className={`font-medium ${
                      row.lastDeviation > 15
                        ? 'text-red-600'
                        : row.lastDeviation > 10
                          ? 'text-orange-600'
                          : 'text-soil-600'
                    }`}
                  >
                    {row.lastDeviation.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="table-cell">
                {row.suspendedReason ? (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-xs border border-red-100">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{row.suspendedReason}</span>
                  </div>
                ) : row.consecutiveDeviations > 0 ? (
                  <span className="text-xs text-soil-500">需关注产量波动</span>
                ) : (
                  <span className="text-xs text-gray-400">表现稳定</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RecentSimulationsTableProps {
  tasks: SimulationTask[];
}

function RecentSimulationsTable({ tasks }: RecentSimulationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="table-header">任务名称</th>
            <th className="table-header w-28">品种</th>
            <th className="table-header w-32">状态</th>
            <th className="table-header w-36">进度</th>
            <th className="table-header w-40">创建时间</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-agri-50/40 transition-colors">
              <td className="table-cell">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-agri-600 flex-shrink-0" />
                  <span className="text-soil-800 font-medium truncate max-w-[200px]">
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
                          : 'bg-gradient-to-r from-agri-600 to-agri-400'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-soil-600 w-8 text-right">
                    {task.progress}%
                  </span>
                </div>
              </td>
              <td className="table-cell">
                <div className="flex items-center gap-1.5 text-xs text-soil-600">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(task.createdAt, true)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/stats/dashboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.success) setData(json.data);
          else setError(json.error || '获取数据失败');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || '网络错误');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayData = data;

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 animate-fade-in">
        <h1 className="font-serif text-2xl font-bold text-agri-800 flex items-center gap-3">
          <LayoutDashboardIcon />
          综合看板
        </h1>
        <p className="mt-1 text-sm text-soil-500">
          实时监控模拟任务进度、品种表现与关键管理指标
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">数据加载失败：</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : displayData ? (
          <>
            <StatCard
              title="模拟完成率"
              value={`${displayData.todayStats.completionRate.toFixed(1)}%`}
              subtitle={`总任务数 ${displayData.todayStats.totalSimulations}`}
              icon={<CheckCircle className="w-6 h-6" />}
              gradient="linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #66BB6A 100%)"
              delay={0}
            />
            <StatCard
              title="水分利用效率 WUE"
              value={`${formatNumber(displayData.todayStats.avgWUE, 2)} kg/m³`}
              subtitle="优于行业均值 12%"
              icon={<Droplets className="w-6 h-6" />}
              gradient="linear-gradient(135deg, #6D4C41 0%, #8D6E63 50%, #A1887F 100%)"
              delay={100}
            />
            <StatCard
              title="氮素利用效率 NUE"
              value={formatNumber(displayData.todayStats.avgNUE, 3)}
              subtitle={`目标达成率 ${formatPercent(displayData.todayStats.avgNUE / 0.8, 0)}`}
              icon={<Leaf className="w-6 h-6" />}
              gradient={SKY_GRADIENT}
              delay={200}
            />
            <StatCard
              title="活跃预警数"
              value={formatNumber(displayData.todayStats.activeAlerts, 0)}
              subtitle={`待处理 ${displayData.todayStats.pendingApprovals} 条审批`}
              icon={<AlertTriangle className="w-6 h-6" />}
              gradient="linear-gradient(135deg, #FFA000 0%, #FFAB40 100%)"
              delay={300}
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : displayData ? (
          <>
            <div className="card p-6 animate-fade-in animate-slide-up" style={{ animationDelay: '150ms' }}>
              <h2 className="font-serif text-xl font-semibold text-agri-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-agri-600" />
                产量趋势
                <span className="ml-auto text-xs font-normal text-soil-500">
                  单位：kg/ha
                </span>
              </h2>
              <YieldChart trends={displayData.yieldTrends} />
            </div>
            <div className="card p-6 animate-fade-in animate-slide-up" style={{ animationDelay: '250ms' }}>
              <h2 className="font-serif text-xl font-semibold text-agri-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-agri-600" />
                管理指标雷达
              </h2>
              <ManagementRadar data={displayData.radarData} />
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6 mb-8">
        {loading ? (
          <>
            <TableSkeleton />
            <TableSkeleton />
          </>
        ) : displayData ? (
          <>
            <div className="card p-6 animate-fade-in animate-slide-up" style={{ animationDelay: '300ms' }}>
              <h2 className="font-serif text-xl font-semibold text-agri-800 mb-4 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-agri-600" />
                品种预警状态
              </h2>
              <VarietyAlertTable
                trends={displayData.yieldTrends}
                suspended={displayData.suspendedVarieties}
              />
            </div>
            <div className="card p-6 animate-fade-in animate-slide-up" style={{ animationDelay: '400ms' }}>
              <h2 className="font-serif text-xl font-semibold text-agri-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-agri-600" />
                最近模拟任务
              </h2>
              <RecentSimulationsTable tasks={displayData.recentSimulations} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function LayoutDashboardIcon() {
  return (
    <svg
      className="w-7 h-7 text-agri-700"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="14" y="3" width="7" height="5" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="14" y="12" width="7" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="3" y="16" width="7" height="5" rx="1" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}
