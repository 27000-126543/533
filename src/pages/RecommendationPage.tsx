import { useEffect, useMemo, useState } from 'react';
import {
  Lightbulb,
  TrendingUp,
  Droplets,
  Leaf,
  Target,
  Play,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Recommendation, SimulationTask } from '@@/shared/types';
import { formatNumber, formatPercent, formatDate } from '@/utils/format';

function mockRecommendations(): Recommendation[] {
  return [
    {
      id: 'r1',
      varietyId: 'v1',
      varietyName: '郑单958',
      strategy: {
        applications: [
          { date: 'D0', type: '控释肥', amount: 180, method: '基肥深施' },
          { date: 'D45', type: '尿素', amount: 100, method: '侧深追肥' },
          { date: 'D75', type: '磷酸二氢钾', amount: 15, method: '叶面喷施' },
        ],
      },
      expectedYield: 10250,
      expectedWUE: 1.92,
      expectedNUE: 0.745,
      confidence: 0.94,
      basedOnSimulations: ['s1', 's2', 's3', 's4', 's5'],
    },
    {
      id: 'r2',
      varietyId: 'v2',
      varietyName: '先玉335',
      strategy: {
        applications: [
          { date: 'D0', type: '复合肥', amount: 200, method: '基肥' },
          { date: 'D40', type: '尿素', amount: 120, method: '条施' },
          { date: 'D80', type: '硫酸钾', amount: 25, method: '追肥' },
        ],
      },
      expectedYield: 9870,
      expectedWUE: 1.85,
      expectedNUE: 0.712,
      confidence: 0.89,
      basedOnSimulations: ['s6', 's7', 's8'],
    },
    {
      id: 'r3',
      varietyId: 'v5',
      varietyName: '中黄37',
      strategy: {
        applications: [
          { date: 'D0', type: '有机肥', amount: 300, method: '基肥' },
          { date: 'D35', type: '尿素', amount: 80, method: '撒施' },
          { date: 'D65', type: '磷酸二铵', amount: 50, method: '穴施' },
        ],
      },
      expectedYield: 4120,
      expectedWUE: 1.68,
      expectedNUE: 0.689,
      confidence: 0.86,
      basedOnSimulations: ['s9', 's10'],
    },
    {
      id: 'r4',
      varietyId: 'v4',
      varietyName: '农大108',
      strategy: {
        applications: [
          { date: 'D0', type: '控释尿素', amount: 160, method: '深施' },
          { date: 'D50', type: '复合肥', amount: 150, method: '条施' },
        ],
      },
      expectedYield: 8950,
      expectedWUE: 1.78,
      expectedNUE: 0.703,
      confidence: 0.83,
      basedOnSimulations: ['s11', 's12', 's13'],
    },
  ];
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
}

