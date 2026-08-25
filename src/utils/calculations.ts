import { Order, OrderCalculation, CarrierCodTier } from '@/types';

// 2026 - II TAŞINAN ÜRÜN BEDELİ (TK 1) Tarife Tablosu
export const DEFAULT_CARRIER_COD_TIERS: CarrierCodTier[] = [
  { minAmount: 0, maxAmount: 400, fee: 18.49 },
  { minAmount: 401, maxAmount: 500, fee: 20.60 },
  { minAmount: 501, maxAmount: 600, fee: 22.71 },
  { minAmount: 601, maxAmount: 1250, fee: 33.28 },
  { minAmount: 1251, maxAmount: 2500, fee: 54.40 },
  { minAmount: 2501, maxAmount: 3750, fee: 75.53 },
  { minAmount: 3751, maxAmount: 5000, fee: 96.65 },
  { minAmount: 5001, maxAmount: 6249, fee: 117.78 },
];

export function getTieredCarrierFee(amount: number): number {
  if (amount <= 0) return 0;
  if (amount <= 400) return 18.49;
  if (amount <= 500) return 20.60;
  if (amount <= 600) return 22.71;
  if (amount <= 1250) return 33.28;
  if (amount <= 2500) return 54.40;
  if (amount <= 3750) return 75.53;
  if (amount <= 5000) return 96.65;
  if (amount <= 6249) return 117.78;
  // 6.250 TL + Artan 1%
  return 117.78 + (amount - 6250) * 0.01;
}

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

  const isCod = order.paymentMethod === 'kapida_odeme' || order.paymentMethod === 'kapida_odeme_kk' || order.paymentMethod === 'kapida_odeme_nakit';
  const codFee = isCod ? (order.codFee ?? 100) : 0;

  // Discount
  let totalDiscount = order.discountAmount;
  if (order.discountRate > 0) {
    totalDiscount += subtotal * (order.discountRate / 100);
  }

  // Taxable Amount includes subtotal - discount + codFee
  const taxableAmount = Math.max(0, subtotal - totalDiscount + codFee);

  // Kargo Firması Ek Hizmet Bedeli (Carrier COD fee)
  let carrierCodFeeCost = 0;
  if (isCod) {
    if (order.carrierCodFeeType === 'percentage') {
      carrierCodFeeCost = taxableAmount * ((order.carrierCodFee ?? 0) / 100);
    } else if (order.carrierCodFeeType === 'tiered') {
      carrierCodFeeCost = getTieredCarrierFee(taxableAmount);
    } else if (order.carrierCodFee !== undefined && order.carrierCodFee !== null && order.carrierCodFee > 0) {
      carrierCodFeeCost = order.carrierCodFee;
    } else {
      // Eski siparişlerde varsayılan kargo hizmet kesintisi 0 kabul edilir, geçmiş kâr/zarar verileri bozulmaz!
      carrierCodFeeCost = 0;
    }
  }

  // If order is cancelled or returned, customer revenue is 0 and products return to stock
  if (isCancelled) {
    let totalShippingPenalty = 0;

    if (isReturned) {
      // İADE: Gidiş %100 + Dönüş %100 = 2 kat kargo maliyeti + kargo firması ek hizmet bedeli
      totalShippingPenalty = order.shippingCost * 2 + carrierCodFeeCost;
    } else {
      // İPTAL:
      // Online Kredi Kartı / Havale sipariş iptali: Ürün henüz kargolanmadığı için kargo maliyeti 0 TL
      // Kapıda ödeme sipariş iptali: Gidiş %100 + Dönüş %50 = 1.5 kat kargo maliyeti + kargo firması kapıda ödeme kesintisi
      const isOnlineOrTransfer = order.paymentMethod === 'kredi_karti' || order.paymentMethod === 'online_kredi_karti' || order.paymentMethod === 'havale' || order.paymentMethod === 'havale_eft';
      if (isOnlineOrTransfer) {
        totalShippingPenalty = 0;
      } else {
        totalShippingPenalty = (order.shippingCost * 1.5) + carrierCodFeeCost;
      }
    }

    const cancellationPenalty = totalShippingPenalty;
    const totalCost = cancellationPenalty;

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
      carrierCodFeeCost: 0,
      extraExpense: 0,
      totalCost,
      grossProfit: -cancellationPenalty,
      netProfit: -totalCost,
      profitMargin: 0,
      isCancelled: true,
      cancellationPenalty,
    };
  }

  // Tax calculation (KDV Dahil - Included Tax)
  const totalTax = taxableAmount - (taxableAmount / (1 + (order.taxRate / 100)));

  // Commissions on taxable amount
  const paymentCommissionCost = taxableAmount * (order.paymentCommissionRate / 100) + order.paymentCommissionFixed;
  const shopifyCommissionCost = taxableAmount * (order.shopifyCommissionRate / 100) + order.shopifyCommissionFixed;
  const totalCommissionCost = paymentCommissionCost + shopifyCommissionCost;

  const totalCost = totalProductCost + giftCost + order.shippingCost + order.packagingCost + totalCommissionCost + carrierCodFeeCost + order.extraExpense;

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
    carrierCodFeeCost,
    extraExpense: order.extraExpense,
    totalCost,
    grossProfit,
    netProfit,
    profitMargin,
    isCancelled: false,
    cancellationPenalty: 0,
  };
}
