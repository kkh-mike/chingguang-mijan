const express = require('express');
const path = require('path');
const session = require('express-session');
const products = require('./data/products');
const pool = require('./db');

const app = express();

// === 中間件 ===
app.use(express.static('public'));
app.use(express.json());

// Session 設定
app.use(session({
    secret: 'chingguang-mijan-secret-2026',   // 建議改成更長更隨機的字串
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 60 * 60 * 1000,   // 1小時
        httpOnly: true
    }
}));

// === 後台登入相關 ===
const ADMIN_PASSWORD = '123';   // ←←← 務必修改成安全的密碼！

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true, redirect: '/admin' });   // 改成導向後台首頁
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

// === 後台路由 ===
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));   // 後台首頁
});

app.get('/admin-orders', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-orders.html'));
});

// === API 路由 ===
// 商品 API
app.get('/api/products', (req, res) => {
  res.json(products);
});

// 建立訂單（前台使用）
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

// === 新增：銷售統計 API (Phase 8.6) ===
app.get('/api/sales-stats', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    // 今日訂單數
    const todayOrders = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = $1`,
      [today]
    );

    // 本月訂單數
    const monthOrders = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE created_at >= $1`,
      [firstDayOfMonth]
    );

    // 本月營業額
    const monthRevenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE created_at >= $1`,
      [firstDayOfMonth]
    );

    // 熱銷排行（前5名）
    const hotSales = await pool.query(`
      SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_qty
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1
      GROUP BY oi.product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `, [firstDayOfMonth]);

    res.json({
      todayOrders: parseInt(todayOrders.rows[0].count),
      monthOrders: parseInt(monthOrders.rows[0].count),
      monthRevenue: parseInt(monthRevenue.rows[0].revenue),
      hotSales: hotSales.rows
    });
  } catch (err) {
    console.error('取得銷售統計失敗', err);
    res.status(500).json({ error: '取得銷售統計失敗' });
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

// 後台訂單 API
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
  console.log('🚀 Server running on http://localhost:3000');
});