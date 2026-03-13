// 页面加载完成后，立刻渲染已保存的预设列表
document.addEventListener('DOMContentLoaded', renderPresets);

// 1. 拉取模型列表 (OpenAI 格式)
async function fetchModels() {
  const baseUrl = document.getElementById('base-url').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  const modelSelect = document.getElementById('model-select');
  const fetchBtn = document.getElementById('fetch-btn');

  if (!baseUrl || !apiKey) {
    alert("请先填写 Base URL 和 API Key！");
    return;
  }

  fetchBtn.innerText = "正在拉取...";
  modelSelect.innerHTML = '<option>拉取中...</option>';

  try {
    // 自动处理 URL 末尾的斜杠
    const url = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);

    const data = await response.json();
    modelSelect.innerHTML = ''; // 清空选项
    
    // 遍历填充模型，OpenAI 格式的返回值通常在 data.data 数组中
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);
      });
      alert("模型拉取成功！");
    } else {
      throw new Error("接口返回的格式不符合标准 OpenAI 规范");
    }
  } catch (error) {
    alert("拉取失败: \n" + error.message);
    modelSelect.innerHTML = '<option value="">拉取失败</option>';
  } finally {
    fetchBtn.innerText = "拉取可用模型";
  }
}

// 2. 保存预设到 localStorage
function savePreset() {
  const name = document.getElementById('preset-name').value.trim() || '我的猫箱预设';
  const baseUrl = document.getElementById('base-url').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('model-select').value;

  if (!baseUrl || !apiKey || !model || model === "拉取中..." || model === "拉取失败") {
    alert("请确保填写了完整信息，并成功拉取选择了模型！");
    return;
  }

  const presetConfig = { name, baseUrl, apiKey, model };
  let savedPresets = JSON.parse(localStorage.getItem('nekobako_presets')) || [];
  
  // 检查是否重名，重名则覆盖
  const existingIndex = savedPresets.findIndex(p => p.name === name);
  if (existingIndex > -1) {
    savedPresets[existingIndex] = presetConfig;
  } else {
    savedPresets.push(presetConfig);
  }

  localStorage.setItem('nekobako_presets', JSON.stringify(savedPresets));
  alert(`预设 "${name}" 保存成功！`);
  renderPresets();
}

// 3. 渲染预设列表
function renderPresets() {
  const listContainer = document.getElementById('preset-list-container');
  let savedPresets = JSON.parse(localStorage.getItem('nekobako_presets')) || [];

  if (savedPresets.length === 0) {
    listContainer.innerHTML = '<p style="color:#8e8e93; font-size:14px; text-align:center;">暂无保存的预设</p>';
    return;
  }

  listContainer.innerHTML = '';
  savedPresets.forEach((preset, index) => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.innerHTML = `
      <div class="preset-info">
        <div class="preset-name">${preset.name}</div>
        <div class="preset-model">${preset.model}</div>
      </div>
      <div class="preset-actions">
        <button onclick="applyPreset(${index})">应用</button>
        <button class="delete-btn" onclick="deletePreset(${index})">删除</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// 4. 应用预设到输入框
function applyPreset(index) {
  let savedPresets = JSON.parse(localStorage.getItem('nekobako_presets')) || [];
  const preset = savedPresets[index];
  
  document.getElementById('preset-name').value = preset.name;
  document.getElementById('base-url').value = preset.baseUrl;
  document.getElementById('api-key').value = preset.apiKey;
  
  // 强行把模型塞进下拉菜单并选中
  const modelSelect = document.getElementById('model-select');
  modelSelect.innerHTML = `<option value="${preset.model}">${preset.model}</option>`;
  
  // 保存当前激活的预设，供以后聊天页面使用
  localStorage.setItem('nekobako_active_api', JSON.stringify(preset));
  alert(`已应用预设: ${preset.name}。该配置将用于聊天。`);
}

// 5. 删除预设
function deletePreset(index) {
  let savedPresets = JSON.parse(localStorage.getItem('nekobako_presets')) || [];
  if(confirm(`确定要删除预设 "${savedPresets[index].name}" 吗？`)) {
    savedPresets.splice(index, 1);
    localStorage.setItem('nekobako_presets', JSON.stringify(savedPresets));
    renderPresets();
  }
}
