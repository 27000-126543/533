import { useEffect, useState } from 'react';
import {
  Users,
  Settings,
  Bell,
  ScrollText,
  ToggleLeft,
  ToggleRight,
  UserCog,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Droplets,
  Leaf,
} from 'lucide-react';
import type { Variety, User, AdjustmentLog, Approval } from '@@/shared/types';
import { formatNumber, formatDate, roleLabel } from '@/utils/format';
import useAppStore from '@/store/appStore';

type TabKey = 'varieties' | 'users' | 'notifications' | 'logs';
type LogTabKey = 'adjustment' | 'approval' | 'system';

interface SystemLog {
  id: string;
  operator: string;
  action: string;
  target: string;
  ip: string;
  timestamp: string;
  status: 'success' | 'failed';
}

function mockVarieties(): Variety[] {
  return [
    { id: 'v1', name: '郑单958', type: '玉米', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
    { id: 'v2', name: '先玉335', type: '玉米', isSuspended: false, consecutiveDeviations: 1, lastYieldDeviation: 8.5, suspendedAt: null, suspendedReason: null },
    { id: 'v3', name: '登海605', type: '玉米', isSuspended: true, consecutiveDeviations: 3, lastYieldDeviation: 18.2, suspendedAt: '2026-06-10 09:30:00', suspendedReason: '连续三次模拟产量预测偏差超过15%' },
    { id: 'v4', name: '济麦22', type: '小麦', isSuspended: false, consecutiveDeviations: 1, lastYieldDeviation: 12.3, suspendedAt: null, suspendedReason: null },
    { id: 'v5', name: '鲁原502', type: '小麦', isSuspended: false, consecutiveDeviations: 0, lastYieldDeviation: null, suspendedAt: null, suspendedReason: null },
    { id: 'v6', name: '南粳9108', type: '水稻', isSuspended: false, consecutiveDeviations: 2, lastYieldDeviation: 13.8, suspendedAt: null, suspendedReason: null },
  ];
}

function mockUsers(): User[] {
  return [
    { id: 'u1', username: '李农艺师', role: 'agronomist', active: true, createdAt: '2026-01-15 10:00:00' },
    { id: 'u2', username: '王专家', role: 'expert', active: true, createdAt: '2026-01-10 14:30:00' },
    { id: 'u3', username: '张首席', role: 'chief_scientist', active: true, createdAt: '2026-01-05 09:00:00' },
    { id: 'u4', username: '系统管理员', role: 'admin', active: true, createdAt: '2026-01-01 08:00:00' },
    { id: 'u5', username: '测试用户', role: 'agronomist', active: false, createdAt: '2026-02-20 11:00:00' },
  ];
}

function mockAdjustmentLogs(): AdjustmentLog[] {
  return [
    { id: 'al1', alertId: 'a1', previousIrrigation: 20, newIrrigation: 28, previousFertilizer: 400, newFertilizer: 320, reason: '土壤含水量偏低，增加灌溉量，减少氮肥用量', adjustedBy: 'u1', adjustedByName: '李农艺师', adjustedAt: '2026-06-12 14:30:00' },
    { id: 'al2', alertId: 'a2', previousIrrigation: 22, newIrrigation: 25, previousFertilizer: 350, newFertilizer: 280, reason: '氮素淋失风险，减少施肥量', adjustedBy: 'u2', adjustedByName: '王专家', adjustedAt: '2026-06-11 10:15:00' },
    { id: 'al3', alertId: 'a3', previousIrrigation: 18, newIrrigation: 26, previousFertilizer: 380, newFertilizer: 380, reason: '严重水分亏缺，紧急补水', adjustedBy: 'u1', adjustedByName: '李农艺师', adjustedAt: '2026-06-10 16:45:00' },
  ];
}

function mockApprovals(): Approval[] {
  return [
    { id: 'ap1', simulationId: 's1', simulationName: '华北夏玉米-郑单958-高水高肥', varietyName: '郑单958', level: 1, status: 'approved', reviewerId: 'u2', reviewerName: '王专家', comment: '参数合理，同意执行', createdAt: '2026-06-12 09:00:00', reviewedAt: '2026-06-12 10:30:00' },
    { id: 'ap2', simulationId: 's2', simulationName: '东北大豆-中黄37-常规管理', varietyName: '中黄37', level: 2, status: 'pending', reviewerId: null, reviewerName: null, comment: null, createdAt: '2026-06-13 08:00:00', reviewedAt: null },
    { id: 'ap3', simulationId: 's3', simulationName: '黄淮海小麦-节水方案A', varietyName: '济麦22', level: 1, status: 'rejected', reviewerId: 'u3', reviewerName: '张首席', comment: '气象数据样本量不足，建议补充', createdAt: '2026-06-11 14:00:00', reviewedAt: '2026-06-11 16:00:00' },
  ];
}

function mockSystemLogs(): SystemLog[] {
  return [
    { id: 'sl1', operator: '系统管理员', action: '登录系统', target: '认证模块', ip: '192.168.1.100', timestamp: '2026-06-13 08:30:00', status: 'success' },
    { id: 'sl2', operator: '李农艺师', action: '创建模拟任务', target: '模拟任务:s100', ip: '192.168.1.101', timestamp: '2026-06-13 09:15:00', status: 'success' },
    { id: 'sl3', operator: '王专家', action: '修改预警阈值', target: '系统配置', ip: '192.168.1.102', timestamp: '2026-06-13 10:00:00', status: 'success' },
    { id: 'sl4', operator: '未知用户', action: '尝试登录', target: '认证模块', ip: '10.0.0.1', timestamp: '2026-06-13 02:30:00', status: 'failed' },
    { id: 'sl5', operator: '系统管理员', action: '暂停品种', target: '品种:登海605', ip: '192.168.1.100', timestamp: '2026-06-10 09:30:00', status: 'success' },
  ];
}

const TABS = [
  { key: 'varieties' as TabKey, label: '品种管理', icon: Activity },
  { key: 'users' as TabKey, label: '用户管理', icon: Users },
  { key: 'notifications' as TabKey, label: '通知设置', icon: Bell },
  { key: 'logs' as TabKey, label: '日志审计', icon: ScrollText },
];

const LOG_TABS = [
  { key: 'adjustment' as LogTabKey, label: '调整日志' },
  { key: 'approval' as LogTabKey, label: '审批日志' },
  { key: 'system' as LogTabKey, label: '系统操作日志' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('varieties');
  const [activeLogTab, setActiveLogTab] = useState<LogTabKey>('adjustment');

  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [adjustmentLogs, setAdjustmentLogs] = useState<AdjustmentLog[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [waterThreshold, setWaterThreshold] = useState(15);
  const [nitrogenThreshold, setNitrogenThreshold] = useState(65);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      if (activeTab === 'varieties') {
        const res = await fetch('/api/varieties');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setVarieties(json.data || mockVarieties());
          else setVarieties(mockVarieties());
        } else {
          setVarieties(mockVarieties());
        }
      } else if (activeTab === 'users') {
        const res = await fetch('/api/users');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setUsers(json.data || []);
          else {
            setUsers([]);
            alert(json.error || '加载用户列表失败');
          }
        } else {
          setUsers([]);
          alert('加载用户列表失败，服务器错误');
        }
      } else if (activeTab === 'logs') {
        const [adjRes, appRes] = await Promise.all([
          fetch('/api/adjustment-logs'),
          fetch('/api/approvals'),
        ]);
        if (adjRes.ok) {
          const json = await adjRes.json();
          if (json.success) setAdjustmentLogs(json.data || mockAdjustmentLogs());
          else setAdjustmentLogs(mockAdjustmentLogs());
        } else {
          setAdjustmentLogs(mockAdjustmentLogs());
        }
        if (appRes.ok) {
          const json = await appRes.json();
          if (json.success) setApprovals(json.data || mockApprovals());
          else setApprovals(mockApprovals());
        } else {
          setApprovals(mockApprovals());
        }
        setSystemLogs(mockSystemLogs());
      }
    } catch {
      if (activeTab === 'varieties') setVarieties(mockVarieties());
      if (activeTab === 'users') setUsers(mockUsers());
      if (activeTab === 'logs') {
        setAdjustmentLogs(mockAdjustmentLogs());
        setApprovals(mockApprovals());
        setSystemLogs(mockSystemLogs());
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleVarietySuspend(v: Variety) {
    if (!confirm(v.isSuspended ? `确认恢复品种「${v.name}」？` : `确认暂停品种「${v.name}」？`)) return;
    setTogglingId(v.id);
    try {
      const res = await fetch(`/api/varieties/${v.id}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: !v.isSuspended, reason: v.isSuspended ? undefined : '手动暂停' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setVarieties((prev) => prev.map((x) => (x.id === v.id ? json.data : x)));
        }
      }
    } catch {
      setVarieties((prev) =>
        prev.map((x) =>
          x.id === v.id
            ? {
                ...x,
                isSuspended: !x.isSuspended,
                suspendedAt: !x.isSuspended ? new Date().toISOString() : null,
                suspendedReason: !x.isSuspended ? '手动暂停' : null,
                consecutiveDeviations: x.isSuspended ? 0 : x.consecutiveDeviations,
              }
            : x
        )
      );
    } finally {
      setTogglingId(null);
    }
  }

  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const addNotification = useAppStore((s) => s.addNotification);

  async function toggleUserActive(u: User) {
    if (!isAdmin) {
      alert('无权限操作');
      return;
    }
    if (!confirm(u.active ? `确认禁用用户「${u.username}」？` : `确认启用用户「${u.username}」？`)) return;
    setTogglingId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !u.active, operatorId: currentUser?.id }),
      });
      const json = await res.json().catch(() => ({ success: false, error: '服务器无响应' }));
      if (res.ok && json.success) {
        const listRes = await fetch('/api/users');
        if (listRes.ok) {
          const listJson = await listRes.json();
          if (listJson.success) {
            setUsers(listJson.data || []);
          }
        }
        addNotification({ type: 'success', message: `用户「${u.username}」已${u.active ? '禁用' : '启用'}` });
      } else {
        const errMsg = json.error || '操作失败';
        alert(errMsg);
        addNotification({ type: 'error', message: errMsg });
      }
    } catch (e: any) {
      const errMsg = e?.message || '网络错误，操作失败';
      alert(errMsg);
      addNotification({ type: 'error', message: errMsg });
    } finally {
      setTogglingId(null);
    }
  }

  async function saveNotificationSettings() {
    setSavingSettings(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      alert('预警阈值配置已保存！');
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-agri-800 flex items-center gap-3">
              <Settings className="w-7 h-7 text-slate-600" />
              系统管理
            </h1>
            <p className="mt-1 text-sm text-soil-500">
              管理系统配置、用户权限与操作审计
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-soil-100">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className={active ? 'tab-active flex-1' : 'tab-inactive flex-1'}
                onClick={() => setActiveTab(tab.key)}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon className={`w-4 h-4 ${active ? 'text-agri-600' : 'text-soil-400'}`} />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'varieties' && (
            <div className="animate-fade-in">
              <h2 className="section-title !mb-4">
                <Activity className="w-5 h-5 text-agri-600" />
                品种管理
              </h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-soil-100">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">品种名称</th>
                        <th className="table-header w-28">类型</th>
                        <th className="table-header w-28">状态</th>
                        <th className="table-header w-32 text-center">连续偏差次数</th>
                        <th className="table-header w-32 text-center">最后偏差</th>
                        <th className="table-header w-28 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varieties.map((v) => (
                        <tr
                          key={v.id}
                          className={`transition-colors ${
                            v.isSuspended ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-agri-50/40'
                          }`}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              {v.isSuspended && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                              <span className={v.isSuspended ? 'text-red-800 font-medium' : 'text-soil-800 font-medium'}>
                                {v.name}
                              </span>
                            </div>
                            {v.isSuspended && v.suspendedReason && (
                              <p className="text-xs text-red-500 mt-1 ml-6">{v.suspendedReason}</p>
                            )}
                          </td>
                          <td className={`table-cell ${v.isSuspended ? 'text-red-600' : 'text-soil-600'}`}>
                            {v.type}
                          </td>
                          <td className="table-cell">
                            <span
                              className={`badge ${
                                v.isSuspended
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {v.isSuspended ? '已暂停' : '正常'}
                            </span>
                          </td>
                          <td className={`table-cell text-center ${v.isSuspended ? 'text-red-600' : 'text-soil-700'}`}>
                            {v.consecutiveDeviations} 次
                          </td>
                          <td className={`table-cell text-center ${v.isSuspended ? 'text-red-600 font-semibold' : 'text-soil-700'}`}>
                            {v.lastYieldDeviation !== null
                              ? `${formatNumber(v.lastYieldDeviation, 1)}%`
                              : '-'}
                          </td>
                          <td className="table-cell text-center">
                            <button
                              className="p-2 rounded-lg transition-colors disabled:opacity-50"
                              onClick={() => toggleVarietySuspend(v)}
                              disabled={togglingId === v.id}
                              title={v.isSuspended ? '点击恢复' : '点击暂停'}
                            >
                              {togglingId === v.id ? (
                                <span className="w-5 h-5 border-2 border-agri-600 border-t-transparent rounded-full animate-spin inline-block" />
                              ) : v.isSuspended ? (
                                <ToggleLeft className="w-6 h-6 text-red-500" />
                              ) : (
                                <ToggleRight className="w-6 h-6 text-emerald-500" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-fade-in">
              <h2 className="section-title !mb-4">
                <UserCog className="w-5 h-5 text-agri-600" />
                用户管理
              </h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-soil-100">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">用户名</th>
                        <th className="table-header w-36">角色</th>
                        <th className="table-header w-28">状态</th>
                        <th className="table-header w-40">创建时间</th>
                        <th className="table-header w-28 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            !u.active ? 'bg-gray-50/60 hover:bg-gray-50' : 'hover:bg-agri-50/40'
                          }`}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                u.active ? 'bg-agri-100' : 'bg-gray-100'
                              }`}>
                                <Users className={`w-4 h-4 ${u.active ? 'text-agri-600' : 'text-gray-400'}`} />
                              </div>
                              <span className={`font-medium ${u.active ? 'text-soil-800' : 'text-gray-400'}`}>
                                {u.username}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <Shield className={`w-4 h-4 ${
                                u.role === 'admin' ? 'text-red-500' :
                                u.role === 'chief_scientist' ? 'text-purple-500' :
                                u.role === 'expert' ? 'text-blue-500' : 'text-agri-500'
                              }`} />
                              <span className={u.active ? 'text-soil-700' : 'text-gray-400'}>
                                {roleLabel(u.role)}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span
                              className={`badge ${
                                u.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {u.active ? '启用' : '禁用'}
                            </span>
                          </td>
                          <td className="table-cell text-soil-500">
                            {formatDate(u.createdAt, true)}
                          </td>
                          <td className="table-cell text-center">
                            <button
                              className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => toggleUserActive(u)}
                              disabled={togglingId === u.id || !isAdmin}
                              title={!isAdmin ? '无权限操作' : u.active ? '点击禁用' : '点击启用'}
                            >
                              {togglingId === u.id ? (
                                <span className="w-5 h-5 border-2 border-agri-600 border-t-transparent rounded-full animate-spin inline-block" />
                              ) : u.active ? (
                                <ToggleRight className="w-6 h-6 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="animate-fade-in max-w-2xl">
              <h2 className="section-title !mb-6">
                <Bell className="w-5 h-5 text-agri-600" />
                通知设置
              </h2>
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-soil-700 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    预警推送阈值配置
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="label-text">
                        <Droplets className="w-4 h-4 text-sky-500 inline mr-1" />
                        水分亏缺阈值 (%)
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={waterThreshold}
                        onChange={(e) => setWaterThreshold(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.5"
                      />
                      <p className="text-xs text-soil-400 mt-1">
                        当土壤含水量低于此值时触发水分亏缺预警
                      </p>
                    </div>
                    <div>
                      <label className="label-text">
                        <Leaf className="w-4 h-4 text-green-500 inline mr-1" />
                        氮素淋失阈值 (mg/kg)
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={nitrogenThreshold}
                        onChange={(e) => setNitrogenThreshold(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="200"
                        step="1"
                      />
                      <p className="text-xs text-soil-400 mt-1">
                        当矿质氮浓度高于此值时触发氮素淋失预警
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={saveNotificationSettings}
                    disabled={savingSettings}
                  >
                    {savingSettings ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="animate-fade-in">
              <div className="flex border-b border-soil-100 mb-5">
                {LOG_TABS.map((tab) => {
                  const active = activeLogTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      className={active ? 'tab-active' : 'tab-inactive'}
                      onClick={() => setActiveLogTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeLogTab === 'adjustment' && (
                <div className="overflow-x-auto rounded-xl border border-soil-100">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">调整原因</th>
                        <th className="table-header w-36">操作人员</th>
                        <th className="table-header w-28 text-center">灌溉调整</th>
                        <th className="table-header w-28 text-center">施肥调整</th>
                        <th className="table-header w-40">调整时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-agri-50/40 transition-colors">
                          <td className="table-cell text-soil-700 max-w-md truncate">
                            {log.reason}
                          </td>
                          <td className="table-cell text-soil-600">{log.adjustedByName}</td>
                          <td className="table-cell text-center">
                            <span className={`text-sm ${log.newIrrigation > log.previousIrrigation ? 'text-sky-600' : 'text-orange-600'}`}>
                              {log.previousIrrigation} → {log.newIrrigation}
                            </span>
                          </td>
                          <td className="table-cell text-center">
                            <span className={`text-sm ${log.newFertilizer < log.previousFertilizer ? 'text-green-600' : 'text-orange-600'}`}>
                              {log.previousFertilizer} → {log.newFertilizer}
                            </span>
                          </td>
                          <td className="table-cell text-soil-500">
                            {formatDate(log.adjustedAt, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeLogTab === 'approval' && (
                <div className="overflow-x-auto rounded-xl border border-soil-100">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">模拟任务</th>
                        <th className="table-header w-28">品种</th>
                        <th className="table-header w-20 text-center">级别</th>
                        <th className="table-header w-28">状态</th>
                        <th className="table-header w-28">审批人</th>
                        <th className="table-header w-40">审批时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map((app) => (
                        <tr key={app.id} className="hover:bg-agri-50/40 transition-colors">
                          <td className="table-cell text-soil-700">
                            {app.simulationName}
                          </td>
                          <td className="table-cell text-soil-600">{app.varietyName}</td>
                          <td className="table-cell text-center">
                            <span className={`badge ${
                              app.level === 2 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              L{app.level}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${
                              app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {app.status === 'approved' ? '已通过' :
                               app.status === 'rejected' ? '已驳回' : '待审批'}
                            </span>
                          </td>
                          <td className="table-cell text-soil-600">{app.reviewerName || '-'}</td>
                          <td className="table-cell text-soil-500">
                            {app.reviewedAt ? formatDate(app.reviewedAt, true) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeLogTab === 'system' && (
                <div className="overflow-x-auto rounded-xl border border-soil-100">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">操作人</th>
                        <th className="table-header">操作行为</th>
                        <th className="table-header">操作对象</th>
                        <th className="table-header w-32">IP地址</th>
                        <th className="table-header w-24 text-center">状态</th>
                        <th className="table-header w-40">操作时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-agri-50/40 transition-colors">
                          <td className="table-cell text-soil-700">{log.operator}</td>
                          <td className="table-cell text-soil-600">{log.action}</td>
                          <td className="table-cell text-soil-600">{log.target}</td>
                          <td className="table-cell font-mono text-xs text-soil-500">{log.ip}</td>
                          <td className="table-cell text-center">
                            {log.status === 'success' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                            )}
                          </td>
                          <td className="table-cell text-soil-500">
                            {formatDate(log.timestamp, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
