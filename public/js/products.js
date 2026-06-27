// public/js/products.js

// 產生 slug（用於 anchor 跳轉）
function generateSlug(name) {
    const slugMap = {
        '奶油話梅': 'butter-plum',
        '蜂蜜梅': 'honey-plum',
        '飛機餅乾': 'airplane-biscuit',
        '芭樂乾': 'dried-guava',
        'Q梅': 'q-plum',
        '八仙果': 'ba-xian-guo',
        '化核梅-黑肉': 'hua-hei-plum',
        '化核梅-紅肉': 'hua-hong-plum',
        '化應子': 'hua-ying-zi',
        '梅粉芭樂乾': 'PlumDriedGuava',
        '芒果乾': 'mango-dry',
        '化應子': 'hua-ying-zi',
        '橄欖': 'olive',
        '酒李': 'WinePlum'
    };

    if (slugMap[name]) return slugMap[name];

    return name
        .toLowerCase()
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
                <div class="col-12 mb-3" id="${slug}">
                    <div class="product-row d-flex align-items-center p-3 bg-white rounded-4 shadow-sm">
                        <!-- 左邊圖片 - 可點擊看大圖 -->
                        <div class="product-img-wrapper me-3 flex-shrink-0" 
                             onclick="showProductImage('${product.image || "/images/no-image.jpg"}', '${product.name.replace(/'/g, "\\'")}')">
                            <img src="${product.image || '/images/no-image.jpg'}" 
                                 alt="${product.name}" 
                                 class="product-img">
                        </div>

                        <!-- 中間資訊 -->
                        <div class="flex-grow-1">
                            <h5 class="product-name mb-1 fw-bold">${product.name}</h5>
                            <p class="text-muted mb-1 small">${product.description || ''}</p>
                            <div class="price fw-bold">NT$${product.price}</div>
                        </div>

                        <!-- 右邊 數量 + 加入購物車 -->
                        <div class="d-flex flex-column align-items-end gap-2 ms-3">
                            <!-- 數量選擇器 -->
                            <div class="input-group input-group-sm" style="width: 128px;">
                                <button class="btn btn-outline-secondary qty-btn" 
                                        onclick="changeQty(${product.id}, -1)">–</button>
                                <input id="qty-${product.id}" type="number" min="1" value="1" 
                                       class="form-control text-center qty-input">
                                <button class="btn btn-outline-secondary qty-btn" 
                                        onclick="changeQty(${product.id}, 1)">+</button>
                            </div>
                            <button class="btn btn-order btn-sm px-4" 
                                    onclick="addToCart(${product.id}); event.stopImmediatePropagation();">
                                加入
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

    showAddToCartToast(qty);
}

/* 顯示成功加入購物車的 Toast */
function showAddToCartToast(qty) {
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
    const bsToast = new bootstrap.Toast(toastElement, { autohide: true, delay: 500 });
    bsToast.show();

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

// === 底部導航高亮 ===
function highlightBottomNav() {
    const currentPath = window.location.pathname;

    document.querySelectorAll('.bottom-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    if (currentPath === '/products' || currentPath === '/') {
        document.getElementById('bottom-products').classList.add('active');
    } 
    else if (currentPath === '/cart') {
        document.getElementById('bottom-cart').classList.add('active');
    } 
    else if (currentPath.includes('/orders') || currentPath === '/order') {
        document.getElementById('bottom-orders').classList.add('active');
    }
}

// ==================== 大圖預覽 Modal ====================
function showProductImage(imageSrc, productName) {
    let modal = document.getElementById('productImageModal');
    if (modal) modal.remove();

    const modalHTML = `
        <div class="modal fade" id="productImageModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">${productName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-2 text-center bg-light">
                        <img src="${imageSrc}" 
                             class="img-fluid rounded" 
                             style="max-height: 85vh; width: auto;"
                             alt="${productName}">
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const bsModal = new bootstrap.Modal(document.getElementById('productImageModal'));
    bsModal.show();

    document.getElementById('productImageModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

// 在頁面載入時執行
window.onload = () => {
    loadProducts();
    updateCartCount();
    highlightBottomNav();
};