import { useState, useMemo, useEffect, useCallback } from "react";
import { PartnerAccount, PartnerTransaction } from "@/types";
import { formatCurrency, formatDate, generateId } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, Search, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, 
  CreditCard as CreditCardIcon, Users, RefreshCw, FileText, CheckCircle2,
  TrendingUp, TrendingDown, Receipt, ShieldAlert, Filter
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Real-world sample data based on user's exact case
const INITIAL_PARTNERS: PartnerAccount[] = [
  { id: 'part_1', name: 'Emre Asan', notes: 'Facebook, Kargo ve Vergi Ödemeleri', createdAt: '2026-08-01' },
  { id: 'part_2', name: 'Mustafa Atar', notes: 'Diğer Şahsi Kart İşlemleri', createdAt: '2026-08-01' }
];

const DEMO_TRANSACTIONS: PartnerTransaction[] = [
  {
    id: 'pt_1',
    date: '2026-08-15',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Facebook Ads',
    description: 'Ağustos Facebook Reklam Harcaması',
    amount: 422796.29,
    invoiceStatus: 'faturali',
    createdAt: '2026-08-15T10:00:00Z'
  },
  {
    id: 'pt_2',
    date: '2026-09-15',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Şirket Akbank Hesabı ➔ Karta Transfer',
    type: 'geri_odeme',
    category: 'Nakit Reimbursement',
    description: '15 Eylül Şirketten Şahıs Kredisine Ödeme',
    amount: 100000.00,
    invoiceStatus: 'faturali',
    createdAt: '2026-09-15T14:30:00Z'
  },
  {
    id: 'pt_3',
    date: '2026-09-20',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Şirket Akbank Hesabı ➔ Karta Transfer',
    type: 'geri_odeme',
    category: 'Nakit Reimbursement',
    description: '20 Eylül Şirketten Şahıs Kredisine Ödeme',
    amount: 62000.00,
    invoiceStatus: 'faturali',
    createdAt: '2026-09-20T11:15:00Z'
  },
  {
    id: 'pt_4',
    date: '2026-09-23',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'faiz',
    category: 'Kart Ekstre Faizi',
    description: '23 Eylül Ekstre Kalan Borç Akdi/Gecikme Faizi',
    amount: 12500.00,
    invoiceStatus: 'faturasiz',
    createdAt: '2026-09-23T09:00:00Z'
  },
  {
    id: 'pt_5',
    date: '2026-09-23',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Facebook Ads',
    description: 'Eylül Facebook Reklam Harcaması',
    amount: 426577.34,
    invoiceStatus: 'faturali',
    createdAt: '2026-09-23T12:00:00Z'
  },
  {
    id: 'pt_6',
    date: '2026-09-24',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Kargo & Lojistik',
    description: 'Aras Kargo Eylül Faturası',
    amount: 15250.00,
    invoiceStatus: 'faturali',
    createdAt: '2026-09-24T10:00:00Z'
  },
  {
    id: 'pt_7',
    date: '2026-09-25',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Ürün Tedarik',
    description: 'Bernato Ürün Alımı',
    amount: 44985.00,
    invoiceStatus: 'faturali',
    createdAt: '2026-09-25T14:00:00Z'
  },
  {
    id: 'pt_8',
    date: '2026-09-25',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Yazılım & Altyapı',
    description: 'E-imza Yenileme Bedeli',
    amount: 2199.00,
    invoiceStatus: 'faturali',
    createdAt: '2026-09-25T15:30:00Z'
  },
  {
    id: 'pt_9',
    date: '2026-09-26',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Ambalaj & Malzeme',
    description: 'Gipaş Koli ve Paket Malzemesi',
    amount: 3876.00,
    invoiceStatus: 'faturasiz',
    createdAt: '2026-09-26T11:00:00Z'
  },
  {
    id: 'pt_10',
    date: '2026-09-26',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Yazılım & Altyapı',
    description: 'Uyumsoft E-fatura Entegrasyon',
    amount: 15000.00,
    invoiceStatus: 'faturali',
    createdAt: '2026-09-26T16:00:00Z'
  },
  {
    id: 'pt_11',
    date: '2026-09-27',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Kargo & Lojistik',
    description: 'PTT Kargo Gönderim Bedeli',
    amount: 1115.00,
    invoiceStatus: 'faturasiz',
    createdAt: '2026-09-27T10:00:00Z'
  },
  {
    id: 'pt_12',
    date: '2026-10-02',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Vergi & Resmi Harç',
    description: 'KDV Ödemesi (Şahıs Kartından Çekilen)',
    amount: 33688.13,
    invoiceStatus: 'faturali',
    createdAt: '2026-10-02T09:30:00Z'
  },
  {
    id: 'pt_13',
    date: '2026-10-05',
    partnerId: 'part_1',
    partnerName: 'Emre Asan',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    type: 'harcama',
    category: 'Kargo & Lojistik',
    description: 'Aras Kargo Ekim Faturası',
    amount: 34706.20,
    invoiceStatus: 'faturali',
    createdAt: '2026-10-05T14:00:00Z'
  }
];

