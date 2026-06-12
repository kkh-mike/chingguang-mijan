// public/js/cart.js

let allProducts = [];

// 載入最新商品狀態（包含 isActive）
async function loadCurrentProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
    } catch (e) {
        console.error('載入商品狀態失敗', e);
    }
}

// 取得商品最新資訊
function getProductInfo(id) {
    return allProducts.find(p => p.id === id);
}

// 渲染購物車
async function loadCart() {
    await loadCurrentProducts();   // 取得最新上下架狀態

    const cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    const cartItems = document.getElementById('cartItems');
    let total = 0;
    let hasDelisted = false;

    cartItems.innerHTML = '';

    // 購物車為空
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <h3>🛒 購物車是空的</h3>
                <p class="mt-3">快去挑選喜歡的蜜餞吧～</p>
                <a href="/products" class="btn btn-warning">前往購物</a>
            </div>
        `;
        document.getElementById('totalPrice').innerText = 'NT$0';
        return;
    }

    cart.forEach(item => {
        const product = getProductInfo(item.id);

        // 商品不存在或已下架
        if (!product) {
            hasDelisted = true;
            cartItems.innerHTML += `
                <div class="cart-card">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <img src="/images/no-image.jpg" 
                                 class="img-fluid rounded" 
                                 style="width:100%; height:150px; object-fit:cover;">
                        </div>
                        <div class="col-md-6">
                            <h4 class="fw-bold text-muted">商品已不存在</h4>
                            <span class="badge bg-danger">已下架</span>
                        </div>
                        <div class="col-md-3 text-end">
                            <button class="btn btn-danger" onclick="removeItem(${item.id})">刪除</button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const isActive = product.isActive !== false;
        const subtotal = product.price * item.qty;

        if (!isActive) hasDelisted = true;

        cartItems.innerHTML += `
        <div class="cart-card">
            <div class="row align-items-center">
                <div class="col-md-3">
                    <img src="${product.image || '/images/no-image.jpg'}" 
                         class="img-fluid rounded" 
                         style="width:100%; height:150px; object-fit:cover;"
                         alt="${product.name}">
                </div>
                <div class="col-md-6">
                    <h4 class="fw-bold">${product.name}</h4>
                    ${!isActive ? `<span class="badge bg-danger mb-2">已下架</span>` : ''}
                    <p class="product-price">單價：NT$${product.price}</p>

                    <div class="d-flex align-items-center gap-2 mt-3">
                        <button class="btn btn-outline-secondary qty-btn" 
                                onclick="changeQty(${item.id}, -1)">−</button>
                        <span class="px-3 fw-bold fs-5">${item.qty}</span>
                        <button class="btn btn-outline-secondary qty-btn" 
                                onclick="changeQty(${item.id}, 1)">+</button>
                    </div>

                    <div class="mt-3">
                        <span class="subtotal">小計：NT$${subtotal}</span>
                    </div>
                </div>
                <div class="col-md-3 text-end">
                    <button class="btn btn-danger" 
                            onclick="removeItem(${item.id})">刪除</button>
                </div>
            </div>
        </div>
        `;

        // 只計算上架商品的金額
        if (isActive) {
            total += subtotal;
        }
    });

    document.getElementById('totalPrice').innerText = `NT$${total}`;

    // 有已下架商品時顯示警告
    if (hasDelisted) {
        const warningHTML = `
            <div class="alert alert-warning mt-4">
                <strong>⚠️ 注意：</strong>購物車中有已下架商品，<br>
                結帳時將自動排除這些商品。
            </div>`;
        cartItems.insertAdjacentHTML('beforeend', warningHTML);
    }
}

function removeItem(id) {
    let cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('shineguang_cart', JSON.stringify(cart));
    loadCart();
}

function changeQty(id, amount) {
    let cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    const item = cart.find(p => p.id === id);

    if (!item) return;

    item.qty += amount;
    if (item.qty <= 0) {
        cart = cart.filter(p => p.id !== id);
    }

    localStorage.setItem('shineguang_cart', JSON.stringify(cart));
    loadCart();
}

/* 頁面載入 */
window.onload = loadCart;