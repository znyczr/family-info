/* =========================================================
   家人档案 · Family Profile
   数据逻辑：增删改查 / 导出导入 / 离线存储 (localStorage)
   ========================================================= */
'use strict';

/* ---------------- 常量与初始数据 ---------------- */
const STORAGE_KEY = 'family_members_v1';

const AVATAR_COLORS = [
  '#4a7cf7', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

// 表单字段分组（按用户需求 + 少量补充）
const FIELD_GROUPS = [
  {
    title: '基本信息', icon: '👤',
    fields: [
      { key: 'name', label: '姓名', type: 'text', required: true, placeholder: '请输入姓名（必填）' },
      { key: 'relation', label: '家庭关系', type: 'text', placeholder: '如：爸爸、妈妈、哥哥' },
      { key: 'birthday', label: '生日', type: 'date', hint: '填写生日后年龄可自动计算' },
      { key: 'age', label: '年龄', type: 'number', placeholder: '选填', hint: '留空将按生日自动计算' },
      { key: 'idNumber', label: '身份证号', type: 'text', placeholder: '选填' }
    ]
  },
  {
    title: '学业与工作', icon: '📚',
    fields: [
      { key: 'school', label: '学校', type: 'text', placeholder: '选填' },
      { key: 'employer', label: '单位', type: 'text', placeholder: '选填' }
    ]
  },
  {
    title: '身体状况', icon: '🩺',
    fields: [
      { key: 'height', label: '身高（cm）', type: 'number', placeholder: '如 175' },
      { key: 'weight', label: '体重（kg）', type: 'number', placeholder: '如 65' },
      { key: 'bloodType', label: '血型', type: 'select', options: ['', 'A', 'B', 'AB', 'O', '未知'] },
      { key: 'bloodPressure', label: '血压', type: 'text', placeholder: '如 120/80 mmHg' }
    ]
  },
  {
    title: '尺码信息', icon: '👕',
    fields: [
      { key: 'clothSize', label: '衣服尺码', type: 'select', options: ['', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '童装'] },
      { key: 'pantsSize', label: '裤子尺码', type: 'text', placeholder: '如 32码 或 175/86A' },
      { key: 'shoeSize', label: '鞋子尺码', type: 'text', placeholder: '如 42 或 36.5' }
    ]
  },
  {
    title: '兴趣与偏好', icon: '❤️',
    fields: [
      { key: 'specialties', label: '特长', type: 'text', placeholder: '多个可用逗号分隔' },
      { key: 'hobbies', label: '爱好', type: 'text', placeholder: '多个可用逗号分隔' },
      { key: 'favoriteFoods', label: '喜欢吃什么', type: 'text', placeholder: '多个可用逗号分隔' },
      { key: 'avoidFoods', label: '忌口吃什么', type: 'text', placeholder: '如过敏食物，多个可用逗号分隔' }
    ]
  },
  {
    title: '健康信息', icon: '💊',
    fields: [
      { key: 'diseaseRisk', label: '疾病隐患', type: 'textarea', placeholder: '如过敏史、慢性病、手术史、遗传病史等' },
      { key: 'notes', label: '备注', type: 'textarea', placeholder: '其他想记录的信息' }
    ]
  }
];

// 详情页展示时按组过滤（复用分组，仅显示有内容的行）
const DETAIL_FIELD_LABEL = {};
FIELD_GROUPS.forEach(function (g) {
  g.fields.forEach(function (f) { DETAIL_FIELD_LABEL[f.key] = f.label; });
});

const CHIP_FIELDS = ['specialties', 'hobbies', 'favoriteFoods', 'avoidFoods'];

/* ---------------- 数据存储 ---------------- */
let members = loadMembers();
let editingId = null;       // 正在编辑的成员 id，null 表示新增
let viewingId = null;       // 当前详情页展示的成员 id
let modalResolve = null;    // 删除确认弹窗的回调

function defaultMember(name, relation) {
  return {
    id: uid(),
    name: name || '',
    relation: relation || '',
    birthday: '',
    age: '',
    idNumber: '',
    school: '',
    employer: '',
    height: '',
    weight: '',
    bloodType: '',
    bloodPressure: '',
    clothSize: '',
    pantsSize: '',
    shoeSize: '',
    specialties: '',
    hobbies: '',
    favoriteFoods: '',
    avoidFoods: '',
    diseaseRisk: '',
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function loadMembers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) { /* 数据损坏则重建 */ }
  // 首次使用：预置基础家人
  const seed = [
    defaultMember('Daddy', '爸爸'),
    defaultMember('Mommy', '妈妈'),
    defaultMember('Joy', ''),
    defaultMember('Aaron', '')
  ];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch (e) {}
  return seed;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(members)); } catch (e) {}
  render();
}

