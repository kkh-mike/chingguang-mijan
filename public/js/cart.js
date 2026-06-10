async function loadCart() {

    const response =
        await fetch('/api/products');

    const products =
        await response.json();

    const cart =
        JSON.parse(
            localStorage.getItem('shineguang_cart')
        ) || [];

    const cartItems =
        document.getElementById('cartItems');

    let total = 0;

    cartItems.innerHTML = '';

    // 購物車為空
    if (cart.length === 0) {

        cartItems.innerHTML = `
            <div class="empty-cart">

                <h3>🛒 購物車是空的</h3>

                <p class="mt-3">
                    快去挑選喜歡的蜜餞吧～
                </p>

                <a
                    href="/products"
                    class="btn btn-warning">

                    前往購物

                </a>

            </div>
        `;

        document.getElementById(
            'totalPrice'
        ).innerText = 'NT$0';

        return;
    }

    cart.forEach(item => {

        const product =
            products.find(
                p => p.id === item.id
            );

        if (!product) return;

        const subtotal =
            product.price * item.qty;

        total += subtotal;

        cartItems.innerHTML += `
        <div class="cart-card">

            <div class="row align-items-center">

                <div class="col-md-3">

                    <img
                        src="${product.image || '/images/no-image.jpg'}"
                        class="img-fluid rounded"
                        style="
                            width:100%;
                            height:150px;
                            object-fit:cover;
                        "
                        alt="${product.name}"
                    >

                </div>

                <div class="col-md-6">

                    <h4 class="fw-bold">
                        ${product.name}
                    </h4>

                    <p class="product-price">
                        單價：NT$${product.price}
                    </p>

                    <div class="d-flex align-items-center gap-2 mt-3">

                        <button
                            class="btn btn-outline-secondary qty-btn"
                            onclick="changeQty(${item.id}, -1)">

                            −

                        </button>

                        <span
                            class="px-3 fw-bold fs-5">

                            ${item.qty}

                        </span>

                        <button
                            class="btn btn-outline-secondary qty-btn"
                            onclick="changeQty(${item.id}, 1)">

                            +

                        </button>

                    </div>

                    <div class="mt-3">

                        <span class="subtotal">

                            小計：NT$${subtotal}

                        </span>

                    </div>

                </div>

                <div class="col-md-3 text-end">

                    <button
                        class="btn btn-danger"
                        onclick="removeItem(${item.id})">

                        刪除

                    </button>

                </div>

            </div>

        </div>
        `;
    });

    document.getElementById(
        'totalPrice'
    ).innerText =
        `NT$${total}`;
}

function removeItem(id) {

    let cart =
        JSON.parse(
            localStorage.getItem('shineguang_cart')
        ) || [];

    cart =
        cart.filter(
            item => item.id !== id
        );

    localStorage.setItem(
        'shineguang_cart',
        JSON.stringify(cart)
    );

    loadCart();
}

function changeQty(id, amount) {

    let cart =
        JSON.parse(
            localStorage.getItem('shineguang_cart')
        ) || [];

    const item =
        cart.find(
            p => p.id === id
        );

    if (!item) return;

    item.qty += amount;

    if (item.qty <= 0) {

        cart =
            cart.filter(
                p => p.id !== id
            );
    }

    localStorage.setItem(
        'shineguang_cart',
        JSON.stringify(cart)
    );

    loadCart();
}

loadCart();