export function PartnerLedgerTab() {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<PartnerAccount[]>(() => {
    const saved = localStorage.getItem('partner_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: PartnerAccount) => {
            if (p.id === 'part_1' || p.name.includes('Ortak A')) return { ...p, name: 'Emre Asan' };
            if (p.id === 'part_2' || p.name.includes('Ortak B')) return { ...p, name: 'Mustafa Atar' };
            return p;
          });
        }
      } catch (e) {}
    }
    return INITIAL_PARTNERS;
  });

  const [transactions, setTransactions] = useState<PartnerTransaction[]>(() => {
    const saved = localStorage.getItem('partner_transactions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: PartnerTransaction) => {
            if (t.partnerId === 'part_1' || t.partnerName.includes('Ortak A')) return { ...t, partnerName: 'Emre Asan' };
            if (t.partnerId === 'part_2' || t.partnerName.includes('Ortak B')) return { ...t, partnerName: 'Mustafa Atar' };
            return t;
          });
        }
      } catch (e) {}
    }
    return DEMO_TRANSACTIONS;
  });

  const loadFromSupabase = useCallback(async (showToast = false) => {
    try {
      setLoading(true);

      // 1. Fetch Partners
      const { data: pData, error: pErr } = await supabase
        .from('partner_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (!pErr && pData && pData.length > 0) {
        const loadedPartners: PartnerAccount[] = pData.map((p: any) => ({
          id: p.id,
          name: p.name,
          sharePercentage: p.share_percentage ? Number(p.share_percentage) : 50,
          phone: p.phone || '',
          notes: p.notes || '',
          createdAt: p.created_at
        }));
        setPartners(loadedPartners);
        localStorage.setItem('partner_accounts', JSON.stringify(loadedPartners));
      } else if (!pErr) {
        const seedPartners = INITIAL_PARTNERS.map(p => ({
          id: p.id,
          name: p.name,
          share_percentage: p.sharePercentage || 50,
          notes: p.notes || '',
          created_at: p.createdAt || new Date().toISOString()
        }));
        await supabase.from('partner_accounts').upsert(seedPartners);
      }

      // 2. Fetch Transactions
      const { data: tData, error: tErr } = await supabase
        .from('partner_transactions')
        .select('*')
        .order('date', { ascending: true });

      if (!tErr && tData && tData.length > 0) {
        const loadedTxs: PartnerTransaction[] = tData.map((t: any) => ({
          id: t.id,
          date: t.date,
          partnerId: t.partner_id,
          partnerName: t.partner_name,
          cardName: t.card_name || 'Şahıs Kredi Kartı',
          type: t.type,
          category: t.category,
          description: t.description,
          amount: Number(t.amount),
          invoiceStatus: t.invoice_status || 'faturali',
          invoiceNo: t.invoice_no || '',
          notes: t.notes || '',
          createdAt: t.created_at
        }));
        setTransactions(loadedTxs);
        localStorage.setItem('partner_transactions', JSON.stringify(loadedTxs));
        if (showToast) toast.success(`${loadedTxs.length} adet cari işlem Supabase'den çekildi!`);
      } else if (!tErr && (!tData || tData.length === 0)) {
        // Veritabanında henüz işlem yoksa, mevcut verileri aktar
        const localSaved = localStorage.getItem('partner_transactions');
        let toUploadTxs = DEMO_TRANSACTIONS;
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) toUploadTxs = parsed;
          } catch (e) {}
        }
        const dbRows = toUploadTxs.map(t => ({
          id: t.id,
          date: t.date,
          partner_id: t.partnerId,
          partner_name: t.partnerName,
          card_name: t.cardName || 'Şahıs Kredi Kartı',
          type: t.type,
          category: t.category,
          description: t.description,
          amount: t.amount,
          invoice_status: t.invoiceStatus || 'faturali',
          invoice_no: t.invoiceNo || null,
          notes: t.notes || null,
          created_at: t.createdAt || new Date().toISOString()
        }));
        await supabase.from('partner_transactions').upsert(dbRows);
        setTransactions(toUploadTxs);
        if (showToast) toast.success("Veriler veritabanı ile eşitlendi!");
      } else if (tErr) {
        console.warn("Supabase fetch partner error:", tErr);
        if (showToast) toast.error("Veritabanı bağlantı hatası: " + tErr.message);
      }
    } catch (e) {
      console.error(e);
      if (showToast) toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromSupabase(false);
  }, [loadFromSupabase]);

  useEffect(() => {
    localStorage.setItem('partner_accounts', JSON.stringify(partners));
  }, [partners]);

  useEffect(() => {
    localStorage.setItem('partner_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Filters
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedInvoiceFilter, setSelectedInvoiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog States
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<'harcama' | 'faiz' | 'geri_odeme'>('harcama');
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().split('T')[0],
    partnerId: partners[0]?.id || '',
    cardName: 'Garanti Miles&Smiles (Şahıs)',
    category: 'Facebook Ads',
    description: '',
    amount: '',
    invoiceStatus: 'faturali' as 'faturali' | 'faturasiz'
  });

  // Calculate Running Balances and Summaries
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  // Compute stats per partner and global totals
  const partnerStats = useMemo(() => {
    const stats: Record<string, { totalSpend: number; totalInterest: number; totalRepaid: number; netBalance: number; invoicedSpend: number; nonInvoicedSpend: number }> = {};
    
    partners.forEach(p => {
      stats[p.id] = { totalSpend: 0, totalInterest: 0, totalRepaid: 0, netBalance: 0, invoicedSpend: 0, nonInvoicedSpend: 0 };
    });

    sortedTransactions.forEach(t => {
      if (!stats[t.partnerId]) {
        stats[t.partnerId] = { totalSpend: 0, totalInterest: 0, totalRepaid: 0, netBalance: 0, invoicedSpend: 0, nonInvoicedSpend: 0 };
      }
      const isFaturali = (t.invoiceStatus || 'faturali') === 'faturali';

      if (t.type === 'harcama') {
        stats[t.partnerId].totalSpend += t.amount;
        stats[t.partnerId].netBalance += t.amount;
        if (isFaturali) stats[t.partnerId].invoicedSpend += t.amount;
        else stats[t.partnerId].nonInvoicedSpend += t.amount;
      } else if (t.type === 'faiz') {
        stats[t.partnerId].totalInterest += t.amount;
        stats[t.partnerId].netBalance += t.amount;
        stats[t.partnerId].nonInvoicedSpend += t.amount;
      } else if (t.type === 'geri_odeme') {
        stats[t.partnerId].totalRepaid += t.amount;
        stats[t.partnerId].netBalance -= t.amount;
      }
    });

    return stats;
  }, [partners, sortedTransactions]);

  const globalTotals = useMemo(() => {
    let totalSpend = 0;
    let totalInterest = 0;
    let totalRepaid = 0;
    let totalNetBalance = 0;
    let totalInvoiced = 0;
    let totalNonInvoiced = 0;

    Object.values(partnerStats).forEach(s => {
      totalSpend += s.totalSpend;
      totalInterest += s.totalInterest;
      totalRepaid += s.totalRepaid;
      totalNetBalance += s.netBalance;
      totalInvoiced += s.invoicedSpend;
      totalNonInvoiced += s.nonInvoicedSpend;
    });

    return { totalSpend, totalInterest, totalRepaid, totalNetBalance, totalInvoiced, totalNonInvoiced };
  }, [partnerStats]);

  // Ledger Table List with Cumulative Balance Calculation
  const ledgerRows = useMemo(() => {
    let runningBalanceMap: Record<string, number> = {};
    partners.forEach(p => { runningBalanceMap[p.id] = 0; });
    let globalRunningBalance = 0;

    const rowsWithBalance = sortedTransactions.map(tx => {
      const amt = tx.amount;
      if (tx.type === 'harcama' || tx.type === 'faiz') {
        runningBalanceMap[tx.partnerId] = (runningBalanceMap[tx.partnerId] || 0) + amt;
        globalRunningBalance += amt;
      } else {
        runningBalanceMap[tx.partnerId] = (runningBalanceMap[tx.partnerId] || 0) - amt;
        globalRunningBalance -= amt;
      }

      return {
        ...tx,
        partnerRunningBalance: runningBalanceMap[tx.partnerId] || 0,
        globalRunningBalance
      };
    });

    // Apply Filters
    let filtered = rowsWithBalance;

    // 1. Partner Filter
    if (selectedPartnerId !== 'all') {
      filtered = filtered.filter(r => r.partnerId === selectedPartnerId);
    }

    // 2. Type Filter (Harcama, Faiz, Geri Ödeme)
    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType);
    }

    // 3. Invoice Filter (Faturalı, Faturasız)
    if (selectedInvoiceFilter !== 'all') {
      filtered = filtered.filter(r => (r.invoiceStatus || 'faturali') === selectedInvoiceFilter);
    }

    // 4. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.description.toLowerCase().includes(q) || 
        r.category.toLowerCase().includes(q) ||
        (r.cardName || '').toLowerCase().includes(q) ||
        r.partnerName.toLowerCase().includes(q)
      );
    }

    return filtered.reverse();
  }, [sortedTransactions, partners, selectedPartnerId, selectedType, selectedInvoiceFilter, searchQuery]);

  // Handlers
  const handleOpenAddDialog = (type: 'harcama' | 'faiz' | 'geri_odeme') => {
    setTxType(type);
    setTxForm({
      date: new Date().toISOString().split('T')[0],
      partnerId: selectedPartnerId !== 'all' ? selectedPartnerId : (partners[0]?.id || ''),
      cardName: type === 'geri_odeme' ? 'Şirket Banka Hesabı (Ödeme Yapıldı)' : 'Garanti Miles&Smiles (Şahıs Kartı)',
      category: type === 'harcama' ? 'Facebook Ads' : type === 'faiz' ? 'Kart Ekstre Faizi' : 'Nakit Reimbursement',
      description: '',
      amount: '',
      invoiceStatus: type === 'faiz' ? 'faturasiz' : 'faturali'
    });
    setTxDialogOpen(true);
  };

  const handleSaveTransaction = async () => {
    const amt = parseFloat(txForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Geçerli bir tutar giriniz');
      return;
    }
    if (!txForm.description.trim()) {
      toast.error('Açıklama alanı boş bırakılamaz');
      return;
    }

    const partner = partners.find(p => p.id === txForm.partnerId);
    const newTx: PartnerTransaction = {
      id: generateId(),
      date: txForm.date,
      partnerId: txForm.partnerId,
      partnerName: partner ? partner.name : 'Bilinmeyen Ortak',
      cardName: txForm.cardName,
      type: txType,
      category: txForm.category,
      description: txForm.description.trim(),
      amount: amt,
      invoiceStatus: txForm.invoiceStatus,
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [...prev, newTx]);
    setTxDialogOpen(false);
    toast.success('Cari hareket başarıyla kaydedildi!');

    const { error } = await supabase.from('partner_transactions').insert({
      id: newTx.id,
      date: newTx.date,
      partner_id: newTx.partnerId,
      partner_name: newTx.partnerName,
      card_name: newTx.cardName,
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
      amount: newTx.amount,
      invoice_status: newTx.invoiceStatus,
      created_at: newTx.createdAt
    });

    if (error) {
      console.error("Supabase insert error:", error);
      toast.error("Veritabanına kayıt edilemedi: " + error.message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Bu cari hareketi silmek istediğinize emin misiniz?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Hareket silindi.');

      const { error } = await supabase.from('partner_transactions').delete().eq('id', id);
      if (error) {
        console.error("Supabase delete error:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-6 text-white border border-emerald-500/20 shadow-xl">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-semibold px-3 py-1">
                ORTAK CARİ HESAP TAKİBİ
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                Şahıs Kredi Kartı Reimbursement
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Ortak Şahıs Kartları ve Şirket Borç Takibi
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Şahıs kredi kartlarından çekilen Facebook ads, kargo, yazılım ve vergi harcamaları ile kart faizleri ve şirketten yapılan geri ödemeler dökümü.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button 
              onClick={() => loadFromSupabase(true)}
              variant="outline"
              size="sm"
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 text-xs backdrop-blur-md"
              title="Buluttaki en güncel kayıtları çek ve senkronize et"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Eşitleniyor...' : 'Bulutla Eşitle'}</span>
            </Button>

            <Button
              onClick={() => handleOpenAddDialog('harcama')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs font-medium shadow-md shadow-emerald-900/50"
            >
              <Plus className="h-4 w-4" />
              <span>+ Kart Harcaması Ekle</span>
            </Button>

            <Button
              onClick={() => handleOpenAddDialog('geri_odeme')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-medium shadow-md shadow-indigo-900/50"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>+ Şirketten Ödeme Yap</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Global Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Net Owed to Partners */}
        <Card className="border border-emerald-500/30 bg-card/80 backdrop-blur shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs font-medium flex items-center justify-between text-muted-foreground">
              <span>ŞİRKETİN ORTAKLARA NET BORCU</span>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
              {formatCurrency(globalTotals.totalNetBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-[11px] text-muted-foreground">
              Şahıs kartlarından harcanan net ödenmemiş tutar.
            </p>
          </CardContent>
        </Card>

        {/* Total Spend via Personal Cards */}
        <Card className="border border-border/60 bg-card/80 backdrop-blur shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs font-medium flex items-center justify-between text-muted-foreground">
              <span>ŞAHIS KART HARCAMALARI</span>
              <Receipt className="h-4 w-4 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground tracking-tight mt-1">
              {formatCurrency(globalTotals.totalSpend)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">🧾 Faturalı: {formatCurrency(globalTotals.totalInvoiced)}</span>
            <span className="text-amber-600 font-semibold">📄 Faturasız: {formatCurrency(globalTotals.totalNonInvoiced)}</span>
          </CardContent>
        </Card>

        {/* Total Interest / Financing Expenses */}
        <Card className="border border-amber-500/20 bg-card/80 backdrop-blur shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs font-medium flex items-center justify-between text-muted-foreground">
              <span>KART FAİZİ (FİNANSMAN GİDERİ)</span>
              <ShieldAlert className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight mt-1">
              {formatCurrency(globalTotals.totalInterest)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Ekstre gecikme/akdi faizleri
            </p>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => handleOpenAddDialog('faiz')}
              className="h-6 text-[10px] px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              + Faiz Girişi
            </Button>
          </CardContent>
        </Card>

        {/* Total Repaid by Company */}
        <Card className="border border-indigo-500/20 bg-card/80 backdrop-blur shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs font-medium flex items-center justify-between text-muted-foreground">
              <span>ŞİRKETTEN GERİ ÖDENEN</span>
              <ArrowDownLeft className="h-4 w-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight mt-1">
              {formatCurrency(globalTotals.totalRepaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-[11px] text-muted-foreground">
              Şirket hesabından karta atılan ödemeler
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Partner Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners.map(p => {
          const stats = partnerStats[p.id] || { totalSpend: 0, totalInterest: 0, totalRepaid: 0, netBalance: 0, invoicedSpend: 0, nonInvoicedSpend: 0 };
          const repaidPercent = stats.totalSpend + stats.totalInterest > 0 
            ? Math.min(100, Math.round((stats.totalRepaid / (stats.totalSpend + stats.totalInterest)) * 100))
            : 0;

          const isSelected = selectedPartnerId === p.id;

          return (
            <Card 
              key={p.id} 
              onClick={() => setSelectedPartnerId(isSelected ? 'all' : p.id)}
              className={`border transition-all cursor-pointer relative overflow-hidden ${
                isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5' : 'border-border/80 hover:border-emerald-500/50 shadow-sm'
              }`}
            >
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">{p.name}</CardTitle>
                      <CardDescription className="text-xs">{p.notes || 'Ortak Cari Hesabı'}</CardDescription>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-emerald-600 text-white text-[11px]">Filtrelendi</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Şirketin {p.name}'e Borcu</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.netBalance)}</p>
                  </div>
                  <CreditCardIcon className="h-8 w-8 text-emerald-500 opacity-60" />
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                    <p className="text-muted-foreground text-[10px]">Harcama</p>
                    <p className="font-bold text-foreground mt-0.5">{formatCurrency(stats.totalSpend)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-600 dark:text-emerald-400 text-[10px]">🧾 Faturalı</p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{formatCurrency(stats.invoicedSpend)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-600 dark:text-amber-400 text-[10px]">📄 Faturasız</p>
                    <p className="font-bold text-amber-700 dark:text-amber-300 mt-0.5">{formatCurrency(stats.nonInvoicedSpend)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-indigo-600 dark:text-indigo-400 text-[10px]">Ödenen</p>
                    <p className="font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">{formatCurrency(stats.totalRepaid)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Geri Ödenme Oranı</span>
                    <span className="font-semibold text-foreground">%{repaidPercent}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500" 
                      style={{ width: `${repaidPercent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transactions Table Section */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>Cari Hareket Dökümü</span>
                <Badge variant="outline" className="text-xs font-normal">
                  {ledgerRows.length} İşlem
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Ortak, işlem tipi ve fatura durumuna göre zaman sıralı döküm ve kümülatif borç takibi
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-44">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Ara (FB, Aras, Vergi)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Ortak Filtresi */}
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger className="w-40 h-9 text-xs font-medium">
                  <SelectValue placeholder="Ortak Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">👥 Tüm Ortaklar</SelectItem>
                  {partners.map(p => (
                    <SelectItem key={p.id} value={p.id}>👤 {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* İşlem Tipi Filtresi */}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue placeholder="İşlem Tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tipler</SelectItem>
                  <SelectItem value="harcama">💳 Harcama (+Borç)</SelectItem>
                  <SelectItem value="faiz">⚠️ Kart Faizi (+Borç)</SelectItem>
                  <SelectItem value="geri_odeme">↩️ Geri Ödeme (-Borç)</SelectItem>
                </SelectContent>
              </Select>

              {/* Fatura Durumu Filtresi */}
              <Select value={selectedInvoiceFilter} onValueChange={setSelectedInvoiceFilter}>
                <SelectTrigger className="w-36 h-9 text-xs font-medium">
                  <SelectValue placeholder="Fatura Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Fatura Durumları</SelectItem>
                  <SelectItem value="faturali">🧾 Faturalı İşlemler</SelectItem>
                  <SelectItem value="faturasiz">📄 Faturasız İşlemler</SelectItem>
                </SelectContent>
              </Select>

              {(selectedPartnerId !== 'all' || selectedType !== 'all' || selectedInvoiceFilter !== 'all' || searchQuery) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedPartnerId('all');
                    setSelectedType('all');
                    setSelectedInvoiceFilter('all');
                    setSearchQuery('');
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Sıfırla
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Ortak / Şahıs Kartı</th>
                  <th className="py-3 px-4">Fatura Durumu</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-4">İşlem Tipi</th>
                  <th className="py-3 px-4 text-right">İşlem Tutarı</th>
                  <th className="py-3 px-4 text-right">Kümülatif Şirket Borcu</th>
                  <th className="py-3 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Kayıtlı cari hareket bulunamadı.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map(row => {
                    const isSpend = row.type === 'harcama';
                    const isInterest = row.type === 'faiz';
                    const isRepay = row.type === 'geri_odeme';
                    const isFaturali = (row.invoiceStatus || 'faturali') === 'faturali';

                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground">{row.partnerName}</p>
                          <p className="text-[10px] text-muted-foreground">{row.cardName || 'Şahıs Kredi Kartı'}</p>
                        </td>

                        <td className="py-3 px-4">
                          {isFaturali ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                              <FileText className="h-3 w-3" /> Faturalı
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 font-semibold">
                              📄 Faturasız
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[11px] font-medium bg-background">
                            {row.category}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 max-w-xs font-normal text-foreground">
                          {row.description}
                        </td>

                        <td className="py-3 px-4">
                          {isSpend && (
                            <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-normal">
                              Harcama
                            </Badge>
                          )}
                          {isInterest && (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-normal">
                              Kart Faizi
                            </Badge>
                          )}
                          {isRepay && (
                            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-normal">
                              Geri Ödeme
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                          {isRepay ? (
                            <span className="text-indigo-600 dark:text-indigo-400">-{formatCurrency(row.amount)}</span>
                          ) : isInterest ? (
                            <span className="text-amber-600 dark:text-amber-400">+{formatCurrency(row.amount)}</span>
                          ) : (
                            <span className="text-foreground">+{formatCurrency(row.amount)}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-500/5">
                          {formatCurrency(selectedPartnerId !== 'all' ? row.partnerRunningBalance : row.globalRunningBalance)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteTransaction(row.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Action Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {txType === 'harcama' && <Receipt className="h-5 w-5 text-emerald-500" />}
              {txType === 'faiz' && <ShieldAlert className="h-5 w-5 text-amber-500" />}
              {txType === 'geri_odeme' && <ArrowDownLeft className="h-5 w-5 text-indigo-500" />}
              <span>
                {txType === 'harcama' && 'Şahıs Kartından Harcama Ekle'}
                {txType === 'faiz' && 'Kart Faiz / Finansman Gideri Ekle'}
                {txType === 'geri_odeme' && 'Şirketten Ortağa Ödeme Yap'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tarih</Label>
                <Input
                  type="date"
                  value={txForm.date}
                  onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">İlgili Ortak</Label>
                <Select value={txForm.partnerId} onValueChange={val => setTxForm({ ...txForm, partnerId: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Ortak seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kart / Ödeme Hesabı Adı</Label>
                <Input
                  placeholder="Örn: Garanti Bonus Kart (Şahıs)"
                  value={txForm.cardName}
                  onChange={e => setTxForm({ ...txForm, cardName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fatura Durumu</Label>
                <Select value={txForm.invoiceStatus} onValueChange={(val: any) => setTxForm({ ...txForm, invoiceStatus: val })}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue placeholder="Fatura Durumu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faturali">🧾 Faturalı İşlem</SelectItem>
                    <SelectItem value="faturasiz">📄 Faturasız / Belgesiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gider Kategorisi</Label>
                {txType === 'faiz' ? (
                  <Input value="Kart Ekstre Faizi" disabled className="h-9 text-xs bg-muted" />
                ) : txType === 'geri_odeme' ? (
                  <Input value="Nakit Reimbursement" disabled className="h-9 text-xs bg-muted" />
                ) : (
                  <Select value={txForm.category} onValueChange={val => setTxForm({ ...txForm, category: val })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facebook Ads">Facebook Ads (Meta)</SelectItem>
                      <SelectItem value="Kargo & Lojistik">Kargo & Lojistik</SelectItem>
                      <SelectItem value="Ürün Tedarik">Ürün Tedarik & Stok</SelectItem>
                      <SelectItem value="Yazılım & Altyapı">Yazılım & Altyapı</SelectItem>
                      <SelectItem value="Ambalaj & Malzeme">Ambalaj & Malzeme</SelectItem>
                      <SelectItem value="Vergi & Resmi Harç">Vergi & KDV Ödemesi</SelectItem>
                      <SelectItem value="Genel Giderler">Genel Giderler</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tutar (TL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txForm.amount}
                  onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                  className="h-9 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Açıklama</Label>
              <Input
                placeholder="Örn: Ağustos Sonu Facebook Ads çekimi"
                value={txForm.description}
                onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTxDialogOpen(false)} className="text-xs">
              İptal
            </Button>
            <Button size="sm" onClick={handleSaveTransaction} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
