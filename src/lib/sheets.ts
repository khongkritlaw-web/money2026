import { SheetCategory, InstallmentRow, SpreadsheetData } from '../types';

const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 1, 'ม.ค': 1,
  'ก.พ.': 2, 'ก.พ': 2,
  'มี.ค.': 3, 'มี.ค': 3,
  'เม.ย.': 4, 'เม.ย': 4,
  'พ.ค.': 5, 'พ.ค': 5,
  'มิ.ย.': 6, 'มิ.ย': 6,
  'ก.ค.': 7, 'ก.ค': 7,
  'ส.ค.': 8, 'ส.ค': 8,
  'ก.ย.': 9, 'ก.ย': 9,
  'ต.ค.': 10, 'ต.ค': 10,
  'พ.ย.': 11, 'พ.ย': 11,
  'ธ.ค.': 12, 'ธ.ค': 12
};

const MONTH_NAMES_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// Parse Thai Month-Year string like "ก.ค.2569" to Date object
export function parseThaiMonthYear(str: string): Date | null {
  if (!str) return null;
  const clean = str.trim();
  // Match month letters and year digits
  const match = clean.match(/^([^\d.]+)\.?\s*(\d+)$/);
  if (!match) return null;
  const thMonth = match[1].trim() + (match[1].endsWith('.') ? '' : '.');
  const thYear = parseInt(match[2].trim(), 10);
  const monthNum = THAI_MONTHS[thMonth];
  if (!monthNum) return null;

  const adYear = thYear - 543; // Convert Buddhist Era to Gregorian
  return new Date(adYear, monthNum - 1, 1);
}

// Format Date object to Thai Month-Year string style e.g. "มิ.ย.2573"
export function formatThaiMonthYear(date: Date): string {
  const monthIdx = date.getMonth();
  const yearBE = date.getFullYear() + 543; // Convert to Buddhist Era
  return `${MONTH_NAMES_TH[monthIdx]}${yearBE}`;
}

/**
 * Calculates / parses the exact due date for an installment from the category's dueDateInfo metadata
 * e.g., "ทุกวันที่ 20" + "ก.ค.2569" -> "20 ก.ค.2569"
 */
export function getExactDueDate(dueDateInfo: string, monthStr: string): string {
  if (!dueDateInfo) return '';
  if (!monthStr) return dueDateInfo;

  // Extract the first number-sequence in the due day info, e.g. "ทุกวันที่ 20" -> "20"
  const digitMatch = dueDateInfo.match(/\d+/);
  if (digitMatch) {
    const day = digitMatch[0];
    return `${day} ${monthStr}`;
  }

  // Fallback if not a digit, e.g. "สิ้นเดือน" -> "สิ้นเดือน ก.ค.2569"
  return `${dueDateInfo} ${monthStr}`;
}

