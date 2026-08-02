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

  const isReturned = order.orderStatus === 'iade' || order.paymentStatus === 'iade';
  const isCancelledOnly = (order.orderStatus === 'iptal' || order.paymentStatus === 'iptal') && !isReturned;
  const isCancelled = isReturned || isCancelledOnly;
  const codFee = order.paymentMethod === 'kapida_odeme' ? (order.codFee ?? 100) : 0;

  // Discount
  let totalDiscount = order.discountAmount;
  if (order.discountRate > 0) {
    totalDiscount += subtotal * (order.discountRate / 100);
  }

  // If order is cancelled or returned, customer revenue is 0 and products return to stock
  if (isCancelled) {
    let totalShippingPenalty = 0;

    if (isReturned) {
      // İADE (Kapıda Ödeme, Kredi Kartı vb. tüm iadelerde): Gidiş %100 + Dönüş %100 = 2 kat kargo maliyeti
      totalShippingPenalty = order.shippingCost * 2;
    } else {
      // İPTAL:
      // Kredi kartı sipariş iptali: Ürün henüz kargolanmadığı için kargo maliyeti 0 TL
      // Kapıda ödeme sipariş iptali: Gidiş %100 + Dönüş %50 = 1.5 kat kargo maliyeti
      if (order.paymentMethod === 'kredi_karti') {
        totalShippingPenalty = 0;
      } else {
        totalShippingPenalty = order.shippingCost * 1.5;
      }
    }

    const cancellationPenalty = totalShippingPenalty;
    const totalCost = cancellationPenalty + order.extraExpense;
    
    return {
      subtotal: 0,
      codFee: 0,
      totalDiscount: 0,
      taxableAmount: 0,
      totalTax: 0,
      totalProductCost: 0,
      giftCost: 0,
      shippingCost: totalShippingPenalty,
      packagingCost: 0,
      paymentCommissionCost: 0,
      shopifyCommissionCost: 0,
      totalCommissionCost: 0,
      extraExpense: order.extraExpense,
      totalCost,
      grossProfit: -cancellationPenalty,
      netProfit: -totalCost,
      profitMargin: 0,
      isCancelled: true,
      cancellationPenalty,
    };
  }

  // Taxable Amount includes subtotal - discount + codFee
  const taxableAmount = Math.max(0, subtotal - totalDiscount + codFee);

  // Tax calculation (KDV Dahil - Included Tax)
  const totalTax = taxableAmount - (taxableAmount / (1 + (order.taxRate / 100)));

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
    codFee,
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
    isCancelled: false,
    cancellationPenalty: 0,
  };
}
