import { Product, ProductVariant, Order, OrderItem, Expense, ExpenseCategory, Settings } from '@/types';
import { generateId } from '@/utils/formatters';

const sizes = ['XS', 'S', 'M', 'L', 'XL'];

const productData: Array<{name: string; sku: string; category: string; salePrice: number; costPrice: number; taxRate: number}> = [
  { name: 'Basic Tişört', sku: 'TSR-001', category: 'Tişört', salePrice: 299, costPrice: 85, taxRate: 20 },
  { name: 'Oversize Hoodie', sku: 'HOD-001', category: 'Sweatshirt', salePrice: 599, costPrice: 180, taxRate: 20 },
  { name: 'Slim Fit Jean', sku: 'JEN-001', category: 'Pantolon', salePrice: 799, costPrice: 250, taxRate: 20 },
  { name: 'Crop Top', sku: 'CRP-001', category: 'Tişört', salePrice: 249, costPrice: 65, taxRate: 20 },
  { name: 'Kargo Pantolon', sku: 'KRG-001', category: 'Pantolon', salePrice: 699, costPrice: 210, taxRate: 20 },
  { name: 'Bomber Ceket', sku: 'BMR-001', category: 'Dış Giyim', salePrice: 1299, costPrice: 420, taxRate: 20 },
  { name: 'Triko Kazak', sku: 'TRK-001', category: 'Kazak', salePrice: 549, costPrice: 160, taxRate: 20 },
  { name: 'Şort', sku: 'SRT-001', category: 'Pantolon', salePrice: 349, costPrice: 95, taxRate: 20 },
  { name: 'Elbise', sku: 'ELB-001', category: 'Elbise', salePrice: 899, costPrice: 280, taxRate: 20 },
  { name: 'Yelek', sku: 'YLK-001', category: 'Dış Giyim', salePrice: 499, costPrice: 140, taxRate: 20 },
];

export const sampleProducts: Product[] = productData.map((p, i) => ({
  id: `prod-${i + 1}`,
  ...p,
  notes: '',
  active: true,
  createdAt: new Date(2025, 0, 1 + i).toISOString(),
}));

export const sampleVariants: ProductVariant[] = sampleProducts.flatMap((p, pi) =>
  sizes.map((size, si) => ({
    id: `var-${pi + 1}-${si + 1}`,
    productId: p.id,
    name: size,
    sku: `${p.sku}-${size}`,
    stock: Math.floor(Math.random() * 40) + 5,
    lowStockThreshold: 5,
    costPriceOverride: null,
    salePriceOverride: null,
  }))
);

const expCatData = [
  { name: 'Reklam', color: '#3b82f6' },
  { name: 'Muhasebe', color: '#8b5cf6' },
  { name: 'Ajans', color: '#ec4899' },
  { name: 'Vergi', color: '#ef4444' },
  { name: 'Yazılım', color: '#06b6d4' },
  { name: 'Kira', color: '#f59e0b' },
  { name: 'Maaş', color: '#10b981' },
  { name: 'Ambalaj', color: '#6366f1' },
  { name: 'Diğer', color: '#64748b' },
];

export const sampleExpenseCategories: ExpenseCategory[] = expCatData.map((c, i) => ({
  id: `expcat-${i + 1}`,
  ...c,
}));

