// public/js/products.js

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        const productList = document.getElementById('productList');
        productList.innerHTML = '';

        if (products.length === 0) {
            productList.innerHTML = `
                <div class="col-12 text-center py-5">
                    <h4 class="text-muted">目前沒有上架商品</h4>
                </div>
            `;
            return;
        }

        products.forEach(product => {
            // === 前台安全防護：只顯示已上架商品 ===
            if (product.isActive === false) {
                return;
            }

            productList.innerHTML += `
                <div class="col-md-4">
                    <div class="card">

                        <img
                            src="${product.image || '/images/no-image.jpg'}"
                            class="card-img-top"
                            alt="${product.name}"
                        >

                        <div class="card-body">

                            <h5>${product.name}</h5>

                            <p>
                                ${product.description || ''}
                            </p>

                            <p class="price">
                                NT$${product.price}
                            </p>

                            <div class="d-flex align-items-center mb-3">

                                <button
                                    class="btn btn-outline-secondary"
                                    onclick="changeQty(${product.id}, -1)">
                                    -
                                </button>

                                <input
                                    id="qty-${product.id}"
                                    type="number"
                                    min="1"
                                    value="1"
                                    class="form-control text-center mx-2"
                                    style="width:80px"
                                >

                                <button
                                    class="btn btn-outline-secondary"
                                    onclick="changeQty(${product.id}, 1)">
                                    +
                                </button>

                            </div>

                            <button
                                class="btn btn-order"
                                onclick="addToCart(${product.id})">
                                加入購物車
                            </button>

                        </div>

                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('載入商品失敗:', error);
        document.getElementById('productList').innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <h5>商品載入失敗，請重新整理頁面</h5>
            </div>
        `;
    }
}

/* 數量加減 */
function changeQty(productId, delta) {
    const input = document.getElementById(`qty-${productId}`);
    if (!input) return;

    let qty = parseInt(input.value) || 1;
    qty += delta;
    if (qty < 1) qty = 1;
    input.value = qty;
}

/* 加入購物車 */
function addToCart(productId) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;

    let cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.qty += qty;
    } else {
        cart.push({
            id: productId,
            qty: qty
        });
    }

    localStorage.setItem('shineguang_cart', JSON.stringify(cart));
    updateCartCount();

    alert(`已加入 ${qty} 件商品到購物車`);
}

/* 更新右上角購物車數量 */
function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    let totalQty = 0;

    cart.forEach(item => {
        totalQty += item.qty;
    });

    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.innerText = totalQty;
    }
}

/* 頁面載入 */
window.onload = () => {
    loadProducts();
    updateCartCount();
};