import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { CompanyProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Save, Building2, Wallet, Tags, Check } from "lucide-react";
import { toast } from "sonner";
import { generateId } from "@/utils/formatters";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState({ ...settings });
  const [newCategory, setNewCategory] = useState("");
  const [newExpCat, setNewExpCat] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newCompany, setNewCompany] = useState<{ name: string; type: 'sahis' | 'limited' | 'anonim' | 'diger'; taxOffice: string; taxId: string }>({
    name: "",
    type: "limited",
    taxOffice: "",
    taxId: ""
  });

  const addCompany = () => {
    if (!newCompany.name.trim()) {
      toast.error("Lütfen firma unvanını giriniz.");
      return;
    }
    const currentCompanies = form.companies || [];
    const created: CompanyProfile = {
      id: "comp_" + generateId(),
      name: newCompany.name.trim(),
      type: newCompany.type,
      taxOffice: newCompany.taxOffice.trim(),
      taxId: newCompany.taxId.trim(),
      isDefault: currentCompanies.length === 0
    };
    setForm({
      ...form,
      companies: [...currentCompanies, created]
    });
    setNewCompany({ name: "", type: "limited", taxOffice: "", taxId: "" });
    toast.success("Yeni firma profili eklendi.");
  };

  const removeCompany = (id: string) => {
    const currentCompanies = form.companies || [];
    if (currentCompanies.length <= 1) {
      toast.error("Sistemde en az 1 adet firma profili bulunmalıdır.");
      return;
    }
    setForm({
      ...form,
      companies: currentCompanies.filter(c => c.id !== id)
    });
  };

  const setDefaultCompany = (id: string) => {
    const currentCompanies = form.companies || [];
    setForm({
      ...form,
      activeCompanyId: id,
      companies: currentCompanies.map(c => ({
        ...c,
        isDefault: c.id === id
      }))
    });
    toast.success("Varsayılan firma güncellendi.");
  };

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

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
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setForm({
        ...form,
        expenseCategories: [
          ...form.expenseCategories,
          { id: 'ec_' + generateId(), name: newExpCat, color: randomColor }
        ]
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

          {/* Firma Profilleri (Şahıs & Limited Şirket Yönetimi) */}
          <Card className="border-border/60 shadow-sm border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Firma Profilleri (Şahıs & Limited Şirketi Yönetimi)
              </CardTitle>
              <CardDescription>
                E-Fatura & Ön Muhasebe raporlarında faturalarınızın karışmaması için Şahıs Firması ve Limited Şirket profillerinizi buradan tanımlayın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Company List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(form.companies || []).map(comp => (
                  <div key={comp.id} className={`p-4 rounded-xl border transition-all relative ${comp.isDefault || form.activeCompanyId === comp.id ? 'border-primary bg-background shadow-sm' : 'border-border/60 bg-background/50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{comp.name}</h4>
                          <Badge variant="secondary" className={comp.type === 'sahis' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]' : 'bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]'}>
                            {comp.type === 'sahis' ? '🏢 Şahıs Şirketi' : comp.type === 'limited' ? '🏛️ Limited Şirket' : '🏢 ' + comp.type}
                          </Badge>
                        </div>
                        {comp.taxId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            VKN/TCKN: <span className="font-mono">{comp.taxId}</span> {comp.taxOffice ? `(${comp.taxOffice} V.D.)` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {comp.isDefault || form.activeCompanyId === comp.id ? (
                          <Badge className="bg-emerald-600 text-white gap-1 text-[10px]">
                            <Check className="h-3 w-3" /> Varsayılan
                          </Badge>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setDefaultCompany(comp.id)} className="h-7 text-xs text-muted-foreground hover:text-primary">
                            Varsayılan Yap
                          </Button>
                        )}
                        {(form.companies || []).length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeCompany(comp.id)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Company Form */}
              <div className="p-4 border rounded-xl bg-background/80 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" /> Yeni Firma Profili Ekle
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs">Firma Unvanı / Adı *</Label>
                    <Input 
                      placeholder="Örn: Noire Tekstil ve Mağazacılık Ltd. Şti." 
                      value={newCompany.name}
                      onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Şirket Türü</Label>
                    <Select value={newCompany.type} onValueChange={(val: any) => setNewCompany({ ...newCompany, type: val })}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sahis">🏢 Şahıs Şirketi (Şahıs Firması)</SelectItem>
                        <SelectItem value="limited">🏛️ Limited Şirket (Ltd. Şti.)</SelectItem>
                        <SelectItem value="anonim">🏬 Anonim Şirket (A.Ş.)</SelectItem>
                        <SelectItem value="diger">💼 Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">VKN / TCKN</Label>
                    <Input 
                      placeholder="10 veya 11 haneli vergi no" 
                      value={newCompany.taxId}
                      onChange={e => setNewCompany({ ...newCompany, taxId: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Vergi Dairesi</Label>
                    <Input 
                      placeholder="Örn: Maslak V.D." 
                      value={newCompany.taxOffice}
                      onChange={e => setNewCompany({ ...newCompany, taxOffice: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addCompany} className="w-full gap-2 bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4" /> Firma Profilini Ekle
                    </Button>
                  </div>
                </div>
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
                <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Otomatik Ödeme Komisyonları & Hizmet Kesintileri</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">💳 Online Kredi Kartı Komisyonu</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-10">PayTR, İyzico vb. online sanal POS komisyon oranı.</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Komisyon Oranı (%)</Label>
                      <Input type="number" step="0.01" value={form.defaultOnlineCcRate ?? 3.29} onChange={e => setForm({ ...form, defaultOnlineCcRate: Number(e.target.value) })} className="bg-background" />
                    </div>
                  </div>

                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">📱 Kapıda Ödeme (Kredi Kartı) Komisyonu</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-10">Kargo kuryesi mobil POS cihazı kart komisyonu.</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Komisyon Oranı (%)</Label>
                      <Input type="number" step="0.01" value={form.defaultCodCcRate ?? 2.80} onChange={e => setForm({ ...form, defaultCodCcRate: Number(e.target.value) })} className="bg-background" />
                    </div>
                  </div>

                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">💵 Kapıda Ödeme (Nakit) Komisyonu</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-10">Nakit ödemede uygulanan kart komisyonu (Varsayılan: %0).</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Komisyon Oranı (%)</Label>
                      <Input type="number" step="0.01" value={form.defaultCodCashRate ?? 0} onChange={e => setForm({ ...form, defaultCodCashRate: Number(e.target.value) })} className="bg-background" />
                    </div>
                  </div>

                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">🏛️ Havale / EFT Komisyonu</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-10">Banka havalesinde komisyon (Varsayılan: %0).</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Komisyon Oranı (%)</Label>
                      <Input type="number" step="0.01" value={form.defaultBankTransferRate ?? 0} onChange={e => setForm({ ...form, defaultBankTransferRate: Number(e.target.value) })} className="bg-background" />
                    </div>
                  </div>

                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">📦 Müşteriden Alınan Kapıda Ödeme Bedeli</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-10">Kapıda ödemede müşterinin sepetine eklenen ücret.</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Tutar ({form.currencySymbol})</Label>
                      <Input type="number" step="1" value={form.defaultCashOnDeliveryFee ?? 100} onChange={e => setForm({ ...form, defaultCashOnDeliveryFee: Number(e.target.value) })} className="bg-background" />
                    </div>
                  </div>

                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors sm:col-span-2">
                    <h5 className="font-semibold text-sm flex items-center gap-2">🚚 Kargo Firması Kapıda Ödeme Hizmet Kesintisi</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">Kargo firmasının tahsilatlı kargo (Taşınan Ürün Bedeli) için bizden kestiği hizmet bedeli.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Kesinti Hesaplama Tipi</Label>
                        <Select value={form.defaultCarrierCodFeeType || 'tiered'} onValueChange={(v: 'fixed' | 'percentage' | 'tiered') => setForm({ ...form, defaultCarrierCodFeeType: v })}>
                          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tiered">📊 Kademeli Tarife (2026-II TK 1 Tablosu)</SelectItem>
                            <SelectItem value="fixed">Sabit Tutar ({form.currencySymbol})</SelectItem>
                            <SelectItem value="percentage">Oransal (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.defaultCarrierCodFeeType !== 'tiered' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Değer</Label>
                          <Input type="number" step="0.1" value={form.defaultCarrierCodFee ?? 30} onChange={e => setForm({ ...form, defaultCarrierCodFee: Number(e.target.value) })} className="bg-background" />
                        </div>
                      )}
                    </div>

                    {(form.defaultCarrierCodFeeType === 'tiered' || !form.defaultCarrierCodFeeType) && (
                      <div className="mt-3 p-4 bg-background/80 rounded-xl border border-border/50 text-xs space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40 font-semibold text-primary">
                          <span>2026 - II Taşınan Ürün Bedeli Tarife Tablosu</span>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">TK 1 Otomatik</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                          <div className="p-2 bg-secondary/30 rounded border">0 - 400 TL: <strong>18,49 ₺</strong></div>
                          <div className="p-2 bg-secondary/30 rounded border">401 - 500 TL: <strong>20,60 ₺</strong></div>
                          <div className="p-2 bg-secondary/30 rounded border">501 - 600 TL: <strong>22,71 ₺</strong></div>
                          <div className="p-2 bg-secondary/30 rounded border">601 - 1.250 TL: <strong>33,28 ₺</strong></div>
                          <div className="p-2 bg-secondary/30 rounded border">1.251 - 2.500 TL: <strong>54,40 ₺</strong></div>
                          <div className="p-2 bg-secondary/30 rounded border">2.501 - 3.750 TL: <strong>75,53 ₺</strong></div>
                          <div className="p-2 bg-secondary/30 rounded border">3.751 - 5.000 TL: <strong>96,65 ₺</strong></div>
                          <div className="p-2 bg-secondary/30 rounded border">5.001 - 6.249 TL: <strong>117,78 ₺</strong></div>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1 italic">
                          ℹ️ 6.250 TL üzerindeki tutarlarda sabit 117,78 ₺ + 6.250 TL üzerindeki kısmın %1'i olarak otomatik hesaplanır.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-border/80 transition-colors">
                    <h5 className="font-semibold text-sm flex items-center gap-2">🛍️ Platform & Pazaryeri Komisyonu</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed h-10">Shopify vb. altyapının kestiği komisyon.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Satış Oranı (%)</Label>
                        <Input type="number" step="0.01" value={form.defaultShopifyCommissionRate ?? 0} onChange={e => setForm({ ...form, defaultShopifyCommissionRate: Number(e.target.value) })} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Sabit Ücret ({form.currencySymbol})</Label>
                        <Input type="number" step="0.01" value={form.defaultShopifyCommissionFixed ?? 0} onChange={e => setForm({ ...form, defaultShopifyCommissionFixed: Number(e.target.value) })} className="bg-background" />
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
