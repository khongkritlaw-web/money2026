import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet, Sparkles, ShieldCheck, HelpCircle,
  TrendingDown, FileClock, Check, RefreshCw, AlertCircle, Settings2, Database, KeySquare, LogIn,
  Lock, Delete
} from 'lucide-react';
import { SpreadsheetData, InstallmentRow } from './types';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebase';
import { fetchSpreadsheetData, savePayment, clearPayment, appendInstallmentRow, createNewCategoryTab } from './lib/sheets';
import { getOrCreateFolder, uploadReceiptFile } from './lib/drive';
import PaymentDashboard from './components/PaymentDashboard';
import ReceiptUploadModal from './components/ReceiptUploadModal';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isAuthExpired, setIsAuthExpired] = useState<boolean>(false);

  // Core Data State
  const [spreadsheetId, setSpreadsheetId] = useState<string>('1NN7hkA28PLynkE6jYWOi9mdBThaLT4aFupAOT1dTq-o');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tempSpreadsheetId, setTempSpreadsheetId] = useState<string>('1NN7hkA28PLynkE6jYWOi9mdBThaLT4aFupAOT1dTq-o');
  
  const [sheetData, setSheetData] = useState<SpreadsheetData | null>(null);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState<number>(0);
  
  // Progress/Action states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeInstallment, setActiveInstallment] = useState<InstallmentRow | null>(null);

  // In-app Notification Engine
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setIsAuthChecking(false);
      },
      () => {
        setNeedsAuth(true);
        setIsAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch spreadsheet data whenever user gets authenticated or spreadsheet ID changes
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, spreadsheetId]);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const parsedData = await fetchSpreadsheetData(token, spreadsheetId);
      // Ensure we don't crash if the active category index is out of bounds
      if (activeCategoryIdx >= parsedData.categories.length) {
        setActiveCategoryIdx(0);
      }
      setSheetData(parsedData);
      setIsAuthExpired(false);
      showToast('เชื่อมต่อข้อมูล Google Sheets ล่าสุดสำเร็จ', 'success');
    } catch (err: any) {
      console.error(err);
      const errMsg = String(err.message || '').toLowerCase();
      const isAuthErr = errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('expired') || errMsg.includes('credential') || err.status === 401;
      
      if (isAuthErr) {
        setIsAuthExpired(true);
        setNeedsAuth(true);
        showToast('สิทธิ์การเชื่อมโยง Google API สิ้นสุดอายุการเชื่อมต่อชั่วคราว', 'error');
      } else {
        showToast(`ไม่พบชีทหรือเชื่อมต่อล้มเหลวจริง: ${err.message || 'กรุณาตรวจสอบสิทธิ์เข้าถึง'}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        setIsAuthExpired(false);
        showToast(`ยินดีต้อนรับคุณ ${result.user.displayName}`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('การเข้าสู่ระบบผ่าน Google ล้มเหลว กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบ ใช่หรือไม่?')) {
      await logout();
      setUser(null);
      setToken(null);
      setSheetData(null);
      setNeedsAuth(true);
      showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    }
  };

  const handleSaveSpreadsheetId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSpreadsheetId.trim()) return;
    setSpreadsheetId(tempSpreadsheetId.trim());
    setShowSettings(false);
    showToast('อัปเดต ID แผ่นงาน Google Sheets แล้ว กำลังดึงข้อมูลคู่ขนาน...', 'info');
  };

  // Payment Recording workflow
  const handleSavePaymentData = async (paidAmount: number, notes: string, file: File | null) => {
    if (!token || !sheetData || !activeInstallment) return;
    
    const activeCategory = sheetData.categories[activeCategoryIdx];
    if (!activeCategory) return;

    setIsProcessing(true);
    try {
      let receiptUrl = activeInstallment.receiptUrl || '';

      // 1. Check if a file upload is supplied
      if (file) {
        showToast('กำลังตรวจหาโฟลเดอร์รูปภาพใบเสร็จบน Google Drive...', 'info');
        // Find or create folder in Drive
        const folderId = await getOrCreateFolder(token, 'Monthly_Expense_Receipts');
        
        showToast('กำลังอัปโหลดรูปภาพใบเสร็จขึ้นระบบ Google Drive ของคุณ...', 'info');
        // Upload file
        const uploadResult = await uploadReceiptFile(token, file, folderId);
        receiptUrl = uploadResult.viewLink;
        showToast('อัปโหลดไฟล์หลักฐานใบเสร็จเสร็จสมบูรณ์', 'success');
      }

      // 2. Write details down into Google Sheet
      showToast('กำลังเข้ารหัสและบันทึกรายการลงบน Google Sheets ของคุณ...', 'info');
      await savePayment(
        token,
        spreadsheetId,
        activeCategory.title,
        activeInstallment,
        paidAmount,
        receiptUrl,
        notes,
        activeCategory.metadata
      );

      showToast(`บันทึกชำระเงินงวดที่ ${activeInstallment.index} เรียบร้อยแล้ว`, 'success');
      
      // Reload updated sheet records
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(`บันทึกชำระเงินไม่สำเร็จ: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsProcessing(false);
      setActiveInstallment(null);
    }
  };

  // Clear Payment values
  const handleClearPaymentData = async (installment: InstallmentRow) => {
    if (!token || !sheetData) return;
    const activeCategory = sheetData.categories[activeCategoryIdx];
    if (!activeCategory) return;

    setIsProcessing(true);
    try {
      showToast('กำลังยกเลิกการชำระเงินและล้างข้อมูลบน Google Sheets...', 'info');
      await clearPayment(
        token,
        spreadsheetId,
        activeCategory.title,
        installment.rowIndex,
        installment.dueAmount,
        activeCategory.metadata
      );
      showToast(`ยกเลิกประวัติการชำระเงินของ งวดที่ ${installment.index} แล้ว`, 'success');
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(`ไม่สามารถดำเนินการได้: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Expand installment table row
  const handleAddInstallmentRow = async (installmentNum: string, monthStr: string, dueAmount: number) => {
    if (!token || !sheetData) return;
    const activeCategory = sheetData.categories[activeCategoryIdx];
    if (!activeCategory) return;

    setIsProcessing(true);
    try {
      // Find row index where "รวม" line is positioned to insert BEFORE it
      // Let's look up our list length to guess row coordinates
      let targetRowIndex = activeCategory.installments.length + 3; // default offset is head + 1
      if (activeCategory.installments.length > 0) {
        // Last row index is
        const lastRow = activeCategory.installments[activeCategory.installments.length - 1];
        targetRowIndex = lastRow.rowIndex + 1; // Insert just below the last item
      }

      showToast(`กำลังแทรกงวดค่างวดที่ ${installmentNum} และจัดระเบียบตารางรวมสูตรในชีท...`, 'info');
      await appendInstallmentRow(
        token,
        spreadsheetId,
        activeCategory.title,
        targetRowIndex,
        installmentNum,
        monthStr,
        dueAmount,
        activeCategory.metadata
      );

      showToast(`เพิ่มขยายงวดใหม่ (${monthStr}) ลงช่องใน Google Sheet สำเร็จ`, 'success');
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(`ขยายตารางไม่สำเร็จ: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create a whole new Category Sheet Tab
  const handleCreateCategory = async (
    title: string,
    dueDay: string,
    owner: string,
    detail: string,
    amount: number,
    months: number,
    startMonth: string
  ) => {
    if (!token) return;
    setIsProcessing(true);
    try {
      showToast(`กำลังสร้างแผ่นข้อมูลและสูตรคำนวณชีทใหม่ในชื่อ "${title}"...`, 'info');
      await createNewCategoryTab(
        token,
        spreadsheetId,
        title,
        dueDay,
        owner,
        detail,
        amount,
        months,
        startMonth
      );
      showToast(`สร้างหมวดหมู่ใหม่ "${title}" เรียบร้อยแล้ว`, 'success');
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(`สร้างหมวดหมู่ไม่สำเร็จ: ${err.message}`, 'error');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-50 selection:text-indigo-900" id="app-root">
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-55 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold max-w-sm sm:max-w-md ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-800'
                : 'bg-indigo-50 border-indigo-100 text-indigo-800'
            }`}
            id="global-toast-container"
          >
            {toast.type === 'success' ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-3 w-3" />
              </span>
            ) : toast.type === 'error' ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
              </span>
            )}
            <span className="flex-1 text-left line-clamp-2">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Layout */}
      {isAuthChecking ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-500">กำลังตรวจสอบสิทธิ์ความปลอดภัย...</p>
          </div>
        </div>
      ) : needsAuth ? (
        /* GOOGLE SIGN IN SCREEN (取代了繁瑣的 PIN ล็อคอิน) */
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]" id="g-login-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-slate-150 rounded-[2.5rem] shadow-xl p-8 sm:p-10 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-12 -mt-12 h-36 w-36 rounded-full bg-indigo-50/60 blur-xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-36 w-36 rounded-full bg-emerald-50/40 blur-xl pointer-events-none" />

            <div className="relative space-y-6">
              <div className="inline-flex rounded-2xl bg-indigo-50 p-4 text-indigo-600 shadow-2xs">
                <LogIn className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-800">
                  ระบบบันทึกค่างวดผ่อนชำระ
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  เชื่อมโยงสถิติและงบรายจ่ายลงบนไฟล์ Google Spreadsheet ของตนเองโดยตรงอย่างปลอดภัย
                </p>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>กำลังลงชื่อเข้าใช้งาน...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4.5 w-4.5" />
                    <span>เชื่อมสิทธิ์ใช้งานด้วย Google Account</span>
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold block">
                🛡️ ความเป็นส่วนตัวสูง เชื่อมเข้ารหัส Google Sheets & Drive ส่วนตัวโดยตรง
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Authenticated Application Dashboard */
        <div className="flex flex-col min-h-screen">
          {/* Main Top Header Navigation */}
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  B
                </div>
                <span className="text-sm font-bold text-slate-800 tracking-tight">Monthly Expense Tracker</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition"
                  title="ข้อมูลการเชื่อมต่องาน Google"
                  id="settings-trigger-btn"
                >
                  <Settings2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </header>

          {/* Quick Settings Section overlay banner */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-white border-b border-slate-150 overflow-hidden"
                id="settings-accordion-panel"
              >
                <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
                  <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                    <h3 className="font-bold text-slate-800 flex items-center gap-1">
                      <Database className="h-4 w-4 text-indigo-500" />
                      ค่าพารามิเตอร์ของแผ่นงาน Google Sheets
                    </h3>
                    <p className="text-slate-400 text-[10px]">
                      หากต้องการเปลี่ยนไปจดบันทึกบน Spreadsheet ไฟล์ส่วนตัวอื่นๆ ให้ใส่ ID ของชีทนั้นๆ ด้านล่าง:
                    </p>
                  </div>

                  <form onSubmit={handleSaveSpreadsheetId} className="flex gap-2.5">
                    <input
                      type="text"
                      placeholder="ป้อน Spreadsheet ID..."
                      value={tempSpreadsheetId}
                      onChange={(e) => setTempSpreadsheetId(e.target.value)}
                      className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono select-all focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
                    >
                      เชื่อมชีทใหม่
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-400 italic">
                    *ID ปัจจุบัน: <span className="font-mono bg-slate-50 p-1 rounded select-all">{spreadsheetId}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main App content body */}
          <main className="flex-1 px-4 sm:px-6 py-6" id="primary-main-body">
            {isLoading ? (
              /* Loading Screen state overlay */
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
                <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
                <div className="space-y-1.5 text-center">
                  <p className="text-sm font-semibold text-slate-800 animate-pulse">กำลังอ่านข้อมูลและจัดโครงสร้างสูตรคำนวณชีท...</p>
                  <p className="text-[11px] text-slate-400">การเข้าถึงความปลอดภัยใช้สิทธิ์กูเกิ้ล OAuth สเปรดชีตต้นฉบับ</p>
                </div>
              </div>
            ) : sheetData ? (
              /* Core Content dashboard */
              <PaymentDashboard
                data={sheetData}
                activeCategoryIndex={activeCategoryIdx}
                onSelectCategory={setActiveCategoryIdx}
                onSelectInstallment={setActiveInstallment}
                onClearPayment={handleClearPaymentData}
                onAddInstallment={handleAddInstallmentRow}
                onAddCategoryTab={handleCreateCategory}
                onRefresh={loadData}
                onLogout={handleLogout}
                userName={user?.displayName}
                userPhoto={user?.photoURL}
                isProcessing={isProcessing}
              />
            ) : isAuthExpired ? (
              /* Auth expired friendly reconnect state */
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 border border-amber-200 border-dashed rounded-[2rem] bg-amber-50/20 max-w-lg mx-auto relative overflow-hidden animate-fade-in" id="expired-reconnect-container">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-amber-100/30 blur-xl" />
                <div className="inline-flex rounded-2xl bg-amber-100 text-amber-700 p-4 mb-4">
                  <KeySquare className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">สิทธิ์ดึงข้อมูล Google Sheet หมดอายุชั่วคราว (เมื่อเกิน 1 ชม.)</h4>
                <p className="text-[11px] text-slate-500 mt-3 max-w-xs leading-relaxed">
                  ตามมาตรฐานความปลอดภัยระดับโลกของ Google สิทธิ์การขอเข้าถึง Google API จะสามารถคงอยู่ได้นานสูงสุด <strong>1 ชั่วโมง (3600 วินาที)</strong> หลังจากนั้นกุญแจจะระงับการเข้าถึงชั่วคราวเพื่อป้องกันไฟล์ของคุณ
                  <br /><br />
                  คุณไม่จําเป็นต้องล็อกเอาท์หรือล็อก PIN ใหม่ให้ยุ่งยาก เพียงแค่ป้อนล็อกอินกูเกิ้ล 1 คลิก ระบบจะจัดการเปิดกุญแจดึงชีทกลับมาได้ทันที!
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="mt-6 px-5 py-2.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-150 border border-amber-200 rounded-xl shadow-xs transition active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>กำลังซิงก์กุญแจใหม่...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 text-amber-800" />
                      <span>ต่ออายุสิทธิ์ความปลอดภัย Google (1 คลิก)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Missing data blank screen state */
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-3xl bg-white max-w-lg mx-auto">
                <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-4" />
                <h4 className="font-bold text-slate-800 text-sm">ไม่พบบันทึกแผ่นงานใดๆ</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                  ไม่สามารถดึงข้อมูลแผ่นงาน {spreadsheetId} ได้สำเร็จ ตรวจสอบสิทธิ์บัญชี หรือสลับ ID ไปยัง Spreadsheet ในแถบฟันเฟืองด้านบน
                </p>
                <div className="flex gap-2.5 mt-5">
                  <button
                    onClick={loadData}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl shadow-xs"
                  >
                    ลองดึงข้อมูลอีกครั้ง
                  </button>
                  <button
                    onClick={handleLogin}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    เชื่อมสิทธิ์ Google ใหม่
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Quick Payment Details & Slip uploading Modal container */}
          <ReceiptUploadModal
            isOpen={activeInstallment !== null}
            onClose={() => setActiveInstallment(null)}
            installment={activeInstallment}
            categoryTitle={sheetData?.categories[activeCategoryIdx]?.title || ''}
            onSave={handleSavePaymentData}
            isSaving={isProcessing}
          />

          {/* Humble simple app footer */}
          <footer className="py-6 border-t border-slate-100 text-center text-[10px] text-slate-400">
            <p>© {new Date().getFullYear()} Monthly Expense Tracker. ข้อมูลทั้งหมดซิงก์โดยตรงผ่าน Firebase & Google Web Services.</p>
          </footer>
        </div>
      )}
    </div>
  );
}
