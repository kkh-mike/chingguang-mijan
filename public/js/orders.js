// public/js/orders.js
async function fetchOrders(params = {}) {
    try {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`/api/orders?${query}`);
        
        if (!res.ok) {
            if (res.status === 401) {
                throw new Error('此功能目前僅限管理員使用');
            }
            throw new Error('無法取得訂單');
        }
        
        return await res.json();
    } catch (err) {
        console.error(err);
        const container = document.getElementById('orderList');
        container.innerHTML = `
            <div class="alert alert-warning text-center py-5">
                <h5>⚠️ 目前無法查詢訂單</h5>
                <p class="mb-0">${err.message}</p>
            </div>`;
        return [];
    }
}

function getStatusClass(status) {
    if (!status) return 'status-pending';
    if (status.includes('待確認')) return 'status-pending';
    if (status.includes('已出貨') || status.includes('已確認')) return 'status-shipping';
    if (status.includes('已完成')) return 'status-completed';
    if (status.includes('取消')) return 'status-cancelled';
    return 'status-pending';
}

function renderOrders(orders) {
    const container = document.getElementById('orderList');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <p class="text-center text-muted py-5">
                目前沒有符合條件的訂單<br>
                <small>請確認姓名或電話是否正確</small>
            </p>`;
        return;
    }

    let html = '';
    orders.forEach(order => {
        const itemsHtml = order.items.map(item => 
            `<div class="small">${item.product_name} × ${item.quantity}　$${item.price}</div>`
        ).join('');

        html += `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <strong>訂單編號 #${order.id}</strong><br>
                        <small>${new Date(order.created_at).toLocaleString('zh-TW')}</small>
                    </div>
                    <span class="status ${getStatusClass(order.status)}">${order.status || '待確認'}</span>
                </div>
                <div class="mb-2">
                    <strong>收件人：</strong>${order.receiver}　${order.phone}<br>
                    <strong>地址：</strong>${order.address}
                </div>
                ${order.remark ? `<div class="text-muted small mb-2">備註：${order.remark}</div>` : ''}
                <div class="mt-2">
                    <strong>商品明細：</strong>
                    ${itemsHtml}
                </div>
                <div class="mt-3 text-end fw-bold">
                    總金額：$${order.total_amount}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

window.searchOrders = async function() {
    const name = document.getElementById('searchName').value.trim();
    const phone = document.getElementById('searchPhone').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const params = {};
    if (name) params.receiver = name;
    if (phone) params.phone = phone;
    if (startDate) params.start_date = startDate;   // 建議後端用這個名稱
    if (endDate) params.end_date = endDate;

    const orders = await fetchOrders(params);
    renderOrders(orders);
};

window.resetSearch = function() {
    document.getElementById('searchName').value = '';
    document.getElementById('searchPhone').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    searchOrders();
};