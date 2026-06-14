import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  FlaskConical,
  CheckCircle,
  XCircle,
  ClipboardList,
  CheckSquare,
  XSquare,
  UserCheck,
  Clock,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';
import type {
  Alert,
  AlertLevel,
  AlertStatus,
  AlertType,
  Approval,
  ApprovalStatus,
  AdjustmentLog,
} from '@@/shared/types';
import { formatNumber, formatDate, formatPercent, alertLevelLabel, alertLevelColor } from '@/utils/format';

const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  water_deficit: '水分亏缺',
  nitrogen_leaching: '氮素淋失',
};

const ALERT_TYPE_COLOR: Record<AlertType, string> = {
  water_deficit: 'bg-sky-100 text-sky-800',
  nitrogen_leaching: 'bg-amber-100 text-amber-800',
};

const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  pending: '待处理',
  reviewed: '已复核',
  adjusted: '已调整',
  dismissed: '已驳回',
};

const ALERT_STATUS_COLOR: Record<AlertStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  adjusted: 'bg-emerald-100 text-emerald-800',
  dismissed: 'bg-red-100 text-red-800',
};

const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

const APPROVAL_STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

const LEVEL_BAR_COLOR: Record<AlertLevel, string> = {
  1: 'bg-yellow-500',
  2: 'bg-orange-500',
  3: 'bg-red-500',
};

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'approvals'>('alerts');
  const [approvalSubTab, setApprovalSubTab] = useState<1 | 2>(1);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [adjustmentLogs, setAdjustmentLogs] = useState<AdjustmentLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [levelFilter, setLevelFilter] = useState<AlertLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);

  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [approvalComment, setApprovalComment] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  const [showAdjustmentPreview, setShowAdjustmentPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [alertRes, approvalRes, logRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/approvals'),
        fetch('/api/adjustment-logs'),
      ]);

      if (alertRes.ok) {
        const json = await alertRes.json();
        if (json.success) setAlerts(json.data || mockAlerts());
        else setAlerts(mockAlerts());
      } else {
        setAlerts(mockAlerts());
      }

      if (approvalRes.ok) {
        const json = await approvalRes.json();
        if (json.success) setApprovals(json.data || mockApprovals());
        else setApprovals(mockApprovals());
      } else {
        setApprovals(mockApprovals());
      }

      if (logRes.ok) {
        const json = await logRes.json();
        if (json.success) setAdjustmentLogs(json.data || mockAdjustmentLogs());
        else setAdjustmentLogs(mockAdjustmentLogs());
      } else {
        setAdjustmentLogs(mockAdjustmentLogs());
      }
    } catch {
      setAlerts(mockAlerts());
      setApprovals(mockApprovals());
      setAdjustmentLogs(mockAdjustmentLogs());
    } finally {
      setLoading(false);
    }
  }

  async function refreshAlerts() {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAlerts(json.data || mockAlerts());
          if (selectedAlert) {
            const updated = (json.data || mockAlerts()).find((a: Alert) => a.id === selectedAlert.id);
            if (updated) setSelectedAlert(updated);
          }
        }
      }
    } catch {}
  }

  async function refreshAdjustmentLogs() {
    try {
      const res = await fetch('/api/adjustment-logs');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setAdjustmentLogs(json.data || mockAdjustmentLogs());
      }
    } catch {}
  }

  async function refreshApprovals() {
    try {
      const res = await fetch('/api/approvals');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setApprovals(json.data || mockApprovals());
          if (selectedApproval) {
            const updated = (json.data || mockApprovals()).find((a: Approval) => a.id === selectedApproval.id);
            if (updated) setSelectedApproval(updated);
          }
        }
      }
    } catch {}
  }

  function mockAlerts(): Alert[] {
    const base = new Date('2024-06-01T08:00:00').getTime();
    return [
      {
        id: 'a1',
        simulationId: 's1',
        simulationName: '华北夏玉米-郑单958-高水高肥',
        level: 3,
        type: 'water_deficit',
        message: '土壤含水量低于凋萎系数阈值，作物可能面临严重水分胁迫',
        threshold: 12,
        currentValue: 9.8,
        status: 'pending',
        reviewedBy: null,
        reviewerName: null,
        reviewNote: null,
        createdAt: new Date(base).toISOString(),
      },
      {
        id: 'a2',
        simulationId: 's2',
        simulationName: '东北大豆-中黄37-常规管理',
        level: 2,
        type: 'nitrogen_leaching',
        message: '土壤硝态氮淋失量超过安全阈值，可能造成地下水污染风险',
        threshold: 50,
        currentValue: 68.5,
        status: 'pending',
        reviewedBy: null,
        reviewerName: null,
        reviewNote: null,
        createdAt: new Date(base + 3600000).toISOString(),
      },
      {
        id: 'a3',
        simulationId: 's3',
        simulationName: '黄淮海小麦-节水方案A',
        level: 1,
        type: 'water_deficit',
        message: '土壤含水量接近下限，建议关注作物长势',
        threshold: 15,
        currentValue: 14.2,
        status: 'reviewed',
        reviewedBy: 'u1',
        reviewerName: '张农艺师',
        reviewNote: '已复核，建议增加30mm灌溉量',
        createdAt: new Date(base + 86400000).toISOString(),
      },
      {
        id: 'a4',
        simulationId: 's4',
        simulationName: '长江水稻-氮肥梯度试验-T3',
        level: 2,
        type: 'nitrogen_leaching',
        message: '分蘖期氮素淋失偏高，需调整施肥方案',
        threshold: 45,
        currentValue: 52.3,
        status: 'adjusted',
        reviewedBy: 'u2',
        reviewerName: '李专家',
        reviewNote: '通过复核，已生成调整方案',
        createdAt: new Date(base + 86400000 * 2).toISOString(),
      },
      {
        id: 'a5',
        simulationId: 's5',
        simulationName: '西北旱区玉米-覆膜方案',
        level: 3,
        type: 'water_deficit',
        message: '严重水分亏缺，如不及时灌溉可能导致绝收',
        threshold: 10,
        currentValue: 7.5,
        status: 'dismissed',
        reviewedBy: 'u1',
        reviewerName: '张农艺师',
        reviewNote: '该区域为雨养农业区，属于正常情况',
        createdAt: new Date(base + 86400000 * 3).toISOString(),
      },
      {
        id: 'a6',
        simulationId: 's6',
        simulationName: '江淮棉花-有机替代试验',
        level: 1,
        type: 'nitrogen_leaching',
        message: '氮素淋失略高于阈值，需持续观察',
        threshold: 40,
        currentValue: 41.8,
        status: 'pending',
        reviewedBy: null,
        reviewerName: null,
        reviewNote: null,
        createdAt: new Date(base + 86400000 * 4).toISOString(),
      },
    ];
  }

  function mockApprovals(): Approval[] {
    const base = new Date('2024-06-01T08:00:00').getTime();
    return [
      {
        id: 'ap1',
        simulationId: 's1',
        simulationName: '华北夏玉米-郑单958-高水高肥',
        varietyName: '郑单958',
        level: 1,
        status: 'pending',
        reviewerId: null,
        reviewerName: null,
        comment: null,
        createdAt: new Date(base).toISOString(),
        reviewedAt: null,
      },
      {
        id: 'ap2',
        simulationId: 's2',
        simulationName: '东北大豆-中黄37-常规管理',
        varietyName: '中黄37',
        level: 2,
        status: 'pending',
        reviewerId: null,
        reviewerName: null,
        comment: null,
        createdAt: new Date(base + 3600000).toISOString(),
        reviewedAt: null,
      },
      {
        id: 'ap3',
        simulationId: 's3',
        simulationName: '黄淮海小麦-节水方案A',
        varietyName: '农大108',
        level: 1,
        status: 'approved',
        reviewerId: 'u1',
        reviewerName: '张农艺师',
        comment: '方案合理，同意实施',
        createdAt: new Date(base + 86400000).toISOString(),
        reviewedAt: new Date(base + 86400000 + 3600000).toISOString(),
      },
      {
        id: 'ap4',
        simulationId: 's4',
        simulationName: '长江水稻-氮肥梯度试验-T3',
        varietyName: '先玉335',
        level: 2,
        status: 'rejected',
        reviewerId: 'u2',
        reviewerName: '李专家',
        comment: '施肥量过大，建议重新测算',
        createdAt: new Date(base + 86400000 * 2).toISOString(),
        reviewedAt: new Date(base + 86400000 * 2 + 7200000).toISOString(),
      },
      {
        id: 'ap5',
        simulationId: 's5',
        simulationName: '西北旱区玉米-覆膜方案',
        varietyName: '郑单958',
        level: 1,
        status: 'approved',
        reviewerId: 'u1',
        reviewerName: '张农艺师',
        comment: '覆膜方案可行，节水效果明显',
        createdAt: new Date(base + 86400000 * 3).toISOString(),
        reviewedAt: new Date(base + 86400000 * 3 + 5400000).toISOString(),
      },
    ];
  }

  function mockAdjustmentLogs(): AdjustmentLog[] {
    const base = new Date('2024-06-01T08:00:00').getTime();
    return [
      {
        id: 'log1',
        alertId: 'a4',
        previousIrrigation: 3000,
        newIrrigation: 2500,
        previousFertilizer: 450,
        newFertilizer: 380,
        reason: '减少氮肥施用量，降低淋失风险；优化灌溉时机',
        adjustedBy: 'u2',
        adjustedByName: '李专家',
        adjustedAt: new Date(base + 86400000 * 2 + 3600000).toISOString(),
      },
    ];
  }

  const filteredAlerts = useMemo(() => {
    let list = [...alerts];
    if (levelFilter !== 'all') {
      list = list.filter((a) => a.level === levelFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.simulationName?.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const t1 = new Date(a.createdAt).getTime();
      const t2 = new Date(b.createdAt).getTime();
      return t2 - t1;
    });
    return list;
  }, [alerts, levelFilter, statusFilter, searchText]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => a.level === approvalSubTab);
  }, [approvals, approvalSubTab]);

  const selectedAlertLogs = useMemo(() => {
    if (!selectedAlert) return [];
    return adjustmentLogs.filter((log) => log.alertId === selectedAlert.id);
  }, [selectedAlert, adjustmentLogs]);

  function handleSelectAlert(alert: Alert) {
    setSelectedAlert(alert);
    setReviewNote(alert.reviewNote || '');
    setShowAdjustmentPreview(alert.status === 'adjusted');
  }

  async function handleReview(action: 'approve' | 'reject') {
    if (!selectedAlert) return;
    try {
      setReviewSubmitting(true);
      const approved = action === 'approve';
      const res = await fetch(`/api/alerts/${selectedAlert.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          note: reviewNote,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          updateAlertLocally(selectedAlert.id, json.data);
          if (approved) {
            setShowAdjustmentPreview(true);
          } else {
            setShowAdjustmentPreview(false);
          }
        } else {
          mockUpdateAlert(selectedAlert.id, action);
        }
      } else {
        mockUpdateAlert(selectedAlert.id, action);
      }
      await Promise.all([refreshAlerts(), refreshAdjustmentLogs()]);
    } catch {
      mockUpdateAlert(selectedAlert.id, action);
    } finally {
      setReviewSubmitting(false);
    }
  }

  function mockUpdateAlert(id: string, action: 'approve' | 'reject') {
    const newStatus: AlertStatus = action === 'approve' ? 'adjusted' : 'dismissed';
    const updated: Alert = {
      ...selectedAlert!,
      status: newStatus,
      reviewedBy: 'u1',
      reviewerName: '当前用户',
      reviewNote: reviewNote,
    };
    updateAlertLocally(id, updated);
    if (action === 'approve') {
      setShowAdjustmentPreview(true);
    } else {
      setShowAdjustmentPreview(false);
    }
  }

  function updateAlertLocally(id: string, data: Alert) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? data : a)));
    setSelectedAlert(data);
  }

  async function handleApproval(action: 'approve' | 'reject') {
    if (!selectedApproval) return;
    try {
      setApprovalSubmitting(true);
      const res = await fetch(`/api/approvals/${selectedApproval.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: action === 'approve',
          comment: approvalComment,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          updateApprovalLocally(selectedApproval.id, json.data);
        } else {
          mockUpdateApproval(selectedApproval.id, action);
        }
      } else {
        mockUpdateApproval(selectedApproval.id, action);
      }
      await refreshApprovals();
    } catch {
      mockUpdateApproval(selectedApproval.id, action);
    } finally {
      setApprovalSubmitting(false);
    }
  }

  function mockUpdateApproval(id: string, action: 'approve' | 'reject') {
    const newStatus: ApprovalStatus = action === 'approve' ? 'approved' : 'rejected';
    const updated: Approval = {
      ...selectedApproval!,
      status: newStatus,
      reviewerId: 'u1',
      reviewerName: '当前用户',
      comment: approvalComment,
      reviewedAt: new Date().toISOString(),
    };
    updateApprovalLocally(id, updated);
  }

  function updateApprovalLocally(id: string, data: Approval) {
    setApprovals((prev) => prev.map((a) => (a.id === id ? data : a)));
    setSelectedApproval(data);
  }

  const adjustmentPreview = useMemo(() => {
    if (!selectedAlert) return null;
    if (selectedAlert.type === 'water_deficit') {
      return {
        irrigation: { previous: 3000, new: 3600 },
        fertilizer: { previous: 450, new: 450 },
      };
    }
    return {
      irrigation: { previous: 3000, new: 2700 },
      fertilizer: { previous: 450, new: 380 },
    };
  }, [selectedAlert]);

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 animate-fade-in">
        <h1 className="font-serif text-2xl font-bold text-agri-800 flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-agri-700" />
          预警与审批
        </h1>
        <p className="mt-1 text-sm text-soil-500">
          处理模型预警信息，完成多级审批流程，保障农艺方案科学合理
        </p>
      </div>

      <div className="flex border-b border-soil-100 mb-6">
        <button
          className={activeTab === 'alerts' ? 'tab-active flex items-center gap-2' : 'tab-inactive flex items-center gap-2'}
          onClick={() => setActiveTab('alerts')}
        >
          <AlertTriangle className="w-4 h-4" />
          预警管理
        </button>
        <button
          className={activeTab === 'approvals' ? 'tab-active flex items-center gap-2' : 'tab-inactive flex items-center gap-2'}
          onClick={() => setActiveTab('approvals')}
        >
          <ClipboardList className="w-4 h-4" />
          审批管理
        </button>
      </div>

      {activeTab === 'alerts' && (
        <div className="animate-fade-in">
          <div className="card p-4 mb-6 animate-slide-up">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-soil-400" />
                <span className="text-sm text-soil-600 font-medium">级别：</span>
                <select
                  className="select-field w-28"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as AlertLevel | 'all')}
                >
                  <option value="all">全部</option>
                  <option value="1">一级（低）</option>
                  <option value="2">二级（中）</option>
                  <option value="3">三级（高）</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-soil-600 font-medium">状态：</span>
                <select
                  className="select-field w-28"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
                >
                  <option value="all">全部</option>
                  <option value="pending">待处理</option>
                  <option value="reviewed">已复核</option>
                  <option value="adjusted">已调整</option>
                  <option value="dismissed">已驳回</option>
                </select>
              </div>
              <div className="relative flex-1 max-w-md ml-auto">
                <Search className="w-4 h-4 text-soil-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="input-field pl-9"
                  placeholder="搜索预警标题、模拟名称..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded mb-3 w-3/4" />
                      <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))
                ) : filteredAlerts.length === 0 ? (
                  <div className="card p-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-soil-200 mx-auto mb-3" />
                    <p className="text-soil-400">暂无匹配的预警记录</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const isSelected = selectedAlert?.id === alert.id;
                    return (
                      <div
                        key={alert.id}
                        className={`card p-0 overflow-hidden cursor-pointer transition-all animate-slide-up ${
                          isSelected ? 'ring-2 ring-agri-500 shadow-agri' : ''
                        }`}
                        onClick={() => handleSelectAlert(alert)}
                      >
                        <div className="flex">
                          <div className={`w-2 ${LEVEL_BAR_COLOR[alert.level]}`} />
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-soil-800 text-sm line-clamp-2">
                                {alert.message}
                              </h3>
                              <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                isSelected ? 'text-agri-600' : 'text-soil-300'
                              }`} />
                            </div>
                            <div className="text-xs text-soil-500 mb-2">
                              {alert.simulationName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-soil-500 mb-3">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(alert.createdAt, true)}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-soil-600">
                                <span className="font-medium text-soil-800">
                                  {formatNumber(alert.currentValue)}
                                </span>
                                {' / '}
                                <span className="text-soil-500">
                                  阈值 {formatNumber(alert.threshold)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`badge ${alertLevelColor(alert.level)}`}>
                                  {alertLevelLabel(alert.level)}
                                </span>
                                <span className={`badge ${ALERT_TYPE_COLOR[alert.type]}`}>
                                  {ALERT_TYPE_LABEL[alert.type]}
                                </span>
                              </div>
                            </div>
                            {alert.status === 'pending' && (
                              <button
                                className="btn-primary w-full mt-3 text-sm py-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectAlert(alert);
                                }}
                              >
                                复核
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="col-span-2">
              {!selectedAlert ? (
                <div className="card p-12 text-center animate-fade-in">
                  <AlertTriangle className="w-16 h-16 text-soil-200 mx-auto mb-4" />
                  <h3 className="font-serif text-xl text-soil-600 mb-2">请选择预警记录</h3>
                  <p className="text-soil-400 text-sm">点击左侧预警卡片查看详细信息并进行复核操作</p>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="card p-6">
                    <h2 className="section-title !mb-4">
                      <AlertTriangle className={`w-5 h-5 ${
                        selectedAlert.level === 3 ? 'text-red-600' :
                        selectedAlert.level === 2 ? 'text-orange-600' : 'text-yellow-600'
                      }`} />
                      预警详情
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="label-text">模拟名称</label>
                        <p className="text-soil-800 font-medium">{selectedAlert.simulationName}</p>
                      </div>
                      <div>
                        <label className="label-text">预警类型</label>
                        <div className="flex items-center gap-2">
                          {selectedAlert.type === 'water_deficit' ? (
                            <Droplets className="w-4 h-4 text-sky-brand" />
                          ) : (
                            <FlaskConical className="w-4 h-4 text-amber-600" />
                          )}
                          <span className={`badge ${ALERT_TYPE_COLOR[selectedAlert.type]}`}>
                            {ALERT_TYPE_LABEL[selectedAlert.type]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="label-text">预警级别</label>
                        <span className={`badge ${alertLevelColor(selectedAlert.level)}`}>
                          {alertLevelLabel(selectedAlert.level)} 级
                        </span>
                      </div>
                      <div>
                        <label className="label-text">当前状态</label>
                        <span className={`badge ${ALERT_STATUS_COLOR[selectedAlert.status]}`}>
                          {ALERT_STATUS_LABEL[selectedAlert.status]}
                        </span>
                      </div>
                      <div>
                        <label className="label-text">阈值</label>
                        <p className="text-soil-800 font-medium">
                          {formatNumber(selectedAlert.threshold)}
                        </p>
                      </div>
                      <div>
                        <label className="label-text">当前值</label>
                        <p className={`font-bold ${
                          selectedAlert.level === 3 ? 'text-red-600' :
                          selectedAlert.level === 2 ? 'text-orange-600' : 'text-yellow-600'
                        }`}>
                          {formatNumber(selectedAlert.currentValue)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="label-text">预警描述</label>
                        <p className="text-soil-700">{selectedAlert.message}</p>
                      </div>
                      <div>
                        <label className="label-text">触发时间</label>
                        <p className="text-soil-800 font-medium">
                          {formatDate(selectedAlert.createdAt, true)}
                        </p>
                      </div>
                      {selectedAlert.reviewerName && (
                        <div>
                          <label className="label-text">复核人</label>
                          <div className="flex items-center gap-2 text-soil-800">
                            <UserCheck className="w-4 h-4 text-agri-600" />
                            <span className="font-medium">{selectedAlert.reviewerName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card p-6">
                    <h2 className="section-title !mb-4">
                      <ClipboardList className="w-5 h-5 text-agri-600" />
                      复核操作
                    </h2>
                    {selectedAlert.status === 'pending' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="label-text">复核意见</label>
                          <textarea
                            className="input-field min-h-[120px] resize-y"
                            placeholder="请输入复核意见，说明处理理由..."
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            className="btn-danger flex items-center gap-2"
                            onClick={() => handleReview('reject')}
                            disabled={reviewSubmitting}
                          >
                            {reviewSubmitting ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            驳回
                          </button>
                          <button
                            className="btn-primary flex items-center gap-2"
                            onClick={() => handleReview('approve')}
                            disabled={reviewSubmitting}
                          >
                            {reviewSubmitting ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            通过
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="label-text">复核意见</label>
                          <div className="p-4 bg-soil-50 rounded-lg text-soil-700">
                            {selectedAlert.reviewNote || '无'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-soil-500 text-sm">
                          {selectedAlert.status === 'reviewed' && (
                            <span className="badge bg-blue-100 text-blue-800">
                              <CheckSquare className="w-3.5 h-3.5 mr-1" />
                              已复核
                            </span>
                          )}
                          {selectedAlert.status === 'adjusted' && (
                            <span className="badge bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              已调整
                            </span>
                          )}
                          {selectedAlert.status === 'dismissed' && (
                            <span className="badge bg-red-100 text-red-800">
                              <XSquare className="w-3.5 h-3.5 mr-1" />
                              已驳回
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {showAdjustmentPreview && adjustmentPreview && (
                    <div className="card p-6 animate-fade-in">
                      <h2 className="section-title !mb-4">
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                        调整方案预览
                      </h2>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-5 rounded-xl bg-sky-50 border border-sky-200">
                          <div className="flex items-center gap-2 mb-4">
                            <Droplets className="w-5 h-5 text-sky-brand" />
                            <span className="font-semibold text-sky-800">灌溉量调整</span>
                          </div>
                          <div className="flex items-end justify-between mb-2">
                            <div>
                              <div className="text-xs text-sky-600 mb-1">调整前</div>
                              <div className="text-2xl font-bold text-sky-700">
                                {formatNumber(adjustmentPreview.irrigation.previous)}
                                <span className="text-sm font-normal ml-1">m³/ha</span>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-sky-400" />
                            <div className="text-right">
                              <div className="text-xs text-emerald-600 mb-1">调整后</div>
                              <div className="text-2xl font-bold text-emerald-700">
                                {formatNumber(adjustmentPreview.irrigation.new)}
                                <span className="text-sm font-normal ml-1">m³/ha</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className={`font-medium ${
                              adjustmentPreview.irrigation.new > adjustmentPreview.irrigation.previous
                                ? 'text-red-600' : 'text-emerald-600'
                            }`}>
                              {adjustmentPreview.irrigation.new > adjustmentPreview.irrigation.previous
                                ? `+${formatNumber(adjustmentPreview.irrigation.new - adjustmentPreview.irrigation.previous)}`
                                : `${formatNumber(adjustmentPreview.irrigation.new - adjustmentPreview.irrigation.previous)}`
                              }
                              {' '}
                              ({formatPercent(Math.abs(
                                (adjustmentPreview.irrigation.new - adjustmentPreview.irrigation.previous) /
                                adjustmentPreview.irrigation.previous
                              ))})
                            </span>
                          </div>
                        </div>

                        <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="flex items-center gap-2 mb-4">
                            <FlaskConical className="w-5 h-5 text-amber-600" />
                            <span className="font-semibold text-amber-800">施肥量调整</span>
                          </div>
                          <div className="flex items-end justify-between mb-2">
                            <div>
                              <div className="text-xs text-amber-600 mb-1">调整前</div>
                              <div className="text-2xl font-bold text-amber-700">
                                {formatNumber(adjustmentPreview.fertilizer.previous)}
                                <span className="text-sm font-normal ml-1">kg/ha</span>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-amber-400" />
                            <div className="text-right">
                              <div className="text-xs text-emerald-600 mb-1">调整后</div>
                              <div className="text-2xl font-bold text-emerald-700">
                                {formatNumber(adjustmentPreview.fertilizer.new)}
                                <span className="text-sm font-normal ml-1">kg/ha</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className={`font-medium ${
                              adjustmentPreview.fertilizer.new > adjustmentPreview.fertilizer.previous
                                ? 'text-red-600' : 'text-emerald-600'
                            }`}>
                              {adjustmentPreview.fertilizer.new > adjustmentPreview.fertilizer.previous
                                ? `+${formatNumber(adjustmentPreview.fertilizer.new - adjustmentPreview.fertilizer.previous)}`
                                : `${formatNumber(adjustmentPreview.fertilizer.new - adjustmentPreview.fertilizer.previous)}`
                              }
                              {' '}
                              ({formatPercent(Math.abs(
                                (adjustmentPreview.fertilizer.new - adjustmentPreview.fertilizer.previous) /
                                adjustmentPreview.fertilizer.previous
                              ))})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAlert.status !== 'dismissed' && selectedAlertLogs.length > 0 && (
                    <div className="card p-6 animate-fade-in">
                      <h2 className="section-title !mb-4">
                        <Clock className="w-5 h-5 text-soil-600" />
                        调整日志
                      </h2>
                      <div className="space-y-4">
                        {selectedAlertLogs.map((log) => (
                          <div key={log.id} className="p-4 bg-soil-50 rounded-xl border border-soil-100">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <div className="text-xs text-soil-500 mb-1">灌溉量变化</div>
                                <div className="text-sm">
                                  <span className="text-soil-700">
                                    {formatNumber(log.previousIrrigation)}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 inline mx-1 text-soil-400" />
                                  <span className="font-semibold text-soil-800">
                                    {formatNumber(log.newIrrigation)} m³/ha
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-soil-500 mb-1">施肥量变化</div>
                                <div className="text-sm">
                                  <span className="text-soil-700">
                                    {formatNumber(log.previousFertilizer)}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 inline mx-1 text-soil-400" />
                                  <span className="font-semibold text-soil-800">
                                    {formatNumber(log.newFertilizer)} kg/ha
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mb-3">
                              <div className="text-xs text-soil-500 mb-1">调整原因</div>
                              <div className="text-sm text-soil-700">{log.reason}</div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-soil-500">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-agri-600" />
                                <span>{log.adjustedByName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{formatDate(log.adjustedAt, true)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="animate-fade-in">
          <div className="flex border-b border-soil-100 mb-6">
            <button
              className={approvalSubTab === 1 ? 'tab-active flex items-center gap-2' : 'tab-inactive flex items-center gap-2'}
              onClick={() => {
                setApprovalSubTab(1);
                setSelectedApproval(null);
                setApprovalComment('');
              }}
            >
              <UserCheck className="w-4 h-4" />
              一级审批（农艺师）
              <span className="ml-2 text-xs bg-soil-100 text-soil-600 px-2 py-0.5 rounded-full">
                {filteredApprovals.filter(a => a.status === 'pending').length} 待办
              </span>
            </button>
            <button
              className={approvalSubTab === 2 ? 'tab-active flex items-center gap-2' : 'tab-inactive flex items-center gap-2'}
              onClick={() => {
                setApprovalSubTab(2);
                setSelectedApproval(null);
                setApprovalComment('');
              }}
            >
              <CheckCircle className="w-4 h-4" />
              二级审批（专家）
              <span className="ml-2 text-xs bg-soil-100 text-soil-600 px-2 py-0.5 rounded-full">
                {filteredApprovals.filter(a => a.status === 'pending').length} 待办
              </span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded mb-3 w-3/4" />
                      <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))
                ) : filteredApprovals.length === 0 ? (
                  <div className="card p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-soil-200 mx-auto mb-3" />
                    <p className="text-soil-400">暂无审批记录</p>
                  </div>
                ) : (
                  filteredApprovals.map((approval) => {
                    const isSelected = selectedApproval?.id === approval.id;
                    return (
                      <div
                        key={approval.id}
                        className={`card p-4 cursor-pointer transition-all animate-slide-up ${
                          isSelected ? 'ring-2 ring-agri-500 shadow-agri' : ''
                        }`}
                        onClick={() => {
                          setSelectedApproval(approval);
                          setApprovalComment(approval.comment || '');
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-soil-800 text-sm line-clamp-2">
                            {approval.simulationName}
                          </h3>
                          <span className={`badge flex-shrink-0 ml-2 ${
                            approval.level === 1 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            L{approval.level}
                          </span>
                        </div>
                        <div className="text-xs text-soil-500 mb-3">
                          品种：{approval.varietyName}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-soil-500">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(approval.createdAt, true)}
                          </div>
                          <span className={`badge ${APPROVAL_STATUS_COLOR[approval.status]}`}>
                            {APPROVAL_STATUS_LABEL[approval.status]}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="col-span-2">
              {!selectedApproval ? (
                <div className="card p-12 text-center animate-fade-in">
                  <ClipboardList className="w-16 h-16 text-soil-200 mx-auto mb-4" />
                  <h3 className="font-serif text-xl text-soil-600 mb-2">请选择审批记录</h3>
                  <p className="text-soil-400 text-sm">点击左侧审批卡片查看详细信息并进行审批操作</p>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="card p-6">
                    <h2 className="section-title !mb-4">
                      <ClipboardList className="w-5 h-5 text-agri-600" />
                      审批详情
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="label-text">模拟名称</label>
                        <p className="text-soil-800 font-medium">{selectedApproval.simulationName}</p>
                      </div>
                      <div>
                        <label className="label-text">品种</label>
                        <p className="text-soil-800 font-medium">{selectedApproval.varietyName}</p>
                      </div>
                      <div>
                        <label className="label-text">审批级别</label>
                        <span className={`badge ${
                          selectedApproval.level === 1 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          L{selectedApproval.level} - {selectedApproval.level === 1 ? '农艺师审批' : '专家审批'}
                        </span>
                      </div>
                      <div>
                        <label className="label-text">当前状态</label>
                        <span className={`badge ${APPROVAL_STATUS_COLOR[selectedApproval.status]}`}>
                          {APPROVAL_STATUS_LABEL[selectedApproval.status]}
                        </span>
                      </div>
                      <div>
                        <label className="label-text">创建时间</label>
                        <p className="text-soil-800 font-medium">
                          {formatDate(selectedApproval.createdAt, true)}
                        </p>
                      </div>
                      {selectedApproval.reviewedAt && (
                        <div>
                          <label className="label-text">审批时间</label>
                          <p className="text-soil-800 font-medium">
                            {formatDate(selectedApproval.reviewedAt, true)}
                          </p>
                        </div>
                      )}
                      {selectedApproval.reviewerName && (
                        <div className="col-span-2">
                          <label className="label-text">审批人</label>
                          <div className="flex items-center gap-2 text-soil-800">
                            <UserCheck className="w-4 h-4 text-agri-600" />
                            <span className="font-medium">{selectedApproval.reviewerName}</span>
                          </div>
                        </div>
                      )}
                      {selectedApproval.comment && (
                        <div className="col-span-2">
                          <label className="label-text">审批意见</label>
                          <div className="p-4 bg-soil-50 rounded-lg text-soil-700">
                            {selectedApproval.comment}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedApproval.status === 'pending' ? (
                    <div className="card p-6">
                      <h2 className="section-title !mb-4">
                        <CheckSquare className="w-5 h-5 text-agri-600" />
                        审批操作
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="label-text">审批意见</label>
                          <textarea
                            className="input-field min-h-[120px] resize-y"
                            placeholder="请输入审批意见..."
                            value={approvalComment}
                            onChange={(e) => setApprovalComment(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            className="btn-danger flex items-center gap-2"
                            onClick={() => handleApproval('reject')}
                            disabled={approvalSubmitting}
                          >
                            {approvalSubmitting ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <XSquare className="w-4 h-4" />
                            )}
                            驳回
                          </button>
                          <button
                            className="btn-primary flex items-center gap-2"
                            onClick={() => handleApproval('approve')}
                            disabled={approvalSubmitting}
                          >
                            {approvalSubmitting ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckSquare className="w-4 h-4" />
                            )}
                            通过
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="card p-6">
                      <div className="flex items-center gap-3">
                        {selectedApproval.status === 'approved' ? (
                          <>
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                            <div>
                              <h3 className="font-serif text-lg font-semibold text-emerald-800">
                                已通过
                              </h3>
                              <p className="text-sm text-soil-500">
                                审批已完成，方案可以执行
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-8 h-8 text-red-600" />
                            <div>
                              <h3 className="font-serif text-lg font-semibold text-red-800">
                                已驳回
                              </h3>
                              <p className="text-sm text-soil-500">
                                审批未通过，请根据意见修改后重新提交
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
