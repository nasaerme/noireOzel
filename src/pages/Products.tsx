import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Product, ProductVariant } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";

const defaultSizes = ['XS', 'S', 'M', 'L', 'XL'];

export default function Products() {
  const { products, variants, settings, addProduct, updateProduct, deleteProduct, addVariant, updateVariant, deleteVariant, getVariantsForProduct } = useApp();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);
  const [variantProductId, setVariantProductId] = useState<string>("");
  const sym = settings.currencySymbol;

  const [form, setForm] = useState({
    name: '', sku: '', category: '', salePrice: 0, costPrice: 0, taxRate: settings.defaultTaxRate, notes: '', active: true,
  });
  const [vForm, setVForm] = useState({
    name: '', sku: '', stock: 0, lowStockThreshold: 5, costPriceOverride: '' as string, salePriceOverride: '' as string,
  });

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== "all" && p.category !== catFilter) return false;
    return true;
  });

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', sku: '', category: settings.categories[0] || '', salePrice: 0, costPrice: 0, taxRate: settings.defaultTaxRate, notes: '', active: true });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, salePrice: p.salePrice, costPrice: p.costPrice, taxRate: p.taxRate, notes: p.notes, active: p.active });
    setDialogOpen(true);
  };

  const saveProduct = () => {
    if (!form.name || !form.sku) { toast.error("Ürün adı ve SKU gerekli"); return; }
    if (editProduct) {
      updateProduct({ ...editProduct, ...form });
      toast.success("Ürün güncellendi");
    } else {
      const newP = addProduct(form);
      // Create default size variants
      defaultSizes.forEach(size => {
        addVariant({ productId: newP.id, name: size, sku: `${form.sku}-${size}`, stock: 0, lowStockThreshold: 5, costPriceOverride: null, salePriceOverride: null });
      });
      toast.success("Ürün eklendi");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
      deleteProduct(id);
      toast.success("Ürün silindi");
    }
  };

  const openVariantAdd = (productId: string) => {
    setVariantProductId(productId);
    setEditVariant(null);
    const p = products.find(x => x.id === productId);
    setVForm({ name: '', sku: p ? `${p.sku}-` : '', stock: 0, lowStockThreshold: 5, costPriceOverride: '', salePriceOverride: '' });
    setVariantDialogOpen(true);
  };

  const openVariantEdit = (v: ProductVariant) => {
    setVariantProductId(v.productId);
    setEditVariant(v);
    setVForm({ name: v.name, sku: v.sku, stock: v.stock, lowStockThreshold: v.lowStockThreshold, costPriceOverride: v.costPriceOverride?.toString() ?? '', salePriceOverride: v.salePriceOverride?.toString() ?? '' });
    setVariantDialogOpen(true);
  };

  const saveVariant = () => {
    if (!vForm.name) { toast.error("Varyant adı gerekli"); return; }
    const data = {
      productId: variantProductId,
      name: vForm.name,
      sku: vForm.sku,
      stock: vForm.stock,
      lowStockThreshold: vForm.lowStockThreshold,
      costPriceOverride: vForm.costPriceOverride ? Number(vForm.costPriceOverride) : null,
      salePriceOverride: vForm.salePriceOverride ? Number(vForm.salePriceOverride) : null,
    };
    if (editVariant) {
      updateVariant({ ...editVariant, ...data });
      toast.success("Varyant güncellendi");
    } else {
      addVariant(data);
      toast.success("Varyant eklendi");
    }
    setVariantDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ürünler</h1>
          <p className="text-sm text-muted-foreground">{products.length} ürün</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Yeni Ürün</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {settings.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map(p => {
          const pVariants = getVariantsForProduct(p.id);
          const totalStock = pVariants.reduce((s, v) => s + v.stock, 0);
          const expanded = expandedId === p.id;

          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex items-center p-4 gap-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : p.id)}>
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{p.name}</h3>
                    {!p.active && <Badge variant="secondary" className="text-[10px]">Pasif</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Satış</p>
                    <p className="font-medium">{formatCurrency(p.salePrice, sym)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Maliyet</p>
                    <p className="font-medium">{formatCurrency(p.costPrice, sym)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Stok</p>
                    <p className="font-medium">{totalStock}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(p); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {expanded && (
                <div className="border-t border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Varyantlar ({pVariants.length})</h4>
                    <Button variant="outline" size="sm" onClick={() => openVariantAdd(p.id)}><Plus className="h-3 w-3 mr-1" /> Varyant Ekle</Button>
                  </div>
                  {pVariants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz varyant yok</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {pVariants.map(v => (
                        <div key={v.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border/50">
                          <div>
                            <p className="text-sm font-medium">{v.name}</p>
                            <p className="text-xs text-muted-foreground">{v.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={v.stock <= v.lowStockThreshold ? "destructive" : "secondary"} className="text-[10px]">
                              {v.stock} adet
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openVariantEdit(v)}><Edit2 className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { deleteVariant(v.id); toast.success("Varyant silindi"); }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Ürün Adı</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{settings.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Satış Fiyatı ({sym})</Label><Input type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })} /></div>
            <div><Label>Maliyet ({sym})</Label><Input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: Number(e.target.value) })} /></div>
            <div><Label>KDV Oranı (%)</Label><Input type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2 pt-5"><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /><Label>Aktif</Label></div>
            <div className="col-span-2"><Label>Notlar</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveProduct}>{editProduct ? 'Güncelle' : 'Kaydet'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editVariant ? 'Varyant Düzenle' : 'Yeni Varyant'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Beden / Ad</Label><Input value={vForm.name} onChange={e => setVForm({ ...vForm, name: e.target.value })} /></div>
            <div><Label>SKU</Label><Input value={vForm.sku} onChange={e => setVForm({ ...vForm, sku: e.target.value })} /></div>
            <div><Label>Stok</Label><Input type="number" value={vForm.stock} onChange={e => setVForm({ ...vForm, stock: Number(e.target.value) })} /></div>
            <div><Label>Düşük Stok Eşiği</Label><Input type="number" value={vForm.lowStockThreshold} onChange={e => setVForm({ ...vForm, lowStockThreshold: Number(e.target.value) })} /></div>
            <div><Label>Maliyet Fark ({sym})</Label><Input type="number" placeholder="Opsiyonel" value={vForm.costPriceOverride} onChange={e => setVForm({ ...vForm, costPriceOverride: e.target.value })} /></div>
            <div><Label>Satış Fark ({sym})</Label><Input type="number" placeholder="Opsiyonel" value={vForm.salePriceOverride} onChange={e => setVForm({ ...vForm, salePriceOverride: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveVariant}>{editVariant ? 'Güncelle' : 'Kaydet'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
