export interface SelectOption {
  value: string;
  label: string;
}

export interface FilterState {
  search: string;
  category: string;
  status: string;
  team: string;
  featured: string;
  pinned: string;
  country: string;
  year: string;
  archived: string;
  brand: string;
  subcategory: string;
  stockStatus: string;
  fromDate: string;
  toDate: string;
  minPrice: number | null;
  maxPrice: number | null;
  minStock: number | null;
  maxStock: number | null;
  minProgress: number | null;
  maxProgress: number | null;
}

export const EMPTY_FILTER: FilterState = {
  search: '', category: '', status: '', team: '',
  featured: '', pinned: '', country: '', year: '', archived: '',
  brand: '', subcategory: '', stockStatus: '',
  fromDate: '', toDate: '',
  minPrice: null, maxPrice: null,
  minStock: null, maxStock: null,
  minProgress: null, maxProgress: null,
};
