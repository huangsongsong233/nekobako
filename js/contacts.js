let currentAvatarBase64 = "";
// 新增：全局变量，用来记住现在正在编辑哪一个联系人。如果为空，说明是在“新建”。
let currentEditingContactId = null; 

// 打开联系人主页
function openContactsPage() {
  renderContacts();
  openPage('page-contacts-list');
}

// ================= 模式切换：新建 vs 编辑 =================

// 打开“新建”模式
function openNewContactPage() {
  currentEditingContactId = null; // 清空指针，代表新建
  document.getElementById('contact-page-title').innerText = '新建联系人';
  document.getElementById('delete-contact-btn').style.display = 'none'; // 藏起删除按钮

  // 彻底清空表单
  document.getElementById('contact-name').value = '';
  document.getElementById('contact-prompt').value = '';
  document.getElementById('avatar-preview').style.display = 'none';
  document.getElementById('avatar-preview').src = '';
  currentAvatarBase64 = '';

  openPage('page-add-contact');
}

// 打开“编辑”模式
function openEditContactPage(contactId) {
  currentEditingContactId = contactId; // 记住正在编辑谁
  document.getElementById('contact-page-title').innerText = '编辑联系人';
  document.getElementById('delete-contact-btn').style.display = 'block'; // 亮出红色删除按钮

  // 从本地存储把这个人的数据翻出来
  const contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];
  const contact = contacts.find(c => c.id === contactId);

  if (!contact) return;

  // 把数据填进输入框里
  document.getElementById('contact-name').value = contact.name;
  document.getElementById('contact-prompt').value = contact.prompt;

  if (contact.avatar) {
    currentAvatarBase64 = contact.avatar;
    document.getElementById('avatar-preview').src = contact.avatar;
    document.getElementById('avatar-preview').style.display = 'block';
  } else {
    currentAvatarBase64 = '';
    document.getElementById('avatar-preview').style.display = 'none';
    document.getElementById('avatar-preview').src = '';
  }

  openPage('page-add-contact');
}

// ================= 核心增删改查逻辑 =================

function previewAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAvatarBase64 = e.target.result;
    const previewImg = document.getElementById('avatar-preview');
    previewImg.src = currentAvatarBase64;
    previewImg.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// 保存（兼顾新建与修改）
function saveContact() {
  const name = document.getElementById('contact-name').value.trim();
  const prompt = document.getElementById('contact-prompt').value.trim();

  if (!name) {
    alert("请至少填写联系人姓名！");
    return;
  }

  let contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];

  if (currentEditingContactId) {
    // 【修改模式】：找到那个人，替换他的数据
    const index = contacts.findIndex(c => c.id === currentEditingContactId);
    if (index !== -1) {
      contacts[index].name = name;
      contacts[index].prompt = prompt;
      contacts[index].avatar = currentAvatarBase64;
    }
  } else {
    // 【新建模式】：直接生成一个新的人插入数组前面
    const newContact = {
      id: 'contact_' + Date.now(),
      name: name,
      avatar: currentAvatarBase64,
      prompt: prompt
    };
    contacts.unshift(newContact);
  }

  // 存入手机，关闭图层，刷新列表
  localStorage.setItem('nekobako_contacts', JSON.stringify(contacts));
  closePage('page-add-contact');
  renderContacts();
}

// 删除联系人
function deleteContact() {
  // 弹窗做最后确认
  if(!confirm("确定要删除这个联系人吗？\n与TA的所有聊天记录也将被彻底清空，无法恢复！")) {
    return;
  }

  let contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];
  
  // 把这个人从联系人数组里踢出去
  contacts = contacts.filter(c => c.id !== currentEditingContactId);
  localStorage.setItem('nekobako_contacts', JSON.stringify(contacts));

  // 重点：同时将这个人的聊天记录连根拔起！
  localStorage.removeItem('nekobako_chat_' + currentEditingContactId);

  // 关闭页面，刷新列表
  closePage('page-add-contact');
  renderContacts();
}

// 渲染联系人列表
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
    
    // 绑定点击事件：现在点击任何联系人，就会把他的ID传给“编辑模式”
    item.onclick = () => openEditContactPage(contact.id);
    
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
