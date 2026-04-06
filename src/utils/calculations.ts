import { Order, OrderCalculation } from '@/types';

export function calculateOrder(order: Order): OrderCalculation {
  let subtotal = 0;
  let totalProductCost = 0;
  let giftCost = 0;

  order.items.forEach(item => {
    if (item.isGift) {
      giftCost += item.unitCostPrice * item.quantity;
    } else {
      subtotal += item.unitSalePrice * item.quantity;
      totalProductCost += item.unitCostPrice * item.quantity;
    }
  });

  // Discount
  let totalDiscount = order.discountAmount;
  if (order.discountRate > 0) {
    totalDiscount += subtotal * (order.discountRate / 100);
  }

  const taxableAmount = subtotal - totalDiscount;

  // Tax on discounted amount
  const totalTax = taxableAmount * (order.taxRate / 100);

  // Commissions on taxable amount
  const paymentCommissionCost = taxableAmount * (order.paymentCommissionRate / 100) + order.paymentCommissionFixed;
  const shopifyCommissionCost = taxableAmount * (order.shopifyCommissionRate / 100) + order.shopifyCommissionFixed;
  const totalCommissionCost = paymentCommissionCost + shopifyCommissionCost;

  const totalCost = totalProductCost + giftCost + order.shippingCost + order.packagingCost + totalCommissionCost + order.extraExpense;

  const grossProfit = taxableAmount - totalProductCost - giftCost;
  const netProfit = taxableAmount - totalTax - totalCost;
  const profitMargin = taxableAmount > 0 ? (netProfit / taxableAmount) * 100 : 0;

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    totalTax,
    totalProductCost,
    giftCost,
    shippingCost: order.shippingCost,
    packagingCost: order.packagingCost,
    paymentCommissionCost,
    shopifyCommissionCost,
    totalCommissionCost,
    extraExpense: order.extraExpense,
    totalCost,
    grossProfit,
    netProfit,
    profitMargin,
  };
}
