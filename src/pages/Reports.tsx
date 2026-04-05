import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { calculateOrder } from "@/utils/calculations";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

type Period = 'today' | 'week' | 'month' | 'custom';

export default function Reports() {
  const { orders, expenses, products, variants, settings } = useApp();
  const sym = settings.currencySymbol;
  const [period, setPeriod] = useState<Period>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 86400000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
        end = endDate ? new Date(endDate + 'T23:59:59') : now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }
    return { start, end };
  }, [period, startDate, endDate]);

  const metrics = useMemo(() => {
    const filteredOrders = orders.filter(o => {
      const d = new Date(o.orderDate);
      return d >= dateRange.start && d <= dateRange.end;
    });

    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= dateRange.start && d <= dateRange.end;
    });

    let totalOrders = filteredOrders.length;
    let unitsSold = 0;
    let grossRevenue = 0, netRevenueExTax = 0, totalProductCost = 0;
    let shippingCost = 0, packagingCost = 0, commissionCost = 0, giftCost = 0, totalDiscounts = 0, totalTax = 0;

    filteredOrders.forEach(o => {
      const calc = calculateOrder(o);
      unitsSold += o.items.reduce((s, i) => s + i.quantity, 0);
      grossRevenue += calc.grossRevenue;
      netRevenueExTax += calc.netRevenueExTax;
      totalProductCost += calc.totalProductCost;
      shippingCost += calc.shippingCost;
      packagingCost += calc.packagingCost;
      commissionCost += calc.commissionCost;
      giftCost += calc.giftCost;
      totalDiscounts += calc.totalDiscount;
      totalTax += calc.totalTax;
    });

    const totalBusinessExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = grossRevenue - totalDiscounts - totalProductCost - giftCost;
    const netProfit = netRevenueExTax - totalProductCost - giftCost - shippingCost - packagingCost - commissionCost - totalBusinessExpenses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // Product sales
    const productSales: Record<string, number> = {};
    const variantSales: Record<string, number> = {};
    filteredOrders.forEach(o => o.items.forEach(item => {
      if (!item.isGift) {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        variantSales[item.variantId] = (variantSales[item.variantId] || 0) + item.quantity;
      }
    }));

    const topProducts = Object.entries(productSales).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id, qty]) => ({
      name: products.find(p => p.id === id)?.name || id,
      adet: qty,
    }));

    const topVariants = Object.entries(variantSales).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id, qty]) => {
      const v = variants.find(x => x.id === id);
      const p = products.find(x => x.id === v?.productId);
      return { name: `${p?.name} ${v?.name}`, adet: qty };
    });

    // Expense breakdown
    const expBreakdown = settings.expenseCategories.map(cat => ({
      name: cat.name,
      value: filteredExpenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
      color: cat.color,
    })).filter(x => x.value > 0);

    // Revenue over time
    const revenueOverTime: Record<string, { date: string; gelir: number; kar: number; siparis: number }> = {};
    filteredOrders.forEach(o => {
      const key = o.orderDate.split('T')[0];
      if (!revenueOverTime[key]) revenueOverTime[key] = { date: key, gelir: 0, kar: 0, siparis: 0 };
      const calc = calculateOrder(o);
      revenueOverTime[key].gelir += calc.netRevenueAfterDiscount;
      revenueOverTime[key].kar += calc.netProfit;
      revenueOverTime[key].siparis += 1;
    });
    const timeData = Object.values(revenueOverTime).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalOrders, unitsSold, grossRevenue, netRevenueExTax, totalProductCost,
      shippingCost, packagingCost, commissionCost, giftCost, totalDiscounts, totalTax,
      totalBusinessExpenses, grossProfit, netProfit, profitMargin,
      topProducts, topVariants, expBreakdown, timeData,
    };
  }, [orders, expenses, dateRange, products, variants, settings]);

  const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#94a3b8'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Raporlar</h1>
        <p className="text-sm text-muted-foreground">Detaylı iş analizi</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">Dönem</Label>
          <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="custom">Özel Tarih</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === 'custom' && (
          <>
            <div><Label className="text-xs">Başlangıç</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[160px]" /></div>
            <div><Label className="text-xs">Bitiş</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[160px]" /></div>
          </>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI label="Sipariş" value={metrics.totalOrders.toString()} />
        <KPI label="Satılan Adet" value={metrics.unitsSold.toString()} />
        <KPI label="Brüt Gelir" value={formatCurrency(metrics.grossRevenue, sym)} />
        <KPI label="Net Kâr" value={formatCurrency(metrics.netProfit, sym)} accent />
        <KPI label="Kâr Marjı" value={`%${metrics.profitMargin.toFixed(1)}`} />
      </div>

      {/* Detail breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Vergisiz Gelir" value={formatCurrency(metrics.netRevenueExTax, sym)} small />
        <KPI label="Ürün Maliyeti" value={formatCurrency(metrics.totalProductCost, sym)} small />
        <KPI label="Kargo" value={formatCurrency(metrics.shippingCost, sym)} small />
        <KPI label="Ambalaj" value={formatCurrency(metrics.packagingCost, sym)} small />
        <KPI label="Komisyon" value={formatCurrency(metrics.commissionCost, sym)} small />
        <KPI label="Hediye" value={formatCurrency(metrics.giftCost, sym)} small />
        <KPI label="İndirimler" value={formatCurrency(metrics.totalDiscounts, sym)} small />
        <KPI label="İşletme Gideri" value={formatCurrency(metrics.totalBusinessExpenses, sym)} small />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics.timeData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Gelir & Kâr Trendi</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.timeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="gelir" name="Gelir" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="kar" name="Kâr" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {metrics.topProducts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">En Çok Satan Ürünler</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                    <Bar dataKey="adet" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {metrics.expBreakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Gider Dağılımı</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metrics.expBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`} labelLine={false}>
                      {metrics.expBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color || pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} formatter={(value: number) => formatCurrency(value, sym)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {metrics.timeData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Günlük Sipariş Sayısı</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.timeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                    <Bar dataKey="siparis" name="Sipariş" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className={`metric-card ${small ? 'p-3' : ''}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold ${accent ? 'text-primary' : ''} ${small ? 'text-base' : 'text-lg'}`}>{value}</p>
    </div>
  );
}
