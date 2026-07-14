import { getSheetsClient, SPREADSHEET_ID, checkAuth } from './_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAuth(req, res)) return;

  const { tanggal, item, kategori, nominal, tipe, status, metode, keterangan } = req.body;
  if (!item || !nominal || Number(nominal) <= 0) {
    return res.status(400).json({ error: 'Item dan nominal wajib diisi valid' });
  }

  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Transaksi!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[tanggal, item, kategori, nominal, tipe, status, keterangan || '', metode]],
      },
    });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}