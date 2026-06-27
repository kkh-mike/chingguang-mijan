// admin-orders.js
function getStatusBadge(status) {
    switch(status) {
        case '待確認': return '<span class="badge bg-warning text-dark">待確認</span>';
        case '已確認': return '<span class="badge bg-primary">已確認</span>';
        case '已出貨': return '<span class="badge bg-success">已出貨</span>';
        case '已完成': return '<span class="badge bg-dark">Ref已完成</span>';
        case '已取消': return '<span class="badge bg-danger">已取消</span>';
        default: return `<span class="badge bg-secondary">${status || '未知'}</span>`;
    }
}

let allOrders = [];
let currentSort = 'newest';

async function loadOrders() {
    const container = document.getElementById('orderContainer');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3">載入中...</p></div>';

    try {
        // 💡 關鍵修正：後台必須請求 /api/admin/orders 才能正常讀取所有數據！
        const response = await fetch('/api/admin/orders');

        if (response.status === 401) {
            alert('請先登入後台');
            window.location.href = '/admin-login';
            return;
        }

        if (!response.ok) {
            throw new Error('載入失敗');
        }

        allOrders = await response.json();
        applyFiltersAndSort();
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="alert alert-danger text-center py-5">
                <h5>載入訂單失敗</h5>
                <p>請確認已登入後台</p>
                <button onclick="window.location.href='/admin-login'" class="btn btn-primary mt-3">前往登入</button>
            </div>`;
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orderContainer');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-5"><h4>沒有符合條件的訂單</h4></div>`;
        return;
    }

    orders.forEach(order => {
        let itemsHtml = (order.items || []).map(item => `
            <div class="order-item">
                ${item.product_name} × ${item.quantity} 
                <span class="float-end text-muted">NT$ ${item.price || ''}</span>
            </div>
        `).join('');

        const cancelHtml = order.cancel_reason 
            ? `<div class="alert alert-danger py-2"><strong>取消原因：</strong>${order.cancel_reason}</div>` 
            : '';

        const statusColor = { '待確認': 'warning', '已確認': 'primary', '已出貨': 'success', '已完成': 'dark', '已取消': 'danger' }[order.status] || 'secondary';

        container.innerHTML += `
        <div class="card order-card">
            <div class="status-bar bg-${statusColor}"></div>
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>訂單 #${order.id}</span>
                ${getStatusBadge(order.status)}
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>收件人：</strong>${order.receiver}</p>
                        <p><strong>電話：</strong>${order.phone}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>地址：</strong>${order.address}</p>
                    </div>
                </div>
                <div class="mt-3">
                    <strong>更新狀態：</strong>
                    <select onchange="updateStatus(${order.id}, this.value)" class="form-select d-inline-block w-auto">
                        <option value="待確認" ${order.status === '待確認' ? 'selected' : ''}>待確認</option>
                        <option value="已確認" ${order.status === '已確認' ? 'selected' : ''}>已確認</option>
                        <option value="已出貨" ${order.status === '已出貨' ? 'selected' : ''}>已出貨</option>
                        <option value="已完成" ${order.status === '聯已完成' || order.status === '已完成' ? 'selected' : ''}>已完成</option>
                        <option value="已取消" ${order.status === '已取消' ? 'selected' : ''}>已取消</option>
                    </select>
                </div>
                ${cancelHtml}
                <p class="mt-3"><strong>總金額：</strong><span class="fs-5 fw-bold text-danger">NT$ ${order.total_amount}</span></p>
                <p><strong>建立時間：</strong>${new Date(order.created_at).toLocaleString('zh-TW')}</p>
                <button class="btn btn-sm btn-outline-secondary mt-2" onclick="toggleItems(this)">📋 顯示商品明細 (${(order.items || []).length} 項)</button>
                <div class="items-detail mt-3" style="display:none;">${itemsHtml}</div>
            </div>
        </div>`;
    });
}

function toggleItems(btn) {
    const detail = btn.nextElementSibling;
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        btn.textContent = '📋 隱藏商品明細';
    } else {
        detail.style.display = 'none';
        btn.textContent = `📋 顯示商品明細 (${detail.children.length} 項)`;
    }
}

function applyFiltersAndSort() {
    const keywordReceiver = (document.getElementById('searchReceiver') || {}).value?.toLowerCase().trim() || '';
    const keywordPhone = (document.getElementById('searchPhone') || {}).value?.toLowerCase().trim() || '';
    const statusFilter = (document.getElementById('statusFilter') || {}).value || '';

    let filtered = allOrders.filter(order => {
        const matchReceiver = !keywordReceiver || order.receiver.toLowerCase().includes(keywordReceiver);
        const matchPhone = !keywordPhone || order.phone.toLowerCase().includes(keywordPhone);
        const matchStatus = !statusFilter || order.status === statusFilter;
        return matchReceiver && matchPhone && matchStatus;
    });

    filtered.sort((a, b) => {
        if (currentSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (currentSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        return 0;
    });

    renderOrders(filtered);
}

function setupListeners() {
    ['searchReceiver', 'searchPhone', 'statusFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', applyFiltersAndSort);
    });
}

async function updateStatus(orderId, newStatus) {
    let cancelReason = null;
    if (newStatus === '已取消') {
        cancelReason = prompt('請輸入取消原因：', '客戶取消');
        if (cancelReason === null) return;
    }
    if (!confirm(`確定變更訂單 #${orderId} 狀態？`)) return;

    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, cancel_reason: cancelReason })
        });
        if (res.ok) { alert('✅ 更新成功'); loadOrders(); }
    } catch (e) { alert('❌ 網路錯誤'); }
}

window.onload = () => { loadOrders().then(() => setupListeners()); };