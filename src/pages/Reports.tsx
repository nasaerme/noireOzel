import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { calculateOrder } from "@/utils/calculations";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import TurkeyMap from 'react-turkey-map';
import citiesData from "@/data/cities.json";

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'specific_month' | 'all_time' | 'custom';

export default function Reports() {
  const { orders, expenses, products, variants, settings } = useApp();
  const sym = settings.currencySymbol;
  const [period, setPeriod] = useState<Period>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [cityLimit, setCityLimit] = useState<number>(10);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 86400000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'all_time':
        start = new Date(2000, 0, 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'specific_month':
        start = new Date(selectedYear, selectedMonth, 1);
        end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
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
  }, [period, startDate, endDate, selectedYear, selectedMonth]);

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
    let subtotal = 0, totalTax = 0, totalProductCost = 0;
    let shippingCost = 0, packagingCost = 0, paymentCommission = 0, shopifyCommission = 0, totalCommission = 0;
    let giftCost = 0, totalDiscounts = 0;

    filteredOrders.forEach(o => {
      const calc = calculateOrder(o);
      unitsSold += o.items.reduce((s, i) => s + i.quantity, 0);
      subtotal += calc.taxableAmount;
      totalTax += calc.totalTax;
      totalProductCost += calc.totalProductCost;
      shippingCost += calc.shippingCost;
      packagingCost += calc.packagingCost;
      paymentCommission += calc.paymentCommissionCost;
      shopifyCommission += calc.shopifyCommissionCost;
      totalCommission += calc.totalCommissionCost;
      giftCost += calc.giftCost;
      totalDiscounts += calc.totalDiscount;
    });

    const totalBusinessExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalOrderCosts = totalTax + totalProductCost + giftCost + shippingCost + packagingCost + totalCommission;
    const totalExpensesAll = totalOrderCosts + totalBusinessExpenses;
    const grossProfit = subtotal - totalProductCost - giftCost;
    const netProfit = subtotal - totalOrderCosts - totalBusinessExpenses;
    const profitMargin = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;

    // Product sales
    const productSales: Record<string, { satis: number; hediye: number; revenue: number }> = {};
    const variantSales: Record<string, { satis: number; hediye: number; revenue: number }> = {};
    filteredOrders.forEach(o => o.items.forEach(item => {
      if (!productSales[item.productId]) productSales[item.productId] = { satis: 0, hediye: 0, revenue: 0 };
      if (!variantSales[item.variantId]) variantSales[item.variantId] = { satis: 0, hediye: 0, revenue: 0 };
      
      if (item.isGift) {
        productSales[item.productId].hediye += item.quantity;
        variantSales[item.variantId].hediye += item.quantity;
      } else {
        productSales[item.productId].satis += item.quantity;
        variantSales[item.variantId].satis += item.quantity;
        productSales[item.productId].revenue += item.unitSalePrice * item.quantity;
        variantSales[item.variantId].revenue += item.unitSalePrice * item.quantity;
      }
    }));

    const topProducts = Object.entries(productSales)
      .filter(([id]) => {
        if (productCategoryFilter !== 'all') {
          const p = products.find(prod => prod.id === id);
          return p?.category === productCategoryFilter;
        }
        return true;
      })
      .sort(([, a], [, b]) => (b.satis + b.hediye) - (a.satis + a.hediye))
      .slice(0, 10)
      .map(([id, stats]) => {
        const name = products.find(p => p.id === id)?.name || id;
        return {
          name,
          label: `${name} (${formatCurrency(stats.revenue, settings.currencySymbol)})`,
          satis: stats.satis,
          hediye: stats.hediye,
          toplam: stats.satis + stats.hediye,
          gelir: stats.revenue,
        };
      });

    const hasProductSales = Object.keys(productSales).length > 0;

    const topVariants = Object.entries(variantSales)
      .sort(([, a], [, b]) => (b.satis + b.hediye) - (a.satis + a.hediye))
      .slice(0, 10)
      .map(([id, stats]) => {
        const v = variants.find(x => x.id === id);
        const p = products.find(x => x.id === v?.productId);
        const name = `${p?.name} ${v?.name}`;
        return { 
          name,
          label: `${name} (${formatCurrency(stats.revenue, settings.currencySymbol)})`,
          satis: stats.satis, 
          hediye: stats.hediye, 
          toplam: stats.satis + stats.hediye,
          gelir: stats.revenue,
        };
      });

    // Expense breakdown
    const expBreakdown = settings.expenseCategories.map(cat => ({
      name: cat.name,
      value: filteredExpenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
      color: cat.color,
    })).filter(x => x.value > 0);

    // Revenue over time
    const revenueOverTime: Record<string, { date: string; gelir: number; kar: number; siparis: number }> = {};
    const citySales: Record<string, { siparis: number, gelir: number, plaka: string }> = {};
    citiesData.forEach((c, idx) => {
      citySales[c.name] = { siparis: 0, gelir: 0, plaka: String(idx + 1).padStart(2, '0') };
    });

    filteredOrders.forEach(o => {
      const key = o.orderDate.split('T')[0];
      if (!revenueOverTime[key]) revenueOverTime[key] = { date: key, gelir: 0, kar: 0, siparis: 0 };
      const calc = calculateOrder(o);
      revenueOverTime[key].gelir += calc.taxableAmount;
      revenueOverTime[key].kar += calc.netProfit;
      revenueOverTime[key].siparis += 1;

      if (o.city && citySales[o.city]) {
        citySales[o.city].siparis += 1;
        citySales[o.city].gelir += calc.taxableAmount;
      }
    });
    const timeData = Object.values(revenueOverTime).sort((a, b) => a.date.localeCompare(b.date));

    const mapColors: Record<string, string> = {};
    const mapTooltips: Record<string, string> = {};
    let maxSiparis = 0;
    Object.values(citySales).forEach(c => { if(c.siparis > maxSiparis) maxSiparis = c.siparis; });

    Object.entries(citySales).forEach(([isim, st]) => {
      if (st.siparis > 0) {
        const intensity = maxSiparis > 0 ? st.siparis / maxSiparis : 0;
        // base color: primary blue (hsl 221.2 83.2% 53.3% -> roughly rgba(37, 99, 235))
        mapColors[st.plaka] = `rgba(37, 99, 235, ${0.15 + (0.85 * Math.pow(intensity, 0.6))})`;
        mapTooltips[st.plaka] = `${isim} | ${st.siparis} Sipariş (${formatCurrency(st.gelir, settings.currencySymbol)})`;
      }
    });

    const topCities = Object.entries(citySales)
      .filter(([, st]) => st.siparis > 0)
      .sort(([, a], [, b]) => b.siparis - a.siparis)
      .map(([isim, st]) => ({
        name: isim,
        label: `${isim} (${st.siparis})`,
        siparis: st.siparis,
        gelir: st.gelir,
      }));

    return {
      totalOrders, unitsSold, subtotal, totalTax, totalProductCost,
      shippingCost, packagingCost, paymentCommission, shopifyCommission, totalCommission,
      giftCost, totalDiscounts, totalOrderCosts, totalExpensesAll,
      totalBusinessExpenses, grossProfit, netProfit, profitMargin,
      topProducts, topVariants, expBreakdown, timeData, mapColors, mapTooltips, topCities,
      hasProductSales
    };
  }, [orders, expenses, dateRange, products, variants, settings, productCategoryFilter]);

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
              <SelectItem value="yesterday">Dün</SelectItem>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="last_month">Geçen Ay</SelectItem>
              <SelectItem value="specific_month">Aylık Seçim</SelectItem>
              <SelectItem value="all_time">Tüm Zamanlar</SelectItem>
              <SelectItem value="custom">Özel Tarih</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {period === 'specific_month' && (
          <>
            <div>
              <Label className="text-xs">Yıl</Label>
              <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map(offset => {
                    const y = new Date().getFullYear() - offset;
                    return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ay</Label>
              <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'].map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

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
        <KPI label="Net Gelir" value={formatCurrency(metrics.subtotal, sym)} />
        <KPI label="Net Kâr" value={formatCurrency(metrics.netProfit, sym)} accent />
        <KPI label="Kâr Marjı" value={`%${metrics.profitMargin.toFixed(1)}`} />
      </div>

      {/* Detail breakdown */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Sipariş Maliyetleri</h3>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <KPI label="Ürün Maliyeti" value={formatCurrency(metrics.totalProductCost, sym)} small />
            <KPI label="KDV" value={formatCurrency(metrics.totalTax, sym)} small />
            <KPI label="Kargo" value={formatCurrency(metrics.shippingCost, sym)} small />
            <KPI label="Ambalaj" value={formatCurrency(metrics.packagingCost, sym)} small />
            <KPI label="Hediye Maliyeti" value={formatCurrency(metrics.giftCost, sym)} small />
            <KPI label="İndirimler" value={formatCurrency(metrics.totalDiscounts, sym)} small />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Komisyonlar</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KPI label="Ödeme Komisyonu" value={formatCurrency(metrics.paymentCommission, sym)} small />
            <KPI label="Shopify Komisyonu" value={formatCurrency(metrics.shopifyCommission, sym)} small />
            <KPI label="Toplam Komisyon" value={formatCurrency(metrics.totalCommission, sym)} small />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Gider Özeti</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KPI label="Toplam Sipariş Maliyeti" value={formatCurrency(metrics.totalOrderCosts, sym)} small />
            <KPI label="İşletme Giderleri" value={formatCurrency(metrics.totalBusinessExpenses, sym)} small />
            <KPI label="Genel Toplam Gider" value={formatCurrency(metrics.totalExpensesAll, sym)} small />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics.timeData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Sipariş Gelir & Kâr Trendi</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.timeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} formatter={(value: number) => formatCurrency(value, sym)} />
                    <Legend />
                    <Bar dataKey="gelir" name="Gelir" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="kar" name="Kâr" radius={[2, 2, 0, 0]}>
                      {metrics.timeData.map((entry, index) => (
                        <Cell key={`cell-kar-${index}`} fill={entry.kar < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--chart-1))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {metrics.hasProductSales && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base mt-2">En Çok Çıkan Ürünler</CardTitle>
              <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Kategori Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {settings.categories?.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {metrics.topProducts.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.topProducts} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={180} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} 
                        formatter={(value: number, name: string) => [`${value} Adet`, name]}
                      />
                      <Legend />
                      <Bar dataKey="satis" name="Satın Alınan" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="hediye" name="Hediye Giden" stackId="a" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                  Bu kategoride satış bulunmamaktadır.
                </div>
              )}
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

        {/* Turkey Map */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">İllere Göre Dağılım</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            {Object.keys(metrics.mapColors).length > 0 ? (
              <div className="w-full max-w-2xl px-4 rounded-xl [&_svg]:!h-auto [&_svg]:!max-h-[450px]">
                <TurkeyMap 
                  colorData={metrics.mapColors} 
                  tooltipData={metrics.mapTooltips}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Seçilen tarih aralığında sipariş bulunamadı.
              </div>
            )}
          </CardContent>
        </Card>
        {/* Top Cities Chart */}
        {metrics.topCities.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base mt-2">En Çok Sipariş Alan İller</CardTitle>
              <Select value={cityLimit.toString()} onValueChange={v => setCityLimit(parseInt(v))}>
                <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">İlk 5</SelectItem>
                  <SelectItem value="10">İlk 10</SelectItem>
                  <SelectItem value="20">İlk 20</SelectItem>
                  <SelectItem value="0">Tümü</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto overflow-x-hidden pr-2">
                <div style={{ height: Math.max(380, (cityLimit === 0 ? metrics.topCities.length : Math.min(metrics.topCities.length, cityLimit)) * 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cityLimit === 0 ? metrics.topCities : metrics.topCities.slice(0, cityLimit)} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} 
                        formatter={(value: number) => [`${value} Sipariş`, "Sipariş Sayısı"]}
                      />
                      <Legend />
                      <Bar dataKey="siparis" name="Sipariş Sayısı" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function KPI({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  const isNegative = value.includes('-');
  const colorClass = isNegative ? 'text-destructive' : (accent ? 'text-primary' : '');
  
  return (
    <div className={`metric-card ${small ? 'p-3' : ''}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold ${colorClass} ${small ? 'text-base' : 'text-lg'}`}>{value}</p>
    </div>
  );
}
