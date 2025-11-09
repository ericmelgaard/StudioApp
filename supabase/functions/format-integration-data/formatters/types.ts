export interface FormattedProduct {
  mappingId: string;
  pathId: string;
  name: string;
  description: string;
  price: string | number;
  calories: string | number;
  isOutOfStock: boolean;
  category: string;
  categoryId: string;
}

export interface FormattedModifier {
  mappingId: string;
  name: string;
  category?: string;
  price?: string | number;
  [key: string]: any;
}

export interface FormattedDiscount {
  mappingId: string;
  name: string;
  price?: string | number;
  discountAmount?: number;
  [key: string]: any;
}

export interface FormattedData {
  products: FormattedProduct[];
  modifiers: FormattedModifier[];
  discounts: FormattedDiscount[];
}