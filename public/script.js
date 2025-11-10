const API_BASE = '/purchase-orders';

const ordersTable = document.getElementById('orders-table');
const ordersBody = document.getElementById('orders-body');
const ordersEmpty = document.getElementById('orders-empty');
const detailArea = document.getElementById('detail-area');
const toastEl = document.getElementById('toast');
const refreshBtn = document.getElementById('refresh-btn');
const createForm = document.getElementById('create-form');

refreshBtn.addEventListener('click', () => loadOrders());
createForm.addEventListener('submit', handleCreateSubmit);

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  toastEl.classList.add('show');
  toastEl.style.backgroundColor = type === 'error' ? '#dc2626' : '#2563eb';

  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2500);
}

async function loadOrders() {
  toggleLoading(true);
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) {
      throw new Error(`加载失败：${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    renderOrders(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error(error);
    showToast(error.message || '加载订单失败', 'error');
  } finally {
    toggleLoading(false);
  }
}

function renderOrders(orders) {
  ordersBody.innerHTML = '';
  if (!orders.length) {
    ordersTable.classList.add('hidden');
    ordersEmpty.classList.remove('hidden');
    return;
  }

  ordersEmpty.classList.add('hidden');
  ordersTable.classList.remove('hidden');

  orders.forEach((order) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.orderCode}</td>
      <td>${order.supplierName}</td>
      <td>${order.orderDate || '-'}</td>
      <td>${formatCurrency(order.totalAmount, order.currency || 'CNY')}</td>
      <td>${order.status || '-'}</td>
      <td class="actions">
        <button data-id="${order.id}" class="view-btn">查看</button>
        <button data-id="${order.id}" class="delete-btn">删除</button>
      </td>
    `;

    tr.querySelector('.view-btn')?.addEventListener('click', () => loadOrderDetail(order.id));
    tr.querySelector('.delete-btn')?.addEventListener('click', () => removeOrder(order.id));

    ordersBody.appendChild(tr);
  });
}

async function loadOrderDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) {
      throw new Error(`查询失败：${res.statusText}`);
    }
    const data = await res.json();
    detailArea.classList.remove('empty-state');
    detailArea.innerHTML = `
      <h3>${data.orderCode} · ${data.supplierName}</h3>
      <p>总金额：${formatCurrency(data.totalAmount, data.currency || 'CNY')}（未税：${formatCurrency(
        data.subtotalAmount,
        data.currency || 'CNY',
      )}，税额：${formatCurrency(data.taxAmount, data.currency || 'CNY')}）</p>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
  } catch (error) {
    console.error(error);
    showToast(error.message || '加载订单详情失败', 'error');
  }
}

async function removeOrder(id) {
  if (!confirm('确认删除这条采购订单？')) {
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`删除失败：${res.statusText}`);
    }
    showToast('删除成功');
    await loadOrders();
    resetDetailIfRemoved(id);
  } catch (error) {
    console.error(error);
    showToast(error.message || '删除订单失败', 'error');
  }
}

function resetDetailIfRemoved(id) {
  if (detailArea.textContent.includes(id)) {
    detailArea.classList.add('empty-state');
    detailArea.textContent = '点击列表中的“查看”加载详情。';
  }
}

async function handleCreateSubmit(event) {
  event.preventDefault();
  const formData = new FormData(createForm);

  let itemsRaw = formData.get('items');
  let items = [];
  try {
    items = JSON.parse(itemsRaw);
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('请至少输入一条订单明细');
    }
  } catch (error) {
    showToast(`明细解析失败：${error.message}`, 'error');
    return;
  }

  const payload = {
    orderCode: formData.get('orderCode')?.trim(),
    supplierName: formData.get('supplierName')?.trim(),
    supplierContact: formData.get('supplierContact')?.trim() || undefined,
    supplierPhone: formData.get('supplierPhone')?.trim() || undefined,
    orderDate: formData.get('orderDate'),
    expectedArrivalDate: formData.get('expectedArrivalDate') || undefined,
    taxRate: parseNumber(formData.get('taxRate')),
    currency: formData.get('currency')?.trim() || undefined,
    status: formData.get('status')?.trim() || undefined,
    remarks: formData.get('remarks')?.trim() || undefined,
    items,
  };

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.message || `创建失败：${res.statusText}`);
    }

    showToast('创建成功');
    createForm.reset();
    document.getElementById('items-json').value = JSON.stringify(items, null, 2);
    await loadOrders();
  } catch (error) {
    console.error(error);
    showToast(error.message || '创建订单失败', 'error');
  }
}

function toggleLoading(isLoading) {
  refreshBtn.disabled = isLoading;
  refreshBtn.textContent = isLoading ? '加载中...' : '刷新订单列表';
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function formatCurrency(value, currency = 'CNY') {
  if (typeof value !== 'number') {
    return '-';
  }
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(value);
}

// 初始加载
loadOrders();

