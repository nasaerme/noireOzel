import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Expense } from "@/types";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

const freqLabels: Record<string, string> = { gunluk: 'Günlük', haftalik: 'Haftalık', aylik: 'Aylık', yillik: 'Yıllık' };

export default function Expenses() {
  const { expenses, settings, addExpense, updateExpense, deleteExpense } = useApp();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const sym = settings.currencySymbol;

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    categoryId: settings.expenseCategories[0]?.id || '',
    description: '',
    amount: 0,
    recurring: false,
    frequency: null as string | null,
    notes: '',
  });

  const filtered = expenses.filter(e => {
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== "all" && e.categoryId !== catFilter) return false;
    return true;
  });

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);
  const getCat = (id: string) => settings.expenseCategories.find(c => c.id === id);

  const openAdd = () => {
    setEditExpense(null);
    setForm({ date: new Date().toISOString().split('T')[0], categoryId: settings.expenseCategories[0]?.id || '', description: '', amount: 0, recurring: false, frequency: null, notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditExpense(e);
    setForm({ date: e.date.split('T')[0], categoryId: e.categoryId, description: e.description, amount: e.amount, recurring: e.recurring, frequency: e.frequency, notes: e.notes });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.description || form.amount <= 0) { toast.error("Açıklama ve tutar gerekli"); return; }
    const data = { ...form, date: new Date(form.date).toISOString(), frequency: form.recurring ? form.frequency as any : null };
    if (editExpense) {
      updateExpense({ ...editExpense, ...data });
      toast.success("Gider güncellendi");
    } else {
      addExpense(data);
      toast.success("Gider eklendi");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Giderler</h1>
          <p className="text-sm text-muted-foreground">Toplam: {formatCurrency(totalExpenses, sym)}</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Yeni Gider</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Gider ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {settings.expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Tarih</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Kategori</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Açıklama</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tür</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Tutar</th>
                <th className="text-right p-3 font-medium text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const cat = getCat(e.categoryId);
                return (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-3 text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: cat?.color + '20', color: cat?.color }}>
                        {cat?.name}
                      </Badge>
                    </td>
                    <td className="p-3">{e.description}</td>
                    <td className="p-3 text-muted-foreground text-xs">{e.recurring ? freqLabels[e.frequency || ''] || 'Tekrarlı' : 'Tek seferlik'}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(e.amount, sym)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Silmek istediğinize emin misiniz?")) { deleteExpense(e.id); toast.success("Silindi"); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Gider bulunamadı</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editExpense ? 'Gider Düzenle' : 'Yeni Gider'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Tarih</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{settings.expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Açıklama</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Tutar ({sym})</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2 pt-5"><Switch checked={form.recurring} onCheckedChange={v => setForm({ ...form, recurring: v })} /><Label>Tekrarlı</Label></div>
            {form.recurring && (
              <div className="col-span-2">
                <Label>Sıklık</Label>
                <Select value={form.frequency || ''} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(freqLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2"><Label>Notlar</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save}>{editExpense ? 'Güncelle' : 'Kaydet'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
