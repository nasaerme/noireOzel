import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { OrderItem } from "@/types";
import { calculateOrder } from "@/utils/calculations";
import { formatCurrency, generateId } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Gift } from "lucide-react";
import { toast } from "sonner";

export default function OrderCreate({ onClose }: { onClose: () => void }) {
  const { products, variants, settings, addOrder, getVariantsForProduct } = useApp();
  const sym = settings.currencySymbol;

  const [items, setItems] = useState<OrderItem[]>([]);
  const [shippingRevenue, setShippingRevenue] = useState(0);
  const [shippingCost, setShippingCost] = useState(25);
  const [packagingCost, setPackagingCost] = useState(5);
  const [commissionRate, setCommissionRate] = useState(3.5);
  const [commissionFixed, setCommissionFixed] = useState(1.5);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [extraExpense, setExtraExpense] = useState(0);
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<'beklemede' | 'odendi'>('beklemede');
  const [orderStatus, setOrderStatus] = useState<'yeni' | 'hazirlaniyor' | 'kargoda' | 'teslim_edildi'>('yeni');

  const addItem = (isGift = false) => {
    setItems([...items, {
      id: generateId(),
      productId: '',
      variantId: '',
      quantity: 1,
      unitSalePrice: 0,
      unitCostPrice: 0,
      taxRate: settings.defaultTaxRate,
      isGift,
    }]);
  };

  const updateItem = (idx: number, updates: Partial<OrderItem>) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], ...updates };

    // Auto-fill prices when product/variant selected
    if (updates.productId) {
      const p = products.find(x => x.id === updates.productId);
      if (p) {
        newItems[idx].unitSalePrice = p.salePrice;
        newItems[idx].unitCostPrice = p.costPrice;
        newItems[idx].taxRate = p.taxRate;
        newItems[idx].variantId = '';
      }
    }
    if (updates.variantId) {
      const v = variants.find(x => x.id === updates.variantId);
      const p = products.find(x => x.id === newItems[idx].productId);
      if (v && p) {
        newItems[idx].unitSalePrice = v.salePriceOverride ?? p.salePrice;
        newItems[idx].unitCostPrice = v.costPriceOverride ?? p.costPrice;
      }
    }
    setItems(newItems);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const orderForCalc = useMemo(() => ({
    id: '', orderNumber: '', createdAt: '',
    items, shippingRevenue, shippingCost, packagingCost,
    commissionRate, commissionFixed, discountAmount, discountRate,
    extraExpense, notes, orderDate, paymentStatus, orderStatus,
  }), [items, shippingRevenue, shippingCost, packagingCost, commissionRate, commissionFixed, discountAmount, discountRate, extraExpense, notes, orderDate, paymentStatus, orderStatus]);

  const calc = calculateOrder(orderForCalc);

  const handleSave = () => {
    if (items.length === 0) { toast.error("En az bir ürün ekleyin"); return; }
    if (items.some(i => !i.productId || !i.variantId)) { toast.error("Tüm ürün ve varyantları seçin"); return; }

    // Check stock
    const stockWarnings: string[] = [];
    items.forEach(item => {
      const v = variants.find(x => x.id === item.variantId);
      if (v && v.stock < item.quantity) {
        const p = products.find(x => x.id === item.productId);
        stockWarnings.push(`${p?.name} ${v.name}: ${v.stock} stokta, ${item.quantity} isteniyor`);
      }
    });

    if (stockWarnings.length > 0) {
      if (!confirm(`Stok uyarısı:\n${stockWarnings.join('\n')}\n\nDevam etmek istiyor musunuz?`)) return;
    }

    addOrder({
      items, shippingRevenue, shippingCost, packagingCost,
      commissionRate, commissionFixed, discountAmount, discountRate,
      extraExpense, notes, orderDate: new Date(orderDate).toISOString(),
      paymentStatus, orderStatus,
    });

    toast.success("Sipariş oluşturuldu");
    onClose();
  };

  const activeProducts = products.filter(p => p.active);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Items + Fields */}
      <div className="lg:col-span-3 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Sipariş Kalemleri</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addItem(false)}><Plus className="h-3 w-3 mr-1" /> Ürün</Button>
              <Button variant="outline" size="sm" onClick={() => addItem(true)}><Gift className="h-3 w-3 mr-1" /> Hediye</Button>
            </div>
          </div>

          {items.map((item, idx) => {
            const productVariants = item.productId ? getVariantsForProduct(item.productId) : [];
            return (
              <div key={item.id} className={`border rounded-lg p-3 space-y-3 ${item.isGift ? 'border-warning/30 bg-warning/5' : 'border-border'}`}>
                {item.isGift && <Badge className="bg-warning/10 text-warning text-[10px]">Hediye Ürün</Badge>}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Select value={item.productId} onValueChange={v => updateItem(idx, { productId: v })}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Ürün seç" /></SelectTrigger>
                    <SelectContent>{activeProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={item.variantId} onValueChange={v => updateItem(idx, { variantId: v })}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Beden" /></SelectTrigger>
                    <SelectContent>{productVariants.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.stock})</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} className="text-xs" placeholder="Adet" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{formatCurrency(item.unitSalePrice * item.quantity, sym)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex gap-4 text-[11px] text-muted-foreground">
                  <span>Satış: {formatCurrency(item.unitSalePrice, sym)}</span>
                  <span>Maliyet: {formatCurrency(item.unitCostPrice, sym)}</span>
                  <span>KDV: %{item.taxRate}</span>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
              Ürün eklemek için yukarıdaki butona tıklayın
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">Sipariş Tarihi</Label><Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="text-xs" /></div>
          <div>
            <Label className="text-xs">Sipariş Durumu</Label>
            <Select value={orderStatus} onValueChange={(v: any) => setOrderStatus(v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yeni">Yeni</SelectItem>
                <SelectItem value="hazirlaniyor">Hazırlanıyor</SelectItem>
                <SelectItem value="kargoda">Kargoda</SelectItem>
                <SelectItem value="teslim_edildi">Teslim Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ödeme Durumu</Label>
            <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beklemede">Beklemede</SelectItem>
                <SelectItem value="odendi">Ödendi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">Kargo Geliri ({sym})</Label><Input type="number" value={shippingRevenue} onChange={e => setShippingRevenue(Number(e.target.value))} className="text-xs" /></div>
          <div><Label className="text-xs">Kargo Maliyeti ({sym})</Label><Input type="number" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="text-xs" /></div>
          <div><Label className="text-xs">Ambalaj ({sym})</Label><Input type="number" value={packagingCost} onChange={e => setPackagingCost(Number(e.target.value))} className="text-xs" /></div>
          <div><Label className="text-xs">Komisyon (%)</Label><Input type="number" value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))} className="text-xs" /></div>
          <div><Label className="text-xs">Komisyon Sabit ({sym})</Label><Input type="number" value={commissionFixed} onChange={e => setCommissionFixed(Number(e.target.value))} className="text-xs" /></div>
          <div><Label className="text-xs">Ek Gider ({sym})</Label><Input type="number" value={extraExpense} onChange={e => setExtraExpense(Number(e.target.value))} className="text-xs" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">İndirim Tutarı ({sym})</Label><Input type="number" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} className="text-xs" /></div>
          <div><Label className="text-xs">İndirim Oranı (%)</Label><Input type="number" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} className="text-xs" /></div>
        </div>

        <div><Label className="text-xs">Notlar</Label><Input value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" /></div>
      </div>

      {/* Right: Summary */}
      <div className="lg:col-span-2">
        <div className="sticky top-4 bg-secondary/50 rounded-xl border border-border p-4 space-y-3 text-sm">
          <h3 className="font-semibold">Sipariş Özeti</h3>
          <SummaryRow label="Brüt Gelir" value={formatCurrency(calc.grossRevenue, sym)} />
          {calc.totalDiscount > 0 && <SummaryRow label="İndirim" value={`-${formatCurrency(calc.totalDiscount, sym)}`} warn />}
          <SummaryRow label="Net Gelir" value={formatCurrency(calc.netRevenueAfterDiscount, sym)} bold />
          <div className="border-t border-border" />
          <SummaryRow label="KDV" value={formatCurrency(calc.totalTax, sym)} />
          <SummaryRow label="Vergisiz Gelir" value={formatCurrency(calc.netRevenueExTax, sym)} />
          <div className="border-t border-border" />
          <SummaryRow label="Ürün Maliyeti" value={formatCurrency(calc.totalProductCost, sym)} />
          {calc.giftCost > 0 && <SummaryRow label="Hediye Maliyeti" value={formatCurrency(calc.giftCost, sym)} />}
          <SummaryRow label="Kargo" value={formatCurrency(calc.shippingCost, sym)} />
          <SummaryRow label="Ambalaj" value={formatCurrency(calc.packagingCost, sym)} />
          <SummaryRow label="Komisyon" value={formatCurrency(calc.commissionCost, sym)} />
          {calc.extraExpense > 0 && <SummaryRow label="Ek Gider" value={formatCurrency(calc.extraExpense, sym)} />}
          <div className="border-t border-border" />
          <SummaryRow label="Brüt Kâr" value={formatCurrency(calc.grossProfit, sym)} bold />
          <SummaryRow label="Net Kâr" value={formatCurrency(calc.netProfit, sym)} bold accent />
          <SummaryRow label="Kâr Marjı" value={`%${calc.profitMargin.toFixed(1)}`} />

          <Button className="w-full mt-4" onClick={handleSave}>Siparişi Kaydet</Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, accent, warn }: { label: string; value: string; bold?: boolean; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${accent ? 'text-primary' : ''} ${warn ? 'text-warning' : ''}`}>{value}</span>
    </div>
  );
}
