import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { BankAccount, CreditCard, SupplierInvoice, SupplierInvoiceItem, ExpectedPayout, UpcomingPayable } from "@/types";
import { formatCurrency, formatDate, generateId } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Search, Edit2, Trash2, Wallet, ArrowUpRight, ArrowDownLeft, 
  Calendar, FileText, X, Building2, CreditCard as CreditCardIcon, 
  Clock, CheckCircle2, AlertCircle, Upload, Eye, Download, ShieldAlert,
  ArrowRightLeft, FileCheck, Layers, Check, ShoppingBag, ListPlus, Tag
} from "lucide-react";
import { toast } from "sonner";

export default function CashLedger() {
  const { 
    bankAccounts, creditCards, supplierInvoices, expectedPayouts, upcomingPayables,
    settings,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addCreditCard, updateCreditCard, deleteCreditCard,
    addSupplierInvoice, updateSupplierInvoice, deleteSupplierInvoice,
    addExpectedPayout, completeExpectedPayout, deleteExpectedPayout,
    addUpcomingPayable, payUpcomingPayable, deleteUpcomingPayable
  } = useApp();

  const sym = settings.currencySymbol;
  const [activeTab, setActiveTab] = useState("overview");

  // --- DIALOG STATES ---
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editBank, setEditBank] = useState<BankAccount | null>(null);
  const [bankForm, setBankForm] = useState({ name: '', bankName: '', iban: '', balance: 0, color: '#16a34a' });

  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editCard, setEditCard] = useState<CreditCard | null>(null);
  const [cardForm, setCardForm] = useState({ name: '', bankName: '', cardNumberLast4: '', totalLimit: 0, currentDebt: 0, cutoffDay: 15, dueDay: 25, color: '#dc2626' });

  // --- SUPPLIER INVOICE STATES ---
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SupplierInvoice | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    date: new Date().toISOString().split('T')[0],
    supplierName: '',
    invoiceType: 'product' as 'product' | 'other',
    singleDescription: '',
    singleAmount: 0,
    paymentMethod: 'cash' as 'cash' | 'bank_account' | 'credit_card',
    sourceAccountId: '',
    invoiceStatus: 'pending' as 'received' | 'pending',
    invoiceFile: '',
    invoiceFileName: '',
    notes: ''
  });

  const [supplierItems, setSupplierItems] = useState<SupplierInvoiceItem[]>([
    { id: generateId(), productName: '', quantity: 1, unitPrice: 0, taxRate: 10, unitPriceWithTax: 0, totalWithTax: 0 }
  ]);

  const [detailInvoice, setDetailInvoice] = useState<SupplierInvoice | null>(null);

  const [uploadInvoiceDialogOpen, setUploadInvoiceDialogOpen] = useState(false);
  const [selectedInvoiceForUpload, setSelectedInvoiceForUpload] = useState<SupplierInvoice | null>(null);
  const [tempFile, setTempFile] = useState<{ base64: string; name: string } | null>(null);

  const [payableDialogOpen, setPayableDialogOpen] = useState(false);
  const [payableForm, setPayableForm] = useState({
    title: '',
    category: 'fatura' as UpcomingPayable['category'],
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [payPayableDialogOpen, setPayPayableDialogOpen] = useState(false);
  const [selectedPayableToPay, setSelectedPayableToPay] = useState<UpcomingPayable | null>(null);
  const [payMethod, setPayMethod] = useState<'bank_account' | 'credit_card' | 'cash'>('bank_account');
  const [paySourceId, setPaySourceId] = useState('');

  const [completePayoutDialogOpen, setCompletePayoutDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<ExpectedPayout | null>(null);
  const [selectedPayoutBankId, setSelectedPayoutBankId] = useState('');

  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    orderNumber: '',
    source: 'paytr' as 'paytr' | 'kapida_odeme' | 'diger',
    amount: 0,
    orderDate: new Date().toISOString().split('T')[0],
    expectedPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  // --- CALCULATIONS ---
  const totals = useMemo(() => {
    const totalBankBalance = bankAccounts.reduce((s, b) => s + b.balance, 0);
    const totalCreditLimit = creditCards.reduce((s, c) => s + c.totalLimit, 0);
    const totalCreditDebt = creditCards.reduce((s, c) => s + c.currentDebt, 0);
    const availableCreditLimit = totalCreditLimit - totalCreditDebt;

    const pendingPayouts = expectedPayouts.filter(p => p.status === 'pending');
    const pendingValorsTotal = pendingPayouts.reduce((s, p) => s + p.amount, 0);
    const paytrTotal = pendingPayouts.filter(p => p.source === 'paytr').reduce((s, p) => s + p.amount, 0);
    const codTotal = pendingPayouts.filter(p => p.source === 'kapida_odeme').reduce((s, p) => s + p.amount, 0);

    const pendingPayables = upcomingPayables.filter(u => u.status === 'pending');
    const pendingPayablesTotal = pendingPayables.reduce((s, u) => s + u.amount, 0);

    const netLiquidity = (totalBankBalance + pendingValorsTotal) - pendingPayablesTotal;

    return {
      totalBankBalance,
      totalCreditLimit,
      totalCreditDebt,
      availableCreditLimit,
      pendingValorsTotal,
      pendingPayouts,
      paytrTotal,
      codTotal,
      pendingPayablesTotal,
      netLiquidity
    };
  }, [bankAccounts, creditCards, expectedPayouts, upcomingPayables]);

  // --- BANK HANDLERS ---
  const openAddBank = () => {
    setEditBank(null);
    setBankForm({ name: '', bankName: '', iban: '', balance: 0, color: '#16a34a' });
    setBankDialogOpen(true);
  };
  const openEditBank = (b: BankAccount) => {
    setEditBank(b);
    setBankForm({ name: b.name, bankName: b.bankName, iban: b.iban || '', balance: b.balance, color: b.color || '#16a34a' });
    setBankDialogOpen(true);
  };
  const saveBank = () => {
    if (!bankForm.name || !bankForm.bankName) { toast.error("Hesap ve Banka adı gerekli"); return; }
    if (editBank) {
      updateBankAccount({ ...editBank, ...bankForm });
    } else {
      addBankAccount(bankForm);
    }
    setBankDialogOpen(false);
  };

  // --- CARD HANDLERS ---
  const openAddCard = () => {
    setEditCard(null);
    setCardForm({ name: '', bankName: '', cardNumberLast4: '', totalLimit: 0, currentDebt: 0, cutoffDay: 15, dueDay: 25, color: '#dc2626' });
    setCardDialogOpen(true);
  };
  const openEditCard = (c: CreditCard) => {
    setEditCard(c);
    setCardForm({ name: c.name, bankName: c.bankName, cardNumberLast4: c.cardNumberLast4 || '', totalLimit: c.totalLimit, currentDebt: c.currentDebt, cutoffDay: c.cutoffDay || 15, dueDay: c.dueDay || 25, color: c.color || '#dc2626' });
    setCardDialogOpen(true);
  };
  const saveCard = () => {
    if (!cardForm.name || !cardForm.bankName || cardForm.totalLimit <= 0) { toast.error("Kart bilgileri ve limit gerekli"); return; }
    if (editCard) {
      updateCreditCard({ ...editCard, ...cardForm });
    } else {
      addCreditCard(cardForm);
    }
    setCardDialogOpen(false);
  };

  // --- FILE UPLOAD HELPER ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTempFile({ base64, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  // --- MULTI-ITEM SUPPLIER INVOICE FORM HELPERS ---
  const addSupplierItemRow = () => {
    setSupplierItems(prev => [
      ...prev,
      { id: generateId(), productName: '', quantity: 1, unitPrice: 0, taxRate: 10, unitPriceWithTax: 0, totalWithTax: 0 }
    ]);
  };

  const removeSupplierItemRow = (id: string) => {
    if (supplierItems.length === 1) {
      toast.error("En az 1 ürün kalemi olmalıdır");
      return;
    }
    setSupplierItems(prev => prev.filter(item => item.id !== id));
  };

  const updateSupplierItemField = (id: string, field: keyof SupplierInvoiceItem, value: any) => {
    setSupplierItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
      const taxRate = Number(field === 'taxRate' ? value : updated.taxRate) || 0;

      if (field === 'unitPriceWithTax') {
        const withTax = Number(value) || 0;
        const netUnit = taxRate > 0 ? withTax / (1 + taxRate / 100) : withTax;
        updated.unitPrice = Number(netUnit.toFixed(2));
        updated.unitPriceWithTax = withTax;
        updated.totalWithTax = Number((qty * withTax).toFixed(2));
      } else {
        const netUnit = Number(field === 'unitPrice' ? value : updated.unitPrice) || 0;
        const withTax = Number((netUnit * (1 + taxRate / 100)).toFixed(2));
        updated.unitPrice = netUnit;
        updated.unitPriceWithTax = withTax;
        updated.totalWithTax = Number((qty * withTax).toFixed(2));
      }

      return updated;
    }));
  };

  // Calculations for multi-product form
  const supplierFormSubtotal = useMemo(() => supplierItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0), [supplierItems]);
  const supplierFormTotalTax = useMemo(() => supplierItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice * (i.taxRate / 100)), 0), [supplierItems]);
  const supplierFormGrandTotal = useMemo(() => supplierItems.reduce((sum, i) => sum + i.totalWithTax, 0), [supplierItems]);

  const openAddSupplier = () => {
    setEditSupplier(null);
    setTempFile(null);
    setSupplierForm({
      date: new Date().toISOString().split('T')[0],
      supplierName: '',
      invoiceType: 'product',
      singleDescription: '',
      singleAmount: 0,
      paymentMethod: 'cash',
      sourceAccountId: bankAccounts[0]?.id || '',
      invoiceStatus: 'pending',
      invoiceFile: '',
      invoiceFileName: '',
      notes: ''
    });
    setSupplierItems([
      { id: generateId(), productName: '', quantity: 1, unitPrice: 0, taxRate: 10, unitPriceWithTax: 0, totalWithTax: 0 }
    ]);
    setSupplierDialogOpen(true);
  };

  const openEditSupplier = (inv: SupplierInvoice) => {
    setEditSupplier(inv);
    setTempFile(null);
    const type = inv.invoiceType || (inv.items && inv.items.length > 0 ? 'product' : 'other');

    setSupplierForm({
      date: inv.date.split('T')[0],
      supplierName: inv.supplierName,
      invoiceType: type,
      singleDescription: inv.itemsSummary,
      singleAmount: inv.amount,
      paymentMethod: inv.paymentMethod,
      sourceAccountId: inv.sourceAccountId || bankAccounts[0]?.id || '',
      invoiceStatus: inv.invoiceStatus,
      invoiceFile: inv.invoiceFile || '',
      invoiceFileName: inv.invoiceFileName || '',
      notes: inv.notes || ''
    });

    if (inv.items && inv.items.length > 0) {
      setSupplierItems(inv.items);
    } else {
      setSupplierItems([
        { id: generateId(), productName: inv.itemsSummary, quantity: 1, unitPrice: inv.amount / 1.1, taxRate: 10, unitPriceWithTax: inv.amount, totalWithTax: inv.amount }
      ]);
    }
    setSupplierDialogOpen(true);
  };

  const saveSupplier = () => {
    if (!supplierForm.supplierName.trim()) { toast.error("Tedarikçi / Kişi adı gerekli"); return; }
    
    let itemsSummary = '';
    let amount = 0;
    let itemsToSave: SupplierInvoiceItem[] | undefined = undefined;
    let subtotalToSave: number | undefined = undefined;
    let totalTaxToSave: number | undefined = undefined;

    if (supplierForm.invoiceType === 'product') {
      if (supplierItems.some(i => !i.productName.trim())) { toast.error("Tüm ürünlerin adı girilmelidir"); return; }
      if (supplierFormGrandTotal <= 0) { toast.error("Toplam tutar sıfırdan büyük olmalıdır"); return; }

      itemsSummary = supplierItems.map(i => `${i.quantity}x ${i.productName.trim()}`).join(", ");
      amount = supplierFormGrandTotal;
      itemsToSave = supplierItems;
      subtotalToSave = supplierFormSubtotal;
      totalTaxToSave = supplierFormTotalTax;
    } else {
      if (!supplierForm.singleDescription.trim()) { toast.error("Harcama/Gider detay açıklaması giriniz"); return; }
      if (supplierForm.singleAmount <= 0) { toast.error("Tutar sıfırdan büyük olmalıdır"); return; }

      itemsSummary = supplierForm.singleDescription.trim();
      amount = supplierForm.singleAmount;
    }

    const data: Omit<SupplierInvoice, 'id' | 'createdAt'> = {
      date: supplierForm.date,
      supplierName: supplierForm.supplierName.trim(),
      invoiceType: supplierForm.invoiceType,
      itemsSummary,
      items: itemsToSave,
      subtotal: subtotalToSave,
      totalTax: totalTaxToSave,
      amount,
      paymentMethod: supplierForm.paymentMethod,
      sourceAccountId: supplierForm.sourceAccountId,
      notes: supplierForm.notes,
      invoiceFile: tempFile ? tempFile.base64 : supplierForm.invoiceFile,
      invoiceFileName: tempFile ? tempFile.name : supplierForm.invoiceFileName,
      invoiceStatus: (tempFile || supplierForm.invoiceFile) ? 'received' as const : supplierForm.invoiceStatus
    };

    if (editSupplier) {
      updateSupplierInvoice({ ...editSupplier, ...data });
    } else {
      addSupplierInvoice(data);
    }
    setSupplierDialogOpen(false);
  };

  const submitInvoiceUpload = () => {
    if (!selectedInvoiceForUpload || !tempFile) { toast.error("Lütfen bir dosya seçin"); return; }
    updateSupplierInvoice({
      ...selectedInvoiceForUpload,
      invoiceFile: tempFile.base64,
      invoiceFileName: tempFile.name,
      invoiceStatus: 'received'
    });
    setUploadInvoiceDialogOpen(false);
    setSelectedInvoiceForUpload(null);
    setTempFile(null);
    toast.success("Fatura başarıyla yüklendi");
  };

  // --- PAYABLE HANDLERS ---
  const openAddPayable = () => {
    setPayableForm({
      title: '',
      category: 'fatura',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPayableDialogOpen(true);
  };

  const savePayable = () => {
    if (!payableForm.title || payableForm.amount <= 0) { toast.error("Borç tanımı ve tutar gerekli"); return; }
    addUpcomingPayable({
      ...payableForm,
      status: 'pending'
    });
    setPayableDialogOpen(false);
  };

  const openPayPayable = (u: UpcomingPayable) => {
    setSelectedPayableToPay(u);
    setPayMethod('bank_account');
    setPaySourceId(bankAccounts[0]?.id || '');
    setPayPayableDialogOpen(true);
  };

  const confirmPayPayable = () => {
    if (!selectedPayableToPay) return;
    payUpcomingPayable(selectedPayableToPay.id, paySourceId, payMethod);
    setPayPayableDialogOpen(false);
    setSelectedPayableToPay(null);
  };

  // --- PAYOUT HANDLERS ---
  const openAddPayout = () => {
    setPayoutForm({
      orderNumber: '',
      source: 'paytr',
      amount: 0,
      orderDate: new Date().toISOString().split('T')[0],
      expectedPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setPayoutDialogOpen(true);
  };

  const savePayout = () => {
    if (payoutForm.amount <= 0) { toast.error("Alacak tutarı gerekli"); return; }
    addExpectedPayout({
      ...payoutForm,
      status: 'pending'
    });
    setPayoutDialogOpen(false);
  };

  const openCompletePayout = (p: ExpectedPayout) => {
    setSelectedPayout(p);
    setSelectedPayoutBankId(bankAccounts[0]?.id || '');
    setCompletePayoutDialogOpen(true);
  };

  const confirmCompletePayout = () => {
    if (!selectedPayout || !selectedPayoutBankId) { toast.error("Banka hesabı seçin"); return; }
    completeExpectedPayout(selectedPayout.id, selectedPayoutBankId);
    setCompletePayoutDialogOpen(false);
    setSelectedPayout(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finans & Nakit Akışı Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Banka hesapları, kart limitleri, PayTR/Kapıda ödeme valörleri, tedarik faturaları ve borç takibi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddSupplier} variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
            <Upload className="h-4 w-4" /> Tedarik / Fatura Ekle
          </Button>
          <Button onClick={openAddPayable} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Borç Ekle
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto p-1 bg-muted/60">
          <TabsTrigger value="overview" className="text-xs py-2.5 gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="valors" className="text-xs py-2.5 gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Valörlü Alacaklar
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs py-2.5 gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Tedarik & Faturalar
          </TabsTrigger>
          <TabsTrigger value="payables" className="text-xs py-2.5 gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Gelecek Borçlar
          </TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs py-2.5 gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Banka & Kartlar
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: GENEL BAKIŞ (OVERVIEW) ==================== */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Executive Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>TOPLAM BANKA BAKİYESİ</span>
                  <Building2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.totalBankBalance, sym)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {bankAccounts.length} Adet Aktif Banka Hesabı
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>KREDİ KARTI HARCANABİLİR</span>
                  <CreditCardIcon className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totals.availableCreditLimit, sym)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Mevcut Borç: <span className="font-semibold text-destructive">{formatCurrency(totals.totalCreditDebt, sym)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>BEKLEYEN VALÖRLÜ ALACAKLAR</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(totals.pendingValorsTotal, sym)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex justify-between">
                  <span>PayTR (7g): {formatCurrency(totals.paytrTotal, sym)}</span>
                  <span>Kapıda (8g): {formatCurrency(totals.codTotal, sym)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>NET GELECEK NAKİT POZİSYONU</span>
                  <Wallet className="h-4 w-4 text-purple-500" />
                </div>
                <div className={`text-2xl font-bold ${totals.netLiquidity < 0 ? 'text-destructive' : 'text-purple-600 dark:text-purple-400'}`}>
                  {formatCurrency(totals.netLiquidity, sym)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  (Nakit + Valörler) - Gelecek Borçlar ({formatCurrency(totals.pendingPayablesTotal, sym)})
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bekleyen Valörlü Alacaklar Tahsilat Modülü */}
          <Card className="border border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Bekleyen Valörlü Alacaklar & Bankaya Aktarma Onayı
                </CardTitle>
                <CardDescription className="text-xs">
                  Hesabınıza geçen alacağı buradan onaylayarak seçtiğiniz banka bakiyesine anında ekleyebilirsiniz.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={openAddPayout} className="h-8 text-xs gap-1 border-emerald-500/30 text-emerald-700">
                <Plus className="h-3.5 w-3.5" /> Alacak Ekle
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {totals.pendingPayouts.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-card rounded-lg border">
                  Bekleyen valörlü alacak bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {totals.pendingPayouts.map(p => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-card gap-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={p.source === 'paytr' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[11px]' : 'bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[11px]'}>
                          {p.source === 'paytr' ? 'PayTR (7 Gün)' : p.source === 'kapida_odeme' ? 'Kapıda Ödeme (8 Gün)' : 'Diğer Alacak'}
                        </Badge>
                        <div>
                          <span className="font-bold text-sm">{p.orderNumber || 'Sipariş'}</span>
                          <span className="text-xs text-muted-foreground ml-2">Valör Tarihi: <strong>{formatDate(p.expectedPayoutDate)}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(p.amount, sym)}</span>
                        <Button 
                          size="sm" 
                          onClick={() => openCompletePayout(p)} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" /> Hesaba Yattı (Onayla)
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank Accounts Summary */}
            <Card>
              <CardHeader className="p-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Banka Hesap Bakiyeleri</CardTitle>
                  <CardDescription className="text-xs">Mevcut tanımlı banka ve kasa hesapları</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={openAddBank} className="h-8 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Hesap Ekle
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {bankAccounts.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: b.color || '#16a34a' }}>
                        {b.bankName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.bankName} • {b.iban || 'IBAN yok'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(b.balance, sym)}</div>
                      <Button variant="ghost" size="sm" onClick={() => openEditBank(b)} className="h-6 text-[11px] px-2">Düzenle</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Credit Cards Summary */}
            <Card>
              <CardHeader className="p-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Kredi Kartı Limit Durumu</CardTitle>
                  <CardDescription className="text-xs">Ticari kredi kartı limit ve ekstre takibi</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={openAddCard} className="h-8 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Kart Ekle
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {creditCards.map(c => {
                  const avail = c.totalLimit - c.currentDebt;
                  const usagePct = Math.min(100, Math.round((c.currentDebt / c.totalLimit) * 100));
                  return (
                    <div key={c.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCardIcon className="h-4 w-4 text-destructive" />
                          <span className="font-semibold text-sm">{c.name}</span>
                          <span className="text-xs text-muted-foreground">(**** {c.cardNumberLast4 || '0000'})</span>
                        </div>
                        <span className="text-xs font-medium text-destructive">Borç: {formatCurrency(c.currentDebt, sym)}</span>
                      </div>
                      <Progress value={usagePct} className="h-1.5" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Kullanılabilir: <strong className="text-foreground">{formatCurrency(avail, sym)}</strong></span>
                        <span>Son Ödeme: <strong>Her ayın {c.dueDay}. günü</strong></span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TAB 2: VALÖRLÜ ALACAKLAR (VALORS) ==================== */}
        <TabsContent value="valors" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">PayTR & Kapıda Ödeme Valör Takvimi</h2>
              <p className="text-xs text-muted-foreground">
                PayTR siparişleri +7 gün, Kapıda ödeme siparişleri teslimattan sonra +8 gün valörle hesaba geçer.
              </p>
            </div>
            <Button onClick={openAddPayout} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Manuel Alacak Ekle
            </Button>
          </div>

          <div className="border border-border bg-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground text-left">
                  <th className="p-3 font-semibold">Sipariş No</th>
                  <th className="p-3 font-semibold">Ödeme Kanalı / Türü</th>
                  <th className="p-3 font-semibold">Sipariş Tarihi</th>
                  <th className="p-3 font-semibold">Valör (Hesaba Yatış) Tarihi</th>
                  <th className="p-3 font-semibold text-right">Tutar</th>
                  <th className="p-3 font-semibold text-center">Durum</th>
                  <th className="p-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {expectedPayouts.map(p => {
                  const isPending = p.status === 'pending';
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-semibold">{p.orderNumber || 'Sipariş'}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className={p.source === 'paytr' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'}>
                          {p.source === 'paytr' ? 'PayTR (7 Gün Valör)' : p.source === 'kapida_odeme' ? 'Kapıda Ödeme (8 Gün Valör)' : 'Diğer Alacak'}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatDate(p.orderDate)}</td>
                      <td className="p-3 font-semibold">{formatDate(p.expectedPayoutDate)}</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount, sym)}</td>
                      <td className="p-3 text-center">
                        {isPending ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            ⏳ Beklemede (Valörlü)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            ✅ Hesaba Yattı
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPending && (
                            <Button size="sm" onClick={() => openCompletePayout(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
                              Hesaba Yattı (Onayla)
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Alacak kaydını silmek istediğinize emin misiniz?")) deleteExpectedPayout(p.id); }} className="h-7 w-7 text-destructive p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {expectedPayouts.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Alacak kaydı bulunmuyor.</div>
            )}
          </div>
        </TabsContent>

        {/* ==================== TAB 3: TEDARİK & FATURALAR (SUPPLIERS) ==================== */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Stok Tedarik & Ürün Alım Faturaları</h2>
              <p className="text-xs text-muted-foreground">
                Tedarik türünü seçin: Ürün alımı için çoklu kalemli KDV'li form veya diğer genel giderler için sade form.
              </p>
            </div>
            <Button onClick={openAddSupplier} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Yeni Tedarik / Fatura Ekle
            </Button>
          </div>

          <div className="border border-border bg-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground text-left">
                  <th className="p-3 font-semibold">Tarih</th>
                  <th className="p-3 font-semibold">Tür</th>
                  <th className="p-3 font-semibold">Tedarikçi / Kişi</th>
                  <th className="p-3 font-semibold">Alınan Ürünler & Detay</th>
                  <th className="p-3 font-semibold">Ödeme Şekli</th>
                  <th className="p-3 font-semibold text-right">Tutar (KDV Dahil)</th>
                  <th className="p-3 font-semibold text-center">Fatura Durumu</th>
                  <th className="p-3 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {supplierInvoices.map(inv => {
                  const hasFile = !!inv.invoiceFile;
                  const isProductType = (inv.invoiceType || (inv.items && inv.items.length > 0 ? 'product' : 'other')) === 'product';
                  return (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{formatDate(inv.date)}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className={isProductType ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px]'}>
                          {isProductType ? '🛍️ Ürün Alımı' : '📝 Diğer Gider'}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold">{inv.supplierName}</td>
                      <td className="p-3 max-w-[240px] truncate" title={inv.itemsSummary}>
                        {inv.itemsSummary}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {inv.paymentMethod === 'cash' ? 'Nakit Kasa' : inv.paymentMethod === 'bank_account' ? 'Banka Transferi' : 'Kredi Kartı'}
                      </td>
                      <td className="p-3 text-right font-bold text-destructive">{formatCurrency(inv.amount, sym)}</td>
                      <td className="p-3 text-center">
                        {inv.invoiceStatus === 'received' || hasFile ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            🟢 Fatura Alındı
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            🟡 Fatura Henüz Alınmadı
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {isProductType && inv.items && inv.items.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setDetailInvoice(inv)} className="h-7 text-xs gap-1">
                            <Eye className="h-3.5 w-3.5" /> Kalemler
                          </Button>
                        )}
                        {hasFile ? (
                          <a href={inv.invoiceFile} download={inv.invoiceFileName || 'fatura.pdf'} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <Download className="h-3.5 w-3.5" /> Fatura İndir
                            </Button>
                          </a>
                        ) : (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => {
                              setSelectedInvoiceForUpload(inv);
                              setTempFile(null);
                              setUploadInvoiceDialogOpen(true);
                            }} 
                            className="h-7 text-xs gap-1"
                          >
                            <Upload className="h-3.5 w-3.5" /> Fatura Yükle
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEditSupplier(inv)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Tedarik kaydını silmek istediğinize emin misiniz?")) deleteSupplierInvoice(inv.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {supplierInvoices.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Tedarik kaydı bulunmuyor.</div>
            )}
          </div>
        </TabsContent>

        {/* ==================== TAB 4: GELECEK BORÇLAR (PAYABLES) ==================== */}
        <TabsContent value="payables" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Gelecek Borçlar & Sabit Giderler</h2>
              <p className="text-xs text-muted-foreground">
                Kredi kartı ekstreleri, dükkan kirası, elektrik/su/aidat ve kargo firması hakediş vadeleri.
              </p>
            </div>
            <Button onClick={openAddPayable} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Yeni Borç Kaydı Ekle
            </Button>
          </div>

          <div className="border border-border bg-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground text-left">
                  <th className="p-3 font-semibold">Borç / Ödeme Tanımı</th>
                  <th className="p-3 font-semibold">Kategori</th>
                  <th className="p-3 font-semibold">Son Ödeme Tarihi (Vade)</th>
                  <th className="p-3 font-semibold text-right">Tutar</th>
                  <th className="p-3 font-semibold text-center">Durum</th>
                  <th className="p-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {upcomingPayables.map(u => {
                  const isPaid = u.status === 'paid';
                  const due = new Date(u.dueDate).getTime();
                  const now = new Date().getTime();
                  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-semibold">{u.title}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize text-xs">
                          {u.category}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{formatDate(u.dueDate)}</span>
                          {!isPaid && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${diffDays < 0 ? 'bg-destructive/10 text-destructive' : diffDays <= 3 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                              {diffDays < 0 ? `${Math.abs(diffDays)} gün gecikti` : `${diffDays} gün kaldı`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-destructive">{formatCurrency(u.amount, sym)}</td>
                      <td className="p-3 text-center">
                        {isPaid ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Ödendi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            Ödenecek
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isPaid && (
                            <Button size="sm" onClick={() => openPayPayable(u)} className="h-7 text-xs bg-primary hover:bg-primary/90">
                              Öde
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              if (confirm(`"${u.title}" borç kaydını silmek istediğinize emin misiniz?`)) {
                                deleteUpcomingPayable(u.id);
                              }
                            }} 
                            className="h-7 w-7 text-destructive p-0"
                            title="Borcu Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {upcomingPayables.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Borç kaydı bulunmuyor.</div>
            )}
          </div>
        </TabsContent>

        {/* ==================== TAB 5: BANKA & KARTLAR (ACCOUNTS) ==================== */}
        <TabsContent value="accounts" className="space-y-6 mt-4">
          {/* Bank Accounts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" /> Banka Hesapları
              </h2>
              <Button size="sm" onClick={openAddBank} className="gap-1">
                <Plus className="h-4 w-4" /> Yeni Banka Hesabı Ekle
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map(b => (
                <Card key={b.id} className="relative overflow-hidden border-l-4" style={{ borderLeftColor: b.color || '#16a34a' }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{b.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditBank(b)} className="h-7 w-7">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`${b.name} hesabını silmek istediğinize emin misiniz?`)) deleteBankAccount(b.id); }} className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{b.iban || 'IBAN Belirtilmedi'}</div>
                    <div className="flex items-baseline justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground font-medium">Bakiye:</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(b.balance, sym)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Credit Cards Section */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4 text-blue-600" /> Kredi Kartları & Limit Yönetimi
              </h2>
              <Button size="sm" onClick={openAddCard} className="gap-1">
                <Plus className="h-4 w-4" /> Yeni Kredi Kartı Ekle
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creditCards.map(c => {
                const avail = c.totalLimit - c.currentDebt;
                const pct = Math.min(100, Math.round((c.currentDebt / c.totalLimit) * 100));
                return (
                  <Card key={c.id} className="relative overflow-hidden border-l-4" style={{ borderLeftColor: c.color || '#dc2626' }}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{c.name}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditCard(c)} className="h-7 w-7">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm(`${c.name} kartını silmek istediğinize emin misiniz?`)) deleteCreditCard(c.id); }} className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">**** {c.cardNumberLast4 || '0000'} • {c.bankName}</div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Borç: {formatCurrency(c.currentDebt, sym)}</span>
                          <span className="text-muted-foreground">Limit: {formatCurrency(c.totalLimit, sym)}</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-emerald-600 font-semibold">Kullanılabilir: {formatCurrency(avail, sym)}</span>
                        <span className="text-muted-foreground text-[11px]">Vade: Her ayın {c.dueDay}. günü</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================== DIALOGS ==================== */}

      {/* BANK DIALOG */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{editBank ? 'Banka Hesabı Düzenle' : 'Yeni Banka Hesabı'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>Hesap Adı (Örn: Ziraat Ticari)</Label><Input value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} /></div>
            <div><Label>Banka Adı (Örn: Ziraat Bankası)</Label><Input value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} /></div>
            <div><Label>IBAN (Opsiyonel)</Label><Input value={bankForm.iban} onChange={e => setBankForm({ ...bankForm, iban: e.target.value })} /></div>
            <div><Label>Mevcut Bakiye ({sym})</Label><Input type="number" value={bankForm.balance} onChange={e => setBankForm({ ...bankForm, balance: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button onClick={saveBank}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CARD DIALOG */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{editCard ? 'Kredi Kartı Düzenle' : 'Yeni Kredi Kartı'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>Kart Adı (Örn: Garanti Bonus Ticari)</Label><Input value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} /></div>
            <div><Label>Banka Adı</Label><Input value={cardForm.bankName} onChange={e => setCardForm({ ...cardForm, bankName: e.target.value })} /></div>
            <div><Label>Kart Son 4 Haneli</Label><Input value={cardForm.cardNumberLast4} onChange={e => setCardForm({ ...cardForm, cardNumberLast4: e.target.value })} maxLength={4} /></div>
            <div><Label>Toplam Limit ({sym})</Label><Input type="number" value={cardForm.totalLimit} onChange={e => setCardForm({ ...cardForm, totalLimit: Number(e.target.value) })} /></div>
            <div><Label>Harcanan Borç ({sym})</Label><Input type="number" value={cardForm.currentDebt} onChange={e => setCardForm({ ...cardForm, currentDebt: Number(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Hesap Kesim Günü</Label><Input type="number" min="1" max="31" value={cardForm.cutoffDay} onChange={e => setCardForm({ ...cardForm, cutoffDay: Number(e.target.value) })} /></div>
              <div><Label>Son Ödeme Günü</Label><Input type="number" min="1" max="31" value={cardForm.dueDay} onChange={e => setCardForm({ ...cardForm, dueDay: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveCard}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUPPLIER INVOICE DIALOG WITH TYPE TOGGLE */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSupplier ? 'Tedarik Faturasını Düzenle' : 'Yeni Tedarik & Stok Alım Faturası'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Invoice Type Selector Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alım / Fatura Tipi Seçin</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg border">
                <button
                  type="button"
                  onClick={() => setSupplierForm({ ...supplierForm, invoiceType: 'product' })}
                  className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    supplierForm.invoiceType === 'product'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" /> Çoklu Ürün Alımı (Stok Tedariği)
                </button>
                <button
                  type="button"
                  onClick={() => setSupplierForm({ ...supplierForm, invoiceType: 'other' })}
                  className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    supplierForm.invoiceType === 'other'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                >
                  <FileText className="h-4 w-4" /> Diğer / Genel Gider Faturası
                </button>
              </div>
            </div>

            {/* Common Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Tarih</Label>
                <Input type="date" value={supplierForm.date} onChange={e => setSupplierForm({ ...supplierForm, date: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Tedarikçi / Satıcı Kişi (Örn: Mecit Aksoy)</Label>
                <Input placeholder="Firma veya Satıcı adı..." value={supplierForm.supplierName} onChange={e => setSupplierForm({ ...supplierForm, supplierName: e.target.value })} />
              </div>
            </div>

            {/* TYPE 1: MULTI-ITEM PRODUCT FORM */}
            {supplierForm.invoiceType === 'product' && (
              <div className="space-y-2 border border-border p-3 rounded-lg bg-secondary/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Fatura Kalemleri (Ürün Listesi)</span>
                  <Button type="button" size="sm" variant="outline" onClick={addSupplierItemRow} className="h-7 text-xs gap-1 border-primary/30 text-primary">
                    <Plus className="h-3.5 w-3.5" /> Kalem / Ürün Ekle
                  </Button>
                </div>

                <div className="space-y-2">
                  {supplierItems.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-end border-b border-border/40 pb-2.5">
                      {/* Ürün Adı */}
                      <div className="col-span-12 sm:col-span-4 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Ürün Adı / Modeli #{idx + 1}</Label>
                        <Input 
                          placeholder="Örn: Seraphine Vücut Çorabı" 
                          value={item.productName} 
                          onChange={e => updateSupplierItemField(item.id, 'productName', e.target.value)} 
                          className="h-8 text-xs bg-card"
                        />
                      </div>

                      {/* Adet */}
                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Adet</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={item.quantity || ''} 
                          onChange={e => updateSupplierItemField(item.id, 'quantity', e.target.value)} 
                          className="h-8 text-xs bg-card text-center"
                        />
                      </div>

                      {/* KDV Hariç Birim Fiyat */}
                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Birim Fiyat (KDV'siz)</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="10.00"
                          value={item.unitPrice || ''} 
                          onChange={e => updateSupplierItemField(item.id, 'unitPrice', e.target.value)} 
                          className="h-8 text-xs bg-card text-right font-medium"
                        />
                      </div>

                      {/* KDV Oranı (%) */}
                      <div className="col-span-3 sm:col-span-1 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">KDV %</Label>
                        <Select value={String(item.taxRate)} onValueChange={v => updateSupplierItemField(item.id, 'taxRate', Number(v))}>
                          <SelectTrigger className="h-8 text-xs bg-card px-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">%0</SelectItem>
                            <SelectItem value="1">%1</SelectItem>
                            <SelectItem value="10">%10</SelectItem>
                            <SelectItem value="20">%20</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Kalem Toplamı (KDV Dahil) */}
                      <div className="col-span-3 sm:col-span-2 space-y-1 text-right">
                        <Label className="text-[11px] text-muted-foreground">Toplam (KDV'li)</Label>
                        <div className="h-8 flex items-center justify-end px-2 bg-muted/40 rounded border border-border text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.totalWithTax, sym)}
                        </div>
                      </div>

                      {/* Remove Item Button */}
                      <div className="col-span-12 sm:col-span-1 flex justify-end">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSupplierItemRow(item.id)} className="h-8 w-8 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Form Summary Footer */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs border-t border-border/60 gap-2">
                  <div className="text-muted-foreground">
                    Toplam Kalem Sayısı: <strong className="text-foreground">{supplierItems.length} Kalem</strong>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>Ara Toplam (KDV Hariç): <strong>{formatCurrency(supplierFormSubtotal, sym)}</strong></span>
                    <span>Toplam KDV: <strong>{formatCurrency(supplierFormTotalTax, sym)}</strong></span>
                    <span className="text-sm font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">
                      GENEL TOPLAM: {formatCurrency(supplierFormGrandTotal, sym)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TYPE 2: SINGLE OTHER EXPENSE FORM */}
            {supplierForm.invoiceType === 'other' && (
              <div className="space-y-3 border border-border p-4 rounded-lg bg-card">
                <div>
                  <Label>Açıklama / Harcama Detayı</Label>
                  <Input 
                    placeholder="Örn: Kargo Poşetleri, Ambalaj Malzemeleri, Shopify Yazılım Gideri..." 
                    value={supplierForm.singleDescription} 
                    onChange={e => setSupplierForm({ ...supplierForm, singleDescription: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>Toplam Tutar (KDV Dahil - {sym})</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    min="0" 
                    step="0.01" 
                    value={supplierForm.singleAmount || ''} 
                    onChange={e => setSupplierForm({ ...supplierForm, singleAmount: Number(e.target.value) })} 
                    className="font-bold text-destructive"
                  />
                </div>
              </div>
            )}

            {/* Payment Method & Source Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Ödeme Şekli</Label>
                <Select value={supplierForm.paymentMethod} onValueChange={(v: any) => setSupplierForm({ ...supplierForm, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Nakit Kasa</SelectItem>
                    <SelectItem value="bank_account">Banka Hesabı</SelectItem>
                    <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {supplierForm.paymentMethod !== 'cash' && (
                <div>
                  <Label>Hangi {supplierForm.paymentMethod === 'bank_account' ? 'Banka Hesabı' : 'Kredi Kartı'}?</Label>
                  <Select value={supplierForm.sourceAccountId} onValueChange={v => setSupplierForm({ ...supplierForm, sourceAccountId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {supplierForm.paymentMethod === 'bank_account' 
                        ? bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({formatCurrency(b.balance, sym)})</SelectItem>)
                        : creditCards.map(c => <SelectItem key={c.id} value={c.id}>{c.name} (Boş Limit: {formatCurrency(c.totalLimit - c.currentDebt, sym)})</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div>
              <Label>Fatura Yükle (PDF veya Görsel - İsteğe Bağlı)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="mt-1 text-xs cursor-pointer" />
              {tempFile && <p className="text-xs text-emerald-600 mt-1 font-semibold">Seçilen dosya: {tempFile.name}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setSupplierDialogOpen(false)}>İptal</Button>
            <Button onClick={saveSupplier} className="bg-primary hover:bg-primary/90">Faturayı Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL INVOICE DIALOG */}
      <Dialog open={!!detailInvoice} onOpenChange={() => setDetailInvoice(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{detailInvoice?.supplierName} — Fatura Kalem Detayları</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground border-b pb-2">
              <span>Tarih: <strong>{detailInvoice && formatDate(detailInvoice.date)}</strong></span>
              <span>Ödeme: <strong>{detailInvoice?.paymentMethod === 'cash' ? 'Nakit Kasa' : detailInvoice?.paymentMethod === 'bank_account' ? 'Banka Transferi' : 'Kredi Kartı'}</strong></span>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted text-muted-foreground border-b">
                    <th className="p-2 text-left">Ürün Adı</th>
                    <th className="p-2 text-center">Adet</th>
                    <th className="p-2 text-right">KDV'siz Fiyat</th>
                    <th className="p-2 text-center">KDV %</th>
                    <th className="p-2 text-right">KDV'li Birim</th>
                    <th className="p-2 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailInvoice?.items || []).map(i => (
                    <tr key={i.id} className="border-b border-border/40">
                      <td className="p-2 font-medium">{i.productName}</td>
                      <td className="p-2 text-center font-semibold">{i.quantity}</td>
                      <td className="p-2 text-right text-muted-foreground">{formatCurrency(i.unitPrice, sym)}</td>
                      <td className="p-2 text-center font-mono">%{i.taxRate}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(i.unitPriceWithTax, sym)}</td>
                      <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(i.totalWithTax, sym)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end pt-2 text-xs space-y-1">
              {detailInvoice?.subtotal !== undefined && <span>Ara Toplam (KDV Hariç): <strong>{formatCurrency(detailInvoice.subtotal, sym)}</strong></span>}
              {detailInvoice?.totalTax !== undefined && <span>Toplam KDV: <strong>{formatCurrency(detailInvoice.totalTax, sym)}</strong></span>}
              <span className="text-sm font-bold text-destructive">Fatura Genel Toplamı: {formatCurrency(detailInvoice?.amount || 0, sym)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* UPLOAD INVOICE FILE ONLY DIALOG */}
      <Dialog open={uploadInvoiceDialogOpen} onOpenChange={setUploadInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Fatura Yükle</DialogTitle></DialogHeader>
          <div className="py-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>{selectedInvoiceForUpload?.supplierName}</strong> alımı için fatura dosyası seçin.
            </p>
            <Input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="cursor-pointer text-xs" />
            {tempFile && <p className="text-xs text-emerald-600 font-semibold">Seçilen dosya: {tempFile.name}</p>}
          </div>
          <DialogFooter><Button onClick={submitInvoiceUpload} disabled={!tempFile}>Yüklemeyi Tamamla</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPLETE PAYOUT DIALOG */}
      <Dialog open={completePayoutDialogOpen} onOpenChange={setCompletePayoutDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Alacak Tahsilat Onayı</DialogTitle></DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm">
              <strong>{selectedPayout?.orderNumber}</strong> nolu siparişin <strong>{formatCurrency(selectedPayout?.amount || 0, sym)}</strong> tutarındaki alacağı hesaba geçti.
            </p>
            <div>
              <Label>Paranın Yattığı Banka Hesabı</Label>
              <Select value={selectedPayoutBankId} onValueChange={setSelectedPayoutBankId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({formatCurrency(b.balance, sym)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={confirmCompletePayout} className="bg-emerald-600 hover:bg-emerald-700">Onayla ve Bakiyeye Ekle</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD PAYABLE DIALOG */}
      <Dialog open={payableDialogOpen} onOpenChange={setPayableDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Yeni Borç / Vade Kaydı</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>Borç Tanımı (Örn: Dükkan Kirası)</Label><Input value={payableForm.title} onChange={e => setPayableForm({ ...payableForm, title: e.target.value })} placeholder="Kira, Aidat, Fatura vb." /></div>
            <div>
              <Label>Kategori</Label>
              <Select value={payableForm.category} onValueChange={(v: any) => setPayableForm({ ...payableForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kredi_karti">Kredi Kartı Ekstresi</SelectItem>
                  <SelectItem value="kira">Kira Ödemesi</SelectItem>
                  <SelectItem value="aidat">Aidat</SelectItem>
                  <SelectItem value="fatura">Elektrik / Su / Fatura</SelectItem>
                  <SelectItem value="kargo">Kargo Şirketi Hakedişi</SelectItem>
                  <SelectItem value="shopify">Shopify / Yazılım Aboneliği</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tutar ({sym})</Label><Input type="number" value={payableForm.amount} onChange={e => setPayableForm({ ...payableForm, amount: Number(e.target.value) })} placeholder="0.00" /></div>
            <div><Label>Son Ödeme Tarihi (Vade)</Label><Input type="date" value={payableForm.dueDate} onChange={e => setPayableForm({ ...payableForm, dueDate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={savePayable}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAY PAYABLE DIALOG */}
      <Dialog open={payPayableDialogOpen} onOpenChange={setPayPayableDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Borç Ödeme Tamamlama</DialogTitle></DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm">
              <strong>{selectedPayableToPay?.title}</strong> için <strong>{formatCurrency(selectedPayableToPay?.amount || 0, sym)}</strong> ödeme yapılıyor.
            </p>
            <div>
              <Label>Ödeme Yöntemi</Label>
              <Select value={payMethod} onValueChange={(v: any) => setPayMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_account">Banka Hesabından</SelectItem>
                  <SelectItem value="credit_card">Kredi Kartından</SelectItem>
                  <SelectItem value="cash">Nakit Kasa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {payMethod !== 'cash' && (
              <div>
                <Label>Hangi {payMethod === 'bank_account' ? 'Banka Hesabı' : 'Kredi Kartı'}?</Label>
                <Select value={paySourceId} onValueChange={setPaySourceId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {payMethod === 'bank_account'
                      ? bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({formatCurrency(b.balance, sym)})</SelectItem>)
                      : creditCards.map(c => <SelectItem key={c.id} value={c.id}>{c.name} (Limit: {formatCurrency(c.totalLimit - c.currentDebt, sym)})</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={confirmPayPayable}>Ödemeyi Onayla</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANUALLY ADD PAYOUT DIALOG */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Yeni Alacak / Valör Kaydı</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>Sipariş / Referans No</Label><Input value={payoutForm.orderNumber} onChange={e => setPayoutForm({ ...payoutForm, orderNumber: e.target.value })} placeholder="ORD-1090" /></div>
            <div>
              <Label>Kanal / Yöntem</Label>
              <Select value={payoutForm.source} onValueChange={(v: any) => setPayoutForm({ ...payoutForm, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paytr">PayTR (7 Gün Valör)</SelectItem>
                  <SelectItem value="kapida_odeme">Kapıda Ödeme (8 Gün Valör)</SelectItem>
                  <SelectItem value="diger">Diğer Alacak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tutar ({sym})</Label><Input type="number" value={payoutForm.amount} onChange={e => setPayoutForm({ ...payoutForm, amount: Number(e.target.value) })} /></div>
            <div><Label>Sipariş Tarihi</Label><Input type="date" value={payoutForm.orderDate} onChange={e => setPayoutForm({ ...payoutForm, orderDate: e.target.value })} /></div>
            <div><Label>Tahmini Hesaba Yatış Tarihi (Valör)</Label><Input type="date" value={payoutForm.expectedPayoutDate} onChange={e => setPayoutForm({ ...payoutForm, expectedPayoutDate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={savePayout}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
