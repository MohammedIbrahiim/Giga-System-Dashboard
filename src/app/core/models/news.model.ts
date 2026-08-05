export type NewsCategory = 'NEWS' | 'ARTICLE';

export type NewsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  author: string;
  publishDate: string;
  expiryDate?: string | null;
  category: NewsCategory;
  status: NewsStatus;
  featured: boolean | null;
  pinned: boolean | null;
  tags?: string;
  coverImageBase64?: string | null;
  images?: NewsArticleImage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NewsArticleImage {
  id?: number;
  imageBase64: string;
  imageOrder?: number;
}

export interface NewsArticleRequest {
  title: string;
  content: string;
  author: string;
  publishDate: string;
  category: NewsCategory;
  status: NewsStatus;
  featured: boolean;
  pinned: boolean;
  coverImageBase64?: string | null;
  imagesBase64?: string[];
}

export interface NewsQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  fromDate?: string;
  toDate?: string;
  category?: string;
  status?: string;
  featured?: boolean;
  pinned?: boolean;
}

export const CATEGORY_OPTIONS: { value: NewsCategory; label: string }[] = [
  { value: 'NEWS',    label: 'News' },
  { value: 'ARTICLE', label: 'Article' },
];

export const STATUS_OPTIONS: { value: NewsStatus; label: string }[] = [
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED',  label: 'Archived' },
];

export const CATEGORY_LABEL_MAP: Record<NewsCategory, string> = {
  NEWS:    'News',
  ARTICLE: 'Article',
};

export const STATUS_LABEL_MAP: Record<NewsStatus, string> = {
  DRAFT:     'Draft',
  PUBLISHED: 'Published',
  ARCHIVED:  'Archived',
};

export interface NewsDialogData {
  mode: 'add' | 'edit';
  article?: NewsArticle;
}
