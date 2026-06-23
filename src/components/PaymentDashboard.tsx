import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet, TrendingUp, CheckCircle2, AlertTriangle, Layers, Plus, LogOut,
  ExternalLink, RefreshCw, CalendarRange, Trash2, ListFilter, Play, CircleDollarSign,
  Home, Car, Shield, Lightbulb, HeartPulse, CreditCard, User, ClipboardList, Info, Eye,
  Sparkles, Coins, LayoutDashboard, GanttChartSquare, ArrowRight, CheckCircle,
  HelpCircle, ChevronRight, HelpCircle as HelpIcon, Landmark
} from 'lucide-react';
import { SpreadsheetData, SheetCategory, InstallmentRow } from '../types';
import PaymentTable from './PaymentTable';
import InstallmentDetailModal from './InstallmentDetailModal';

const getCategoryIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('บ้าน') || t.includes('คอนโด') || t.includes('ห้อง') || t.includes('ที่พัก') || t.includes('home') || t.includes('house') || t.includes('room')) {
    return <Home className="h-4.5 w-4.5" />;
  }
  if (t.includes('รถ') || t.includes('มอเตอร์ไซค์') || t.includes('car') || t.includes('motorcycle') || t.includes('van')) {
    return <Car className="h-4.5 w-4.5" />;
  }
  if (t.includes('ประกัน') || t.includes('ชีวิต') || t.includes('insurance') || t.includes('shield')) {
    return <Shield className="h-4.5 w-4.5" />;
  }
  if (t.includes('น้ำ') || t.includes('ไฟ') || t.includes('เน็ต') || t.includes('wifi') || t.includes('บิล') || t.includes('light') || t.includes('bill')) {
    return <Lightbulb className="h-4.5 w-4.5" />;
  }
  if (t.includes('สุขภาพ') || t.includes('รักษา') || t.includes('ยา') || t.includes('health') || t.includes('medical') || t.includes('care')) {
    return <HeartPulse className="h-4.5 w-4.5" />;
  }
  return <CreditCard className="h-4.5 w-4.5" />;
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

  // Split Navigation: 'overview' (📊 สรุปพอร์ตรวม) or 'installments' (💳 ดึงตารางจ่ายรายชีท)
  const [activeTab, setActiveTab] = useState<'overview' | 'installments'>('overview');

  // Interactive Mascot Chat State: click to wiggle & get random financial quote
  const [mascotQuoteIndex, setMascotQuoteIndex] = useState(0);

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
  const overdueAlertsList: { categoryTitle: string; item: InstallmentRow; catIdx: number }[] = [];
  data.categories.forEach((cat, catIdx) => {
    cat.installments.forEach((inst) => {
      if (inst.status === 'OVERDUE') {
        overdueAlertsList.push({ categoryTitle: cat.title, item: inst, catIdx });
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
      // Navigate to installments showing new category
      setActiveTab('installments');
    } catch (err: any) {
      setCatError(err.message || 'ไม่สามารถสร้างหมวดหมู่ใหม่ได้');
    }
  };

  // Nong Mangmee Thai quotes list
  const mangmeeQuotes = [
    "ตารางบันทึกใน Google Sheets เชื่อมต่อเรียบร้อย สดใหม่ ปลอดภัย พร้อมทำงานเป๊ะเว่อร์ฮะ! 🤖✨",
    "จ่ายตรงเวลาดีที่สุด! เพื่อรักษาวินัยทางการเงินและไม่มีดอกเบี้ยแฝง สู้ๆครับเจ้านาย! 🐯💰",
    "ประหยัดวันนี้ เพื่อเป็นเศรษฐีวันหน้า ออมค่างวดส่วนเกินไปทำกำไรต่อนะครับน้าเจ้านาย 🥳📈",
    "หน้านี้แยกพอร์ตชัดเจน มีระเบียบ ตรวจสอบง่าย ดูสถิติครบ จบที่รูปสติ๊กเกอร์สลิปงามๆ ได้ฮะ! 🎨🏖️",
    "รู้หมือไร่? การสลับใช้บัตรสะสมแต้มจ่ายค่าสาธารณูปโภคช่วยประหยัดเงินคืนได้ 1-2% ด้วยนะฮะ! 💳💡",
    "เหนื่อยไหมฮะ? มายืดเส้นยืดสาย พักดริ้งค์น้ำเย็นๆ แป๊บนึง แล้วค่อยเช็กยอดค่างวดต่อกันเถอะเจ้านาย ✨🥤"
  ];

  const handleMascotClick = () => {
    setMascotQuoteIndex((prev) => (prev + 1) % mangmeeQuotes.length);
  };

  const jumpToCategory = (idx: number) => {
    onSelectCategory(idx);
    setActiveTab('installments');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="dashboard-wrapper">
      {/* Dynamic Keyframe Injection for Cute Mascot Sparkles and Floating Effects */}
      <style>{`
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
        }
        @keyframes sway-tail {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(6deg) scale(0.98); }
        }
        @keyframes cute-shake {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.05) rotate(-3deg); }
          75% { transform: scale(1.05) rotate(3deg); }
        }
        .animate-float-gentle {
          animation: float-gentle 4s ease-in-out infinite;
        }
        .animate-sway-tail {
          animation: sway-tail 3s ease-in-out infinite;
        }
        .animate-cute-shake:hover {
          animation: cute-shake 0.5s ease-in-out infinite;
        }
      `}</style>

      {/* Top Banner & Profile Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600 shadow-2xs hover:bg-indigo-100/80 transition-colors">
            <Landmark className="h-7 w-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2" id="dashboard-main-title">
              {data.title}
              <span className="text-xs font-bold uppercase bg-gradient-to-r from-emerald-500 to-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs animate-bounce" style={{ animationDuration: '3s' }}>
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <span>ฐานข้อมูลคลังค่างวด</span>
              <a
                href={`https://docs.google.com/spreadsheets/d/${data.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-0.5 font-bold bg-indigo-50/70 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition"
              >
                ดูพอร์ตรวมบน Google Sheet <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation bar */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-between sm:justify-start">
          {/* User Profile Info */}
          <div className="flex items-center gap-3 bg-slate-50 pl-3.5 pr-2 py-1.5 rounded-full border border-slate-200 shadow-2xs">
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
            <span className="text-[11px] font-bold text-slate-705 max-w-[120px] truncate">
              {userName || 'ผู้ใช้งานระบบ'}
            </span>
            <button
              onClick={onLogout}
              className="rounded-full hover:bg-slate-200 p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="ออกจากระบบทันที"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modern High-End Views Tab Navigator (แยกหน้าสรุปชัดเจน) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-150">
        <div className="flex gap-1 flex-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all relative ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>📊 ภาพรวมสถิติ & สัดส่วนค่างวด</span>
            {activeTab === 'overview' && (
              <motion.span
                layoutId="activeTabGlow"
                className="absolute inset-x-0 -bottom-1.5 h-1 bg-indigo-500 rounded-full"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('installments')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all relative ${
              activeTab === 'installments'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>💳 ตารางบันทึกงวดจ่าย ({activeCategory?.title || 'ไม่มีบัญชี'})</span>
            {activeTab === 'installments' && (
              <motion.span
                layoutId="activeTabGlow"
                className="absolute inset-x-0 -bottom-1.5 h-1 bg-indigo-500 rounded-full"
              />
            )}
          </button>
        </div>

        {/* Quick Category Tab Creator Drawer button & Sync */}
        <div className="flex justify-end gap-1.5 px-1 sm:px-0">
          <button
            onClick={onRefresh}
            disabled={isProcessing}
            className="px-3.5 py-2 text-xs font-bold text-slate-750 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="ดึงข้อมูลล่าสุดพอร์ตจาก Google Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>ซิงก์ดึงความคืบหน้า</span>
          </button>
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>ตั้งหมวดหมู่ใหม่</span>
          </button>
        </div>
      </div>

      {/* Main Container switched by view tabs */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          /* ========================================================================= */
          /* TAB 1: OVERVIEW & ANALYTICS MODE (แยกหน้าสรุปประณีต สวยงาม สะอาดตา) */
          /* ========================================================================= */
          <motion.div
            key="overview-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Mascot "Nong Mangmee (น้องมั่งมี)" Friendly Thai Helper Bubble widget */}
            <div
              onClick={handleMascotClick}
              className="bg-gradient-to-r from-teal-50/50 via-indigo-50/40 to-slate-50/50 border border-slate-150 p-5 rounded-[2rem] shadow-2xs hover:shadow-sm cursor-pointer transition-all duration-300 relative group overflow-hidden"
              id="mangmee-mascot-widget"
            >
              {/* Cute glowing circle animations on background */}
              <div className="absolute top-0 right-10 h-32 w-32 rounded-full bg-teal-100/30 blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-indigo-150/30 blur-xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center gap-4.5 relative z-10">
                {/* Active vector elements for Mascot representation */}
                <div className="relative shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md animate-float-gentle select-none cursor-pointer">
                  {/* Little custom styled cat details in code */}
                  <span className="text-3xl">🐱</span>
                  {/* Cat tail waving */}
                  <div className="absolute -bottom-1.5 -right-1 text-xs animate-sway-tail origin-bottom-left">🐈</div>
                  {/* Glowing halo */}
                  <div className="absolute inset-0 rounded-full border border-white/60 animate-ping opacity-25" style={{ animationDuration: '2s' }} />
                  <span className="absolute -top-1 -right-1 text-red-500 text-xs animate-bounce font-extrabold select-none">✨</span>
                </div>

                <div className="space-y-1 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1 hover:text-indigo-600 transition">
                      💬 น้องมั่งมี (Nong Mangmee) มนต์เสน่ห์ผู้ช่วยค่างวดคอยให้คำแนะนำ 
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full inline-block animate-pulse">
                        แตะเรียกคุยได้นะฮะ!
                      </span>
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed bg-white/70 backdrop-blur-xs px-4 py-2.5 rounded-2xl inline-block border border-indigo-100/40 shadow-2xs">
                    {mangmeeQuotes[mascotQuoteIndex]}
                  </p>
                  <p className="text-[10px] text-slate-400/90 font-medium block italic sm:pl-1 pt-1">
                     *เคล็ดลับ: บันทึกข้อมูลค่างวดลงไป บัญชีกระเป๋าจะประเมินผลกำไรสุทธิ และเช็กเปอร์เซ็นต์จ่ายสะสมให้ออโต้
                  </p>
                </div>
              </div>
            </div>

            {/* Overdue Alert Bar Panel */}
            {overdueAlertsList.length > 0 && (
              <div
                className="rounded-2xl border-2 border-rose-100 bg-rose-50/50 p-4.5 text-rose-800 shadow-2xs flex items-start gap-3.5 hover:bg-rose-50/75 transition-all"
                id="overdue-alerts-block"
              >
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0 mt-0.5 animate-bounce" style={{ animationDuration: '2s' }}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-xs sm:text-sm font-black tracking-tight text-rose-800">✨ ตรวจพบรายการค้างชำระค่างวดทั้งหมด! ({overdueAlertsList.length} รายการในชีท)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold">
                    {overdueAlertsList.map((alert, idx) => (
                      <div
                        key={idx}
                        onClick={() => jumpToCategory(alert.catIdx)}
                        className="p-2.5 rounded-xl bg-white border border-rose-100 hover:border-indigo-400/50 hover:bg-slate-50 transition cursor-pointer flex justify-between items-center group"
                      >
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 truncate">📁 {alert.categoryTitle}</p>
                          <p className="text-[10px] text-rose-600">งวดที่ {alert.item.index} (เดือน {alert.item.month})</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-rose-500 font-extrabold text-xs">{alert.item.dueAmount.toLocaleString()} ฿</p>
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md font-bold inline-flex items-center gap-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <span>จ่ายเล้ย</span>
                            <ChevronRight className="h-2 w-2" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Global KPI Stats Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-widget-container">
              {/* Progress Weight */}
              <div className="bg-white border border-slate-150 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between hover:shadow-xs hover:border-indigo-200 transition-all duration-200 group">
                <div className="space-y-2 flex-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">ภาพรวมชำระสะสม</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
                      {globalProgress.toFixed(1)}%
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 border border-indigo-100 rounded-md font-bold">
                       สัดส่วนรวม
                    </span>
                  </div>
                  {/* Progress bar with cute active wiggle background */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-teal-400 via-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${globalProgress}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-indigo-50/70 p-3 text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0 ml-2">
                  <TrendingUp className="h-5 w-5 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              {/* Total expected */}
              <div className="bg-white border border-slate-150 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between hover:shadow-xs hover:border-indigo-200 transition-all duration-200 group">
                <div className="space-y-1.5 flex-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">ค่างวดรวมตามระเบียบ</span>
                  <div className="text-2xl font-extrabold text-slate-800 tracking-tight">
                    {globalTotalExpected.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400">บาท</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                     รวบรวมจากทั้งหมด <b>{categoriesCount}</b> สัญญาหลัก
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-slate-500 group-hover:bg-slate-100/80 transition-colors shrink-0 ml-2">
                  <Layers className="h-5 w-5" />
                </div>
              </div>

              {/* Outstanding Paid */}
              <div className="bg-white border border-slate-150 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between hover:shadow-xs hover:border-indigo-200 transition-all duration-200 group">
                <div className="space-y-1.5 flex-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">ชำระสำเร็จเสร็จสิ้น</span>
                  <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                    {globalTotalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-emerald-400/90 text-[10px]">บ.</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600/90 flex items-center gap-0.5">
                    <CheckCircle className="h-3 w-3 shrink-0" />
                    <span>เคลียร์สำเร็จไปแล้ว {(globalTotalExpected > 0 ? (globalTotalPaid / globalTotalExpected) * 100 : 0).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 group-hover:bg-emerald-100/80 transition-colors shrink-0 ml-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              {/* Debt outstanding */}
              <div className="bg-white border border-slate-150 rounded-2xl p-4.5 shadow-2xs flex items-center justify-between hover:shadow-xs hover:border-indigo-200 transition-all duration-100 group">
                <div className="space-y-1.5 flex-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">ยอดคงเหลือค้างจ่าย</span>
                  <div className="text-2xl font-extrabold text-rose-500 tracking-tight">
                    {globalTotalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-rose-400">บ.</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-bold block">
                     รอการดึงงบชำระในรอบดิวเดือนนี้
                  </span>
                </div>
                <div className={`rounded-xl p-3 shrink-0 ml-2 group-hover:scale-105 transition-transform ${globalTotalRemaining > 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                  <CircleDollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Catalog of Contracts Bento Section (แยกหมวดหมู่อย่างพรีเมียม สวยเป๊ะเป็นระเบียบ) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <ListFilter className="h-4.5 w-4.5 text-indigo-500" />
                    <span>แฟ้มสะสมหมวดหมู่ค่างวดที่มีในพอร์ต ({categoriesCount} รายการ)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">คลิกที่แฟ้มหมวดหมู่เพื่อไปดูตารางเช็กงวด/จ่ายสลิปได้แบบโฟกัสทีละจุดด่วน</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="category-bento-catalog">
                {data.categories.map((cat, idx) => {
                  const isActive = idx === activeCategoryIndex;
                  const hasOverdue = cat.installments.some((x) => x.status === 'OVERDUE');
                  const owner = cat.metadata?.ref1 || 'ไม่ระบุชื่อ';
                  const description = cat.metadata?.ref2 || 'ไม่มีรายละเอียดสัญญา 추가';
                  const dueDay = cat.metadata?.dueDateInfo || 'ไม่ระบุวันดิว';
                  
                  const total = cat.installments.length;
                  const paid = cat.installments.filter(x => x.status === 'PAID').length;
                  const isCredit = cat.title.toLowerCase().includes('บัตร') || 
                                   cat.title.toLowerCase().includes('เครดิต') || 
                                   cat.title.toLowerCase().includes('credit');
                  
                  const percent = total > 0 ? (paid / total) * 100 : 0;

                  return (
                    <motion.div
                      key={cat.title}
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => jumpToCategory(idx)}
                      className={`flex flex-col text-left p-5 rounded-3xl border transition-all relative overflow-hidden cursor-pointer shadow-2xs group ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                          : 'bg-white border-slate-150 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Overdue alert element */}
                      {hasOverdue && (
                        <div className="absolute top-4 right-4 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                        </div>
                      )}

                      {/* Header block with Icon */}
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-2xl text-xs shrink-0 transition-colors ${
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-indigo-600 border border-slate-200/60 group-hover:bg-indigo-50'
                        }`}>
                          {getCategoryIcon(cat.title)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm font-extrabold truncate block leading-tight ${isActive ? 'text-white' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                            {cat.title}
                          </h4>
                          <span className={`text-[10px] block font-bold ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                            {getCategorySubtitle(cat.title)}
                          </span>
                        </div>
                      </div>

                      {/* Metadata Details */}
                      <div className="mt-4.5 space-y-2 border-t border-dashed border-slate-100/10 pt-4.5 text-[11px] font-semibold">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">👤 ผู้ชำระหนี้:</span>
                          <span className={`font-extrabold truncate max-w-[120px] ${isActive ? 'text-indigo-300' : 'text-slate-705'}`}>{owner}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">📝 สัญญาอ้างอิง:</span>
                          <span className={`font-bold truncate max-w-[120px] ${isActive ? 'text-slate-200' : 'text-slate-600'}`} title={description}>{description}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">📅 กำหนดจ่ายออโต้:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-indigo-600 border border-slate-200'
                          }`}>{dueDay}</span>
                        </div>
                      </div>

                      {/* Progress Area */}
                      <div className="mt-5 space-y-1.5 w-full">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className={isActive ? 'text-slate-400' : 'text-slate-500'}>
                            {isCredit ? 'จ่ายรูดไปแล้ว:' : 'เคลียร์ค่างวดสะสม:'}
                          </span>
                          <span className={`font-extrabold ${isActive ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            {paid}/{total} {isCredit ? 'รอบบิล' : 'งวด'} ({Math.round(percent)}%)
                          </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Launch direct focus button */}
                      <div className="mt-4 pt-3 border-t border-slate-100/10 flex justify-end">
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform ${
                          isActive ? 'text-indigo-300' : 'text-indigo-600'
                        }`}>
                          <span>เข้าดูตารางเช็กงวด</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* TAB 2: DETAILED INSTALLMENTS TRACKER (หน้าตารางบันทึกงวดจ่าย ตกแต่งสบายตา คัดสรรดุ๊กดิ๊ก) */
          /* ========================================================================= */
          <motion.div
            key="installments-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Quick Sliding Card selector for active Tab */}
            <div className="bg-white border border-slate-150 p-3.5 rounded-2xl shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">สลับดูบัญชีค่าใช้จ่ายอื่นด่วน:</span>
              <div className="flex flex-wrap gap-1.5" id="mini-tabs-list">
                {data.categories.map((cat, idx) => {
                  const isActive = idx === activeCategoryIndex;
                  return (
                    <button
                      key={cat.title}
                      onClick={() => onSelectCategory(idx)}
                      className={`text-xs px-4 py-2 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <span className="text-xs shrink-0">{getCategoryIcon(cat.title)}</span>
                      <span>{cat.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeCategory ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="active-category-details">
                {/* Left block: Header Card + Table list (2/3 space) */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Premium Banner */}
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2rem] p-6 shadow-sm space-y-3 relative overflow-hidden" id="category-banner-block">
                    {/* Visual custom glow circles */}
                    <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/4 bottom-0 h-32 w-32 rounded-full bg-teal-500/5 blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 px-2.5 py-0.5 rounded-full tracking-wider">
                         กำลังแสดงประวัติตามชีทแผ่นงาน
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 text-white">
                        📁 {activeCategory.title}
                      </h2>
                      <p className="text-slate-400 text-xs font-semibold">
                        {getCategorySubtitle(activeCategory.title)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs font-medium">
                      <div className="space-y-0.5">
                        <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">👤 ผู้ชำระ / เจ้าของหนี้</span>
                        <span className="text-white font-extrabold">{activeCategory.metadata?.ref1 || 'ไม่ระบุชื่อ'}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">📝 รายละเอียดบัญชีค่าใช้จ่าย</span>
                        <span className="text-white font-extrabold block truncate" title={activeCategory.metadata?.ref2}>
                          {activeCategory.metadata?.ref2 || 'ไม่มีรายละเอียดเพิ่มเติม'}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">📅 กำหนดดิวหลัก</span>
                        <span className="text-indigo-300 font-extrabold">{activeCategory.metadata?.dueDateInfo || 'ไม่ระบุวันดิว'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Polished Table Component */}
                  <PaymentTable
                    category={activeCategory}
                    onSelectInstallment={onSelectInstallment}
                    onClearPayment={onClearPayment}
                    onAddInstallment={onAddInstallment}
                    isProcessing={isProcessing}
                    onViewDetail={setSelectedDetailInstallment}
                  />
                </div>

                {/* Right block: Account Specific Stats Sidebar (1/3 space) */}
                <div className="space-y-5">
                  {/* Detailed Contract Info Widget */}
                  <div className="bg-white border border-slate-150 rounded-[2rem] p-5 shadow-2xs space-y-4">
                    <h3 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                      <CalendarRange className="h-4.5 w-4.5 text-indigo-500" />
                      <span>ข้อมูลหมวดหมู่: {activeCategory.title}</span>
                    </h3>

                    <div className="space-y-2 text-xs text-slate-650 leading-relaxed font-semibold">
                      {activeCategory.metadata?.dueDateInfo && (
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-400">กำหนดชำระเงิน</span>
                          <span className="text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-black">
                            {activeCategory.metadata.dueDateInfo}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400">ผู้รับผิดชอบพอร์ต</span>
                        <span className="text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-black">
                          {activeCategory.metadata?.ref1 || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400">รหัสรายละเอียดสัญญา</span>
                        <span className="text-slate-850 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-black truncate max-w-[140px]" title={activeCategory.metadata?.ref2}>
                          {activeCategory.metadata?.ref2 || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400">{isActiveCreditCard ? 'รอบบิลทั้งหมด' : 'จำนวนงวดทั้งหมด'}</span>
                        <span className="text-slate-800 bg-white px-3 py-0.5 rounded-md border border-slate-200 font-black">
                          {activeCategory.installments.length} {isActiveCreditCard ? 'รอบบิล' : 'งวด'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active Category Circular Progress */}
                  <div className="bg-white border border-slate-150 rounded-[2rem] p-6 shadow-2xs flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden group">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-full text-left">
                      {isActiveCreditCard ? 'ความคืบหน้าบิลสะสม' : `ความคืบหน้าจ่ายผ่อนชำระ`}
                    </h3>

                    {/* Progress Ring with bouncing micro-animations */}
                    <div className="relative h-32 w-32 flex items-center justify-center select-none">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#F1F5F9"
                          strokeWidth="8.5"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#4F46E5"
                          strokeWidth="8.5"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * activePercent) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out text-indigo-600"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-slate-800 tracking-tight">
                          {activePercent.toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded-md mt-0.5">
                          {isActiveCreditCard ? 'จ่ายเคลียร์' : 'ครบถ้วน'}
                        </span>
                      </div>
                    </div>

                    {/* Financial details row */}
                    <div className="w-full grid grid-cols-3 gap-1 border-t border-slate-100 pt-4.5 text-xs font-semibold">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">ยอดเต็มน่ะ</p>
                        <p className="text-slate-850 font-extrabold text-xs">
                          {activeExpected.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="border-x border-slate-100">
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-0.5">จ่ายแล้วนะ</p>
                        <p className="text-emerald-600 font-extrabold text-xs">
                          {activePaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">ยังเหลือดิว</p>
                        <p className="text-rose-500 font-extrabold text-xs">
                          {activeRemaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed rounded-3xl p-12 text-center text-slate-400">
                ไม่พบข้อมูลหมวดหมู่ค่างวดใดๆ กรุณาเพิ่มหมวดหมู่ใหม่เพื่อบันทึกประวัติล่วงหน้า
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Category Tab Form Modal Drawer */}
      <AnimatePresence>
        {showAddCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCategory(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-slate-150 bg-white shadow-2xl p-6.5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🛠️</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-800">สร้างหมวดหมู่ค่างวดชุดใหม่ลง Google Sheet</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="text-slate-400 hover:text-slate-650 font-bold text-xs bg-slate-50 hover:bg-slate-100 p-1 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {catError && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs text-red-600 font-semibold animate-pulse">
                  ⚠️ {catError}
                </div>
              )}

              <form onSubmit={handleCreateCategorySubmit} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-550 block">ชื่อหมวดหมู่ชีท (แท็บใหม่ในชีท) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ค่าผ่อนคอนโด, ค่ารถยนต์ฮอนด้า, ค่าไฟ"
                    value={catTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-35">
                  <div className="space-y-1">
                    <label className="text-slate-550">กำหนดจ่ายหลัก</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ทุกวันที่ 1, บิลทุกวันที่ 15"
                      value={catDueDay}
                      onChange={(e) => setCatDueDay(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-550">ชื่อผู้ชำระหลัก (Ref 1)</label>
                    <input
                      type="text"
                      placeholder="เช่น คุณประหยัด, ตัวเอง"
                      value={catOwner}
                      onChange={(e) => setCatOwner(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-550">รายละเอียดสัญญา / หมายเหตุ (Ref 2)</label>
                  <input
                    type="text"
                    placeholder="เช่น เลขสัญญาผ่อน 21-a, โน้ตธนาคาร"
                    value={catDetail}
                    onChange={(e) => setCatDetail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                  <div className="space-y-1">
                    <label className="text-slate-500 block text-[10px]">ยอด/งวด (บาท)</label>
                    <input
                      type="number"
                      required
                      value={catAmount}
                      onChange={(e) => setCatAmount(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-hidden text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 block text-[10px]">จำนวนงวด</label>
                    <input
                      type="number"
                      required
                      value={catMonths}
                      onChange={(e) => setCatMonths(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-hidden text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-550 block text-[10px]">เดือนเริ่มต้น *</label>
                    <input
                      type="text"
                      required
                      placeholder="ก.ค.2569"
                      value={catStartMonth}
                      onChange={(e) => setCatStartMonth(e.target.value)}
                      className="w-full px-2 py-2.5 rounded-lg bg-white border border-slate-200 text-[10px] focus:outline-hidden text-center font-bold"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(false)}
                    className="px-4.5 py-2.5 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    ยกเลิกกูเกิ้ลชีท
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2.5 text-white bg-indigo-600 hover:bg-slate-900 rounded-xl font-bold cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <span>{isProcessing ? 'กำลังเพิ่มบอร์ด...' : 'บันทึกลง Google Sheet'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Details Modal overlay info */}
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
