import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Banknote, Landmark, Smartphone, Hash, MapPin, AlertCircle, Save, Truck } from "lucide-react";
import citiesData from "@/data/cities.json";

export default function OrderEdit({ order, onClose }: { order: Order; onClose: () => void }) {
  const { updateOrder, settings } = useApp();
  const sym = settings.currencySymbol;

  const [orderNumber, setOrderNumber] = useState(order.orderNumber || "");
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || "online_kredi_karti");
  const isCodInitial = paymentMethod === 'kapida_odeme' || paymentMethod === 'kapida_odeme_kk' || paymentMethod === 'kapida_odeme_nakit';
  const [codFee, setCodFee] = useState(order.codFee ?? (isCodInitial ? (settings.defaultCashOnDeliveryFee ?? 100) : 0));
  const [carrierCodFee, setCarrierCodFee] = useState<number>(order.carrierCodFee ?? (isCodInitial ? 54.40 : 0));
  const [paymentCommissionRate, setPaymentCommissionRate] = useState<number>(order.paymentCommissionRate ?? 3.29);

  const [taxRate, setTaxRate] = useState(order.taxRate);
  const [shippingCost, setShippingCost] = useState(order.shippingCost);
  const [city, setCity] = useState(order.city || "");
  const [district, setDistrict] = useState(order.district || "");
  const [notes, setNotes] = useState(order.notes || "");
  const [orderStatus, setOrderStatus] = useState(order.orderStatus || "yeni");
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || "beklemede");
  const [cancellationReason, setCancellationReason] = useState(order.cancellationReason || "");
  const [orderDate, setOrderDate] = useState(
    order.orderDate ? order.orderDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );

  const selectedCityData = citiesData.find(c => c.name === city);
  const districtOptions = selectedCityData ? selectedCityData.districts : [];

  const handlePaymentMethodChange = (v: string) => {
    setPaymentMethod(v);
    if (v === 'online_kredi_karti' || v === 'kredi_karti') {
      setPaymentStatus('odendi');
      setCodFee(0);
      setPaymentCommissionRate(settings.defaultOnlineCcRate ?? 3.29);
      setCarrierCodFee(0);
    } else if (v === 'kapida_odeme_kk') {
      setPaymentStatus('beklemede');
      setCodFee(settings.defaultCashOnDeliveryFee ?? 100);
      setPaymentCommissionRate(settings.defaultCodCcRate ?? 2.80);
      setCarrierCodFee(54.40);
    } else if (v === 'kapida_odeme_nakit' || v === 'kapida_odeme') {
      setPaymentStatus('beklemede');
      setCodFee(settings.defaultCashOnDeliveryFee ?? 100);
      setPaymentCommissionRate(settings.defaultCodCashRate ?? 0);
      setCarrierCodFee(54.40);
    } else if (v === 'havale_eft' || v === 'havale') {
      setPaymentStatus('beklemede');
      setCodFee(0);
      setPaymentCommissionRate(settings.defaultBankTransferRate ?? 0);
      setCarrierCodFee(0);
    }
  };

  const isCod = paymentMethod === 'kapida_odeme' || paymentMethod === 'kapida_odeme_kk' || paymentMethod === 'kapida_odeme_nakit';

  const handleSave = () => {
    const orderDateISO = orderDate ? new Date(orderDate.includes('T') ? orderDate : `${orderDate}T12:00:00`).toISOString() : order.orderDate;

    updateOrder({
      ...order,
      orderNumber,
      orderDate: orderDateISO,
      taxRate,
      shippingCost,
      city,
      district,
      notes,
      orderStatus,
      paymentStatus,
      paymentMethod,
      paymentCommissionRate,
      codFee: isCod ? codFee : 0,
      carrierCodFee: isCod ? carrierCodFee : 0,
      carrierCodFeeType: 'fixed',
      cancellationReason,
    });
    toast.success("Sipariş güncellendi");
    onClose();
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Sipariş Başlık ve Konum Kartı */}
      <div className="p-4 bg-card border border-border/70 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
            <Hash className="h-3.5 w-3.5 text-primary" /> Genel Bilgiler
          </span>
          <Badge variant="outline" className="font-mono text-[11px]">
            #{orderNumber}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Sipariş No</Label>
            <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className="font-mono text-xs font-semibold h-9" />
          </div>
          <div>
            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Sipariş Tarihi</Label>
            <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="h-9 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">İl</Label>
            <Select value={city} onValueChange={(v: string) => { setCity(v); setDistrict(""); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="İl Seç" /></SelectTrigger>
              <SelectContent>
                {citiesData.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">İlçe</Label>
            <Select value={district} onValueChange={(v: string) => setDistrict(v)} disabled={!city}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="İlçe Seç" /></SelectTrigger>
              <SelectContent>
                {districtOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Ödeme Yöntemi & Durum Kartı */}
      <div className="p-4 bg-card border border-border/70 rounded-2xl shadow-xs space-y-3">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 text-[11px] border-b border-border/40 pb-2">
          <CreditCard className="h-3.5 w-3.5 text-primary" /> Ödeme & Durum Ayarları
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'online_kredi_karti', label: 'Online KK', rate: '%3.29', icon: CreditCard, color: 'border-primary/50 text-primary bg-primary/5' },
            { id: 'kapida_odeme_kk', label: 'Kapıda KK', rate: '%2.80', icon: Smartphone, color: 'border-amber-500/50 text-amber-600 bg-amber-500/5' },
            { id: 'kapida_odeme_nakit', label: 'Kapıda Nakit', rate: '%0', icon: Banknote, color: 'border-emerald-500/50 text-emerald-600 bg-emerald-500/5' },
            { id: 'havale_eft', label: 'Havale / EFT', rate: '%0', icon: Landmark, color: 'border-blue-500/50 text-blue-600 bg-blue-500/5' },
          ].map(m => {
            const IconComponent = m.icon;
            const isSelected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handlePaymentMethodChange(m.id)}
                className={`p-2.5 rounded-xl border text-left transition-all space-y-1 ${isSelected ? `${m.color} ring-2 ring-primary/20 shadow-xs font-semibold` : 'border-border/60 hover:border-border bg-background'}`}
              >
                <div className="flex items-center justify-between">
                  <IconComponent className="h-4 w-4" />
                  {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="text-[11px]">{m.label}</p>
                <p className="text-[10px] text-muted-foreground font-normal">{m.rate}</p>
              </button>
            );
          })}
        </div>

        {isCod && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" /> Kapıda Ödeme & Kesintiler</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-amber-900 dark:text-amber-200 mb-1 block">Müşteri Kapıda Öd. Bedeli ({sym})</Label>
                <Input type="number" value={codFee} onChange={e => setCodFee(Number(e.target.value))} className="h-8 text-xs bg-background font-semibold text-amber-600 border-amber-300" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-amber-900 dark:text-amber-200 mb-1 block">Kargo Kesintisi ({sym})</Label>
                <Input type="number" step="0.1" value={carrierCodFee} onChange={e => setCarrierCodFee(Number(e.target.value))} className="h-8 text-xs bg-background font-semibold" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Sipariş Durumu</Label>
            <Select value={orderStatus} onValueChange={(v: string) => {
              setOrderStatus(v);
              if (v === 'iptal' || v === 'iade') setPaymentStatus(v);
            }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Durum Seç" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yeni">Yeni</SelectItem>
                <SelectItem value="hazirlaniyor">Hazırlanıyor</SelectItem>
                <SelectItem value="kargoda">Kargoda</SelectItem>
                <SelectItem value="teslim_edildi">Teslim Edildi</SelectItem>
                <SelectItem value="iptal">İptal</SelectItem>
                <SelectItem value="iade">İade Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ödeme Durumu</Label>
            <Select value={paymentStatus} onValueChange={(v: string) => {
              setPaymentStatus(v);
              if (v === 'iptal' || v === 'iade') setOrderStatus(v);
            }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ödeme Seç" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beklemede">⏳ Beklemede</SelectItem>
                <SelectItem value="odendi">✅ Ödendi</SelectItem>
                <SelectItem value="iptal">❌ İptal</SelectItem>
                <SelectItem value="iade">🔄 İade Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(orderStatus === 'iptal' || orderStatus === 'iade' || paymentStatus === 'iptal' || paymentStatus === 'iade') && (
          <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/30 space-y-1">
            <Label className="text-[11px] font-semibold text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {orderStatus === 'iade' || paymentStatus === 'iade' ? 'İade Nedeni' : 'İptal Nedeni'}
            </Label>
            <Input
              value={cancellationReason}
              onChange={e => setCancellationReason(e.target.value)}
              placeholder={orderStatus === 'iade' || paymentStatus === 'iade' ? "Örn: Beden uymadı, Müşteri beğenmedi..." : "Örn: Müşteri vazgeçti..."}
              className="bg-background text-xs h-8"
            />
          </div>
        )}
      </div>

      {/* 3. Maliyet & Notlar Kartı */}
      <div className="p-4 bg-card border border-border/70 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-[11px]">POS Oranı (%)</Label><Input type="number" step="0.01" value={paymentCommissionRate} onChange={e => setPaymentCommissionRate(Number(e.target.value))} className="h-8 text-xs mt-1" /></div>
          <div><Label className="text-[11px]">KDV Oranı (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="h-8 text-xs mt-1" /></div>
          <div><Label className="text-[11px]">Kargo Maliyeti ({sym})</Label><Input type="number" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="h-8 text-xs mt-1" /></div>
        </div>

        <div>
          <Label className="text-[11px]">Sipariş Notları</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sipariş ile ilgili notlar..." className="h-8 text-xs mt-1" />
        </div>
      </div>

      <div className="flex justify-end pt-2 gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">Vazgeç</Button>
        <Button size="sm" onClick={handleSave} className="rounded-xl gap-1.5">
          <Save className="h-4 w-4" /> Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  );
}
