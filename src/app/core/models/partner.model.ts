export interface Partner {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  logoBase64?: string | null;
  imageBase64?: string | null;
  active: boolean;
  sortOrder: number;
  whatWeOffer?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartnerRequest {
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  logoBase64?: string | null;
  imageBase64?: string | null;
  active: boolean;
  sortOrder: number;
  whatWeOffer?: string[];
}

export interface PartnerQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}

export interface PartnerDialogData {
  mode: 'add' | 'edit';
  partner?: Partner;
}

export const PARTNER_STATUS_OPTIONS: { value: boolean; label: string }[] = [
  { value: true,  label: 'Active' },
  { value: false, label: 'Inactive' },
];
