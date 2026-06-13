// 在 checkout.js 最下面加入

async function sendToLineFromCheckout() {
    // 取得表單資料
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const note = document.getElementById('note').value.trim();

    const cart = JSON.parse(localStorage.getItem('shineguang_cart')) || [];

    if (cart.length === 0) {
        alert('購物車是空的！');
        return;
    }

    let message = "🌟 *晴光蜜餞 - 新訂單* 🌟\n\n";

    let total = 0;

    // 訂單明細
    cart.forEach(item => {
        const product = allProducts ? allProducts.find(p => p.id === item.id) : null;
        if (product && product.isActive !== false) {
            const subtotal = product.price * item.qty;
            message += `🛍️ ${product.name}\n`;
            message += `   ${item.qty} 件 × NT$${product.price} = NT$${subtotal}\n\n`;
            total += subtotal;
        }
    });

    message += `──────────────────\n`;
    message += `💰 總金額：*NT$${total}*\n`;
    message += `🕒 訂單時間：${new Date().toLocaleString('zh-TW')}\n`;
    message += `──────────────────\n\n`;

    // 收件資料
    message += `👤 收件人：${name || '（未填）'}\n`;
    message += `📱 電話：${phone || '（未填）'}\n`;
    message += `📍 收件地址：${address || '（未填）'}\n`;
    if (note) message += `💬 備註：${note}\n`;

    message += `\n🙏 請店家確認後回覆「確認訂單」即可\n`;
    message += `感謝您的購買！💕`;

    const lineId = "@xhr6167l";
    const lineUrl = `https://line.me/R/oaMessage/${lineId}/?text=${encodeURIComponent(message)}`;
    
    window.open(lineUrl, '_blank');

    navigator.clipboard.writeText(message);
    alert('✅ 已開啟 LINE，請確認後送出！');
}