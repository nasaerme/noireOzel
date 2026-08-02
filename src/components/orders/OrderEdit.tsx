import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import citiesData from "@/data/cities.json";

export default function OrderEdit({ order, onClose }: { order: Order; onClose: () => void }) {
  const { updateOrder, settings } = useApp();
  const sym = settings.currencySymbol;

  const [orderNumber, setOrderNumber] = useState(order.orderNumber || "");
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || "kredi_karti");
  const [codFee, setCodFee] = useState(order.codFee ?? (order.paymentMethod === 'kapida_odeme' ? (settings.defaultCashOnDeliveryFee ?? 100) : 0));
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

  const handleSave = () => {
    const originalDate = new Date(order.orderDate);
    const [year, month, day] = orderDate.split('-').map(Number);
    const finalDate = new Date(originalDate);
    if (!isNaN(finalDate.getTime())) {
      finalDate.setFullYear(year, month - 1, day);
    }
    const orderDateISO = finalDate.toISOString();

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
      codFee: paymentMethod === 'kapida_odeme' ? codFee : 0,
      cancellationReason,
    });
    toast.success("Sipariş güncellendi");
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label className="text-xs font-semibold text-primary">Sipariş No (Shopify Sync)</Label>
          <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className="font-mono font-semibold" />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label className="text-xs">Sipariş Tarihi</Label>
          <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Ödeme Yöntemi</Label>
          <Select value={paymentMethod} onValueChange={(v: string) => {
            setPaymentMethod(v);
            if (v === 'kredi_karti') {
              setPaymentStatus('odendi');
            } else if (v === 'kapida_odeme' && codFee === 0) {
              setPaymentStatus('beklemede');
              setCodFee(settings.defaultCashOnDeliveryFee ?? 100);
            }
          }}>
            <SelectTrigger><SelectValue placeholder="Yöntem Seç" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kredi_karti">💳 Kredi Kartı</SelectItem>
              <SelectItem value="kapida_odeme">📦 Kapıda Ödeme</SelectItem>
              <SelectItem value="havale">🏦 EFT / Havale</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Ödeme Durumu</Label>
          <Select
            value={paymentStatus}
            onValueChange={(v: string) => {
              setPaymentStatus(v);
              if (v === 'iptal' || v === 'iade') {
                setOrderStatus(v);
              }
            }}
          >
            <SelectTrigger><SelectValue placeholder="Ödeme Seç" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beklemede">⏳ Beklemede</SelectItem>
              <SelectItem value="odendi">✅ Ödendi</SelectItem>
              <SelectItem value="iptal">❌ İptal</SelectItem>
              <SelectItem value="iade">🔄 İade Edildi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {paymentMethod === 'kapida_odeme' && (
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label className="text-xs font-semibold text-warning">Kapıda Ödeme Bedeli ({sym})</Label>
            <Input type="number" value={codFee} onChange={e => setCodFee(Number(e.target.value))} />
          </div>
        )}
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label className="text-xs">Sipariş Durumu</Label>
          <Select value={orderStatus} onValueChange={(v: string) => {
            setOrderStatus(v);
            if (v === 'iptal' || v === 'iade') {
              setPaymentStatus(v);
            }
          }}>
            <SelectTrigger><SelectValue placeholder="Durum Seç" /></SelectTrigger>
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
        {(orderStatus === 'iptal' || orderStatus === 'iade' || paymentStatus === 'iptal' || paymentStatus === 'iade') && (
          <div className="space-y-2 col-span-2 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
            <Label className="text-xs font-semibold text-destructive flex items-center gap-1">
              {orderStatus === 'iade' || paymentStatus === 'iade' ? '🔄 İade Nedeni' : '❌ İptal Nedeni'}
            </Label>
            <Input
              value={cancellationReason}
              onChange={e => setCancellationReason(e.target.value)}
              placeholder={orderStatus === 'iade' || paymentStatus === 'iade' ? "Örn: Beden uymadı, Müşteri beğenmedi, Defolu ürün..." : "Örn: Müşteri vazgeçti, Yanlış sipariş verildi..."}
              className="bg-background text-xs"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs">İl</Label>
          <Select value={city} onValueChange={(v: string) => { setCity(v); setDistrict(""); }}>
            <SelectTrigger><SelectValue placeholder="İl Seç" /></SelectTrigger>
            <SelectContent>
              {citiesData.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">İlçe</Label>
          <Select value={district} onValueChange={(v: string) => setDistrict(v)} disabled={!city}>
            <SelectTrigger><SelectValue placeholder="İlçe Seç" /></SelectTrigger>
            <SelectContent>
              {districtOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">KDV Oranı (%)</Label>
          <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Kargo Maliyeti ({sym})</Label>
          <Input type="number" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Notlar</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sipariş ile ilgili notlar..." />
      </div>
      
      <div className="flex justify-end pt-4 gap-2">
        <Button variant="outline" onClick={onClose}>İptal</Button>
        <Button onClick={handleSave}>Kaydet</Button>
      </div>
    </div>
  );
}
