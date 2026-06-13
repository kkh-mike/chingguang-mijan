// admin-orders.js - Phase 8.8 完整優化版
function getStatusBadge(status) {
    switch(status) {
        case '待確認': return '<span class="badge bg-warning text-dark">待確認</span>';
        case '已確認': return '<span class="badge bg-primary">已確認</span>';
        case '已出貨': return '<span class="badge bg-success">已出貨</span>';
        case '已完成': return '<span class="badge bg-dark">已完成</span>';
        case '已取消': return '<span class="badge bg-danger">已取消</span>';
        default: return `<span class="badge bg-secondary">${status || '未知'}</span>`;
    }
}

let allOrders = [];
let currentSort = 'newest';

async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('載入失敗');
        allOrders = await response.json();
        applyFiltersAndSort();
    } catch (err) {
        console.error(err);
        alert('無法載入訂單，請確認後端是否運行');
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
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `<li>${item.product_name} × ${item.quantity}</li>`;
        });

        const cancelHtml = order.cancel_reason 
            ? `<p class="text-danger mb-2"><strong>取消原因：</strong>${order.cancel_reason}</p>` 
            : '';

        container.innerHTML += `
        <div class="card order-card mb-4">
            <div class="card-header d-flex justify-content-between">
                <span>訂單 #${order.id}</span>
                ${getStatusBadge(order.status)}
            </div>
            <div class="card-body">
                <p><strong>收件人：</strong>${order.receiver}</p>
                <p><strong>電話：</strong>${order.phone}</p>
                <p><strong>地址：</strong>${order.address}</p>

                <div class="mb-3"><strong>目前狀態：</strong> ${getStatusBadge(order.status)}</div>

                <div class="mb-3">
                    <strong>更新狀態：</strong>
                    <select onchange="updateStatus(${order.id}, this.value)" class="form-select" style="max-width:220px; display:inline-block;">
                        <option value="待確認" ${order.status === '待確認' ? 'selected' : ''}>待確認</option>
                        <option value="已確認" ${order.status === '已確認' ? 'selected' : ''}>已確認</option>
                        <option value="已出貨" ${order.status === '已出貨' ? 'selected' : ''}>已出貨</option>
                        <option value="已完成" ${order.status === '已完成' ? 'selected' : ''}>已完成</option>
                        <option value="已取消" ${order.status === '已取消' ? 'selected' : ''}>已取消</option>
                    </select>
                </div>

                ${cancelHtml}

                <p><strong>總金額：</strong>NT$ ${order.total_amount}</p>
                <p><strong>建立時間：</strong>${new Date(order.created_at).toLocaleString('zh-TW')}</p>

                <hr>
                <h6>商品明細</h6>
                <ul>${itemsHtml}</ul>
            </div>
        </div>`;
    });
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

    // 排序邏輯...
    filtered.sort((a, b) => {
        switch(currentSort) {
            case 'newest': return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
            case 'pending':
                if (a.status === '待確認' && b.status !== '待確認') return -1;
                if (a.status !== '待確認' && b.status === '待確認') return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            case 'shipped':
                if (a.status === '已出貨' && b.status !== '已出貨') return -1;
                if (a.status !== '已出貨' && b.status === '已出貨') return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            default: return 0;
        }
    });

    renderOrders(filtered);
}

function setupListeners() {
    ['searchReceiver', 'searchPhone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', applyFiltersAndSort);
    });

    const statusEl = document.getElementById('statusFilter');
    if (statusEl) statusEl.addEventListener('change', applyFiltersAndSort);

    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            applyFiltersAndSort();
        });
    });
}

async function updateStatus(orderId, newStatus) {
    let cancelReason = null;
    if (newStatus === '已取消') {
        cancelReason = prompt('請輸入取消原因（可選）：', '客戶取消');
        if (cancelReason === null) return;
    }

    if (!confirm(`確定將訂單 #${orderId} 改為「${newStatus}」？`)) return;

    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, cancel_reason: cancelReason })
        });
        const result = await res.json();

        if (result.success) {
            alert('✅ 更新成功！');
            loadOrders();
        } else {
            alert('❌ ' + (result.message || '更新失敗'));
        }
    } catch (e) {
        alert('❌ 網路錯誤');
    }
}

// 啟動
loadOrders().then(setupListeners);