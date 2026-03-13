// 全局变量，用于在不同函数间共享当前聊天状态
let currentContact = null;
let chatHistory = [];
let activeApi = null;

// 当页面加载完成时执行初始化
document.addEventListener('DOMContentLoaded', () => {
  // 1. 从网址链接中提取联系人 ID (例如 ?id=contact_12345)
  const urlParams = new URLSearchParams(window.location.search);
  const contactId = urlParams.get('id');

  // 2. 从本地存储寻找这位联系人的完整数据
  const contacts = JSON.parse(localStorage.getItem('nekobako_contacts')) || [];
  currentContact = contacts.find(c => c.id === contactId);

  // 如果找不到，说明有人乱敲网址，踢回微信列表
  if (!currentContact) {
    alert('找不到该联系人，请从微信列表重新进入！');
    window.location.href = 'wechat_list.html';
    return;
  }

  // 3. 将聊天房间的标题改成对方的名字
  document.getElementById('chat-title').innerText = currentContact.name;

  // 4. 检查有没有在设置里配置并“应用”大模型 API
  activeApi = JSON.parse(localStorage.getItem('nekobako_active_api'));
  if (!activeApi) {
    alert('提示：您还没有配置大模型接口！请先去桌面“设置”中拉取模型并点击“应用”。');
  }

  // 5. 加载你们的历史聊天记录 (专属这个联系人的记忆)
  const historyKey = 'nekobako_chat_' + currentContact.id;
  chatHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
  
  // 渲染历史记录到屏幕上
  renderHistory();

  // 6. 贴心小功能：在输入框按 Enter 键直接发送 (Shift+Enter 换行)
  document.getElementById('message-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); 
      sendMessage();
    }
  });
});

// ================= UI 渲染部分 =================

// 将历史记录一条条画到屏幕上
function renderHistory() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '';
  chatHistory.forEach(msg => {
    appendMessage(msg.role, msg.content);
  });
}

// 在聊天框里新增一个气泡 (user 是你，assistant 是 AI)
function appendMessage(role, text) {
  const chatBox = document.getElementById('chat-box');
  const row = document.createElement('div');
  row.className = `message-row ${role === 'user' ? 'user' : 'ai'}`;

  // 处理头像
  let avatarHtml = '';
  // 重点修复这里：只要身份不是 'user'，就全都使用当前联系人（AI）的头像
  if (role !== 'user') { 
    if (currentContact.avatar) {
      avatarHtml = `<div class="chat-avatar"><img src="${currentContact.avatar}"></div>`;
    } else {
      avatarHtml = `<div class="chat-avatar">${currentContact.name.charAt(0)}</div>`;
    }
  } else {
    // 你的默认头像（蓝色底，写着“我”）
    avatarHtml = `<div class="chat-avatar" style="background-color:#0a84ff;">我</div>`;
  }

  // 处理文本（将真实的换行符替换为网页的换行标签）
  const formattedText = text.replace(/\n/g, '<br>');
  const bubbleHtml = `<div class="chat-bubble">${formattedText}</div>`;

  // 根据身份决定气泡和头像的左右顺序
  if (role === 'user') {
    row.innerHTML = bubbleHtml + avatarHtml;
  } else {
    row.innerHTML = avatarHtml + bubbleHtml;
  }

  chatBox.appendChild(row);
  scrollToBottom(); // 自动滚到底部
}

// 永远让最新消息保持在可视区域的最下方
function scrollToBottom() {
  const chatBox = document.getElementById('chat-box');
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ================= 核心大模型通讯部分 =================

async function sendMessage() {
  // 再次拦截：没配置 API 绝对不让发请求
  if (!activeApi) {
    alert('请先去桌面“设置”中应用一个预设模型！');
    return;
  }

  const inputEl = document.getElementById('message-input');
  const text = inputEl.value.trim();
  if (!text) return; // 不允许发空消息

  const sendBtn = document.getElementById('send-btn');

  // 1. 立即在屏幕上显示你发的消息，并清空输入框
  appendMessage('user', text);
  inputEl.value = '';
  
  // 禁用发送按钮，防止连按
  sendBtn.disabled = true;
  sendBtn.innerText = '正在输入...';

  // 2. 存入你的发言记忆
  chatHistory.push({ role: 'user', content: text });
  saveHistory();

  // 3. 施加“魔法”：拼装给大模型的终极提示词
  const baseRule = `你现在正在和用户进行微信私聊。请你必须严格遵守以下规则进行角色扮演：\n1. 沉浸式扮演：绝不能承认自己是AI或大语言模型，遇到不知道的事情请用符合人设的借口搪塞。\n2. 微信语境：回复要像真人发微信一样，口语化、接地气、简短有力，严禁长篇大论和复杂的排版格式。\n3. 你的具体角色设定如下：\n`;
  const systemPrompt = baseRule + currentContact.prompt;

  // 这是符合 OpenAI 格式的对话数组 (系统设定 + 历史记录)
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory 
  ];

  try {
    // 智能处理 URL 结尾多余的斜杠，防止报错
    const baseUrl = activeApi.baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;

    // 4. 发送网络请求给大模型服务器
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeApi.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: activeApi.model,
        messages: apiMessages,
        temperature: 0.7 // 0.7 是角色扮演的黄金温度，兼顾创造力与逻辑
      })
    });

    // 如果接口报错，立刻扔出异常
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `服务器返回状态码 ${response.status}`);
    }

    // 5. 解析并剥离出大模型的纯文本回复
    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    // 6. 在屏幕左侧显示 AI 的回复，并存入记忆
    appendMessage('assistant', aiReply);
    chatHistory.push({ role: 'assistant', content: aiReply });
    saveHistory();

  } catch (error) {
    // 遇到任何网络断开、密钥错误等问题，都会在这里被安全拦截并弹窗提示
    alert("发送失败，请检查网络或 API 配置。\n详细错误：" + error.message);
    
    // 把那条没发成功的消息从记忆里踢出去，防止弄脏上下文
    chatHistory.pop(); 
    saveHistory();
  } finally {
    // 无论成功还是失败，最后都恢复发送按钮状态
    sendBtn.disabled = false;
    sendBtn.innerText = '发送';
    inputEl.focus();
  }
}

// ================= 数据持久化 =================

// 将当前的聊天记录无缝保存到手机本地
function saveHistory() {
  const historyKey = 'nekobako_chat_' + currentContact.id;
  localStorage.setItem(historyKey, JSON.stringify(chatHistory));
}