/* ---------------- 工具函数 ---------------- */
function uid() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function avatarChar(name) { return (name || '?').trim().charAt(0); }

function splitTags(s) {
  return String(s || '')
    .split(/[,，、;；\n]+/)
    .map(function (t) { return t.trim(); })
    .filter(Boolean);
}

function calcAge(birthdayStr, now) {
  if (!birthdayStr) return null;
  const b = new Date(birthdayStr);
  if (isNaN(b.getTime())) return null;
  const t = now || new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age >= 0 ? age : null;
}

function displayAge(member) {
  const calc = calcAge(member.birthday);
  if (calc != null) return calc + ' 岁';
  return member.age ? member.age + ' 岁' : '';
}

function formatDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.hidden = true; }, 2000);
}

function showView(name) {
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.getElementById('view-' + name).classList.add('active');
  window.scrollTo(0, 0);
}

/* ---------------- 渲染：首页 ---------------- */
function render() {
  renderHome();
  renderMemberCount();
}

function renderHome() {
  const grid = document.getElementById('member-grid');
  const empty = document.getElementById('empty-state');
  if (!members.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.innerHTML = members.map(function (m) {
    const sub = m.relation || '家人';
    const chips = [];
    const age = displayAge(m);
    if (age) chips.push('<span class="chip">' + esc(age) + '</span>');
    if (m.bloodType) chips.push('<span class="chip">' + esc(m.bloodType) + '型</span>');
    if (m.bloodPressure) chips.push('<span class="chip">血压 ' + esc(m.bloodPressure) + '</span>');
    return '<div class="member-card" onclick="openDetail(\'' + m.id + '\')">' +
      '<div class="avatar" style="background:' + avatarColor(m.name) + '">' + esc(avatarChar(m.name)) + '</div>' +
      '<div class="m-name">' + esc(m.name) + '</div>' +
      '<div class="m-sub">' + esc(sub) + '</div>' +
      '<div class="m-chips">' + chips.join('') + '</div>' +
      '</div>';
  }).join('');
}

function renderMemberCount() {
  document.getElementById('member-count').textContent = '共 ' + members.length + ' 位家人';
}

/* ---------------- 渲染：详情 ---------------- */
function openDetail(id) {
  const m = members.find(function (x) { return x.id === id; });
  if (!m) return;
  viewingId = id;

  const heroChips = [];
  const age = displayAge(m);
  if (age) heroChips.push('<span class="chip">' + esc(age) + '</span>');
  if (m.bloodType) heroChips.push('<span class="chip">' + esc(m.bloodType) + '型</span>');
  if (m.height) heroChips.push('<span class="chip">身高 ' + esc(m.height) + 'cm</span>');
  if (m.weight) heroChips.push('<span class="chip">体重 ' + esc(m.weight) + 'kg</span>');
  if (m.shoeSize) heroChips.push('<span class="chip">鞋 ' + esc(m.shoeSize) + ' 码</span>');

  let html = '<div class="detail-hero">' +
    '<div class="avatar" style="background:' + avatarColor(m.name) + '">' + esc(avatarChar(m.name)) + '</div>' +
    '<h2>' + esc(m.name) + '</h2>' +
    (m.relation ? '<div class="d-rel">' + esc(m.relation) + '</div>' : '') +
    (heroChips.length ? '<div class="d-chips">' + heroChips.join('') + '</div>' : '') +
    '</div>';

  FIELD_GROUPS.forEach(function (g) {
    const rows = [];
    g.fields.forEach(function (f) {
      const val = m[f.key];
      if (val == null || val === '') return;
      if (f.key === 'birthday') {
        rows.push(rowHtml('生日', formatDate(val)));
      } else if (f.key === 'age') {
        rows.push(rowHtml('年龄', displayAge(m)));
      } else if (CHIP_FIELDS.indexOf(f.key) >= 0) {
        const tags = splitTags(val);
        rows.push('<tr><td>' + esc(f.label) + '</td><td class="tag-row"><div class="tag-list">' +
          tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
          '</div></td></tr>');
      } else {
        rows.push(rowHtml(f.label, val));
      }
    });
    if (!rows.length) return;
    html += '<div class="detail-section"><div class="sec-title"><span class="sec-icon">' + g.icon + '</span>' +
      esc(g.title) + '</div><table>' + rows.join('') + '</table></div>';
  });

  html += '<div class="detail-delete"><button class="text-btn" onclick="askDelete(\'' + m.id + '\')">删除这位家人</button></div>';

  document.getElementById('detail-title').textContent = m.name;
  document.getElementById('detail-content').innerHTML = html;
  showView('detail');
}

function rowHtml(label, val) {
  return '<tr><td>' + esc(label) + '</td><td>' + esc(val) + '</td></tr>';
}

/* ---------------- 渲染：表单 ---------------- */
function openForm(id) {
  editingId = id || null;
  const m = id ? members.find(function (x) { return x.id === id; }) : defaultMember();
  const isEdit = !!id;

  document.getElementById('form-title').textContent = isEdit ? '编辑信息' : '添加家人';

  let html = '';
  FIELD_GROUPS.forEach(function (g) {
    html += '<div class="form-section"><div class="sec-title"><span class="sec-icon">' + g.icon + '</span>' + esc(g.title) + '</div>';
    g.fields.forEach(function (f) {
      const val = m[f.key] || '';
      const req = f.required ? '<span class="req">*</span>' : '';
      const hint = f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '';
      const idAttr = 'fld_' + f.key;
      let input;
      if (f.type === 'select') {
        input = '<select id="' + idAttr + '">' + f.options.map(function (o) {
          return '<option value="' + esc(o) + '"' + (o === val ? ' selected' : '') + '>' + esc(o || '未填写') + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        input = '<textarea id="' + idAttr + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(val) + '</textarea>';
      } else {
        input = '<input type="' + f.type + '" id="' + idAttr + '" value="' + esc(val) + '" placeholder="' + esc(f.placeholder || '') + '"' +
          (f.type === 'number' ? ' inputmode="decimal"' : '') + '>';
      }
      html += '<div class="form-row"><label>' + esc(f.label) + req + '</label>' + input + hint + '</div>';
    });
    html += '</div>';
  });

  html += '<div class="form-footer"><button class="save-btn" style="width:100%" id="form-submit">保存</button></div>';

  document.getElementById('form-content').innerHTML = html;
  showView('form');

  document.getElementById('form-submit').addEventListener('click', saveForm);
  document.getElementById('form-content').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      if (e.target.type !== 'date') saveForm();
    }
  });
}

