import * as pdfjsLibRaw from 'pdfjs-dist';
import pdfWorkerCode from 'pdfjs-dist/build/pdf.worker.js?raw';

const pdfjsLib: any = (pdfjsLibRaw as any).default || pdfjsLibRaw;

// Set pdfjs worker source using an inline Blob URL so Vite dev server /@fs/ worker paths never trigger SecurityErrors
try {
  const blob = new Blob([pdfWorkerCode], { type: 'text/javascript' });
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
  }
} catch (err) {
  console.warn("Failed to create inline PDF worker Blob:", err);
}

export interface ParsedInvoiceData {
  invoiceNumber: string;
  date: string;
  partyName: string;
  partyTaxId: string;
  sellerName?: string;
  sellerTaxId?: string;
  description: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  rawText: string;
  success: boolean;
}

/**
 * Parses Turkish money strings like "899,99 TL", "818,17", "1.250,50 ₺" into JavaScript numbers.
 */
export function parseTurkMoney(str: string): number {
  if (!str) return 0;
  // Remove "TL", "₺", spaces, and non-numeric characters except comma and dot
  let clean = str.replace(/\s*TL/gi, '').replace(/\s*₺/gi, '').trim();
  clean = clean.replace(/[^\d,\.]/g, '');
  
  if (clean.includes(',') && clean.includes('.')) {
    // Standard Turkish format: 1.250,50 -> remove dots, replace comma with dot
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // Format: 899,99 or 818,17 -> replace comma with dot
    clean = clean.replace(',', '.');
  }
  return parseFloat(clean) || 0;
}

/**
 * Extracts raw text lines from a PDF file preserving position & structure
 */
export async function extractTextFromPdf(file: File): Promise<{ text: string; lines: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';
  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tokenizedText = await page.getTextContent();
    
    // Sort items by Y position then X position to preserve line reading order
    const items = (tokenizedText.items as any[]).filter(item => item && typeof item.str === 'string');
    let currentY: number | null = null;
    let currentLine = '';

    items.forEach((item: any) => {
      const y = (item.transform && item.transform[5] !== undefined) ? Math.round(item.transform[5]) : 0;
      if (currentY === null || Math.abs(currentY - y) > 3) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = item.str;
        currentY = y;
      } else {
        currentLine += ' ' + item.str;
      }
    });
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    const pageText = items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return { text: fullText, lines };
}

/**
 * Parses Turkish E-Fatura & E-Arşiv PDF text tailored specifically for GİB standards
 */
