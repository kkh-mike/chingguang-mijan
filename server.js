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
    secret: 'chingguang-mijan-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 60 * 60 * 1000,
        httpOnly: true
    }
}));

// === 後台登入相關 ===
const ADMIN_PASSWORD = '123';   // ← 建議修改成更安全的密碼

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true, redirect: '/admin' });
    } else {
        res.status(401).json({ success: false, message: '密碼錯誤' });
    }
});

// 登入檢查中間件 - 改進版
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }

    // 如果是 AJAX / API 請求 → 回傳 JSON
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, message: '請先登入後台' });
    }

    // 如果是一般頁面請求 → 直接跳轉登入頁
    res.redirect('/admin-login');
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

// === 後台路由（已優化）===
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/orders', requireAdmin, (req, res) => {           // ← 推薦新路徑
  res.sendFile(path.join(__dirname, 'public', 'admin-orders.html'));
});

app.get('/admin/products', requireAdmin, (req, res) => {         // ← 推薦新路徑
  res.sendFile(path.join(__dirname, 'public', 'admin-products.html'));
});

// 保留舊路徑相容性
app.get('/admin-orders', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-orders.html'));
});

app.get('/admin-products', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-products.html'));
});

// === API 路由 ===
// 前台商品 API
app.get('/api/products', (req, res) => {
  const activeProducts = products.filter(p => p.isActive !== false);
  res.json(activeProducts);
});

// 後台取得全部商品
app.get('/api/admin/products', requireAdmin, (req, res) => {
  res.json(products);
});

// 切換商品上下架
app.put('/api/admin/products/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  const product = products.find(p => p.id === parseInt(id));
  
  if (!product) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  product.isActive = !product.isActive;
  
  res.json({ 
    success: true, 
    isActive: product.isActive,
    message: product.isActive ? '✅ 已上架' : '✅ 已下架' 
  });
});

// === 建立訂單 ===
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
        message: '缺少必要欄位'
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

// === 銷售統計 API ===
app.get('/api/sales-stats', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    const todayOrders = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = $1`, [today]
    );

    const monthOrders = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE created_at >= $1`, [firstDayOfMonth]
    );

    const monthRevenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE created_at >= $1`, [firstDayOfMonth]
    );

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
// 後台訂單 API（已修正，包含 cancel_reason）
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
        o.cancel_reason,           -- ← 新增
        o.status_updated_at,       -- ← 新增
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
      GROUP BY 
        o.id, o.receiver, o.phone, o.address, o.remark, 
        o.total_amount, o.status, o.cancel_reason, 
        o.status_updated_at, o.created_at
      ORDER BY o.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新訂單狀態（最終版本）
app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancel_reason } = req.body;

    // 驗證允許狀態
    const allowedStatuses = ['待確認', '已確認', '已出貨', '已完成', '已取消'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '無效狀態' });
    }

    // 取得目前狀態
    const current = await pool.query('SELECT status FROM orders WHERE id = $1', [id]);
    const oldStatus = current.rows[0]?.status;

    if (oldStatus === '已完成' && status !== '已完成') {
      return res.status(400).json({ success: false, message: '已完成訂單無法變更' });
    }

    const result = await pool.query(
      `UPDATE orders 
       SET status = $1, 
           cancel_reason = $2,
           status_updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, cancel_reason || null, id]
    );

    // 記錄狀態歷史
    if (oldStatus !== status) {
      await pool.query(
        `INSERT INTO order_status_history (order_id, old_status, new_status, reason)
         VALUES ($1, $2, $3, $4)`,
        [id, oldStatus, status, cancel_reason]
      );
    }

    res.json({ success: true, order: result.rows[0] });
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
  console.log('後台訂單管理頁面：http://localhost:3000/admin/orders');
});