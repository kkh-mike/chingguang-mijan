// public/js/orders.js

// 1. 負責跟後端拿資料的函式
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
                <h5>⚠️ ${err.message}</h5>
                <p class="mb-0">請稍後再試或聯絡管理員</p>
            </div>`;
        return [];
    }
}

// 2. 判斷訂單狀態標籤顏色的函式
function getStatusClass(status) {
    if (!status) return 'status-pending';
    if (status.includes('待確認') || status.includes('待處理')) return 'status-pending';
    if (status.includes('已出貨') || status.includes('已確認')) return 'status-shipping';
    if (status.includes('已完成')) return 'status-completed';
    if (status.includes('取消') || status.includes('已取消')) return 'status-cancelled';
    return 'status-pending';
}

// 3. 負責把訂單資料渲染到畫面上的函式
function renderOrders(orders) {
    const container = document.getElementById('orderList');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-inbox display-1 text-muted mb-3"></i>
                <h5 class="text-muted">目前沒有符合條件的訂單</h5>
                <p class="text-muted">請確認姓名、電話或日期區間是否正確</p>
            </div>`;
        return;
    }

    let html = `<div class="mb-3 fw-bold text-muted">找到 ${orders.length} 筆訂單</div>`;

    orders.forEach(order => {
        const items = order.items && Array.isArray(order.items) ? order.items : [];
        const itemsHtml = items.map(item => 
            `<div class="small mb-1">• ${item.product_name || '商品'} × ${item.quantity} $${item.price}</div>`
        ).join('');

        html += `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <strong>訂單編號 #${order.id}</strong><br>
                        <small>${new Date(order.created_at).toLocaleString('zh-TW')}</small>
                    </div>
                    <span class="status ${getStatusClass(order.status)}">
                        ${order.status || '待確認'}
                    </span>
                </div>
                
                <div class="mb-2">
                    <strong>收件人：</strong>${order.receiver || '—'} ${order.phone || '—'}<br>
                    <strong>地址：</strong>${order.address || '—'}
                </div>
                
                ${order.remark ? `<div class="text-muted small mb-2">備註：${order.remark}</div>` : ''}
                
                <div class="mt-2">
                    <strong>商品明細：</strong>
                    ${itemsHtml || '<span class="text-muted">無商品明細</span>'}
                </div>
                
                <div class="mt-3 text-end fw-bold fs-5">
                    總金額：$${Number(order.total_amount || 0).toLocaleString('zh-TW')}
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

// 4. 按下查詢按鈕執行的動作（確保這裡有對應到 HTML 的 onclick="searchOrders()"）
window.searchOrders = async function() {
    const name = document.getElementById('searchName').value.trim();
    const phone = document.getElementById('searchPhone').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    // 如果全部都是空的，彈出提示，不呼叫 API 抓取資料
    if (!name && !phone && !startDate && !endDate) {
        alert('請至少輸入一項查詢條件（姓名、電話或日期）！');
        return; 
    }

    const params = {};
    if (name) params.receiver = name;
    if (phone) params.phone = phone;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const orders = await fetchOrders(params);
    renderOrders(orders);
};

// 5. 按下清除按鈕執行的動作
window.resetSearch = function() {
    document.getElementById('searchName').value = '';
    document.getElementById('searchPhone').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    document.getElementById('orderList').innerHTML = `
        <div class="initial-prompt">
            <i class="bi bi-search display-1 mb-3"></i>
            <h5>已清除，請重新輸入條件後查詢</h5>
            <p class="mb-0">系統不會自動顯示所有訂單</p>
        </div>`;
};