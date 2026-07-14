import { getSheetsClient, SPREADSHEET_ID, checkAuth } from './_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAuth(req, res)) return;

  const { wallet, saldoAwal } = req.body;
  try {
    const sheets = await getSheetsClient();
    const current = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Dompet!A:C',
    });
    const rows = current.data.values;
    const rowIndex = rows.findIndex(r => r[0] === wallet);
    if (rowIndex === -1) return res.status(404).json({ error: 'Dompet tidak ditemukan' });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Dompet!A${rowIndex + 1}:C${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[wallet, saldoAwal, tomorrowStr]] },
    });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}