function saveForm() {
  const m = editingId ? members.find(function (x) { return x.id === editingId; }) : defaultMember();
  if (!m) return;

  const name = document.getElementById('fld_name').value.trim();
  if (!name) {
    toast('请填写姓名');
    document.getElementById('fld_name').focus();
    return;
  }

  FIELD_GROUPS.forEach(function (g) {
    g.fields.forEach(function (f) {
      if (f.key === 'name' || f.key === 'id') return;
      const el = document.getElementById('fld_' + f.key);
      if (el) m[f.key] = el.value.trim();
    });
  });
  m.name = name;

  // 年龄留空时按生日自动计算
  if (!m.age && m.birthday) {
    const calc = calcAge(m.birthday);
    if (calc != null) m.age = String(calc);
  }

  m.updatedAt = Date.now();
  if (!editingId) {
    m.createdAt = m.updatedAt;
    members.unshift(m);
  }
  persist();
  toast(editingId ? '已保存修改' : '已添加「' + m.name + '」');
  openDetail(m.id);
}

/* ---------------- 删除 ---------------- */
function askDelete(id) {
  const m = members.find(function (x) { return x.id === id; });
  if (!m) return;
  confirmModal(
    '删除确认',
    '确定要删除「' + m.name + '」的信息吗？此操作无法撤销。',
    function () {
      members = members.filter(function (x) { return x.id !== id; });
      persist();
      toast('已删除');
      showView('home');
    }
  );
}

