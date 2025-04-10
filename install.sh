#!/bin/bash

# Periksa versi OS
OS_VERSION=$(lsb_release -ds)

# Daftar versi Debian dan Ubuntu yang didukung
supported_versions=("Debian GNU/Linux 10 (buster)" "Debian GNU/Linux 11 (bullseye)" "Debian GNU/Linux 12 (bookworm)"
                    "Ubuntu 18.04 LTS" "Ubuntu 20.04.6 LTS" "Ubuntu 22.04 LTS" "Ubuntu 24.04 LTS")

# Periksa apakah versi OS didukung
if [[ ! " ${supported_versions[@]} " =~ " ${OS_VERSION} " ]]; then
  echo "Versi OS tidak didukung. Versi yang didukung: ${supported_versions[*]}"
  exit 1
fi

# Update dan upgrade sistem
echo "Memperbarui sistem..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js dan npm
echo "Menginstal Node.js dan npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install git
echo "Menginstal git..."
sudo apt-get install -y git

# Install SQLite3
echo "Menginstal SQLite3..."
sudo apt-get install -y sqlite3

# Buat direktori untuk bot
echo "Membuat direktori untuk bot..."
sudo mkdir -p /usr/bin/BOT_STORE

# Clone repositori dari GitHub
echo "Mengkloning repositori dari GitHub..."
git clone https://github.com/ftpcorp/BOT_STORE.git /usr/bin/BOT_STORE

# Install dependensi Node.js
echo "Menginstal dependensi Node.js..."
cd /usr/bin/BOT_STORE
sudo npm install

# Konfigurasi nama toko
echo "Masukkan nama toko:"
read store_name

# Ganti nama toko di script bot
sudo sed -i "s/FTP STORE BOT/${store_name}/g" /usr/bin/BOT_STORE/bot.js

# Buat file .env
echo "Membuat file .env..."

# Input detail untuk .env
echo "MASUKKAN BOT TOKEN ANDA!!"
read TELEGRAM_TOKEN
echo "MASUKKAN ID ADMIN!!!"
read ADMIN_ID
echo "MASUKKAN TRIPAY API KEY ANDA!!"
read TRIPAY_API_KEY
echo "MASUKKAN TRIPAY SECRET KEY ANDA!!"
read TRIPAY_SECRET_KEY
echo "MASUKKAN WEBHOOK URL ANDA!!"
read WEBHOOK_URL
echo "MASUKKAN RETURN URL ANDA!!"
read RETURN_URL

# Tentukan port secara otomatis
PORT=3000

# Tulis ke file .env
sudo cat <<EOF > /usr/bin/BOT_STORE/.env
TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
TRIPAY_API_KEY=${TRIPAY_API_KEY}
TRIPAY_SECRET_KEY=${TRIPAY_SECRET_KEY}
WEBHOOK_URL=${WEBHOOK_URL}
RETURN_URL=${RETURN_URL}
PORT=${PORT}
STORE_NAME=${store_name}
ADMIN_ID=${ADMIN_ID}
EOF

echo "File .env telah dibuat dengan detail yang dimasukkan."

# Buat file systemd service
echo "Membuat file systemd service..."

sudo cat <<EOF > /etc/systemd/system/bot_store.service
[Unit]
Description=BOT_STORE Telegram Bot
After=network.target

[Service]
ExecStart=/usr/bin/node /usr/bin/BOT_STORE/index.js
WorkingDirectory=/usr/bin/BOT_STORE
Restart=always
User=nobody
Group=nogroup
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd dan jalankan service
echo "Reload systemd dan jalankan service..."
sudo systemctl daemon-reload
sudo systemctl enable bot_store.service
sudo systemctl start bot_store.service

echo "Bot Telegram berjalan di latar belakang dan akan tetap berjalan saat tidak login ke VPS."
