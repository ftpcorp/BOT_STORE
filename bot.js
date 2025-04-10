// bot.js
const TelegramBot = require('node-telegram-bot-api');
const products = require('./products');
require('dotenv').config();

// Konfigurasi Telegram Bot
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Daftar admin dari .env
const admins = {
  [process.env.ADMIN_ID]: process.env.ADMIN_ID
};

// Fungsi untuk memeriksa apakah pengguna adalah admin
function isAdmin(chatId) {
  return Object.keys(admins).includes(chatId.toString());
}

// Handler command /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Pesan selamat datang
  let welcomeMessage = `Selamat datang di FTP STORE BOT! 🛒\n\n`; // Placeholder untuk diganti oleh script instalasi
  welcomeMessage += `Untuk melihat daftar produk, ketik /menu.\n`;
  welcomeMessage += `Untuk membeli produk, gunakan perintah /buy kodeproduk jumlah.`;

  bot.sendMessage(chatId, welcomeMessage);
});

// Handler command /menu
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;

  products.getProducts((products) => {
    if (products.length === 0) {
      return bot.sendMessage(chatId, 'Tidak ada produk tersedia saat ini.');
    }

    // Format daftar produk
    let productList = `📋 PRODUCT LIST 📦\n\n`;

    products.forEach(product => {
      productList += `📦 *${product.nama}* - ${product.kode}\n`;
      productList += `💰 Harga: Rp${product.harga.toLocaleString()}\n`;
      productList += `📦 Stok Tersedia: ${product.stok_tersedia}\n`;
      productList += `🛒 Stok Terjual: ${product.stok_terjual}\n`;
      productList += `📝 Deskripsi: ${product.deskripsi}\n`;
      productList += `⌨️ Ketik: /buy ${product.kode} jumlah\n\n`;
    });

    // Kirim pesan dengan format Markdown
    bot.sendMessage(chatId, productList, {parse_mode: 'Markdown'});
  });
});

// Handler command /buy
bot.onText(/\/buy (\w+) (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const kode = match[1];
  const jumlah = parseInt(match[2]);

  // Cari produk berdasarkan kode
  products.getProductByKode(kode, (product) => {
    if (!product) {
      return bot.sendMessage(chatId, 'Produk tidak ditemukan!');
    }

    // Validasi stok
    if (product.stok_tersedia < jumlah) {
      return bot.sendMessage(chatId, 'Maaf, stok produk tidak mencukupi.');
    }

    // Hitung total harga
    const total = product.harga * jumlah;

    // Panggil API Tripay untuk generate QRIS
    tripay.generateQRIS(chatId, product, jumlah)
      .then(response => {
        const paymentUrl = response.data.data.payment_url;
        const qrCode = response.data.data.qr_code;

        // Kirim QRIS ke pengguna
        bot.sendPhoto(chatId, qrCode, {
          caption: `Anda membeli ${product.nama} sejumlah ${jumlah}.\nTotal: Rp${total.toLocaleString()}\n\nScan QRIS untuk membayar:`,
          reply_to_message_id: msg.message_id
        });

        // Simpan transaksi (sesuaikan dengan database Anda)
        console.log('Transaksi:', response.data);
      })
      .catch(error => {
        console.error('Error Tripay:', error.response.data);
        bot.sendMessage(chatId, 'Terjadi kesalahan saat membuat pembayaran. Coba lagi.');
      });
  });
});

// Handler command /admin
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;

  // Periksa apakah pengguna adalah admin
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk mengakses menu admin.');
  }

  // Daftar perintah admin
  const adminCommands = `
  Selamat datang di menu admin!\n
  Berikut adalah perintah yang tersedia:
  - /add mail:email pw:password 2vl:kodeunik kodeproduk
  - /edit kodeproduk deskripsi
  - /editharga kodeproduk harga
  - /delete kodeproduk
  `;

  bot.sendMessage(chatId, adminCommands);
});

// Handler command /add
bot.onText(/\/add mail:(\S+) pw:(\S+) 2vl:(\S+) (\w+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const email = match[1];
  const password = match[2];
  const kodeUnik = match[3];
  const kode = match[4];

  // Periksa apakah pengguna adalah admin
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk menambahkan produk.');
  }

  // Cek jika produk sudah ada
  products.getProductByKode(kode, (product) => {
    if (product) {
      // Jika produk sudah ada, tambahkan stok tersedia
      products.updateProduct(kode, {stok_tersedia: product.stok_tersedia + 1});
      bot.sendMessage(chatId, `Stok produk ${kode} berhasil diperbarui!\nStok Tersedia: ${product.stok_tersedia + 1}`);
    } else {
      // Tambahkan produk baru dengan detail default
      products.addProduct({kode, nama: '', harga: 0, stok_tersedia: 1, stok_terjual: 0, deskripsi: '', email, password, kode_unik});
      bot.sendMessage(chatId, `Produk baru berhasil ditambahkan!\nKode: ${kode}\nEmail: ${email}\nPassword: ${password}\nKode Verifikasi: ${kodeUnik}\nSilakan gunakan /edit untuk mengisi detail produk.`);
    }
  });
});

// Handler command /edit
bot.onText(/\/edit (\w+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const kode = match[1];
  const deskripsi = match[2];

  // Periksa apakah pengguna adalah admin
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk mengedit produk.');
  }

  // Cari produk berdasarkan kode
  products.getProductByKode(kode, (product) => {
    if (!product) {
      return bot.sendMessage(chatId, 'Produk tidak ditemukan!');
    }

    // Update produk
    products.updateProduct(kode, {deskripsi});
    bot.sendMessage(chatId, `Produk berhasil diperbarui!\nKode: ${kode}\nDeskripsi: ${deskripsi}`);
  });
});

// Handler command /editharga
bot.onText(/\/editharga (\w+) (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const kode = match[1];
  const harga = parseInt(match[2]);

  // Periksa apakah pengguna adalah admin
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk mengedit produk.');
  }

  // Cari produk berdasarkan kode
  products.getProductByKode(kode, (product) => {
    if (!product) {
      return bot.sendMessage(chatId, 'Produk tidak ditemukan!');
    }

    // Update produk
    products.updateProduct(kode, {harga});
    bot.sendMessage(chatId, `Produk berhasil diperbarui!\nKode: ${kode}\nHarga: Rp${harga.toLocaleString()}`);
  });
});

// Handler command /delete
bot.onText(/\/delete (\w+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const kode = match[1];

  // Periksa apakah pengguna adalah admin
  if (!isAdmin(chatId)) {
    return bot.sendMessage(chatId, 'Anda tidak memiliki izin untuk menghapus produk.');
  }

  // Cari produk berdasarkan kode
  products.getProductByKode(kode, (product) => {
    if (!product) {
      return bot.sendMessage(chatId, 'Produk tidak ditemukan!');
    }

    // Hapus produk
    products.deleteProduct(kode);
    bot.sendMessage(chatId, `Produk dengan kode ${kode} berhasil dihapus.`);
  });
});

module.exports = bot;