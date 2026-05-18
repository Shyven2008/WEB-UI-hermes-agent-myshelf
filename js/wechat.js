// ====== WeChat QR · Just Hermes Agent WEB UI ======
// QR code generation and polling for WeChat login

async function generateWeChatQR() {
  try {
    document.getElementById('qrStatus').textContent = '生成中...';
    const res = await fetch(API_BASE + '/api/wechat/qr');
    const data = await res.json();
    if (data.qr_image_url)
      document.getElementById('qrBox').innerHTML = `<img src="${data.qr_image_url}" alt="WeChat QR">`;
    else
      document.getElementById('qrBox').innerHTML = `<img src="/static/wechat_qr.png" alt="WeChat QR">`;
    state.qrCodeToken = data.qr_token || '';
    state.qrRetries = 0;
    document.getElementById('qrStatus').textContent = '请用微信扫描 (有效期约35秒)';
    document.getElementById('pollBtn').style.display = 'inline-block';
  } catch (e) {
    document.getElementById('qrStatus').textContent = '生成失败: ' + e.message;
  }
}

async function pollWeChatStatus() {
  if (!state.qrCodeToken) return;
  document.getElementById('qrStatus').textContent = '检测中...';
  try {
    const res = await fetch(API_BASE + '/api/wechat/status?qrcode=' + encodeURIComponent(state.qrCodeToken));
    const data = await res.json();
    if (data.status === '2' || data.status === 'confirmed') {
      document.getElementById('qrStatus').textContent = '✅ 登录成功! 凭证已保存.';
      document.getElementById('pollBtn').style.display = 'none';
      toast('微信登录成功!', 'success');
    } else if (data.status === '3' || data.status === 'expired') {
      state.qrRetries++;
      if (state.qrRetries < 3) {
        document.getElementById('qrStatus').textContent = '二维码已过期，重新生成...';
        await generateWeChatQR();
      } else {
        document.getElementById('qrStatus').textContent = '二维码已过期, 请手动点击生成';
      }
    } else {
      document.getElementById('qrStatus').textContent = '等待扫描...';
      setTimeout(pollWeChatStatus, 2000);
    }
  } catch (e) {
    document.getElementById('qrStatus').textContent = '检测失败: ' + e.message;
  }
}
