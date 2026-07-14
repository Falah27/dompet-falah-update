const API_KEY = 'buat-string-acak-panjang-sendiri-disini'; // sama dengan API_SECRET
const KATEGORI_PEMASUKAN = ["Gaji","Bonus","Hadiah","Pembayaran","Penjualan","Transfer Internal","Lainnya"];
const KATEGORI_PENGELUARAN = ["Makan","Jajan","Belanja","Hiburan","Transport","Kesehatan","Tagihan","Amal","Saving","Transfer Internal","Lainnya"];
const METODE = ["Cash","Livin (Mandiri)","Octo (CIMB)","DANA","Shopeepay","Kartu Kredit"];
const BUDGET_LIMIT = { Makan: 1000000, Jajan: 300000, Transport: 400000 }; // sesuaikan sendiri

let state = { transaksi: [], dompet: [], target: [] };

async function apiCall(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...(opts.headers || {}) },
  });
  return res.json();
}

async function loadData() {
  const data = await apiCall('/api/data');
  state = data;
  renderDashboard();
  renderWallets();
  renderTable(state.transaksi);
  fillTransferSelects();
}

function renderDashboard() {
  const real = state.transaksi.filter(t => t.Kategori !== 'Transfer Internal');
  const income = real.filter(t => t.Tipe === 'Pemasukan').reduce((s, t) => s + Number(t.Nominal), 0);
  const expense = real.filter(t => t.Tipe === 'Pengeluaran').reduce((s, t) => s + Number(t.Nominal), 0);

  document.getElementById('summary-cards').innerHTML = `
    <div class="card green"><div>📈 Pemasukan</div><h2>Rp ${income.toLocaleString('id-ID')}</h2></div>
    <div class="card red"><div>📉 Pengeluaran</div><h2>Rp ${expense.toLocaleString('id-ID')}</h2></div>
    <div class="card blue"><div>💰 Sisa Saldo</div><h2>Rp ${(income - expense).toLocaleString('id-ID')}</h2></div>
  `;

  // Chart kategori
  const catData = {};
  real.filter(t => t.Tipe === 'Pengeluaran').forEach(t => {
    catData[t.Kategori] = (catData[t.Kategori] || 0) + Number(t.Nominal);
  });
  new Chart(document.getElementById('chart-kategori'), {
    type: 'doughnut',
    data: { labels: Object.keys(catData), datasets: [{ data: Object.values(catData) }] },
  });

  // Budget progress (fitur baru)
  document.getElementById('budget-progress').innerHTML = '<h3>🎯 Budget Kategori</h3>' +
    Object.entries(BUDGET_LIMIT).map(([kat, limit]) => {
      const used = catData[kat] || 0;
      const pct = Math.min(100, (used / limit) * 100);
      return `<div>${kat}: Rp ${used.toLocaleString('id-ID')} / Rp ${limit.toLocaleString('id-ID')}
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%; background:${pct >= 100 ? 'var(--red)' : 'var(--green)'}"></div></div></div>`;
    }).join('');

  // Target impian progress (fitur baru)
  document.getElementById('target-progress').innerHTML = '<h3>🌟 Target Impian</h3>' +
    state.target.map(t => {
      const pct = Math.min(100, (Number(t['Dana Terkumpul']) / Number(t['Target Harga'])) * 100);
      return `<div>${t['Nama Impian']}: ${pct.toFixed(0)}%
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
}

function renderWallets() {
  document.getElementById('wallet-cards').innerHTML = state.dompet.map(w => {
    const resetDate = new Date(w['Tanggal Reset']);
    const mutasi = state.transaksi.filter(t => t['Metode Pembayaran'] === w.Wallet && new Date(t.Tanggal) >= resetDate);
    const masuk = mutasi.filter(t => t.Tipe === 'Pemasukan').reduce((s, t) => s + Number(t.Nominal), 0);
    const keluar = mutasi.filter(t => t.Tipe === 'Pengeluaran').reduce((s, t) => s + Number(t.Nominal), 0);
    const saldo = Number(w['Saldo Awal']) + masuk - keluar;
    return `<div class="wallet-card"><div>${w.Wallet}</div><h3>Rp ${saldo.toLocaleString('id-ID')}</h3></div>`;
  }).join('');
}

function renderTable(rows) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = rows.slice().reverse().map(r => `
    <tr><td>${r.Tanggal}</td><td>${r.Item}</td><td>${r.Kategori}</td>
    <td>Rp ${Number(r.Nominal).toLocaleString('id-ID')}</td><td>${r.Tipe}</td><td>${r.Status}</td></tr>
  `).join('');
}

// --- Transfer Internal ---
function fillTransferSelects() {
  const wallets = state.dompet.map(w => w.Wallet);
  if (!wallets.includes('Cash')) wallets.push('Cash');
  const src = document.getElementById('tf-source');
  const tgt = document.getElementById('tf-target');
  src.innerHTML = wallets.map(w => `<option>${w}</option>`).join('');
  tgt.innerHTML = wallets.filter(w => w !== src.value).map(w => `<option>${w}</option>`).join('');
  src.onchange = () => {
    tgt.innerHTML = wallets.filter(w => w !== src.value).map(w => `<option>${w}</option>`).join('');
  };
}

document.getElementById('form-transfer').onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    tanggal: document.getElementById('tf-tanggal').value,
    nominal: document.getElementById('tf-nominal').value,
    source: document.getElementById('tf-source').value,
    target: document.getElementById('tf-target').value,
    note: document.getElementById('tf-note').value,
  };
  if (payload.source === payload.target) return alert('Sumber dan tujuan tidak boleh sama');
  const result = await apiCall('/api/transfer', { method: 'POST', body: JSON.stringify(payload) });
  if (result.success) { alert('Transfer berhasil!'); e.target.reset(); loadData(); }
  else alert(result.error);
};

// --- Kelola Utang ---
function renderUtang() {
  const utang = state.transaksi.filter(t => t.Status === 'Belum Lunas');
  const list = document.getElementById('utang-list');
  if (utang.length === 0) {
    list.innerHTML = '<p class="hint">✅ Tidak ada tanggungan saat ini.</p>';
    return;
  }
  list.innerHTML = utang.map(t => `
    <div class="utang-item" data-row="${t.rowNumber}">
      <div class="info"><b>${t.Item}</b>${t.Kategori} · Rp ${Number(t.Nominal).toLocaleString('id-ID')}</div>
      <select class="utang-status"><option value="Belum Lunas">Belum Lunas</option><option value="Lunas">Lunas</option></select>
      <select class="utang-metode">${METODE.map(m => `<option>${m}</option>`).join('')}</select>
      <button class="utang-save">Simpan</button>
    </div>
  `).join('');

  document.querySelectorAll('.utang-save').forEach(btn => {
    btn.onclick = async () => {
      const item = btn.closest('.utang-item');
      const rowNumber = item.dataset.row;
      const status = item.querySelector('.utang-status').value;
      const metode = item.querySelector('.utang-metode').value;
      const result = await apiCall('/api/update-transaction-status', {
        method: 'POST', body: JSON.stringify({ rowNumber, status, metode }),
      });
      if (result.success) { alert('Berhasil diperbarui!'); loadData(); }
      else alert(result.error);
    };
  });
}

// --- Tabs di halaman Data ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'utang') renderUtang();
  };
});

// Nav
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-btn, .page').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${btn.dataset.page}`).classList.add('active');
  };
});

