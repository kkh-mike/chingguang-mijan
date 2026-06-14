// public/js/products.js

// 產生 slug（用於 anchor 跳轉）
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/奶油話梅/g, 'butter-plum')
        .replace(/蜂蜜梅/g, 'honey-plum')
        .replace(/飛機餅乾/g, 'airplane-biscuit')
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')  
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// 取得 URL 中的搜尋關鍵字
function getSearchQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q') ? urlParams.get('q').trim() : '';
}

// 搜尋並跳轉到符合的商品
function highlightAndScrollToProduct(query, allProducts) {
    if (!query) return;

    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);

    const matchedProducts = allProducts.filter(product => {
        const name = product.name.toLowerCase();
        const desc = (product.description || '').toLowerCase();
        return keywords.every(kw => name.includes(kw) || desc.includes(kw));
    });

    if (matchedProducts.length === 0) {
        console.log(`找不到與「${query}」相關的商品`);
        return;
    }

    const targetProduct = matchedProducts[Math.floor(Math.random() * matchedProducts.length)];
    const slug = generateSlug(targetProduct.name);
    const targetElement = document.getElementById(slug);

    if (targetElement) {
        setTimeout(() => {
            targetElement.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            const card = targetElement.querySelector('.product-card');
            if (card) {
                card.style.transition = "all 0.6s ease";
                card.style.boxShadow = "0 0 0 6px #ffc107";
                card.style.transform = "scale(1.05)";

                setTimeout(() => {
                    card.style.boxShadow = "";
                    card.style.transform = "";
                }, 3000);
            }
        }, 800);
    }
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
        const searchQuery = getSearchQuery();

        products.forEach(product => {
            if (product.isActive === false) return;

            const slug = generateSlug(product.name);

            html += `
<div class="col-6 col-md-4 col-lg-3 col-xl-3 mb-4" id="${slug}">
            <div class="product-card">
                        <div class="product-image-container">
                            <img
                                src="${product.image || '/images/no-image.jpg'}"
                                alt="${product.name}"
                            >
                        </div>

                        <div class="card-body">
                            <h5 class="fw-bold product-name">${product.name}</h5>
                            <p class="text-muted product-desc">${product.description || ''}</p>
                            <p class="price">NT$${product.price}</p>

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

        if (searchQuery) {
            highlightAndScrollToProduct(searchQuery, products);
        } else {
            scrollToProduct();
        }

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
    const hash = window.location.hash;
    if (!hash) return;

    setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            const card = target.querySelector('.product-card');
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
    }, 600);
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

    // 顯示美觀的 Toast 提示
    showAddToCartToast(qty);
}

/* 顯示成功加入購物車的 Toast - 置中 + 大版 */
function showAddToCartToast(qty) {
    // 移除舊的 toast
    let existingToast = document.getElementById('addToCartToast');
    if (existingToast) existingToast.remove();

    const toastHTML = `
        <div id="addToCartToast" class="toast align-items-center text-white bg-success border-0 position-fixed top-50 start-50 translate-middle" 
             role="alert" aria-live="assertive" aria-atomic="true" 
             style="z-index: 9999; min-width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div class="d-flex p-3">
                <div class="toast-body fs-5 fw-bold">
                    <i class="bi bi-check-circle-fill me-3" style="font-size: 2rem;"></i>
                    已成功加入 <strong>${qty}</strong> 件商品到購物車
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close" style="width: 1.5rem; height: 1.5rem;"></button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById('addToCartToast');
    
    const bsToast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 500   // 顯示時間稍長一點
    });
    
    bsToast.show();

    // 消失後移除 DOM
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

/* 更新購物車數量 */
function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];
    let totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.innerText = totalQty;

    const bottomCount = document.getElementById('cartCountBottom');
    if (bottomCount) bottomCount.innerText = totalQty;
}

/* 頁面載入 */
window.onload = () => {
    loadProducts();
    updateCartCount();
};