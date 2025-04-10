// products.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/usr/bin/BOT_STORE/products.db');

// Inisialisasi database
function initialize() {
  db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS products (kode TEXT PRIMARY KEY, nama TEXT, harga INTEGER, stok_tersedia INTEGER, stok_terjual INTEGER, deskripsi TEXT, email TEXT, password TEXT, kode_unik TEXT)");
  });
}

// Fungsi untuk menambahkan produk
function addProduct(product) {
  const stmt = db.prepare("INSERT INTO products (kode, nama, harga, stok_tersedia, stok_terjual, deskripsi, email, password, kode_unik) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  stmt.run(product.kode, product.nama, product.harga, product.stok_tersedia, product.stok_terjual, product.deskripsi, product.email, product.password, product.kode_unik);
  stmt.finalize();
}

// Fungsi untuk mengambil semua produk
function getProducts(callback) {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) {
      throw err;
    }
    callback(rows);
  });
}

// Fungsi untuk mengambil produk berdasarkan kode
function getProductByKode(kode, callback) {
  db.get("SELECT * FROM products WHERE kode = ?", [kode], (err, row) => {
    if (err) {
      throw err;
    }
    callback(row);
  });
}

// Fungsi untuk mengupdate produk
function updateProduct(kode, updates) {
  let query = "UPDATE products SET ";
  let values = [];
  let i = 0;

  for (const key in updates) {
    if (updates.hasOwnProperty(key)) {
      if (i > 0) {
        query += ", ";
      }
      query += `${key} = ?`;
      values.push(updates[key]);
      i++;
    }
  }

  query += " WHERE kode = ?";
  values.push(kode);

  const stmt = db.prepare(query);
  stmt.run(...values);
  stmt.finalize();
}

// Fungsi untuk menghapus produk
function deleteProduct(kode) {
  const stmt = db.prepare("DELETE FROM products WHERE kode = ?");
  stmt.run(kode);
  stmt.finalize();
}

module.exports = {
  initialize,
  addProduct,
  getProducts,
  getProductByKode,
  updateProduct,
  deleteProduct
};