// Clean raw monetary strings from Google Sheets e.g., "28,200.00" -> 28200
export function parseCurrency(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[\$,\sTHB฿]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

// Convert numbers to column letters e.g. 0 -> A, 1 -> B, 2 -> C
export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Fetch spreadsheet details including tabs list and values
export async function fetchSpreadsheetData(accessToken: string, spreadsheetId: string): Promise<SpreadsheetData> {
  try {
    // 1. Get Spreadsheet metadata (titles & sheets info)
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets(properties(sheetId,title))`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaRes.ok) {
      throw new Error(`Failed to fetch spreadsheet metadata: ${metaRes.statusText}`);
    }

    const metadata = await metaRes.json();
    const docTitle = metadata.properties.title || 'Expense Tracking';
    const sheetsList = metadata.sheets || [];

    const categories: SheetCategory[] = [];

    // 2. Load values for each individual sheet tab
    for (const sheet of sheetsList) {
      const title = sheet.properties.title;
      const sheetId = sheet.properties.sheetId;

      const valUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(title)}'!A1:K100`;
      const valRes = await fetch(valUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!valRes.ok) {
        console.warn(`Failed to fetch values for tab ${title}, skipping...`);
        continue;
      }

      const valData = await valRes.json();
      const rows: string[][] = valData.values || [];

      // Parse metadata from Row 1 or scan the first few rows robustly for keywords
      let dueDateInfo = '';
      let ref1 = '';
      let ref2 = '';
      let foundMetadata = false;

      // Scan first 4 rows across all columns for Thai keywords indicating due date
      for (let i = 0; i < Math.min(rows.length, 4); i++) {
        const row = rows[i];
        if (!row) continue;
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          if (
            cell.includes('ทุกวันที่') || 
            cell.includes('สิ้นเดือน') || 
            cell.includes('กำหนดชำระ') || 
            cell.includes('ดิวของ') ||
            (cell.startsWith('วันที่') && !cell.includes('ชำระมา') && !cell.includes('คงเหลือ') && !cell.includes('รวม'))
          ) {
            dueDateInfo = cell;
            ref1 = String(row[j + 1] || '').trim();
            ref2 = String(row[j + 2] || '').trim();
            foundMetadata = true;
            break;
          }
        }
        if (foundMetadata) break;
      }

      // Fallback to absolute index 2, 3, 4 of Row 1 if search fails
      if (!foundMetadata && rows.length > 0) {
        const row1 = rows[0];
        dueDateInfo = row1[2] || '';
        ref1 = row1[3] || '';
        ref2 = row1[4] || '';
      }

      // Detect header row index. Header should contain "งวด"
      let headerRowIdx = -1;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const rowStr = r.join(' ');
        if (rowStr.includes('เดือน') && (rowStr.includes('ยอด') || rowStr.includes('งวด') || rowStr.includes('ชำระ') || rowStr.includes('คงเหลือ'))) {
          headerRowIdx = i;
          break;
        }
        if (r.indexOf('งวด') !== -1 || (r[1] && r[1].trim() === 'งวด')) {
          headerRowIdx = i;
          break;
        }
      }

      // If no valid headers found, let's look for fallback sequence
      if (headerRowIdx === -1) {
        // Fallback or skip
        continue;
      }

      // Dynamic header mapping to support shifted columns (e.g., extra transaction details in credit card tab)
      let colIndex = 1;      // Fallback B
      let colMonth = 2;      // Fallback C
      let colDue = 3;        // Fallback D
      let colPaid = 4;       // Fallback E
      let colRemain = 5;     // Fallback F
      let colReceipt = 6;    // Fallback G
      let colNote = 7;       // Fallback H

      const headers = rows[headerRowIdx];
      for (let j = 0; j < headers.length; j++) {
        const h = String(headers[j] || '').trim().toLowerCase();
        if (!h) continue;

        if (h.includes('คงเหลือ') || h === 'เหลือ' || h.includes('ยอดเหลือ') || h.includes('ยังขาด')) {
          colRemain = j;
        } else if (h.includes('ชำระมา') || h === 'ชำระ' || h === 'จ่าย' || h.includes('ยอดชำระ') || h.includes('จ่ายแล้ว') || h.includes('ชำระเงิน')) {
          colPaid = j;
        } else if (h.includes('งวด') || h.includes('รอบบิลที่') || h.includes('ครั้งที่') || h === 'ที่' || h === 'ลำดับ' || h === 'no' || h === 'no.') {
          if (!h.includes('ยอด') && !h.includes('เดือน') && !h.includes('ชำระ') && !h.includes('โอน')) {
            colIndex = j;
          }
        } else if (h.includes('เดือน') || h.includes('รอบประจำ') || h.includes('รอบเดือน') || h.includes('ประจำเดือน')) {
          colMonth = j;
        } else if (h.includes('ใบเสร็จ') || h.includes('สลิป') || h.includes('หลักฐาน') || h.includes('รูป') || h.includes('receipt') || h.includes('slip') || h.includes('ไฟล์')) {
          colReceipt = j;
        } else if (h.includes('หมายเหตุ') || h.includes('notes') || h.includes('รายละเอียด') || h.includes('memo')) {
          colNote = j;
        } else if (h.includes('ยอด') || h.includes('ราคา') || h.includes('ค่า') || h.includes('วงเงิน') || h.includes('จำนวนเงิน') || h.includes('เงินต้น')) {
          if (!h.includes('ชำระ') && !h.includes('คงเหลือ') && !h.includes('จ่าย') && !h.includes('เดือน')) {
            colDue = j;
          }
        }
      }

      const colPaidLetter = getColumnLetter(colPaid);
      const colRemainLetter = getColumnLetter(colRemain);
      const colReceiptLetter = getColumnLetter(colReceipt);
      const colNoteLetter = getColumnLetter(colNote);
      const colIndexLetter = getColumnLetter(colIndex);
      const colMonthLetter = getColumnLetter(colMonth);
      const colDueLetter = getColumnLetter(colDue);

      const installments: InstallmentRow[] = [];
      const now = new Date();
      // Set current date's day to 1 for precise month-level comparisons
      const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Read entries from header row index + 1 down to the sum/total lines
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const cellIndexText = row[colIndex] ? String(row[colIndex]).trim() : '';
        const cellMonthText = row[colMonth] ? String(row[colMonth]).trim() : '';

        // Stop if we hit sum totals
        if (
          cellIndexText.includes('รวม') || cellIndexText.includes('คงเหลือ') ||
          cellMonthText.includes('รวม') || cellMonthText.includes('คงเหลือ') ||
          row.some(cell => {
            const txt = String(cell || '').trim();
            return txt === 'รวม' || txt === 'ยอดรวม' || txt === 'คงเหลือ' || txt.startsWith('รวมเงิน') || txt.startsWith('ยอดคงเหลือ');
          })
        ) {
          break;
        }

        // Must have at least a Month value to render
        if (!cellMonthText) continue;

        const indexVal = cellIndexText || String(installments.length + 1);
        const monthVal = cellMonthText;
        const dueVal = parseCurrency(row[colDue]);
        const paidVal = row[colPaid] !== undefined && row[colPaid] !== '' ? parseCurrency(row[colPaid]) : null;
        const remainVal = row[colRemain] !== undefined && row[colRemain] !== '' ? parseCurrency(row[colRemain]) : (dueVal - (paidVal || 0));
        const receiptVal = row[colReceipt] || '';
        const noteVal = row[colNote] || '';

        // Determine payment status
        let status: 'PAID' | 'UNPAID' | 'OVERDUE' = 'UNPAID';
        if (paidVal !== null && paidVal >= dueVal && dueVal > 0) {
          status = 'PAID';
        } else if (remainVal <= 0 && dueVal > 0) {
          status = 'PAID';
        } else {
          // Check if installment month has already passed
          const rowMonthDate = parseThaiMonthYear(monthVal);
          if (rowMonthDate && rowMonthDate < curMonthStart) {
            status = 'OVERDUE';
          }
        }

        installments.push({
          rowIndex: i + 1, // Sheets rows are 1-indexed
          index: indexVal,
          month: monthVal,
          dueAmount: dueVal,
          paidAmount: paidVal,
          remaining: remainVal,
          receiptUrl: receiptVal,
          notes: noteVal,
          status
        });
      }

      // Sum totals
      const totalExpected = installments.reduce((acc, curr) => acc + curr.dueAmount, 0);
      const totalPaid = installments.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
      const totalRemaining = totalExpected - totalPaid;

      categories.push({
        title,
        metadata: {
          dueDateInfo,
          ref1,
          ref2,
          colPaidLetter,
          colRemainLetter,
          colReceiptLetter,
          colNoteLetter,
          colIndexLetter,
          colMonthLetter,
          colDueLetter
        },
        installments,
        totalExpected,
        totalPaid,
        totalRemaining
      });
    }

    return {
      id: spreadsheetId,
      title: docTitle,
      categories
    };
  } catch (error) {
    console.error('Error fetching spreadsheet data:', error);
    throw error;
  }
}

