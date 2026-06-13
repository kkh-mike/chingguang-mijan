// public/js/products.js

// 產生 slug（用於 anchor 跳轉）
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/奶油話梅/g, 'butter-plum')
        .replace(/蜂蜜梅/g, 'honey-plum')
        .replace(/飛機餅乾/g, 'airplane-biscuit')
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')  // 其他商品也轉成 kebab-case
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// 載入商品
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

        let html = '';

        products.forEach(product => {
            if (product.isActive === false) return;

            const slug = generateSlug(product.name);

            html += `
                <div class="col-md-4" id="${slug}">
                    <div class="card product-card">

                        <img
                            src="${product.image || '/images/no-image.jpg'}"
                            class="card-img-top"
                            alt="${product.name}"
                        >

                        <div class="card-body">

                            <h5 class="fw-bold">${product.name}</h5>

                            <p class="text-muted">
                                ${product.description || ''}
                            </p>

                            <p class="price">
                                NT$${product.price}
                            </p>

                            <div class="d-flex align-items-center mb-3">
                                <button class="btn btn-outline-secondary" onclick="changeQty(${product.id}, -1)">-</button>
                                <input id="qty-${product.id}" type="number" min="1" value="1" 
                                       class="form-control text-center mx-2" style="width:80px">
                                <button class="btn btn-outline-secondary" onclick="changeQty(${product.id}, 1)">+</button>
                            </div>

                            <button class="btn btn-order w-100" onclick="addToCart(${product.id})">
                                加入購物車
                            </button>

                        </div>
                    </div>
                </div>
            `;
        });

        productList.innerHTML = html;

        // 商品載入完成後，檢查是否有 anchor 跳轉需求
        scrollToProduct();

    } catch (error) {
        console.error('載入商品失敗:', error);
        document.getElementById('productList').innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <h5>商品載入失敗，請重新整理頁面</h5>
            </div>
        `;
    }
}

// 平滑滾動到指定商品
function scrollToProduct() {
    const hash = window.location.hash;  // 如 #butter-plum
    if (!hash) return;

    setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            // 高亮效果
            const card = target.querySelector('.card');
            if (card) {
                card.style.transition = "all 0.6s ease";
                card.style.boxShadow = "0 0 0 5px #ffc107";
                card.style.transform = "scale(1.03)";

                setTimeout(() => {
                    card.style.boxShadow = "";
                    card.style.transform = "";
                }, 2800);
            }
        }
    }, 600); // 等待 DOM 渲染完成
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
        cart.push({ id: productId, qty: qty });
    }

    localStorage.setItem('shineguang_cart', JSON.stringify(cart));
    updateCartCount();

    alert(`已加入 ${qty} 件商品到購物車`);
}

/* 更新購物車數量 */
function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    let totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.innerText = totalQty;
}

/* 頁面載入 */
window.onload = () => {
    loadProducts();
    updateCartCount();
};