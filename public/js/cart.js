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


// === 運費計算邏輯（全站統一）===
function calculateShipping(subtotal) {
    return subtotal >= 1000 ? 0 : 60;
}

function calculateTotal(subtotal) {
    return subtotal + calculateShipping(subtotal);
}

// 取得商品最新資訊
function getProductInfo(id) {
    return allProducts.find(p => p.id === id);
}

// === 底部導航高亮 ===
function highlightBottomNav() {
    const currentPath = window.location.pathname;

    document.querySelectorAll('.bottom-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    if (currentPath === '/products' || currentPath === '/') {
        const el = document.getElementById('bottom-products');
        if (el) el.classList.add('active');
    } 
    else if (currentPath === '/cart') {
        const el = document.getElementById('bottom-cart');
        if (el) el.classList.add('active');
    } 
    else if (currentPath.includes('/orders') || currentPath === '/order') {
        const el = document.getElementById('bottom-orders');
        if (el) el.classList.add('active');
    }
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
        updateAllCartCounts();
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
    updateAllCartCounts();

    // 更新「已選購 XX 件商品」
    const totalQty = cart.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
    const itemCountEl = document.getElementById('itemCount');
    if (itemCountEl) {
        itemCountEl.textContent = `已選購 ${totalQty} 件商品`;
    }

    // 已下架警告
    if (hasDelisted) {
        cartItems.insertAdjacentHTML('beforeend', `
            <div class="alert alert-warning mt-4">
                <strong>⚠️ 注意：</strong>購物車中有已下架商品，結帳時將自動排除。
            </div>
        `);
    }
}



function updateTotal(subtotal) {
    const total = calculateTotal(subtotal);
    const shipping = calculateShipping(subtotal);

    const totalEl = document.getElementById('totalPrice');
    const subtotalEl = document.getElementById('subtotalText');
    
    if (totalEl) totalEl.innerText = `NT$${total}`;
    if (subtotalEl) subtotalEl.innerText = `NT$${subtotal}`;

    const shippingRow = document.getElementById('shippingRow');
    const shippingText = document.getElementById('shippingText');
    
    if (shippingRow && shippingText) {
        if (shipping === 0) {
            shippingText.innerHTML = `<span class="text-success">免運費</span>`;
            shippingText.classList.remove('text-danger');
        } else {
            const remaining = 1000 - subtotal;
            shippingText.innerHTML = `
                +60 
                <small class="text-muted">(差 ${remaining} 元免運)</small>
            `;
            shippingText.classList.add('text-danger');
        }
    }
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

// 頁面載入
window.onload = () => {
    loadCart();
    highlightBottomNav();     // ← 新增：底部導航高亮
};