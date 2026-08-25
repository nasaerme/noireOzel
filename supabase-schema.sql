-- Supabase Schema for Ürün Takip (r-takip)
-- Copy and run this script completely in the Supabase SQL Editor

-- 1. Create Tables

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  cost_price_override DECIMAL(12,2),
  sale_price_override DECIMAL(12,2)
);

-- EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  recurring BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT, -- 'gunluk', 'haftalik', 'aylik', 'yillik'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  packaging_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  payment_commission_fixed DECIMAL(12,2) NOT NULL DEFAULT 0,
  shopify_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  shopify_commission_fixed DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  extra_expense DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_status TEXT NOT NULL DEFAULT 'beklemede', -- 'beklemede', 'odendi', 'iptal', 'iade'
  order_status TEXT NOT NULL DEFAULT 'yeni', -- 'yeni', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal', 'iade'
  payment_method TEXT,
  cod_fee DECIMAL(12,2) DEFAULT 0,
  carrier_cod_fee DECIMAL(12,2) DEFAULT 0,
  carrier_cod_fee_type TEXT DEFAULT 'fixed',
  cancellation_reason TEXT,
  city TEXT,
  district TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_cod_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_cod_fee_type TEXT DEFAULT 'fixed';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS district TEXT;

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_gift BOOLEAN NOT NULL DEFAULT false
);

-- SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'tr',
  currency TEXT NOT NULL DEFAULT 'TRY',
  currency_symbol TEXT NOT NULL DEFAULT '₺',
  default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  categories TEXT[] DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  default_payment_commission_rate DECIMAL(5,2) DEFAULT 2.49,
  default_payment_commission_fixed DECIMAL(12,2) DEFAULT 0.25,
  default_shopify_commission_rate DECIMAL(5,2) DEFAULT 2.00,
  default_shopify_commission_fixed DECIMAL(12,2) DEFAULT 0.00,
  default_cash_on_delivery_fee DECIMAL(12,2) DEFAULT 100.00,
  default_online_cc_rate DECIMAL(5,2) DEFAULT 3.29,
  default_cod_cc_rate DECIMAL(5,2) DEFAULT 2.80,
  default_cod_cash_rate DECIMAL(5,2) DEFAULT 0.00,
  default_bank_transfer_rate DECIMAL(5,2) DEFAULT 0.00,
  default_carrier_cod_fee DECIMAL(12,2) DEFAULT 54.40,
  default_carrier_cod_fee_type TEXT DEFAULT 'fixed',
  shopify_store_url TEXT,
  shopify_access_token TEXT,
  shopify_webhook_secret TEXT
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS competitors TEXT[] DEFAULT '{}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_payment_commission_rate DECIMAL(5,2) DEFAULT 2.49;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_payment_commission_fixed DECIMAL(12,2) DEFAULT 0.25;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_shopify_commission_rate DECIMAL(5,2) DEFAULT 2.00;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_shopify_commission_fixed DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_cash_on_delivery_fee DECIMAL(12,2) DEFAULT 100.00;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_online_cc_rate DECIMAL(5,2) DEFAULT 3.29;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_cod_cc_rate DECIMAL(5,2) DEFAULT 2.80;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_cod_cash_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_bank_transfer_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_carrier_cod_fee DECIMAL(12,2) DEFAULT 54.40;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_carrier_cod_fee_type TEXT DEFAULT 'fixed';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shopify_store_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shopify_access_token TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shopify_webhook_secret TEXT;

-- CASH LEDGER
CREATE TABLE IF NOT EXISTS cash_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL, -- 'gelir' (inflow) or 'gider' (outflow)
  name TEXT NOT NULL, -- Brand/Person name
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== FİNANS & NAKİT AKIŞI YÖNETİMİ TABLOLARI ====================

-- 5. BANK ACCOUNTS (BANKA HESAPLARI)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  iban TEXT,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREDIT CARDS (KREDİ KARTLARI)
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  card_number_last4 TEXT,
  total_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_debt DECIMAL(12,2) NOT NULL DEFAULT 0,
  cutoff_day INTEGER DEFAULT 15,
  due_day INTEGER DEFAULT 25,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUPPLIER INVOICES (STOK & TEDARİK ALIMLARI)
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name TEXT NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'product',
  items_summary TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  source_account_id UUID,
  invoice_file TEXT,
  invoice_file_name TEXT,
  invoice_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'product';
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;
ALTER TABLE supplier_invoices ADD COLUMN IF NOT EXISTS total_tax DECIMAL(12,2) DEFAULT 0;

-- 8. EXPECTED PAYOUTS (VALÖRLÜ ALACAKLAR)
CREATE TABLE IF NOT EXISTS expected_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT,
  source TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  expected_payout_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  received_account_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. UPCOMING PAYABLES (GELECEK BORÇLAR)
CREATE TABLE IF NOT EXISTS upcoming_payables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_from_account_id UUID,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. OFFICIAL INVOICES (E-FATURA & ÖN MUHASEBE)
CREATE TABLE IF NOT EXISTS official_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_name TEXT NOT NULL,
  party_tax_id TEXT,
  description TEXT NOT NULL,
  category TEXT,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  invoice_file TEXT,
  invoice_file_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) policies completely for direct client access
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE expected_payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_payables DISABLE ROW LEVEL SECURITY;
ALTER TABLE official_invoices DISABLE ROW LEVEL SECURITY;
