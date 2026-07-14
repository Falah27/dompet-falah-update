import { getSheetsClient, SPREADSHEET_ID, checkAuth } from './_sheets.js';

function rowsToObjectsWithIndex(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row, i) => {
    const obj = { rowNumber: i + 2 }; // +2 karena row 1 = header, sheet index mulai dari 1
    headers.forEach((h, idx) => (obj[h] = row[idx] ?? ''));
    return obj;
  });
}

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['Transaksi!A:H', 'Dompet!A:C', 'Target!A:C'],
    });
    const [transaksiRaw, dompetRaw, targetRaw] = response.data.valueRanges.map(r => r.values);
    res.status(200).json({
      transaksi: rowsToObjectsWithIndex(transaksiRaw),
      dompet: rowsToObjectsWithIndex(dompetRaw),
      target: rowsToObjectsWithIndex(targetRaw),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}