import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { calculateOrder } from "@/utils/calculations";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  RotateCcw, 
  Package, 
  CreditCard, 
  MapPin, 
  AlertTriangle, 
  Receipt, 
  DollarSign, 
  PieChart as PieIcon, 
  TrendingDown, 
  ShoppingBag, 
  FileText,
  Sparkles,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

    let totalOrders = filteredOrders.filter(o => {
      const calc = calculateOrder(o);
      return !calc.isCancelled;
    }).length;

    let unitsSold = 0;
    let subtotal = 0;
    let collectedSubtotal = 0;
    let pendingSubtotal = 0;

    let totalTax = 0, totalProductCost = 0;
    let shippingCost = 0, packagingCost = 0, paymentCommission = 0, shopifyCommission = 0, totalCommission = 0;
    let giftCost = 0, totalDiscounts = 0;

    let collectedOrderCosts = 0;
    let pendingOrderCosts = 0;

    filteredOrders.forEach(o => {
      const calc = calculateOrder(o);
      const isPaid = o.paymentStatus === 'odendi';

      if (calc.isCancelled) {
        shippingCost += calc.shippingCost;
        collectedOrderCosts += calc.totalCost;
      } else {
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

        const orderCost = calc.totalTax + calc.totalProductCost + calc.giftCost + calc.shippingCost + calc.packagingCost + calc.totalCommissionCost;

        if (isPaid) {
          collectedSubtotal += calc.taxableAmount;
          collectedOrderCosts += orderCost;
        } else {
          pendingSubtotal += calc.taxableAmount;
          pendingOrderCosts += orderCost;
        }
      }
    });

    const totalBusinessExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalOrderCosts = totalTax + totalProductCost + giftCost + shippingCost + packagingCost + totalCommission;
    const totalExpensesAll = totalOrderCosts + totalBusinessExpenses;

    const grossProfit = subtotal - totalProductCost - giftCost;
    const netProfit = subtotal - totalOrderCosts - totalBusinessExpenses;
    const collectedNetProfit = collectedSubtotal - collectedOrderCosts - totalBusinessExpenses;
    const pendingNetProfit = pendingSubtotal - pendingOrderCosts;

    const profitMargin = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;
    const collectedProfitMargin = collectedSubtotal > 0 ? (collectedNetProfit / collectedSubtotal) * 100 : 0;

    // --- RETURN & CANCELLATION METRICS ---
    let returnedOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let totalReturnShippingLoss = 0;

    const reasonsMap: Record<string, { reason: string; count: number; loss: number }> = {};
    const returnLossByMethod: Record<string, { methodLabel: string; count: number; loss: number }> = {
      kredi_karti: { methodLabel: '💳 Kredi Kartı', count: 0, loss: 0 },
      kapida_odeme: { methodLabel: '📦 Kapıda Ödeme', count: 0, loss: 0 },
      havale: { methodLabel: '🏦 EFT / Havale', count: 0, loss: 0 },
    };

    filteredOrders.forEach(o => {
      const calc = calculateOrder(o);
      const isReturned = o.orderStatus === 'iade' || o.paymentStatus === 'iade';
      const isCancelled = calc.isCancelled;

      if (isReturned) {
        returnedOrdersCount++;
        totalReturnShippingLoss += calc.cancellationPenalty;
        
        const method = o.paymentMethod || 'kredi_karti';
        if (returnLossByMethod[method]) {
          returnLossByMethod[method].count++;
          returnLossByMethod[method].loss += calc.cancellationPenalty;
        }

        const r = o.cancellationReason && o.cancellationReason.trim() ? o.cancellationReason.trim() : 'Sebep Belirtilmedi';
        if (!reasonsMap[r]) reasonsMap[r] = { reason: r, count: 0, loss: 0 };
        reasonsMap[r].count++;
        reasonsMap[r].loss += calc.cancellationPenalty;
      } else if (isCancelled) {
        cancelledOrdersCount++;
        totalReturnShippingLoss += calc.cancellationPenalty;

        const method = o.paymentMethod || 'kredi_karti';
        if (returnLossByMethod[method]) {
          returnLossByMethod[method].count++;
          returnLossByMethod[method].loss += calc.cancellationPenalty;
        }

        const r = o.cancellationReason && o.cancellationReason.trim() ? o.cancellationReason.trim() : 'Sebep Belirtilmedi';
        if (!reasonsMap[r]) reasonsMap[r] = { reason: r, count: 0, loss: 0 };
        reasonsMap[r].count++;
        reasonsMap[r].loss += calc.cancellationPenalty;
      }
    });

    const totalOrdersPeriod = filteredOrders.length;
    const returnRate = totalOrdersPeriod > 0 ? (returnedOrdersCount / totalOrdersPeriod) * 100 : 0;
    const cancellationRate = totalOrdersPeriod > 0 ? (cancelledOrdersCount / totalOrdersPeriod) * 100 : 0;
    const totalLossRate = totalOrdersPeriod > 0 ? ((returnedOrdersCount + cancelledOrdersCount) / totalOrdersPeriod) * 100 : 0;

    const reasonsList = Object.values(reasonsMap).sort((a, b) => b.count - a.count);
    const reasonColors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#10b981'];
    const reasonsPieData = reasonsList.map((item, idx) => ({
      name: item.reason,
      value: item.count,
      loss: item.loss,
      color: reasonColors[idx % reasonColors.length]
    }));

    // --- SITE-WIDE SIZE / VARIANT PERCENTAGE DISTRIBUTION ---
    const sizeDistributionMap: Record<string, { sizeName: string; quantity: number; revenue: number }> = {};
    let totalSiteUnitsSold = 0;

    filteredOrders.forEach(o => {
      const calc = calculateOrder(o);
      if (calc.isCancelled) return;

      o.items.forEach(item => {
        const v = variants.find(x => x.id === item.variantId);
        const sizeName = v ? v.name.trim() : 'Standart';
        
        if (!sizeDistributionMap[sizeName]) {
          sizeDistributionMap[sizeName] = { sizeName, quantity: 0, revenue: 0 };
        }

        sizeDistributionMap[sizeName].quantity += item.quantity;
        totalSiteUnitsSold += item.quantity;
        if (!item.isGift) {
          sizeDistributionMap[sizeName].revenue += item.unitSalePrice * item.quantity;
        }
      });
    });

    const sizeDistributionList = Object.values(sizeDistributionMap)
      .map(item => ({
        ...item,
        percentage: totalSiteUnitsSold > 0 ? (item.quantity / totalSiteUnitsSold) * 100 : 0
      }))
      .sort((a, b) => b.quantity - a.quantity);

    const sizePieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#a855f7', '#14b8a6'];
    const sizePieData = sizeDistributionList.map((item, idx) => ({
      name: `${item.sizeName} (%${item.percentage.toFixed(1)})`,
      sizeName: item.sizeName,
      value: item.quantity,
      percentage: item.percentage,
      revenue: item.revenue,
      color: sizePieColors[idx % sizePieColors.length]
    }));

    // --- PRODUCT TREND ANALYSIS ---
    const midTime = dateRange.start.getTime() + (dateRange.end.getTime() - dateRange.start.getTime()) / 2;

    const productTrendMap: Record<string, { 
      id: string; 
      name: string; 
      category: string; 
      firstHalfQty: number; 
      secondHalfQty: number; 
      totalQty: number; 
      revenue: number 
    }> = {};

    filteredOrders.forEach(o => {
      const calc = calculateOrder(o);
      if (calc.isCancelled) return;

      const orderTime = new Date(o.orderDate).getTime();
      const isSecondHalf = orderTime >= midTime;

      o.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const name = p?.name || item.productId;
        const category = p?.category || 'Diğer';

        if (!productTrendMap[item.productId]) {
          productTrendMap[item.productId] = {
            id: item.productId,
            name,
            category,
            firstHalfQty: 0,
            secondHalfQty: 0,
            totalQty: 0,
            revenue: 0,
          };
        }

        if (isSecondHalf) {
          productTrendMap[item.productId].secondHalfQty += item.quantity;
        } else {
          productTrendMap[item.productId].firstHalfQty += item.quantity;
        }
        productTrendMap[item.productId].totalQty += item.quantity;
        if (!item.isGift) {
          productTrendMap[item.productId].revenue += item.unitSalePrice * item.quantity;
        }
      });
    });

    const productTrendsList = Object.values(productTrendMap)
      .filter(p => {
        if (productCategoryFilter !== 'all') {
          return p.category === productCategoryFilter;
        }
        return true;
      })
      .map(p => {
        const diff = p.secondHalfQty - p.firstHalfQty;
        const pctChange = p.firstHalfQty > 0 
          ? ((p.secondHalfQty - p.firstHalfQty) / p.firstHalfQty) * 100 
          : (p.secondHalfQty > 0 ? 100 : 0);
        
        let status: 'rising' | 'falling' | 'stable' = 'stable';
        if (pctChange >= 5 || (p.firstHalfQty === 0 && p.secondHalfQty > 0)) status = 'rising';
        else if (pctChange <= -5) status = 'falling';

        return {
          ...p,
          diff,
          pctChange,
          status,
        };
      });

    const risingProducts = productTrendsList
      .filter(p => p.status === 'rising' || p.pctChange > 0)
      .sort((a, b) => b.pctChange - a.pctChange)
      .slice(0, 5);

    const fallingProducts = productTrendsList
      .filter(p => p.status === 'falling' || p.pctChange < 0)
      .sort((a, b) => a.pctChange - b.pctChange)
      .slice(0, 5);

    // Product sales
    const productSales: Record<string, { satis: number; hediye: number; revenue: number; variants: Record<string, number> }> = {};
    const variantSales: Record<string, { satis: number; hediye: number; revenue: number }> = {};
    filteredOrders.forEach(o => o.items.forEach(item => {
      if (!productSales[item.productId]) productSales[item.productId] = { satis: 0, hediye: 0, revenue: 0, variants: {} };
      if (!variantSales[item.variantId]) variantSales[item.variantId] = { satis: 0, hediye: 0, revenue: 0 };
      
      const v = variants.find(x => x.id === item.variantId);
      const vName = v ? v.name : 'Bilinmeyen';
      if (!productSales[item.productId].variants[vName]) productSales[item.productId].variants[vName] = 0;
      productSales[item.productId].variants[vName] += item.quantity;

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

    const allProductsList = Object.entries(productSales)
      .filter(([id]) => {
        if (productCategoryFilter !== 'all') {
          const p = products.find(prod => prod.id === id);
          return p?.category === productCategoryFilter;
        }
        return true;
      })
      .sort(([, a], [, b]) => (b.satis + b.hediye) - (a.satis + a.hediye))
      .map(([id, stats]) => {
        const name = products.find(p => p.id === id)?.name || id;
        const variantsStr = Object.entries(stats.variants)
          .map(([vName, qty]) => `${qty} ${vName}`)
          .join(', ');

        return {
          id,
          name,
          label: `${name} [${variantsStr}] (${formatCurrency(stats.revenue, settings.currencySymbol)})`,
          satis: stats.satis,
          hediye: stats.hediye,
          toplam: stats.satis + stats.hediye,
          gelir: stats.revenue,
          variantsStr,
        };
      });

    const topProducts = allProductsList.slice(0, 10);
    const hasProductSales = Object.keys(productSales).length > 0;

    const allVariantsList = Object.entries(variantSales)
      .sort(([, a], [, b]) => (b.satis + b.hediye) - (a.satis + a.hediye))
      .map(([id, stats]) => {
        const v = variants.find(x => x.id === id);
        const p = products.find(x => x.id === v?.productId);
        const name = p && v ? `${p.name} - ${v.name}` : id;
        return { 
          id,
          name,
          label: `${name} (${formatCurrency(stats.revenue, settings.currencySymbol)})`,
          satis: stats.satis, 
          hediye: stats.hediye, 
          toplam: stats.satis + stats.hediye,
          gelir: stats.revenue,
        };
      });

    const topVariants = allVariantsList.slice(0, 10);

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

    // --- PAYMENT METHOD & COD ANALYTICS ---
    let creditCardOrdersCount = 0;
    let creditCardTotalRevenue = 0;

    let codOrdersCount = 0;
    let codTotalRevenue = 0;
    let codPaidRevenue = 0;
    let codPendingRevenue = 0;
    let codCancelledCount = 0;
    let codCancellationPenaltyTotal = 0;

    let transferOrdersCount = 0;
    let transferTotalRevenue = 0;
    let transferPaidRevenue = 0;
    let transferPendingRevenue = 0;

    filteredOrders.forEach(o => {
      const calc = calculateOrder(o);
      const isPaid = o.paymentStatus === 'odendi';
      const isCancelled = calc.isCancelled;

      if (o.paymentMethod === 'kapida_odeme') {
        codOrdersCount++;
        if (isCancelled) {
          codCancelledCount++;
          codCancellationPenaltyTotal += calc.cancellationPenalty;
        } else {
          codTotalRevenue += calc.taxableAmount;
          if (isPaid) {
            codPaidRevenue += calc.taxableAmount;
          } else {
            codPendingRevenue += calc.taxableAmount;
          }
        }
      } else if (o.paymentMethod === 'havale') {
        transferOrdersCount++;
        if (!isCancelled) {
          transferTotalRevenue += calc.taxableAmount;
          if (isPaid) transferPaidRevenue += calc.taxableAmount;
          else transferPendingRevenue += calc.taxableAmount;
        }
      } else { // kredi_karti
        creditCardOrdersCount++;
        if (!isCancelled) {
          creditCardTotalRevenue += calc.taxableAmount;
        }
      }
    });

    const totalCollectedRevenue = creditCardTotalRevenue + codPaidRevenue + transferPaidRevenue;
    const totalPendingRevenue = codPendingRevenue + transferPendingRevenue;
    const totalGrossRevenue = totalCollectedRevenue + totalPendingRevenue;
    const codCancelRate = codOrdersCount > 0 ? (codCancelledCount / codOrdersCount) * 100 : 0;

    const paymentMethodPieData = [
      { name: 'Kredi Kartı', value: creditCardOrdersCount, revenue: creditCardTotalRevenue, color: '#3b82f6' },
      { name: 'Kapıda Ödeme', value: codOrdersCount, revenue: codTotalRevenue, color: '#f59e0b' },
      { name: 'EFT / Havale', value: transferOrdersCount, revenue: transferTotalRevenue, color: '#10b981' },
    ].filter(x => x.value > 0);

    return {
      totalOrders, unitsSold, subtotal, collectedSubtotal, pendingSubtotal, totalTax, totalProductCost,
      shippingCost, packagingCost, paymentCommission, shopifyCommission, totalCommission,
      giftCost, totalDiscounts, totalOrderCosts, totalExpensesAll,
      totalBusinessExpenses, grossProfit, netProfit, collectedNetProfit, pendingNetProfit, profitMargin, collectedProfitMargin,
      topProducts, topVariants, allProductsList, allVariantsList, expBreakdown, timeData, mapColors, mapTooltips, topCities,
      hasProductSales,
      // Payment & COD metrics
      periodAllOrdersCount: filteredOrders.length,
      creditCardOrdersCount, creditCardTotalRevenue,
      codOrdersCount, codTotalRevenue, codPaidRevenue, codPendingRevenue, codCancelledCount, codCancellationPenaltyTotal, codCancelRate,
      transferOrdersCount, transferTotalRevenue, transferPaidRevenue, transferPendingRevenue,
      totalCollectedRevenue, totalPendingRevenue, totalGrossRevenue, paymentMethodPieData,
      // Return & Cancellation metrics
      returnedOrdersCount,
      cancelledOrdersCount,
      totalReturnedOrCancelledCount: returnedOrdersCount + cancelledOrdersCount,
      returnRate,
      cancellationRate,
      totalLossRate,
      totalReturnShippingLoss,
      reasonsList,
      reasonsPieData,
      returnLossByMethod,
      // Size distribution metrics
      totalSiteUnitsSold,
      sizeDistributionList,
      sizePieData,
      // Product Trend metrics
      productTrendsList,
      risingProducts,
      fallingProducts,
    };
  }, [orders, expenses, dateRange, products, variants, settings, productCategoryFilter]);

  const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#94a3b8'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Raporlar & Analizler</h1>
          <p className="text-sm text-muted-foreground">İşletme finansı, ürün trendleri, beden analizleri ve iade analitiği</p>
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap gap-2 items-center bg-card p-2 rounded-xl border border-border/60 shadow-sm">
          <div>
            <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-medium"><SelectValue /></SelectTrigger>
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
              <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[90px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map(offset => {
                    const y = new Date().getFullYear() - offset;
                    return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'].map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {period === 'custom' && (
            <>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[140px] h-9 text-xs" />
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px] h-9 text-xs" />
            </>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="financials" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-muted/60 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="financials" className="gap-2 py-2.5 text-xs sm:text-sm font-medium">
            <TrendingUp className="h-4 w-4" /> Mali Tablo & Özet
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-2 py-2.5 text-xs sm:text-sm font-medium relative">
            <RotateCcw className="h-4 w-4" /> İade & İptal Analizi
            {metrics.totalReturnedOrCancelledCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                {metrics.totalReturnedOrCancelledCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 py-2.5 text-xs sm:text-sm font-medium">
            <Package className="h-4 w-4" /> Ürün & Beden Raporu
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2 py-2.5 text-xs sm:text-sm font-medium">
            <CreditCard className="h-4 w-4" /> Ödeme & Valör
          </TabsTrigger>
          <TabsTrigger value="regional" className="gap-2 py-2.5 text-xs sm:text-sm font-medium">
            <MapPin className="h-4 w-4" /> Bölgesel Dağılım
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MALİ TABLO & ÖZET */}
        <TabsContent value="financials" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPI label="Başarılı Sipariş" value={metrics.totalOrders.toString()} />
            <KPI label="Satılan Adet" value={metrics.unitsSold.toString()} />
            <KPI
              label="Net Gelir (Tahsil Edilen)"
              value={formatCurrency(metrics.collectedSubtotal, sym)}
              subtext={metrics.pendingSubtotal > 0 ? `(+ ${formatCurrency(metrics.pendingSubtotal, sym)} Bekleyen)` : undefined}
            />
            <KPI
              label="Net Kâr (Tahsil Edilen)"
              value={formatCurrency(metrics.collectedNetProfit, sym)}
              accent={metrics.collectedNetProfit >= 0}
              subtext={metrics.pendingNetProfit > 0 ? `(+ ${formatCurrency(metrics.pendingNetProfit, sym)} Bekleyen)` : undefined}
            />
            <KPI
              label="Kâr Marjı (Tahsil Edilen)"
              value={`%${metrics.collectedProfitMargin.toFixed(1)}`}
              subtext={metrics.pendingSubtotal > 0 ? `(Beklenen Dahil: %${metrics.profitMargin.toFixed(1)})` : undefined}
            />
          </div>

          {/* Revenue & Payment Status Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Ciro & Tahsilat Durumu</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="bg-card border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Tahsil Edilen Ciro (Ödendi)</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-2xl font-bold text-success">{formatCurrency(metrics.totalCollectedRevenue, sym)}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Kredi Kartı + Ödendi olarak onaylanan Kapıda Ödeme/Havale</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-warning/30 bg-warning/5">
                <CardHeader className="py-3">
                  <CardTitle className="text-xs font-medium text-warning">Bekleyen Ciro (Kapıda Ödeme & Havale)</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-2xl font-bold text-warning">{formatCurrency(metrics.totalPendingRevenue, sym)}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Siparişte Ödeme Durumu "Ödendi" yapıldığında Tahsil Edilen Ciro'ya aktarılır</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Toplam Potansiyel Ciro</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-2xl font-bold text-primary">{formatCurrency(metrics.totalGrossRevenue, sym)}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">Tahsil Edilen + Bekleyen Kapıda Ödeme/Havale Toplamı</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detail breakdown: Sipariş Maliyetleri, Komisyonlar, Gider Özeti */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Sipariş Maliyetleri</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* Revenue & Profit Trend Chart */}
          {metrics.timeData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Sipariş Gelir & Kâr Trendi</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[360px]">
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

          {/* Financial Statement Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Detaylı Mali Gelir / Gider Dökümü</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3 bg-secondary/30">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>📦 Sipariş Bazlı Maliyetler</span>
                    <span className="text-xs text-muted-foreground font-normal">{formatCurrency(metrics.totalOrderCosts, sym)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Ürün Maliyeti (MALS):</span>
                    <span className="font-medium">{formatCurrency(metrics.totalProductCost, sym)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">KDV Tutarı:</span>
                    <span className="font-medium">{formatCurrency(metrics.totalTax, sym)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Kargo Ücretleri (İadeler Dahil):</span>
                    <span className="font-medium">{formatCurrency(metrics.shippingCost, sym)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Ambalaj & Paketleme:</span>
                    <span className="font-medium">{formatCurrency(metrics.packagingCost, sym)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Hediye Ürün Maliyeti:</span>
                    <span className="font-medium">{formatCurrency(metrics.giftCost, sym)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Ödeme & Shopify Komisyonları:</span>
                    <span className="font-medium">{formatCurrency(metrics.totalCommission, sym)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 bg-secondary/30">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>🏢 İşletme Giderleri & Genel Toplam</span>
                    <span className="text-xs text-muted-foreground font-normal">{formatCurrency(metrics.totalExpensesAll, sym)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Genel İşletme Giderleri:</span>
                    <span className="font-medium">{formatCurrency(metrics.totalBusinessExpenses, sym)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Uygulanan Toplam İndirimler:</span>
                    <span className="font-medium text-amber-500">{formatCurrency(metrics.totalDiscounts, sym)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40 font-semibold">
                    <span>Toplam Sipariş Maliyeti:</span>
                    <span>{formatCurrency(metrics.totalOrderCosts, sym)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-border mt-2 font-bold text-base">
                    <span>Genel Gider Toplamı:</span>
                    <span className="text-destructive">{formatCurrency(metrics.totalExpensesAll, sym)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: İADE & İPTAL ANALİZİ */}
        <TabsContent value="returns" className="space-y-6">
          {/* Key Return KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-card border-destructive/30">
              <CardHeader className="py-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>İade Oranı</span>
                  <RotateCcw className="h-3.5 w-3.5 text-destructive" />
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-2xl font-bold text-destructive">%{metrics.returnRate.toFixed(1)}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{metrics.returnedOrdersCount} İade Sipariş ({metrics.periodAllOrdersCount} Toplam)</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-amber-500/30">
              <CardHeader className="py-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>İptal Oranı</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-2xl font-bold text-amber-500">%{metrics.cancellationRate.toFixed(1)}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{metrics.cancelledOrdersCount} İptal Sipariş</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="py-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Toplam Kayıp Oranı</span>
                  <TrendingDown className="h-3.5 w-3.5 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-2xl font-bold">%{metrics.totalLossRate.toFixed(1)}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{metrics.totalReturnedOrCancelledCount} Toplam İade + İptal</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-destructive/40 bg-destructive/5">
              <CardHeader className="py-3 pb-1">
                <CardTitle className="text-xs font-medium text-destructive flex items-center justify-between">
                  <span>Kargo Lojistik Zararı</span>
                  <DollarSign className="h-3.5 w-3.5 text-destructive" />
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-2xl font-bold text-destructive">{formatCurrency(metrics.totalReturnShippingLoss, sym)}</div>
                <p className="text-[11px] text-destructive/80 mt-1">Gidiş & Dönüş Kargo Maliyeti</p>
              </CardContent>
            </Card>
          </div>

          {/* Reasons Breakdown & Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-primary" /> İade & İptal Nedenleri Dağılımı
                </CardTitle>
                <CardDescription className="text-xs">
                  Müşterilerin sipariş iptal veya iade etme sebepleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.reasonsPieData.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.reasonsPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) => `${name} (%${(percent * 100).toFixed(0)})`}
                          labelLine={false}
                        >
                          {metrics.reasonsPieData.map((entry, index) => (
                            <Cell key={`reason-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                          formatter={(value: any, name: any, item: any) => [`${value} Adet (Zarar: ${formatCurrency(item.payload.loss, sym)})`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    Seçilen dönemde iade veya iptal bulunmamaktadır.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> İade / İptal Neden Listesi
                </CardTitle>
                <CardDescription className="text-xs">
                  Nedenlere göre adet ve oluşan lojistik maliyet zararı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] overflow-auto">
                  {metrics.reasonsList.length > 0 ? (
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow>
                          <TableHead>İade / İptal Nedeni</TableHead>
                          <TableHead className="text-center">Sayı</TableHead>
                          <TableHead className="text-right">Kargo Zararı</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.reasonsList.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-xs">💬 {item.reason}</TableCell>
                            <TableCell className="text-center font-bold">{item.count}</TableCell>
                            <TableCell className="text-right text-destructive font-semibold">
                              {formatCurrency(item.loss, sym)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Kayıtlı sebep bulunmuyor.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Return Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ödeme Yöntemine Göre İade & İptal Zararı</CardTitle>
              <CardDescription className="text-xs">
                Ödeme türlerine göre gerçekleşen iade/iptal adedi ve lojistik masraf yükü
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(metrics.returnLossByMethod).map(([key, item]) => {
                  const totalForMethod = key === 'kredi_karti' ? metrics.creditCardOrdersCount : key === 'kapida_odeme' ? metrics.codOrdersCount : metrics.transferOrdersCount;
                  const rate = totalForMethod > 0 ? (item.count / totalForMethod) * 100 : 0;

                  return (
                    <div key={key} className="p-4 bg-secondary/30 rounded-xl border border-border/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{item.methodLabel}</span>
                        <Badge variant="outline" className="text-xs">
                          Kayıp Oranı: %{rate.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-destructive">
                        {item.count} <span className="text-xs font-normal text-muted-foreground">Sipariş</span>
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t border-border/40">
                        <span className="text-muted-foreground">Toplam Kargo Zararı:</span>
                        <span className="font-bold text-destructive">{formatCurrency(item.loss, sym)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ÜRÜN & VARYANT (BEDEN) RAPORU */}
        <TabsContent value="products" className="space-y-6">
          {/* SITE-WIDE SIZE / VARIANT PERCENTAGE DISTRIBUTION (% SEL) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" /> Site Geneli Beden & Varyant Yüzdesel Dağılımı (% Sel)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tüm satışlardaki beden/varyant tercih oranları (Örn: %35 S, %25 M, %15 L, %10 XL...)
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs px-2.5 py-1 w-fit bg-primary/10 text-primary border-primary/30 font-semibold">
                  Toplam Satılan: {metrics.totalSiteUnitsSold} Adet
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Size Pie Chart */}
                {metrics.sizePieData.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.sizePieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ sizeName, percentage }) => `${sizeName}: %${percentage.toFixed(1)}`}
                          labelLine={false}
                        >
                          {metrics.sizePieData.map((entry, index) => (
                            <Cell key={`size-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                          formatter={(value: number, name: string, item: any) => [
                            `${value} Adet (%${item.payload.percentage.toFixed(1)}) - Ciro: ${formatCurrency(item.payload.revenue, sym)}`,
                            item.payload.sizeName
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    Satış verisi bulunmamaktadır.
                  </div>
                )}

                {/* Size Percentage Progress Bars List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {metrics.sizeDistributionList.map((item, idx) => (
                    <div key={idx} className="space-y-1.5 p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold flex items-center gap-1.5">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold">
                            {item.sizeName}
                          </Badge>
                          <span className="text-muted-foreground font-normal">({item.quantity} Adet)</span>
                        </span>
                        <span className="font-extrabold text-primary text-sm">%{item.percentage.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-primary"
                          style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PRODUCT SALES TREND & DIRECTION ANALYSIS (ÇIKIŞ vs DÜŞÜŞ) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Ürün Satış Trend & İvme Analizi (Çıkış vs Düşüş)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Seçilen dönemin 1. yarısı ile 2. yarısı karşılaştırılarak çıkış yakalayan ve düşüşe geçen ürünler
                  </CardDescription>
                </div>

                {/* Category selector filter for trend analysis */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap font-medium">Kategori Filtresi:</Label>
                  <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs font-medium">
                      <SelectValue placeholder="Kategori Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kategoriler</SelectItem>
                      {settings.categories?.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rising Products Card */}
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" /> 🚀 Çıkış Yakalayan Ürünler (Yükselen Trend)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    {metrics.risingProducts.length > 0 ? (
                      metrics.risingProducts.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-emerald-500/20 text-xs">
                          <div className="space-y-0.5">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.category} | Önceki: {p.firstHalfQty} ad. → Sonraki: {p.secondHalfQty} ad.</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-bold">
                              +{p.pctChange.toFixed(0)}% 🚀
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{formatCurrency(p.revenue, sym)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground p-3 text-center">Bu kategoride çıkış yakalayan yükselen ürün bulunamadı.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Falling Products Card */}
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                      <TrendingDown className="h-4 w-4" /> 📉 Düşüşe Geçen Ürünler (Düşen Trend)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    {metrics.fallingProducts.length > 0 ? (
                      metrics.fallingProducts.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-destructive/20 text-xs">
                          <div className="space-y-0.5">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.category} | Önceki: {p.firstHalfQty} ad. → Sonraki: {p.secondHalfQty} ad.</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="text-[11px] font-bold">
                              {p.pctChange.toFixed(0)}% 📉
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{formatCurrency(p.revenue, sym)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground p-3 text-center">Bu kategoride düşüşe geçen ürün bulunamadı.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Products Chart */}
          {metrics.hasProductSales && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">En Çok Çıkan Ürünler Grafiği</CardTitle>
                  <CardDescription className="text-xs">Satın alınan ve hediye olarak gönderilen ürün adetleri</CardDescription>
                </div>
                <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
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
                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.topProducts} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={240} />
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
                  <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">
                    Bu kategoride satış bulunmamaktadır.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics.allProductsList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tüm Ürün Satışları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow>
                          <TableHead>Ürün</TableHead>
                          <TableHead>Bedenler</TableHead>
                          <TableHead className="text-right">Adet</TableHead>
                          <TableHead className="text-right">Gelir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.allProductsList.map((p, i) => (
                          <TableRow key={p.id || i}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{p.variantsStr}</TableCell>
                            <TableCell className="text-right font-semibold">{p.toplam}</TableCell>
                            <TableCell className="text-right font-semibold text-success">{formatCurrency(p.gelir, sym)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {metrics.allVariantsList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tüm Beden / Varyant Satışları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow>
                          <TableHead>Ürün - Beden</TableHead>
                          <TableHead className="text-right">Adet</TableHead>
                          <TableHead className="text-right">Gelir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.allVariantsList.map((v, i) => (
                          <TableRow key={v.id || i}>
                            <TableCell className="font-medium">{v.name}</TableCell>
                            <TableCell className="text-right font-semibold">{v.toplam}</TableCell>
                            <TableCell className="text-right font-semibold text-success">{formatCurrency(v.gelir, sym)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB 4: ÖDEME & VALÖR */}
        <TabsContent value="payment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Ödeme Yöntemleri Dağılımı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <span className="text-xs text-muted-foreground block">💳 Kredi Kartı</span>
                    <span className="text-lg font-bold text-blue-500">{metrics.creditCardOrdersCount} Sipariş</span>
                    <span className="text-xs text-muted-foreground block">{formatCurrency(metrics.creditCardTotalRevenue, sym)}</span>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <span className="text-xs text-muted-foreground block">📦 Kapıda Ödeme</span>
                    <span className="text-lg font-bold text-amber-500">{metrics.codOrdersCount} Sipariş</span>
                    <span className="text-xs text-muted-foreground block">{formatCurrency(metrics.codTotalRevenue, sym)}</span>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <span className="text-xs text-muted-foreground block">🏦 EFT / Havale</span>
                    <span className="text-lg font-bold text-emerald-500">{metrics.transferOrdersCount} Sipariş</span>
                    <span className="text-xs text-muted-foreground block">{formatCurrency(metrics.transferTotalRevenue, sym)}</span>
                  </div>
                </div>

                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={metrics.paymentMethodPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}>
                        {metrics.paymentMethodPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, item: any) => [`${value} Sipariş (${formatCurrency(item.payload.revenue, sym)})`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-warning/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>📦 Kapıda Ödeme Analizi</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/30">İptal Oranı: %{metrics.codCancelRate.toFixed(1)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground block">Toplam Kapıda Ödeme</span>
                    <span className="text-xl font-bold">{metrics.codOrdersCount} Sipariş</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Top. Tutar: {formatCurrency(metrics.codTotalRevenue, sym)}</span>
                  </div>

                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <span className="text-xs text-destructive font-medium block">İptal / İade Edilen</span>
                    <span className="text-xl font-bold text-destructive">{metrics.codCancelledCount} Sipariş</span>
                    <span className="text-xs text-destructive/80 block mt-0.5">Maliyet Kaybı: {formatCurrency(metrics.codCancellationPenaltyTotal, sym)}</span>
                  </div>
                </div>

                <div className="p-3 bg-secondary/20 rounded-lg border border-border/40 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tahsil Edilen Kapıda Ödeme (Ödendi):</span>
                    <span className="font-semibold text-success">{formatCurrency(metrics.codPaidRevenue, sym)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bekleyen Kapıda Ödeme (Beklemede):</span>
                    <span className="font-semibold text-warning">{formatCurrency(metrics.codPendingRevenue, sym)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">İptal Oranı:</span>
                    <span className="font-semibold text-destructive">%{metrics.codCancelRate.toFixed(1)} ({metrics.codCancelledCount} / {metrics.codOrdersCount || 0})</span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  💡 Müşteri kapıda ödeme siparişini teslim almadığında stoklar stoka geri döner; gidiş kargosu (%100) + dönüş kargosu (%50) toplam 1.5 kat kargo maliyeti ceza maliyeti olarak işletmeye yansıtılır.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: BÖLGESEL DAĞILIM */}
        <TabsContent value="regional" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Turkey Map */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">İllere Göre Satış Dağılım Haritası</CardTitle></CardHeader>
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
              <Card className="lg:col-span-2">
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
                  <div className="h-[360px] overflow-y-auto overflow-x-hidden pr-2">
                    <div style={{ height: Math.max(340, (cityLimit === 0 ? metrics.topCities.length : Math.min(metrics.topCities.length, cityLimit)) * 40) }}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, accent, small, subtext }: { label: string; value: string; accent?: boolean; small?: boolean; subtext?: string }) {
  const isNegative = value.includes('-');
  const colorClass = isNegative ? 'text-destructive' : (accent ? 'text-primary' : '');
  
  return (
    <div className={`metric-card ${small ? 'p-3' : ''}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold ${colorClass} ${small ? 'text-base' : 'text-lg'}`}>{value}</p>
      {subtext && <p className="text-[10px] font-semibold text-warning mt-1">{subtext}</p>}
    </div>
  );
}
