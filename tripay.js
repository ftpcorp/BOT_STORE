// tripay.js
const axios = require('axios');
require('dotenv').config();

// Konfigurasi Tripay
const tripayApiKey = process.env.TRIPAY_API_KEY;
const tripaySecretKey = process.env.TRIPAY_SECRET_KEY;
const tripayUrl = 'https://api.tripay.id/v2';

// Fungsi untuk menghasilkan QRIS
async function generateQRIS(chatId, product, jumlah) {
  const total = product.harga * jumlah;

  try {
    const response = await axios.post(
      `${tripayUrl}/payment`,
      {
        "payment_method": "qris",
        "amount": total,
        "merchant_ref": `ORDER_${product.kode}_${new Date().getTime()}`,
        "customer_name": 'Customer',
        "customer_email": 'customer@example.com',
        "callback_url": process.env.WEBHOOK_URL, // URL webhook untuk verifikasi pembayaran
        "return_url": process.env.RETURN_URL, // URL kembali setelah pembayaran
        "metadata": {
          "product": product.nama,
          "quantity": jumlah,
          "chat_id": chatId,
          "product_kode": product.kode
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tripayApiKey}`
        }
      }
    );

    return response;
  } catch (error) {
    throw error;
  }
}

// Handler webhook Tripay
function webhookHandler(req, res) {
  const data = req.body;

  // Verifikasi signature
  const signature = Buffer.from(data.signature, 'base64').toString('utf-8');
  const generatedSignature = Buffer.from(tripayApiKey + JSON.stringify(data.data)).toString('base64');

  if (signature !== generatedSignature) {
    return res.status(400).send('Invalid signature');
  }

  // Proses data pembayaran
  if (data.event === 'TRANSACTION_STATUS' && data.data.status === 'PAID') {
    const chatId = data.data.metadata.chat_id;
    const productKode = data.data.metadata.product_kode;
    const quantity = parseInt(data.data.metadata.quantity);

    // Cari produk berdasarkan kode
    products.getProductByKode(productKode, (product) => {
      if (!product) {
        return res.status(404).send('Produk tidak ditemukan');
      }

      // Kurangi stok tersedia dan tambahkan stok terjual
      if (product.stok_tersedia >= quantity) {
        products.updateProduct(productKode, {
          stok_tersedia: product.stok_tersedia - quantity,
          stok_terjual: product.stok_terjual + quantity
        });

        // Kirim pesan konfirmasi pembayaran dan pengiriman produk
        const confirmationMessage = `
        Pembayaran berhasil!\n
        Produk: ${product.nama}\n
        Jumlah: ${quantity}\n
        Total: Rp${(product.harga * quantity).toLocaleString()}\n
        Produk akan dikirimkan segera.
        `;

        bot.sendMessage(chatId, confirmationMessage);

        // Kirim detail produk ke pengguna
        for (let i = 0; i < quantity; i++) {
          // Ambil detail produk yang tersedia
          products.getProductByKode(productKode, (productDetail) => {
            if (!productDetail || productDetail.stok_tersedia <= 0) {
              bot.sendMessage(chatId, 'Maaf, stok produk habis.');
              return;
            }

            const detailMessage = `
            🔐 Detail Produk:\n
            Nama: ${productDetail.nama}\n
            Email: ${productDetail.email}\n
            Password: ${productDetail.password}\n
            Kode Verifikasi: ${productDetail.kode_unik}\n
            `;

            bot.sendMessage(chatId, detailMessage);

            // Kurangi stok tersedia setelah mengirim detail
            products.updateProduct(productKode, {
              stok_tersedia: productDetail.stok_tersedia - 1
            });
          });
        }

        // Simpan transaksi (sesuaikan dengan database Anda)
        console.log('Transaksi diverifikasi:', data.data);
      } else {
        return res.status(400).send('Stok tidak mencukupi');
      }
    });
  }

  res.status(200).send('OK');
}

module.exports = {
  generateQRIS,
  webhookHandler
};