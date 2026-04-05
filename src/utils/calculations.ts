import { Order, OrderItem, OrderCalculation } from '@/types';

export function calculateOrderItem(item: OrderItem) {
  if (item.isGift) {
    return {
      lineRevenue: 0,
      lineCost: item.unitCostPrice * item.quantity,
      lineTax: 0,
      lineGrossProfit: -(item.unitCostPrice * item.quantity),
    };
  }
  const lineRevenue = item.unitSalePrice * item.quantity;
  const lineTax = lineRevenue * (item.taxRate / 100);
  const lineCost = item.unitCostPrice * item.quantity;
  const lineGrossProfit = lineRevenue - lineTax - lineCost;
  return { lineRevenue, lineCost, lineTax, lineGrossProfit };
}

export function calculateOrder(order: Order): OrderCalculation {
  let grossRevenue = 0;
  let totalTaxFromItems = 0;
  let totalProductCost = 0;
  let giftCost = 0;

  order.items.forEach(item => {
    const calc = calculateOrderItem(item);
    grossRevenue += calc.lineRevenue;
    totalTaxFromItems += calc.lineTax;
    totalProductCost += item.isGift ? 0 : calc.lineCost;
    giftCost += item.isGift ? calc.lineCost : 0;
  });

  grossRevenue += order.shippingRevenue;

  // Discount
  let totalDiscount = order.discountAmount;
  if (order.discountRate > 0) {
    totalDiscount += grossRevenue * (order.discountRate / 100);
  }

  const netRevenueAfterDiscount = grossRevenue - totalDiscount;
  const totalTax = totalTaxFromItems;
  const netRevenueExTax = netRevenueAfterDiscount - totalTax;

  // Commission on net revenue after discount
  const commissionCost = netRevenueAfterDiscount * (order.commissionRate / 100) + order.commissionFixed;

  const totalCost = totalProductCost + giftCost + order.shippingCost + order.packagingCost + commissionCost + order.extraExpense;

  const grossProfit = netRevenueAfterDiscount - totalProductCost - giftCost;
  const netProfit = netRevenueExTax - totalCost;
  const profitMargin = netRevenueAfterDiscount > 0 ? (netProfit / netRevenueAfterDiscount) * 100 : 0;

  return {
    grossRevenue,
    totalDiscount,
    netRevenueAfterDiscount,
    totalTax,
    netRevenueExTax,
    totalProductCost,
    giftCost,
    shippingCost: order.shippingCost,
    packagingCost: order.packagingCost,
    commissionCost,
    extraExpense: order.extraExpense,
    totalCost,
    grossProfit,
    netProfit,
    profitMargin,
  };
}
