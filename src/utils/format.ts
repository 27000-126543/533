import type { SimulationStatus, AlertLevel, UserRole } from '@@/shared/types';

export function formatNumber(value: number | null | undefined, digits: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number | null | undefined, digits: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(value: string | Date | null | undefined, withTime: boolean = false): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (!withTime) return `${year}-${month}-${day}`;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

const statusLabelMap: Record<SimulationStatus, string> = {
  pending_validation: '待验证',
  parsing: '解析中',
  initializing: '初始化',
  crop_growth: '作物生长模拟',
  soil_process: '土壤过程模拟',
  nitrogen_cycle: '氮循环模拟',
  completed: '已完成',
  error_rollback: '错误回滚',
};

export function statusLabel(status: SimulationStatus): string {
  return statusLabelMap[status] || status;
}

const statusColorMap: Record<SimulationStatus, string> = {
  pending_validation: 'bg-yellow-100 text-yellow-800',
  parsing: 'bg-blue-100 text-blue-800',
  initializing: 'bg-blue-100 text-blue-800',
  crop_growth: 'bg-green-100 text-green-800',
  soil_process: 'bg-amber-100 text-amber-800',
  nitrogen_cycle: 'bg-cyan-100 text-cyan-800',
  completed: 'bg-emerald-100 text-emerald-800',
  error_rollback: 'bg-red-100 text-red-800',
};

export function statusColor(status: SimulationStatus): string {
  return statusColorMap[status] || 'bg-gray-100 text-gray-800';
}

const alertLevelLabelMap: Record<AlertLevel, string> = {
  1: '低',
  2: '中',
  3: '高',
};

export function alertLevelLabel(level: AlertLevel): string {
  return alertLevelLabelMap[level] || String(level);
}

const alertLevelColorMap: Record<AlertLevel, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-red-100 text-red-800',
};

export function alertLevelColor(level: AlertLevel): string {
  return alertLevelColorMap[level] || 'bg-gray-100 text-gray-800';
}

const roleLabelMap: Record<UserRole, string> = {
  agronomist: '农学家',
  expert: '领域专家',
  chief_scientist: '首席科学家',
  admin: '系统管理员',
};

export function roleLabel(role: UserRole): string {
  return roleLabelMap[role] || role;
}
