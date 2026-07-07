export interface ProductFilterResponse {
  id: number;
  name: string;
  values: ProductFilterValue[];
}

export interface ProductFilterValue {
  id: number;
  value: string;
  subCategories: ProductFilterValue[];
}
