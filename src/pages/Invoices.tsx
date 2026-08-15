import React, { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { OfficialInvoice } from "@/types";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { parseInvoicePdf } from "@/utils/pdfInvoiceParser";
import { 
  FileText, Plus, Search, Calendar, Filter, Trash2, Eye, Download, Upload, 
  Building2, ArrowUpRight, ArrowDownRight, Scale, TrendingUp, AlertCircle, FileCheck, CheckCircle2,
  Sparkles, Loader2, Layers, CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface BatchInvoiceItem {
  id: string;
  type: "kestigim" | "bana_kesilen";
  invoiceNumber: string;
  date: string;
  partyName: string;
  partyTaxId: string;
  description: string;
  category: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  invoiceFile: string;
  invoiceFileName: string;
  notes: string;
}

export default function Invoices() {
  const { officialInvoices, addOfficialInvoice, addOfficialInvoicesBatch, fetchInvoiceFile, updateOfficialInvoice, deleteOfficialInvoice, settings } = useApp();
  const sym = settings.currencySymbol;

  const [activeTab, setActiveTab] = useState<"kestigim" | "bana_kesilen" | "vergi_raporu">("kestigim");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<OfficialInvoice | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<{ url: string; name: string } | null>(null);
  const [isAutoParsed, setIsAutoParsed] = useState(false);

  const handleLazyPreview = async (inv: OfficialInvoice) => {
    if (inv.invoiceFile) {
      setPreviewFileUrl({ url: inv.invoiceFile, name: inv.invoiceFileName || "Fatura Belgesi" });
      return;
    }

    const toastId = toast.loading("📄 Fatura belgesi indiriliyor...");
    const fileData = await fetchInvoiceFile(inv.id);
    toast.dismiss(toastId);

    if (fileData) {
      setPreviewFileUrl({ url: fileData, name: inv.invoiceFileName || "Fatura Belgesi" });
    } else {
      toast.error("Fatura belgesi veritabanında bulunamadı.");
    }
  };

  // Batch Multi-PDF Import State
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchInvoiceItem[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotalCount, setBatchTotalCount] = useState(0);

  // Form State for Single Add
  const [formData, setFormData] = useState<{
    type: "kestigim" | "bana_kesilen";
    invoiceNumber: string;
    date: string;
    partyName: string;
    partyTaxId: string;
    description: string;
    category: string;
    calcMode: "subtotal" | "total";
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    totalAmount: string;
    invoiceFile: string;
    invoiceFileName: string;
    notes: string;
  }>({
    type: "kestigim",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    partyTaxId: "",
    description: "",
    category: "Genel",
    calcMode: "subtotal",
    subtotal: "",
    taxRate: "20",
    taxAmount: "",
    totalAmount: "",
    invoiceFile: "",
    invoiceFileName: "",
    notes: ""
  });

  // Calculate Subtotal, Tax Amount, Total Amount based on inputs
  const handleAmountChange = (field: "subtotal" | "totalAmount" | "taxRate", val: string) => {
    const rate = parseFloat(field === "taxRate" ? val : formData.taxRate) || 0;

    if (field === "subtotal" || (field === "taxRate" && formData.calcMode === "subtotal")) {
      const sub = parseFloat(field === "subtotal" ? val : formData.subtotal) || 0;
      const tax = sub * (rate / 100);
      const tot = sub + tax;
      setFormData(prev => ({
        ...prev,
        [field]: val,
        taxAmount: tax.toFixed(2),
        totalAmount: tot.toFixed(2),
        calcMode: "subtotal"
      }));
    } else if (field === "totalAmount" || (field === "taxRate" && formData.calcMode === "total")) {
      const tot = parseFloat(field === "totalAmount" ? val : formData.totalAmount) || 0;
      const sub = tot / (1 + rate / 100);
      const tax = tot - sub;
      setFormData(prev => ({
        ...prev,
        [field]: val,
        subtotal: sub.toFixed(2),
        taxAmount: tax.toFixed(2),
        calcMode: "total"
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: val }));
    }
  };

  // Multiple / Batch PDF Upload Handler
  const handleProcessMultiplePdfs = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList).filter(f => f.type.includes("pdf") || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length === 0) {
      toast.error("Lütfen geçerli PDF e-fatura dosyaları seçiniz.");
      return;
    }

    if (files.length === 1) {
      // Single PDF Mode
      handleProcessSinglePdf(files[0]);
      return;
    }

    // Batch PDF Mode
    setIsParsingPdf(true);
    setBatchTotalCount(files.length);
    setBatchProgress(0);
    setBatchItems([]);
    setIsBatchDialogOpen(true);

    const defaultType = activeTab === "bana_kesilen" ? "bana_kesilen" : "kestigim";
    const parsedList: BatchInvoiceItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || "");
          reader.readAsDataURL(file);
        });

        const parsed = await parseInvoicePdf(file);
        const finalPartyName = defaultType === "bana_kesilen" ? (parsed.sellerName || parsed.partyName) : parsed.partyName;
        const finalPartyTaxId = defaultType === "bana_kesilen" ? (parsed.sellerTaxId || parsed.partyTaxId) : parsed.partyTaxId;

        parsedList.push({
          id: `batch_${Date.now()}_${i}`,
          type: defaultType,
          invoiceNumber: parsed.invoiceNumber,
          date: parsed.date,
          partyName: finalPartyName,
          partyTaxId: finalPartyTaxId,
          description: parsed.description,
          category: "Genel",
          subtotal: parsed.subtotal,
          taxRate: parsed.taxRate,
          taxAmount: parsed.taxAmount,
          totalAmount: parsed.totalAmount,
          invoiceFile: base64,
          invoiceFileName: file.name,
          notes: "Toplu PDF Yükleme ile aktarıldı."
        });
      } catch (err) {
        console.error(`File ${file.name} parse error:`, err);
      }
      setBatchProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setBatchItems(parsedList);
    setIsParsingPdf(false);
    toast.success(`🎉 ${parsedList.length} adet PDF fatura başarıyla taranarak ayrıştırıldı!`);
  };

  // Single PDF Handler
  const handleProcessSinglePdf = async (file: File, targetType?: "kestigim" | "bana_kesilen") => {
    if (!file) return;

    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Lütfen geçerli bir PDF e-fatura dosyası seçiniz.");
      return;
    }

    setIsParsingPdf(true);
    const toastId = toast.loading("⚡ PDF faturanız taranıyor ve E-Fatura verileri ayıklanıyor...");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const parsed = await parseInvoicePdf(file);
        const typeToUse = targetType || (activeTab === "bana_kesilen" ? "bana_kesilen" : "kestigim");
        const finalPartyName = typeToUse === "bana_kesilen" ? (parsed.sellerName || parsed.partyName) : parsed.partyName;
        const finalPartyTaxId = typeToUse === "bana_kesilen" ? (parsed.sellerTaxId || parsed.partyTaxId) : parsed.partyTaxId;

        setEditingInvoice(null);
        setIsAutoParsed(true);
        setFormData({
          type: typeToUse,
          invoiceNumber: parsed.invoiceNumber,
          date: parsed.date,
          partyName: finalPartyName,
          partyTaxId: finalPartyTaxId,
          description: parsed.description,
          category: "Genel",
          calcMode: "subtotal",
          subtotal: parsed.subtotal > 0 ? parsed.subtotal.toFixed(2) : "",
          taxRate: parsed.taxRate.toString(),
          taxAmount: parsed.taxAmount > 0 ? parsed.taxAmount.toFixed(2) : "",
          totalAmount: parsed.totalAmount > 0 ? parsed.totalAmount.toFixed(2) : "",
          invoiceFile: base64,
          invoiceFileName: file.name,
          notes: "PDF Otomatik Tarama ile dolduruldu."
        });

        setIsParsingPdf(false);
        toast.dismiss(toastId);
        toast.success("✨ E-Fatura bilgileri otomatik algılandı!");
        setIsAddDialogOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsParsingPdf(false);
      toast.dismiss(toastId);
      toast.error("PDF taranırken hata oluştu.");
    }
  };

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessMultiplePdfs(files);
    }
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessMultiplePdfs(files);
    }
  };

  const handleSaveBatchInvoices = async () => {
    if (batchItems.length === 0) return;
    setIsParsingPdf(true);
    await addOfficialInvoicesBatch(batchItems);
    setIsParsingPdf(false);
    setIsBatchDialogOpen(false);
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateBatchType = (id: string, type: "kestigim" | "bana_kesilen") => {
    setBatchItems(prev => prev.map(item => item.id === id ? { ...item, type } : item));
  };

  const handleOpenAdd = (type: "kestigim" | "bana_kesilen" = "kestigim") => {
    setEditingInvoice(null);
    setIsAutoParsed(false);
    setFormData({
      type,
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      partyName: "",
      partyTaxId: "",
      description: "",
      category: "Genel",
      calcMode: "subtotal",
      subtotal: "",
      taxRate: "20",
      taxAmount: "",
      totalAmount: "",
      invoiceFile: "",
      invoiceFileName: "",
      notes: ""
    });
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (inv: OfficialInvoice) => {
    setEditingInvoice(inv);
    setIsAutoParsed(false);
    setFormData({
      type: inv.type,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      partyName: inv.partyName,
      partyTaxId: inv.partyTaxId || "",
      description: inv.description,
      category: inv.category || "Genel",
      calcMode: "subtotal",
      subtotal: inv.subtotal.toString(),
      taxRate: inv.taxRate.toString(),
      taxAmount: inv.taxAmount.toString(),
      totalAmount: inv.totalAmount.toString(),
      invoiceFile: inv.invoiceFile || "",
      invoiceFileName: inv.invoiceFileName || "",
      notes: inv.notes || ""
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber.trim() || !formData.partyName.trim()) {
      toast.error("Lütfen Fatura Numarası ve Firma/Kişi adını giriniz.");
      return;
    }

    const subtotal = parseFloat(formData.subtotal) || 0;
    const taxRate = parseFloat(formData.taxRate) || 0;
    const taxAmount = parseFloat(formData.taxAmount) || (subtotal * taxRate / 100);
    const totalAmount = parseFloat(formData.totalAmount) || (subtotal + taxAmount);

    if (editingInvoice) {
      updateOfficialInvoice({
        ...editingInvoice,
        type: formData.type,
        invoiceNumber: formData.invoiceNumber.trim(),
        date: formData.date,
        partyName: formData.partyName.trim(),
        partyTaxId: formData.partyTaxId.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        invoiceFile: formData.invoiceFile,
        invoiceFileName: formData.invoiceFileName,
        notes: formData.notes
      });
    } else {
      addOfficialInvoice({
        type: formData.type,
        invoiceNumber: formData.invoiceNumber.trim(),
        date: formData.date,
        partyName: formData.partyName.trim(),
        partyTaxId: formData.partyTaxId.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        invoiceFile: formData.invoiceFile,
        invoiceFileName: formData.invoiceFileName,
        notes: formData.notes
      });
    }
    setIsAddDialogOpen(false);
  };

  // Filtering Logic
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(new Date().getFullYear().toString());
    officialInvoices.forEach(inv => {
      if (inv.date) yearsSet.add(inv.date.split("-")[0]);
    });
    return Array.from(yearsSet).sort().reverse();
  }, [officialInvoices]);

  const filteredInvoices = useMemo(() => {
    return officialInvoices.filter(inv => {
      if (selectedYear !== "all") {
        const year = inv.date ? inv.date.split("-")[0] : "";
        if (year !== selectedYear) return false;
      }

      if (selectedMonth !== "all") {
        const month = inv.date ? inv.date.split("-")[1] : "";
        if (month !== selectedMonth) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const numMatch = inv.invoiceNumber.toLowerCase().includes(term);
        const partyMatch = inv.partyName.toLowerCase().includes(term);
        const descMatch = inv.description.toLowerCase().includes(term);
        const taxIdMatch = (inv.partyTaxId || "").toLowerCase().includes(term);
        if (!numMatch && !partyMatch && !descMatch && !taxIdMatch) return false;
      }

      return true;
    });
  }, [officialInvoices, selectedYear, selectedMonth, searchTerm]);

  const issuedInvoices = useMemo(() => filteredInvoices.filter(i => i.type === "kestigim"), [filteredInvoices]);
  const receivedInvoices = useMemo(() => filteredInvoices.filter(i => i.type === "bana_kesilen"), [filteredInvoices]);

  // Overall Financial & Tax Summaries
  const metrics = useMemo(() => {
    let issuedSubtotal = 0, issuedTax = 0, issuedTotal = 0;
    let receivedSubtotal = 0, receivedTax = 0, receivedTotal = 0;

    filteredInvoices.forEach(inv => {
      if (inv.type === "kestigim") {
        issuedSubtotal += inv.subtotal;
        issuedTax += inv.taxAmount;
        issuedTotal += inv.totalAmount;
      } else {
        receivedSubtotal += inv.subtotal;
        receivedTax += inv.taxAmount;
        receivedTotal += inv.totalAmount;
      }
    });

    const netTax = issuedTax - receivedTax;
    const profitMatrah = issuedSubtotal - receivedSubtotal;

    return {
      issuedSubtotal, issuedTax, issuedTotal, issuedCount: issuedInvoices.length,
      receivedSubtotal, receivedTax, receivedTotal, receivedCount: receivedInvoices.length,
      netTax, profitMatrah
    };
  }, [filteredInvoices, issuedInvoices, receivedInvoices]);

  // Quarterly (3-Month / Geçici Vergi) Breakdown
  const quarterlyData = useMemo(() => {
    const yearToUse = selectedYear !== "all" ? selectedYear : new Date().getFullYear().toString();
    const yearInvoices = officialInvoices.filter(i => i.date && i.date.startsWith(yearToUse));

    const quarters = [
      { id: 1, name: "1. Çeyrek (Ocak - Mart)", months: ["01", "02", "03"] },
      { id: 2, name: "2. Çeyrek (Nisan - Haziran)", months: ["04", "05", "06"] },
      { id: 3, name: "3. Çeyrek (Temmuz - Eylül)", months: ["07", "08", "09"] },
      { id: 4, name: "4. Çeyrek (Ekim - Aralık)", months: ["10", "11", "12"] },
    ];

    return quarters.map(q => {
      let salesMatrah = 0;
      let expenseMatrah = 0;
      let salesKdv = 0;
      let expenseKdv = 0;

      yearInvoices.forEach(inv => {
        const m = inv.date.split("-")[1];
        if (q.months.includes(m)) {
          if (inv.type === "kestigim") {
            salesMatrah += inv.subtotal;
            salesKdv += inv.taxAmount;
          } else {
            expenseMatrah += inv.subtotal;
            expenseKdv += inv.taxAmount;
          }
        }
      });

      const netMatrahProfit = salesMatrah - expenseMatrah;
      const estimatedTax = netMatrahProfit > 0 ? netMatrahProfit * 0.25 : 0;
      const netKdv = salesKdv - expenseKdv;

      return {
        quarter: q.name,
        salesMatrah,
        expenseMatrah,
        netMatrahProfit,
        estimatedTax,
        salesKdv,
        expenseKdv,
        netKdv
      };
    });
  }, [officialInvoices, selectedYear]);

  // Monthly Breakdown Table
  const monthlyData = useMemo(() => {
    const yearToUse = selectedYear !== "all" ? selectedYear : new Date().getFullYear().toString();
    const months = [
      { num: "01", name: "Ocak" }, { num: "02", name: "Şubat" }, { num: "03", name: "Mart" },
      { num: "04", name: "Nisan" }, { num: "05", name: "Mayıs" }, { num: "06", name: "Haziran" },
      { num: "07", name: "Temmuz" }, { num: "08", name: "Ağustos" }, { num: "09", name: "Eylül" },
      { num: "10", name: "Ekim" }, { num: "11", name: "Kasım" }, { num: "12", name: "Aralık" }
    ];

    return months.map(m => {
      let issuedMatrah = 0, issuedKdv = 0;
      let receivedMatrah = 0, receivedKdv = 0;

      officialInvoices.forEach(inv => {
        if (inv.date && inv.date.startsWith(`${yearToUse}-${m.num}`)) {
          if (inv.type === "kestigim") {
            issuedMatrah += inv.subtotal;
            issuedKdv += inv.taxAmount;
          } else {
            receivedMatrah += inv.subtotal;
            receivedKdv += inv.taxAmount;
          }
        }
      });

      const netKdv = issuedKdv - receivedKdv;
      const netMatrah = issuedMatrah - receivedMatrah;

      return {
        monthName: m.name,
        issuedMatrah,
        issuedKdv,
        receivedMatrah,
        receivedKdv,
        netMatrah,
        netKdv
      };
    });
  }, [officialInvoices, selectedYear]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            E-Fatura & Ön Muhasebe Yönetimi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tek tek veya topluca onlarca PDF faturayı aynı anda yükleyin, sistem saniyeler içinde tarasın!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenAdd("kestigim")} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" /> Kestiğim Faturayı Ekle
          </Button>
          <Button onClick={() => handleOpenAdd("bana_kesilen")} variant="outline" className="gap-2 border-primary/30">
            <Plus className="h-4 w-4 text-primary" /> Bana Kesilen Faturayı Ekle
          </Button>
        </div>
      </div>

      {/* Interactive Multi-PDF Drag & Drop Scanner Banner */}
      <Card className="border-2 border-dashed border-primary/40 bg-gradient-to-r from-primary/10 via-emerald-500/5 to-blue-500/10 hover:border-primary transition-all">
        <CardContent 
          className="p-6 text-center cursor-pointer relative" 
          onDrop={handlePdfDrop} 
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              {isParsingPdf ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center justify-center gap-2">
                <span>⚡ Toplu PDF E-Fatura Okuyucu</span>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-[10px]">
                  ÇOKLU & TOPLU YÜKLEME DESTEKLİ
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg mt-1 mx-auto">
                Onlarca PDF faturayı aynı anda sürükleyip bırakın. Sistem Fatura No, Tarih, Firma ve Tutar bilgilerini saniyeler içinde otomatik tarlasın!
              </p>
            </div>

            <input 
              type="file" 
              accept="application/pdf" 
              multiple 
              className="hidden" 
              id="main-pdf-auto-upload" 
              onChange={handlePdfSelect} 
            />
            <label htmlFor="main-pdf-auto-upload" className="mt-1">
              <Button type="button" variant="default" className="gap-2 pointer-events-none bg-primary hover:bg-primary/90">
                <Upload className="h-4 w-4" /> Toplu PDF Faturaları Seç veya Sürükle
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>Kestiğim Faturalar (Satış)</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(metrics.issuedTotal, sym)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Matrah (Brüt):</span>
                <span className="font-medium text-foreground">{formatCurrency(metrics.issuedSubtotal, sym)}</span>
              </div>
              <div className="flex justify-between">
                <span>Hesaplanan KDV:</span>
                <span className="font-medium text-emerald-600">{formatCurrency(metrics.issuedTax, sym)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
              <span>Bana Kesilen Faturalar (Gider)</span>
              <ArrowDownRight className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(metrics.receivedTotal, sym)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Matrah (Brüt):</span>
                <span className="font-medium text-foreground">{formatCurrency(metrics.receivedSubtotal, sym)}</span>
              </div>
              <div className="flex justify-between">
                <span>İndirilecek KDV:</span>
                <span className="font-medium text-blue-600">{formatCurrency(metrics.receivedTax, sym)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={metrics.netTax >= 0 ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>KDV Durumu</span>
              <Scale className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.netTax >= 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatCurrency(Math.abs(metrics.netTax), sym)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.netTax >= 0 ? (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline" /> Devlete Ödenecek Tahmini KDV
                </span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 inline" /> Sonraki Ay / Döneme Devreden KDV
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center justify-between">
              <span>Ticari Matrah Kârı</span>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.profitMatrah >= 0 ? "text-purple-700 dark:text-purple-300" : "text-destructive"}`}>
              {formatCurrency(metrics.profitMatrah, sym)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <span>Satış Matrahı - Gider Matrahı</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Fatura No, Firma adı, Açıklama veya Vergi No..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Yıl" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Yıllar</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Ay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Aylar</SelectItem>
                <SelectItem value="01">Ocak</SelectItem>
                <SelectItem value="02">Şubat</SelectItem>
                <SelectItem value="03">Mart</SelectItem>
                <SelectItem value="04">Nisan</SelectItem>
                <SelectItem value="05">Mayıs</SelectItem>
                <SelectItem value="06">Haziran</SelectItem>
                <SelectItem value="07">Temmuz</SelectItem>
                <SelectItem value="08">Ağustos</SelectItem>
                <SelectItem value="09">Eylül</SelectItem>
                <SelectItem value="10">Ekim</SelectItem>
                <SelectItem value="11">Kasım</SelectItem>
                <SelectItem value="12">Aralık</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-4">
            <span>Listelenen: <strong className="text-foreground">{filteredInvoices.length}</strong> fatura</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid grid-cols-3 max-w-xl">
          <TabsTrigger value="kestigim" className="gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            Kestiğim Faturalar ({issuedInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="bana_kesilen" className="gap-2">
            <ArrowDownRight className="h-4 w-4 text-blue-500" />
            Bana Kesilenler ({receivedInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="vergi_raporu" className="gap-2">
            <Scale className="h-4 w-4 text-amber-500" />
            Vergi & Dönemsel Rapor
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Kestiğim Faturalar */}
        <TabsContent value="kestigim" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Düzenlediğim (Kestiğim) Satış Faturaları</CardTitle>
                <CardDescription>Müşterilerinize veya firmalara kestiğiniz e-fatura ve e-arşiv kayıtları</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleOpenAdd("kestigim")} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" /> Yeni Satış Faturası Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <InvoiceTable 
                invoices={issuedInvoices} 
                sym={sym} 
                onEdit={handleOpenEdit} 
                onDelete={deleteOfficialInvoice}
                onPreview={(inv) => handleLazyPreview(inv)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Bana Kesilen Faturalar */}
        <TabsContent value="bana_kesilen" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Adıma / Firmama Kesilen Faturalar (Alış & Gider)</CardTitle>
                <CardDescription>Tedarikçilerin, kargo firmalarının ve hizmet sağlayıcıların kestiği faturalar</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleOpenAdd("bana_kesilen")} variant="outline" className="gap-1 border-primary/30">
                <Plus className="h-4 w-4 text-primary" /> Yeni Gider Faturası Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <InvoiceTable 
                invoices={receivedInvoices} 
                sym={sym} 
                onEdit={handleOpenEdit} 
                onDelete={deleteOfficialInvoice}
                onPreview={(inv) => handleLazyPreview(inv)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Vergi Raporlama & Ön Muhasebe */}
        <TabsContent value="vergi_raporu" className="mt-4 space-y-6">
          {/* Quarterly / 3-Month Geçici Vergi Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-500" />
                3 Aylık Dönemler (Geçici Vergi Ön Hazırlığı - {selectedYear !== "all" ? selectedYear : new Date().getFullYear()})
              </CardTitle>
              <CardDescription>
                Geçici Vergi dönemleri bazında Ticari Matrah Kârı ve tahmini %25 Vergi Yükü hesabı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dönem / Çeyrek</TableHead>
                    <TableHead className="text-right">Satış Matrahı (Gelir)</TableHead>
                    <TableHead className="text-right">Gider Matrahı (Gider)</TableHead>
                    <TableHead className="text-right">Net Matrah Kârı</TableHead>
                    <TableHead className="text-right">Hesaplanan KDV</TableHead>
                    <TableHead className="text-right">İndirilecek KDV</TableHead>
                    <TableHead className="text-right font-semibold">Tahmini Geçici Vergi (%25)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quarterlyData.map((q) => (
                    <TableRow key={q.quarter}>
                      <TableCell className="font-medium">{q.quarter}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(q.salesMatrah, sym)}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{formatCurrency(q.expenseMatrah, sym)}</TableCell>
                      <TableCell className={`text-right font-bold ${q.netMatrahProfit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                        {formatCurrency(q.netMatrahProfit, sym)}
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(q.salesKdv, sym)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(q.expenseKdv, sym)}</TableCell>
                      <TableCell className="text-right font-bold text-amber-600">
                        {formatCurrency(q.estimatedTax, sym)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Monthly KDV Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-500" />
                Aylık KDV Beyannamesi Dengesi ({selectedYear !== "all" ? selectedYear : new Date().getFullYear()})
              </CardTitle>
              <CardDescription>
                Aylar itibarıyla Hesaplanan KDV, İndirilecek KDV ve Ödenecek/Devreden KDV farkı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ay</TableHead>
                    <TableHead className="text-right">Satış Matrahı</TableHead>
                    <TableHead className="text-right text-emerald-600">Hesaplanan KDV (% Borç)</TableHead>
                    <TableHead className="text-right">Gider Matrahı</TableHead>
                    <TableHead className="text-right text-blue-600">İndirilecek KDV (% Alacak)</TableHead>
                    <TableHead className="text-right font-semibold">Net KDV Durumu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((m) => (
                    <TableRow key={m.monthName}>
                      <TableCell className="font-medium">{m.monthName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.issuedMatrah, sym)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(m.issuedKdv, sym)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.receivedMatrah, sym)}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{formatCurrency(m.receivedKdv, sym)}</TableCell>
                      <TableCell className="text-right">
                        {m.netKdv > 0 ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            {formatCurrency(m.netKdv, sym)} (Ödenecek KDV)
                          </Badge>
                        ) : m.netKdv < 0 ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            {formatCurrency(Math.abs(m.netKdv), sym)} (Devreden KDV)
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Batch Import Multi-PDF Preview Modal */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Toplu PDF Fatura İçe Aktarma & Önizleme
            </DialogTitle>
            <DialogDescription>
              Taranan PDF dosyalarının bilgilerini gözden geçirin ve tek tıkla veritabanına aktarın.
            </DialogDescription>
          </DialogHeader>

          {isParsingPdf && (
            <div className="py-6 space-y-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  PDF Dosyaları Taranıyor & Ayrıştırılıyor...
                </span>
                <span>%{batchProgress}</span>
              </div>
              <Progress value={batchProgress} className="h-2" />
            </div>
          )}

          {!isParsingPdf && (
            <div className="flex-1 overflow-y-auto my-2 space-y-4">
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span>Toplam <strong>{batchItems.length}</strong> adet PDF fatura başarıyla taranarak ayrıştırıldı.</span>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fatura Yönü</TableHead>
                      <TableHead>Fatura No</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Firma / Cari Adı</TableHead>
                      <TableHead className="text-right">Matrah (Net)</TableHead>
                      <TableHead className="text-right">KDV Tutarı</TableHead>
                      <TableHead className="text-right font-bold">Genel Toplam</TableHead>
                      <TableHead className="text-right">Sil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchItems.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Select 
                            value={item.type} 
                            onValueChange={(val: "kestigim" | "bana_kesilen") => handleUpdateBatchType(item.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kestigim">🟢 Kestiğim</SelectItem>
                              <SelectItem value="bana_kesilen">🔵 Bana Kesilen</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{item.invoiceNumber}</TableCell>
                        <TableCell className="text-xs">{item.date}</TableCell>
                        <TableCell className="text-xs font-medium max-w-[150px] truncate" title={item.partyName}>
                          {item.partyName}
                        </TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(item.subtotal, sym)}</TableCell>
                        <TableCell className="text-right text-xs text-amber-600">{formatCurrency(item.taxAmount, sym)}</TableCell>
                        <TableCell className="text-right text-xs font-bold">{formatCurrency(item.totalAmount, sym)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveBatchItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              disabled={batchItems.length === 0 || isParsingPdf} 
              onClick={handleSaveBatchInvoices}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Tümünü Veritabanına Aktar ({batchItems.length} Fatura)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Single Invoice Modal */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>{editingInvoice ? "Faturayı Düzenle" : "E-Fatura Kaydı"}</span>
              </div>
              {isAutoParsed && (
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> PDF'den Otomatik Taranarak Dolduruldu
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Fatura detaylarını kontrol edip kaydedebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          {/* Secondary PDF Upload Box inside Modal */}
          <div className="p-3 border border-dashed rounded-lg bg-primary/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Başka bir PDF yükleyerek form verilerini otomatik değiştirebilirsiniz:</span>
            </div>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              id="modal-pdf-upload" 
              onChange={handlePdfSelect} 
            />
            <label htmlFor="modal-pdf-upload">
              <Button type="button" variant="outline" size="sm" className="gap-1 text-xs">
                <Upload className="h-3.5 w-3.5" /> PDF Seç & Tara
              </Button>
            </label>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fatura Yönü</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(val: "kestigim" | "bana_kesilen") => setFormData(prev => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className={formData.type === "kestigim" ? "border-emerald-500/50 bg-emerald-500/5" : "border-blue-500/50 bg-blue-500/5"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kestigim">🟢 Kestiğim Fatura (Satış / Giden)</SelectItem>
                    <SelectItem value="bana_kesilen">🔵 Bana Kesilen Fatura (Gider / Alış)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fatura Numarası *</Label>
                <Input 
                  placeholder="Örn: GIB2026000000001" 
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{formData.type === "kestigim" ? "Kime Kesildi (Müşteri/Firma Adı) *" : "Kim Kesti (Tedarikçi/Satıcı Adı) *"}</Label>
                <Input 
                  placeholder="Örn: Trendyol Pazaryeri A.Ş. veya Ahmet Yılmaz" 
                  value={formData.partyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, partyName: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>VKN / TCKN (Vergi / Kimlik No)</Label>
                <Input 
                  placeholder="10 veya 11 haneli vergi no" 
                  value={formData.partyTaxId}
                  onChange={(e) => setFormData(prev => ({ ...prev, partyTaxId: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fatura Tarihi *</Label>
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Genel">Genel</SelectItem>
                    <SelectItem value="Ürün Satışı">Ürün Satışı</SelectItem>
                    <SelectItem value="Stok / Hammadde Alımı">Stok / Hammadde Alımı</SelectItem>
                    <SelectItem value="Kargo & Lojistik">Kargo & Lojistik</SelectItem>
                    <SelectItem value="Reklam & Pazarlama">Reklam & Pazarlama</SelectItem>
                    <SelectItem value="Yazılım & Sunucu">Yazılım & Sunucu</SelectItem>
                    <SelectItem value="Kira & Ofis">Kira & Ofis</SelectItem>
                    <SelectItem value="Danışmanlık & Hizmet">Danışmanlık & Hizmet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fatura İçeriği / Açıklama *</Label>
              <Input 
                placeholder="Örn: Tekstil Ürünü Satışı veya Kargo Hizmet Faturası"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            {/* Calculations Box */}
            <div className="p-4 border rounded-xl bg-muted/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tutar & KDV Otomatik Hesaplayıcı</span>
                <Badge variant="outline" className="text-[10px]">
                  KDV & Matrah Senkronize
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">KDV Oranı (%)</Label>
                  <Select 
                    value={formData.taxRate} 
                    onValueChange={(val) => handleAmountChange("taxRate", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">%20 KDV</SelectItem>
                      <SelectItem value="10">%10 KDV</SelectItem>
                      <SelectItem value="1">%1 KDV</SelectItem>
                      <SelectItem value="0">%0 Muaf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Matrah (KDV Hariç Net)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.subtotal}
                    onChange={(e) => handleAmountChange("subtotal", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Genel Toplam (KDV Dahil Brüt)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    onChange={(e) => handleAmountChange("totalAmount", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>Hesaplanan KDV Tutarı:</span>
                <span className="font-semibold text-foreground">{formData.taxAmount ? `${formData.taxAmount} ${sym}` : "0.00 " + sym}</span>
              </div>
            </div>

            {/* File Info */}
            <div className="space-y-2">
              <Label>Yüklü Fatura Belgesi</Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex-1 truncate p-2 border rounded bg-background">
                  {formData.invoiceFileName ? formData.invoiceFileName : "Fatura Belgesi Eklenmedi"}
                </span>
                {formData.invoiceFile && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive text-xs" 
                    onClick={() => setFormData(prev => ({ ...prev, invoiceFile: "", invoiceFileName: "" }))}
                  >
                    Kaldır
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ek Notlar</Label>
              <Textarea 
                placeholder="Varsa ek notlar..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4" /> {editingInvoice ? "Güncelle" : "Faturayı Sisteme Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <Dialog open={!!previewFileUrl} onOpenChange={() => setPreviewFileUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              {previewFileUrl?.name || "Fatura Belgesi Önizleme"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 bg-black/5 rounded-lg overflow-hidden flex items-center justify-center p-2">
            {previewFileUrl?.url.startsWith("data:application/pdf") ? (
              <iframe src={previewFileUrl.url} className="w-full h-full border-0 rounded" />
            ) : previewFileUrl?.url.startsWith("data:image/") ? (
              <img src={previewFileUrl.url} alt="Fatura Görseli" className="max-h-full max-w-full object-contain rounded" />
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">Bu dosya önizlenemiyor.</p>
                <a href={previewFileUrl?.url} download={previewFileUrl?.name} className="inline-flex items-center gap-2 btn btn-primary">
                  <Download className="h-4 w-4" /> Dosyayı İndir
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for rendering invoice data table
function InvoiceTable({ 
  invoices, 
  sym, 
  onEdit, 
  onDelete, 
  onPreview 
}: { 
  invoices: OfficialInvoice[]; 
  sym: string; 
  onEdit: (inv: OfficialInvoice) => void; 
  onDelete: (id: string) => void; 
  onPreview: (inv: OfficialInvoice) => void; 
}) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p>Henüz fatura kaydı bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Fatura No</TableHead>
            <TableHead>Cari / Firma Adı</TableHead>
            <TableHead>İçerik / Açıklama</TableHead>
            <TableHead className="text-right">Matrah (Net)</TableHead>
            <TableHead className="text-center">KDV %</TableHead>
            <TableHead className="text-right">KDV Tutarı</TableHead>
            <TableHead className="text-right font-bold">Genel Toplam</TableHead>
            <TableHead className="text-center">Belge</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDate(inv.date)}
              </TableCell>
              <TableCell className="font-mono text-xs font-semibold">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell>
                <div className="font-medium text-sm">{inv.partyName}</div>
                {inv.partyTaxId && (
                  <div className="text-[10px] text-muted-foreground">VKN/TCKN: {inv.partyTaxId}</div>
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs" title={inv.description}>
                {inv.description}
              </TableCell>
              <TableCell className="text-right text-xs font-medium">
                {formatCurrency(inv.subtotal, sym)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-[10px]">
                  %{inv.taxRate}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs font-medium text-amber-600">
                {formatCurrency(inv.taxAmount, sym)}
              </TableCell>
              <TableCell className="text-right text-sm font-bold text-foreground">
                {formatCurrency(inv.totalAmount, sym)}
              </TableCell>
              <TableCell className="text-center">
                {inv.invoiceFileName || inv.invoiceFile ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-primary hover:text-primary/80"
                    onClick={() => onPreview(inv)}
                    title={inv.invoiceFileName || "Belgeyi Göster"}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Yok</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(inv)}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
