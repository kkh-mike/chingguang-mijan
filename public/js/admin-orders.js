function getStatusBadge(status) {
    switch(status) {
        case '待確認': return '<span class="badge bg-warning text-dark">待確認</span>';
        case '已確認': return '<span class="badge bg-primary">已確認</span>';
        case '已出貨': return '<span class="badge bg-success">已出貨</span>';
        case '已完成': return '<span class="badge bg-dark">已完成</span>';
        default: return `<span class="badge bg-secondary">${status}</span>`;
    }
}

// 全域變數
let allOrders = [];
let currentSort = 'newest';   // 預設：最新優先

async function loadOrders() {
    const response = await fetch('/api/orders');
    allOrders = await response.json();
    applyFiltersAndSort();
}

// 渲染訂單
function renderOrders(orders) {
    const container = document.getElementById('orderContainer');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-5"><h4>沒有符合條件的訂單</h4></div>`;
        return;
    }

    orders.forEach(order => {
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `<li>${item.product_name} × ${item.quantity}</li>`;
        });

        container.innerHTML += `
        <div class="card order-card">
            <div class="card-header">訂單 #${order.id}</div>
            <div class="card-body">
                <p><strong>收件人：</strong>${order.receiver}</p>
                <p><strong>電話：</strong>${order.phone}</p>
                <p><strong>地址：</strong>${order.address}</p>

                <div class="mb-3"><strong>目前狀態：</strong> ${getStatusBadge(order.status)}</div>

                <div class="mb-3">
                    <strong>更新狀態：</strong>
                    <select onchange="updateStatus(${order.id}, this.value)" class="form-select" style="max-width:200px;">
                        <option value="待確認" ${order.status === '待確認' ? 'selected' : ''}>待確認</option>
                        <option value="已確認" ${order.status === '已確認' ? 'selected' : ''}>已確認</option>
                        <option value="已出貨" ${order.status === '已出貨' ? 'selected' : ''}>已出貨</option>
                        <option value="已完成" ${order.status === '已完成' ? 'selected' : ''}>已完成</option>
                    </select>
                </div>

                <p><strong>總金額：</strong>NT$ ${order.total_amount}</p>
                <p><strong>建立時間：</strong>${new Date(order.created_at).toLocaleString()}</p>

                <hr>
                <h6>商品明細</h6>
                <ul>${itemsHtml}</ul>
            </div>
        </div>`;
    });
}

// 綜合篩選 + 排序
function applyFiltersAndSort() {
    const keywordReceiver = document.getElementById('searchReceiver').value.toLowerCase().trim();
    const keywordPhone = document.getElementById('searchPhone').value.toLowerCase().trim();

    let filtered = allOrders.filter(order => {
        const matchReceiver = !keywordReceiver || order.receiver.toLowerCase().includes(keywordReceiver);
        const matchPhone = !keywordPhone || order.phone.toLowerCase().includes(keywordPhone);
        return matchReceiver && matchPhone;
    });

    // 排序
    filtered.sort((a, b) => {
        switch(currentSort) {
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'pending':
                if (a.status === '待確認' && b.status !== '待確認') return -1;
                if (a.status !== '待確認' && b.status === '待確認') return 1;
                return new Date(b.created_at) - new Date(a.created_at); // 同狀態則最新優先
            case 'shipped':
                if (a.status === '已出貨' && b.status !== '已出貨') return -1;
                if (a.status !== '已出貨' && b.status === '已出貨') return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            default:
                return 0;
        }
    });

    renderOrders(filtered);
}

// 設定搜尋與排序監聽
function setupListeners() {
    // 搜尋
    document.getElementById('searchReceiver').addEventListener('input', applyFiltersAndSort);
    document.getElementById('searchPhone').addEventListener('input', applyFiltersAndSort);

    // 排序按鈕
    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.addEventListener('click', () => {
            // 切換 active 樣式
            document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentSort = btn.dataset.sort;
            applyFiltersAndSort();
        });
    });
}

// 初始化
loadOrders().then(() => {
    setupListeners();
});

async function updateStatus(orderId, status) {
    const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });

    const result = await response.json();
    if (result.success) {
        loadOrders();   // 重新載入最新資料
    }
}