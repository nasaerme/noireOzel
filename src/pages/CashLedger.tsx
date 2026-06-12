import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { CashTransaction } from "@/types";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, Search, Edit2, Trash2, Wallet, ArrowUpRight, ArrowDownLeft, 
  Calendar, FileText, X, Info
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CashLedger() {
  const { cashTransactions, settings, addCashTransaction, updateCashTransaction, deleteCashTransaction, deleteCashTransactions } = useApp();
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<CashTransaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  const sym = settings.currencySymbol;

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'gelir' as 'gelir' | 'gider',
    name: '',
    amount: 0,
    description: '',
  });

  // Unique brands already in history to use for autocompletion
  const brandSuggestions = useMemo(() => {
    const names = cashTransactions.map(t => t.name.trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [cashTransactions]);

  // Calculations for summary stats
  const summaries = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let todayInflow = 0;
    let todayOutflow = 0;
    
    const todayStr = new Date().toISOString().split('T')[0];

    cashTransactions.forEach(t => {
      const isToday = t.date.startsWith(todayStr);
      if (t.type === 'gelir') {
        totalInflow += t.amount;
        if (isToday) todayInflow += t.amount;
      } else {
        totalOutflow += t.amount;
        if (isToday) todayOutflow += t.amount;
      }
    });

    return {
      totalInflow,
      totalOutflow,
      balance: totalInflow - totalOutflow,
      todayInflow,
      todayOutflow,
      todayBalance: todayInflow - todayOutflow
    };
  }, [cashTransactions]);

  // Brand-wise balances
  const brandBalances = useMemo(() => {
    const brands: Record<string, { name: string; inflow: number; outflow: number; balance: number }> = {};
    cashTransactions.forEach(t => {
      const name = t.name.trim();
      if (!name) return;
      if (!brands[name]) {
        brands[name] = { name, inflow: 0, outflow: 0, balance: 0 };
      }
      if (t.type === 'gelir') {
        brands[name].inflow += t.amount;
        brands[name].balance += t.amount;
      } else {
        brands[name].outflow += t.amount;
        brands[name].balance -= t.amount;
      }
    });
    return Object.values(brands).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [cashTransactions]);

  // Filtering transactions
  const filtered = useMemo(() => {
    return cashTransactions.filter(t => {
      if (search) {
        const query = search.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      
      if (selectedBrand && t.name !== selectedBrand) return false;

      if (dateFilter !== "all") {
        const tDate = new Date(t.date);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (dateFilter === "today") {
          const tDateStr = t.date.split('T')[0];
          const todayStr = new Date().toISOString().split('T')[0];
          if (tDateStr !== todayStr) return false;
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (tDate < weekAgo) return false;
        } else if (dateFilter === "month") {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          if (tDate < monthStart) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashTransactions, search, typeFilter, dateFilter, selectedBrand]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    deleteCashTransactions(Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    toast.success(`${selectedIds.size} işlem silindi`);
  };

  const openAdd = () => {
    setEditTransaction(null);
    setForm({
      date: new Date().toISOString().split('T')[0],
      type: 'gider',
      name: '',
      amount: 0,
      description: ''
    });
    setDialogOpen(true);
  };

  const openEdit = (t: CashTransaction) => {
    setEditTransaction(t);
    setForm({
      date: t.date.split('T')[0],
      type: t.type,
      name: t.name,
      amount: t.amount,
      description: t.description
    });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Cari/Marka adı gerekli");
      return;
    }
    if (form.amount <= 0) {
      toast.error("Tutar sıfırdan büyük olmalıdır");
      return;
    }

    const data = {
      ...form,
      name: form.name.trim(),
      date: new Date(form.date).toISOString()
    };

    if (editTransaction) {
      updateCashTransaction({ ...editTransaction, ...data });
      toast.success("Mali işlem güncellendi");
    } else {
      addCashTransaction(data);
      toast.success("Mali işlem eklendi");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mali Tablo</h1>
          <p className="text-muted-foreground text-sm mt-1">Marka/Cari bazlı bağımsız kasa takibi ve bakiye ledgeri</p>
        </div>
        <Button onClick={openAdd} className="shadow-md transition-all duration-200 hover:scale-[1.02]">
          <Plus className="h-4 w-4 mr-1.5" /> Yeni İşlem Ekle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Kasa Bakiye */}
        <Card className="border-l-4 border-l-primary relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kasa Bakiyesi</span>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${summaries.balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
              {formatCurrency(summaries.balance, sym)}
            </p>
            <div className="mt-2 flex items-center text-xs text-muted-foreground gap-1.5">
              <span>Bugün:</span>
              <span className={`font-medium ${summaries.todayBalance < 0 ? 'text-destructive' : summaries.todayBalance > 0 ? 'text-emerald-500' : ''}`}>
                {summaries.todayBalance > 0 ? '+' : ''}{formatCurrency(summaries.todayBalance, sym)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Giriş (Gelir) */}
        <Card className="border-l-4 border-l-emerald-500 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toplam Giriş (Gelir)</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summaries.totalInflow, sym)}
            </p>
            <div className="mt-2 flex items-center text-xs text-muted-foreground gap-1.5">
              <span>Bugün gelen:</span>
              <span className="font-semibold text-emerald-500">+{formatCurrency(summaries.todayInflow, sym)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Çıkış (Gider) */}
        <Card className="border-l-4 border-l-destructive relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toplam Çıkış (Gider)</span>
              <ArrowDownLeft className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-destructive">
              {formatCurrency(summaries.totalOutflow, sym)}
            </p>
            <div className="mt-2 flex items-center text-xs text-muted-foreground gap-1.5">
              <span>Bugün ödenen:</span>
              <span className="font-semibold text-destructive">-{formatCurrency(summaries.todayOutflow, sym)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Balances Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Marka / Cari Bakiyeleri</h2>
          {selectedBrand && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedBrand(null)} className="h-6 text-xs text-primary hover:text-primary/80">
              Filtreyi Temizle <X className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
        {brandBalances.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-secondary/35 border border-dashed rounded-lg p-4 text-center">
            Henüz cari kaydı bulunmuyor. İşlem ekledikçe burada markaların durumları listelenecektir.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {brandBalances.map(b => {
              const isSelected = selectedBrand === b.name;
              return (
                <button
                  key={b.name}
                  onClick={() => setSelectedBrand(isSelected ? null : b.name)}
                  className={`flex flex-col p-3 rounded-lg border text-left transition-all relative group overflow-hidden ${
                    isSelected 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'border-border bg-card hover:bg-secondary/40 hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="text-xs font-semibold truncate text-muted-foreground group-hover:text-foreground transition-colors mr-3">{b.name}</span>
                  <span className={`text-sm font-bold mt-1 tracking-tight ${b.balance < 0 ? 'text-destructive' : b.balance > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                    {b.balance > 0 ? '+' : ''}{formatCurrency(b.balance, sym)}
                  </span>
                  
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/85 border-t border-border/40 pt-1">
                    <span>Giriş: {formatCurrency(b.inflow, sym)}</span>
                  </div>

                  {isSelected && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Panel with Filter & Table */}
      <div className="space-y-4">
        {/* Bulk Action Alert */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 animate-slide-in">
            <span className="text-sm font-medium text-destructive-foreground dark:text-red-400">{selectedIds.size} işlem seçildi</span>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Seçilenleri Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Vazgeç</Button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari adı veya açıklama ile ara..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 bg-card" 
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] bg-card">
                <SelectValue placeholder="İşlem Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                <SelectItem value="gelir">Giriş (Gelir)</SelectItem>
                <SelectItem value="gider">Çıkış (Gider)</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Tarih Aralığı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
                <SelectItem value="today">Bugün</SelectItem>
                <SelectItem value="week">Son 7 Gün</SelectItem>
                <SelectItem value="month">Bu Ay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/65 text-muted-foreground">
                  <th className="p-3 w-10 text-center">
                    <Checkbox 
                      checked={selectedIds.size === filtered.length && filtered.length > 0} 
                      onCheckedChange={toggleSelectAll} 
                    />
                  </th>
                  <th className="text-left p-3 font-semibold">Tarih</th>
                  <th className="text-left p-3 font-semibold">Cari / Marka</th>
                  <th className="text-left p-3 font-semibold">İşlem Türü</th>
                  <th className="text-left p-3 font-semibold">Açıklama</th>
                  <th className="text-right p-3 font-semibold">Tutar</th>
                  <th className="text-center p-3 font-semibold w-24">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150">
                      <td className="p-3 text-center">
                        <Checkbox 
                          checked={selectedIds.has(t.id)} 
                          onCheckedChange={() => toggleSelect(t.id)} 
                        />
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          {formatDate(t.date)}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {t.name}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            t.type === 'gelir' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-destructive/10 text-destructive border border-destructive/20'
                          }`}
                        >
                          {t.type === 'gelir' ? 'Para Girişi' : 'Para Çıkışı'}
                        </Badge>
                      </td>
                      <td className="p-3 max-w-[200px] truncate text-muted-foreground">
                        {t.description || <span className="opacity-40 italic">Açıklama yok</span>}
                      </td>
                      <td className={`p-3 text-right font-bold text-[15px] whitespace-nowrap ${t.type === 'gelir' ? 'text-emerald-500' : 'text-destructive'}`}>
                        {t.type === 'gelir' ? '+' : '-'}{formatCurrency(t.amount, sym)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(t)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                            onClick={() => {
                              if (confirm(`${t.name} cari kaydını silmek istediğinize emin misiniz?`)) {
                                deleteCashTransaction(t.id);
                                toast.success("İşlem silindi");
                              }
                            }}
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
          </div>
          
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Kayıt Bulunamadı</p>
              <p className="text-xs mt-1">Seçili filtrelere uygun herhangi bir mali hareket bulunmuyor.</p>
              {(search || typeFilter !== "all" || dateFilter !== "all" || selectedBrand) && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                    setDateFilter("all");
                    setSelectedBrand(null);
                  }}
                  className="mt-3 text-primary"
                >
                  Filtreleri Sıfırla
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editTransaction ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'gelir' })}
                className={`py-2 px-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  form.type === 'gelir'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" /> Para Girişi (Gelir)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'gider' })}
                className={`py-2 px-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  form.type === 'gider'
                    ? 'bg-destructive/10 text-destructive border-destructive/40 ring-1 ring-destructive/20'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" /> Para Çıkışı (Gider)
              </button>
            </div>

            {/* Date Field */}
            <div className="space-y-1.5">
              <Label htmlFor="date">Tarih</Label>
              <Input 
                id="date"
                type="date" 
                value={form.date} 
                onChange={e => setForm({ ...form, date: e.target.value })} 
              />
            </div>

            {/* Brand/Cari Field */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="brand">Cari / Marka Adı</Label>
              <Input 
                id="brand"
                placeholder="Örn: Ahmet'in Markası, Mehmet vb."
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                autoComplete="off"
              />
              
              {/* Brand Suggestions List */}
              {form.name && brandSuggestions.some(n => n.toLowerCase().includes(form.name.toLowerCase()) && n.toLowerCase() !== form.name.toLowerCase()) && (
                <div className="absolute z-50 w-full bg-popover border border-border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                  {brandSuggestions
                    .filter(n => n.toLowerCase().includes(form.name.toLowerCase()) && n.toLowerCase() !== form.name.toLowerCase())
                    .map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setForm({ ...form, name })}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Amount Field */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Tutar ({sym})</Label>
              <Input 
                id="amount"
                type="number" 
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.amount || ""} 
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })} 
              />
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Açıklama / Not</Label>
              <Input 
                id="description"
                placeholder="İşleme dair not girin (isteğe bağlı)"
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={save} className="bg-primary hover:bg-primary/90">
              {editTransaction ? 'Değişiklikleri Kaydet' : 'İşlemi Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Alert */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} işlemi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve kasa bakiyeniz güncellenecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
