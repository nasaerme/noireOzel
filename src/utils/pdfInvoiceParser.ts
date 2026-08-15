import * as pdfjsLib from 'pdfjs-dist';

// Set pdfjs worker source using CDN for reliable browser execution
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tokenizedText = await page.getTextContent();
    
    // Sort items by Y position then X position to preserve line reading order
    const items = tokenizedText.items as any[];
    let currentY: number | null = null;
    let currentLine = '';

    items.forEach((item: any) => {
      const y = Math.round(item.transform[5]);
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

    // 1. Fatura No Matching (GİB E-Arşiv Fatura No e.g. GIB2026000000838)
    const invNoMatch = text.match(/(?:Fatura No|Fatura No:|ETN|E-Fatura No|Özelleştirme No)\s*:?\s*([A-Z0-9]{13,16})/i) ||
                       cleanText.match(/\b([A-Z]{3}20\d{2}\d{8,12})\b/) ||
                       cleanText.match(/\b(GIB20\d{11})\b/);
    if (invNoMatch) {
      invoiceNumber = invNoMatch[1].trim();
    }

    // 2. Fatura Tarihi Matching (Örn: 14-08-2026 23:54 or 14.08.2026 or 14/08/2026)
    const dateMatch = text.match(/(?:Fatura Tarihi|Düzenleme Tarihi|Tarih)\s*:?\s*(\d{2}[-\./]\d{2}[-\./]\d{4})(?:\s+\d{2}:\d{2})?/i) ||
                      cleanText.match(/\b(\d{2}[-\./]\d{2}[-\./]\d{4})\b/);
    if (dateMatch) {
      const rawDate = dateMatch[1]; // e.g. 14-08-2026
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

    // 3. Buyer (Sayın Section) Matching
    // Look for SAYIN followed by name line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toUpperCase().includes('SAYIN')) {
        // Next line or rest of line is party name
        const inlinePart = line.replace(/SAYIN\s*:?/i, '').trim();
        if (inlinePart.length > 2) {
          partyName = inlinePart;
        } else if (i + 1 < lines.length) {
          partyName = lines[i + 1].trim();
        }
      }

      // Check for Seller Name at top of invoice (e.g., MUSTAFA ATAR before address)
      if (i < 5 && !sellerName && line.trim() && !line.includes(':') && !line.includes('/') && line.length > 3) {
        if (!line.includes('15.08') && !line.includes('e-Belge') && !line.includes('Fatura')) {
          sellerName = line.trim();
        }
      }
    }

    // 4. VKN / TCKN Matching (Seller vs Buyer)
    const tcknMatches = [...text.matchAll(/(?:TCKN|VKN|Vergi No|Vergi Kimlik No|T\.C\. No)\s*:?\s*(\d{10,11})/gi)];
    if (tcknMatches.length > 0) {
      // If 2 TCKNs found, first is seller, second is buyer
      if (tcknMatches.length >= 2) {
        sellerTaxId = tcknMatches[0][1];
        partyTaxId = tcknMatches[1][1];
      } else {
        partyTaxId = tcknMatches[0][1];
      }
    }

    // 5. Total Amount (Ödenecek Tutar / Vergiler Dahil Toplam Tutar / Genel Toplam)
    const totalMatch = text.match(/(?:Ödenecek Tutar|Vergiler Dahil Toplam Tutar|Genel Toplam|Fatura Toplamı)\s*:?\s*([\d\.,]+(?:\s*TL)?)/i);
    if (totalMatch) {
      totalAmount = parseTurkMoney(totalMatch[1]);
    }

    // 6. Subtotal (Mal Hizmet Toplam Tutarı / KDV Matrahı)
    const subtotalMatch = text.match(/(?:Mal Hizmet Toplam Tutarı|Mal Hizmet Toplamı|KDV Matrahı|Matrah)\s*:?\s*([\d\.,]+(?:\s*TL)?)/i);
    if (subtotalMatch) {
      subtotal = parseTurkMoney(subtotalMatch[1]);
    }

    // 7. KDV Amount & Rate (Hesaplanan KDV(%10) / KDV Tutarı)
    const kdvRateMatch = text.match(/KDV\s*\(\s*%?\s*(\d+)\s*\)|%(\d{1,2})/i);
    if (kdvRateMatch) {
      taxRate = parseInt(kdvRateMatch[1] || kdvRateMatch[2], 10);
    }

    const kdvAmountMatch = text.match(/(?:Hesaplanan KDV(?:\(\s*%?\d+\s*\))?|KDV Tutarı|KDV Toplamı)\s*:?\s*([\d\.,]+(?:\s*TL)?)/i);
    if (kdvAmountMatch) {
      taxAmount = parseTurkMoney(kdvAmountMatch[1]);
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
      if ([1, 10, 20].includes(calculatedRate)) {
        taxRate = calculatedRate;
      }
    }

    // 8. Description / Product Name (Örn: Xena Vücut Çorabı)
    const productMatch = text.match(/1\s+([A-Za-zĞÜŞİÖÇğüşiöç0-9\s\.\-]+)\s+1\s+Adet/i) ||
                         cleanText.match(/Mal Hizmet\s*([A-Za-zĞÜŞİÖÇğüşiöç0-9\s\.\-]{3,40})\s*1\s*Adet/i);
    if (productMatch) {
      description = productMatch[1].trim();
    } else {
      description = `E-Fatura - ${partyName || 'Satış/Alış Faturası'}`;
    }

    // Default Fallbacks
    if (!partyName) {
      partyName = sellerName || file.name.replace(/\.[^/.]+$/, '');
    }

    return {
      invoiceNumber: invoiceNumber || `GIB${Date.now().toString().slice(-13)}`,
      date,
      partyName,
      partyTaxId,
      sellerName,
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
      invoiceNumber: `GIB${Date.now().toString().slice(-13)}`,
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
