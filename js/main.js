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