function createSampleOrders(): Order[] {
  const orders: Order[] = [];
  const statuses: Order['orderStatus'][] = ['yeni', 'hazirlaniyor', 'kargoda', 'teslim_edildi'];
  const payStatuses: Order['paymentStatus'][] = ['beklemede', 'odendi'];

  for (let i = 0; i < 30; i++) {
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items: OrderItem[] = [];
    const usedProducts = new Set<string>();

    for (let j = 0; j < numItems; j++) {
      let pIdx = Math.floor(Math.random() * 10);
      while (usedProducts.has(`prod-${pIdx + 1}`)) {
        pIdx = Math.floor(Math.random() * 10);
      }
      usedProducts.add(`prod-${pIdx + 1}`);
      const product = sampleProducts[pIdx];
      const vIdx = Math.floor(Math.random() * 5);
      const variant = sampleVariants[pIdx * 5 + vIdx];
      const qty = Math.floor(Math.random() * 3) + 1;
      const isGift = Math.random() < 0.05;

      items.push({
        id: generateId(),
        productId: product.id,
        variantId: variant.id,
        quantity: qty,
        unitSalePrice: variant.salePriceOverride ?? product.salePrice,
        unitCostPrice: variant.costPriceOverride ?? product.costPrice,
        taxRate: product.taxRate,
        isGift,
      });
    }

    const day = Math.floor(Math.random() * 90);
    const orderDate = new Date(2025, 0, 15 + day);

    orders.push({
      id: `order-${i + 1}`,
      orderNumber: `SP-25${(orderDate.getMonth() + 1).toString().padStart(2, '0')}${orderDate.getDate().toString().padStart(2, '0')}-${(1000 + i).toString()}`,
      items,
      shippingRevenue: Math.random() > 0.5 ? 49.90 : 0,
      shippingCost: 25 + Math.floor(Math.random() * 20),
      packagingCost: 5 + Math.floor(Math.random() * 10),
      commissionRate: 3.5,
      commissionFixed: 1.5,
      discountAmount: Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : 0,
      discountRate: Math.random() > 0.8 ? 5 + Math.floor(Math.random() * 10) : 0,
      extraExpense: 0,
      notes: '',
      orderDate: orderDate.toISOString(),
      paymentStatus: payStatuses[Math.floor(Math.random() * payStatuses.length)],
      orderStatus: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: orderDate.toISOString(),
    });
  }

  return orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
}

export const sampleOrders = createSampleOrders();

function createSampleExpenses(): Expense[] {
  const expenses: Expense[] = [];
  const descriptions = [
    { cat: 'expcat-1', desc: 'Instagram reklam', amount: 500, recurring: true, freq: 'gunluk' as const },
    { cat: 'expcat-1', desc: 'Google Ads', amount: 300, recurring: true, freq: 'gunluk' as const },
    { cat: 'expcat-2', desc: 'Aylık muhasebe ücreti', amount: 3500, recurring: true, freq: 'aylik' as const },
    { cat: 'expcat-3', desc: 'Ajans hizmet bedeli', amount: 8000, recurring: true, freq: 'aylik' as const },
    { cat: 'expcat-5', desc: 'Shopify abonelik', amount: 1200, recurring: true, freq: 'aylik' as const },
    { cat: 'expcat-5', desc: 'E-posta servisi', amount: 350, recurring: true, freq: 'aylik' as const },
    { cat: 'expcat-6', desc: 'Ofis kirası', amount: 15000, recurring: true, freq: 'aylik' as const },
    { cat: 'expcat-7', desc: 'Çalışan maaşı - Depo', amount: 22000, recurring: true, freq: 'aylik' as const },
    { cat: 'expcat-8', desc: 'Ambalaj malzemesi alımı', amount: 2500, recurring: false, freq: null },
    { cat: 'expcat-9', desc: 'Kargo anlaşma bedeli', amount: 1000, recurring: false, freq: null },
    { cat: 'expcat-4', desc: 'KDV ödemesi', amount: 12000, recurring: true, freq: 'aylik' as const },
  ];

  descriptions.forEach((d, i) => {
    expenses.push({
      id: `exp-${i + 1}`,
      date: new Date(2025, 2, 1 + i * 2).toISOString(),
      categoryId: d.cat,
      description: d.desc,
      amount: d.amount,
      recurring: d.recurring,
      frequency: d.freq,
      notes: '',
      createdAt: new Date(2025, 2, 1).toISOString(),
    });
  });

  return expenses;
}

export const sampleExpenses = createSampleExpenses();

export const defaultSettings: Settings = {
  language: 'tr',
  currency: 'TRY',
  currencySymbol: '₺',
  defaultTaxRate: 20,
  businessName: 'Moda Atölyesi',
  businessAddress: 'Bağdat Caddesi No:123, Kadıköy, İstanbul',
  businessPhone: '+90 212 555 0100',
  businessEmail: 'info@modaatolyesi.com',
  categories: ['Tişört', 'Sweatshirt', 'Pantolon', 'Elbise', 'Dış Giyim', 'Kazak'],
  expenseCategories: sampleExpenseCategories,
};
