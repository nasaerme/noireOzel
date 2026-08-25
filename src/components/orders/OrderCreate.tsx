import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { OrderItem } from "@/types";
import { calculateOrder, getTieredCarrierFee } from "@/utils/calculations";
import { formatCurrency, generateId, generateOrderNumber } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Gift, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import citiesData from "@/data/cities.json";

export default function OrderCreate({ onClose }: { onClose: () => void }) {
  const { products, variants, settings, addOrder } = useApp();
  const sym = settings.currencySymbol;

  const [orderNumber, setOrderNumber] = useState(generateOrderNumber());
  const [paymentMethod, setPaymentMethod] = useState<string>('online_kredi_karti');
  const [codFee, setCodFee] = useState(100);
  const [carrierCodFee, setCarrierCodFee] = useState<number>(30);
  const [isCarrierFeeUserEdited, setIsCarrierFeeUserEdited] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'beklemede' | 'odendi' | 'iptal' | 'iade'>('odendi');

  const [items, setItems] = useState<OrderItem[]>([]);
  const [taxRate, setTaxRate] = useState(settings.defaultTaxRate ?? 10);
  const [shippingCost, setShippingCost] = useState(25);
  const [packagingCost, setPackagingCost] = useState(5);
  const [paymentCommissionRate, setPaymentCommissionRate] = useState(settings.defaultOnlineCcRate ?? settings.defaultPaymentCommissionRate ?? 3.29);
  const [paymentCommissionFixed, setPaymentCommissionFixed] = useState(settings.defaultPaymentCommissionFixed ?? 0);
  const [shopifyCommissionRate, setShopifyCommissionRate] = useState(settings.defaultShopifyCommissionRate ?? 2.0);
  const [shopifyCommissionFixed, setShopifyCommissionFixed] = useState(settings.defaultShopifyCommissionFixed ?? 0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [extraExpense, setExtraExpense] = useState(0);
  const [notes, setNotes] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  
  const selectedCityData = citiesData.find(c => c.name === city);
  const districtOptions = selectedCityData ? selectedCityData.districts : [];

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    setIsCarrierFeeUserEdited(false);
    if (method === 'online_kredi_karti' || method === 'kredi_karti') {
      setPaymentStatus('odendi');
      setCodFee(0);
      setPaymentCommissionRate(settings.defaultOnlineCcRate ?? 3.29);
      setCarrierCodFee(0);
    } else if (method === 'kapida_odeme_kk') {
      setPaymentStatus('beklemede');
      setCodFee(settings.defaultCashOnDeliveryFee ?? 100);
      setPaymentCommissionRate(settings.defaultCodCcRate ?? 2.80);
    } else if (method === 'kapida_odeme_nakit' || method === 'kapida_odeme') {
      setPaymentStatus('beklemede');
      setCodFee(settings.defaultCashOnDeliveryFee ?? 100);
      setPaymentCommissionRate(settings.defaultCodCashRate ?? 0);
    } else if (method === 'havale_eft' || method === 'havale') {
      setPaymentStatus('beklemede');
      setCodFee(0);
      setPaymentCommissionRate(settings.defaultBankTransferRate ?? 0);
      setCarrierCodFee(0);
    }
  };

  const activeProducts = useMemo(() => products.filter(p => p.active), [products]);

  const variantsByProduct = useMemo(() => {
    const map: Record<string, typeof variants> = {};
    variants.forEach(v => {
      if (!map[v.productId]) map[v.productId] = [];
      map[v.productId].push(v);
    });
    return map;
  }, [variants]);

  const addItem = (isGift = false) => {
    setItems(prev => [...prev, {
      id: generateId(),
      productId: '',
      variantId: '',
      quantity: 1,
      unitSalePrice: 0,
      unitCostPrice: 0,
      isGift,
    }]);
  };

  const updateItem = (idx: number, updates: Partial<OrderItem>) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[idx] = { ...newItems[idx], ...updates };

      if (updates.productId) {
        const p = products.find(x => x.id === updates.productId);
        if (p) {
          newItems[idx].unitSalePrice = p.salePrice;
          newItems[idx].unitCostPrice = p.costPrice;
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
      return newItems;
    });
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const isCod = paymentMethod === 'kapida_odeme' || paymentMethod === 'kapida_odeme_kk' || paymentMethod === 'kapida_odeme_nakit';

  useEffect(() => {
    if (isCod && !isCarrierFeeUserEdited) {
      let sub = 0;
      items.forEach(i => { if (!i.isGift) sub += i.unitSalePrice * i.quantity; });
      let disc = discountAmount;
      if (discountRate > 0) disc += sub * (discountRate / 100);
      const taxable = Math.max(0, sub - disc + codFee);
      const autoFee = getTieredCarrierFee(taxable);
      setCarrierCodFee(autoFee);
    }
  }, [items, discountAmount, discountRate, codFee, isCod, isCarrierFeeUserEdited]);

  const orderForCalc = useMemo(() => ({
    id: '', orderNumber: '', createdAt: '',
    items, taxRate, shippingCost, packagingCost,
    paymentCommissionRate, paymentCommissionFixed,
    shopifyCommissionRate, shopifyCommissionFixed,
    discountAmount, discountRate,
    extraExpense, notes: '', orderDate: '', city: '', district: '',
    paymentMethod, codFee: isCod ? codFee : 0, carrierCodFee: isCod ? carrierCodFee : 0, carrierCodFeeType: 'fixed' as const,
    paymentStatus, orderStatus: 'yeni'
  }), [items, taxRate, shippingCost, packagingCost, paymentCommissionRate, paymentCommissionFixed, shopifyCommissionRate, shopifyCommissionFixed, discountAmount, discountRate, extraExpense, paymentMethod, codFee, carrierCodFee, paymentStatus, isCod]);

  const calc = calculateOrder(orderForCalc);

  const handleSave = () => {
    if (items.length === 0) { toast.error("En az bir ürün ekleyin"); return; }
    if (items.some(i => !i.productId || !i.variantId)) { toast.error("Tüm ürün ve varyantları seçin"); return; }
    if (items.some(i => i.quantity <= 0 || isNaN(i.quantity))) { toast.error("Geçerli bir adet girin"); return; }

    const variantQuantities: Record<string, { total: number; productId: string }> = {};
    items.forEach(item => {
      if (item.variantId && item.productId) {
        if (!variantQuantities[item.variantId]) {
          variantQuantities[item.variantId] = { total: 0, productId: item.productId };
        }
        variantQuantities[item.variantId].total += item.quantity;
      }
    });

    const stockErrors: string[] = [];
    for (const [variantId, data] of Object.entries(variantQuantities)) {
      const v = variants.find(x => x.id === variantId);
      if (v && v.stock < data.total) {
        const p = products.find(x => x.id === data.productId);
        stockErrors.push(`${p?.name} (${v.name}): Stokta ${v.stock} adet var, toplam ${data.total} isteniyor.`);
      }
    }

    if (stockErrors.length > 0) {
      toast.error("Yetersiz Stok!", {
        description: stockErrors.join('\n'),
        duration: 5000,
      });
      return;
    }

    addOrder({
      orderNumber,
      items, taxRate, shippingCost, packagingCost,
      paymentCommissionRate, paymentCommissionFixed,
      shopifyCommissionRate, shopifyCommissionFixed,
      discountAmount, discountRate,
      extraExpense, notes, orderDate: orderDate ? new Date(orderDate.includes('T') ? orderDate : `${orderDate}T12:00:00`).toISOString() : new Date().toISOString(),
      paymentMethod,
      codFee: isCod ? codFee : 0,
      carrierCodFee: isCod ? carrierCodFee : 0,
      carrierCodFeeType: 'fixed',
      paymentStatus: paymentStatus,
      orderStatus: (paymentStatus === 'iptal' || paymentStatus === 'iade') ? paymentStatus : 'yeni',
      cancellationReason,
      city, district
    });

    toast.success("Sipariş oluşturuldu");
    onClose();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-foreground text-xs">
      
      {/* Sol Alan: Form Kartları (7 Kolon) */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* 1. Sipariş Kalemleri Kartı */}
        <div className="p-4 bg-card border border-border/60 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Sipariş Kalemleri</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addItem(false)} className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Ürün
              </Button>
              <Button size="sm" variant="outline" onClick={() => addItem(true)} className="h-8 text-xs gap-1 text-amber-600 border-amber-200 bg-amber-50/50 hover:bg-amber-100/50">
                <Gift className="h-3.5 w-3.5" /> Hediye
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-6 px-4 border border-dashed rounded-xl text-muted-foreground text-xs">
              Henüz siparişe ürün eklenmedi. "Ürün" butonunu kullanın.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const productVariants = item.productId ? (variantsByProduct[item.productId] || []) : [];
                return (
                  <div key={item.id} className="p-3 bg-secondary/20 rounded-xl border border-border/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select value={item.productId} onValueChange={v => updateItem(idx, { productId: v })}>
                        <SelectTrigger className="h-9 text-xs bg-background flex-1 font-medium"><SelectValue placeholder="Ürün seç" /></SelectTrigger>
                        <SelectContent>
                          {activeProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={item.variantId} onValueChange={v => updateItem(idx, { variantId: v })} disabled={!item.productId}>
                        <SelectTrigger className="h-9 text-xs bg-background flex-1 font-medium"><SelectValue placeholder="Beden" /></SelectTrigger>
                        <SelectContent>
                          {productVariants.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} (Stok: {v.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="h-9 text-xs bg-background w-16 text-center" placeholder="1" />

                      <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0 min-w-[70px] text-right">
                        {formatCurrency(item.isGift ? 0 : (item.unitSalePrice * item.quantity), sym)}
                      </span>

                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-[11px] text-muted-foreground font-medium px-1 flex gap-4">
                      <span>Satış: {formatCurrency(item.unitSalePrice, sym)}</span>
                      <span>Maliyet: {formatCurrency(item.unitCostPrice, sym)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Sipariş Bilgileri (4 Kolon Yan Yana) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Sipariş No (Shopify)</Label>
            <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className="h-9 font-mono text-xs font-semibold bg-background" />
          </div>
          <div>
            <Label className="text-xs">Sipariş Tarihi</Label>
            <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="h-9 text-xs bg-background" />
          </div>
          <div>
            <Label className="text-xs">İl</Label>
            <Select value={city} onValueChange={(v: string) => { setCity(v); setDistrict(""); }}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="İl Seç" /></SelectTrigger>
              <SelectContent>{citiesData.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">İlçe</Label>
            <Select value={district} onValueChange={(v: string) => setDistrict(v)} disabled={!city}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="İlçe Seç" /></SelectTrigger>
              <SelectContent>{districtOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* 3. Ödeme Detayları Kartı */}
        <div className="p-4 bg-secondary/30 rounded-xl border border-border/60 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ödeme Detayları</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1 block">Ödeme Yöntemi</Label>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Yöntem Seç" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online_kredi_karti">💳 Online Kredi Kartı</SelectItem>
                  <SelectItem value="kapida_odeme_kk">📱 Kapıda Ödeme (Kredi Kartı)</SelectItem>
                  <SelectItem value="kapida_odeme_nakit">💵 Kapıda Ödeme (Nakit)</SelectItem>
                  <SelectItem value="havale_eft">🏛️ Havale / EFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Ödeme Durumu</Label>
              <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Durum Seç" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beklemede">⏳ Beklemede</SelectItem>
                  <SelectItem value="odendi">✅ Ödendi</SelectItem>
                  <SelectItem value="iptal">❌ İptal</SelectItem>
                  <SelectItem value="iade">🔄 İade Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isCod && (
              <>
                <div>
                  <Label className="text-xs font-medium text-amber-700 dark:text-amber-400 block mb-1">Müşteriden Alınan Kapıda Öd. Bedeli ({sym})</Label>
                  <Input type="number" value={codFee} onChange={e => setCodFee(Number(e.target.value))} className="h-9 text-xs bg-background font-semibold" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-amber-700 dark:text-amber-400 block mb-1">Kargo Firması Kesintisi ({sym})</Label>
                  <Input type="number" step="0.1" value={carrierCodFee} onChange={e => { setIsCarrierFeeUserEdited(true); setCarrierCodFee(Number(e.target.value)); }} className="h-9 text-xs bg-background font-semibold" placeholder="30" />
                </div>
              </>
            )}

            {(paymentStatus === 'iptal' || paymentStatus === 'iade') && (
              <div className="sm:col-span-2 p-2.5 bg-destructive/10 rounded-lg border border-destructive/30 space-y-1">
                <Label className="text-xs font-semibold text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {paymentStatus === 'iade' ? 'İade Nedeni' : 'İptal Nedeni'}
                </Label>
                <Input
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder={paymentStatus === 'iade' ? "Örn: Beden uymadı, Müşteri beğenmedi..." : "Örn: Müşteri vazgeçti..."}
                  className="text-xs bg-background h-8"
                />
              </div>
            )}
          </div>
        </div>

        {/* 4. İndirim ve Vergi (3 Kolon) */}
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">KDV Oranı (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
          <div><Label className="text-xs">İndirim Tutarı ({sym})</Label><Input type="number" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
          <div><Label className="text-xs">İndirim Oranı (%)</Label><Input type="number" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
        </div>

        {/* 5. Kargo ve Ambalaj (3 Kolon) */}
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">Kargo Maliyeti ({sym})</Label><Input type="number" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
          <div><Label className="text-xs">Ambalaj ({sym})</Label><Input type="number" value={packagingCost} onChange={e => setPackagingCost(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
          <div><Label className="text-xs">Ek Hizmet Bedeli ({sym})</Label><Input type="number" value={extraExpense} onChange={e => setExtraExpense(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
        </div>

        {/* 6. Ödeme Sağlayıcı Komisyonu */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ödeme Sağlayıcı Komisyonu</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Oran (%)</Label><Input type="number" step="0.01" value={paymentCommissionRate} onChange={e => setPaymentCommissionRate(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
            <div><Label className="text-xs">Sabit Ücret ({sym})</Label><Input type="number" step="0.01" value={paymentCommissionFixed} onChange={e => setPaymentCommissionFixed(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
          </div>
        </div>

        {/* 7. Shopify Komisyonu */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shopify Komisyonu</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Oran (%)</Label><Input type="number" step="0.01" value={shopifyCommissionRate} onChange={e => setShopifyCommissionRate(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
            <div><Label className="text-xs">Sabit Ücret ({sym})</Label><Input type="number" step="0.01" value={shopifyCommissionFixed} onChange={e => setShopifyCommissionFixed(Number(e.target.value))} className="h-9 text-xs bg-background mt-1" /></div>
          </div>
        </div>

        {/* 8. Notlar */}
        <div>
          <Label className="text-xs">Notlar</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Not ekleyin..." className="h-9 text-xs bg-background mt-1" />
        </div>

      </div>

      {/* Sağ Panel: Sipariş Özeti (5 Kolon) */}
      <div className="lg:col-span-5">
        <div className="sticky top-2 bg-[#f9fafb] dark:bg-secondary/40 rounded-2xl border border-slate-200/90 dark:border-border/80 p-5 space-y-2.5">
          <h3 className="font-bold text-[15px] text-slate-800 dark:text-foreground mb-3.5">Sipariş Özeti</h3>
          <SummaryRow label="Ara Toplam" value={formatCurrency(calc.subtotal, sym)} />
          {isCod && calc.codFee > 0 && (
            <SummaryRow label="Müşteri Kapıda Öd. Bedeli" value={`+${formatCurrency(calc.codFee, sym)}`} accent />
          )}
          {calc.totalDiscount > 0 && <SummaryRow label="İndirim" value={`-${formatCurrency(calc.totalDiscount, sym)}`} warn />}
          <SummaryRow label="Sipariş Toplamı" value={formatCurrency(calc.taxableAmount, sym)} bold />
          <SummaryRow label={`Vergiler (KDV %${taxRate} Dahil)`} value={formatCurrency(calc.totalTax, sym)} />
          
          <div className="border-t border-slate-200/80 dark:border-border/60 my-2" />
          
          <SummaryRow label="Ürün Maliyeti" value={formatCurrency(calc.totalProductCost, sym)} />
          {calc.giftCost > 0 && <SummaryRow label="Hediye Maliyeti" value={formatCurrency(calc.giftCost, sym)} />}
          <SummaryRow label="Kargo" value={formatCurrency(calc.shippingCost, sym)} />
          {calc.carrierCodFeeCost > 0 && <SummaryRow label="Kargo Kapıda Öd. Kesintisi" value={formatCurrency(calc.carrierCodFeeCost, sym)} />}
          <SummaryRow label="Ambalaj" value={formatCurrency(calc.packagingCost, sym)} />
          
          <div className="border-t border-slate-200/80 dark:border-border/60 my-2" />
          
          <SummaryRow label="Ödeme Komisyonu" value={formatCurrency(calc.paymentCommissionCost, sym)} />
          <SummaryRow label="Shopify Komisyonu" value={formatCurrency(calc.shopifyCommissionCost, sym)} />
          <SummaryRow label="Toplam Komisyon" value={formatCurrency(calc.totalCommissionCost, sym)} bold />
          {calc.extraExpense > 0 && <SummaryRow label="Ek Hizmet Bedeli" value={formatCurrency(calc.extraExpense, sym)} />}
          
          <div className="border-t border-slate-200/80 dark:border-border/60 my-2" />
          
          <SummaryRow label="Toplam Maliyet" value={formatCurrency(calc.totalCost, sym)} />
          <SummaryRow label="Brüt Kâr" value={formatCurrency(calc.grossProfit, sym)} bold />
          <SummaryRow label="Net Kâr" value={formatCurrency(calc.netProfit, sym)} bold accent />
          <SummaryRow label="Kâr Marjı" value={`%${calc.profitMargin.toFixed(1)}`} />

          <Button className="w-full h-11 mt-4 text-[14px] font-bold rounded-xl bg-[#00b074] hover:bg-[#009663] text-white shadow-xs transition-all" onClick={handleSave}>
            Siparişi Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, accent, warn }: { label: string; value: string; bold?: boolean; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between items-center py-[3px] text-[13px]">
      <span className={`${bold ? 'font-bold text-slate-800 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground font-normal'}`}>{label}</span>
      <span className={`font-mono ${bold ? 'font-bold text-slate-900 dark:text-foreground' : 'text-slate-700 dark:text-slate-200 font-normal'} ${accent ? '!text-[#10b981] !font-bold' : ''} ${warn ? '!text-amber-600 !font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}
