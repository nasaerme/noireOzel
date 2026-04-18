import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Save, Building2, Wallet, Tags } from "lucide-react";
import { toast } from "sonner";
import { generateId } from "@/utils/formatters";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState({ ...settings });
  const [newCategory, setNewCategory] = useState("");
  const [newExpCat, setNewExpCat] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");

  const save = () => {
    updateSettings(form);
    toast.success("Ayarlar başarıyla kaydedildi");
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

  const addCompetitor = () => {
    if (newCompetitor && !(form.competitors || []).includes(newCompetitor)) {
      setForm({ ...form, competitors: [...(form.competitors || []), newCompetitor] });
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (c: string) => {
    setForm({ ...form, competitors: (form.competitors || []).filter(x => x !== c) });
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
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sistem Ayarları</h1>
          <p className="text-sm text-muted-foreground">İşletme, finans ve kategori tercihlerinizi yönetin.</p>
        </div>
        <Button onClick={save} className="gap-2 shrink-0"><Save className="h-4 w-4" /> Değişiklikleri Kaydet</Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 mb-6 bg-secondary/50 rounded-xl p-1">
          <TabsTrigger value="general" className="gap-2 rounded-lg py-2"><Building2 className="h-4 w-4" /> <span className="hidden sm:inline">Genel Bilgiler</span></TabsTrigger>
          <TabsTrigger value="finance" className="gap-2 rounded-lg py-2"><Wallet className="h-4 w-4" /> <span className="hidden sm:inline">Finans & Ücretler</span></TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 rounded-lg py-2"><Tags className="h-4 w-4" /> <span className="hidden sm:inline">Kategoriler</span></TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Bölgesel Ayarlar</CardTitle>
              <CardDescription>Sistemin kullanacağı temel dil ve para birimi sembollerini belirleyin.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Arayüz Dili</Label>
                <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
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
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">İşletme İletişim Bilgileri</CardTitle>
              <CardDescription>Fatura, fiş ve rapor çıktıları için işletmenizin resmi profilini girin.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3 sm:col-span-2">
                <Label>İşletme Unvanı / Adı</Label>
                <Input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Örn: Benim Şirketim Ltd. Şti." className="max-w-md" />
              </div>
              <div className="space-y-3 sm:col-span-2">
                <Label>Açık Adres</Label>
                <Input value={form.businessAddress} onChange={e => setForm({ ...form, businessAddress: e.target.value })} placeholder="Dükkan, atölye veya ofis adresi..." />
              </div>
              <div className="space-y-3">
                <Label>İletişim Numarası</Label>
                <Input value={form.businessPhone} onChange={e => setForm({ ...form, businessPhone: e.target.value })} placeholder="+90 555..." />
              </div>
              <div className="space-y-3">
                <Label>E-posta Adresi</Label>
                <Input type="email" value={form.businessEmail} onChange={e => setForm({ ...form, businessEmail: e.target.value })} placeholder="iletisim@sirket.com" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Vergi ve Kesinti Parametreleri</CardTitle>
              <CardDescription>Uygulama genelinde kâr-zarar hesabı yapılırken kullanılacak standart kesinti dilimleri.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-border/50">
                <div className="space-y-3">
                  <Label className="text-primary font-medium flex items-center gap-2">Varsayılan KDV Oranı (%)</Label>
                  <Input type="number" value={form.defaultTaxRate} onChange={e => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} className="max-w-[200px]" />
                  <p className="text-xs text-muted-foreground mt-1">Siparişlere otomatik eklenecek temel vergi (Tax) yüzdesi.</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Otomatik Uygulama Giderleri</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">💳 Ödeme Sağlayıcı Altyapısı</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-12">Iyzico, Stripe veya Banka Sanal POS gibi ödeme kuruluşlarının aldığı kesintiler.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Kesinti Oranı (%)</Label>
                        <Input type="number" step="0.01" value={form.defaultPaymentCommissionRate || 0} onChange={e => setForm({ ...form, defaultPaymentCommissionRate: Number(e.target.value) })} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">İşlem Başı Sabit Ücret ({form.currencySymbol})</Label>
                        <Input type="number" step="0.01" value={form.defaultPaymentCommissionFixed || 0} onChange={e => setForm({ ...form, defaultPaymentCommissionFixed: Number(e.target.value) })} className="bg-background" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">🛍️ Platform & Pazaryeri Komisyonu</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-12">Shopify, Trendyol, Hepsiburada gibi satış yapılan altyapının kestiği komisyon.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Satış Oranı (%)</Label>
                        <Input type="number" step="0.01" value={form.defaultShopifyCommissionRate || 0} onChange={e => setForm({ ...form, defaultShopifyCommissionRate: Number(e.target.value) })} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">İşlem Başı Sabit Ücret ({form.currencySymbol})</Label>
                        <Input type="number" step="0.01" value={form.defaultShopifyCommissionFixed || 0} onChange={e => setForm({ ...form, defaultShopifyCommissionFixed: Number(e.target.value) })} className="bg-background" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="h-fit border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Ürün Grupları</CardTitle>
                <CardDescription>Envanter yönetimi ve filtreleme için ürünlerinize ait genel kategoriler.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input placeholder="Yeni kategori yazın ve enter'a basın..." value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
                  <Button variant="secondary" onClick={addCategory}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-secondary/10 rounded-xl border border-border/30">
                  {form.categories.length === 0 && <span className="text-sm text-muted-foreground opacity-70 w-full text-center py-2">Henüz kategori eklenmedi.</span>}
                  {form.categories.map(c => (
                    <Badge key={c} variant="outline" className="gap-2 py-1.5 px-3 bg-background hover:bg-destructive/10 transition-colors group cursor-default">
                      <span className="font-normal text-sm">{c}</span>
                      <button onClick={() => removeCategory(c)} className="text-muted-foreground group-hover:text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Gider Türleri</CardTitle>
                <CardDescription>Muhasebe takibi için ofis içi ya da pazarlama masraf kalemleri.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input placeholder="Kira, Kargo, Reklam..." value={newExpCat} onChange={e => setNewExpCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExpenseCategory()} />
                  <Button variant="secondary" onClick={addExpenseCategory} className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-secondary/10 rounded-xl border border-border/30">
                  {form.expenseCategories.length === 0 && <span className="text-sm text-muted-foreground opacity-70 w-full text-center py-2">Henüz gider kategorisi eklenmedi.</span>}
                  {form.expenseCategories.map(c => (
                    <Badge key={c.id} variant="outline" className="gap-2 py-1.5 px-3 border-transparent group cursor-default" style={{ backgroundColor: c.color + '20', color: c.color }}>
                      <span className="font-medium text-sm drop-shadow-sm">{c.name}</span>
                      <button onClick={() => removeExpenseCategory(c.id)} className="opacity-60 group-hover:opacity-100 transition-opacity"><X className="h-3.5 w-3.5" /></button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit border-border/60 shadow-sm lg:col-span-2 xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Takip Edilen Rakipler</CardTitle>
                <CardDescription>Reklam takiplerinde hızlıca seçebilmek için rakip listesi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input placeholder="Rakip firma adı..." value={newCompetitor} onChange={e => setNewCompetitor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompetitor()} />
                  <Button variant="secondary" onClick={addCompetitor} className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-secondary/10 rounded-xl border border-border/30">
                  {(!form.competitors || form.competitors.length === 0) && <span className="text-sm text-muted-foreground opacity-70 w-full text-center py-2">Henüz rakip eklenmedi.</span>}
                  {form.competitors?.map(c => (
                    <Badge key={c} variant="outline" className="gap-2 py-1.5 px-3 bg-background hover:bg-destructive/10 transition-colors group cursor-default shadow-sm border-border">
                      <span className="font-normal text-sm">{c}</span>
                      <button onClick={() => removeCompetitor(c)} className="text-muted-foreground group-hover:text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
