import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Order } from "@/types";
import { calculateOrder } from "@/utils/calculations";
import { formatCurrency, formatDate, orderStatusLabels, paymentStatusLabels, orderStatusColors, paymentStatusColors } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import OrderCreate from "@/components/orders/OrderCreate";

export default function Orders() {
  const { orders, deleteOrder, settings, getProduct, getVariant } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const sym = settings.currencySymbol;

  const filtered = orders.filter(o => {
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && o.orderStatus !== statusFilter) return false;
    if (payFilter !== "all" && o.paymentStatus !== payFilter) return false;
    return true;
  });

  const handleDelete = (id: string) => {
    if (confirm("Bu siparişi silmek istediğinize emin misiniz? Stok geri yüklenecek.")) {
      deleteOrder(id);
      toast.success("Sipariş silindi");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Siparişler</h1>
          <p className="text-sm text-muted-foreground">{orders.length} sipariş</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Yeni Sipariş</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sipariş ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(orderStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ödeme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ödemeler</SelectItem>
            {Object.entries(paymentStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Sipariş No</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tarih</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Kalem</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Durum</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Ödeme</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Gelir</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Kâr</th>
                <th className="text-right p-3 font-medium text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const calc = calculateOrder(o);
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-medium">{o.orderNumber}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(o.orderDate)}</td>
                    <td className="p-3">{o.items.length}</td>
                    <td className="p-3"><Badge variant="secondary" className={`text-[10px] ${orderStatusColors[o.orderStatus]}`}>{orderStatusLabels[o.orderStatus]}</Badge></td>
                    <td className="p-3"><Badge variant="secondary" className={`text-[10px] ${paymentStatusColors[o.paymentStatus]}`}>{paymentStatusLabels[o.paymentStatus]}</Badge></td>
                    <td className="p-3 text-right font-medium">{formatCurrency(calc.netRevenueAfterDiscount, sym)}</td>
                    <td className={`p-3 text-right font-medium ${calc.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(calc.netProfit, sym)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailOrder(o)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Sipariş bulunamadı</p>
          </div>
        )}
      </div>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yeni Sipariş Oluştur</DialogTitle></DialogHeader>
          <OrderCreate onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      {detailOrder && (
        <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Sipariş Detayı - {detailOrder.orderNumber}</DialogTitle></DialogHeader>
            <OrderDetail order={detailOrder} sym={sym} getProduct={getProduct} getVariant={getVariant} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function OrderDetail({ order, sym, getProduct, getVariant }: { order: Order; sym: string; getProduct: (id: string) => any; getVariant: (id: string) => any }) {
  const calc = calculateOrder(order);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Tarih:</span> {formatDate(order.orderDate)}</div>
        <div><span className="text-muted-foreground">Durum:</span> {orderStatusLabels[order.orderStatus]}</div>
        <div><span className="text-muted-foreground">Ödeme:</span> {paymentStatusLabels[order.paymentStatus]}</div>
      </div>

      <div>
        <h4 className="font-medium text-sm mb-2">Ürünler</h4>
        {order.items.map((item, i) => {
          const p = getProduct(item.productId);
          const v = getVariant(item.variantId);
          return (
            <div key={i} className="flex justify-between py-2 border-b border-border/50 text-sm">
              <div>
                <span className="font-medium">{p?.name}</span> - {v?.name}
                {item.isGift && <Badge variant="secondary" className="ml-2 text-[10px]">Hediye</Badge>}
              </div>
              <div className="text-right">
                <span>{item.quantity} × {formatCurrency(item.unitSalePrice, sym)}</span>
                {!item.isGift && <span className="ml-3 font-medium">{formatCurrency(item.unitSalePrice * item.quantity, sym)}</span>}
                {item.isGift && <span className="ml-3 text-muted-foreground">₺0,00</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
        <Row label="Brüt Gelir" value={formatCurrency(calc.grossRevenue, sym)} />
        <Row label="Toplam İndirim" value={`-${formatCurrency(calc.totalDiscount, sym)}`} />
        <Row label="İndirim Sonrası Gelir" value={formatCurrency(calc.netRevenueAfterDiscount, sym)} bold />
        <div className="border-t border-border my-2" />
        <Row label="KDV" value={formatCurrency(calc.totalTax, sym)} />
        <Row label="Vergisiz Gelir" value={formatCurrency(calc.netRevenueExTax, sym)} />
        <div className="border-t border-border my-2" />
        <Row label="Ürün Maliyeti" value={formatCurrency(calc.totalProductCost, sym)} />
        <Row label="Hediye Maliyeti" value={formatCurrency(calc.giftCost, sym)} />
        <Row label="Kargo Maliyeti" value={formatCurrency(calc.shippingCost, sym)} />
        <Row label="Ambalaj Maliyeti" value={formatCurrency(calc.packagingCost, sym)} />
        <Row label="Komisyon" value={formatCurrency(calc.commissionCost, sym)} />
        <Row label="Ek Gider" value={formatCurrency(calc.extraExpense, sym)} />
        <div className="border-t border-border my-2" />
        <Row label="Brüt Kâr" value={formatCurrency(calc.grossProfit, sym)} bold />
        <Row label="Net Kâr" value={formatCurrency(calc.netProfit, sym)} bold accent />
        <Row label="Kâr Marjı" value={`%${calc.profitMargin.toFixed(1)}`} />
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${accent ? 'text-primary' : ''}`}>{value}</span>
    </div>
  );
}
