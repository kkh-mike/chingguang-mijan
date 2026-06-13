// public/js/cart.js
let allProducts = [];

async function loadCurrentProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
    } catch (e) {
        console.error('載入商品狀態失敗', e);
    }
}

function getProductInfo(id) {
    return allProducts.find(p => p.id === id);
}

async function loadCart() {
    await loadCurrentProducts();
    const cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    const cartItems = document.getElementById('cartItems');
    let total = 0;

    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-5">
                <h3>🛒 購物車是空的</h3>
                <p class="mt-3">快去挑選喜歡的蜜餞吧～</p>
                <a href="/products" class="btn btn-warning mt-3">前往購物</a>
            </div>`;
        updateTotal(0);
        return;
    }

    cart.forEach(item => {
        const product = getProductInfo(item.id);
        const subtotal = product ? product.price * item.qty : 0;

        if (!product) {
            cartItems.innerHTML += `
                <div class="cart-item">
                    <div class="text-muted">商品已不存在</div>
                </div>`;
            return;
        }

        cartItems.innerHTML += `
        <div class="cart-item">
            <div class="cart-item-content">
                <!-- 小圖片 -->
                <img src="${product.image || '/images/no-image.jpg'}" alt="${product.name}">
                
                <div class="cart-item-info">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-spec">
                        單價：NT$${product.price}
                        ${item.spec ? `<br>${item.spec}` : ''}
                    </div>

                    <!-- 數量控制 -->
                    <div class="qty-row">
                        <div class="qty-control">
                            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                            <input type="text" class="qty-input" value="${item.qty}" readonly>
                            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                        </div>
                        <div class="item-subtotal">小計 NT$${subtotal}</div>
                    </div>
                </div>
            </div>

            <!-- 垃圾桶在右側 -->
            <button class="delete-btn" onclick="removeItem(${item.id})">
                <i class="bi bi-trash"></i>
            </button>
        </div>`;
        
        total += subtotal;
    });

    updateTotal(total);
}

function updateTotal(total) {
    const totalEl = document.getElementById('totalPrice');
    if (totalEl) totalEl.innerText = `NT$${total}`;
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

window.onload = loadCart;