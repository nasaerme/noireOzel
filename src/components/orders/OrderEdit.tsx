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

  const [taxRate, setTaxRate] = useState(order.taxRate);
  const [shippingCost, setShippingCost] = useState(order.shippingCost);
  const [city, setCity] = useState(order.city || "");
  const [district, setDistrict] = useState(order.district || "");
  const [notes, setNotes] = useState(order.notes || "");

  const selectedCityData = citiesData.find(c => c.name === city);
  const districtOptions = selectedCityData ? selectedCityData.districts : [];

  const handleSave = () => {
    updateOrder({
      ...order,
      taxRate,
      shippingCost,
      city,
      district,
      notes,
    });
    toast.success("Sipariş güncellendi");
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
