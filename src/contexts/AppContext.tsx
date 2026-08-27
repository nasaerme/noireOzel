import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Product, ProductVariant, Order, Expense, ExpenseCategory, Settings, CompetitorAd, CompetitorProfile, CashTransaction, BankAccount, CreditCard, SupplierInvoice, ExpectedPayout, UpcomingPayable, OfficialInvoice, CompanyProfile } from '@/types';
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
  officialInvoices: OfficialInvoice[];
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
  addOfficialInvoice: (i: Omit<OfficialInvoice, 'id' | 'createdAt'>) => void;
  addOfficialInvoicesBatch: (invoices: Omit<OfficialInvoice, 'id' | 'createdAt'>[]) => Promise<void>;
  fetchInvoiceFile: (id: string) => Promise<string | null>;
  updateOfficialInvoice: (i: OfficialInvoice) => void;
  deleteOfficialInvoice: (id: string) => void;
  deleteOfficialInvoices: (ids: string[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);


export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

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

const defaultCompanies: CompanyProfile[] = [
  { id: 'comp_sahis', name: 'The Noire Co. (Şahıs Firması)', type: 'sahis', isDefault: true },
  { id: 'comp_limited', name: 'Noire Tekstil Ltd. Şti. (Limited Şirket)', type: 'limited', isDefault: false }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [competitorProfiles, setCompetitorProfiles] = useState<CompetitorProfile[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [expectedPayouts, setExpectedPayouts] = useState<ExpectedPayout[]>([]);
  const [upcomingPayables, setUpcomingPayables] = useState<UpcomingPayable[]>([]);
  const [officialInvoices, setOfficialInvoices] = useState<OfficialInvoice[]>([]);

  const defaultSettings: Settings = {
    language: 'tr', currency: 'TRY', currencySymbol: '₺', defaultTaxRate: 20, businessName: 'The Noire Co.', businessAddress: '', businessPhone: '', businessEmail: '', categories: [], competitors: [], expenseCategories: defaultExpenseCategories,
    companies: defaultCompanies, activeCompanyId: 'comp_sahis',
    defaultPaymentCommissionRate: 3.29, defaultPaymentCommissionFixed: 0.25, defaultShopifyCommissionRate: 2.0, defaultShopifyCommissionFixed: 0, defaultCashOnDeliveryFee: 100,
    defaultOnlineCcRate: 3.29, defaultCodCcRate: 2.80, defaultCodCashRate: 0, defaultBankTransferRate: 0,
    defaultCarrierCodFee: 30, defaultCarrierCodFeeType: 'tiered',
    shopifyStoreUrl: import.meta.env.VITE_SHOPIFY_STORE_URL || 'n1gfst-wc.myshopify.com',
    shopifyAccessToken: import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN || '',
    shopifyWebhookSecret: import.meta.env.VITE_SHOPIFY_WEBHOOK_SECRET || ''
  };

  const [settings, setSettings] = useState<Settings>(() => {
    const local = localStorage.getItem('app_settings');
    if (local) {
      try {
        return { ...defaultSettings, ...JSON.parse(local) };
      } catch (e) {
        console.error("Local settings load error:", e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    const fetchAllFromSupabase = async (tableName: string, selectQuery: string = '*', orderCol?: string, ascending: boolean = false) => {
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase.from(tableName).select(selectQuery);
        if (orderCol) {
          query = query.order(orderCol, { ascending });
        }
        query = query.range(page * pageSize, (page + 1) * pageSize - 1);

        const { data, error } = await query;
        if (error) {
          console.error(`DB Fetch Error [Table: ${tableName}]:`, error);
          return { data: null, error };
        }

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      return { data: allRows, error: null };
    };

    const fetchData = async () => {
      try {
        // Faz 1: Anında arayüz yüklemesi için temel veriler (Ayarlar, Kategoriler, Ürünler & Varyantlar)
        const phase1Results = await Promise.allSettled([
          supabase.from('settings').select('*').limit(1).maybeSingle(),
          fetchAllFromSupabase('expense_categories'),
          fetchAllFromSupabase('products'),
          fetchAllFromSupabase('product_variants'),
        ]);

        const getP1 = (idx: number) => {
          const res = phase1Results[idx];
          return (res.status === 'fulfilled' && !res.value.error) ? res.value.data : null;
        };

        const setD = getP1(0);
        const ecD = getP1(1);
        const pD = getP1(2);
        const vD = getP1(3);

        const loadedExpCategories = ecD ? ecD.map((c: any) => ({ id: c.id, name: c.name, color: c.color })) : [];
        const existingCatIds = new Set((loadedExpCategories.length > 0 ? loadedExpCategories : defaultExpenseCategories).map(c => c.id));
        const recoveredCategories = [...(loadedExpCategories.length > 0 ? loadedExpCategories : defaultExpenseCategories)];

        if (setD) {
          setSettings(prev => {
            const localSaved = localStorage.getItem('app_settings');
            let localObj: Partial<Settings> | null = null;
            if (localSaved) {
              try { localObj = JSON.parse(localSaved); } catch (e) {}
            }

            const nextSettings = {
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
              defaultPaymentCommissionRate: localObj?.defaultPaymentCommissionRate ?? setD.default_payment_commission_rate ?? prev.defaultPaymentCommissionRate,
              defaultPaymentCommissionFixed: localObj?.defaultPaymentCommissionFixed ?? setD.default_payment_commission_fixed ?? prev.defaultPaymentCommissionFixed,
              defaultShopifyCommissionRate: localObj?.defaultShopifyCommissionRate ?? setD.default_shopify_commission_rate ?? prev.defaultShopifyCommissionRate,
              defaultShopifyCommissionFixed: localObj?.defaultShopifyCommissionFixed ?? setD.default_shopify_commission_fixed ?? prev.defaultShopifyCommissionFixed,
              defaultCashOnDeliveryFee: localObj?.defaultCashOnDeliveryFee ?? setD.default_cash_on_delivery_fee ?? prev.defaultCashOnDeliveryFee,
            };
            try {
              localStorage.setItem('app_settings', JSON.stringify(nextSettings));
            } catch (e) {
              console.error("LocalStorage save error:", e);
            }
            return nextSettings;
          });
        }

        if (pD !== null) setProducts(pD.map((p: any) => ({
          id: p.id, name: p.name, sku: p.sku, category: p.category, salePrice: p.sale_price,
          costPrice: p.cost_price, notes: p.notes || '', active: p.active, createdAt: p.created_at
        })));

        if (vD !== null) setVariants(vD.map((v: any) => ({
          id: v.id, productId: v.product_id, name: v.name, sku: v.sku, stock: v.stock,
          lowStockThreshold: v.low_stock_threshold, costPriceOverride: v.cost_price_override,
          salePriceOverride: v.sale_price_override
        })));

        // Faz 2: Arka planda ağrılıklı hareket verilerinin çekilmesi (Arayüzü kilitlenmeden akıcı tutar)
        const results = await Promise.allSettled([
          fetchAllFromSupabase('expenses'),
          fetchAllFromSupabase('competitor_ads', '*', 'created_at', false),
          fetchAllFromSupabase('competitor_profiles', '*', 'created_at', false),
          fetchAllFromSupabase('orders', '*, order_items(*)', 'created_at', false),
          fetchAllFromSupabase('cash_ledger', '*', 'date', false),
          fetchAllFromSupabase('bank_accounts', '*', 'created_at', true),
          fetchAllFromSupabase('credit_cards', '*', 'created_at', true),
          fetchAllFromSupabase('supplier_invoices', 'id, date, supplier_name, invoice_type, items_summary, items, subtotal, total_tax, amount, payment_method, source_account_id, invoice_file_name, invoice_status, notes, created_at', 'created_at', false),
          fetchAllFromSupabase('expected_payouts', '*', 'created_at', false),
          fetchAllFromSupabase('upcoming_payables', '*', 'created_at', false),
          fetchAllFromSupabase('official_invoices', 'id, type, invoice_number, date, party_name, party_tax_id, description, category, subtotal, tax_rate, tax_amount, total_amount, invoice_file_name, notes, created_at', 'created_at', false)
        ]);

        const getResData = (idx: number) => {
          const res = results[idx];
          if (res.status === 'fulfilled') {
            if (res.value.error) {
              console.error(`DB Fetch Error [Table idx ${idx}]:`, res.value.error);
            }
            return res.value.data;
          }
          return null;
        };

        const eD = getResData(0);
        const caD = getResData(1);
        const cpD = getResData(2);
        const oD = getResData(3);
        const ctD = getResData(4);
        const baD = getResData(5);
        const ccD = getResData(6);
        const siD = getResData(7);
        const epD = getResData(8);
        const upD = getResData(9);
        const oiD = getResData(10);

        if (eD !== null) {
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

        if (caD !== null) setCompetitorAds(caD.map((ca: any) => ({
          id: ca.id, productName: ca.product_name, category: ca.category, competitors: ca.competitors,
          adCount: ca.ad_count, adType: ca.ad_type, inStock: ca.in_stock || false, notes: ca.notes || '', createdAt: ca.created_at
        })));

        if (cpD !== null) setCompetitorProfiles(cpD.map((cp: any) => ({
          id: cp.id, competitorName: cp.competitor_name, creativeCount: cp.creative_count, priceRange: cp.price_range || '',
          strategy: cp.strategy || '', productsNote: cp.products_note || '', 
          adLibraryUrl: cp.ad_library_url || '', websiteUrl: cp.website_url || '', instagramUrl: cp.instagram_url || '',
          createdAt: cp.created_at
        })));

        if (oD !== null) {
          setOrders(oD.map((o: any) => {
            const paymentMethod = o.payment_method || 'kredi_karti';
            const codFee = o.cod_fee ?? (paymentMethod === 'kapida_odeme' ? 100 : 0);
            const paymentStatus = o.payment_status || 'beklemede';
            const cancellationReason = o.cancellation_reason || '';

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
              carrierCodFee: o.carrier_cod_fee,
              carrierCodFeeType: o.carrier_cod_fee_type,
              city: o.city || '', district: o.district || '',
              createdAt: o.created_at,
              items: (o.order_items || []).map((i: any) => ({
                id: i.id, productId: i.product_id, variantId: i.variant_id, quantity: i.quantity,
                unitSalePrice: i.unit_sale_price, unitCostPrice: i.unit_cost_price, isGift: i.is_gift
              }))
            };
          }));
        }

        if (ctD !== null) {
          setCashTransactions(ctD.map((ct: any) => ({
            id: ct.id, date: ct.date, type: ct.type as 'gelir' | 'gider', name: ct.name,
            amount: ct.amount, description: ct.description || '', createdAt: ct.created_at
          })));
        }

        if (baD !== null) {
          setBankAccounts(baD.map((b: any) => ({
            id: b.id, name: b.name, bankName: b.bank_name, iban: b.iban || '',
            balance: Number(b.balance), color: b.color || '#16a34a', createdAt: b.created_at
          })));
        }

        if (ccD !== null) {
          setCreditCards(ccD.map((c: any) => ({
            id: c.id, name: c.name, bankName: c.bank_name, cardNumberLast4: c.card_number_last4 || '',
            totalLimit: Number(c.total_limit), currentDebt: Number(c.current_debt),
            cutoffDay: c.cutoff_day || 15, dueDay: c.due_day || 25, color: c.color || '#dc2626', createdAt: c.created_at
          })));
        }

        if (siD !== null) {
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

        if (epD !== null) {
          setExpectedPayouts(epD.map((p: any) => ({
            id: p.id, orderId: p.order_id, orderNumber: p.order_number,
            source: p.source, amount: Number(p.amount), orderDate: p.order_date,
            expectedPayoutDate: p.expected_payout_date, status: p.status,
            receivedAccountId: p.received_account_id, notes: p.notes, createdAt: p.created_at
          })));
        }

        if (upD !== null) {
          setUpcomingPayables(upD.map((u: any) => ({
            id: u.id, title: u.title, category: u.category, amount: Number(u.amount),
            dueDate: u.due_date, status: u.status, paidFromAccountId: u.paid_from_account_id,
            paymentMethod: u.payment_method, notes: u.notes, createdAt: u.created_at
          })));
        }

        if (oiD !== null) {
          console.log("📊 Loaded Official Invoices count from Supabase:", oiD.length);
          const defaultComp = (settings.companies && settings.companies.length > 0) ? settings.companies[0] : { id: 'comp_sahis', name: 'The Noire Co. (Şahıs Firması)' };
          
          setOfficialInvoices(oiD.map((oi: any) => {
            const rawType = (oi.type || '').toLowerCase();
            const isReceived = rawType.includes('bana') || rawType.includes('gider') || rawType.includes('received') || rawType.includes('alis') || rawType.includes('gelen');
            
            return {
              id: oi.id,
              companyId: oi.company_id || settings.activeCompanyId || defaultComp.id,
              companyName: oi.company_name || defaultComp.name,
              type: isReceived ? 'bana_kesilen' : 'kestigim',
              invoiceNumber: oi.invoice_number || 'FATURA',
              date: oi.date || (oi.created_at ? oi.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
              partyName: oi.party_name || 'Bilinmeyen Firma',
              partyTaxId: oi.party_tax_id || '',
              description: oi.description || '',
              category: oi.category || 'Genel',
              subtotal: Number(oi.subtotal || 0),
              taxRate: Number(oi.tax_rate || 0),
              taxAmount: Number(oi.tax_amount || 0),
              totalAmount: Number(oi.total_amount || 0),
              invoiceFile: oi.invoice_file || '',
              invoiceFileName: oi.invoice_file_name || '',
              notes: oi.notes || '',
              createdAt: oi.created_at || new Date().toISOString()
            };
          }));
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    };
    fetchData();
  }, []);

  // --- PRODUCTS & VARIANTS ---
  const addProduct = useCallback((p: Omit<Product, 'id' | 'createdAt'>, newVariants?: Omit<ProductVariant, 'id' | 'productId'>[]) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newP: Product = { ...p, id, createdAt };
    
    supabase.from('products').insert({
      id, name: p.name, sku: p.sku, category: p.category, sale_price: p.salePrice,
      cost_price: p.costPrice, notes: p.notes, active: p.active, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Ürün ekleme DB hatası:", error);
        toast.error("DB Kayıt Hatası: " + error.message);
      } else {
        setProducts(prev => [...prev, newP]);
      }
    });

    if (newVariants && newVariants.length > 0) {
      const createdV = newVariants.map(v => ({ ...v, id: generateId(), productId: id }));
      const vInserts = createdV.map(v => ({
        id: v.id, product_id: id, name: v.name, sku: v.sku, stock: v.stock,
        low_stock_threshold: v.lowStockThreshold, cost_price_override: v.costPriceOverride,
        sale_price_override: v.salePriceOverride
      }));
      supabase.from('product_variants').insert(vInserts).then(({ error }) => {
        if (!error) setVariants(prev => [...prev, ...createdV]);
      });
    }
    return newP;
  }, []);

  const updateProduct = useCallback((p: Product) => {
    supabase.from('products').update({
      name: p.name, sku: p.sku, category: p.category, sale_price: p.salePrice,
      cost_price: p.costPrice, notes: p.notes, active: p.active
    }).eq('id', p.id).then(({ error }) => {
      if (error) {
        console.error("Ürün güncelleme DB hatası:", error);
        toast.error("DB Güncelleme Hatası: " + error.message);
      } else {
        setProducts(prev => prev.map(x => x.id === p.id ? p : x));
      }
    });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    supabase.from('products').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Ürün silme DB hatası:", error);
        toast.error("DB Silme Hatası: " + error.message);
      } else {
        setProducts(prev => prev.filter(x => x.id !== id));
        setVariants(prev => prev.filter(x => x.productId !== id));
      }
    });
  }, []);

  const deleteProducts = useCallback((ids: string[]) => {
    supabase.from('products').delete().in('id', ids).then(({ error }) => {
      if (error) {
        toast.error("DB Toplu Silme Hatası: " + error.message);
      } else {
        const idSet = new Set(ids);
        setProducts(prev => prev.filter(x => !idSet.has(x.id)));
        setVariants(prev => prev.filter(x => !idSet.has(x.productId)));
      }
    });
  }, []);

  const addVariant = useCallback((v: Omit<ProductVariant, 'id'>) => {
    const id = generateId();
    const newV: ProductVariant = { ...v, id };
    supabase.from('product_variants').insert({
      id, product_id: v.productId, name: v.name, sku: v.sku, stock: v.stock,
      low_stock_threshold: v.lowStockThreshold, cost_price_override: v.costPriceOverride,
      sale_price_override: v.salePriceOverride
    }).then(({ error }) => {
      if (error) {
        toast.error("Varyant Ekleme DB Hatası: " + error.message);
      } else {
        setVariants(prev => [...prev, newV]);
      }
    });
    return newV;
  }, []);

  const updateVariant = useCallback((v: ProductVariant) => {
    supabase.from('product_variants').update({
      name: v.name, sku: v.sku, stock: v.stock, low_stock_threshold: v.lowStockThreshold,
      cost_price_override: v.costPriceOverride, sale_price_override: v.salePriceOverride
    }).eq('id', v.id).then(({ error }) => {
      if (error) {
        toast.error("Varyant Güncelleme DB Hatası: " + error.message);
      } else {
        setVariants(prev => prev.map(x => x.id === v.id ? v : x));
      }
    });
  }, []);

  const deleteVariant = useCallback((id: string) => {
    supabase.from('product_variants').delete().eq('id', id).then(({ error }) => {
      if (error) {
        toast.error("Varyant Silme DB Hatası: " + error.message);
      } else {
        setVariants(prev => prev.filter(x => x.id !== id));
      }
    });
  }, []);

  // --- ORDERS ---
  const addOrder = useCallback((o: Omit<Order, 'id' | 'orderNumber' | 'createdAt'> & { orderNumber?: string }) => {
    const id = generateId();
    const orderNumber = o.orderNumber && o.orderNumber.trim() ? o.orderNumber.trim() : generateOrderNumber();
    const createdAt = new Date().toISOString();
    const paymentMethod = o.paymentMethod || 'kredi_karti';
    const codFee = o.codFee ?? (paymentMethod === 'kapida_odeme' ? 100 : 0);
    const cancellationReason = o.cancellationReason || '';
    const newO: Order = { ...o, id, orderNumber, paymentMethod, codFee, cancellationReason, createdAt };

    const payload: any = {
      id, order_number: orderNumber, tax_rate: o.taxRate, shipping_cost: o.shippingCost,
      packaging_cost: o.packagingCost, payment_commission_rate: o.paymentCommissionRate,
      payment_commission_fixed: o.paymentCommissionFixed, shopify_commission_rate: o.shopifyCommissionRate,
      shopify_commission_fixed: o.shopifyCommissionFixed, discount_amount: o.discountAmount,
      discount_rate: o.discountRate, extra_expense: o.extraExpense, notes: o.notes,
      order_date: o.orderDate, payment_status: o.paymentStatus || 'beklemede', order_status: o.orderStatus || 'yeni',
      city: o.city, district: o.district, payment_method: paymentMethod, cod_fee: codFee, cancellation_reason: cancellationReason,
      carrier_cod_fee: o.carrierCodFee, carrier_cod_fee_type: o.carrierCodFeeType
    };

    const saveToSupabase = async () => {
      try {
        let { error } = await supabase.from('orders').insert(payload);
        if (error) {
          console.error("Supabase insert error:", error);
          toast.error("Sipariş DB Kayıt Hatası: " + error.message);
          return;
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

        setVariants(prev => prev.map(v => {
          const item = newO.items.find(i => i.variantId === v.id);
          return item ? { ...v, stock: v.stock - item.quantity } : v;
        }));
        setOrders(prev => [newO, ...prev]);
        toast.success("Sipariş kaydedildi");
      } catch (e: any) {
        console.error("Database sync error:", e);
        toast.error("Sipariş Kayıt Hatası: " + e.message);
      }
    };
    saveToSupabase();

    return newO;
  }, []);

  const updateOrder = useCallback((o: Order) => {
    const payload = {
      order_number: o.orderNumber,
      order_date: o.orderDate,
      tax_rate: o.taxRate, shipping_cost: o.shippingCost, payment_status: o.paymentStatus || 'beklemede',
      order_status: o.orderStatus || 'yeni', notes: o.notes, city: o.city, district: o.district,
      cancellation_reason: o.cancellationReason || '',
      payment_method: o.paymentMethod || 'kredi_karti',
      payment_commission_rate: o.paymentCommissionRate,
      payment_commission_fixed: o.paymentCommissionFixed,
      cod_fee: o.codFee ?? 0,
      carrier_cod_fee: o.carrierCodFee,
      carrier_cod_fee_type: o.carrierCodFeeType
    };

    const updateInSupabase = async () => {
      try {
        let { error } = await supabase.from('orders').update(payload).eq('id', o.id);
        if (error) {
          toast.error("Sipariş DB Güncelleme Hatası: " + error.message);
          return;
        }

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
        toast.success("Sipariş güncellendi");
      } catch (e: any) {
        console.error("Database update error:", e);
        toast.error("Güncelleme Hatası: " + e.message);
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
      }
      return prev;
    });
    
    supabase.from('orders').delete().eq('id', id).then(({ error }) => {
      if (error) {
        toast.error("Sipariş DB Silme Hatası: " + error.message);
      } else {
        setOrders(prev => {
          const order = prev.find(x => x.id === id);
          if (order && !isAlreadyCancelled) {
            setVariants(vPrev => vPrev.map(v => {
              const item = order.items.find(i => i.variantId === v.id);
              return item ? { ...v, stock: v.stock + item.quantity } : v;
            }));
          }
          return prev.filter(x => x.id !== id);
        });
        toast.success("Sipariş silindi");
      }
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

    supabase.from('expenses').insert({
      id, date: e.date, category_id: e.categoryId || null, description: e.description,
      amount: e.amount, recurring: e.recurring, frequency: e.frequency, notes: e.notes, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Gider ekleme hatası:", error);
        toast.error("Gider DB Kayıt Hatası: " + error.message);
      } else {
        setExpenses(prev => [newE, ...prev]);
        toast.success("Gider eklendi");
      }
    });
  }, []);

  const updateExpense = useCallback((e: Expense) => {
    supabase.from('expenses').update({
      date: e.date, category_id: e.categoryId || null, description: e.description,
      amount: e.amount, recurring: e.recurring, frequency: e.frequency, notes: e.notes
    }).eq('id', e.id).then(({ error }) => {
      if (error) {
        toast.error("Gider Güncelleme DB Hatası: " + error.message);
      } else {
        setExpenses(prev => prev.map(x => x.id === e.id ? e : x));
        toast.success("Gider güncellendi");
      }
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    supabase.from('expenses').delete().eq('id', id).then(({ error }) => {
      if (error) {
        toast.error("Gider Silme DB Hatası: " + error.message);
      } else {
        setExpenses(prev => prev.filter(x => x.id !== id));
        toast.success("Gider silindi");
      }
    });
  }, []);

  const deleteExpenses = useCallback((ids: string[]) => {
    supabase.from('expenses').delete().in('id', ids).then(({ error }) => {
      if (error) {
        toast.error("Gider Toplu Silme Hatası: " + error.message);
      } else {
        const idSet = new Set(ids);
        setExpenses(prev => prev.filter(x => !idSet.has(x.id)));
        toast.success("Giderler silindi");
      }
    });
  }, []);

  // --- COMPETITOR ADS ---
  const addCompetitorAd = useCallback((a: Omit<CompetitorAd, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newAd: CompetitorAd = { ...a, id, createdAt };

    supabase.from('competitor_ads').insert({
      id, product_name: a.productName, category: a.category, competitors: a.competitors,
      ad_count: a.adCount, ad_type: a.adType, in_stock: a.inStock, notes: a.notes, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Rakip reklamı ekleme hatası:", error);
        toast.error("Reklam DB Kayıt Hatası: " + error.message);
      } else {
        setCompetitorAds(prev => [newAd, ...prev]);
        toast.success("Reklam eklendi");
      }
    });
  }, []);

  const updateCompetitorAd = useCallback((a: CompetitorAd) => {
    supabase.from('competitor_ads').update({
      product_name: a.productName, category: a.category, competitors: a.competitors,
      ad_count: a.adCount, ad_type: a.adType, in_stock: a.inStock, notes: a.notes
    }).eq('id', a.id).then(({ error }) => {
      if (error) {
        toast.error("Reklam DB Güncelleme Hatası: " + error.message);
      } else {
        setCompetitorAds(prev => prev.map(x => x.id === a.id ? a : x));
        toast.success("Reklam güncellendi");
      }
    });
  }, []);

  const deleteCompetitorAd = useCallback((id: string) => {
    supabase.from('competitor_ads').delete().eq('id', id).then(({ error }) => {
      if (error) {
        toast.error("Reklam DB Silme Hatası: " + error.message);
      } else {
        setCompetitorAds(prev => prev.filter(x => x.id !== id));
        toast.success("Reklam silindi");
      }
    });
  }, []);

  const deleteCompetitorAds = useCallback((ids: string[]) => {
    supabase.from('competitor_ads').delete().in('id', ids).then(({ error }) => {
      if (error) {
        toast.error("Reklam Toplu Silme Hatası: " + error.message);
      } else {
        const idSet = new Set(ids);
        setCompetitorAds(prev => prev.filter(x => !idSet.has(x.id)));
        toast.success("Reklamlar silindi");
      }
    });
  }, []);

  // --- COMPETITOR PROFILES ---
  const addCompetitorProfile = useCallback((p: Omit<CompetitorProfile, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newP: CompetitorProfile = { ...p, id, createdAt };

    supabase.from('competitor_profiles').insert({
      id, competitor_name: p.competitorName, creative_count: p.creativeCount,
      price_range: p.priceRange, strategy: p.strategy, products_note: p.productsNote,
      ad_library_url: p.adLibraryUrl, website_url: p.websiteUrl, instagram_url: p.instagramUrl,
      created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Rakip profili ekleme hatası:", error);
        toast.error("Profil DB Kayıt Hatası: " + error.message);
      } else {
        setCompetitorProfiles(prev => [newP, ...prev]);
        toast.success("Profil eklendi");
      }
    });
  }, []);

  const updateCompetitorProfile = useCallback((p: CompetitorProfile) => {
    supabase.from('competitor_profiles').update({
      competitor_name: p.competitorName, creative_count: p.creativeCount,
      price_range: p.priceRange, strategy: p.strategy, products_note: p.productsNote,
      ad_library_url: p.adLibraryUrl, website_url: p.websiteUrl, instagram_url: p.instagramUrl
    }).eq('id', p.id).then(({ error }) => {
      if (error) {
        toast.error("Profil DB Güncelleme Hatası: " + error.message);
      } else {
        setCompetitorProfiles(prev => prev.map(x => x.id === p.id ? p : x));
        toast.success("Profil güncellendi");
      }
    });
  }, []);

  const deleteCompetitorProfile = useCallback((id: string) => {
    supabase.from('competitor_profiles').delete().eq('id', id).then(({ error }) => {
      if (error) {
        toast.error("Profil DB Silme Hatası: " + error.message);
      } else {
        setCompetitorProfiles(prev => prev.filter(x => x.id !== id));
        toast.success("Profil silindi");
      }
    });
  }, []);

  const deleteCompetitorProfiles = useCallback((ids: string[]) => {
    supabase.from('competitor_profiles').delete().in('id', ids).then(({ error }) => {
      if (error) {
        toast.error("Profil Toplu Silme Hatası: " + error.message);
      } else {
        const idSet = new Set(ids);
        setCompetitorProfiles(prev => prev.filter(x => !idSet.has(x.id)));
        toast.success("Profiller silindi");
      }
    });
  }, []);

  // --- SETTINGS ---
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings(prev => { 
      const next = { ...prev, ...s };

      try {
        localStorage.setItem('app_settings', JSON.stringify(next));
      } catch (e) {
        console.error("LocalStorage save error:", e);
      }
      
      supabase.from('settings').select('id').limit(1).maybeSingle().then(async ({ data }) => {
        const fullPayload: any = {
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

        const basePayload: any = {
          language: next.language, currency: next.currency, currency_symbol: next.currencySymbol,
          default_tax_rate: next.defaultTaxRate, business_name: next.businessName,
          business_address: next.businessAddress, business_phone: next.businessPhone,
          business_email: next.businessEmail, categories: next.categories
        };

        if (data && data.id) {
          const res = await supabase.from('settings').update(fullPayload).eq('id', data.id);
          if (res.error) {
            console.warn("Tam ayarlar güncelleme hatası, temel veriler kaydediliyor:", res.error.message);
            await supabase.from('settings').update(basePayload).eq('id', data.id);
          }
        } else {
          const res = await supabase.from('settings').insert([fullPayload]);
          if (res.error) {
            console.warn("Tam ayarlar ekleme hatası, temel veriler kaydediliyor:", res.error.message);
            await supabase.from('settings').insert([basePayload]);
          }
        }
      });

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

    supabase.from('cash_ledger').insert({
      id, date: t.date, type: t.type, name: t.name,
      amount: t.amount, description: t.description, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Mali işlem ekleme hatası:", error);
        toast.error("İşlem DB Kayıt Hatası: " + error.message);
      } else {
        setCashTransactions(prev => [newT, ...prev]);
        toast.success("İşlem kaydedildi");
      }
    });
  }, []);

  const updateCashTransaction = useCallback((t: CashTransaction) => {
    supabase.from('cash_ledger').update({
      date: t.date, type: t.type, name: t.name,
      amount: t.amount, description: t.description
    }).eq('id', t.id).then(({ error }) => {
      if (error) {
        console.error("Mali işlem güncelleme hatası:", error);
        toast.error("İşlem DB Güncelleme Hatası: " + error.message);
      } else {
        setCashTransactions(prev => prev.map(x => x.id === t.id ? t : x));
        toast.success("İşlem güncellendi");
      }
    });
  }, []);

  const deleteCashTransaction = useCallback((id: string) => {
    supabase.from('cash_ledger').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Mali işlem silme hatası:", error);
        toast.error("İşlem DB Silme Hatası: " + error.message);
      } else {
        setCashTransactions(prev => prev.filter(x => x.id !== id));
        toast.success("İşlem silindi");
      }
    });
  }, []);

  const deleteCashTransactions = useCallback((ids: string[]) => {
    supabase.from('cash_ledger').delete().in('id', ids).then(({ error }) => {
      if (error) {
        console.error("Mali işlem toplu silme hatası:", error);
        toast.error("İşlemler DB Silme Hatası: " + error.message);
      } else {
        const idSet = new Set(ids);
        setCashTransactions(prev => prev.filter(x => !idSet.has(x.id)));
        toast.success("İşlemler silindi");
      }
    });
  }, []);

  // --- BANK ACCOUNTS ---
  const addBankAccount = useCallback((b: Omit<BankAccount, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newB: BankAccount = { ...b, id, createdAt };

    supabase.from('bank_accounts').insert({
      id, name: b.name, bank_name: b.bankName, iban: b.iban || null, balance: b.balance, color: b.color || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Banka hesabı DB ekleme hatası:", error);
        toast.error("Banka Hesabı DB Hatası: " + error.message);
      } else {
        setBankAccounts(prev => [...prev, newB]);
        toast.success("Banka hesabı eklendi");
      }
    });
  }, []);

  const updateBankAccount = useCallback((b: BankAccount) => {
    supabase.from('bank_accounts').update({
      name: b.name, bank_name: b.bankName, iban: b.iban || null, balance: b.balance, color: b.color || null
    }).eq('id', b.id).then(({ error }) => {
      if (error) {
        console.error("Banka hesabı DB güncelleme hatası:", error);
        toast.error("Banka Hesabı Güncelleme Hatası: " + error.message);
      } else {
        setBankAccounts(prev => prev.map(x => x.id === b.id ? b : x));
        toast.success("Banka hesabı güncellendi");
      }
    });
  }, []);

  const deleteBankAccount = useCallback((id: string) => {
    supabase.from('bank_accounts').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Banka hesabı DB silme hatası:", error);
        toast.error("Banka Hesabı Silme Hatası: " + error.message);
      } else {
        setBankAccounts(prev => prev.filter(x => x.id !== id));
        toast.success("Banka hesabı silindi");
      }
    });
  }, []);

  // --- CREDIT CARDS ---
  const addCreditCard = useCallback((c: Omit<CreditCard, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newC: CreditCard = { ...c, id, createdAt };

    supabase.from('credit_cards').insert({
      id, name: c.name, bank_name: c.bankName, card_number_last4: c.cardNumberLast4 || null,
      total_limit: c.totalLimit, current_debt: c.currentDebt, cutoff_day: c.cutoffDay || 15,
      due_day: c.dueDay || 25, color: c.color || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Kredi kartı DB ekleme hatası:", error);
        toast.error("Kredi Kartı DB Hatası: " + error.message);
      } else {
        setCreditCards(prev => [...prev, newC]);
        toast.success("Kredi kartı eklendi");
      }
    });
  }, []);

  const updateCreditCard = useCallback((c: CreditCard) => {
    supabase.from('credit_cards').update({
      name: c.name, bank_name: c.bankName, card_number_last4: c.cardNumberLast4 || null,
      total_limit: c.totalLimit, current_debt: c.currentDebt, cutoff_day: c.cutoffDay || 15,
      due_day: c.dueDay || 25, color: c.color || null
    }).eq('id', c.id).then(({ error }) => {
      if (error) {
        console.error("Kredi kartı DB güncelleme hatası:", error);
        toast.error("Kredi Kartı Güncelleme Hatası: " + error.message);
      } else {
        setCreditCards(prev => prev.map(x => x.id === c.id ? c : x));
        toast.success("Kredi kartı güncellendi");
      }
    });
  }, []);

  const deleteCreditCard = useCallback((id: string) => {
    supabase.from('credit_cards').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Kredi kartı DB silme hatası:", error);
        toast.error("Kredi Kartı Silme Hatası: " + error.message);
      } else {
        setCreditCards(prev => prev.filter(x => x.id !== id));
        toast.success("Kredi kartı silindi");
      }
    });
  }, []);

  // --- SUPPLIER INVOICES ---
  const addSupplierInvoice = useCallback((i: Omit<SupplierInvoice, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newI: SupplierInvoice = { ...i, id, createdAt };

    supabase.from('supplier_invoices').insert({
      id, date: i.date, supplier_name: i.supplierName, invoice_type: i.invoiceType || 'product',
      items_summary: i.itemsSummary, items: i.items || [], subtotal: i.subtotal || 0,
      total_tax: i.totalTax || 0, amount: i.amount, payment_method: i.paymentMethod,
      source_account_id: i.sourceAccountId || null, invoice_file: i.invoiceFile || null,
      invoice_file_name: i.invoiceFileName || null, invoice_status: i.invoiceStatus,
      notes: i.notes || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Tedarik faturası DB ekleme hatası:", error);
        toast.error("Tedarik Faturası DB Hatası: " + error.message);
      } else {
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
        toast.success("Tedarik alım kaydı eklendi");
      }
    });
  }, []);

  const updateSupplierInvoice = useCallback((i: SupplierInvoice) => {
    supabase.from('supplier_invoices').update({
      date: i.date, supplier_name: i.supplierName, invoice_type: i.invoiceType || 'product',
      items_summary: i.itemsSummary, items: i.items || [], subtotal: i.subtotal || 0,
      total_tax: i.totalTax || 0, amount: i.amount, payment_method: i.paymentMethod,
      source_account_id: i.sourceAccountId || null, invoice_file: i.invoiceFile || null,
      invoice_file_name: i.invoiceFileName || null, invoice_status: i.invoiceStatus,
      notes: i.notes || null
    }).eq('id', i.id).then(({ error }) => {
      if (error) {
        console.error("Tedarik faturası DB güncelleme hatası:", error);
        toast.error("Tedarik Faturası Güncelleme Hatası: " + error.message);
      } else {
        setSupplierInvoices(prev => prev.map(x => x.id === i.id ? i : x));
        toast.success("Tedarik kaydı güncellendi");
      }
    });
  }, []);

  const deleteSupplierInvoice = useCallback((id: string) => {
    supabase.from('supplier_invoices').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Tedarik faturası DB silme hatası:", error);
        toast.error("Tedarik Kaydı Silme Hatası: " + error.message);
      } else {
        setSupplierInvoices(prev => prev.filter(x => x.id !== id));
        toast.success("Tedarik kaydı silindi");
      }
    });
  }, []);

  // --- EXPECTED PAYOUTS ---
  const addExpectedPayout = useCallback((p: Omit<ExpectedPayout, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newP: ExpectedPayout = { ...p, id, createdAt };

    supabase.from('expected_payouts').insert({
      id, order_id: p.orderId || null, order_number: p.orderNumber || null,
      source: p.source, amount: p.amount, order_date: p.orderDate,
      expected_payout_date: p.expectedPayoutDate, status: p.status,
      received_account_id: p.receivedAccountId || null, notes: p.notes || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Alacak DB ekleme hatası:", error);
        toast.error("Alacak Kaydı DB Hatası: " + error.message);
      } else {
        setExpectedPayouts(prev => [newP, ...prev]);
        toast.success("Alacak kaydı eklendi");
      }
    });
  }, []);

  const completeExpectedPayout = useCallback((id: string, receivedAccountId: string) => {
    let targetPayout: ExpectedPayout | undefined;
    setExpectedPayouts(prev => {
      targetPayout = prev.find(p => p.id === id);
      return prev;
    });

    supabase.from('expected_payouts').update({
      status: 'completed', received_account_id: receivedAccountId
    }).eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Alacak DB güncelleme hatası:", error);
        toast.error("Alacak Güncelleme Hatası: " + error.message);
      } else {
        setExpectedPayouts(prev => prev.map(p => {
          if (p.id === id) {
            return { ...p, status: 'completed', receivedAccountId };
          }
          return p;
        }));

        if (receivedAccountId && targetPayout && targetPayout.amount > 0) {
          const amt = targetPayout.amount;
          setBankAccounts(prev => prev.map(b => {
            if (b.id === receivedAccountId) {
              const newBal = b.balance + amt;
              supabase.from('bank_accounts').update({ balance: newBal }).eq('id', b.id).then();
              return { ...b, balance: newBal };
            }
            return b;
          }));
        }
        toast.success("Alacak hesaba aktarıldı ve banka bakiyesi güncellendi");
      }
    });
  }, []);

  const deleteExpectedPayout = useCallback((id: string) => {
    supabase.from('expected_payouts').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Alacak DB silme hatası:", error);
        toast.error("Alacak Silme Hatası: " + error.message);
      } else {
        setExpectedPayouts(prev => prev.filter(x => x.id !== id));
        toast.success("Alacak kaydı silindi");
      }
    });
  }, []);

  // --- UPCOMING PAYABLES ---
  const addUpcomingPayable = useCallback((u: Omit<UpcomingPayable, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newU: UpcomingPayable = { ...u, id, createdAt };

    supabase.from('upcoming_payables').insert({
      id, title: u.title, category: u.category, amount: u.amount,
      due_date: u.dueDate, status: u.status, notes: u.notes || null, created_at: createdAt
    }).then(({ error }) => {
      if (error) {
        console.error("Ödeme DB ekleme hatası:", error);
        toast.error("Ödeme Kaydı DB Hatası: " + error.message);
      } else {
        setUpcomingPayables(prev => [...prev, newU]);
        toast.success("Ödeme kaydı eklendi");
      }
    });
  }, []);

  const payUpcomingPayable = useCallback((id: string, paidFromAccountId: string, paymentMethod: 'cash' | 'bank_account' | 'credit_card') => {
    let targetPayable: UpcomingPayable | undefined;
    setUpcomingPayables(prev => {
      targetPayable = prev.find(u => u.id === id);
      return prev;
    });

    supabase.from('upcoming_payables').update({
      status: 'paid', paid_from_account_id: paidFromAccountId || null, payment_method: paymentMethod
    }).eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Ödeme DB güncelleme hatası:", error);
        toast.error("Ödeme Güncelleme Hatası: " + error.message);
      } else {
        setUpcomingPayables(prev => prev.map(u => {
          if (u.id === id) {
            return { ...u, status: 'paid', paidFromAccountId, paymentMethod };
          }
          return u;
        }));

        if (targetPayable) {
          const amt = targetPayable.amount;
          const cat = targetPayable.category;

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
        }
        toast.success("Ödeme yapıldı ve hesap bakiyeleri güncellendi");
      }
    });
  }, []);

  const deleteUpcomingPayable = useCallback((id: string) => {
    supabase.from('upcoming_payables').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Ödeme DB silme hatası:", error);
        toast.error("Ödeme Silme Hatası: " + error.message);
      } else {
        setUpcomingPayables(prev => prev.filter(x => x.id !== id));
        toast.success("Ödeme kaydı silindi");
      }
    });
  }, []);

  // --- OFFICIAL INVOICES ---
  const addOfficialInvoice = useCallback((i: Omit<OfficialInvoice, 'id' | 'createdAt'>) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newI: OfficialInvoice = { ...i, id, createdAt };

    const payload: any = {
      id,
      company_id: i.companyId || null,
      company_name: i.companyName || null,
      type: i.type,
      invoice_number: i.invoiceNumber,
      date: i.date,
      party_name: i.partyName,
      party_tax_id: i.partyTaxId || null,
      description: i.description,
      category: i.category || null,
      subtotal: i.subtotal,
      tax_rate: i.taxRate,
      tax_amount: i.taxAmount,
      total_amount: i.totalAmount,
      invoice_file: i.invoiceFile || null,
      invoice_file_name: i.invoiceFileName || null,
      notes: i.notes || null,
      created_at: createdAt
    };

    const saveToSupabase = async () => {
      let { error } = await supabase.from('official_invoices').insert(payload);
      if (error && (error.message.includes('company_id') || error.message.includes('company_name'))) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.company_id;
        delete fallbackPayload.company_name;
        const res = await supabase.from('official_invoices').insert(fallbackPayload);
        error = res.error;
      }

      if (error) {
        console.error("Fatura ekleme DB hatası:", error);
        toast.error("Fatura DB Kayıt Hatası: " + error.message);
      } else {
        setOfficialInvoices(prev => [newI, ...prev]);
        toast.success("Fatura kaydedildi");
      }
    };
    saveToSupabase();
  }, []);

  const updateOfficialInvoice = useCallback((i: OfficialInvoice) => {
    const payload: any = {
      company_id: i.companyId || null,
      company_name: i.companyName || null,
      type: i.type,
      invoice_number: i.invoiceNumber,
      date: i.date,
      party_name: i.partyName,
      party_tax_id: i.partyTaxId || null,
      description: i.description,
      category: i.category || null,
      subtotal: i.subtotal,
      tax_rate: i.taxRate,
      tax_amount: i.taxAmount,
      total_amount: i.totalAmount,
      invoice_file: i.invoiceFile || null,
      invoice_file_name: i.invoiceFileName || null,
      notes: i.notes || null
    };

    const updateInSupabase = async () => {
      let { error } = await supabase.from('official_invoices').update(payload).eq('id', i.id);
      if (error && (error.message.includes('company_id') || error.message.includes('company_name'))) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.company_id;
        delete fallbackPayload.company_name;
        const res = await supabase.from('official_invoices').update(fallbackPayload).eq('id', i.id);
        error = res.error;
      }

      if (error) {
        toast.error("Fatura Güncelleme DB Hatası: " + error.message);
      } else {
        setOfficialInvoices(prev => prev.map(x => x.id === i.id ? i : x));
        toast.success("Fatura güncellendi");
      }
    };
    updateInSupabase();
  }, []);

  const addOfficialInvoicesBatch = useCallback(async (invoicesList: Omit<OfficialInvoice, 'id' | 'createdAt'>[]) => {
    if (invoicesList.length === 0) return;
    const createdAt = new Date().toISOString();

    const createdInvoices: OfficialInvoice[] = invoicesList.map(i => ({
      ...i,
      id: generateId(),
      createdAt
    }));

    const dbRows = createdInvoices.map(i => ({
      id: i.id,
      company_id: i.companyId || null,
      company_name: i.companyName || null,
      type: i.type,
      invoice_number: i.invoiceNumber,
      date: i.date,
      party_name: i.partyName,
      party_tax_id: i.partyTaxId || null,
      description: i.description,
      category: i.category || null,
      subtotal: i.subtotal,
      tax_rate: i.taxRate,
      tax_amount: i.taxAmount,
      total_amount: i.totalAmount,
      invoice_file: i.invoiceFile || null,
      invoice_file_name: i.invoiceFileName || null,
      notes: i.notes || null,
      created_at: createdAt
    }));

    let { error } = await supabase.from('official_invoices').insert(dbRows);
    if (error && (error.message.includes('company_id') || error.message.includes('company_name'))) {
      const fallbackRows = dbRows.map((r: any) => {
        const copy = { ...r };
        delete copy.company_id;
        delete copy.company_name;
        return copy;
      });
      const res = await supabase.from('official_invoices').insert(fallbackRows);
      error = res.error;
    }

    if (error) {
      console.error("Toplu fatura ekleme DB hatası:", error);
      toast.error("Toplu Fatura Kayıt Hatası: " + error.message);
    } else {
      setOfficialInvoices(prev => [...createdInvoices, ...prev]);
      toast.success(`${createdInvoices.length} adet fatura başarıyla veritabanına aktarıldı!`);
    }
  }, []);

  const fetchInvoiceFile = useCallback(async (id: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('official_invoices')
        .select('invoice_file')
        .eq('id', id)
        .single();
      if (error) {
        console.error("Fatura dosyası getirme hatası:", error);
        return null;
      }
      return data?.invoice_file || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  const deleteOfficialInvoice = useCallback((id: string) => {
    supabase.from('official_invoices').delete().eq('id', id).then(({ error }) => {
      if (error) {
        toast.error("Fatura Silme DB Hatası: " + error.message);
      } else {
        setOfficialInvoices(prev => prev.filter(x => x.id !== id));
        toast.success("Fatura silindi");
      }
    });
  }, []);

  const deleteOfficialInvoices = useCallback((ids: string[]) => {
    supabase.from('official_invoices').delete().in('id', ids).then(({ error }) => {
      if (error) {
        toast.error("Fatura Toplu Silme Hatası: " + error.message);
      } else {
        const idSet = new Set(ids);
        setOfficialInvoices(prev => prev.filter(x => !idSet.has(x.id)));
        toast.success("Faturalar silindi");
      }
    });
  }, []);

  // --- HELPERS ---
  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);
  const getVariant = useCallback((id: string) => variants.find(v => v.id === id), [variants]);
  const getVariantsForProduct = useCallback((productId: string) => variants.filter(v => v.productId === productId), [variants]);

  const contextValue = useMemo(() => ({
    products, variants, orders, expenses, settings, competitorAds, competitorProfiles, cashTransactions,
    bankAccounts, creditCards, supplierInvoices, expectedPayouts, upcomingPayables, officialInvoices,
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
    addOfficialInvoice, addOfficialInvoicesBatch, fetchInvoiceFile, updateOfficialInvoice, deleteOfficialInvoice, deleteOfficialInvoices,
  }), [
    products, variants, orders, expenses, settings, competitorAds, competitorProfiles, cashTransactions,
    bankAccounts, creditCards, supplierInvoices, expectedPayouts, upcomingPayables, officialInvoices,
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
    addOfficialInvoice, addOfficialInvoicesBatch, fetchInvoiceFile, updateOfficialInvoice, deleteOfficialInvoice, deleteOfficialInvoices,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
