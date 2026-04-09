export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  salePrice: number;
  costPrice: number;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  costPriceOverride: number | null;
  salePriceOverride: number | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitSalePrice: number;
  unitCostPrice: number;
  isGift: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  taxRate: number;
  shippingCost: number;
  packagingCost: number;
  paymentCommissionRate: number;
  paymentCommissionFixed: number;
  shopifyCommissionRate: number;
  shopifyCommissionFixed: number;
  discountAmount: number;
  discountRate: number;
  extraExpense: number;
  notes: string;
  orderDate: string;
  paymentStatus: 'beklemede' | 'odendi' | 'iptal';
  orderStatus: 'yeni' | 'hazirlaniyor' | 'kargoda' | 'teslim_edildi' | 'iptal';
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  recurring: boolean;
  frequency: 'gunluk' | 'haftalik' | 'aylik' | 'yillik' | null;
  notes: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
}

export interface Settings {
  language: string;
  currency: string;
  currencySymbol: string;
  defaultTaxRate: number;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  categories: string[];
  expenseCategories: ExpenseCategory[];
  defaultPaymentCommissionRate: number;
  defaultPaymentCommissionFixed: number;
  defaultShopifyCommissionRate: number;
  defaultShopifyCommissionFixed: number;
}

export interface OrderCalculation {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  totalProductCost: number;
  giftCost: number;
  shippingCost: number;
  packagingCost: number;
  paymentCommissionCost: number;
  shopifyCommissionCost: number;
  totalCommissionCost: number;
  extraExpense: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}