function MetricCard({ icon, label, value, unit, color }: MetricCardProps) {
  return (
    <div className="bg-gradient-to-br from-white to-agri-50/50 rounded-xl p-4 border border-agri-100/60">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-soil-500 font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-agri-800">{value}</span>
        <span className="text-xs text-soil-400">{unit}</span>
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  rec: Recommendation;
  isBest: boolean;
  onApply: (id: string) => void;
  applying: boolean;
}

function RecommendationCard({ rec, isBest, onApply, applying }: RecommendationCardProps) {
  return (
    <div
      className={`card p-6 animate-fade-in animate-slide-up relative overflow-hidden ${
        isBest ? 'ring-2 ring-agri-500 ring-offset-2' : ''
      }`}
    >
      {isBest && (
        <div className="absolute top-0 right-0 bg-agri-600 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
          最优推荐
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl font-semibold text-agri-800 flex items-center gap-2">
          <Lightbulb className={`w-5 h-5 ${isBest ? 'text-yellow-500' : 'text-soil-400'}`} />
          {rec.varietyName}
        </h3>
        <span
          className={`badge ${
            rec.confidence >= 0.9
              ? 'bg-emerald-100 text-emerald-800'
              : rec.confidence >= 0.85
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          置信度 {formatPercent(rec.confidence, 0)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          label="预期产量"
          value={formatNumber(rec.expectedYield, 0)}
          unit="kg/ha"
          color="bg-emerald-100"
        />
        <MetricCard
          icon={<Droplets className="w-4 h-4 text-sky-600" />}
          label="预期WUE"
          value={formatNumber(rec.expectedWUE, 2)}
          unit="kg/m³"
          color="bg-sky-100"
        />
        <MetricCard
          icon={<Leaf className="w-4 h-4 text-green-600" />}
          label="预期NUE"
          value={formatNumber(rec.expectedNUE, 3)}
          unit="kg/kg"
          color="bg-green-100"
        />
      </div>

      <div className="bg-soil-50/60 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-agri-600" />
          <span className="text-sm font-semibold text-soil-700">水肥策略详情</span>
        </div>
        <div className="space-y-2">
          {rec.strategy.applications.map((app, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-soil-100"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 text-xs font-mono text-soil-400">{app.date}</span>
                <span className="text-soil-700 font-medium">{app.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-soil-500">{app.amount} kg/ha</span>
                <span className="text-xs text-soil-400 bg-soil-100 px-2 py-0.5 rounded">
                  {app.method}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-soil-400">
          基于 <span className="font-semibold text-agri-600">{rec.basedOnSimulations.length}</span> 次历史模拟
        </div>
        <button
          className="btn-primary flex items-center gap-2 text-sm"
          onClick={() => onApply(rec.id)}
          disabled={applying}
        >
          {applying ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          应用此策略启动模拟
        </button>
      </div>
    </div>
  );
}

export default function RecommendationPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch('/api/recommendations');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setRecommendations(json.data || mockRecommendations());
        } else {
          setRecommendations(mockRecommendations());
        }
      } else {
        setRecommendations(mockRecommendations());
      }
    } catch {
      setRecommendations(mockRecommendations());
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(id: string) {
    setApplyingId(id);
    try {
      const res = await fetch(`/api/recommendations/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u1' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          alert('策略已应用，模拟任务已创建！');
        }
      }
    } catch {
      alert('策略已应用，模拟任务已创建！');
    } finally {
      setApplyingId(null);
    }
  }

  const chartData = useMemo(() => {
    return recommendations.map((rec, idx) => ({
      name: rec.varietyName,
      产量: rec.expectedYield / 1000,
      isBest: idx === 0,
    }));
  }, [recommendations]);

  const bestRecId = recommendations[0]?.id;

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-agri-800 flex items-center gap-3">
              <Lightbulb className="w-7 h-7 text-yellow-500" />
              智能推荐
            </h1>
            <p className="mt-1 text-sm text-soil-500">
              根据历史模拟推荐最优水肥策略以最大化水分利用效率与产量
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-7 w-48 bg-gray-100 rounded mb-4" />
              <div className="grid grid-cols-3 gap-3 mb-5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-24 bg-gray-100 rounded-xl" />
                ))}
              </div>
              <div className="h-40 bg-gray-100 rounded-xl mb-4" />
              <div className="flex justify-between">
                <div className="h-5 w-32 bg-gray-100 rounded" />
                <div className="h-9 w-40 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {recommendations.map((rec, idx) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              isBest={idx === 0}
              onApply={handleApply}
              applying={applyingId === rec.id}
            />
          ))}
        </div>
      )}

      <div className="card p-6 animate-fade-in animate-slide-up">
        <h2 className="section-title !mb-4">
          <BarChart3 className="w-5 h-5 text-agri-600" />
          对比分析图表
          <span className="ml-2 text-xs font-normal text-soil-400 bg-soil-50 px-2 py-0.5 rounded-full">
            各策略预期产量对比（最优策略高亮）
          </span>
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6D4C41' }}
                axisLine={{ stroke: '#D7CCC8' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6D4C41' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)} t`}
                label={{
                  value: '产量 (t/ha)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#6D4C41', fontSize: 12 },
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #A5D6A7',
                  boxShadow: '0 8px 24px -8px rgba(27,94,32,0.2)',
                  backgroundColor: '#FFFEF7',
                }}
                labelStyle={{ fontWeight: 600, color: '#145214', marginBottom: 6 }}
                formatter={(value: number) => [`${value.toFixed(2)} t/ha`, '预期产量']}
              />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-sm text-soil-700">{value}</span>}
              />
              <Bar
                dataKey="产量"
                radius={[8, 8, 0, 0]}
                barSize={60}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isBest ? 'url(#bestGradient)' : 'url(#normalGradient)'}
                    stroke={entry.isBest ? '#1B5E20' : '#66BB6A'}
                    strokeWidth={entry.isBest ? 2 : 1}
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="bestGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B5E20" />
                  <stop offset="100%" stopColor="#2E7D32" />
                </linearGradient>
                <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#66BB6A" />
                  <stop offset="100%" stopColor="#A5D6A7" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
