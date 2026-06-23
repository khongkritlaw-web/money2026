import React, { useState } from 'react';
import {
  FileSpreadsheet, TrendingUp, CheckCircle2, AlertTriangle, Layers, Plus, LogOut,
  ExternalLink, RefreshCw, CalendarRange, Trash2, ListFilter, Play, CircleDollarSign,
  Home, Car, Shield, Lightbulb, HeartPulse, CreditCard, User, ClipboardList, Info, Eye
} from 'lucide-react';
import { SpreadsheetData, SheetCategory, InstallmentRow } from '../types';
import PaymentTable from './PaymentTable';
import InstallmentDetailModal from './InstallmentDetailModal';

const getCategoryIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('บ้าน') || t.includes('คอนโด') || t.includes('ห้อง') || t.includes('ที่พัก') || t.includes('home') || t.includes('house') || t.includes('room')) {
    return <Home className="h-4 w-4" />;
  }
  if (t.includes('รถ') || t.includes('มอเตอร์ไซค์') || t.includes('car') || t.includes('motorcycle') || t.includes('van')) {
    return <Car className="h-4 w-4" />;
  }
  if (t.includes('ประกัน') || t.includes('ชีวิต') || t.includes('insurance') || t.includes('shield')) {
    return <Shield className="h-4 w-4" />;
  }
  if (t.includes('น้ำ') || t.includes('ไฟ') || t.includes('เน็ต') || t.includes('wifi') || t.includes('บิล') || t.includes('light') || t.includes('bill')) {
    return <Lightbulb className="h-4 w-4" />;
  }
  if (t.includes('สุขภาพ') || t.includes('รักษา') || t.includes('ยา') || t.includes('health') || t.includes('medical') || t.includes('care')) {
    return <HeartPulse className="h-4 w-4" />;
  }
  return <CreditCard className="h-4 w-4" />;
};

const getCategorySubtitle = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('บ้าน') || t.includes('คอนโด') || t.includes('ที่ดิน')) {
    return 'ค่างวดผ่อนชำระที่อยู่อาศัย';
  }
  if (t.includes('รถ') || t.includes('เซล') || t.includes('มอเตอร์ไซค์')) {
    return 'ค่างวดผ่อนชำระยานพาหนะ';
  }
  if (t.includes('ประกัน') || t.includes('ชีวิต') || t.includes('อุบัติเหตุ')) {
    return 'เบี้ยประกันภัยรายสะสม';
  }
  if (t.includes('น้ำ') || t.includes('ไฟ')) {
    return 'ค่าบริการสาธารณูปโภค';
  }
  if (t.includes('เน็ต') || t.includes('wifi') || t.includes('มือถือ')) {
    return 'บิลค่าสื่อสารและอินเทอร์เน็ต';
  }
  if (t.includes('บัตร') || t.includes('เครดิต') || t.includes('credit') || t.includes('card')) {
    return 'ยอดชำระบัตรเครดิตรายเดือน';
  }
  return 'รายการผ่อนชำระรายเดือน';
};

interface PaymentDashboardProps {
  data: SpreadsheetData;
  activeCategoryIndex: number;
  onSelectCategory: (index: number) => void;
  onSelectInstallment: (installment: InstallmentRow) => void;
  onClearPayment: (installment: InstallmentRow) => Promise<void>;
  onAddInstallment: (installmentNum: string, monthStr: string, dueAmount: number) => Promise<void>;
  onAddCategoryTab: (
    title: string,
    dueDay: string,
    owner: string,
    detail: string,
    amount: number,
    months: number,
    startMonth: string
  ) => Promise<void>;
  onRefresh: () => void;
  onLogout: () => void;
  userName?: string;
  userPhoto?: string;
  isProcessing: boolean;
}