function confirmModal(title, text, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-text').textContent = text;
  const modal = document.getElementById('modal');
  modal.hidden = false;
  modalResolve = onConfirm;
}

/* ---------------- 导出 / 导入备份 ---------------- */
function exportData() {
  if (!members.length) { toast('还没有数据可以导出'); return; }
  const payload = { app: 'family-profile', version: 1, exportedAt: new Date().toISOString(), members: members };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = '家人档案备份-' + d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  toast('已导出备份文件');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.members) ? data.members : null);
      if (!list || !list.length) { toast('备份文件里没有数据'); return; }
      // 保证每个成员都有必填字段
      const cleaned = list.map(function (raw) {
        const m = defaultMember(raw.name || '');
        Object.keys(m).forEach(function (k) { if (raw[k] !== undefined) m[k] = raw[k]; });
        return m;
      });
      members = cleaned;
      persist();
      toast('已导入 ' + cleaned.length + ' 位家人');
    } catch (e) {
      toast('文件格式不正确');
    }
  };
  reader.readAsText(file);
}

/* ---------------- 事件绑定 ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  render();

  document.getElementById('fab-add').addEventListener('click', function () { openForm(null); });
  document.getElementById('btn-back').addEventListener('click', function () { showView('home'); });
  document.getElementById('btn-edit').addEventListener('click', function () {
    if (viewingId) openForm(viewingId);
  });
  document.getElementById('btn-form-cancel').addEventListener('click', function () {
    if (editingId) openDetail(editingId);
    else showView('home');
  });
  // 顶部「保存」按钮与表单底部保存按钮等效
  document.getElementById('btn-form-save').addEventListener('click', saveForm);

  document.getElementById('btn-export').addEventListener('click', exportData);

  document.getElementById('btn-import').addEventListener('click', function () {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  document.getElementById('modal-cancel').addEventListener('click', function () {
    document.getElementById('modal').hidden = true;
  });
  document.getElementById('modal-confirm').addEventListener('click', function () {
    document.getElementById('modal').hidden = true;
    if (modalResolve) { const fn = modalResolve; modalResolve = null; fn(); }
  });

  // 返回键关闭弹窗
  document.getElementById('modal').addEventListener('click', function (e) {
    if (e.target === this) this.hidden = true;
  });

  setupInstall();
});

/* ---------------- PWA 安装 ---------------- */
function setupInstall() {
  let deferredPrompt = null;
  const banner = document.getElementById('install-banner');
  const btn = document.getElementById('btn-install');
  const closeBtn = document.getElementById('btn-install-close');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    banner.hidden = false;
  });

  btn.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      banner.hidden = true;
    });
  });

  closeBtn.addEventListener('click', function () { banner.hidden = true; });

  // 如果已安装（standalone 模式），不再显示提示
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    banner.hidden = true;
  }
}
