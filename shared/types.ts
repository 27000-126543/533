export type UserRole = 'agronomist' | 'expert' | 'chief_scientist' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export type SimulationStatus =
  | 'pending_validation'
  | 'parsing'
  | 'initializing'
  | 'crop_growth'
  | 'soil_process'
  | 'nitrogen_cycle'
  | 'completed'
  | 'error_rollback';

export interface SoilParams {
  organicMatter: number;
  totalNitrogen: number;
  phValue: number;
  bulkDensity: number;
  fieldCapacity: number;
  wiltingPoint: number;
  initialMoisture: number;
  initialMineralN: number;
}

export interface WeatherRecord {
  date: string;
  tempMax: number;
  tempMin: number;
  radiation: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

export interface FertilizerApplication {
  date: string;
  type: string;
  amount: number;
  method: string;
}

export interface FertilizerPlan {
  applications: FertilizerApplication[];
}

export interface DataPoint {
  time: string;
  value: number;
}

export interface SimulationTask {
  id: string;
  name: string;
  status: SimulationStatus;
  varietyId: string;
  varietyName?: string;
  createdBy: string;
  creatorName?: string;
  progress: number;
  yieldPrediction: number | null;
  soilParams: SoilParams;
  weatherData: WeatherRecord[];
  fertilizerPlan: FertilizerPlan;
  laiSeries: DataPoint[] | null;
  soilMoistureSeries: DataPoint[] | null;
  mineralNitrogenSeries: DataPoint[] | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertType = 'water_deficit' | 'nitrogen_leaching';
export type AlertStatus = 'pending' | 'reviewed' | 'adjusted' | 'dismissed';
export type AlertLevel = 1 | 2 | 3;

export interface Alert {
  id: string;
  simulationId: string;
  simulationName?: string;
  level: AlertLevel;
  type: AlertType;
  message: string;
  threshold: number;
  currentValue: number;
  status: AlertStatus;
  reviewedBy: string | null;
  reviewerName?: string;
  reviewNote: string | null;
  createdAt: string;
}

export interface AdjustmentLog {
  id: string;
  alertId: string;
  previousIrrigation: number;
  newIrrigation: number;
  previousFertilizer: number;
  newFertilizer: number;
  reason: string;
  adjustedBy: string;
  adjustedByName?: string;
  adjustedAt: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  simulationId: string;
  simulationName?: string;
  varietyName?: string;
  level: 1 | 2;
  status: ApprovalStatus;
  reviewerId: string | null;
  reviewerName: string | null;
  comment: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface NitrogenBalance {
  input: number;
  uptake: number;
  leaching: number;
  volatilization: number;
  residue: number;
}

export interface CarbonFootprint {
  totalEmission: number;
  perUnitYield: number;
  fertilizerEmission: number;
  irrigationEmission: number;
  soilEmission: number;
}

export interface BiomassDataPoint {
  stage: string;
  leaf: number;
  stem: number;
  root: number;
  grain: number;
}

export interface Report {
  id: string;
  simulationId: string;
  simulationName?: string;
  varietyName: string;
  laiSeries: DataPoint[];
  biomassDistribution: BiomassDataPoint[];
  yieldContour: number[][];
  nitrogenBalance: NitrogenBalance;
  carbonFootprint: CarbonFootprint;
  wue: number;
  nue: number;
  finalYield: number;
  pdfUrl: string | null;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  varietyId: string;
  varietyName: string;
  strategy: FertilizerPlan;
  expectedYield: number;
  expectedWUE: number;
  expectedNUE: number;
  confidence: number;
  basedOnSimulations: string[];
}

export interface Variety {
  id: string;
  name: string;
  type: string;
  isSuspended: boolean;
  consecutiveDeviations: number;
  lastYieldDeviation: number | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

export interface YieldTrend {
  varietyId: string;
  varietyName: string;
  data: DataPoint[];
  isSuspended: boolean;
  consecutiveDeviations: number;
}

export interface DailyStats {
  date: string;
  completionRate: number;
  avgWUE: number;
  avgNUE: number;
  activeAlerts: number;
  yieldTrends: YieldTrend[];
}

export interface DashboardData {
  todayStats: {
    completionRate: number;
    avgWUE: number;
    avgNUE: number;
    activeAlerts: number;
    totalSimulations: number;
    pendingApprovals: number;
  };
  yieldTrends: YieldTrend[];
  radarData: Array<{
    metric: string;
    current: number;
    target: number;
  }>;
  suspendedVarieties: Variety[];
  recentSimulations: SimulationTask[];
}
