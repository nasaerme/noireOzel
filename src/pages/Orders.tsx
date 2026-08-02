import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Order } from "@/types";
import { calculateOrder } from "@/utils/calculations";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Eye, Trash2, ShoppingCart, Pencil, ChevronLeft, ChevronRight, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import OrderCreate from "@/components/orders/OrderCreate";
import OrderEdit from "@/components/orders/OrderEdit";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Orders() {
  const { orders, updateOrder, deleteOrder, deleteOrders, settings, getProduct, getVariant } = useApp();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Quick Action Modal state (İade & İptal)
  const [actionModalOrder, setActionModalOrder] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<'iade' | 'iptal' | null>(null);
  const [actionReason, setActionReason] = useState<string>("");

  const ITEMS_PER_PAGE = 50;
  const sym = settings.currencySymbol;

  const openActionModal = (order: Order, type: 'iade' | 'iptal') => {
    setActionModalOrder(order);
    setActionType(type);
    setActionReason(order.cancellationReason || "");
  };

  const handleConfirmAction = () => {
    if (!actionModalOrder || !actionType) return;

    updateOrder({
      ...actionModalOrder,
      orderStatus: actionType,
      paymentStatus: actionType,
      cancellationReason: actionReason,
    });

    toast.success(actionType === 'iade' ? `Sipariş #${actionModalOrder.orderNumber} İADE edildi` : `Sipariş #${actionModalOrder.orderNumber} İPTAL edildi`);
    setActionModalOrder(null);
    setActionType(null);
    setActionReason("");
    if (detailOrder && detailOrder.id === actionModalOrder.id) {
      setDetailOrder(null);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
      if (startDate && new Date(o.orderDate) < new Date(startDate)) return false;
      if (endDate && new Date(o.orderDate) > new Date(endDate + 'T23:59:59')) return false;

      if (paymentMethodFilter !== "all" && o.paymentMethod !== paymentMethodFilter) return false;
      if (paymentStatusFilter !== "all") {
        const pStatus = o.paymentStatus || 'beklemede';
        if (pStatus !== paymentStatusFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
      if (sortBy === "date-asc") return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
      
      const calcA = calculateOrder(a);
      const calcB = calculateOrder(b);
      
      if (sortBy === "profit-desc") return calcB.netProfit - calcA.netProfit;
      if (sortBy === "profit-asc") return calcA.netProfit - calcB.netProfit;
      return 0;
    });
  }, [orders, search, startDate, endDate, paymentMethodFilter, paymentStatusFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, paymentMethodFilter, paymentStatusFilter, sortBy]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleDelete = (id: string) => {
    if (confirm("Bu siparişi silmek istediğinize emin misiniz? Stoklar geri yüklenecektir.")) {
      deleteOrder(id);
      toast.success("Sipariş silindi");
      if (detailOrder?.id === id) setDetailOrder(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    deleteOrders(Array.from(selectedIds));
    toast.success(`${selectedIds.size} sipariş silindi`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Siparişler</h1>
          <p className="text-sm text-muted-foreground">Toplam {filtered.length} sipariş listeleniyor</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Seçilenleri Sil ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Yeni Sipariş
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sipariş no ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
        
        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Ödeme Yöntemi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ödeme Yöntemleri</SelectItem>
            <SelectItem value="kredi_karti">💳 Kredi Kartı</SelectItem>
            <SelectItem value="kapida_odeme">📦 Kapıda Ödeme</SelectItem>
            <SelectItem value="havale">🏦 EFT / Havale</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Ödeme Durumu" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ödeme Durumları</SelectItem>
            <SelectItem value="odendi">✅ Ödendi</SelectItem>
            <SelectItem value="beklemede">⏳ Beklemede</SelectItem>
            <SelectItem value="iade">🔄 İade Edildi</SelectItem>
            <SelectItem value="iptal">❌ İptal Edildi</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="text-xs h-9"
          />
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="text-xs h-9"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Sıralama" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Tarih (Yeni-Eski)</SelectItem>
            <SelectItem value="date-asc">Tarih (Eski-Yeni)</SelectItem>
            <SelectItem value="profit-desc">Net Kâr (Yüksek-Düşük)</SelectItem>
            <SelectItem value="profit-asc">Net Kâr (Düşük-Yüksek)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox
                    checked={paginatedOrders.length > 0 && selectedIds.size === paginatedOrders.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3">Sipariş No</th>
                <th className="p-3">Tarih</th>
                <th className="p-3">Ödeme Türü</th>
                <th className="p-3">Ödeme Durumu</th>
                <th className="p-3">İl / İlçe</th>
                <th className="p-3">Ürün</th>
                <th className="p-3 text-right">Ciro</th>
                <th className="p-3 text-right">Net Kâr</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedOrders.map(o => {
                const calc = calculateOrder(o);
                const isReturned = o.orderStatus === 'iade' || o.paymentStatus === 'iade';
                const isCancelled = calc.isCancelled;

                return (
                  <tr key={o.id} className={`hover:bg-secondary/30 transition-colors ${isCancelled ? 'opacity-70 bg-destructive/5' : ''}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={selectedIds.has(o.id)}
                        onCheckedChange={() => toggleSelect(o.id)}
                      />
                    </td>
                    <td className="p-3 font-semibold font-mono">{o.orderNumber}</td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDate(o.orderDate)}</td>
                    <td className="p-3">
                      {o.paymentMethod === 'kapida_odeme' ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px]">
                          📦 Kapıda Ödeme
                          {o.codFee > 0 && <span className="font-semibold text-[10px] ml-0.5">(+{o.codFee}₺)</span>}
                        </Badge>
                      ) : o.paymentMethod === 'havale' ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[11px]">
                          🏦 EFT / Havale
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[11px]">
                          💳 Kredi Kartı
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {isCancelled ? (
                        <div>
                          <Badge variant="destructive" className="text-[11px]">
                            {isReturned ? '🔄 İade Edildi' : '❌ İptal Edildi'}
                          </Badge>
                          {o.cancellationReason && (
                            <p className="text-[10px] text-destructive font-medium mt-0.5 truncate max-w-[150px]" title={o.cancellationReason}>
                              💬 {o.cancellationReason}
                            </p>
                          )}
                        </div>
                      ) : o.paymentStatus === 'odendi' ? (
                        <Badge variant="secondary" className="bg-success/20 text-success hover:bg-success/30 text-[11px]">✅ Ödendi</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/20 text-warning hover:bg-warning/30 text-[11px]">⏳ Beklemede</Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs">{o.city ? `${o.city} / ${o.district || ''}` : '-'}</td>
                    <td className="p-3">{o.items.length}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(calc.taxableAmount, sym)}</td>
                    <td className={`p-3 text-right font-medium ${calc.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(calc.netProfit, sym)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailOrder(o)} title="Detay Gör"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setEditOrder(o)} title="Düzenle"><Pencil className="h-3.5 w-3.5" /></Button>
                        
                        {/* Quick Return & Cancel Buttons */}
                        {!isCancelled && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" 
                              onClick={() => openActionModal(o, 'iade')} 
                              title="Siparişi İade Et"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                              onClick={() => openActionModal(o, 'iptal')} 
                              title="Siparişi İptal Et"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(o.id)} title="Sil"><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          <div>
            Toplam {filtered.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} gösteriliyor
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Önceki
            </Button>
            <span className="font-medium">
              Sayfa {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 text-xs gap-1"
            >
              Sonraki <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {createOpen && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Sipariş Oluştur</DialogTitle>
              <DialogDescription className="sr-only">Yeni sipariş oluşturma formu</DialogDescription>
            </DialogHeader>
            <OrderCreate onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      {detailOrder && (
        <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sipariş Detayı - {detailOrder.orderNumber}</DialogTitle>
              <DialogDescription className="sr-only">Sipariş ayrıntıları ve tutarlar</DialogDescription>
            </DialogHeader>
            <OrderDetail 
              order={detailOrder} 
              sym={sym} 
              getProduct={getProduct} 
              getVariant={getVariant} 
              onAction={openActionModal}
            />
          </DialogContent>
        </Dialog>
      )}

      {editOrder && (
        <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Siparişi Düzenle - {editOrder.orderNumber}</DialogTitle>
              <DialogDescription className="sr-only">Sipariş düzenleme formu</DialogDescription>
            </DialogHeader>
            <OrderEdit order={editOrder} onClose={() => setEditOrder(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* QUICK ACTION MODAL (İADE / İPTAL) */}
      {actionModalOrder && actionType && (
        <Dialog open={!!actionModalOrder} onOpenChange={() => setActionModalOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'iade' ? '🔄 Siparişi İade Et' : '❌ Siparişi İptal Et'}
                <Badge variant="outline" className="font-mono">#{actionModalOrder.orderNumber}</Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sipariş durumunu <strong>{actionType === 'iade' ? 'İade Edildi' : 'İptal Edildi'}</strong> olarak güncelleyin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
                <p className="font-semibold">
                  {actionType === 'iade' ? '🔄 İade İşlemi & Kargo Yükü' : '❌ İptal İşlemi & Kargo Yükü'}
                </p>
                <p>
                  {actionType === 'iade' ? (
                    <>Ürünler stoka geri eklenecektir. Gidiş (%100) + Dönüş (%100) = 2 kat kargo maliyeti zararı hesaplanacaktır.</>
                  ) : actionModalOrder.paymentMethod === 'kredi_karti' ? (
                    <>Kredi kartı iptalinde ürün kargolanmadığı için ₺0,00 kargo zararı oluşur. Ürünler stoka geri yüklenecektir.</>
                  ) : (
                    <>Kapıda ödeme iptalinde Gidiş (%100) + Dönüş (%50) = 1.5 kat kargo maliyet kaybı yansıtılacaktır.</>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  {actionType === 'iade' ? 'İade Nedeni (Opsiyonel)' : 'İptal Nedeni (Opsiyonel)'}
                </Label>
                <Input
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder={actionType === 'iade' ? "Örn: Beden küçük geldi, Müşteri beğenmedi..." : "Örn: Müşteri vazgeçti, Yanlış sipariş..."}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActionModalOrder(null)}>Vazgeç</Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleConfirmAction}
                className="gap-1.5"
              >
                {actionType === 'iade' ? <RotateCcw className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {actionType === 'iade' ? 'İade Et' : 'İptal Et'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toplu Silme Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} siparişi silmek istediğinize emin misiniz? Stoklar geri yüklenecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function OrderDetail({ 
  order, 
  sym, 
  getProduct, 
  getVariant,
  onAction
}: { 
  order: Order; 
  sym: string; 
  getProduct: (id: string) => any; 
  getVariant: (id: string) => any;
  onAction?: (order: Order, type: 'iade' | 'iptal') => void;
}) {
  const calc = calculateOrder(order);
  const isCOD = order.paymentMethod === 'kapida_odeme';
  const isReturned = order.orderStatus === 'iade' || order.paymentStatus === 'iade';
  const isCC = order.paymentMethod === 'kredi_karti';

  return (
    <div className="space-y-4 text-xs">
      {/* Quick Action Buttons in Detail Modal */}
      {!calc.isCancelled && onAction && (
        <div className="flex gap-2 justify-end pb-3 border-b border-border">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 text-xs gap-1.5" 
            onClick={() => onAction(order, 'iade')}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Siparişi İade Et
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="text-xs gap-1.5" 
            onClick={() => onAction(order, 'iptal')}
          >
            <XCircle className="h-3.5 w-3.5" /> Siparişi İptal Et
          </Button>
        </div>
      )}

      {/* Notice for Cancelled/Returned orders */}
      {calc.isCancelled && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive space-y-1">
          <div className="flex justify-between items-center font-bold">
            <span>{isReturned ? '🔄 Bu Sipariş İade Edilmiştir' : '❌ Bu Sipariş İptal Edilmiştir'}</span>
            <span>Uygulanan Kargo Masraf Yükü: {formatCurrency(calc.cancellationPenalty, sym)}</span>
          </div>
          <p className="text-[11px] opacity-90">
            {isReturned
              ? 'İadelerde gidiş (%100) + dönüş (%100) kargo maliyet kaybı hesaba katılmıştır.'
              : isCC
              ? 'Kredi kartı iptallerinde ürün kargolanmadığı için kargo maliyeti yansıtılmamıştır (₺0,00).'
              : 'Kapıda ödeme iptallerinde gidiş kargosu (%100) + dönüş kargosu (%50) zararı yansıtılmıştır.'}
          </p>
          {order.cancellationReason && (
            <p className="text-xs pt-1.5 border-t border-destructive/20 font-medium">
              💬 Sebep: <span className="font-normal italic text-foreground">{order.cancellationReason}</span>
            </p>
          )}
        </div>
      )}

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
        <Row label="Ara Toplam" value={formatCurrency(calc.subtotal, sym)} />
        {isCOD && calc.codFee > 0 && <Row label="Kapıda Ödeme Hizmet Bedeli" value={`+${formatCurrency(calc.codFee, sym)}`} accent />}
        <Row label="Toplam İndirim" value={`-${formatCurrency(calc.totalDiscount, sym)}`} />
        <Row label="Sipariş Toplamı" value={formatCurrency(calc.taxableAmount, sym)} bold />
        <div className="border-t border-border my-2" />
        <Row label={`Vergiler (KDV %${order.taxRate} Dahil)`} value={formatCurrency(calc.totalTax, sym)} />
        <div className="border-t border-border my-2" />
        <Row label="Ürün Maliyeti" value={formatCurrency(calc.totalProductCost, sym)} />
        {calc.giftCost > 0 && <Row label="Hediye Maliyeti" value={formatCurrency(calc.giftCost, sym)} />}
        <Row label="Kargo Maliyeti" value={formatCurrency(calc.shippingCost, sym)} />
        <Row label="Ambalaj Maliyeti" value={formatCurrency(calc.packagingCost, sym)} />
        <Row label="Ödeme Komisyonu" value={formatCurrency(calc.paymentCommissionCost, sym)} />
        <Row label="Shopify Komisyonu" value={formatCurrency(calc.shopifyCommissionCost, sym)} />
        <Row label="Toplam Komisyon" value={formatCurrency(calc.totalCommissionCost, sym)} bold />
        {calc.extraExpense > 0 && <Row label="Ek Gider" value={formatCurrency(calc.extraExpense, sym)} />}
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
