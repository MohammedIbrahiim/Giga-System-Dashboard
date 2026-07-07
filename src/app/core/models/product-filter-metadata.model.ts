export interface FilterMetaOption {
  id?: number;
  label: string;
  value: string;
}

export interface FilterChip {
  groupKey: string;
  groupTitle: string;
  value: string;
  label: string;
}

export type ProductFilterGroupKey =
  | 'mainCategory'
  | 'application'
  | 'parameter'
  | 'communication'
  | 'installation'
  | 'power'
  | 'environment'
  | 'outputSignal'
  | 'compliance';

export interface ProductFilterGroup {
  key: ProductFilterGroupKey;
  title: string;
  type: 'checkbox';
  options: FilterMetaOption[];
}

export interface ProductFilterMetadata {
  groups: ProductFilterGroup[];
  mainCategoryGroup?: ProductFilterGroup;
  subcategories: Record<string, FilterMetaOption[]>;
}

// Explicit mapping: backend metadata group key → product form control name
export const FILTER_KEY_TO_CONTROL: Record<ProductFilterGroupKey, string> = {
  mainCategory:  'mainCategory',
  application:   'applications',
  parameter:     'parameters',
  communication: 'communications',
  installation:  'installations',
  power:         'powers',
  environment:   'environments',
  outputSignal:  'outputSignals',
  compliance:    'compliances',
};