export async function parseInvoicePdf(file: File): Promise<ParsedInvoiceData> {
  try {
    const { text, lines } = await extractTextFromPdf(file);
    const cleanText = text.replace(/\s+/g, ' ');

    let invoiceNumber = '';
    let date = new Date().toISOString().split('T')[0];
    let partyName = '';
    let partyTaxId = '';
    let sellerName = '';
    let sellerTaxId = '';
    let description = '';
    let subtotal = 0;
    let taxRate = 10; // Default to 10% or 20%
    let taxAmount = 0;
    let totalAmount = 0;

    // 1. Fatura No Matching (Support INT2026000000006, GIB2026..., EAR2026..., etc. - 3 letters + 13 numbers)
    const inv16Match = cleanText.match(/\b([A-Z]{3}\d{13})\b/i);
    const invLabeledMatch = text.match(/(?:Fatura No|Fatura No:|Fatura Numarası|ETTN|E-Fatura No)\s*:?\s*([A-Z0-9]{13,16})/i);
    
    if (inv16Match) {
      invoiceNumber = inv16Match[1].toUpperCase();
    } else if (invLabeledMatch) {
      invoiceNumber = invLabeledMatch[1].trim();
    }

    // 2. Fatura Tarihi Matching (e.g., 28-08-2026, 28.08.2026, 28/08/2026)
    const dateMatch = text.match(/(?:Fatura Tarihi|Düzenleme Tarihi|Tarih)\s*:?\s*(\d{2}[-\./]\d{2}[-\./]\d{4})(?:\s+\d{2}:\d{2})?/i) ||
                      cleanText.match(/\b(\d{2}[-\./]\d{2}[-\./]\d{4})\b/);
    if (dateMatch) {
      const rawDate = dateMatch[1]; // e.g. 28-08-2026
      const parts = rawDate.split(/[-\./]/);
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
          // DD-MM-YYYY -> YYYY-MM-DD
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          // YYYY-MM-DD
          date = rawDate;
        }
      }
    }

    // 3. Smart Seller Name vs Buyer Name Extraction
    // SAYIN index divides Seller section (above SAYIN) and Buyer section (below SAYIN)
    let sayinLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().includes('SAYIN')) {
        sayinLineIndex = i;
        // Extract Buyer (Sayın) Name
        const inlinePart = lines[i].replace(/SAYIN\s*:?/i, '').trim();
        if (inlinePart.length > 2) {
          partyName = inlinePart;
        } else if (i + 1 < lines.length) {
          partyName = lines[i + 1].trim();
        }
        break;
      }
    }

    // Extract Seller Name from lines before SAYIN (top left of invoice)
    const topLinesLimit = sayinLineIndex > 0 ? sayinLineIndex : Math.min(12, lines.length);
    const sellerCandidates: string[] = [];

    for (let i = 0; i < topLinesLimit; i++) {
      const line = lines[i].trim();
      const upper = line.toUpperCase();

      // Skip common non-company header lines
      if (!line || line.length < 3) continue;
      if (upper.includes('E-ARŞİV') || upper.includes('E-FATURA') || upper.includes('ETTN') || upper.includes('ÖZELLEŞTİRME')) continue;
      if (upper.includes('FATURA NO') || upper.includes('DÜZENLEME') || upper.includes('SİPARİŞ') || upper.includes('SENARYO')) continue;
      if (upper.includes('TEL:') || upper.includes('E-POSTA:') || upper.includes('WEB SİTESİ') || upper.includes('VERGİ DAİRESİ') || upper.includes('VKN:') || upper.includes('TCKN:')) continue;
      if (upper.includes('MAH.') || upper.includes('CAD.') || upper.includes('SOK.') || upper.includes('NO:') || upper.includes('PK:') || upper.includes('PENDİK') || upper.includes('İSTANBUL') || upper.includes('ANKARA') || upper.includes('TÜRKİYE')) continue;

      sellerCandidates.push(line);
    }

    if (sellerCandidates.length > 0) {
      // Pick first non-generic candidate (e.g., "THE NOIRE İÇ VE DİŞ TİCARET LİMİTED ŞİRKETİ")
      sellerName = sellerCandidates[0];
    }

    // 4. VKN / TCKN Extraction (Seller VKN before SAYIN vs Buyer TCKN after SAYIN)
    const allTaxMatches = [...text.matchAll(/(?:TCKN|VKN|Vergi No|Vergi Kimlik No|T\.C\. No)\s*:?\s*(\d{10,11})/gi)];
    if (allTaxMatches.length >= 2) {
      sellerTaxId = allTaxMatches[0][1];
      partyTaxId = allTaxMatches[1][1];
    } else if (allTaxMatches.length === 1) {
      partyTaxId = allTaxMatches[0][1];
    }

    // 5. Financial Totals
    // Total Amount (Ödenecek Tutar / Vergiler Dahil Toplam Tutar / Genel Toplam)
    const totalMatch = text.match(/(?:Ödenecek Tutar|Vergiler Dahil Toplam Tutar|Genel Toplam|Fatura Toplamı)\s*:?\s*([\d\.,]+(?:\s*TL)?)/i);
    if (totalMatch) {
      totalAmount = parseTurkMoney(totalMatch[1]);
    }

    // Subtotal (Mal Hizmet Toplam Tutarı / KDV Matrahı)
    const subtotalMatch = text.match(/(?:Mal Hizmet Toplam Tutarı|Mal Hizmet Toplamı|KDV Matrahı|Matrah)\s*:?\s*([\d\.,]+(?:\s*TL)?)/i);
    if (subtotalMatch) {
      subtotal = parseTurkMoney(subtotalMatch[1]);
    }

    // KDV Amount (Supports "Hesaplanan KDV GERCEK(%10)", "Hesaplanan KDV (%10)", "KDV Tutarı", etc.)
    const kdvAmountMatch = text.match(/(?:Hesaplanan\s+KDV(?:\s+GERÇEK|\s+GERCEK)?(?:\s*\(\s*%?\s*\d+\s*%\s*\)|\s*\(\s*%?\s*\d+\s*\))?|KDV\s+Tutarı|KDV\s+Toplamı|İndirilecek\s+KDV)\s*:?\s*([\d\.,]+(?:\s*TL)?)/i);
    if (kdvAmountMatch) {
      taxAmount = parseTurkMoney(kdvAmountMatch[1]);
    }

    // KDV Rate Matching (%10, %20, %1, etc.)
    const kdvRateMatch = text.match(/KDV\s*(?:GERÇEK|GERCEK)?\s*\(\s*%?\s*(\d+)\s*%\s*\)|KDV\s*\(\s*%?\s*(\d+)\s*\)|%(\d{1,2})/i);
    if (kdvRateMatch) {
      taxRate = parseInt(kdvRateMatch[1] || kdvRateMatch[2] || kdvRateMatch[3], 10);
    }

    // Deduce any missing financial totals
    if (totalAmount > 0 && subtotal === 0) {
      if (taxAmount > 0) {
        subtotal = Math.round((totalAmount - taxAmount) * 100) / 100;
      } else {
        subtotal = Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100;
        taxAmount = Math.round((totalAmount - subtotal) * 100) / 100;
      }
    } else if (subtotal > 0 && totalAmount === 0) {
      if (taxAmount === 0) taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
      totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    } else if (totalAmount > 0 && subtotal > 0 && taxAmount === 0) {
      taxAmount = Math.round((totalAmount - subtotal) * 100) / 100;
    }

    // Deduce Tax Rate if rate was missed but amounts exist
    if (subtotal > 0 && taxAmount > 0 && (taxRate === 0 || taxRate === 20)) {
      const calculatedRate = Math.round((taxAmount / subtotal) * 100);
      if ([1, 8, 10, 18, 20].includes(calculatedRate)) {
        taxRate = calculatedRate;
      }
    }

    // 6. Product Descriptions (Line items extraction)
    const productItems: string[] = [];
    let inTableSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Mal Hizmet') || line.includes('Sıra No')) {
        inTableSection = true;
        continue;
      }
      if (line.includes('Mal Hizmet Toplam Tutarı') || line.includes('Toplam İskonto') || line.includes('Yalnız ')) {
        inTableSection = false;
        break;
      }

      if (inTableSection) {
        // Look for line item pattern: Starts with Sıra No (1, 2, 3...) followed by product name
        const itemMatch = line.match(/^\d+\s+([A-Za-zĞÜŞİÖÇğüşiöç0-9\s\.\-\(\)\/&%,\+]{3,80})/);
        if (itemMatch) {
          let itemName = itemMatch[1].replace(/\s+\d+\s+Adet.*$/i, '').trim();
          itemName = itemName.replace(/\s+\d+[\.,]\d+.*$/i, '').trim(); // strip quantities/prices
          if (itemName.length > 2 && !itemName.toUpperCase().startsWith('SIRA') && !itemName.toUpperCase().startsWith('MAL HİZMET')) {
            productItems.push(itemName);
          }
        }
      }
    }

    if (productItems.length > 0) {
      if (productItems.length === 1) {
        description = productItems[0];
      } else {
        description = `${productItems[0]} (+${productItems.length - 1} ürün daha)`;
      }
    } else {
      const genericParty = sellerName || partyName || 'Satış/Alış Faturası';
      description = `E-Fatura - ${genericParty}`;
    }

    // Fallbacks
    if (!partyName) {
      partyName = sellerName || file.name.replace(/\.[^/.]+$/, '');
    }

    return {
      invoiceNumber: invoiceNumber || `INT${Date.now().toString().slice(-13)}`,
      date,
      partyName,
      partyTaxId,
      sellerName: sellerName || partyName,
      sellerTaxId,
      description,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      rawText: cleanText,
      success: true
    };
  } catch (error) {
    console.error("PDF Fatura okuma hatası:", error);
    return {
      invoiceNumber: `INT${Date.now().toString().slice(-13)}`,
      date: new Date().toISOString().split('T')[0],
      partyName: file.name.replace(/\.[^/.]+$/, ''),
      partyTaxId: '',
      description: `Yüklenen Fatura - ${file.name}`,
      subtotal: 0,
      taxRate: 20,
      taxAmount: 0,
      totalAmount: 0,
      rawText: '',
      success: false
    };
  }
}
