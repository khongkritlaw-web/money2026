import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, CheckCircle, Calendar, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { InstallmentRow } from '../types';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: InstallmentRow | null;
  categoryTitle: string;
  onSave: (paidAmount: number, notes: string, file: File | null) => Promise<void>;
  isSaving: boolean;
}

export default function ReceiptUploadModal({
  isOpen,
  onClose,
  installment,
  categoryTitle,
  onSave,
  isSaving,
}: ReceiptUploadModalProps) {
  if (!installment) return null;

  const [paidAmount, setPaidAmount] = useState<string>(
    installment.paidAmount !== null ? String(installment.paidAmount) : String(installment.dueAmount)
  );
  const [notes, setNotes] = useState<string>(installment.notes || '');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WEBP) หรือ PDF เท่านั้น');
      return;
    }
    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null); // PDF won't have image preview easily in this way
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(paidAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg('กรุณากรอกยอดเงินชำระที่ถูกต้อง');
      return;
    }

    try {
      await onSave(parsedAmount, notes, selectedFile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            id="modal-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
            id="modal-body"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/50 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800" id="modal-title">
                  บันทึกการชำระเงิน
                </h3>
                <p className="text-xs text-slate-500" id="modal-subtitle">
                  หมวดหมู่: {categoryTitle} • งวดที่ {installment.index} ({installment.month})
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                id="modal-close-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5" id="payment-form">
              {errorMsg && (
                <div
                  className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/50 p-3.5 text-xs text-red-600"
                  id="error-banner"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Installment Amount Info */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 font-medium">ยอดที่ต้องชำระ</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-semibold text-slate-800">
                      {installment.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500">บาท</span>
                  </div>
                </div>
                <div className="space-y-1 border-l border-slate-200 pl-4">
                  <span className="text-xs text-slate-400 font-medium">สถานะหลัก</span>
                  <div className="pt-1">
                    {installment.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ชำระแล้ว
                      </span>
                    ) : installment.status === 'OVERDUE' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-600 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        ค้างชำระ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        รอชำระเงิน
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount Inputs */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 block">
                  ยอดเงินที่ชำระจริง (บาท) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <CreditCard className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isSaving}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    id="paid-amount-input"
                  />
                  <button
                    type="button"
                    onClick={() => setPaidAmount(String(installment.dueAmount))}
                    className="absolute right-2 top-2 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                  >
                    จ่ายเต็ม
                  </button>
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 block">
                  หมายเหตุ / บันทึกเพิ่มเติม
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ชำระผ่าน Mobile Banking สลิปอ้างอิง..."
                  rows={2}
                  disabled={isSaving}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                  id="notes-input"
                />
              </div>

              {/* Drag/Drop Image Attachment */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 block">
                  แนบหลักฐานการชำระเงิน (สลิป/ใบเสร็จ)
                </label>

                {!selectedFile && installment.receiptUrl && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/30 px-3.5 py-2.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate font-medium">มีหลักฐานแนบอยู่แล้วในชีท</span>
                    </div>
                    <a
                      href={installment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      ดูรูปเดิม
                    </a>
                  </div>
                )}

                {!selectedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-indigo-400 bg-slate-50/20 hover:bg-indigo-50/10'
                    }`}
                    id="dropzone"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                      className="hidden"
                      id="receipt-file-input"
                    />
                    <div className="rounded-full bg-slate-100 p-2.5 text-slate-400 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all duration-300">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="mt-2.5 text-xs font-medium text-slate-700">
                      ลากไฟล์มาวางที่นี่ หรือ <span className="text-indigo-600 underline">คลิกพื่อเลือกไฟล์</span>
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      รองรับไฟล์ JPG, PNG, WEBP หรือ PDF (สูงสุด 10MB)
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-slate-150 p-3 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Receipt Preview"
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-lg object-cover border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-indigo-50 border border-slate-200 flex items-center justify-center text-indigo-500 shrink-0">
                          <FileText className="h-6 w-6" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-slate-700 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      disabled={isSaving}
                      className="text-xs font-medium text-rose-500 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors border border-rose-100"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
                  id="cancel-payment-btn"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl px-5 py-2.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-75 disabled:cursor-not-allowed"
                  id="submit-payment-btn"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      กำลังบันทึกข้อมูลหลักฐาน...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      บันทึกชำระเงินลงชีท
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
