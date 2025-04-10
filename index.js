// index.js
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const bot = require('./bot');
const tripay = require('./tripay');
const products = require('./products');
require('dotenv').config();

// Konfigurasi Telegram Bot
const token = process.env.TELEGRAM_TOKEN;
const botInstance = new TelegramBot(token, {polling: true});

// Setup Express untuk webhook Tripay
const app = express();
app.use(bodyParser.json());

// Route untuk webhook Tripay
app.post('/webhook/tripay', tripay.webhookHandler);

// Inisialisasi database
products.initialize();

// Jalankan server Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log('Bot Telegram berjalan...');