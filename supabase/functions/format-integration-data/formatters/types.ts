export interface FormattedProduct {
  mappingId: string;
  name: string;
  category?: string;
  price?: string | number;
  description?: string;
  active?: boolean;
  [key: string]: any;
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
