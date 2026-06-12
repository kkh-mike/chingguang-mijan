const express = require('express');
const path = require('path');
const products = require('./data/products');

const app = express();
const pool = require('./db');

// === 中間件 ===
app.use(express.static('public'));
app.use(express.json());        // ← 重要！讓 Express 可以解析 JSON body

// === 路由 ===
// 頁面路由
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

// === API 路由 ===
// 商品 API
app.get('/api/products', (req, res) => {
  res.json(products);
});

// 新增：建立訂單 API
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

    // 基本驗證
    if (!receiver || !phone || !address) {

      return res.status(400).json({
        success: false,
        message: '缺少必要欄位',
        data: {
          receiver,
          phone,
          address,
          totalAmount
        }
      });

    }

    const result = await pool.query(
      `
      INSERT INTO orders
      (
        receiver,
        phone,
        address,
        remark,
        total_amount
      )
      VALUES
      (
        $1,$2,$3,$4,$5
      )
      RETURNING id
      `,
      [
        receiver,
        phone,
        address,
        remark || null,
        totalAmount || 0
      ]
    );

    const orderId = result.rows[0].id;

// 新增訂單明細
for (const item of items) {

  const product =
    products.find(
      p => p.id === item.id
    );

  if (!product) continue;

  await pool.query(
    `
    INSERT INTO order_items
    (
      order_id,
      product_id,
      product_name,
      price,
      quantity
    )
    VALUES
    (
      $1,$2,$3,$4,$5
    )
    `,
    [
      orderId,
      product.id,
      product.name,
      product.price,
      item.qty
    ]
  );
}

res.json({
  success: true,
  orderId
});

  } catch (err) {

    console.error('建立訂單失敗');
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

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

app.listen(3000, () => {
  console.log('Server running on port 3000');
});


app.get('/admin-orders', (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      'public',
      'admin-orders.html'
    )
  );
});


app.get('/api/orders', async (req, res) => {

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

      LEFT JOIN order_items oi
        ON o.id = oi.order_id

      GROUP BY
        o.id,
        o.receiver,
        o.phone,
        o.address,
        o.remark,
        o.total_amount,
        o.status,
        o.created_at

      ORDER BY o.id DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});

app.put('/api/orders/:id/status', async (req, res) => {

  try {

    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      `,
      [status, id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});