const express = require('express');
const path = require('path');
const session = require('express-session');   // ← 新增
const products = require('./data/products');
const pool = require('./db');

const app = express();

// === 中間件 ===
app.use(express.static('public'));
app.use(express.json());

// Session 設定（重要！）
app.use(session({
    secret: 'chingguang-mijan-secret-2026',   // 建議改成更長更亂的字串
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 60 * 60 * 1000,   // 1小時自動過期
        httpOnly: true
    }
}));

// === 後台登入相關 ===
const ADMIN_PASSWORD = '123';   // ←←← 務必修改！

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true, redirect: '/admin-orders' });
    } else {
        res.status(401).json({ success: false, message: '密碼錯誤' });
    }
});

// 登入檢查中間件
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ success: false, message: '請先登入後台' });
}

// === 頁面路由 ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'products.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'success.html'));
});

// 保護後台頁面
app.get('/admin-orders', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-orders.html'));
});

// === API 路由 ===
// 商品 API
app.get('/api/products', (req, res) => {
  res.json(products);
});

// 新增：建立訂單 API（前台使用，不需要保護）
app.post('/api/orders', async (req, res) => {
  console.log('========== 收到訂單 ==========');
  console.log(req.body);

  try {
    const {
      receiver,
      phone,
      address,
      remark,
      totalAmount,
      items = []
    } = req.body;

    if (!receiver || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: '缺少必要欄位',
        data: { receiver, phone, address, totalAmount }
      });
    }

    const result = await pool.query(
      `INSERT INTO orders (receiver, phone, address, remark, total_amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [receiver, phone, address, remark || null, totalAmount || 0]
    );

    const orderId = result.rows[0].id;

    for (const item of items) {
      const product = products.find(p => p.id === item.id);
      if (!product) continue;

      await pool.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, product.id, product.name, product.price, item.qty]
      );
    }

    res.json({ success: true, orderId });
  } catch (err) {
    console.error('建立訂單失敗', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 測試資料庫連線
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 保護的後台 API
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.receiver,
        o.phone,
        o.address,
        o.remark,
        o.total_amount,
        o.status,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'product_name', oi.product_name,
              'price', oi.price,
              'quantity', oi.quantity
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, o.receiver, o.phone, o.address, o.remark, o.total_amount, o.status, o.created_at
      ORDER BY o.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2`,
      [status, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 登出
app.get('/admin-logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/admin-login');
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});