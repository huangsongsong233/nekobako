// 全局变量
let currentContact = null;
let chatHistory = [];
let activeApi = null;

// 初始化：绑定回车键发送功能
document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('message-input');
  if (inputEl) {
    inputEl.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        sendMessage();
      }
    });
  }
});

// ================= SPA 专属：打开微信与聊天室 =================

// 1. 打开微信消息列表
function openWechatList() {
  openPage('page-wechat-list'); // 呼出微信列表图层
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
    
    // 重点：点击时直接调用 JS 函数，把 ID 传过去，而不是跳网页！
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

// 2. 打开具体的聊天房间
function openChatRoom(contactId) {
  const contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];
  currentContact = contacts.find(c => c.id === contactId);

  if (!currentContact) return;

  // 设置标题
  document.getElementById('chat-title').innerText = currentContact.name;

  // 检查 API 配置
  activeApi = JSON.parse(localStorage.getItem('nekobako_active_api'));
  if (!activeApi) {
    alert('提示：您还没有配置大模型接口！请先去桌面“设置”中拉取模型并应用。');
  }

  // 加载专属记忆
  const historyKey = 'nekobako_chat_' + currentContact.id;
  chatHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
  renderHistory();

  // 把聊天室图层推入屏幕
  openPage('page-chat'); 
}

// ================= UI 渲染与大模型通讯 =================

// 将历史记录画到屏幕上
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

// 发送消息给大模型
async function sendMessage() {
  if (!activeApi) {
    alert('请先去桌面“设置”中应用一个预设模型！');
    return;
  }

  const inputEl = document.getElementById('message-input');
  const text = inputEl.value.trim();
  if (!text) return;

  const sendBtn = document.getElementById('send-btn');

  appendMessage('user', text);
  inputEl.value = '';
  sendBtn.disabled = true;
  sendBtn.innerText = '正在输入...';

  chatHistory.push({ role: 'user', content: text });
  saveHistory();

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
        temperature: 0.7 
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
    alert("发送失败，请检查网络或 API 配置。\n详细错误：" + error.message);
    chatHistory.pop(); 
    saveHistory();
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerText = '发送';
    inputEl.focus();
  }
}

function saveHistory() {
  const historyKey = 'nekobako_chat_' + currentContact.id;
  localStorage.setItem(historyKey, JSON.stringify(chatHistory));
}
