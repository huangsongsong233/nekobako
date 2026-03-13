// 全局变量
let currentContact = null;
let chatHistory = [];
let activeApi = null;

// ================= 初始化与事件监听 =================
document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('message-input');
  if (inputEl) {
    // 1. 监听回车键发送消息
    inputEl.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        sendMessage();
      }
    });

    // 2. 监听打字：实现 ➕ 号和 发送键 的丝滑切换
    inputEl.addEventListener('input', function() {
      const hasText = this.value.trim().length > 0;
      const plusBtn = document.getElementById('plus-btn');
      const sendBtn = document.getElementById('send-btn');
      
      if (hasText) {
        plusBtn.classList.add('hide');
        sendBtn.classList.remove('hidden');
      } else {
        plusBtn.classList.remove('hide');
        sendBtn.classList.add('hidden');
      }
    });

    // 3. 监听焦点：只要键盘弹起准备打字，立马合上底部的九宫格抽屉
    inputEl.addEventListener('focus', function() {
      closeBottomDrawer();
    });
  }
});

// ================= 底部抽屉与面板逻辑 =================

// 切换抽屉状态（表情面板 或 ➕号面板）
function toggleBottomDrawer(type) {
  const drawer = document.getElementById('bottom-drawer');
  const emojiPanel = document.getElementById('emoji-panel');
  const plusPanel = document.getElementById('plus-panel');
  
  // 强行把手机软键盘收起来
  document.getElementById('message-input').blur();

  // 如果点的是已经打开的那个面板，就把它关上
  if (drawer.classList.contains('open') && drawer.dataset.current === type) {
    closeBottomDrawer();
    return;
  }

  // 展开抽屉，并切换对应的面板显示
  drawer.classList.add('open');
  drawer.dataset.current = type;
  
  if (type === 'emoji') {
    emojiPanel.style.display = 'block';
    plusPanel.style.display = 'none';
  } else if (type === 'plus') {
    emojiPanel.style.display = 'none';
    plusPanel.style.display = 'block';
  }
}

// 关闭底部抽屉
function closeBottomDrawer() {
  const drawer = document.getElementById('bottom-drawer');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.dataset.current = '';
  }
}


// ================= SPA 专属：打开微信与聊天室 =================

// 打开微信消息列表
function openWechatList() {
  openPage('page-wechat-list'); 
  const listContainer = document.getElementById('wechat-list-container');
  const contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];

  if (contacts.length === 0) {
    listContainer.innerHTML = '<p style="color:#8e8e93; font-size:14px; text-align:center; padding: 20px;">暂无聊天消息<br>请先去桌面“联系人”添加角色</p>';
    return;
  }

  listContainer.innerHTML = '';
  contacts.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.style.padding = '15px';
    item.style.color = '#333';
    
    // 点击时把角色 ID 传过去
    item.onclick = () => openChatRoom(contact.id); 

    let avatarHTML = contact.avatar 
      ? `<img src="${contact.avatar}">` 
      : contact.name.charAt(0).toUpperCase();

    item.innerHTML = `
      <div class="avatar-circle" style="border-radius: 4px;">${avatarHTML}</div>
      <div class="contact-name" style="color: #333;">${contact.name}</div>
    `;
    listContainer.appendChild(item);
  });
}

// 打开具体的聊天房间
function openChatRoom(contactId) {
  const contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];
  currentContact = contacts.find(c => c.id === contactId);

  if (!currentContact) return;

  // 设置顶部名字
  document.getElementById('chat-title').innerText = currentContact.name;

  // 检查 API
  activeApi = JSON.parse(localStorage.getItem('nekobako_active_api'));
  if (!activeApi) {
    alert('提示：您还没有配置大模型接口！请先去桌面“设置”中拉取模型并应用。');
  }

  // 加载专属记忆
  const historyKey = 'nekobako_chat_' + currentContact.id;
  chatHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
  renderHistory();

  openPage('page-chat'); 
}


// ================= UI 渲染部分 =================

// 渲染全部历史记录
function renderHistory() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '';
  chatHistory.forEach(msg => {
    appendMessage(msg.role, msg.content);
  });
}

