function updateTime() {
  const now = new Date();
  
  let hours = now.getHours().toString().padStart(2, '0');
  let minutes = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('clock').innerText = `${hours}:${minutes}`;

  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[now.getDay()];
  
  document.getElementById('date').innerText = `${month}月${day}日 ${weekday}`;
}

updateTime();
setInterval(updateTime, 1000);

// ================= SPA 页面路由器 =================

// 打开某个图层 (例如传入 'page-settings')
function openPage(pageId) {
  // 把目标图层推入屏幕
  document.getElementById(pageId).classList.add('active');
  // 把桌面缩小变暗
  document.getElementById('page-home').classList.add('background-mode');
}

// 关闭某个图层（返回桌面）
function closePage(pageId) {
  // 把目标图层移出屏幕
  document.getElementById(pageId).classList.remove('active');
  // 恢复桌面正常状态
  document.getElementById('page-home').classList.remove('background-mode');
}
