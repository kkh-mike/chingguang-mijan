const express = require('express');
const path = require('path');
const products = require('./data/products');

const app = express();

app.use(express.static('public'));

// 首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 商品頁
app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'products.html'));
});

// 商品 API
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});