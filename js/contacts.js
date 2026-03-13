// 全局变量，用于临时存储选中头像的 Base64 数据
let currentAvatarBase64 = "";

// 页面加载完成后，如果是通讯录主页，则渲染列表
document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('contact-list-container');
  if (listContainer) {
    renderContacts();
  }
});

// 1. 头像预览与 Base64 转换 (FileReader API)
function previewAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64String = e.target.result;
    currentAvatarBase64 = base64String; // 存入内存准备保存
    
    // 更新 UI 预览
    const previewImg = document.getElementById('avatar-preview');
    previewImg.src = base64String;
    previewImg.style.display = 'block';
  };
  
  // 读取文件并转换为 Data URL (Base64)
  reader.readAsDataURL(file);
}

// 2. 保存联系人到 localStorage
function saveContact() {
  const name = document.getElementById('contact-name').value.trim();
  const prompt = document.getElementById('contact-prompt').value.trim();

  if (!name) {
    alert("请至少填写联系人姓名！");
    return;
  }

  // 构建单个联系人对象
  const newContact = {
    id: 'contact_' + Date.now(), // 用时间戳生成唯一 ID
    name: name,
    avatar: currentAvatarBase64, // 如果没选头像，就是空字符串
    prompt: prompt
  };

  // 获取已有数据，没有则初始化为空数组
  let contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];
  contacts.unshift(newContact); // 把新联系人插到最前面

  // 存回手机本地
  localStorage.setItem('nekobako_contacts', JSON.stringify(contacts));
  
  // 保存成功后，自动跳转回联系人列表页
  window.location.href = 'contacts.html';
}

// 3. 渲染联系人列表
function renderContacts() {
  const listContainer = document.getElementById('contact-list-container');
  const contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];

  if (contacts.length === 0) {
    listContainer.innerHTML = '<p style="color:#8e8e93; font-size:14px; text-align:center; margin-top:50px;">通讯录为空<br>点击右上角 + 号添加角色</p>';
    return;
  }

  listContainer.innerHTML = '';
  
  contacts.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    
    // 处理头像：有图显示图，没图显示首字母
    let avatarHTML = '';
    if (contact.avatar) {
      avatarHTML = `<img src="${contact.avatar}" alt="avatar">`;
    } else {
      avatarHTML = contact.name.charAt(0).toUpperCase(); // 取名字第一个字
    }

    item.innerHTML = `
      <div class="avatar-circle">
        ${avatarHTML}
      </div>
      <div class="contact-name">${contact.name}</div>
    `;
    
    // TODO: 未来给 item 加上 onclick 事件，点击跳转到专属聊天页
    // item.onclick = () => openChat(contact.id);

    listContainer.appendChild(item);
  });
}