// Populate selects
function fillOptions() {
  const kat = document.getElementById('in-kategori');
  const tipe = document.getElementById('in-tipe').value;
  kat.innerHTML = (tipe === 'Pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN).map(k => `<option>${k}</option>`).join('');
  document.getElementById('in-metode').innerHTML = METODE.map(m => `<option>${m}</option>`).join('');
}
document.getElementById('in-tipe').onchange = fillOptions;
fillOptions();

// Form submit
document.getElementById('form-transaksi').onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    tanggal: document.getElementById('in-tanggal').value,
    item: document.getElementById('in-item').value,
    kategori: document.getElementById('in-kategori').value,
    nominal: document.getElementById('in-nominal').value,
    tipe: document.getElementById('in-tipe').value,
    status: 'Lunas',
    metode: document.getElementById('in-metode').value,
    keterangan: document.getElementById('in-keterangan').value,
  };
  const result = await apiCall('/api/add-transaction', { method: 'POST', body: JSON.stringify(payload) });
  if (result.success) { alert('Tersimpan!'); e.target.reset(); loadData(); }
  else alert(result.error);
};

// Search
document.getElementById('search-box').oninput = (e) => {
  const q = e.target.value.toLowerCase();
  renderTable(state.transaksi.filter(t => t.Item?.toLowerCase().includes(q)));
};

loadData();