export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'currency' | 'badge' | 'progress' | 'image' | 'gallery';
}

export interface DialogField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'image' | 'gallery';
  options?: string[];
  required?: boolean;
}

export interface DialogConfig {
  title: string;
  fields: DialogField[];
  initialData?: Record<string, any>;
}
