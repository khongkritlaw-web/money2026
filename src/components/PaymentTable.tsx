import React, { useState } from 'react';
import {
  Search, Filter, Calendar, FileText, CheckCircle, AlertCircle, Plus,
  Sparkles, Image, Clock, Trash2, CheckSquare, Square, Eye
} from 'lucide-react';
import { InstallmentRow, SheetCategory } from '../types';
import { formatThaiMonthYear, parseThaiMonthYear, getExactDueDate } from '../lib/sheets';

interface PaymentTableProps {
  category: SheetCategory;
  onSelectInstallment: (installment: InstallmentRow) => void;
  onClearPayment: (installment: InstallmentRow) => Promise<void>;
  onAddInstallment: (installmentNum: string, monthStr: string, dueAmount: number) => Promise<void>;
  isProcessing: boolean;
  onViewDetail: (installment: InstallmentRow) => void;
}

export default function PaymentTable({
  category,
  onSelectInstallment,
  onClearPayment,
  onAddInstallment,
  isProcessing,
  onViewDetail,
}: PaymentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'OVERDUE'>('ALL');

  const isCreditCard = category.title.toLowerCase().includes('บัตร') || 
                       category.title.toLowerCase().includes('เครดิต') || 
                       category.title.toLowerCase().includes('credit') ||
                       category.installments.length === 1;

  // Input state for adding new installment
  const [showAddRowForm, setShowAddRowForm] = useState(false);
  const [newDueAmount, setNewDueAmount] = useState<string>('600');
  const [newMonthStr, setNewMonthStr] = useState<string>('');
  const [newIndexStr, setNewIndexStr] = useState<string>('');

  // Prefill the add row form based on previous installment sequence
  const prefillAddForm = () => {
    const list = category.installments;
    let nextIndex = 1;
    let nextMonthStr = '';
    let lastDue = 600;

    if (list.length > 0) {
      const last = list[list.length - 1];
      const parsedIdx = parseInt(last.index, 10);
      nextIndex = isNaN(parsedIdx) ? list.length + 1 : parsedIdx + 1;
      lastDue = last.dueAmount;

      const parsedDate = parseThaiMonthYear(last.month);
      if (parsedDate) {
        // Increment month by 1
        parsedDate.setMonth(parsedDate.getMonth() + 1);
        nextMonthStr = formatThaiMonthYear(parsedDate);
      }
    }

    setNewIndexStr(String(nextIndex));
    setNewMonthStr(nextMonthStr || 'ก.ค.2569');
    setNewDueAmount(String(lastDue));
    setShowAddRowForm(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newDueAmount);
    if (!newIndexStr.trim() || !newMonthStr.trim() || isNaN(amountVal) || amountVal <= 0) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }
    await onAddInstallment(newIndexStr.trim(), newMonthStr.trim(), amountVal);
    setShowAddRowForm(false);
  };

  // Filter installments
  const filteredInstallments = category.installments.filter((item) => {
    const matchesSearch = item.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.index.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4" id="table-module">
      {/* Table Head Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-800">รายละเอียดงวดชำระ (หมวดหมู่นี้)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหางวด, เดือน, โน้ต..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-full sm:w-44 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex rounded-lg bg-slate-50 border border-slate-200 p-0.5">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-50 text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-emerald-500'
              }`}
            >
              จ่ายแล้ว
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                statusFilter === 'UNPAID'
                  ? 'bg-amber-50 text-amber-600 shadow-xs'
                  : 'text-slate-500 hover:text-amber-500'
              }`}
            >
              รอชำระ
            </button>
            <button
              onClick={() => setStatusFilter('OVERDUE')}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                statusFilter === 'OVERDUE'
                  ? 'bg-rose-50 text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-rose-500'
              }`}
            >
              ค้างค้าง
            </button>
          </div>
        </div>
      </div>

      {/* Visual usage guidance */}
      <p className="text-[11px] text-slate-500 bg-indigo-50/40 border border-indigo-100/60 px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-medium shadow-2xs">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
        <span><b>คำแนะนำ:</b> สามารถกดที่กล่องติ๊กช่อง <b>"ติ๊กชำระ"</b> หน้าสุด หรือคลิกที่ <b>"แถวแนวราบใดๆ"</b> เพื่อเปิดแผงดูใบเสร็จและรายละเอียด{isCreditCard ? 'รอบบิลบัตร' : 'บัญชีค่างวด'}ได้ทันที</span>
      </p>

      {/* Grid List View */}
      <div className="overflow-hidden bg-white border border-slate-100 rounded-xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="payment-items-table">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 tracking-wider">
                <th className="py-3 px-3 w-12 text-center">ติ๊กชำระ</th>
                <th className="py-3 px-4 w-16 text-center">{isCreditCard ? 'รอบบิลที่' : 'งวดที่'}</th>
                <th className="py-3 px-4">{isCreditCard ? 'รอบประจำเดือน' : 'เดือนค่างวด'}</th>
                <th className="py-3 px-4 text-right">{isCreditCard ? 'ยอดรูดบัตร (บาท)' : 'ยอดค่างวด'}</th>
                <th className="py-3 px-4 text-right bg-amber-50/70 border-x border-amber-100/40 text-amber-800 font-bold">ชำระมาแล้ว (เน้นเหลือง)</th>
                <th className="py-3 px-4 text-right">คงเหลือ</th>
                <th className="py-3 px-4 text-center">ใบเสร็จ</th>
                <th className="py-3 px-4">ความเห็น/โน้ต</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
              {filteredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    ไม่พบข้อมูลประวัติการชำระที่ตรงกับเงื่อนไขค้นหา
                  </td>
                </tr>
              ) : (
                filteredInstallments.map((item) => (
                  <tr
                    key={item.rowIndex}
                    onClick={() => onViewDetail(item)}
                    className={`hover:bg-indigo-50/20 active:bg-indigo-50/30 transition-all cursor-pointer ${
                      item.status === 'OVERDUE' ? 'bg-rose-50/10' : ''
                    }`}
                  >
                    {/* Tick Checkbox Column */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {item.status === 'PAID' ? (
                        <button
                          onClick={() => {
                            if (window.confirm(`คุณต้องการยกเลิกประวัติชำระของ ${isCreditCard ? 'รอบบิลที่' : 'งวดที่'} ${item.index} (เดือน ${item.month}) หรือไม่?`)) {
                              onClearPayment(item);
                            }
                          }}
                          className="text-emerald-500 hover:text-emerald-600 hover:scale-110 active:scale-95 transition-all p-1.5 rounded-lg hover:bg-emerald-50 shrink-0 inline-flex items-center justify-center cursor-pointer"
                          title="ติ๊กชำระแล้ว - คลิกเพื่อยกเลิกจ่ายเงินในชีท"
                        >
                          <CheckSquare className="h-5 w-5 stroke-[2.5]" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectInstallment(item)}
                          className={`hover:scale-110 active:scale-95 transition-all p-1.5 rounded-lg shrink-0 inline-flex items-center justify-center cursor-pointer ${
                            item.status === 'OVERDUE'
                              ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                          }`}
                          title="ยังไม่ได้จ่าย - คลิกเพื่อบันทึกชำระและแนบสลิปด่วน"
                        >
                          <Square className="h-5 w-5 stroke-[2]" />
                        </button>
                      )}
                    </td>

                    {/* Index */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-550">
                      {item.index}
                    </td>

                    {/* Month */}
                    <td className="py-3.5 px-4 font-bold">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="text-slate-800">{item.month}</span>
                        </div>
                        {category.metadata?.dueDateInfo && (
                          <div className="text-[10px] text-indigo-600 font-extrabold pl-5">
                            📅 {getExactDueDate(category.metadata.dueDateInfo, item.month)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Due Amount */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {item.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3.5 px-4 text-right bg-amber-50/20 border-x border-amber-100/10">
                      {item.paidAmount !== null ? (
                        <span className="font-bold text-amber-750 bg-amber-100/30 px-2 py-0.5 rounded">
                          {item.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Remaining */}
                    <td className="py-3.5 px-4 text-right">
                      {item.remaining > 0 ? (
                        <span className="font-bold text-rose-500">
                          {item.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-600">
                          <CheckCircle className="h-2.5 w-2.5" /> ครบถ้วน
                        </span>
                      )}
                    </td>

                    {/* Receipt image */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 font-bold text-[10px] text-indigo-700 hover:bg-indigo-100 transition duration-150 shadow-2xs cursor-pointer"
                          title="เปิดไฟล์ใบเสร็จบน Google Drive"
                        >
                          <Image className="h-3 w-3 shrink-0" />
                          <span>ดูสลิป</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[10px] italic">ไม่มีสลิป</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 max-w-[150px] truncate text-slate-500 font-semibold" title={item.notes}>
                      {item.notes || '-'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewDetail(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          title="กดดูรายละเอียดแบบเต็ม"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {item.status === 'PAID' ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (window.confirm('คุณต้องการแก้ไขข้อมูลการชำระเงินของงวดนี้ใช่หรือไม่?')) {
                                  onSelectInstallment(item);
                                }
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`คุณต้องการยกเลิกการชำระเงินของงวดที่ ${item.index} หรือไม่? ข้อมูลจะถูกลบออกจากชีท`)) {
                                  onClearPayment(item);
                                }
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="ยกเลิกการชำระเงิน"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onSelectInstallment(item)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all shadow-2xs hover:scale-103 cursor-pointer ${
                              item.status === 'OVERDUE'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                                : 'bg-slate-800 hover:bg-slate-900 text-white'
                            }`}
                          >
                            บันทึกชำระ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expand table trigger block */}
      <div className="flex justify-between items-center" id="table-footer-controls">
        <p className="text-[10px] text-slate-400">
          แสดงรายการ {filteredInstallments.length} จาก {category.installments.length} งวดชำระ
        </p>

        {!showAddRowForm ? (
          <button
            onClick={prefillAddForm}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 hover:shadow-xs rounded-xl border border-indigo-100 transition-all"
            id="expand-grid-trigger"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มขยายงวดใหม่ลงชีท
          </button>
        ) : (
          <form
            onSubmit={handleAddSubmit}
            className="w-full sm:w-auto p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-end gap-3"
            id="add-row-form"
          >
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">งวดที่</label>
                <input
                  type="text"
                  required
                  value={newIndexStr}
                  onChange={(e) => setNewIndexStr(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">เดือนค่างวด</label>
                <input
                  type="text"
                  required
                  value={newMonthStr}
                  placeholder="เช่น มิ.ย.2573"
                  onChange={(e) => setNewMonthStr(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-1">ค่างวด (บาท)</label>
                <input
                  type="number"
                  required
                  value={newDueAmount}
                  onChange={(e) => setNewDueAmount(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-hidden"
                />
              </div>
            </div>
            <div className="flex gap-1.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowAddRowForm(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-200 hover:bg-slate-300 rounded"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1"
              >
                เพิ่มค่างวด
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
