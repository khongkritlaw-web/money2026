import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, CreditCard, User, AlertCircle, FileText, CheckCircle2,
  Trash2, ExternalLink, Image as ImageIcon, Clipboard, CheckCircle
} from 'lucide-react';
import { InstallmentRow, SheetCategory } from '../types';
import { getExactDueDate } from '../lib/sheets';

interface InstallmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: InstallmentRow | null;
  category: SheetCategory;
  onClearPayment: (installment: InstallmentRow) => Promise<void>;
  onTriggerPayment: (installment: InstallmentRow) => void;
  isProcessing: boolean;
}

export default function InstallmentDetailModal({
  isOpen,
  onClose,
  installment,
  category,
  onClearPayment,
  onTriggerPayment,
  isProcessing,
}: InstallmentDetailModalProps) {
  if (!installment) return null;

  const isCreditCard = category.title.toLowerCase().includes('บัตร') || 
                       category.title.toLowerCase().includes('เครดิต') || 
                       category.title.toLowerCase().includes('credit') ||
                       category.installments.length === 1;

  const handleClear = async () => {
    if (window.confirm(`คุณต้องการยกเลิกการชำระเงินของ ${isCreditCard ? 'รอบบิลที่' : 'งวดที่'} ${installment.index} ใช่หรือไม่? ประวัติการชำระและข้อมูลใบเสร็จจะถูกลบออกจากชีท`)) {
      await onClearPayment(installment);
      onClose();
    }
  };

  const handlePay = () => {
    onTriggerPayment(installment);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            id="detail-modal-backdrop"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl flex flex-col max-h-[90vh]"
            id="detail-modal-body"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 shrink-0 px-6 py-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {isCreditCard ? 'รายละเอียดรอบบิลบัตรเครดิต' : 'รายละเอียดงวดชำระเงิน'}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  {isCreditCard ? `รอบบิลที่ ${installment.index}` : `งวดที่ ${installment.index}`} (เดือน {installment.month})
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                id="detail-modal-close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-700">
              {/* Category Core Detail Card - "ของใคร ค่าใช้จ่ายอะไร" */}
              <div className="rounded-xl border border-slate-150 bg-slate-50 p-4 space-y-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ข้อมูลบริการ & สัญญางาน</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">ค่าใช้จ่ายอะไร (หมวดหมู่ชีท)</span>
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                      📁 {category.title}
                    </span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-3">
                    <span className="text-slate-400 block font-medium">ของใคร (ผู้รับผิดชอบ)</span>
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                      👤 {category.metadata?.ref1 || 'ไม่ระบุชื่อ'}
                    </span>
                  </div>
                </div>

                {category.metadata?.ref2 && (
                  <div className="text-xs pt-2 border-t border-slate-200/60 font-semibold text-slate-600">
                    <span className="text-slate-400 font-medium mr-1.5">รายละเอียดสัญญา:</span>
                    <span>{category.metadata.ref2}</span>
                  </div>
                )}
                {category.metadata?.dueDateInfo && (
                  <div className="text-xs font-semibold text-slate-600 flex flex-col gap-1.5 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">ค่ากำหนดชำระเริ่มต้น:</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                        {category.metadata.dueDateInfo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">กำหนดดิวของงวดนี้:</span>
                      <span className="text-indigo-700 font-extrabold bg-indigo-100 px-2.5 py-0.5 rounded-full text-[11.5px] border border-indigo-250 shadow-3xs">
                        📅 {getExactDueDate(category.metadata.dueDateInfo, installment.month)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Installment Financial Details */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ยอดต้องชำระ</span>
                  <span className="text-base font-bold text-slate-800 tracking-tight block mt-1">
                    {installment.dueAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block">บาท</span>
                </div>

                <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3">
                  <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-wider block">ชำระแล้ว</span>
                  <span className="text-base font-bold text-emerald-600 tracking-tight block mt-1">
                    {installment.paidAmount !== null ? installment.paidAmount.toLocaleString() : '-'}
                  </span>
                  <span className="text-[10px] text-emerald-600/70 block">บาท</span>
                </div>

                <div className="rounded-xl bg-rose-50/50 border border-rose-100 p-3">
                  <span className="text-[10px] font-bold text-rose-700/80 uppercase tracking-wider block">ยอดคงเหลือ</span>
                  <span className="text-base font-bold text-rose-500 tracking-tight block mt-1">
                    {installment.remaining.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-rose-500/70 block">บาท</span>
                </div>
              </div>

              {/* Status Header */}
              <div className="flex items-center gap-3 py-1 text-xs">
                <span className="text-slate-400 font-semibold shrink-0">
                  {isCreditCard ? 'สถานะรอบบิลนี้:' : 'สถานะงวดนี้:'}
                </span>
                <div>
                  {installment.status === 'PAID' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-150 px-3 py-1 font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      จ่ายครบเรียบร้อยแล้ว
                    </span>
                  ) : installment.status === 'OVERDUE' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-150 px-3 py-1 font-bold text-rose-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                      ค้างชำระ (เกินกำหนดเวลา)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-150 px-3 py-1 font-bold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      รอการชำระเงิน
                    </span>
                  )}
                </div>
              </div>

              {/* Note Segment */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Clipboard className="h-3.5 w-3.5 text-slate-400" />
                  <span>บันทึกความเห็น / หมายเหตุ</span>
                </label>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-slate-600 font-semibold min-h-[50px] leading-relaxed">
                  {installment.notes || (isCreditCard ? 'ไม่มีหมายเหตุแนบท้ายสำหรับรอบบิลนี้' : 'ไม่มีหมายเหตุแนบท้ายสำหรับงวดผ่อนชำระนี้')}
                </div>
              </div>

              {/* Image Preview Segment (Greatly requested: "แนบสลิปและกดดูรายละเอียดต่างๆได้ง่าย") */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>สลิปหลักฐานการชำระเงิน</span>
                </span>

                {installment.receiptUrl ? (
                  <div className="group relative rounded-xl border border-slate-150 overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-2">
                    {/* Render standard iframe if pdf or image */}
                    <div className="w-full h-56 rounded-lg overflow-hidden bg-slate-100 relative">
                      <iframe
                        src={installment.receiptUrl}
                        className="w-full h-full border-0 rounded-lg pointer-events-none"
                        title="หลักฐานชำระเงิน"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-100 group-hover:opacity-10 transition duration-300 flex items-center justify-center pointer-events-none text-white text-xs font-semibold gap-1">
                        <ImageIcon className="h-4 w-4" />
                        <span>หลักฐานในระบบ (คลิกลิงก์เพื่อเปิดเต็มจอ)</span>
                      </div>
                    </div>
                    <a
                      href={installment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full py-2 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <span>เปิดหลักฐานใน Google Drive ↗</span>
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                    <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-[11px] text-slate-400 font-semibold">
                      {isCreditCard ? 'ยังไม่มีการแนบไฟล์หลักฐานสลิปใบเสร็จในรอบบิลนี้' : 'ยังไม่มีการแนบไฟล์รูปภาพสลิปใบเสร็จในงวดค้างชำระนี้'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer action options */}
            <div className="shrink-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              {installment.status === 'PAID' ? (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="px-3.5 py-2 hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-100 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>ยกเลิกการชำระเงิน</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-slate-850 hover:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>คลิกติ๊กชำระเงิน / แนบสลิปทันที</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
