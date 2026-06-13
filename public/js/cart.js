// public/js/cart.js

let allProducts = [];

// 載入最新商品狀態
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
    await loadCurrentProducts();

    const cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    const cartItems = document.getElementById('cartItems');
    let total = 0;
    let hasDelisted = false;

    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart text-center py-5">
                <h3>🛒 購物車是空的</h3>
                <p class="mt-3">快去挑選喜歡的蜜餞吧～</p>
                <a href="/products" class="btn btn-warning mt-3">前往購物</a>
            </div>
        `;
        updateTotal(0);
        updateAllCartCounts();   // 更新底部與上方數量
        return;
    }

    cart.forEach(item => {
        const product = getProductInfo(item.id);
        const subtotal = (product ? product.price : 0) * item.qty;

        if (!product) {
            hasDelisted = true;
            cartItems.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-content">
                        <img src="/images/no-image.jpg" alt="已下架">
                        <div class="cart-item-info">
                            <h5 class="fw-bold text-muted">商品已不存在</h5>
                            <span class="badge bg-danger">已下架</span>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="removeItem(${item.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            return;
        }

        const isActive = product.isActive !== false;

        if (!isActive) hasDelisted = true;

        cartItems.innerHTML += `
        <div class="cart-item">
            <div class="cart-item-content">
                <img src="${product.image || '/images/no-image.jpg'}" 
                     alt="${product.name}">
                
                <div class="cart-item-info">
                    <div class="cart-item-name">${product.name}</div>
                    ${!isActive ? `<span class="badge bg-danger mb-2">已下架</span>` : ''}
                    <div class="cart-item-spec">
                        單價：NT$${product.price}<br>
                        ${item.spec ? item.spec : ''}
                    </div>

                    <div class="qty-row">
                        <div class="qty-control">
                            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                            <input type="text" class="qty-input" value="${item.qty}" readonly>
                            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                        </div>
                        <div class="item-subtotal">
                            NT$${subtotal}
                        </div>
                    </div>
                </div>
            </div>

            <button class="delete-btn" onclick="removeItem(${item.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        `;

        if (isActive) total += subtotal;
    });

    updateTotal(total);
    updateAllCartCounts();   // 每次重新渲染都更新數量徽章

    // 已下架警告
    if (hasDelisted) {
        cartItems.insertAdjacentHTML('beforeend', `
            <div class="alert alert-warning mt-4">
                <strong>⚠️ 注意：</strong>購物車中有已下架商品，結帳時將自動排除。
            </div>
        `);
    }
}

function updateTotal(total) {
    const totalEl = document.getElementById('totalPrice');
    if (totalEl) totalEl.innerText = `NT$${total}`;
    
    const subtotalEl = document.getElementById('subtotalText');
    if (subtotalEl) subtotalEl.innerText = `NT$${total}`;
}

// 更新所有頁面的購物車數量徽章
function updateAllCartCounts() {
    const count = getCartCount();
    
    const topCount = document.getElementById('cartCount');
    const bottomCount = document.getElementById('cartCountBottom');
    
    if (topCount) topCount.textContent = count;
    if (bottomCount) bottomCount.textContent = count;
}

function getCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
        return cart.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
    } catch(e) { 
        return 0; 
    }
}

function removeItem(id) {
    let cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('shineguang_cart', JSON.stringify(cart));
    loadCart();        // 重新渲染 + 更新數量
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
    loadCart();        // 重新渲染 + 更新數量
}

// 頁面載入
window.onload = loadCart;