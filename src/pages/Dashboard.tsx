import { useApp } from "@/contexts/AppContext";
import { calculateOrder } from "@/utils/calculations";
import { formatCurrency } from "@/utils/formatters";
import { TrendingUp, TrendingDown, ShoppingCart, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { orderStatusLabels, orderStatusColors, formatDate } from "@/utils/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useMemo } from "react";

export default function Dashboard() {
  const { orders, products, variants, expenses, settings } = useApp();
  const sym = settings.currencySymbol;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const metrics = useMemo(() => {
    let todayRev = 0, todayOrderProfit = 0, todayOrders = 0;
    let weekRev = 0, weekOrderProfit = 0;
    let monthRev = 0, monthOrderProfit = 0, monthOrders = 0;

    orders.forEach(o => {
      const calc = calculateOrder(o);
      const d = new Date(o.orderDate);
      if (o.orderDate.startsWith(todayStr)) {
        todayRev += calc.taxableAmount;
        todayOrderProfit += calc.netProfit;
        todayOrders++;
      }
      if (d >= weekAgo) {
        weekRev += calc.taxableAmount;
        weekOrderProfit += calc.netProfit;
      }
      if (d >= monthStart) {
        monthRev += calc.taxableAmount;
        monthOrderProfit += calc.netProfit;
        monthOrders++;
      }
    });

    const todayExpenses = expenses.filter(e => e.date.startsWith(todayStr)).reduce((s, e) => s + e.amount, 0);
    const monthExpenses = expenses.filter(e => new Date(e.date) >= monthStart).reduce((s, e) => s + e.amount, 0);
    const weekExpenses = expenses.filter(e => new Date(e.date) >= weekAgo).reduce((s, e) => s + e.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const todayProfit = todayOrderProfit - todayExpenses;
    const weekProfit = weekOrderProfit - weekExpenses;
    const monthProfit = monthOrderProfit - monthExpenses;
    const monthTotalCost = monthRev - monthProfit;

    return { todayRev, todayProfit, todayOrders, weekRev, weekProfit, monthRev, monthProfit, monthOrders, monthExpenses, monthTotalCost, totalExpenses };
  }, [orders, expenses, todayStr, weekAgo, monthStart]);

  const lowStockVariants = useMemo(() =>
    variants.filter(v => v.stock <= v.lowStockThreshold).slice(0, 8),
    [variants]
  );

  const recentOrders = orders.slice(0, 8);

  const chartData = useMemo(() => {
    const days: Record<string, { date: string; gelir: number; kar: number }> = {};
    const last14 = new Date(now.getTime() - 14 * 86400000);
    orders.forEach(o => {
      const d = new Date(o.orderDate);
      if (d >= last14) {
        const key = o.orderDate.split('T')[0];
        if (!days[key]) days[key] = { date: key, gelir: 0, kar: 0 };
        const calc = calculateOrder(o);
        days[key].gelir += calc.taxableAmount;
        days[key].kar += calc.netProfit;
      }
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders, now]);

  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(item => {
      if (!item.isGift) {
        map[item.productId] = (map[item.productId] || 0) + item.quantity;
      }
    }));
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, qty]) => ({ product: products.find(p => p.id === id), qty }));
  }, [orders, products]);

  const getProduct = (id: string) => products.find(p => p.id === id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gösterge Paneli</h1>
        <p className="text-muted-foreground text-sm mt-1">İşletme özetiniz</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Bugün</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard title="Gelir" value={formatCurrency(metrics.todayRev, sym)} icon={<TrendingUp className="h-4 w-4" />} accent />
            <MetricCard title="Net Kâr" value={formatCurrency(metrics.todayProfit, sym)} isNegative={metrics.todayProfit < 0} />
            <MetricCard title="Sipariş" value={metrics.todayOrders.toString()} icon={<ShoppingCart className="h-4 w-4" />} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Bu Ay</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Gelir" value={formatCurrency(metrics.monthRev, sym)} icon={<ArrowUpRight className="h-4 w-4" />} />
            <MetricCard title="Net Kâr" value={formatCurrency(metrics.monthProfit, sym)} isNegative={metrics.monthProfit < 0} />
            <MetricCard title="Toplam Gider" value={formatCurrency(metrics.monthTotalCost, sym)} icon={<ReceiptIcon className="h-4 w-4" />} />
            <MetricCard title="Sipariş" value={metrics.monthOrders.toString()} icon={<ShoppingCart className="h-4 w-4" />} />
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son 14 Gün Sipariş Gelir & Kâr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="gelir" name="Gelir" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="kar" name="Kâr" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Son Siparişler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map(o => {
                const calc = calculateOrder(o);
                return (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(o.orderDate)} · {o.items.length} kalem</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-[10px] ${orderStatusColors[o.orderStatus]}`}>
                        {orderStatusLabels[o.orderStatus]}
                      </Badge>
                      <span className="text-sm font-medium w-24 text-right">{formatCurrency(calc.taxableAmount, sym)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {lowStockVariants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Düşük Stok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockVariants.map(v => (
                    <div key={v.id} className="flex justify-between text-sm">
                      <span className="truncate">{getProduct(v.productId)?.name} - {v.name}</span>
                      <Badge variant="destructive" className="text-[10px]">{v.stock}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">En Çok Satanlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topProducts.map(({ product, qty }, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="truncate">{product?.name}</span>
                    <span className="text-muted-foreground">{qty} adet</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReceiptIcon(props: React.SVGAttributes<SVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>
  );
}

function MetricCard({ title, value, icon, accent, isNegative }: { title: string; value: string; icon?: React.ReactNode; accent?: boolean; isNegative?: boolean }) {
  const textColor = isNegative ? 'text-destructive' : '';
  return (
    <div className={`metric-card ${accent ? 'border-primary/30 bg-primary/5' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={`text-xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