// 渲染单个气泡
function appendMessage(role, text) {
  const chatBox = document.getElementById('chat-box');
  const row = document.createElement('div');
  row.className = `message-row ${role === 'user' ? 'user' : 'ai'}`;

  let avatarHtml = '';
  if (role !== 'user') { 
    if (currentContact.avatar) {
      avatarHtml = `<div class="chat-avatar"><img src="${currentContact.avatar}"></div>`;
    } else {
      avatarHtml = `<div class="chat-avatar">${currentContact.name.charAt(0)}</div>`;
    }
  } else {
    avatarHtml = `<div class="chat-avatar" style="background-color:#0a84ff;">我</div>`;
  }

  const formattedText = text.replace(/\n/g, '<br>');
  const bubbleHtml = `<div class="chat-bubble">${formattedText}</div>`;

  if (role === 'user') {
    row.innerHTML = bubbleHtml + avatarHtml;
  } else {
    row.innerHTML = avatarHtml + bubbleHtml;
  }

  chatBox.appendChild(row);
  scrollToBottom();
}

function scrollToBottom() {
  const chatBox = document.getElementById('chat-box');
  chatBox.scrollTop = chatBox.scrollHeight;
}


// ================= 核心大模型通讯与重生成 =================

// 发送正常消息
async function sendMessage() {
  if (!activeApi) {
    alert('请先去桌面“设置”中应用一个预设模型！');
    return;
  }

  const inputEl = document.getElementById('message-input');
  const text = inputEl.value.trim();
  if (!text) return;

  const sendBtn = document.getElementById('send-btn');

  // 立即显示用户发言
  appendMessage('user', text);
  inputEl.value = '';
  
  // 魔法细节：强行触发 input 事件，让发送键缩回去变回 ➕ 号
  inputEl.dispatchEvent(new Event('input')); 
  closeBottomDrawer();

  sendBtn.disabled = true;
  sendBtn.innerText = '发送中...';

  chatHistory.push({ role: 'user', content: text });
  saveHistory();

  await fetchAiReply();
  
  sendBtn.disabled = false;
  sendBtn.innerText = '发送';
  inputEl.focus();
}

// “重新生成”功能的终极魔法
async function regenerateMessage() {
  closeBottomDrawer(); // 收起抽屉

  if (!activeApi) {
    alert('请先去桌面“设置”中应用一个预设模型！');
    return;
  }

  if (chatHistory.length === 0) return;

  // 检查最后一条消息是不是 AI 发的
  const lastMsg = chatHistory[chatHistory.length - 1];
  if (lastMsg.role !== 'assistant') {
    alert('提示：只有 AI 的最后一条回复才可以重新生成哦！');
    return;
  }

  // 核心逻辑：抹除记忆里的最后一条 AI 回复，并重新渲染屏幕
  chatHistory.pop();
  saveHistory();
  renderHistory();

  // 再次呼叫大模型
  await fetchAiReply();
}

// 提取出来的公共网络请求模块 (防止代码重复)
async function fetchAiReply() {
  const baseRule = `你现在正在和用户进行微信私聊。请你必须严格遵守以下规则进行角色扮演：\n1. 沉浸式扮演：绝不能承认自己是AI或大语言模型，遇到不知道的事情请用符合人设的借口搪塞。\n2. 微信语境：回复要像真人发微信一样，口语化、接地气、简短有力，严禁长篇大论和复杂的排版格式。\n3. 你的具体角色设定如下：\n`;
  const systemPrompt = baseRule + currentContact.prompt;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory 
  ];

  try {
    const baseUrl = activeApi.baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeApi.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: activeApi.model,
        messages: apiMessages,
        temperature: 0.8 // 重新生成时，稍微调高一点温度(0.8)可以让每次重答更不一样
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `服务器返回状态码 ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    appendMessage('assistant', aiReply);
    chatHistory.push({ role: 'assistant', content: aiReply });
    saveHistory();

  } catch (error) {
    alert("请求失败，请检查网络或 API 配置。\n详细错误：" + error.message);
    // 如果是正常发消息失败，需要把用户发的那条记录也弹出来，防止卡死
    // 这里做了一个简单的防呆处理
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
      chatHistory.pop();
      saveHistory();
      renderHistory(); // 重新渲染，把发失败的消息拿掉
    }
  }
}

// ================= 数据持久化 =================
function saveHistory() {
  const historyKey = 'nekobako_chat_' + currentContact.id;
  localStorage.setItem(historyKey, JSON.stringify(chatHistory));
}
