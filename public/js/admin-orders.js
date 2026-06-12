function getStatusBadge(status) {

    switch(status) {

        case '待確認':
            return '<span class="badge bg-warning text-dark">待確認</span>';

        case '已確認':
            return '<span class="badge bg-primary">已確認</span>';

        case '已出貨':
            return '<span class="badge bg-success">已出貨</span>';

        case '已完成':
            return '<span class="badge bg-dark">已完成</span>';

        default:
            return `<span class="badge bg-secondary">${status}</span>`;
    }

}

async function loadOrders() {

    const response =
        await fetch('/api/orders');

    const orders =
        await response.json();

    const container =
        document.getElementById(
            'orderContainer'
        );

    container.innerHTML = '';

    orders.forEach(order => {

        let itemsHtml = '';

        order.items.forEach(item => {

            itemsHtml += `
                <li>
                    ${item.product_name}
                    ×
                    ${item.quantity}
                </li>
            `;
        });

        container.innerHTML += `

        <div class="card order-card">

            <div class="card-header">

                訂單 #${order.id}

            </div>

            <div class="card-body">

                <p>
                    <strong>收件人：</strong>
                    ${order.receiver}
                </p>

                <p>
                    <strong>電話：</strong>
                    ${order.phone}
                </p>

                <p>
                    <strong>地址：</strong>
                    ${order.address}
                </p>

               

            <div class="mb-3">

    <strong>目前狀態：</strong>

    ${getStatusBadge(order.status)}

</div>

<div class="mb-3">

    <strong>更新狀態：</strong>

    <select
        onchange="updateStatus(${order.id}, this.value)"
        class="form-select"
        style="max-width:200px;">

        <option value="待確認"
            ${order.status === '待確認' ? 'selected' : ''}>
            待確認
        </option>

        <option value="已確認"
            ${order.status === '已確認' ? 'selected' : ''}>
            已確認
        </option>

        <option value="已出貨"
            ${order.status === '已出貨' ? 'selected' : ''}>
            已出貨
        </option>

        <option value="已完成"
            ${order.status === '已完成' ? 'selected' : ''}>
            已完成
        </option>

    </select>

</div>

                <p>
                    <strong>總金額：</strong>
                    NT$
                    ${order.total_amount}
                </p>

                <p>
                    <strong>建立時間：</strong>
                    ${new Date(order.created_at)
                        .toLocaleString()}
                </p>

                <hr>

                <h6>
                    商品明細
                </h6>

                <ul>

                    ${itemsHtml}

                </ul>

            </div>

        </div>
        `;
    });

}

loadOrders();


async function updateStatus(
    orderId,
    status
) {

    const response =
        await fetch(
            `/api/orders/${orderId}/status`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({
                    status
                })
            }
        );

    const result =
        await response.json();

if (result.success) {

    loadOrders();

}
}