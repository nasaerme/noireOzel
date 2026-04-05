import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Product, ProductVariant, Order, Expense, Settings } from '@/types';
import { sampleProducts, sampleVariants, sampleOrders, sampleExpenses, defaultSettings } from '@/data/sample-data';
import { generateId, generateOrderNumber } from '@/utils/formatters';

interface AppContextType {
  products: Product[];
  variants: ProductVariant[];
  orders: Order[];
  expenses: Expense[];
  settings: Settings;
  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  addVariant: (v: Omit<ProductVariant, 'id'>) => ProductVariant;
  updateVariant: (v: ProductVariant) => void;
  deleteVariant: (id: string) => void;
  addOrder: (o: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => Order;
  updateOrder: (o: Order) => void;
  deleteOrder: (id: string) => void;
  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  getProduct: (id: string) => Product | undefined;
  getVariant: (id: string) => ProductVariant | undefined;
  getVariantsForProduct: (productId: string) => ProductVariant[];
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function loadState<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => loadState('app_products', sampleProducts));
  const [variants, setVariants] = useState<ProductVariant[]>(() => loadState('app_variants', sampleVariants));
  const [orders, setOrders] = useState<Order[]>(() => loadState('app_orders', sampleOrders));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('app_expenses', sampleExpenses));
  const [settings, setSettings] = useState<Settings>(() => loadState('app_settings', defaultSettings));

  const persist = useCallback((key: string, data: unknown) => saveState(key, data), []);

  const addProduct = useCallback((p: Omit<Product, 'id' | 'createdAt'>) => {
    const newP: Product = { ...p, id: generateId(), createdAt: new Date().toISOString() };
    setProducts(prev => { const next = [...prev, newP]; persist('app_products', next); return next; });
    return newP;
  }, [persist]);

  const updateProduct = useCallback((p: Product) => {
    setProducts(prev => { const next = prev.map(x => x.id === p.id ? p : x); persist('app_products', next); return next; });
  }, [persist]);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => { const next = prev.filter(x => x.id !== id); persist('app_products', next); return next; });
    setVariants(prev => { const next = prev.filter(x => x.productId !== id); persist('app_variants', next); return next; });
  }, [persist]);

  const addVariant = useCallback((v: Omit<ProductVariant, 'id'>) => {
    const newV: ProductVariant = { ...v, id: generateId() };
    setVariants(prev => { const next = [...prev, newV]; persist('app_variants', next); return next; });
    return newV;
  }, [persist]);

  const updateVariant = useCallback((v: ProductVariant) => {
    setVariants(prev => { const next = prev.map(x => x.id === v.id ? v : x); persist('app_variants', next); return next; });
  }, [persist]);

  const deleteVariant = useCallback((id: string) => {
    setVariants(prev => { const next = prev.filter(x => x.id !== id); persist('app_variants', next); return next; });
  }, [persist]);

  const addOrder = useCallback((o: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => {
    const newO: Order = { ...o, id: generateId(), orderNumber: generateOrderNumber(), createdAt: new Date().toISOString() };
    // Decrease stock
    setVariants(prev => {
      const next = prev.map(v => {
        const item = newO.items.find(i => i.variantId === v.id);
        if (item) return { ...v, stock: v.stock - item.quantity };
        return v;
      });
      persist('app_variants', next);
      return next;
    });
    setOrders(prev => { const next = [newO, ...prev]; persist('app_orders', next); return next; });
    return newO;
  }, [persist]);

  const updateOrder = useCallback((o: Order) => {
    setOrders(prev => {
      const oldOrder = prev.find(x => x.id === o.id);
      // Restore old stock, apply new
      if (oldOrder) {
        setVariants(vPrev => {
          let next = [...vPrev];
          oldOrder.items.forEach(item => {
            next = next.map(v => v.id === item.variantId ? { ...v, stock: v.stock + item.quantity } : v);
          });
          o.items.forEach(item => {
            next = next.map(v => v.id === item.variantId ? { ...v, stock: v.stock - item.quantity } : v);
          });
          persist('app_variants', next);
          return next;
        });
      }
      const next = prev.map(x => x.id === o.id ? o : x);
      persist('app_orders', next);
      return next;
    });
  }, [persist]);

  const deleteOrder = useCallback((id: string) => {
    setOrders(prev => {
      const order = prev.find(x => x.id === id);
      if (order) {
        setVariants(vPrev => {
          let next = [...vPrev];
          order.items.forEach(item => {
            next = next.map(v => v.id === item.variantId ? { ...v, stock: v.stock + item.quantity } : v);
          });
          persist('app_variants', next);
          return next;
        });
      }
      const next = prev.filter(x => x.id !== id);
      persist('app_orders', next);
      return next;
    });
  }, [persist]);

  const addExpense = useCallback((e: Omit<Expense, 'id' | 'createdAt'>) => {
    const newE: Expense = { ...e, id: generateId(), createdAt: new Date().toISOString() };
    setExpenses(prev => { const next = [newE, ...prev]; persist('app_expenses', next); return next; });
  }, [persist]);

  const updateExpense = useCallback((e: Expense) => {
    setExpenses(prev => { const next = prev.map(x => x.id === e.id ? e : x); persist('app_expenses', next); return next; });
  }, [persist]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => { const next = prev.filter(x => x.id !== id); persist('app_expenses', next); return next; });
  }, [persist]);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings(prev => { const next = { ...prev, ...s }; persist('app_settings', next); return next; });
  }, [persist]);

  const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);
  const getVariant = useCallback((id: string) => variants.find(v => v.id === id), [variants]);
  const getVariantsForProduct = useCallback((productId: string) => variants.filter(v => v.productId === productId), [variants]);

  return (
    <AppContext.Provider value={{
      products, variants, orders, expenses, settings,
      addProduct, updateProduct, deleteProduct,
      addVariant, updateVariant, deleteVariant,
      addOrder, updateOrder, deleteOrder,
      addExpense, updateExpense, deleteExpense,
      updateSettings, getProduct, getVariant, getVariantsForProduct,
    }}>
      {children}
    </AppContext.Provider>
  );
}
