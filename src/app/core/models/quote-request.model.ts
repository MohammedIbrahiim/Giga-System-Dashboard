export type QuoteStatus = 'NEW' | 'REVIEWED' | 'CONTACTED' | 'CLOSED';

export type QuoteCategory = 'waterQuality' | 'flowMeasurement' | 'levelMeasurement';

export interface WaterQualityDetails {
  waterType?: string;
  application?: string;
  parameters?: string[];
  controllerTransmitter?: string;
  additionalInfo?: string;
}

export interface FlowMeasurementDetails {
  waterType?: string;
  measurementType?: string;
  fmFeatures?: string[];
  additionalInfo?: string;
}

export interface LevelMeasurementDetails {
  waterType?: string;
  transmitterType?: string;
  pumpControllerRequired?: string;
  position?: string;
  depthUpTo?: string;
  additionalInfo?: string;
}

export interface QuoteRequestTechnical {
  selectedCategory: QuoteCategory;
  waterQuality?: WaterQualityDetails | null;
  flowMeasurement?: FlowMeasurementDetails | null;
  levelMeasurement?: LevelMeasurementDetails | null;
}

export interface QuoteRequest {
  id: number;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  selectedCategory: string;
  status: QuoteStatus;
  technical?: QuoteRequestTechnical | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface QuoteRequestStats {
  total: number;
  newCount: number;
  reviewed: number;
  contacted: number;
  closed: number;
}

export interface QuoteRequestQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: string;
  category?: string;
}

export const QUOTE_STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'NEW',       label: 'New' },
  { value: 'REVIEWED',  label: 'Reviewed' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CLOSED',    label: 'Closed' },
];

export const QUOTE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'waterQuality',     label: 'Water Quality' },
  { value: 'flowMeasurement',  label: 'Flow Measurement' },
  { value: 'levelMeasurement', label: 'Level Measurement' },
];

export const CATEGORY_LABEL: Record<string, string> = {
  waterQuality:     'Water Quality',
  flowMeasurement:  'Flow Measurement',
  levelMeasurement: 'Level Measurement',
};
