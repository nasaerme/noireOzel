-- Supabase Schema for Ürün Takip (r-takip)
-- Copy and run this script completely in the Supabase SQL Editor

-- 1. Create Tables

-- PRODUCTS
CREATE TABLE products (
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
CREATE TABLE product_variants (
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
CREATE TABLE expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- EXPENSES
CREATE TABLE expenses (
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
CREATE TABLE orders (
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
  payment_status TEXT NOT NULL DEFAULT 'beklemede', -- 'beklemede', 'odendi', 'iptal'
  order_status TEXT NOT NULL DEFAULT 'yeni', -- 'yeni', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE order_items (
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
CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'tr',
  currency TEXT NOT NULL DEFAULT 'TRY',
  currency_symbol TEXT NOT NULL DEFAULT '₺',
  default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  categories TEXT[] DEFAULT '{}'
);

-- 2. Insert Default Settings (Only 1 row will primarily be used)
INSERT INTO settings (id, business_name) VALUES (gen_random_uuid(), 'Benim Şirketim');

-- 3. Set Up Security: Disable Row Level Security (RLS) policies completely for now since there's no Authentication module.
-- Anyone hitting the database endpoint with the anon key can read/write.
-- (This should be secured when you add login/auth features)

ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
