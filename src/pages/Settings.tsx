import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save } from "lucide-react";
import { toast } from "sonner";
import { generateId } from "@/utils/formatters";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState({ ...settings });
  const [newCategory, setNewCategory] = useState("");
  const [newExpCat, setNewExpCat] = useState("");

  const save = () => {
    updateSettings(form);
    toast.success("Ayarlar kaydedildi");
  };

  const addCategory = () => {
    if (newCategory && !form.categories.includes(newCategory)) {
      setForm({ ...form, categories: [...form.categories, newCategory] });
      setNewCategory("");
    }
  };

  const removeCategory = (c: string) => {
    setForm({ ...form, categories: form.categories.filter(x => x !== c) });
  };

  const addExpenseCategory = () => {
    if (newExpCat) {
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#f59e0b', '#10b981'];
      setForm({
        ...form,
        expenseCategories: [...form.expenseCategories, {
          id: generateId(),
          name: newExpCat,
          color: colors[form.expenseCategories.length % colors.length],
        }],
      });
      setNewExpCat("");
    }
  };

  const removeExpenseCategory = (id: string) => {
    setForm({ ...form, expenseCategories: form.expenseCategories.filter(x => x.id !== id) });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">Sistem tercihlerini yönetin</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Genel Ayarlar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dil</Label>
              <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Para Birimi</Label>
              <Select value={form.currency} onValueChange={v => {
                const symbols: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
                setForm({ ...form, currency: v, currencySymbol: symbols[v] || v });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                  <SelectItem value="USD">US Dollar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                  <SelectItem value="GBP">British Pound (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Varsayılan KDV Oranı (%)</Label>
              <Input type="number" value={form.defaultTaxRate} onChange={e => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">İşletme Bilgileri</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>İşletme Adı</Label><Input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} /></div>
            <div className="col-span-2"><Label>Adres</Label><Input value={form.businessAddress} onChange={e => setForm({ ...form, businessAddress: e.target.value })} /></div>
            <div><Label>Telefon</Label><Input value={form.businessPhone} onChange={e => setForm({ ...form, businessPhone: e.target.value })} /></div>
            <div><Label>E-posta</Label><Input value={form.businessEmail} onChange={e => setForm({ ...form, businessEmail: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ürün Kategorileri</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {form.categories.map(c => (
              <Badge key={c} variant="secondary" className="gap-1 pr-1">
                {c}
                <button onClick={() => removeCategory(c)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Yeni kategori..." value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-3 w-3" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Gider Kategorileri</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {form.expenseCategories.map(c => (
              <Badge key={c.id} variant="secondary" className="gap-1 pr-1" style={{ backgroundColor: c.color + '20', color: c.color }}>
                {c.name}
                <button onClick={() => removeExpenseCategory(c.id)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Yeni gider kategorisi..." value={newExpCat} onChange={e => setNewExpCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpenseCategory()} />
            <Button variant="outline" size="sm" onClick={addExpenseCategory}><Plus className="h-3 w-3" /></Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="gap-2"><Save className="h-4 w-4" /> Ayarları Kaydet</Button>
    </div>
  );
}
