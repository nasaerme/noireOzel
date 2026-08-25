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

export interface CarrierCodTier {
  minAmount: number;
  maxAmount: number;
  fee: number;
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
  paymentStatus?: string;
  orderStatus?: string;
  paymentMethod?: 'online_kredi_karti' | 'kapida_odeme_kk' | 'kapida_odeme_nakit' | 'havale_eft' | 'kredi_karti' | 'kapida_odeme' | 'havale' | string;
  codFee?: number; // Müşteriden alınan Kapıda Ödeme Hizmet Bedeli
  carrierCodFee?: number; // Kargo Firmasının Kestiği Kapıda Ödeme Hizmet Bedeli (Sabit/Oran)
  carrierCodFeeType?: 'fixed' | 'percentage' | 'tiered'; // Kargo Hizmet Bedeli Tipi ('fixed' = TL, 'percentage' = %, 'tiered' = Kademeli Tarife)
  cancellationReason?: string; // İptal veya İade Nedeni
  city: string;
  district: string;
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
  competitors: string[];
  expenseCategories: ExpenseCategory[];
  defaultPaymentCommissionRate: number;
  defaultPaymentCommissionFixed: number;
  defaultShopifyCommissionRate: number;
  defaultShopifyCommissionFixed: number;
  defaultCashOnDeliveryFee?: number;
  defaultOnlineCcRate?: number;
  defaultCodCcRate?: number;
  defaultCodCashRate?: number;
  defaultBankTransferRate?: number;
  defaultCarrierCodFee?: number;
  defaultCarrierCodFeeType?: 'fixed' | 'percentage' | 'tiered';
  defaultCarrierCodTiers?: CarrierCodTier[];
  shopifyStoreUrl?: string;
  shopifyAccessToken?: string;
  shopifyWebhookSecret?: string;
}

export interface OrderCalculation {
  subtotal: number;
  codFee: number;
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
  carrierCodFeeCost: number;
  extraExpense: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  isCancelled: boolean;
  cancellationPenalty: number;
}

export interface CompetitorAd {
  id: string;
  productName: string;
  category: string;
  competitors: string;
  adCount: number;
  adType: string;
  inStock: boolean;
  notes: string;
  createdAt: string;
}

export interface CompetitorProfile {
  id: string;
  competitorName: string;
  creativeCount: number;
  priceRange: string;
  strategy: string;
  productsNote: string;
  adLibraryUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  createdAt: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'gelir' | 'gider';
  name: string; // Marka / Kişi adı (Ahmet, Mehmet)
  amount: number;
  description: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  iban?: string;
  balance: number;
  color?: string;
  createdAt: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bankName: string;
  cardNumberLast4?: string;
  totalLimit: number;
  currentDebt: number;
  cutoffDay?: number;
  dueDay?: number;
  color?: string;
  createdAt: string;
}

export interface SupplierInvoiceItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number; // KDV hariç birim fiyat
  taxRate: number; // KDV oranı (%)
  unitPriceWithTax: number; // KDV dahil birim fiyat
  totalWithTax: number; // KDV dahil kalem toplamı
}

export interface SupplierInvoice {
  id: string;
  date: string;
  supplierName: string;
  invoiceType?: 'product' | 'other'; // 'product' = Çoklu Ürün Alımı, 'other' = Diğer / Genel Gider
  itemsSummary: string; // Örn: 50x Seraphine Vücut Çorabı, 20x Babydoll veya "Kargo Poşetleri"
  items?: SupplierInvoiceItem[];
  subtotal?: number;
  totalTax?: number;
  amount: number; // KDV dahil GENEL TOPLAM
  paymentMethod: 'cash' | 'bank_account' | 'credit_card';

  sourceAccountId?: string; // Banka veya Kredi Kartı ID
  invoiceFile?: string; // Base64 data URL
  invoiceFileName?: string;
  invoiceStatus: 'received' | 'pending'; // 'Fatura Alındı' | 'Fatura Henüz Alınmadı'
  notes?: string;
  createdAt: string;
}


export interface ExpectedPayout {
  id: string;
  orderId?: string;
  orderNumber?: string;
  source: 'paytr' | 'kapida_odeme' | 'diger';
  amount: number;
  orderDate: string;
  expectedPayoutDate: string; // Valör tarihi (+7 gün PayTR, +8 gün Kapıda Ödeme)
  status: 'pending' | 'completed';
  receivedAccountId?: string;
  notes?: string;
  createdAt: string;
}

export interface UpcomingPayable {
  id: string;
  title: string;
  category: 'kredi_karti' | 'kira' | 'aidat' | 'fatura' | 'kargo' | 'shopify' | 'diger';
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
  paidFromAccountId?: string;
  paymentMethod?: 'cash' | 'bank_account' | 'credit_card';
  notes?: string;
  createdAt: string;
}

export interface OfficialInvoice {
  id: string;
  type: 'kestigim' | 'bana_kesilen'; // 'kestigim' (Satış/Giden) | 'bana_kesilen' (Alış/Gider/Gelen)
  invoiceNumber: string;
  date: string;
  partyName: string; // Kime kesildi (Müşteri/Firma) veya Kim kesti (Tedarikçi/Satıcı)
  partyTaxId?: string; // VKN / TCKN
  description: string;
  category?: string;
  subtotal: number; // Matrah (KDV Hariç)
  taxRate: number; // KDV Oranı (%) e.g. 20, 10, 1
  taxAmount: number; // KDV Tutarı
  totalAmount: number; // Brüt / KDV Dahil Genel Toplam
  invoiceFile?: string; // Base64 or URL
  invoiceFileName?: string;
  notes?: string;
  createdAt: string;
}



