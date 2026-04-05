export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  salePrice: number;
  costPrice: number;
  taxRate: number;
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
  taxRate: number;
  isGift: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  shippingRevenue: number;
  shippingCost: number;
  packagingCost: number;
  commissionRate: number;
  commissionFixed: number;
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
}

export interface OrderCalculation {
  grossRevenue: number;
  totalDiscount: number;
  netRevenueAfterDiscount: number;
  totalTax: number;
  netRevenueExTax: number;
  totalProductCost: number;
  giftCost: number;
  shippingCost: number;
  packagingCost: number;
  commissionCost: number;
  extraExpense: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}
