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
  company_id TEXT,
  company_name TEXT,
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

ALTER TABLE official_invoices ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE official_invoices ADD COLUMN IF NOT EXISTS company_name TEXT;

-- 11. COMPETITOR TRACKING
CREATE TABLE IF NOT EXISTS competitor_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  competitors TEXT[] DEFAULT '{}',
  ad_count INTEGER DEFAULT 1,
  ad_type TEXT,
  in_stock BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_name TEXT NOT NULL,
  creative_count INTEGER DEFAULT 0,
  price_range TEXT,
  strategy TEXT,
  products_note TEXT,
  ad_library_url TEXT,
  website_url TEXT,
  instagram_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ORTAK CARİLERİ & ŞAHIS KARTLARI
CREATE TABLE IF NOT EXISTS partner_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  share_percentage DECIMAL(5,2) DEFAULT 50.00,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  partner_id TEXT NOT NULL REFERENCES partner_accounts(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  card_name TEXT,
  type TEXT NOT NULL, -- 'harcama', 'faiz', 'geri_odeme'
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  invoice_status TEXT DEFAULT 'faturali', -- 'faturali', 'faturasiz'
  invoice_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kolon güncellemeleri
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS returned_quantity INTEGER DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS restock_returned BOOLEAN DEFAULT true;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS custom_refund_amount DECIMAL(12,2);

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
ALTER TABLE competitor_ads DISABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE partner_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transactions DISABLE ROW LEVEL SECURITY;

-- Varsayılan Ortak Tanımları
INSERT INTO partner_accounts (id, name, share_percentage, notes)
VALUES 
  ('part_1', 'Emre Asan', 50.00, 'Facebook, Kargo ve Vergi Ödemeleri'),
  ('part_2', 'Mustafa Atar', 50.00, 'Diğer Şahsi Kart İşlemleri')
ON CONFLICT (id) DO NOTHING;

-- Varsayılan Cari & Kart Hareketleri (Ağustos - Ekim)
INSERT INTO partner_transactions (id, date, partner_id, partner_name, card_name, type, category, description, amount, invoice_status, created_at)
VALUES
  ('pt_1', '2026-08-15', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Facebook Ads', 'Ağustos Facebook Reklam Harcaması', 422796.29, 'faturali', '2026-08-15T10:00:00Z'),
  ('pt_2', '2026-09-15', 'part_1', 'Emre Asan', 'Şirket Akbank Hesabı ➔ Karta Transfer', 'geri_odeme', 'Nakit Reimbursement', '15 Eylül Şirketten Şahıs Kredisine Ödeme', 100000.00, 'faturali', '2026-09-15T14:30:00Z'),
  ('pt_3', '2026-09-20', 'part_1', 'Emre Asan', 'Şirket Akbank Hesabı ➔ Karta Transfer', 'geri_odeme', 'Nakit Reimbursement', '20 Eylül Şirketten Şahıs Kredisine Ödeme', 62000.00, 'faturali', '2026-09-20T11:15:00Z'),
  ('pt_4', '2026-09-23', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'faiz', 'Kart Ekstre Faizi', '23 Eylül Ekstre Kalan Borç Akdi/Gecikme Faizi', 12500.00, 'faturasiz', '2026-09-23T09:00:00Z'),
  ('pt_5', '2026-09-23', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Facebook Ads', 'Eylül Facebook Reklam Harcaması', 426577.34, 'faturali', '2026-09-23T12:00:00Z'),
  ('pt_6', '2026-09-24', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Kargo & Lojistik', 'Aras Kargo Eylül Faturası', 15250.00, 'faturali', '2026-09-24T10:00:00Z'),
  ('pt_7', '2026-09-25', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Ürün Tedarik', 'Bernato Ürün Alımı', 44985.00, 'faturali', '2026-09-25T14:00:00Z'),
  ('pt_8', '2026-09-25', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Yazılım & Altyapı', 'E-imza Yenileme Bedeli', 2199.00, 'faturali', '2026-09-25T15:30:00Z'),
  ('pt_9', '2026-09-26', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Ambalaj & Malzeme', 'Gipaş Koli ve Paket Malzemesi', 3876.00, 'faturasiz', '2026-09-26T11:00:00Z'),
  ('pt_10', '2026-09-26', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Yazılım & Altyapı', 'Uyumsoft E-fatura Entegrasyon', 15000.00, 'faturali', '2026-09-26T16:00:00Z'),
  ('pt_11', '2026-09-27', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Kargo & Lojistik', 'PTT Kargo Gönderim Bedeli', 1115.00, 'faturasiz', '2026-09-27T10:00:00Z'),
  ('pt_12', '2026-10-02', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Vergi & Resmi Harç', 'KDV Ödemesi (Şahıs Kartından Çekilen)', 33688.13, 'faturali', '2026-10-02T09:30:00Z'),
  ('pt_13', '2026-10-05', 'part_1', 'Emre Asan', 'Garanti Miles&Smiles (Şahıs)', 'harcama', 'Kargo & Lojistik', 'Aras Kargo Ekim Faturası', 34706.20, 'faturali', '2026-10-05T14:00:00Z')
ON CONFLICT (id) DO NOTHING;