export default function PaymentDashboard({
  data,
  activeCategoryIndex,
  onSelectCategory,
  onSelectInstallment,
  onClearPayment,
  onAddInstallment,
  onAddCategoryTab,
  onRefresh,
  onLogout,
  userName,
  userPhoto,
  isProcessing,
}: PaymentDashboardProps) {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedDetailInstallment, setSelectedDetailInstallment] = useState<InstallmentRow | null>(null);

  // New category form state
  const [catTitle, setCatTitle] = useState('');
  const [catDueDay, setCatDueDay] = useState('ทุกวันที่ 1');
  const [catOwner, setCatOwner] = useState('');
  const [catDetail, setCatDetail] = useState('');
  const [catAmount, setCatAmount] = useState('600');
  const [catMonths, setCatMonths] = useState('12');
  const [catStartMonth, setCatStartMonth] = useState('ก.ค.2569');
  const [catError, setCatError] = useState('');

  const handleTitleChange = (val: string) => {
    setCatTitle(val);
    const lower = val.toLowerCase();
    if (lower.includes('บัตร') || lower.includes('เครดิต') || lower.includes('credit')) {
      setCatMonths('1');
    }
  };

  const activeCategory: SheetCategory | undefined = data.categories[activeCategoryIndex];

  // Calculate global summary across all sheet categories
  const categoriesCount = data.categories.length;
  const globalTotalExpected = data.categories.reduce((acc, cat) => acc + cat.totalExpected, 0);
  const globalTotalPaid = data.categories.reduce((acc, cat) => acc + cat.totalPaid, 0);
  const globalTotalRemaining = data.categories.reduce((acc, cat) => acc + cat.totalRemaining, 0);
  const globalProgress = globalTotalExpected > 0 ? (globalTotalPaid / globalTotalExpected) * 100 : 0;

  // Active Category Specific Stats
  const activeExpected = activeCategory ? activeCategory.totalExpected : 0;
  const activePaid = activeCategory ? activeCategory.totalPaid : 0;
  const activeRemaining = activeCategory ? activeCategory.totalRemaining : 0;
  const activePercent = activeExpected > 0 ? (activePaid / activeExpected) * 100 : 0;

  const isActiveCreditCard = activeCategory && (
    activeCategory.title.toLowerCase().includes('บัตร') ||
    activeCategory.title.toLowerCase().includes('เครดิต') ||
    activeCategory.title.toLowerCase().includes('credit') ||
    activeCategory.installments.length === 1
  );

  // List of overdue installments across all categories for quick alerts
  const overdueAlertsList: { categoryTitle: string; item: InstallmentRow }[] = [];
  data.categories.forEach((cat) => {
    cat.installments.forEach((inst) => {
      if (inst.status === 'OVERDUE') {
        overdueAlertsList.push({ categoryTitle: cat.title, item: inst });
      }
    });
  });

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    if (!catTitle.trim() || !catStartMonth.trim()) {
      setCatError('กรุณากรอกชื่อหมวดหมู่และเดือนเริ่มต้น');
      return;
    }

    const amountNum = parseFloat(catAmount);
    const monthsNum = parseInt(catMonths, 10);

    if (isNaN(amountNum) || amountNum <= 0 || isNaN(monthsNum) || monthsNum <= 0) {
      setCatError('กรุณาระบุค่างวดและจำนวนเดือนที่ถูกต้อง');
      return;
    }

    try {
      await onAddCategoryTab(
        catTitle.trim(),
        catDueDay.trim(),
        catOwner.trim(),
        catDetail.trim(),
        amountNum,
        monthsNum,
        catStartMonth.trim()
      );
      setShowAddCategory(false);
      // Reset form
      setCatTitle('');
      setCatOwner('');
      setCatDetail('');
    } catch (err: any) {
      setCatError(err.message || 'ไม่สามารถสร้างหมวดหมู่ใหม่ได้');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="dashboard-wrapper">
      {/* Top Banner & Profile Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600">
            <FileSpreadsheet className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight" id="dashboard-main-title">
              {data.title}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <span>เชื่อมต่อแล้ว</span>
              <a
                href={`https://docs.google.com/spreadsheets/d/${data.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-0.5 font-medium"
              >
                ดูบน Google Sheet <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Current user */}
        <div className="flex items-center gap-3 bg-slate-50 pl-3.5 pr-2 py-1.5 rounded-full border border-slate-150 self-end md:self-auto">
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userName}
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-full border border-slate-200"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
              U
            </div>
          )}
          <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
            {userName || 'ผู้ใช้งาน'}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full hover:bg-slate-200 p-1.5 text-slate-400 hover:text-rose-600 transition"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Critical Overdue Payment Alerts Bar */}
      {overdueAlertsList.length > 0 && (
        <div
          className="rounded-2xl border-2 border-rose-100 bg-rose-50/55 p-4.5 text-rose-800 shadow-xs flex items-start gap-3.5 animate-pulse"
          id="overdue-alerts-block"
        >
          <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm font-bold">พพบงวดค้างชำระเงิน! ({overdueAlertsList.length} รายการ)</h4>
            <div className="text-xs space-y-1 text-rose-700/90 leading-relaxed font-medium">
              {overdueAlertsList.slice(0, 3).map((alert, idx) => (
                <p key={idx}>
                  • <b>{alert.categoryTitle}</b>: งวดที่ {alert.item.index}ค้างชำระประจําเดือน <b>{alert.item.month}</b> (ค้างชำระค่างวด {alert.item.dueAmount.toLocaleString()} บาท)
                </p>
              ))}
              {overdueAlertsList.length > 3 && (
                <p className="text-[10px] text-rose-600 block pt-0.5 italic">
                  และอีก {overdueAlertsList.length - 3} รายการ... ค้นหาและบันทึกชำระเงินได้ที่หมวดหมู่ด้านล่าง
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-widget-container">
        {/* Progress KPI */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">สัดส่วนชำระแล้ว</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800">
                {globalProgress.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 font-medium">ภาพรวม</span>
            </div>
            <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${globalProgress}%` }} />
            </div>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Global Total Due */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ค่างวดรวมทั้งหมด</span>
            <div className="text-2xl font-extrabold text-slate-800">
              {globalTotalExpected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-400 block font-medium">สะสมจาก {categoriesCount} หมวดหมู่</span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-slate-600">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Global Paid */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ชำระแล้วรวม</span>
            <div className="text-2xl font-extrabold text-emerald-600">
              {globalTotalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-emerald-600 font-medium block">
              คิดเป็น {(globalTotalExpected > 0 ? (globalTotalPaid / globalTotalExpected) * 100 : 0).toFixed(1)}%
            </span>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Global Outstanding / Debt remaining */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ยอดค้างจ่ายรวม</span>
            <div className="text-2xl font-extrabold text-rose-500">
              {globalTotalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-rose-400 block font-medium">รอการชำระเงินค่างวด</span>
          </div>
          <div className={`rounded-2xl p-3 ${globalTotalRemaining > 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
            <CircleDollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Category Tab Selector Wrapper */}
      <div className="space-y-3" id="categories-tabs-module">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
            <ListFilter className="h-4 w-4" />
            <span>เลือกหมวดหมู่ค่าใช้จ่าย</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={isProcessing}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 transition"
              title="ดึงข้อมูลล่าสุดจาก Google Sheets"
            >
              <RefreshCw className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>ซิงก์ดึงข้อมูลชีท</span>
            </button>
            <button
              onClick={() => setShowAddCategory(true)}
              className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700/90 rounded-lg flex items-center gap-1 transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>ตั้งหมวดหมู่ใหม่</span>
            </button>
          </div>
        </div>

        {/* Swipeable Tabs list / Bento Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5" id="category-tabs">
          {data.categories.map((cat, idx) => {
            const isActive = idx === activeCategoryIndex;
            const hasOverdue = cat.installments.some((x) => x.status === 'OVERDUE');
            const ownerName = cat.metadata?.ref1 || 'ไม่ระบุชื่อ';
            const detailInfo = cat.metadata?.ref2 || 'ไม่มีรายละเอียดสัญญา';
            const dueDay = cat.metadata?.dueDateInfo || 'ไม่กำหนดวัน';
            
            // Calculate progress stats for this category
            const total = cat.installments.length;
            const paid = cat.installments.filter(x => x.status === 'PAID').length;
            const isCreditCard = cat.title.toLowerCase().includes('บัตร') || 
                                 cat.title.toLowerCase().includes('เครดิต') || 
                                 cat.title.toLowerCase().includes('credit') || 
                                 total === 1;

            return (
              <button
                key={cat.title}
                onClick={() => onSelectCategory(idx)}
                className={`flex flex-col text-left p-4.5 rounded-2xl border transition-all duration-200 relative cursor-pointer hover:shadow-sm ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                    : 'bg-white text-slate-700 border-slate-150 hover:bg-slate-50/75 hover:border-slate-300'
                }`}
              >
                {/* Overdue alert indicator */}
                {hasOverdue && (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 absolute top-4 right-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  </span>
                )}

                {/* Top Section: Icon & Title */}
                <div className="flex items-start gap-3 w-full">
                  <div className={`p-2.5 rounded-xl text-xs shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600'
                  }`}>
                    {getCategoryIcon(cat.title)}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className={`text-xs font-extrabold truncate block ${isActive ? 'text-white' : 'text-slate-800'}`}>
                      {cat.title}
                    </span>
                    <span className={`text-[10px] font-bold block ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                      {getCategorySubtitle(cat.title)}
                    </span>
                  </div>
                </div>

                {/* Metadata block: "ของใคร - ค่าใช้จ่ายอะไร" */}
                <div className="mt-4 space-y-2.5 text-[11px] w-full font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">👤 ของใคร:</span>
                    <span className={`font-bold ${isActive ? 'text-indigo-300' : 'text-slate-705'}`}>{ownerName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">📝 ค่าใช้จ่าย:</span>
                    <span className={`truncate max-w-[120px] font-bold ${isActive ? 'text-slate-200' : 'text-slate-600'}`} title={detailInfo}>{detailInfo}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">📅 กำหนดจ่าย:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isActive ? 'bg-white/10 text-white' : 'bg-slate-50 border border-slate-150 text-indigo-600'
                    }`}>{dueDay}</span>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="mt-4 w-full space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className={isActive ? 'text-slate-400' : 'text-slate-500'}>
                      {isCreditCard ? 'สถานะรอบบิลปัจจุบัน:' : 'ความก้าวหน้าค่างวด:'}
                    </span>
                    <span className={isActive ? 'text-indigo-400' : 'text-indigo-600'}>
                      {isCreditCard 
                        ? (paid > 0 ? 'ชำระแล้ว (100%)' : 'รอดำเนินการ (0%)')
                        : `${paid}/${total} งวด (${total > 0 ? Math.round((paid/total)*100) : 0}%)`
                      }
                    </span>
                  </div>
                  <div className={`w-full h-1 rounded-full overflow-hidden ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                      style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Active Category Details block */}
      {activeCategory ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="active-category-details">
          {/* Main List Table (Grid taking 2/3 space on desk) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header description card - ของใคร ค่าใช้จ่ายอะไร */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 text-white/[0.04] pointer-events-none">
                <FileSpreadsheet className="h-48 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 px-2.5 py-0.5 rounded-full tracking-wider">
                  กำลังใช้งานสัญญา
                </span>
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg font-extrabold flex items-center gap-1.5 text-white">
                  📁 {activeCategory.title}
                </h2>
                <p className="text-slate-300 text-xs font-semibold">
                  ประเภทบัญชี: {getCategorySubtitle(activeCategory.title)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs font-medium">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px]">👤 ของใคร</span>
                  <span className="text-white font-extrabold">{activeCategory.metadata?.ref1 || 'ไม่ระบุชื่อ'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px]">📝 รายละเอียดค่าใช้จ่าย</span>
                  <span className="text-white font-extrabold block truncate" title={activeCategory.metadata?.ref2}>{activeCategory.metadata?.ref2 || 'ไม่มีรายละเอียดสัญญา'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px]">📅 กำหนดดิวชำระเงิน</span>
                  <span className="text-indigo-300 font-extrabold">{activeCategory.metadata?.dueDateInfo || 'ไม่ระบุวัน'}</span>
                </div>
              </div>
            </div>

            <PaymentTable
              category={activeCategory}
              onSelectInstallment={onSelectInstallment}
              onClearPayment={onClearPayment}
              onAddInstallment={onAddInstallment}
              isProcessing={isProcessing}
              onViewDetail={setSelectedDetailInstallment}
            />
          </div>

          {/* Tab Metadata & Detailed Summary box (1/3 space) */}
          <div className="space-y-5">
            {/* Metadata Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <CalendarRange className="h-4.5 w-4.5 text-indigo-500" />
                <span>ข้อมูลหมวดหมู่: {activeCategory.title}</span>
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-semibold">
                {activeCategory.metadata?.dueDateInfo && (
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-slate-400">กำหนดชำระเงิน</span>
                    <span className="text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {activeCategory.metadata.dueDateInfo}
                    </span>
                  </div>
                )}
                {activeCategory.metadata?.ref1 && (
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-slate-400">รหัสอ้างอิง (Ref 1)</span>
                    <span className="text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {activeCategory.metadata.ref1}
                    </span>
                  </div>
                )}
                {activeCategory.metadata?.ref2 && (
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-slate-400">ผู้รับผิดชอบ (Ref 2)</span>
                    <span className="text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {activeCategory.metadata.ref2}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-slate-400">{isActiveCreditCard ? 'รอบบิลสะสมทั้งหมด' : 'จำนวนงวดทั้งหมด'}</span>
                  <span className="text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {activeCategory.installments.length} {isActiveCreditCard ? 'รอบบิล' : 'งวด'}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Category Financial Circle Progress */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider w-full text-left">
                {isActiveCreditCard ? 'สถานะรอบบิลปัจจุบัน' : `ความก้าวหน้า ${activeCategory.title}`}
              </h3>

              {/* Progress Ring */}
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#F1F5F9"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#4F46E5"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * activePercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-slate-800">
                    {activePercent.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{isActiveCreditCard ? 'ชำระ/เคลียร์' : 'จ่ายแล้ว'}</span>
                </div>
              </div>

              {/* Min stats lists */}
              <div className="w-full grid grid-cols-3 gap-1 border-t border-slate-100 pt-4 text-xs font-semibold">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">ยอดรวม</p>
                  <p className="text-slate-800 text-xs">
                    {activeExpected.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="border-x border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">จ่ายแล้ว</p>
                  <p className="text-emerald-600 text-xs">
                    {activePaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">คงเหลือ</p>
                  <p className="text-rose-500 text-xs">
                    {activeRemaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed rounded-3xl p-12 text-center text-slate-400">
          ไม่สามารถตรวจพบหมวดหมู่ค่างวดงวดใดๆ กรุณาเพิ่มหมวดหมู่ใหม่เพื่อเริ่มต้นบันทึกข้อมูล
        </div>
      )}

      {/* Add New Category Tab Form Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowAddCategory(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="text-base font-bold text-slate-800">ตั้งค่างานหมวดหมู่ค่างวดใหม่ลงชีท</h3>
              <button
                type="button"
                onClick={() => setShowAddCategory(false)}
                className="text-slate-450 hover:text-slate-700 font-semibold"
              >
                닫기
              </button>
            </div>

            {catError && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                {catError}
              </div>
            )}

            <form onSubmit={handleCreateCategorySubmit} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-600 block">ชื่อหมวดหมู่ชีท (ใหม่) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น งวดค่าบ้าน, ค่าประกันชีวิต"
                  value={catTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600">กำหนดชำระ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ทุกวันที่ 1"
                    value={catDueDay}
                    onChange={(e) => setCatDueDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">ชื่อผู้ชำระ</label>
                  <input
                    type="text"
                    placeholder="เช่น คุณประหยัด"
                    value={catOwner}
                    onChange={(e) => setCatOwner(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600">หมายเลขอ้างอิงสัญญา / โน้ต (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น เลขผู้จ่าย 12345"
                  value={catDetail}
                  onChange={(e) => setCatDetail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-600">ยอดต่องวด (บาท)</label>
                  <input
                    type="number"
                    required
                    value={catAmount}
                    onChange={(e) => setCatAmount(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">จำนวนงวด</label>
                  <input
                    type="number"
                    required
                    value={catMonths}
                    onChange={(e) => setCatMonths(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">เดือนเริ่มต้น <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="ก.ค.2569"
                    value={catStartMonth}
                    onChange={(e) => setCatStartMonth(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-3.5 py-2 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 text-white bg-indigo-600 hover:bg-slate-900 rounded-lg font-bold"
                >
                  {isProcessing ? 'กำลังเพิ่มหมวดหมู่...' : 'สร้างแผ่นข้อมูลใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Details Inspector overlay */}
      {activeCategory && (
        <InstallmentDetailModal
          isOpen={selectedDetailInstallment !== null}
          onClose={() => setSelectedDetailInstallment(null)}
          installment={selectedDetailInstallment}
          category={activeCategory}
          onClearPayment={onClearPayment}
          onTriggerPayment={onSelectInstallment}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
