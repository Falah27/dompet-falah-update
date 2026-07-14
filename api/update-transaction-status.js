import { getSheetsClient, SPREADSHEET_ID, checkAuth } from './_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAuth(req, res)) return;

  const { rowNumber, status, metode } = req.body;
  if (!rowNumber) return res.status(400).json({ error: 'rowNumber wajib diisi' });

  try {
    const sheets = await getSheetsClient();
    // Kolom F = Status, Kolom H = Metode Pembayaran (sesuaikan urutan kolom Transaksi kamu)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `Transaksi!F${rowNumber}`, values: [[status]] },
          { range: `Transaksi!H${rowNumber}`, values: [[metode]] },
        ],
      },
    });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}