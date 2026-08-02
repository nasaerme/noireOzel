import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Product, ProductVariant, Order, Expense, Settings, CompetitorAd, CompetitorProfile, CashTransaction, BankAccount, CreditCard, SupplierInvoice, ExpectedPayout, UpcomingPayable } from '@/types';
import { generateId, generateOrderNumber } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AppContextType {
  products: Product[];
  variants: ProductVariant[];
  orders: Order[];
  expenses: Expense[];
  settings: Settings;
  cashTransactions: CashTransaction[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  supplierInvoices: SupplierInvoice[];
  expectedPayouts: ExpectedPayout[];
  upcomingPayables: UpcomingPayable[];
  addProduct: (p: Omit<Product, 'id' | 'createdAt'>, newVariants?: Omit<ProductVariant, 'id' | 'productId'>[]) => Product;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  deleteProducts: (ids: string[]) => void;
  addVariant: (v: Omit<ProductVariant, 'id'>) => ProductVariant;
  updateVariant: (v: ProductVariant) => void;
  deleteVariant: (id: string) => void;
  addOrder: (o: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => Order;
  updateOrder: (o: Order) => void;
  deleteOrder: (id: string) => void;
  deleteOrders: (ids: string[]) => void;
  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  deleteExpenses: (ids: string[]) => void;
  updateSettings: (s: Partial<Settings>) => void;
  getProduct: (id: string) => Product | undefined;
  getVariant: (id: string) => ProductVariant | undefined;
  getVariantsForProduct: (productId: string) => ProductVariant[];
  competitorAds: CompetitorAd[];
  addCompetitorAd: (a: Omit<CompetitorAd, 'id' | 'createdAt'>) => void;
  updateCompetitorAd: (a: CompetitorAd) => void;
  deleteCompetitorAd: (id: string) => void;
  deleteCompetitorAds: (ids: string[]) => void;
  competitorProfiles: CompetitorProfile[];
  addCompetitorProfile: (p: Omit<CompetitorProfile, 'id' | 'createdAt'>) => void;
  updateCompetitorProfile: (p: CompetitorProfile) => void;
  deleteCompetitorProfile: (id: string) => void;
  deleteCompetitorProfiles: (ids: string[]) => void;
  addCashTransaction: (t: Omit<CashTransaction, 'id' | 'createdAt'>) => void;
  updateCashTransaction: (t: CashTransaction) => void;
  deleteCashTransaction: (id: string) => void;
  deleteCashTransactions: (ids: string[]) => void;
  addBankAccount: (b: Omit<BankAccount, 'id' | 'createdAt'>) => void;
  updateBankAccount: (b: BankAccount) => void;
  deleteBankAccount: (id: string) => void;
  addCreditCard: (c: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  updateCreditCard: (c: CreditCard) => void;
  deleteCreditCard: (id: string) => void;
  addSupplierInvoice: (i: Omit<SupplierInvoice, 'id' | 'createdAt'>) => void;
  updateSupplierInvoice: (i: SupplierInvoice) => void;
  deleteSupplierInvoice: (id: string) => void;
  addExpectedPayout: (p: Omit<ExpectedPayout, 'id' | 'createdAt'>) => void;
  completeExpectedPayout: (id: string, receivedAccountId: string) => void;
  deleteExpectedPayout: (id: string) => void;
  addUpcomingPayable: (u: Omit<UpcomingPayable, 'id' | 'createdAt'>) => void;
  payUpcomingPayable: (id: string, paidFromAccountId: string, paymentMethod: 'cash' | 'bank_account' | 'credit_card') => void;
  deleteUpcomingPayable: (id: string) => void;
}


const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const getLocalOrderMeta = (id: string) => {
  try {
    const data = localStorage.getItem(`order_meta_${id}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const setLocalOrderMeta = (id: string, meta: { paymentMethod?: string; codFee?: number; cancellationReason?: string }) => {
  try {
    localStorage.setItem(`order_meta_${id}`, JSON.stringify(meta));
  } catch {}
};

const getStorageItem = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch { return defaultValue; }
};

const setStorageItem = <T,>(key: string, value: T) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const defaultBankAccounts: BankAccount[] = [
  { id: 'bank-1', name: 'Ziraat Bankası Ticari', bankName: 'Ziraat Bankası', iban: 'TR12 0001 0002 0003 0004 0005 01', balance: 45000, color: '#16a34a', createdAt: new Date().toISOString() },
  { id: 'bank-2', name: 'Garanti BBVA Şirket', bankName: 'Garanti BBVA', iban: 'TR62 0006 0007 0008 0009 0010 02', balance: 18500, color: '#2563eb', createdAt: new Date().toISOString() }
];

const defaultCreditCards: CreditCard[] = [
  { id: 'card-1', name: 'Garanti Bonus Ticari', bankName: 'Garanti BBVA', cardNumberLast4: '4582', totalLimit: 150000, currentDebt: 32400, cutoffDay: 15, dueDay: 25, color: '#dc2626', createdAt: new Date().toISOString() },
  { id: 'card-2', name: 'Yapı Kredi World Business', bankName: 'Yapı Kredi', cardNumberLast4: '8819', totalLimit: 100000, currentDebt: 12500, cutoffDay: 10, dueDay: 20, color: '#7c3aed', createdAt: new Date().toISOString() }
];

const defaultSupplierInvoices: SupplierInvoice[] = [
  { id: 'inv-1', date: '2026-07-28', supplierName: 'Mecit Aksoy', itemsSummary: '50x Seraphine Vücut Çorabı', amount: 30000, paymentMethod: 'cash', sourceAccountId: 'bank-1', invoiceStatus: 'pending', notes: 'Fatura e-posta ile bekleniyor', createdAt: new Date().toISOString() },
  { id: 'inv-2', date: '2026-07-20', supplierName: 'Tekstil Center A.Ş.', itemsSummary: '100x Babydoll Gecelik', amount: 45000, paymentMethod: 'credit_card', sourceAccountId: 'card-1', invoiceStatus: 'received', notes: 'Fatura alındı ve sisteme yüklendi', createdAt: new Date().toISOString() }
];

const defaultExpectedPayouts: ExpectedPayout[] = [
  { id: 'payout-1', orderNumber: 'ORD-1089', source: 'paytr', amount: 8450, orderDate: '2026-07-26T10:00:00.000Z', expectedPayoutDate: '2026-08-02', status: 'pending', notes: 'PayTR 7 Gün Valörlü Hak Ediş', createdAt: new Date().toISOString() },
  { id: 'payout-2', orderNumber: 'ORD-1072', source: 'kapida_odeme', amount: 3200, orderDate: '2026-07-24T14:30:00.000Z', expectedPayoutDate: '2026-08-01', status: 'pending', notes: 'Aras Kargo Kapıda Ödeme 8 Gün Valör', createdAt: new Date().toISOString() },
  { id: 'payout-3', orderNumber: 'ORD-1055', source: 'paytr', amount: 14200, orderDate: '2026-07-20T11:20:00.000Z', expectedPayoutDate: '2026-07-27', status: 'completed', receivedAccountId: 'bank-1', notes: 'Hesaba Yattı', createdAt: new Date().toISOString() }
];

const defaultUpcomingPayables: UpcomingPayable[] = [
  { id: 'payable-1', title: 'Garanti Kredi Kartı Ekstresi', category: 'kredi_karti', amount: 32400, dueDate: '2026-08-05', status: 'pending', notes: 'Aylık ekstre son ödeme günü', createdAt: new Date().toISOString() },
  { id: 'payable-2', title: 'Depo & Dükkan Kirası', category: 'kira', amount: 25000, dueDate: '2026-08-01', status: 'pending', notes: 'Mecit Bey mülk kirası', createdAt: new Date().toISOString() },
  { id: 'payable-3', title: 'Aras Kargo Taşıma Hakedişi', category: 'kargo', amount: 14800, dueDate: '2026-08-10', status: 'pending', notes: 'Temmuz kargo faturası', createdAt: new Date().toISOString() }
];

const defaultExpenseCategories: ExpenseCategory[] = [
  { id: 'ec_1', name: 'Meta', color: '#3b82f6' },
  { id: 'ec_2', name: 'Kargo & Lojistik', color: '#8b5cf6' },
  { id: 'ec_3', name: 'Yazılım & Sunucu', color: '#ec4899' },
  { id: 'ec_4', name: 'Ürün Tedarik & Stok', color: '#ef4444' },
  { id: 'ec_5', name: 'Personel & Maaş', color: '#06b6d4' },
  { id: 'ec_6', name: 'Ofis & Kira & Fatura', color: '#f59e0b' },
  { id: 'ec_7', name: 'Paketleme & Ambalaj', color: '#10b981' },
  { id: 'ec_8', name: 'Genel Giderler', color: '#6b7280' }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [competitorProfiles, setCompetitorProfiles] = useState<CompetitorProfile[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => getStorageItem('bank_accounts', defaultBankAccounts));
  const [creditCards, setCreditCards] = useState<CreditCard[]>(() => getStorageItem('credit_cards', defaultCreditCards));
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>(() => getStorageItem('supplier_invoices', defaultSupplierInvoices));
  const [expectedPayouts, setExpectedPayouts] = useState<ExpectedPayout[]>(() => getStorageItem('expected_payouts', defaultExpectedPayouts));
  const [upcomingPayables, setUpcomingPayables] = useState<UpcomingPayable[]>(() => getStorageItem('upcoming_payables', defaultUpcomingPayables));

  const defaultSettings: Settings = {
    language: 'tr', currency: 'TRY', currencySymbol: '₺', defaultTaxRate: 20, businessName: 'The Noire Co.', businessAddress: '', businessPhone: '', businessEmail: '', categories: [], competitors: [], expenseCategories: defaultExpenseCategories,
    defaultPaymentCommissionRate: 2.49, defaultPaymentCommissionFixed: 0.25, defaultShopifyCommissionRate: 2.0, defaultShopifyCommissionFixed: 0, defaultCashOnDeliveryFee: 100,
    shopifyStoreUrl: import.meta.env.VITE_SHOPIFY_STORE_URL || 'n1gfst-wc.myshopify.com',
    shopifyAccessToken: import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN || '',
    shopifyWebhookSecret: import.meta.env.VITE_SHOPIFY_WEBHOOK_SECRET || ''
  };

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = getStorageItem('app_settings', defaultSettings);
    if (!saved.shopifyStoreUrl) saved.shopifyStoreUrl = import.meta.env.VITE_SHOPIFY_STORE_URL || 'n1gfst-wc.myshopify.com';
    if (!saved.shopifyAccessToken) saved.shopifyAccessToken = import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN || '';
    if (!saved.shopifyWebhookSecret) saved.shopifyWebhookSecret = import.meta.env.VITE_SHOPIFY_WEBHOOK_SECRET || '';
    return saved;
  });

  useEffect(() => setStorageItem('bank_accounts', bankAccounts), [bankAccounts]);
  useEffect(() => setStorageItem('credit_cards', creditCards), [creditCards]);
  useEffect(() => setStorageItem('supplier_invoices', supplierInvoices), [supplierInvoices]);
  useEffect(() => setStorageItem('expected_payouts', expectedPayouts), [expectedPayouts]);
  useEffect(() => setStorageItem('upcoming_payables', upcomingPayables), [upcomingPayables]);
  useEffect(() => setStorageItem('app_settings', settings), [settings]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          supabase.from('settings').select('*').limit(1).single(),
          supabase.from('expense_categories').select('*'),
          supabase.from('products').select('*'),
          supabase.from('product_variants').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('competitor_ads').select('*').order('created_at', { ascending: false }),
          supabase.from('competitor_profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
          supabase.from('cash_ledger').select('*').order('date', { ascending: false }),
          supabase.from('bank_accounts').select('*').order('created_at', { ascending: true }),
          supabase.from('credit_cards').select('*').order('created_at', { ascending: true }),
          supabase.from('supplier_invoices').select('*').order('created_at', { ascending: false }),
          supabase.from('expected_payouts').select('*').order('created_at', { ascending: false }),
          supabase.from('upcoming_payables').select('*').order('created_at', { ascending: false })
        ]);

        const getResData = (idx: number) => {
          const res = results[idx];
          return res.status === 'fulfilled' ? res.value.data : null;
        };

        const setD = getResData(0);
        const ecD = getResData(1);
        const pD = getResData(2);
        const vD = getResData(3);
        const eD = getResData(4);
        const caD = getResData(5);
        const cpD = getResData(6);
        const oD = getResData(7);
        const ctD = getResData(8);
        const baD = getResData(9);
        const ccD = getResData(10);
        const siD = getResData(11);
        const epD = getResData(12);
        const upD = getResData(13);

        const loadedExpCategories = ecD ? ecD.map((c: any) => ({ id: c.id, name: c.name, color: c.color })) : [];

        // Auto-recover expense categories from expenses if missing
        const existingCatIds = new Set((loadedExpCategories.length > 0 ? loadedExpCategories : defaultExpenseCategories).map(c => c.id));
        const recoveredCategories = [...(loadedExpCategories.length > 0 ? loadedExpCategories : defaultExpenseCategories)];

        if (eD && eD.length > 0) {
          eD.forEach((e: any) => {
            if (e.category_id && !existingCatIds.has(e.category_id)) {
              existingCatIds.add(e.category_id);
              recoveredCategories.push({
                id: e.category_id,
                name: e.category_id.startsWith('ec_') ? 'Gider Kategorisi ' + e.category_id.replace('ec_', '') : e.category_id,
                color: '#3b82f6'
              });
            }
          });
        }

        if (setD) {
          setSettings(prev => ({
            ...prev,
            language: setD.language || prev.language,
            currency: setD.currency || prev.currency,
            currencySymbol: setD.currency_symbol || prev.currencySymbol,
            defaultTaxRate: setD.default_tax_rate ?? prev.defaultTaxRate,
            businessName: setD.business_name || prev.businessName,
            businessAddress: setD.business_address || prev.businessAddress,
            businessPhone: setD.business_phone || prev.businessPhone,
            businessEmail: setD.business_email || prev.businessEmail,
            categories: setD.categories || prev.categories,
            competitors: setD.competitors || prev.competitors,
            expenseCategories: recoveredCategories,
            defaultPaymentCommissionRate: setD.default_payment_commission_rate ?? prev.defaultPaymentCommissionRate,
            defaultPaymentCommissionFixed: setD.default_payment_commission_fixed ?? prev.defaultPaymentCommissionFixed,
            defaultShopifyCommissionRate: setD.default_shopify_commission_rate ?? prev.defaultShopifyCommissionRate,
            defaultShopifyCommissionFixed: setD.default_shopify_commission_fixed ?? prev.defaultShopifyCommissionFixed,
            defaultCashOnDeliveryFee: setD.default_cash_on_delivery_fee ?? prev.defaultCashOnDeliveryFee,
          }));
        }

        if (pD && pD.length > 0) setProducts(pD.map((p: any) => ({
          id: p.id, name: p.name, sku: p.sku, category: p.category, salePrice: p.sale_price,
          costPrice: p.cost_price, notes: p.notes || '', active: p.active, createdAt: p.created_at
        })));

        if (vD && vD.length > 0) setVariants(vD.map((v: any) => ({
          id: v.id, productId: v.product_id, name: v.name, sku: v.sku, stock: v.stock,
          lowStockThreshold: v.low_stock_threshold, costPriceOverride: v.cost_price_override,
          salePriceOverride: v.sale_price_override
        })));

        if (eD && eD.length > 0) {
          // Bulk update Supabase for any 'Günlük Reklam' expenses
          supabase.from('expenses').update({ category_id: 'ec_1' }).ilike('description', '%günlük reklam%').then();

          setExpenses(eD.map((e: any) => {
            const isDailyAd = (e.description || '').toLowerCase().includes('günlük reklam') || (e.description || '').toLowerCase().includes('gunluk reklam');
            return {
              id: e.id, 
              date: e.date, 
              categoryId: isDailyAd ? 'ec_1' : (e.category_id || 'ec_8'), 
              description: e.description,
              amount: e.amount, 
              recurring: e.recurring, 
              frequency: e.frequency, 
              notes: e.notes || '', 
              createdAt: e.created_at
            };
          }));
        }

        if (caD && caD.length > 0) setCompetitorAds(caD.map((ca: any) => ({
          id: ca.id, productName: ca.product_name, category: ca.category, competitors: ca.competitors,
          adCount: ca.ad_count, adType: ca.ad_type, inStock: ca.in_stock || false, notes: ca.notes || '', createdAt: ca.created_at
        })));

        if (cpD && cpD.length > 0) setCompetitorProfiles(cpD.map((cp: any) => ({
          id: cp.id, competitorName: cp.competitor_name, creativeCount: cp.creative_count, priceRange: cp.price_range || '',
          strategy: cp.strategy || '', productsNote: cp.products_note || '', 
          adLibraryUrl: cp.ad_library_url || '', websiteUrl: cp.website_url || '', instagramUrl: cp.instagram_url || '',
          createdAt: cp.created_at
        })));

        if (oD && oD.length > 0) {
          setOrders(oD.map((o: any) => {
            const meta = getLocalOrderMeta(o.id);
            const paymentMethod = meta?.paymentMethod || o.payment_method || 'kredi_karti';
            const codFee = meta?.codFee ?? o.cod_fee ?? (paymentMethod === 'kapida_odeme' ? 100 : 0);
            const paymentStatus = meta?.paymentStatus || o.payment_status || 'beklemede';
            const cancellationReason = meta?.cancellationReason || o.cancellation_reason || '';

            return {
              id: o.id, orderNumber: o.order_number, taxRate: o.tax_rate,
              shippingCost: o.shipping_cost, packagingCost: o.packaging_cost,
              paymentCommissionRate: o.payment_commission_rate,
              paymentCommissionFixed: o.payment_commission_fixed,
              shopifyCommissionRate: o.shopify_commission_rate,
              shopifyCommissionFixed: o.shopify_commission_fixed, discountAmount: o.discount_amount,
              discountRate: o.discount_rate, extraExpense: o.extra_expense, notes: o.notes || '',
              orderDate: o.order_date, paymentStatus, orderStatus: o.order_status,
              paymentMethod, codFee, cancellationReason,
              city: o.city || '', district: o.district || '',
              createdAt: o.created_at,
              items: (o.order_items || []).map((i: any) => ({
                id: i.id, productId: i.product_id, variantId: i.variant_id, quantity: i.quantity,
                unitSalePrice: i.unit_sale_price, unitCostPrice: i.unit_cost_price, isGift: i.is_gift
              }))
            };
          }));

          supabase.from('orders')
            .update({ payment_status: 'odendi' })
            .eq('payment_status', 'beklemede')
            .then();
        }

        if (ctD && ctD.length > 0) {
          setCashTransactions(ctD.map((ct: any) => ({
            id: ct.id, date: ct.date, type: ct.type as 'gelir' | 'gider', name: ct.name,
            amount: ct.amount, description: ct.description || '', createdAt: ct.created_at
          })));
        }

        if (baD && baD.length > 0) {
          setBankAccounts(baD.map((b: any) => ({
            id: b.id, name: b.name, bankName: b.bank_name, iban: b.iban || '',
            balance: Number(b.balance), color: b.color || '#16a34a', createdAt: b.created_at
          })));
        }

        if (ccD && ccD.length > 0) {
          setCreditCards(ccD.map((c: any) => ({
            id: c.id, name: c.name, bankName: c.bank_name, cardNumberLast4: c.card_number_last4 || '',
            totalLimit: Number(c.total_limit), currentDebt: Number(c.current_debt),
            cutoffDay: c.cutoff_day || 15, dueDay: c.due_day || 25, color: c.color || '#dc2626', createdAt: c.created_at
          })));
        }

        if (siD && siD.length > 0) {
          setSupplierInvoices(siD.map((s: any) => ({
            id: s.id, date: s.date, supplierName: s.supplier_name,
            invoiceType: s.invoice_type || 'product', itemsSummary: s.items_summary,
            items: s.items || [], subtotal: s.subtotal ? Number(s.subtotal) : undefined,
            totalTax: s.total_tax ? Number(s.total_tax) : undefined,
            amount: Number(s.amount), paymentMethod: s.payment_method, sourceAccountId: s.source_account_id,
            invoiceFile: s.invoice_file, invoiceFileName: s.invoice_file_name,
            invoiceStatus: s.invoice_status, notes: s.notes, createdAt: s.created_at
          })));
        }

        if (epD && epD.length > 0) {
          setExpectedPayouts(epD.map((p: any) => ({
            id: p.id, orderId: p.order_id, orderNumber: p.order_number,
            source: p.source, amount: Number(p.amount), orderDate: p.order_date,
            expectedPayoutDate: p.expected_payout_date, status: p.status,
            receivedAccountId: p.received_account_id, notes: p.notes, createdAt: p.created_at
          })));
        }

        if (upD && upD.length > 0) {
          setUpcomingPayables(upD.map((u: any) => ({
            id: u.id, title: u.title, category: u.category, amount: Number(u.amount),
            dueDate: u.due_date, status: u.status, paidFromAccountId: u.paid_from_account_id,
            paymentMethod: u.payment_method, notes: u.notes, createdAt: u.created_at
          })));
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    };
    fetchData();
  }, []);

  const addProduct = useCallback((p: Omit<Product, 'id' | 'createdAt'>, newVariants?: Omit<ProductVariant, 'id' | 'productId'>[]) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newP: Product = { ...p, id, createdAt };
    setProducts(prev => [...prev, newP]);
    supabase.from('products').insert({
      id, name: p.name, sku: p.sku, category: p.category, sale_price: p.salePrice,
      cost_price: p.costPrice, notes: p.notes, active: p.active, created_at: createdAt
    }).then(({ error }) => { if (error) toast.error("Supabase Error: " + error.message); });
    if (newVariants && newVariants.length > 0) {
      const createdV = newVariants.map(v => ({ ...v, id: generateId(), productId: id }));
      setVariants(prev => [...prev, ...createdV]);
      const vInserts = createdV.map(v => ({
        id: v.id, product_id: id, name: v.name, sku: v.sku, stock: v.stock,
        low_stock_threshold: v.lowStockThreshold, cost_price_override: v.costPriceOverride,
        sale_price_override: v.salePriceOverride
      }));
      supabase.from('product_variants').insert(vInserts).then();
    }
    return newP;
  }, []);

  const updateProduct = useCallback((p: Product) => {
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    supabase.from('products').update({
      name: p.name, sku: p.sku, category: p.category, sale_price: p.salePrice,
      cost_price: p.costPrice, notes: p.notes, active: p.active
    }).eq('id', p.id).then();
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(x => x.id !== id));
    setVariants(prev => prev.filter(x => x.productId !== id));
    supabase.from('products').delete().eq('id', id).then();
  }, []);

  const deleteProducts = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setProducts(prev => prev.filter(x => !idSet.has(x.id)));
    setVariants(prev => prev.filter(x => !idSet.has(x.productId)));
    supabase.from('products').delete().in('id', ids).then();
  }, []);

  const addVariant = useCallback((v: Omit<ProductVariant, 'id'>) => {
    const id = generateId();
    const newV: ProductVariant = { ...v, id };
    setVariants(prev => [...prev, newV]);
    supabase.from('product_variants').insert({
      id, product_id: v.productId, name: v.name, sku: v.sku, stock: v.stock,
      low_stock_threshold: v.lowStockThreshold, cost_price_override: v.costPriceOverride,
      sale_price_override: v.salePriceOverride
    }).then();
    return newV;
  }, []);

  const updateVariant = useCallback((v: ProductVariant) => {
    setVariants(prev => prev.map(x => x.id === v.id ? v : x));
    supabase.from('product_variants').update({
      name: v.name, sku: v.sku, stock: v.stock, low_stock_threshold: v.lowStockThreshold,
      cost_price_override: v.cost_price_override, sale_price_override: v.sale_price_override
    }).eq('id', v.id).then();
  }, []);

  const deleteVariant = useCallback((id: string) => {
    setVariants(prev => prev.filter(x => x.id !== id));
    supabase.from('product_variants').delete().eq('id', id).then();
  }, []);

  const addOrder = useCallback((o: Omit<Order, 'id' | 'orderNumber' | 'createdAt'> & { orderNumber?: string }) => {
    const id = generateId();
    const orderNumber = o.orderNumber && o.orderNumber.trim() ? o.orderNumber.trim() : generateOrderNumber();
    const createdAt = new Date().toISOString();
    const paymentMethod = o.paymentMethod || 'kredi_karti';
    const codFee = o.codFee ?? (paymentMethod === 'kapida_odeme' ? 100 : 0);
    const cancellationReason = o.cancellationReason || '';
    const newO: Order = { ...o, id, orderNumber, paymentMethod, codFee, cancellationReason, createdAt };
    setLocalOrderMeta(id, { paymentMethod, codFee, cancellationReason });
    setVariants(prev => prev.map(v => {
      const item = newO.items.find(i => i.variantId === v.id);
      return item ? { ...v, stock: v.stock - item.quantity } : v;
    }));
    setOrders(prev => [newO, ...prev]);
    const basePayload: any = {
      id, order_number: orderNumber, tax_rate: o.taxRate, shipping_cost: o.shippingCost,
      packaging_cost: o.packagingCost, payment_commission_rate: o.paymentCommissionRate,
      payment_commission_fixed: o.paymentCommissionFixed, shopify_commission_rate: o.shopifyCommissionRate,
      shopify_commission_fixed: o.shopifyCommissionFixed, discount_amount: o.discountAmount,
      discount_rate: o.discountRate, extra_expense: o.extraExpense, notes: o.notes,
      order_date: o.orderDate, payment_status: o.paymentStatus || 'beklemede', order_status: o.orderStatus || 'yeni',
      city: o.city, district: o.district
    };

    const fullPayload = {
      ...basePayload,
      payment_method: paymentMethod,
      cod_fee: codFee,
      cancellation_reason: cancellationReason
    };

    const saveToSupabase = async () => {
      try {
        // Try full insert first, fallback to basePayload if schema missing columns
        let { error } = await supabase.from('orders').insert(fullPayload);
        if (error) {
          const fallbackRes = await supabase.from('orders').insert(basePayload);
          if (fallbackRes.error) console.error("Supabase insert fallback error:", fallbackRes.error);
        }

        if (o.items.length > 0) {
          const itemInserts = o.items.map(i => ({
            id: generateId(), order_id: id, product_id: i.productId, variant_id: i.variantId,
            quantity: i.quantity, unit_sale_price: i.unitSalePrice, unit_cost_price: i.unitCostPrice, is_gift: i.isGift
          }));
          await supabase.from('order_items').insert(itemInserts);
          
          for (const item of o.items) {
            const latestV = await supabase.from('product_variants').select('stock').eq('id', item.variantId).single();
            if (latestV.data) {
              await supabase.from('product_variants').update({ stock: latestV.data.stock - item.quantity }).eq('id', item.variantId);
            }
          }
        }
      } catch (e) {
        console.error("Database sync error:", e);
      }
    };
    saveToSupabase();

    return newO;
  }, []);

  const updateOrder = useCallback((o: Order) => {
    setLocalOrderMeta(o.id, { paymentMethod: o.paymentMethod, codFee: o.codFee, cancellationReason: o.cancellationReason });

    setOrders(prev => {
      const oldOrder = prev.find(x => x.id === o.id);
      if (oldOrder) {
        const wasReturnedOrCanceled = oldOrder.orderStatus === 'iade' || oldOrder.orderStatus === 'iptal' || oldOrder.paymentStatus === 'iade' || oldOrder.paymentStatus === 'iptal';
        const isReturnedOrCanceled = o.orderStatus === 'iade' || o.orderStatus === 'iptal' || o.paymentStatus === 'iade' || o.paymentStatus === 'iptal';

        if (!wasReturnedOrCanceled && isReturnedOrCanceled) {
          setVariants(vPrev => vPrev.map(v => {
            const item = o.items.find(i => i.variantId === v.id);
            return item ? { ...v, stock: v.stock + item.quantity } : v;
          }));
          o.items.forEach(async item => {
            const latestV = await supabase.from('product_variants').select('stock').eq('id', item.variantId).single();
            if (latestV.data) supabase.from('product_variants').update({ stock: latestV.data.stock + item.quantity }).eq('id', item.variantId).then();
          });
        } else if (wasReturnedOrCanceled && !isReturnedOrCanceled) {
          setVariants(vPrev => vPrev.map(v => {
            const item = o.items.find(i => i.variantId === v.id);
            return item ? { ...v, stock: v.stock - item.quantity } : v;
          }));
          o.items.forEach(async item => {
            const latestV = await supabase.from('product_variants').select('stock').eq('id', item.variantId).single();
            if (latestV.data) supabase.from('product_variants').update({ stock: latestV.data.stock - item.quantity }).eq('id', item.variantId).then();
          });
        }
      }
      return prev.map(x => x.id === o.id ? o : x);
    });

    const basePayload: any = {
      order_number: o.orderNumber,
      order_date: o.orderDate,
      tax_rate: o.taxRate, shipping_cost: o.shippingCost, payment_status: o.paymentStatus || 'beklemede',
      order_status: o.orderStatus || 'yeni', notes: o.notes, city: o.city, district: o.district,
      cancellation_reason: o.cancellationReason || ''
    };

    const fullPayload = {
      ...basePayload,
      payment_method: o.paymentMethod || 'kredi_karti',
      cod_fee: o.codFee ?? 0
    };

    const updateInSupabase = async () => {
      try {
        let { error } = await supabase.from('orders').update(fullPayload).eq('id', o.id);
        if (error) {
          await supabase.from('orders').update(basePayload).eq('id', o.id);
        }
      } catch (e) {
        console.error("Database update error:", e);
      }
    };
    updateInSupabase();
  }, []);

  const deleteOrder = useCallback((id: string) => {
    let isAlreadyCancelled = false;

    setOrders(prev => {
      const order = prev.find(x => x.id === id);
      if (order) {
        isAlreadyCancelled = order.orderStatus === 'iptal' || order.orderStatus === 'iade' || order.paymentStatus === 'iptal' || order.paymentStatus === 'iade';
        
        // Sadece aktif (iptal/iade edilmemiş) siparişler silindiğinde stoklar geri iade edilir.
        // İptal edilmiş siparişte stoklar önceden zaten yüklendiği için tekrar eklenmez.
        if (!isAlreadyCancelled) {
          setVariants(vPrev => vPrev.map(v => {
            const item = order.items.find(i => i.variantId === v.id);
            return item ? { ...v, stock: v.stock + item.quantity } : v;
          }));
        }
      }
      return prev.filter(x => x.id !== id);
    });
    
    // Veritabanı işlemleri
    supabase.from('order_items').select('*').eq('order_id', id).then(({ data }) => {
       if (data && !isAlreadyCancelled) {
         data.forEach(async item => {
            const v = await supabase.from('product_variants').select('stock').eq('id', item.variant_id).single();
            if (v.data) supabase.from('product_variants').update({ stock: v.data.stock + item.quantity }).eq('id', item.variant_id).then();
         });
       }
       supabase.from('orders').delete().eq('id', id).then();
    });
  }, []);

  const deleteOrders = useCallback((ids: string[]) => {
    ids.forEach(id => deleteOrder(id));
  }, [deleteOrder]);

  // --- EXPENSES ---
  const addExpense = useCallback((e: Omit<Expense, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newE: Expense = { ...e, id, createdAt };
    setExpenses(prev => [newE, ...prev]);
    
    supabase.from('expenses').insert({
      id, date: e.date, category_id: e.categoryId || null, description: e.description,
      amount: e.amount, recurring: e.recurring, frequency: e.frequency, notes: e.notes, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
         console.error("Gider ekleme hatası:", error);
         toast.error("Gider kaydedilemedi: " + error.message);
      }
    });
  }, []);

  const updateExpense = useCallback((e: Expense) => {
    setExpenses(prev => prev.map(x => x.id === e.id ? e : x));
    supabase.from('expenses').update({
      date: e.date, category_id: e.categoryId || null, description: e.description,
      amount: e.amount, recurring: e.recurring, frequency: e.frequency, notes: e.notes
    }).eq('id', e.id).then();
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(x => x.id !== id));
    supabase.from('expenses').delete().eq('id', id).then();
  }, []);

  const deleteExpenses = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setExpenses(prev => prev.filter(x => !idSet.has(x.id)));
    supabase.from('expenses').delete().in('id', ids).then();
  }, []);

  // --- COMPETITOR ADS ---
  const addCompetitorAd = useCallback((a: Omit<CompetitorAd, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newAd: CompetitorAd = { ...a, id, createdAt };
    setCompetitorAds(prev => [newAd, ...prev]);
    
    supabase.from('competitor_ads').insert({
      id, product_name: a.productName, category: a.category, competitors: a.competitors,
      ad_count: a.adCount, ad_type: a.adType, in_stock: a.inStock, notes: a.notes, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
         console.error("Rakip reklamı ekleme hatası:", error);
         toast.error("Reklam kaydedilemedi: " + error.message);
      }
    });
  }, []);

  const updateCompetitorAd = useCallback((a: CompetitorAd) => {
    setCompetitorAds(prev => prev.map(x => x.id === a.id ? a : x));
    supabase.from('competitor_ads').update({
      product_name: a.productName, category: a.category, competitors: a.competitors,
      ad_count: a.adCount, ad_type: a.adType, in_stock: a.inStock, notes: a.notes
    }).eq('id', a.id).then();
  }, []);

  const deleteCompetitorAd = useCallback((id: string) => {
    setCompetitorAds(prev => prev.filter(x => x.id !== id));
    supabase.from('competitor_ads').delete().eq('id', id).then();
  }, []);

  const deleteCompetitorAds = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setCompetitorAds(prev => prev.filter(x => !idSet.has(x.id)));
    supabase.from('competitor_ads').delete().in('id', ids).then();
  }, []);

  // --- COMPETITOR PROFILES ---
  const addCompetitorProfile = useCallback((p: Omit<CompetitorProfile, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newP: CompetitorProfile = { ...p, id, createdAt };
    setCompetitorProfiles(prev => [newP, ...prev]);
    
    supabase.from('competitor_profiles').insert({
      id, competitor_name: p.competitorName, creative_count: p.creativeCount,
      price_range: p.priceRange, strategy: p.strategy, products_note: p.productsNote,
      ad_library_url: p.adLibraryUrl, website_url: p.websiteUrl, instagram_url: p.instagramUrl,
      created_at: createdAt
    }).then(({ error }) => {
      if (error) {
         console.error("Rakip profili ekleme hatası:", error);
         toast.error("Profil kaydedilemedi: " + error.message);
      }
    });
  }, []);

  const updateCompetitorProfile = useCallback((p: CompetitorProfile) => {
    setCompetitorProfiles(prev => prev.map(x => x.id === p.id ? p : x));
    supabase.from('competitor_profiles').update({
      competitor_name: p.competitorName, creative_count: p.creativeCount,
      price_range: p.priceRange, strategy: p.strategy, products_note: p.productsNote,
      ad_library_url: p.adLibraryUrl, website_url: p.websiteUrl, instagram_url: p.instagramUrl
    }).eq('id', p.id).then();
  }, []);

  const deleteCompetitorProfile = useCallback((id: string) => {
    setCompetitorProfiles(prev => prev.filter(x => x.id !== id));
    supabase.from('competitor_profiles').delete().eq('id', id).then();
  }, []);

  const deleteCompetitorProfiles = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setCompetitorProfiles(prev => prev.filter(x => !idSet.has(x.id)));
    supabase.from('competitor_profiles').delete().in('id', ids).then();
  }, []);

  // --- SETTINGS ---
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings(prev => { 
      const next = { ...prev, ...s };
      
      supabase.from('settings').select('id').limit(1).single().then(({ data }) => {
        if (data) {
          const updatePayload: any = {
            language: next.language, currency: next.currency, currency_symbol: next.currencySymbol,
            default_tax_rate: next.defaultTaxRate, business_name: next.businessName,
            business_address: next.businessAddress, business_phone: next.businessPhone,
            business_email: next.businessEmail, categories: next.categories, competitors: next.competitors,
            default_payment_commission_rate: next.defaultPaymentCommissionRate,
            default_payment_commission_fixed: next.defaultPaymentCommissionFixed,
            default_shopify_commission_rate: next.defaultShopifyCommissionRate,
            default_shopify_commission_fixed: next.defaultShopifyCommissionFixed,
            default_cash_on_delivery_fee: next.defaultCashOnDeliveryFee
          };

          supabase.from('settings').update(updatePayload).eq('id', data.id).then(({ error }) => {
            if (error) console.error("Settings DB update error:", error);
          });
        }
      });

      // Synchronize Expense Categories
      if (s.expenseCategories !== undefined) {
         const prevIds = prev.expenseCategories.map(c => c.id);
         const nextIds = s.expenseCategories.map(c => c.id);
         const toDelete = prevIds.filter(id => !nextIds.includes(id));
         const toUpsert = s.expenseCategories.map(c => ({ id: c.id, name: c.name, color: c.color }));
         
         if (toDelete.length > 0) {
            supabase.from('expense_categories').delete().in('id', toDelete).then();
         }
         if (toUpsert.length > 0) {
            supabase.from('expense_categories').upsert(toUpsert).then();
         }
      }

      return next;
    });
  }, []);

  // --- CASH TRANSACTIONS ---
  const addCashTransaction = useCallback((t: Omit<CashTransaction, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newT: CashTransaction = { ...t, id, createdAt };
    setCashTransactions(prev => [newT, ...prev]);

    supabase.from('cash_ledger').insert({
      id, date: t.date, type: t.type, name: t.name,
      amount: t.amount, description: t.description, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Mali işlem ekleme hatası:", error);
        toast.error("İşlem kaydedilemedi: " + error.message);
      }
    });
  }, []);

  const updateCashTransaction = useCallback((t: CashTransaction) => {
    setCashTransactions(prev => prev.map(x => x.id === t.id ? t : x));
    supabase.from('cash_ledger').update({
      date: t.date, type: t.type, name: t.name,
      amount: t.amount, description: t.description
    }).eq('id', t.id).then(({ error }) => {
      if (error) {
        console.error("Mali işlem güncelleme hatası:", error);
        toast.error("İşlem güncellenemedi: " + error.message);
      }
    });
  }, []);

  const deleteCashTransaction = useCallback((id: string) => {
    setCashTransactions(prev => prev.filter(x => x.id !== id));
    supabase.from('cash_ledger').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Mali işlem silme hatası:", error);
        toast.error("İşlem silinemedi: " + error.message);
      }
    });
  }, []);

  const deleteCashTransactions = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setCashTransactions(prev => prev.filter(x => !idSet.has(x.id)));
    supabase.from('cash_ledger').delete().in('id', ids).then(({ error }) => {
      if (error) {
        console.error("Mali işlem toplu silme hatası:", error);
        toast.error("İşlemler silinemedi: " + error.message);
      }
    });
  }, []);

  // --- FINANCIAL MANAGEMENT HANDLERS (SUPABASE CONNECTED) ---
  const addBankAccount = useCallback((b: Omit<BankAccount, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newB: BankAccount = { ...b, id, createdAt };
    setBankAccounts(prev => [...prev, newB]);

    supabase.from('bank_accounts').insert({
      id, name: b.name, bank_name: b.bankName, iban: b.iban || null, balance: b.balance, color: b.color || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) console.error("Banka hesabı DB ekleme hatası:", error);
    });

    toast.success("Banka hesabı eklendi");
  }, []);

  const updateBankAccount = useCallback((b: BankAccount) => {
    setBankAccounts(prev => prev.map(x => x.id === b.id ? b : x));

    supabase.from('bank_accounts').update({
      name: b.name, bank_name: b.bankName, iban: b.iban || null, balance: b.balance, color: b.color || null
    }).eq('id', b.id).then(({ error }) => {
      if (error) console.error("Banka hesabı DB güncelleme hatası:", error);
    });

    toast.success("Banka hesabı güncellendi");
  }, []);

  const deleteBankAccount = useCallback((id: string) => {
    setBankAccounts(prev => prev.filter(x => x.id !== id));

    supabase.from('bank_accounts').delete().eq('id', id).then(({ error }) => {
      if (error) console.error("Banka hesabı DB silme hatası:", error);
    });

    toast.success("Banka hesabı silindi");
  }, []);

  const addCreditCard = useCallback((c: Omit<CreditCard, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newC: CreditCard = { ...c, id, createdAt };
    setCreditCards(prev => [...prev, newC]);

    supabase.from('credit_cards').insert({
      id, name: c.name, bank_name: c.bankName, card_number_last4: c.cardNumberLast4 || null,
      total_limit: c.totalLimit, current_debt: c.currentDebt, cutoff_day: c.cutoffDay || 15,
      due_day: c.dueDay || 25, color: c.color || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) console.error("Kredi kartı DB ekleme hatası:", error);
    });

    toast.success("Kredi kartı eklendi");
  }, []);

  const updateCreditCard = useCallback((c: CreditCard) => {
    setCreditCards(prev => prev.map(x => x.id === c.id ? c : x));

    supabase.from('credit_cards').update({
      name: c.name, bank_name: c.bankName, card_number_last4: c.cardNumberLast4 || null,
      total_limit: c.totalLimit, current_debt: c.currentDebt, cutoff_day: c.cutoffDay || 15,
      due_day: c.dueDay || 25, color: c.color || null
    }).eq('id', c.id).then(({ error }) => {
      if (error) console.error("Kredi kartı DB güncelleme hatası:", error);
    });

    toast.success("Kredi kartı güncellendi");
  }, []);

  const deleteCreditCard = useCallback((id: string) => {
    setCreditCards(prev => prev.filter(x => x.id !== id));

    supabase.from('credit_cards').delete().eq('id', id).then(({ error }) => {
      if (error) console.error("Kredi kartı DB silme hatası:", error);
    });

    toast.success("Kredi kartı silindi");
  }, []);

  const addSupplierInvoice = useCallback((i: Omit<SupplierInvoice, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newI: SupplierInvoice = { ...i, id, createdAt };
    setSupplierInvoices(prev => [newI, ...prev]);

    if (i.sourceAccountId) {
      if (i.paymentMethod === 'bank_account') {
        setBankAccounts(prev => prev.map(b => {
          if (b.id === i.sourceAccountId) {
            const newBal = b.balance - i.amount;
            supabase.from('bank_accounts').update({ balance: newBal }).eq('id', b.id).then();
            return { ...b, balance: newBal };
          }
          return b;
        }));
      } else if (i.paymentMethod === 'credit_card') {
        setCreditCards(prev => prev.map(c => {
          if (c.id === i.sourceAccountId) {
            const newDebt = c.currentDebt + i.amount;
            supabase.from('credit_cards').update({ current_debt: newDebt }).eq('id', c.id).then();
            return { ...c, currentDebt: newDebt };
          }
          return c;
        }));
      }
    }

    supabase.from('supplier_invoices').insert({
      id, date: i.date, supplier_name: i.supplierName, invoice_type: i.invoiceType || 'product',
      items_summary: i.itemsSummary, items: i.items || [], subtotal: i.subtotal || 0,
      total_tax: i.totalTax || 0, amount: i.amount, payment_method: i.paymentMethod,
      source_account_id: i.sourceAccountId || null, invoice_file: i.invoiceFile || null,
      invoice_file_name: i.invoiceFileName || null, invoice_status: i.invoiceStatus,
      notes: i.notes || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) console.error("Tedarik faturası DB ekleme hatası:", error);
    });

    toast.success("Tedarik alım kaydı eklendi");
  }, []);

  const updateSupplierInvoice = useCallback((i: SupplierInvoice) => {
    setSupplierInvoices(prev => prev.map(x => x.id === i.id ? i : x));

    supabase.from('supplier_invoices').update({
      date: i.date, supplier_name: i.supplierName, invoice_type: i.invoiceType || 'product',
      items_summary: i.itemsSummary, items: i.items || [], subtotal: i.subtotal || 0,
      total_tax: i.totalTax || 0, amount: i.amount, payment_method: i.paymentMethod,
      source_account_id: i.sourceAccountId || null, invoice_file: i.invoiceFile || null,
      invoice_file_name: i.invoiceFileName || null, invoice_status: i.invoiceStatus,
      notes: i.notes || null
    }).eq('id', i.id).then(({ error }) => {
      if (error) console.error("Tedarik faturası DB güncelleme hatası:", error);
    });

    toast.success("Tedarik kaydı güncellendi");
  }, []);

  const deleteSupplierInvoice = useCallback((id: string) => {
    setSupplierInvoices(prev => prev.filter(x => x.id !== id));

    supabase.from('supplier_invoices').delete().eq('id', id).then(({ error }) => {
      if (error) console.error("Tedarik faturası DB silme hatası:", error);
    });

    toast.success("Tedarik kaydı silindi");
  }, []);

  const addExpectedPayout = useCallback((p: Omit<ExpectedPayout, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newP: ExpectedPayout = { ...p, id, createdAt };
    setExpectedPayouts(prev => [newP, ...prev]);

    supabase.from('expected_payouts').insert({
      id, order_id: p.orderId || null, order_number: p.orderNumber || null,
      source: p.source, amount: p.amount, order_date: p.orderDate,
      expected_payout_date: p.expectedPayoutDate, status: p.status,
      received_account_id: p.receivedAccountId || null, notes: p.notes || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) console.error("Alacak DB ekleme hatası:", error);
    });

    toast.success("Alacak kaydı eklendi");
  }, []);

  const completeExpectedPayout = useCallback((id: string, receivedAccountId: string) => {
    let amountAdded = 0;
    setExpectedPayouts(prev => prev.map(p => {
      if (p.id === id) {
        amountAdded = p.amount;
        return { ...p, status: 'completed', receivedAccountId };
      }
      return p;
    }));

    supabase.from('expected_payouts').update({
      status: 'completed', received_account_id: receivedAccountId
    }).eq('id', id).then(({ error }) => {
      if (error) console.error("Alacak DB güncelleme hatası:", error);
    });

    if (receivedAccountId && amountAdded > 0) {
      setBankAccounts(prev => prev.map(b => {
        if (b.id === receivedAccountId) {
          const newBal = b.balance + amountAdded;
          supabase.from('bank_accounts').update({ balance: newBal }).eq('id', b.id).then();
          return { ...b, balance: newBal };
        }
        return b;
      }));
      toast.success("Alacak hesaba aktarıldı ve banka bakiyesi güncellendi");
    }
  }, []);

  const deleteExpectedPayout = useCallback((id: string) => {
    setExpectedPayouts(prev => prev.filter(x => x.id !== id));

    supabase.from('expected_payouts').delete().eq('id', id).then(({ error }) => {
      if (error) console.error("Alacak DB silme hatası:", error);
    });

    toast.success("Alacak kaydı silindi");
  }, []);

  const addUpcomingPayable = useCallback((u: Omit<UpcomingPayable, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newU: UpcomingPayable = { ...u, id, createdAt };
    setUpcomingPayables(prev => [...prev, newU]);

    supabase.from('upcoming_payables').insert({
      id, title: u.title, category: u.category, amount: u.amount,
      due_date: u.dueDate, status: u.status, notes: u.notes || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) console.error("Ödeme DB ekleme hatası:", error);
    });

    toast.success("Ödeme kaydı eklendi");
  }, []);

  const payUpcomingPayable = useCallback((id: string, paidFromAccountId: string, paymentMethod: 'cash' | 'bank_account' | 'credit_card') => {
    let targetPayable: UpcomingPayable | null = null;

    setUpcomingPayables(prev => prev.map(u => {
      if (u.id === id) {
        targetPayable = u;
        return { ...u, status: 'paid', paidFromAccountId, paymentMethod };
      }
      return u;
    }));

    supabase.from('upcoming_payables').update({
      status: 'paid', paid_from_account_id: paidFromAccountId || null, payment_method: paymentMethod
    }).eq('id', id).then(({ error }) => {
      if (error) console.error("Ödeme DB güncelleme hatası:", error);
    });

    if (targetPayable) {
      const amt = (targetPayable as UpcomingPayable).amount;
      const cat = (targetPayable as UpcomingPayable).category;

      if (paymentMethod === 'bank_account' && paidFromAccountId) {
        setBankAccounts(prev => prev.map(b => {
          if (b.id === paidFromAccountId) {
            const newBal = b.balance - amt;
            supabase.from('bank_accounts').update({ balance: newBal }).eq('id', b.id).then();
            return { ...b, balance: newBal };
          }
          return b;
        }));
        if (cat === 'kredi_karti') {
          setCreditCards(prev => prev.map(c => {
            if (c.id === paidFromAccountId || c.name.toLowerCase().includes('garanti')) {
              const newDebt = Math.max(0, c.currentDebt - amt);
              supabase.from('credit_cards').update({ current_debt: newDebt }).eq('id', c.id).then();
              return { ...c, currentDebt: newDebt };
            }
            return c;
          }));
        }
      } else if (paymentMethod === 'credit_card' && paidFromAccountId) {
        setCreditCards(prev => prev.map(c => {
          if (c.id === paidFromAccountId) {
            const newDebt = c.currentDebt + amt;
            supabase.from('credit_cards').update({ current_debt: newDebt }).eq('id', c.id).then();
            return { ...c, currentDebt: newDebt };
          }
          return c;
        }));
      }
      toast.success("Ödeme yapıldı ve hesap bakiyeleri güncellendi");
    }
  }, []);

  const deleteUpcomingPayable = useCallback((id: string) => {
    setUpcomingPayables(prev => prev.filter(x => x.id !== id));

    supabase.from('upcoming_payables').delete().eq('id', id).then(({ error }) => {
      if (error) console.error("Ödeme DB silme hatası:", error);
    });

    toast.success("Ödeme kaydı silindi");
  }, []);

  // --- HELPERS ---
  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);
  const getVariant = useCallback((id: string) => variants.find(v => v.id === id), [variants]);
  const getVariantsForProduct = useCallback((productId: string) => variants.filter(v => v.productId === productId), [variants]);

  const contextValue = useMemo(() => ({
    products, variants, orders, expenses, settings, competitorAds, competitorProfiles, cashTransactions,
    bankAccounts, creditCards, supplierInvoices, expectedPayouts, upcomingPayables,
    addProduct, updateProduct, deleteProduct, deleteProducts,
    addVariant, updateVariant, deleteVariant,
    addOrder, updateOrder, deleteOrder, deleteOrders,
    addExpense, updateExpense, deleteExpense, deleteExpenses,
    updateSettings, getProduct, getVariant, getVariantsForProduct,
    addCompetitorAd, updateCompetitorAd, deleteCompetitorAd, deleteCompetitorAds,
    addCompetitorProfile, updateCompetitorProfile, deleteCompetitorProfile, deleteCompetitorProfiles,
    addCashTransaction, updateCashTransaction, deleteCashTransaction, deleteCashTransactions,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addCreditCard, updateCreditCard, deleteCreditCard,
    addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice,
    addExpectedPayout, completeExpectedPayout, deleteExpectedPayout,
    addUpcomingPayable, payUpcomingPayable, deleteUpcomingPayable,
  }), [
    products, variants, orders, expenses, settings, competitorAds, competitorProfiles, cashTransactions,
    bankAccounts, creditCards, supplierInvoices, expectedPayouts, upcomingPayables,
    addProduct, updateProduct, deleteProduct, deleteProducts,
    addVariant, updateVariant, deleteVariant,
    addOrder, updateOrder, deleteOrder, deleteOrders,
    addExpense, updateExpense, deleteExpense, deleteExpenses,
    updateSettings, getProduct, getVariant, getVariantsForProduct,
    addCompetitorAd, updateCompetitorAd, deleteCompetitorAd, deleteCompetitorAds,
    addCompetitorProfile, updateCompetitorProfile, deleteCompetitorProfile, deleteCompetitorProfiles,
    addCashTransaction, updateCashTransaction, deleteCashTransaction, deleteCashTransactions,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addCreditCard, updateCreditCard, deleteCreditCard,
    addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice,
    addExpectedPayout, completeExpectedPayout, deleteExpectedPayout,
    addUpcomingPayable, payUpcomingPayable, deleteUpcomingPayable,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

