import { ProductFilterValue } from './product-filter.model';

export type StockStatus =
  | 'IN_STOCK'
  | 'ON_REQUEST'
  | 'OUT_OF_STOCK';

export interface PartnerOption {
  id: number;
  name: string;
  slug: string;
  logoBase64?: string | null;
  active: boolean;
}

export interface ProductImage {
  id?: number;
  imageBase64: string;
  imageOrder?: number;
}

export interface ProductSpecification {
  id?: number;
  parameterName: string;
  value: string;
  unit?: string | null;
  specOrder?: number;
}

export interface RelatedProduct {
  id: number;
  productName: string;
  sku: string;
}

export interface Product {
  id: number;
  productName: string;
  sku: string;
  modelNumber?: string | null;
  brandId?: number | null;
  brandName?: string | null;
  brandLogoBase64?: string | null;
  // legacy single-category fields (still returned by backend for list display)
  category?: ProductFilterValue | null;
  subCategory?: ProductFilterValue | null;
  shortDescription: string;
  detailedDescription?: string | null;
  mainImageBase64?: string | null;
  galleryImages?: ProductImage[];
  datasheetPdfBase64?: string | null;
  datasheetFileName?: string | null;
  manualPdfBase64?: string | null;
  manualFileName?: string | null;
  technicalSpecifications?: ProductSpecification[];
  // filter metadata arrays
  mainCategories?: string[] | null;
  subCategories?: string[] | null;
  applications?: string[] | null;
  parameters?: string[] | null;
  communications?: string[] | null;
  installations?: string[] | null;
  powers?: string[] | null;
  environments?: string[] | null;
  outputSignals?: string[] | null;
  compliances?: string[] | null;
  rank?: number | null;
  // legacy chip text fields
  features?: string | null;
  certifications?: string | null;
  accessories?: string | null;
  relatedProducts?: RelatedProduct[];
  stockStatus: StockStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRequest {
  productName: string;
  sku: string;
  modelNumber?: string | null;
  brandId: number;
  categoryId: number | null;
  shortDescription: string;
  detailedDescription?: string | null;
  mainImageBase64?: string | null;
  galleryImagesBase64?: string[];
  datasheetPdfBase64?: string | null;
  datasheetFileName?: string | null;
  manualPdfBase64?: string | null;
  manualFileName?: string | null;
  technicalSpecifications?: ProductSpecification[];
  // filter metadata arrays — send numeric IDs (Long) to backend
  mainCategories: string[];   // slug value (backend still accepts string here)
  subCategories: number[];
  applications: number[];
  parameters: number[];
  communications: number[];
  installations: number[];
  powers: number[];
  environments: number[];
  outputSignals: number[];
  compliances: number[];
  rank?: number | null;
  // legacy chip text fields
  features?: string | null;
  certifications?: string | null;
  accessories?: string | null;
  relatedProductIds?: number[];
  stockStatus: StockStatus;
}

export interface ProductQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  categoryId?: number;
  brand?: string;
  subCategoryId?: number;
  stockStatus?: string;
  // dynamic filter metadata keys (comma-separated values)
  mainCategory?: string;
  application?: string;
  parameter?: string;
  communication?: string;
  installation?: string;
  power?: string;
  environment?: string;
  outputSignal?: string;
  compliance?: string;
}

export interface ProductDialogData {
  mode: 'add' | 'edit';
  product?: Product;
}

export const STOCK_STATUS_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'IN_STOCK',     label: 'In Stock' },
  { value: 'ON_REQUEST',   label: 'On Request' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
];

export const STOCK_LABEL_MAP: Record<StockStatus, string> = {
  IN_STOCK:     'In Stock',
  ON_REQUEST:   'On Request',
  OUT_OF_STOCK: 'Out of Stock',
};
