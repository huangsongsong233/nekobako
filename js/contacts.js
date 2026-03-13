// 全局变量，用于临时存储选中头像的 Base64 数据
let currentAvatarBase64 = "";

// ================= SPA 专属：图层路由 =================

// 打开联系人主页
function openContactsPage() {
  renderContacts(); // 呼出前先刷新一下列表，确保数据最新
  openPage('page-contacts-list');
}

// ================= 核心功能逻辑 =================

// 1. 头像预览与 Base64 转换
function previewAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAvatarBase64 = e.target.result;
    
    // 更新 UI 预览
    const previewImg = document.getElementById('avatar-preview');
    previewImg.src = currentAvatarBase64;
    previewImg.style.display = 'block';
  };
  
  reader.readAsDataURL(file);
}

// 2. 保存联系人到本地
function saveContact() {
  const name = document.getElementById('contact-name').value.trim();
  const prompt = document.getElementById('contact-prompt').value.trim();

  if (!name) {
    alert("请至少填写联系人姓名！");
    return;
  }

  const newContact = {
    id: 'contact_' + Date.now(),
    name: name,
    avatar: currentAvatarBase64,
    prompt: prompt
  };

  let contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];
  contacts.unshift(newContact); // 把新角色插到最前面

  localStorage.setItem('nekobako_contacts', JSON.stringify(contacts));
  
  // SPA 魔法：保存成功后，不刷新网页，直接关闭添加图层，并重新渲染底层列表
  closePage('page-add-contact');
  renderContacts();

  // 贴心细节：清空刚才填写的表单，为下次添加做准备
  document.getElementById('contact-name').value = '';
  document.getElementById('contact-prompt').value = '';
  document.getElementById('avatar-preview').style.display = 'none';
  document.getElementById('avatar-preview').src = '';
  currentAvatarBase64 = '';
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
    
    let avatarHTML = contact.avatar 
      ? `<img src="${contact.avatar}" alt="avatar">` 
      : contact.name.charAt(0).toUpperCase();

    item.innerHTML = `
      <div class="avatar-circle">
        ${avatarHTML}
      </div>
      <div class="contact-name">${contact.name}</div>
    `;

    listContainer.appendChild(item);
  });
}
