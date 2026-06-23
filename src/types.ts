export interface InstallmentRow {
  rowIndex: number; // 1-based index in Google Sheets
  index: string;     // Column B (งวด) - number/string
  month: string;     // Column C (เดือน)
  dueAmount: number; // Column D (ค่างวด)
  paidAmount: number | null; // Column E (ชำระมา)
  remaining: number; // Column F (คงเหลือ)
  receiptUrl?: string; // Column G (ใบเสร็จ)
  notes?: string;      // Column H (หมายเหตุ)
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
}

export interface SheetCategory {
  title: string;       // Sheet tab name e.g. "umar+ ต้อ"
  metadata?: {
    dueDateInfo?: string; // Col C Row 1 e.g. "ทุกวันที่ 1"
    ref1?: string;        // Col D Row 1 e.g. "umar+"
    ref2?: string;        // Col E Row 1 e.g. "ต้อ"
    colPaidLetter?: string;
    colRemainLetter?: string;
    colReceiptLetter?: string;
    colNoteLetter?: string;
    colIndexLetter?: string;
    colMonthLetter?: string;
    colDueLetter?: string;
  };
  installments: InstallmentRow[];
  totalExpected: number;
  totalPaid: number;
  totalRemaining: number;
}

export interface SpreadsheetData {
  id: string;
  title: string;
  categories: SheetCategory[];
}
