import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Product, ProductVariant, Order, Expense, Settings, CompetitorAd, CompetitorProfile } from '@/types';
import { generateId, generateOrderNumber } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AppContextType {
  products: Product[];
  variants: ProductVariant[];
  orders: Order[];
  expenses: Expense[];
  settings: Settings;
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
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [competitorProfiles, setCompetitorProfiles] = useState<CompetitorProfile[]>([]);
  const [settings, setSettings] = useState<Settings>({
    language: 'tr', currency: 'TRY', currencySymbol: '₺', defaultTaxRate: 20, businessName: '', businessAddress: '', businessPhone: '', businessEmail: '', categories: [], competitors: [], expenseCategories: [],
    defaultPaymentCommissionRate: 2.49, defaultPaymentCommissionFixed: 0.25, defaultShopifyCommissionRate: 2.0, defaultShopifyCommissionFixed: 0
  });

  // SUPABASE INITIAL DATA FETCH
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Settings & Expense Categories
        const { data: setD } = await supabase.from('settings').select('*').limit(1).single();
        const { data: ecD } = await supabase.from('expense_categories').select('*');
        const loadedExpCategories = ecD ? ecD.map(c => ({ id: c.id, name: c.name, color: c.color })) : [];

        if (setD) {
          setSettings({
            language: setD.language, currency: setD.currency, currencySymbol: setD.currency_symbol,
            defaultTaxRate: setD.default_tax_rate, businessName: setD.business_name || '',
            businessAddress: setD.business_address || '', businessPhone: setD.business_phone || '',
            businessEmail: setD.business_email || '', categories: setD.categories || [], competitors: setD.competitors || [], expenseCategories: loadedExpCategories,
            defaultPaymentCommissionRate: setD.default_payment_commission_rate ?? 2.49,
            defaultPaymentCommissionFixed: setD.default_payment_commission_fixed ?? 0.25,
            defaultShopifyCommissionRate: setD.default_shopify_commission_rate ?? 2.0,
            defaultShopifyCommissionFixed: setD.default_shopify_commission_fixed ?? 0
          });
        }

        // Fetch Products
        const { data: pD } = await supabase.from('products').select('*');
        if (pD) setProducts(pD.map(p => ({
          id: p.id, name: p.name, sku: p.sku, category: p.category, salePrice: p.sale_price,
          costPrice: p.cost_price, notes: p.notes || '', active: p.active, createdAt: p.created_at
        })));

        // Fetch Variants
        const { data: vD } = await supabase.from('product_variants').select('*');
        if (vD) setVariants(vD.map(v => ({
          id: v.id, productId: v.product_id, name: v.name, sku: v.sku, stock: v.stock,
          lowStockThreshold: v.low_stock_threshold, costPriceOverride: v.cost_price_override,
          salePriceOverride: v.sale_price_override
        })));

        // Fetch Expenses
        const { data: eD } = await supabase.from('expenses').select('*');
        if (eD) setExpenses(eD.map(e => ({
          id: e.id, date: e.date, categoryId: e.category_id || '', description: e.description,
          amount: e.amount, recurring: e.recurring, frequency: e.frequency, notes: e.notes || '', createdAt: e.created_at
        })));

        // Fetch Competitor Ads
        const { data: caD } = await supabase.from('competitor_ads').select('*').order('created_at', { ascending: false });
        if (caD) setCompetitorAds(caD.map(ca => ({
          id: ca.id, productName: ca.product_name, category: ca.category, competitors: ca.competitors,
          adCount: ca.ad_count, adType: ca.ad_type, inStock: ca.in_stock || false, notes: ca.notes || '', createdAt: ca.created_at
        })));

        // Fetch Competitor Profiles
        const { data: cpD } = await supabase.from('competitor_profiles').select('*').order('created_at', { ascending: false });
        if (cpD) setCompetitorProfiles(cpD.map(cp => ({
          id: cp.id, competitorName: cp.competitor_name, creativeCount: cp.creative_count, priceRange: cp.price_range || '',
          strategy: cp.strategy || '', productsNote: cp.products_note || '', 
          adLibraryUrl: cp.ad_library_url || '', websiteUrl: cp.website_url || '', instagramUrl: cp.instagram_url || '',
          createdAt: cp.created_at
        })));

        // Fetch Orders + Items
        const { data: oD } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
        if (oD) {
          setOrders(oD.map((o: any) => ({
            id: o.id, orderNumber: o.order_number, taxRate: o.tax_rate, shippingCost: o.shipping_cost,
            packagingCost: o.packaging_cost, paymentCommissionRate: o.payment_commission_rate,
            paymentCommissionFixed: o.payment_commission_fixed, shopifyCommissionRate: o.shopify_commission_rate,
            shopifyCommissionFixed: o.shopify_commission_fixed, discountAmount: o.discount_amount,
            discountRate: o.discount_rate, extraExpense: o.extra_expense, notes: o.notes || '',
            orderDate: o.order_date, paymentStatus: o.payment_status, orderStatus: o.order_status,
            city: o.city || '', district: o.district || '',
            createdAt: o.created_at,
            items: (o.order_items || []).map((i: any) => ({
              id: i.id, productId: i.product_id, variantId: i.variant_id, quantity: i.quantity,
              unitSalePrice: i.unit_sale_price, unitCostPrice: i.unit_cost_price, isGift: i.is_gift
            }))
          })));
        }
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    };
    fetchData();
  }, []);

  // --- PRODUCTS ---
  const addProduct = useCallback((p: Omit<Product, 'id' | 'createdAt'>, newVariants?: Omit<ProductVariant, 'id' | 'productId'>[]) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const newP: Product = { ...p, id, createdAt };
    
    setProducts(prev => [...prev, newP]); // Optimistic Local Update

    supabase.from('products').insert({
      id, name: p.name, sku: p.sku, category: p.category, sale_price: p.salePrice,
      cost_price: p.costPrice, notes: p.notes, active: p.active, created_at: createdAt
    }).then(({ error }) => { if (error) toast.error("Supabase Error: " + error.message); });

    if (newVariants && newVariants.length > 0) {
      const createdV = newVariants.map(v => ({ ...v, id: generateId(), productId: id }));
      setVariants(prev => [...prev, ...createdV]); // Optimistic Local Update
      
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

  // --- VARIANTS ---
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
      cost_price_override: v.costPriceOverride, sale_price_override: v.salePriceOverride
    }).eq('id', v.id).then();
  }, []);

  const deleteVariant = useCallback((id: string) => {
    setVariants(prev => prev.filter(x => x.id !== id));
    supabase.from('product_variants').delete().eq('id', id).then();
  }, []);

  // --- ORDERS ---
  const addOrder = useCallback((o: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => {
    const id = generateId();
    const orderNumber = generateOrderNumber();
    const createdAt = new Date().toISOString();
    const newO: Order = { ...o, id, orderNumber, createdAt };
    
    setVariants(prev => prev.map(v => {
      const item = newO.items.find(i => i.variantId === v.id);
      return item ? { ...v, stock: v.stock - item.quantity } : v;
    }));
    setOrders(prev => [newO, ...prev]);

    supabase.from('orders').insert({
      id, order_number: orderNumber, tax_rate: o.taxRate, shipping_cost: o.shippingCost,
      packaging_cost: o.packagingCost, payment_commission_rate: o.paymentCommissionRate,
      payment_commission_fixed: o.paymentCommissionFixed, shopify_commission_rate: o.shopifyCommissionRate,
      shopify_commission_fixed: o.shopifyCommissionFixed, discount_amount: o.discountAmount,
      discount_rate: o.discountRate, extra_expense: o.extraExpense, notes: o.notes,
      order_date: o.orderDate, payment_status: o.paymentStatus || 'beklemede', order_status: o.orderStatus || 'yeni',
      city: o.city, district: o.district,
      created_at: createdAt
    }).then(({error}) => {
      if (error) { toast.error("Sipariş Veritabanına Kaydedilemedi!"); return; }
      
      if (o.items.length > 0) {
        const itemInserts = o.items.map(i => ({
          id: generateId(), order_id: id, product_id: i.productId, variant_id: i.variantId,
          quantity: i.quantity, unit_sale_price: i.unitSalePrice, unit_cost_price: i.unitCostPrice, is_gift: i.isGift
        }));
        supabase.from('order_items').insert(itemInserts).then();
        
        // Supabase tarafında satılan ürün stoklarını düşür
        o.items.forEach(async item => {
          const latestV = await supabase.from('product_variants').select('stock').eq('id', item.variantId).single();
          if (latestV.data) {
            supabase.from('product_variants').update({ stock: latestV.data.stock - item.quantity }).eq('id', item.variantId).then();
          }
        });
      }
    });

    return newO;
  }, []);

  const updateOrder = useCallback((o: Order) => {
    setOrders(prev => prev.map(x => x.id === o.id ? o : x));
    supabase.from('orders').update({
       tax_rate: o.taxRate, shipping_cost: o.shippingCost, payment_status: o.paymentStatus || 'beklemede',
       order_status: o.orderStatus || 'yeni', notes: o.notes, city: o.city, district: o.district
    }).eq('id', o.id).then();
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders(prev => {
      const order = prev.find(x => x.id === id);
      if (order) {
        setVariants(vPrev => vPrev.map(v => {
          const item = order.items.find(i => i.variantId === v.id);
          return item ? { ...v, stock: v.stock + item.quantity } : v;
        }));
      }
      return prev.filter(x => x.id !== id);
    });
    
    // Stokları DB'de geri yükle
    supabase.from('order_items').select('*').eq('order_id', id).then(({ data }) => {
       if (data) {
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
          supabase.from('settings').update({
            language: next.language, currency: next.currency, currency_symbol: next.currencySymbol,
            default_tax_rate: next.defaultTaxRate, business_name: next.businessName,
            business_address: next.businessAddress, business_phone: next.businessPhone,
            business_email: next.businessEmail, categories: next.categories, competitors: next.competitors,
            default_payment_commission_rate: next.defaultPaymentCommissionRate,
            default_payment_commission_fixed: next.defaultPaymentCommissionFixed,
            default_shopify_commission_rate: next.defaultShopifyCommissionRate,
            default_shopify_commission_fixed: next.defaultShopifyCommissionFixed
          }).eq('id', data.id).then();
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

  // --- HELPERS ---
  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);
  const getVariant = useCallback((id: string) => variants.find(v => v.id === id), [variants]);
  const getVariantsForProduct = useCallback((productId: string) => variants.filter(v => v.productId === productId), [variants]);

  return (
    <AppContext.Provider value={{
      products, variants, orders, expenses, settings, competitorAds, competitorProfiles,
      addProduct, updateProduct, deleteProduct, deleteProducts,
      addVariant, updateVariant, deleteVariant,
      addOrder, updateOrder, deleteOrder, deleteOrders,
      addExpense, updateExpense, deleteExpense, deleteExpenses,
      updateSettings, getProduct, getVariant, getVariantsForProduct,
      addCompetitorAd, updateCompetitorAd, deleteCompetitorAd, deleteCompetitorAds,
      addCompetitorProfile, updateCompetitorProfile, deleteCompetitorProfile, deleteCompetitorProfiles,
    }}>
      {children}
    </AppContext.Provider>
  );
}
