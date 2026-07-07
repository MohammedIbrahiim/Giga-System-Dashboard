export type ProjectCategory =
  | 'WATER_QUALITY_MONITORING'
  | 'MARINE_INSTRUMENTATION'
  | 'METEOROLOGICAL_STATIONS'
  | 'WATER_QUANTITY_AND_DISCHARGE'
  | 'SURVEY_AND_BATHYMETRY'
  | 'LABORATORY';

export type ProjectStatus =
  | 'ONGOING'
  | 'COMPLETED'
  | 'UPCOMING';

export type ProjectServiceType =
  | 'INSTALLATION'
  | 'COMMISSIONING'
  | 'CALIBRATION'
  | 'TRAINING'
  | 'MAINTENANCE';

export interface ProjectImage {
  id?: number;
  imageBase64: string;
  imageOrder?: number;
}

export interface ProjectDocument {
  id?: number;
  fileName: string;
  fileBase64: string;
  fileType: string;
  fileOrder?: number;
}

export interface ProjectProduct {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  projectTitle: string;
  projectCode: string;
  clientName: string;
  projectLocation?: string | null;
  country: string;
  city: string;
  category: ProjectCategory;
  status: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  shortSummary: string;
  detailedDescription?: string | null;
  scopeOfWork?: string | null;
  productsUsed?: ProjectProduct[];
  servicesProvided?: ProjectServiceType[];
  projectImages?: ProjectImage[];
  projectDocuments?: ProjectDocument[];
  videoUrl?: string | null;
  clientLogoBase64?: string | null;
  featured: boolean | null;
  archived: boolean | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectRequest {
  projectTitle: string;
  projectCode: string;
  clientName: string;
  projectLocation?: string | null;
  country: string;
  city: string;
  category: ProjectCategory;
  status: ProjectStatus;
  startDate: string;
  endDate?: string | null;
  shortSummary: string;
  detailedDescription?: string | null;
  scopeOfWork?: string | null;
  productIds?: number[];
  servicesProvided?: ProjectServiceType[];
  projectImagesBase64?: string[];
  projectDocuments?: ProjectDocument[];
  videoUrl?: string | null;
  clientLogoBase64?: string | null;
  featured: boolean;
  archived: boolean;
  sortOrder: number;
}

export interface ProjectQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  category?: string;
  country?: string;
  status?: string;
  year?: number;
  featured?: boolean;
  archived?: boolean;
}

export interface ProjectDialogData {
  mode: 'add' | 'edit';
  project?: Project;
}

export const CATEGORY_OPTIONS: { value: ProjectCategory; label: string }[] = [
  { value: 'WATER_QUALITY_MONITORING',     label: 'Water Quality Monitoring' },
  { value: 'MARINE_INSTRUMENTATION',       label: 'Marine Instrumentation' },
  { value: 'METEOROLOGICAL_STATIONS',      label: 'Meteorological Stations' },
  { value: 'WATER_QUANTITY_AND_DISCHARGE', label: 'Water Quantity and Discharge' },
  { value: 'SURVEY_AND_BATHYMETRY',        label: 'Survey and Bathymetry' },
  { value: 'LABORATORY',                   label: 'Laboratory' },
];

export const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'ONGOING',   label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'UPCOMING',  label: 'Upcoming' },
];

export const SERVICE_OPTIONS: { value: ProjectServiceType; label: string }[] = [
  { value: 'INSTALLATION',  label: 'Installation' },
  { value: 'COMMISSIONING', label: 'Commissioning' },
  { value: 'CALIBRATION',   label: 'Calibration' },
  { value: 'TRAINING',      label: 'Training' },
  { value: 'MAINTENANCE',   label: 'Maintenance' },
];

export const CATEGORY_LABEL_MAP: Record<ProjectCategory, string> = {
  WATER_QUALITY_MONITORING:     'Water Quality Monitoring',
  MARINE_INSTRUMENTATION:       'Marine Instrumentation',
  METEOROLOGICAL_STATIONS:      'Meteorological Stations',
  WATER_QUANTITY_AND_DISCHARGE: 'Water Quantity and Discharge',
  SURVEY_AND_BATHYMETRY:        'Survey and Bathymetry',
  LABORATORY:                   'Laboratory',
};

export const STATUS_LABEL_MAP: Record<ProjectStatus, string> = {
  ONGOING:   'Ongoing',
  COMPLETED: 'Completed',
  UPCOMING:  'Upcoming',
};
