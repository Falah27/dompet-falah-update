import { getSheetsClient, SPREADSHEET_ID, checkAuth } from './_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAuth(req, res)) return;

  const { tanggal, nominal, source, target, note } = req.body;
  if (!nominal || Number(nominal) <= 0) {
    return res.status(400).json({ error: 'Nominal harus lebih dari 0' });
  }

  let itemOut, itemIn;
  if (target === 'Cash') { itemOut = `Tarik Tunai (dari ${source})`; itemIn = `Tarik Tunai (Masuk Dompet)`; }
  else if (source === 'Cash') { itemOut = `Setor Tunai (dari Dompet)`; itemIn = `Setor Tunai (ke ${target})`; }
  else { itemOut = `Transfer ke ${target}`; itemIn = `Transfer dari ${source}`; }

  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Transaksi!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [tanggal, itemOut, 'Transfer Internal', nominal, 'Pengeluaran', 'Lunas', note || '', source],
          [tanggal, itemIn, 'Transfer Internal', nominal, 'Pemasukan', 'Lunas', note || '', target],
        ],
      },
    });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}