import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { CompetitorAd, CompetitorProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit2, Trash2, Megaphone, CheckCircle2, XCircle, ChevronDown, Building2, Store, Instagram, Globe, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CompetitorAds() {
  const { 
    competitorAds, settings, addCompetitorAd, updateCompetitorAd, deleteCompetitorAd, deleteCompetitorAds,
    competitorProfiles, addCompetitorProfile, updateCompetitorProfile, deleteCompetitorProfile, deleteCompetitorProfiles
  } = useApp();

  // --- AD TRACKING STATE (ALT TABLO) ---
  const [adSearch, setAdSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [editAd, setEditAd] = useState<CompetitorAd | null>(null);
  const [adForm, setAdForm] = useState({
    productName: '', category: '', competitors: '', adCount: 0, adType: '', inStock: false, notes: ''
  });
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const [bulkAdDeleteOpen, setBulkAdDeleteOpen] = useState(false);

  // --- PROFILE TRACKING STATE (ÜST TABLO) ---
  const [profileSearch, setProfileSearch] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<CompetitorProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    competitorName: '', creativeCount: 0, priceRange: '', strategy: '', productsNote: '', adLibraryUrl: '', websiteUrl: '', instagramUrl: ''
  });
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [bulkProfileDeleteOpen, setBulkProfileDeleteOpen] = useState(false);

  // --- AD TRACKING LOGIC ---
  const filteredAds = competitorAds.filter(a => {
    const s = adSearch.toLowerCase();
    const match = a.productName.toLowerCase().includes(s) || a.competitors.toLowerCase().includes(s);
    if (!match) return false;
    if (stockFilter === 'in') return a.inStock;
    if (stockFilter === 'out') return !a.inStock;
    return true;
  });

  const openAdAdd = () => {
    setEditAd(null);
    setAdForm({ productName: '', category: '', competitors: '', adCount: 1, adType: '', inStock: false, notes: '' });
    setAdDialogOpen(true);
  };

  const openAdEdit = (a: CompetitorAd) => {
    setEditAd(a);
    setAdForm({ productName: a.productName, category: a.category, competitors: a.competitors, adCount: a.adCount, adType: a.adType, inStock: a.inStock, notes: a.notes });
    setAdDialogOpen(true);
  };

  const saveAd = () => {
    if (!adForm.productName) return toast.error("Ürün adı zorunludur.");
    if (editAd) {
      updateCompetitorAd({ ...editAd, ...adForm });
      toast.success("Kayıt güncellendi");
    } else {
      addCompetitorAd(adForm);
      toast.success("Reklam eklendi");
    }
    setAdDialogOpen(false);
  };

  const handleBulkAdDelete = () => {
    deleteCompetitorAds(Array.from(selectedAdIds));
    setSelectedAdIds(new Set());
    setBulkAdDeleteOpen(false);
    toast.success("Seçilen kayıtlar silindi.");
  };

  const toggleAdSelectAll = () => {
    if (selectedAdIds.size === filteredAds.length) setSelectedAdIds(new Set());
    else setSelectedAdIds(new Set(filteredAds.map(x => x.id)));
  };

  // --- PROFILE TRACKING LOGIC ---
  const filteredProfiles = competitorProfiles.filter(p => {
    const s = profileSearch.toLowerCase();
    return p.competitorName.toLowerCase().includes(s) || p.strategy.toLowerCase().includes(s);
  });

  const openProfileAdd = () => {
    setEditProfile(null);
    setProfileForm({ competitorName: '', creativeCount: 1, priceRange: '', strategy: '', productsNote: '', adLibraryUrl: '', websiteUrl: '', instagramUrl: '' });
    setProfileDialogOpen(true);
  };

  const openProfileEdit = (p: CompetitorProfile) => {
    setEditProfile(p);
    setProfileForm({ 
      competitorName: p.competitorName, creativeCount: p.creativeCount, priceRange: p.priceRange, 
      strategy: p.strategy, productsNote: p.productsNote, adLibraryUrl: p.adLibraryUrl || '', 
      websiteUrl: p.websiteUrl || '', instagramUrl: p.instagramUrl || '' 
    });
    setProfileDialogOpen(true);
  };

  const saveProfile = () => {
    if (!profileForm.competitorName) return toast.error("Rakip adı zorunludur.");
    if (editProfile) {
      updateCompetitorProfile({ ...editProfile, ...profileForm });
      toast.success("Profil güncellendi");
    } else {
      addCompetitorProfile(profileForm);
      toast.success("Rakip profili eklendi");
    }
    setProfileDialogOpen(false);
  };

  const handleBulkProfileDelete = () => {
    deleteCompetitorProfiles(Array.from(selectedProfileIds));
    setSelectedProfileIds(new Set());
    setBulkProfileDeleteOpen(false);
    toast.success("Seçilen profiller silindi.");
  };

  const toggleProfileSelectAll = () => {
    if (selectedProfileIds.size === filteredProfiles.length) setSelectedProfileIds(new Set());
    else setSelectedProfileIds(new Set(filteredProfiles.map(x => x.id)));
  };

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto">
      <Tabs defaultValue="ads" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pazar & Reklam Takibi</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Rakiplerin analizlerini ve aktif ürün reklamlarını yönetin.</p>
          </div>
          <TabsList className="mt-4 sm:mt-0 p-1 bg-secondary/50 rounded-lg">
            <TabsTrigger value="ads" className="gap-2 rounded-md"><Store className="h-4 w-4" /> Ürün Reklamları</TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2 rounded-md"><Building2 className="h-4 w-4" /> Rakip Analizi</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profiles" className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-200 focus-visible:outline-none">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-blue-600/90 dark:text-blue-400">Genel Rakip Profilleri</h2>
                <p className="text-sm text-muted-foreground">Rakiplerin reklam stratejileri, sosyal medya linkleri ve fiyat politikaları.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {selectedProfileIds.size > 0 && (
                  <Button variant="destructive" onClick={() => setBulkProfileDeleteOpen(true)} className="gap-2">
                    <Trash2 className="h-4 w-4" /> {selectedProfileIds.size} Sil
                  </Button>
                )}
                <Button onClick={openProfileAdd} className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"><Plus className="h-4 w-4" /> Yeni Profil</Button>
              </div>
            </div>

            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/10 flex">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rakip firma veya strateji ara..." value={profileSearch} onChange={e => setProfileSearch(e.target.value)} className="pl-9 w-full bg-background" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="p-3 w-10"><Input type="checkbox" className="h-4 w-4" checked={selectedProfileIds.size === filteredProfiles.length && filteredProfiles.length > 0} onChange={toggleProfileSelectAll} /></th>
                      <th className="text-left p-3 font-medium text-muted-foreground min-w-[150px]">Rakip Firma</th>
                      <th className="text-left p-3 font-medium text-muted-foreground min-w-[150px]">Bağlantılar</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Kreatif Sayısı</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Fiyat Bandı</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Strateji / Notlar</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map(p => (
                      <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedProfileIds.has(p.id) ? 'bg-primary/5' : ''}`}>
                        <td className="p-3"><Input type="checkbox" className="h-4 w-4" checked={selectedProfileIds.has(p.id)} onChange={() => { const s = new Set(selectedProfileIds); s.has(p.id) ? s.delete(p.id) : s.add(p.id); setSelectedProfileIds(s); }} /></td>
                        <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{p.competitorName}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {p.adLibraryUrl && <a href={p.adLibraryUrl} target="_blank" rel="noreferrer" title="Reklam Kütüphanesi" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 p-1.5 rounded-md hover:bg-blue-200 transition-colors"><Link2 className="h-4 w-4" /></a>}
                            {p.instagramUrl && <a href={p.instagramUrl} target="_blank" rel="noreferrer" title="Instagram" className="bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400 p-1.5 rounded-md hover:bg-pink-200 transition-colors"><Instagram className="h-4 w-4" /></a>}
                            {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noreferrer" title="Website" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 p-1.5 rounded-md hover:bg-emerald-200 transition-colors"><Globe className="h-4 w-4" /></a>}
                            {!p.adLibraryUrl && !p.instagramUrl && !p.websiteUrl && <span className="text-muted-foreground/40 text-xs">-</span>}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">{p.creativeCount} Kreatif</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{p.priceRange || '-'}</td>
                        <td className="p-3 text-center">
                          {(p.strategy || p.productsNote) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs border-dashed gap-1 font-normal text-blue-600 hover:text-blue-700">
                                  Strateji Gör <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-96" align="center">
                                <div className="p-4 space-y-4">
                                  {p.strategy && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5"><Building2 className="w-3.5 h-3.5"/> Genel Strateji</h4>
                                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/50">{p.strategy}</div>
                                    </div>
                                  )}
                                  {p.productsNote && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5"><Store className="w-3.5 h-3.5"/> Odak Ürünler & Notlar</h4>
                                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/50">{p.productsNote}</div>
                                    </div>
                                  )}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => openProfileEdit(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Silmek istediğinize emin misiniz?")) { deleteCompetitorProfile(p.id); toast.success("Silindi"); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredProfiles.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Building2 className="h-10 w-10 mb-3 opacity-20" />
                  <p>Kayıtlı genel rakip profili bulunamadı</p>
                  <Button variant="link" onClick={openProfileAdd}>Hemen İlk Rakibinizi Ekleyin</Button>
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="ads" className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-200 focus-visible:outline-none">
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-primary/90">Ürün Bazlı Reklam Takibi</h2>
                <p className="text-sm text-muted-foreground">İlgilendiğiniz ürünlere hangi rakiplerin kaç reklam çıktığını izleyin.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {selectedAdIds.size > 0 && (
                  <Button variant="destructive" onClick={() => setBulkAdDeleteOpen(true)} className="gap-2">
                    <Trash2 className="h-4 w-4" /> {selectedAdIds.size} Sil
                  </Button>
                )}
                <Button onClick={openAdAdd} className="gap-2 shrink-0 w-full sm:w-auto"><Plus className="h-4 w-4" /> Yeni Ürün Takibi</Button>
              </div>
            </div>

            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Ürün veya rakip ara..." value={adSearch} onChange={e => setAdSearch(e.target.value)} className="pl-9 w-full bg-background" />
                </div>
                <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-border w-full sm:w-auto">
                  {['all', 'in', 'out'].map(f => (
                    <button
                      key={f} onClick={() => setStockFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-1 sm:flex-none ${stockFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
                    >
                      {f === 'all' ? 'Tümü' : f === 'in' ? 'Bende Olanlar' : 'Bende Olmayanlar'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="p-3 w-10"><Input type="checkbox" className="h-4 w-4" checked={selectedAdIds.size === filteredAds.length && filteredAds.length > 0} onChange={toggleAdSelectAll} /></th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Ürün Adı</th>
                      <th className="text-center p-3 w-12 font-medium text-muted-foreground">Stok</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Kategori</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Rakip(ler)</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Reklam Sayısı</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Reklam Türü</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Notlar</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAds.map(a => (
                      <tr key={a.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedAdIds.has(a.id) ? 'bg-primary/5' : ''}`}>
                        <td className="p-3"><Input type="checkbox" className="h-4 w-4" checked={selectedAdIds.has(a.id)} onChange={() => { const s = new Set(selectedAdIds); s.has(a.id) ? s.delete(a.id) : s.add(a.id); setSelectedAdIds(s); }} /></td>
                        <td className="p-3 font-medium">{a.productName}</td>
                        <td className="p-3 text-center">
                          {a.inStock ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1 py-0 h-6"><CheckCircle2 className="w-4 h-4" /></Badge>
                          ) : (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 px-1 py-0 h-6"><XCircle className="w-4 h-4" /></Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{a.category || '-'}</td>
                        <td className="p-3">{a.competitors || '-'}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{a.adCount}</Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-md">{a.adType || '-'}</span>
                        </td>
                        <td className="p-3 text-center">
                          {a.notes ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs border-dashed gap-1 font-normal">
                                  Not Gör <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-64" align="center">
                                <div className="p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                  {a.notes}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdEdit(a)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Silmek istediğinize emin misiniz?")) { deleteCompetitorAd(a.id); toast.success("Silindi"); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAds.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Store className="h-10 w-10 mb-3 opacity-20" />
                  <p>Kayıtlı ürün reklamı bulunamadı</p>
                  <Button variant="link" onClick={openAdAdd}>İlk Ürün Takibini Ekleyin</Button>
                </div>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {/* --- RAKİP PROFİLİ DIALOG --- */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-xl">{editProfile ? 'Rakip Profilini Düzenle' : 'Yeni Rakip Profili'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
            
            <div className="col-span-2 sm:col-span-1">
              <Label>Rakip Firma Adı</Label>
              <Input list="settings-competitors" value={profileForm.competitorName} onChange={e => setProfileForm({ ...profileForm, competitorName: e.target.value })} placeholder="Örn: Rakip Adı" className="mt-1.5" />
              <datalist id="settings-competitors">
                {settings.competitors?.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Aktif Kreatif Sayısı</Label>
              <Input type="number" min="0" value={profileForm.creativeCount} onChange={e => setProfileForm({ ...profileForm, creativeCount: Number(e.target.value) })} className="mt-1.5" />
            </div>
            
            <div className="col-span-2 pt-2 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2"><Globe className="w-4 h-4"/> Bağlantılar</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Facebook Reklam Kütüphanesi</Label>
                  <Input value={profileForm.adLibraryUrl} onChange={e => setProfileForm({ ...profileForm, adLibraryUrl: e.target.value })} placeholder="https://facebook.com/ads/..." className="mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Web Sitesi</Label>
                  <Input value={profileForm.websiteUrl} onChange={e => setProfileForm({ ...profileForm, websiteUrl: e.target.value })} placeholder="https://..." className="mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Instagram Hesabı</Label>
                  <Input value={profileForm.instagramUrl} onChange={e => setProfileForm({ ...profileForm, instagramUrl: e.target.value })} placeholder="https://instagram.com/..." className="mt-1 text-xs" />
                </div>
              </div>
            </div>

            <div className="col-span-2 pt-2 border-t border-border/50 mt-1">
              <Label>Fiyat Bandı / Stratejisi</Label>
              <Input value={profileForm.priceRange} onChange={e => setProfileForm({ ...profileForm, priceRange: e.target.value })} placeholder="Örn: 200-500 TL arası, Premium seviye" className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <Label>Genel Reklam Stratejisi</Label>
              <Textarea 
                value={profileForm.strategy} onChange={e => setProfileForm({ ...profileForm, strategy: e.target.value })} 
                placeholder="Örn: Daha çok kısa Reels kullanıyorlar, ilk 3 saniyede kanca var." 
                className="h-24 resize-none mt-1.5"
              />
            </div>
            <div className="col-span-2">
              <Label>Hangi Ürünlerde Odaklanıyorlar? (Notlar)</Label>
              <Textarea 
                value={profileForm.productsNote} onChange={e => setProfileForm({ ...profileForm, productsNote: e.target.value })} 
                placeholder="Örn: Özellikle babydollere abanmış durumdalar." 
                className="h-20 resize-none mt-1.5"
              />
            </div>
          </div>
          <DialogFooter><Button onClick={saveProfile} className="bg-blue-600 hover:bg-blue-700">{editProfile ? 'Güncelle' : 'Kaydet'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ÜRÜN REKLAM TAKİBİ DIALOG --- */}
      <Dialog open={adDialogOpen} onOpenChange={setAdDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editAd ? 'Kaydı Düzenle' : 'Yeni Rakip Ürün Reklamı'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Ürün Adı</Label><Input value={adForm.productName} onChange={e => setAdForm({ ...adForm, productName: e.target.value })} placeholder="Örn: Fiona Babydoll" /></div>
            <div><Label>Kategori</Label><Input value={adForm.category} onChange={e => setAdForm({ ...adForm, category: e.target.value })} placeholder="Örn: Jartiyer" /></div>
            <div><Label>Reklam Türü</Label><Input value={adForm.adType} onChange={e => setAdForm({ ...adForm, adType: e.target.value })} placeholder="Örn: Instagram, Facebook" /></div>
            <div className="col-span-2 space-y-2">
              <Label>Rakip(ler)</Label>
              <Input value={adForm.competitors} onChange={e => setAdForm({ ...adForm, competitors: e.target.value })} placeholder="Listeden seçin veya manuel yazın..." />
              {settings.competitors && settings.competitors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {settings.competitors.map(c => {
                    const currentList = adForm.competitors.split(',').map(x => x.trim()).filter(Boolean);
                    const isSelected = currentList.includes(c);
                    return (
                      <Badge 
                        key={c} 
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'}`}
                        onClick={() => {
                          if (isSelected) {
                            setAdForm({ ...adForm, competitors: currentList.filter(x => x !== c).join(', ') });
                          } else {
                            setAdForm({ ...adForm, competitors: currentList.length > 0 ? `${adForm.competitors}, ${c}` : c });
                          }
                        }}
                      >
                        {isSelected ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        {c}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div><Label>Reklam Sayısı</Label><Input type="number" min="0" value={adForm.adCount} onChange={e => setAdForm({ ...adForm, adCount: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={adForm.inStock} onCheckedChange={v => setAdForm({ ...adForm, inStock: v })} />
              <Label>Bu ürün bende var</Label>
            </div>
            <div className="col-span-2"><Label>Notlar</Label><Input value={adForm.notes} onChange={e => setAdForm({ ...adForm, notes: e.target.value })} placeholder="Kısa notlar..." /></div>
          </div>
          <DialogFooter><Button onClick={saveAd}>{editAd ? 'Güncelle' : 'Kaydet'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkProfileDeleteOpen} onOpenChange={setBulkProfileDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>{selectedProfileIds.size} profili silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkProfileDelete} className="bg-destructive text-destructive-foreground">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkAdDeleteOpen} onOpenChange={setBulkAdDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>{selectedAdIds.size} ürün reklamını silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAdDelete} className="bg-destructive text-destructive-foreground">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