// Log a payment in Google Sheets
export async function savePayment(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  installment: InstallmentRow,
  paidAmount: number,
  receiptUrl: string,
  notes: string,
  metadata?: {
    colPaidLetter?: string;
    colRemainLetter?: string;
    colReceiptLetter?: string;
    colNoteLetter?: string;
  }
): Promise<boolean> {
  try {
    const rowIdx = installment.rowIndex;
    // Calculate remaining amount based on installment logic
    const computedRemaining = Math.max(0, installment.dueAmount - paidAmount);

    const colPaid = metadata?.colPaidLetter || 'E';
    const colRemain = metadata?.colRemainLetter || 'F';
    const colReceipt = metadata?.colReceiptLetter || 'G';
    const colNote = metadata?.colNoteLetter || 'H';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const body = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${tabName}'!${colPaid}${rowIdx}`,
          values: [[paidAmount]]
        },
        {
          range: `'${tabName}'!${colRemain}${rowIdx}`,
          values: [[computedRemaining]]
        },
        {
          range: `'${tabName}'!${colReceipt}${rowIdx}`,
          values: [[receiptUrl]]
        },
        {
          range: `'${tabName}'!${colNote}${rowIdx}`,
          values: [[notes]]
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to write payment details to spreadsheet: ${res.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving payment:', error);
    throw error;
  }
}

// Reset or clear a payment from Google Sheets
export async function clearPayment(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  rowIndex: number,
  dueAmount: number,
  metadata?: {
    colPaidLetter?: string;
    colRemainLetter?: string;
    colReceiptLetter?: string;
    colNoteLetter?: string;
  }
): Promise<boolean> {
  try {
    const colPaid = metadata?.colPaidLetter || 'E';
    const colRemain = metadata?.colRemainLetter || 'F';
    const colReceipt = metadata?.colReceiptLetter || 'G';
    const colNote = metadata?.colNoteLetter || 'H';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const body = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${tabName}'!${colPaid}${rowIndex}`,
          values: [['']]
        },
        {
          range: `'${tabName}'!${colRemain}${rowIndex}`,
          values: [[dueAmount]]
        },
        {
          range: `'${tabName}'!${colReceipt}${rowIndex}`,
          values: [['']]
        },
        {
          range: `'${tabName}'!${colNote}${rowIndex}`,
          values: [['']]
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to clear payment details from spreadsheet: ${res.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error clearing payment:', error);
    throw error;
  }
}

// Expand database by inserting a new installment row above "รวม" Row
export async function appendInstallmentRow(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  targetRowIndex: number, // index where "รวม" row starts, we insert BEFORE this
  installmentNumber: string,
  installmentMonth: string,
  dueAmount: number,
  metadata?: {
    colIndexLetter?: string;
    colMonthLetter?: string;
    colDueLetter?: string;
    colPaidLetter?: string;
    colRemainLetter?: string;
    colReceiptLetter?: string;
    colNoteLetter?: string;
  }
): Promise<boolean> {
  try {
    // 1. Get the Sheet ID representing the active tab to make sheetId-specific batch requests
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) throw new Error('Failed to find sheet tab Id');
    const metadataObj = await metaRes.json();
    const sheetObj = metadataObj.sheets.find((s: any) => s.properties.title === tabName);
    if (!sheetObj) throw new Error('Sheet category tab not found');
    const sheetId = sheetObj.properties.sheetId;

    // 2. Insert empty row at targetRowIndex (which pushes the totals down)
    const insertRequest = {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: targetRowIndex - 1, // 0-based index in sheets requests
              endIndex: targetRowIndex,
            },
            inheritFromBefore: true,
          },
        },
      ],
    };

    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const batchRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(insertRequest),
    });

    if (!batchRes.ok) {
      const err = await batchRes.text();
      throw new Error(`Failed to insert dimension: ${err}`);
    }

    // 3. Write data values into dynamic columns of the newly inserted row
    const colIndex = metadata?.colIndexLetter || 'B';
    const colMonth = metadata?.colMonthLetter || 'C';
    const colDue = metadata?.colDueLetter || 'D';
    const colPaid = metadata?.colPaidLetter || 'E';
    const colRemain = metadata?.colRemainLetter || 'F';
    const colReceipt = metadata?.colReceiptLetter || 'G';
    const colNote = metadata?.colNoteLetter || 'H';

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const writeBody = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${tabName}'!${colIndex}${targetRowIndex}`,
          values: [[installmentNumber]]
        },
        {
          range: `'${tabName}'!${colMonth}${targetRowIndex}`,
          values: [[installmentMonth]]
        },
        {
          range: `'${tabName}'!${colDue}${targetRowIndex}`,
          values: [[dueAmount]]
        },
        {
          range: `'${tabName}'!${colPaid}${targetRowIndex}`,
          values: [['']]
        },
        {
          range: `'${tabName}'!${colRemain}${targetRowIndex}`,
          values: [[dueAmount]]
        },
        {
          range: `'${tabName}'!${colReceipt}${targetRowIndex}`,
          values: [['']]
        },
        {
          range: `'${tabName}'!${colNote}${targetRowIndex}`,
          values: [['']]
        }
      ]
    };

    const writeRes = await fetch(writeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(writeBody),
    });

    if (!writeRes.ok) {
      throw new Error(`Failed to write new installment row values: ${writeRes.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error adding row:', error);
    throw error;
  }
}

// Create a completely new category / account sheet tab in the spreadsheet
export async function createNewCategoryTab(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  dueDayInfo: string,
  ownerName: string,
  detailInfo: string,
  startingDueAmount: number,
  numberOfMonths: number,
  startingThaiMonth: string // e.g. "ก.ค.2569"
): Promise<boolean> {
  try {
    // 1. Add Sheet Tab request
    const addSheetBody = {
      requests: [
        {
          addSheet: {
            properties: {
              title: tabTitle,
            }
          }
        }
      ]
    };

    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const addRes = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addSheetBody),
    });

    if (!addRes.ok) {
      throw new Error(`Failed to create sheet tab: ${addRes.statusText}`);
    }

    // 2. Pre-populate rows
    const rows: any[][] = [];
    // Row 1: metadata
    rows.push(['', '', dueDayInfo, ownerName, detailInfo]);
    // Row 2: headers
    rows.push(['', 'งวด', 'เดือน', 'ค่างวด', 'ชำระมา', 'คงเหลือ', 'ใบเสร็จ', 'หมายเหตุ']);

    const startMonthDate = parseThaiMonthYear(startingThaiMonth) || new Date();

    // Create specified number of months
    for (let i = 0; i < numberOfMonths; i++) {
      const rowDate = new Date(startMonthDate.getFullYear(), startMonthDate.getMonth() + i, 1);
      const rowMonthStr = formatThaiMonthYear(rowDate);
      rows.push([
        '',
        String(i + 1),
        rowMonthStr,
        startingDueAmount,
        '', // ชำระมา
        `=D${i + 3}-E${i + 3}` // Formula for remaining balance
      ]);
    }

    // Add totals row
    const totalRowIndex = numberOfMonths + 3;
    rows.push(['', '', 'รวม', `=SUM(D3:D${totalRowIndex - 1})`, `=SUM(E3:E${totalRowIndex - 1})`]);
    rows.push(['', '', 'คงเหลือ', `=D${totalRowIndex}-E${totalRowIndex}`]);

    // Write all pre-populated values to tab
    const writeRange = `'${tabTitle}'!A1:H${totalRowIndex + 1}`;
    const valueBody = { values: rows };

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`;
    const writeRes = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(valueBody),
    });

    return writeRes.ok;
  } catch (error) {
    console.error('Error creating new sheet tab:', error);
    throw error;
  }
}
