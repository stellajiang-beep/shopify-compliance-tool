const $ = (id) => document.getElementById(id);
let bundledCount = 0;
let importedProducts = [];
let latestResults = {};
let currentStatusStorageKey = null;
let currentReportStorageKey = null;
const BATCH_SIZE = 45;
let currentBatchIndex = 0;

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

// Keep the original one-click operations available alongside the product panel.
[
  ['test-connection', 'TEST_CONNECTION'],
  ['create-metaobject', 'CREATE_METAOBJECT'],
  ['create-metafield', 'CREATE_METAFIELD'],
  ['create-metaobject-entry', 'CREATE_METAOBJECT_ENTRY']
].forEach(([id, type]) => {
  $(id).addEventListener('click', async () => {
    const response = await send({ type });
    if (response?.error) $('status-text').textContent = `操作失败：${response.error}`;
  });
});

function selectedProducts() {
  return document.querySelector('input[name="source"]:checked').value === 'imported'
    ? importedProducts : null;
}

function selectedProductCount() {
  return selectedProducts() === null ? bundledCount : importedProducts.length;
}

function renderBatchControls() {
  const total = selectedProductCount();
  const totalBatches = Math.max(1, Math.ceil(total / BATCH_SIZE));
  currentBatchIndex = Math.min(currentBatchIndex, totalBatches - 1);
  $('batch-info').textContent = `第 ${currentBatchIndex + 1} / ${totalBatches} 批（每批 ${BATCH_SIZE} 条）`;
  $('previous-batch').disabled = currentBatchIndex === 0;
  $('next-batch').disabled = currentBatchIndex >= totalBatches - 1;
}

function renderPreview(products) {
  const product = products?.[0];
  const wrap = $('preview-wrap');
  if (!product) return wrap.classList.add('hidden');
  wrap.classList.remove('hidden');
  $('field-preview').replaceChildren(...Object.entries(product).map(([key, value]) => {
    const item = document.createElement('li');
    item.textContent = `${key}: ${String(value)}`;
    return item;
  }));
}

function renderSource() {
  const imported = document.querySelector('input[value="imported"]');
  imported.disabled = !importedProducts.length;
  if (imported.disabled && imported.checked) document.querySelector('input[value="bundled"]').checked = true;
  const usingImported = selectedProducts() !== null;
  const count = usingImported ? importedProducts.length : bundledCount;
  $('source-count').textContent = `${usingImported ? '已导入' : '内置'}：${count} 条`;
  renderPreview(usingImported ? importedProducts : []);
  renderBatchControls();
}

function renderStatus(status) {
  if (!status) return;
  latestResults = status.state === 'reset'
    ? {}
    : { ...latestResults, ...(status.results || {}) };
  const total = Number(status.total) || 0;
  const processed = Math.min(Number(status.processed) || 0, total);
  const percent = total ? Math.round(processed / total * 100) : 0;
  $('progress-bar').style.width = `${percent}%`;

  const results = Object.values(latestResults);
  const skuNotFoundCount = results.filter(r => r.productStatus === 'SKU未找到').length;
  const writeFailedCount = results.filter(r => r.metafields === 'failed').length;
  const imageNotFoundCount = results.filter(r => r.imageStatus === '图片未找到').length;
  const failedText = (skuNotFoundCount > 0 || imageNotFoundCount > 0 || writeFailedCount > 0)
    ? `SKU未找到 ${skuNotFoundCount}，图片未找到 ${imageNotFoundCount}，写入失败 ${writeFailedCount}`
    : `无失败`;

  $('progress-count').textContent = `${processed} / ${total}（跳过 ${status.skipped || 0}，${failedText}）`;
  const labels = { search: '正在搜索', detail: '正在写入字段', paused: '已暂停', complete: '已完成', cancelled: '已取消', reset: '已清除完成记录' };
  $('status-text').textContent = `${labels[status.state] || status.state} ${status.sku ? `· 当前 SKU: ${status.sku}` : ''}`;
  renderRecentResults();
}

function productStatusText(result) {
  if (result.productStatus === 'SKU未找到') return 'SKU未找到';
  if (result.productStatus === 'SKU找到') return 'SKU找到';
  return '未处理';
}

function imageResult(result) {
  if (result.productStatus === 'SKU未找到') return '-';
  if (result.metafields === 'failed') return '写入失败';
  if (result.imageStatus === '文字警示') return '文字警示';
  if (result.imageStatus === '成功') return '成功';
  if (result.imageStatus === '图片未找到') return '图片未找到';
  return '未处理';
}

function renderRecentResults() {
  const allResults = Object.values(latestResults);
  // 按处理时间降序排序（最新的在前），取最近10条
  const rows = allResults
    .sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0))
    .slice(0, 10);
  if (!rows.length) return $('recent-results').textContent = '暂无结果';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>SKU</th><th>型号</th><th>产品状态</th><th>图片状态</th><th>图片命名</th></tr></thead>';
  const body = document.createElement('tbody');
  rows.forEach((result) => {
    const row = document.createElement('tr');
    [result.sku || '-', result.model_number || '-', productStatusText(result), imageResult(result), (result.imageNames || []).join(', ') || '-']
      .forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
    body.appendChild(row);
  });
  table.appendChild(body);
  $('recent-results').replaceChildren(table);
}

function exportResults() {
  const rows = Object.values(latestResults);
  if (!rows.length) return $('status-text').textContent = '暂无可导出的处理结果';
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    ['SKU', '产品名', '型号', '制造商', '产品状态', '图片状态', '图片命名'],
    ...rows.map((result) => [
      result.sku || '',
      result.product_name || '',
      result.model_number || '',
      result.manufacturer || '',
      productStatusText(result),
      imageResult(result),
      (result.imageNames || []).join(', ')
    ])
  ].map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `shopify-safety-image-results-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function refresh() {
  const data = await send({ type: 'GET_PRODUCT_PANEL_DATA' });
  if (data?.error) return $('status-text').textContent = data.error;
  bundledCount = data.bundledCount || 0;
  importedProducts = data.importedProducts || [];
  currentStatusStorageKey = data.tabId ? `productJobStatus:${data.tabId}` : null;
  currentReportStorageKey = data.tabId ? `productJobReport:${data.tabId}` : null;
  latestResults = data.reportResults || {};
  renderSource();
  renderStatus(data.status);
  renderRecentResults();
  send({ type: 'REQUEST_PRODUCT_JOB_STATUS' });
}

$('products-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const products = JSON.parse(await file.text());
    if (!Array.isArray(products) || !products.length) throw new Error('JSON 必须是非空数组');
    const invalid = products.findIndex((product) => !product || !product.sku || !product.model_number || !product.manufacturer);
    if (invalid >= 0) throw new Error(`第 ${invalid + 1} 条缺少 sku、model_number 或 manufacturer`);
    const result = await send({ type: 'SAVE_IMPORTED_PRODUCTS', payload: products });
    if (result?.error) throw new Error(result.error);
    importedProducts = products;
    document.querySelector('input[value="imported"]').checked = true;
    $('import-message').textContent = `已导入 ${products.length} 条`;
    renderSource();
  } catch (error) {
    $('import-message').textContent = `导入失败：${error.message}`;
  }
});

document.querySelectorAll('input[name="source"]').forEach((input) => input.addEventListener('change', () => {
  currentBatchIndex = 0;
  renderSource();
}));
$('start').addEventListener('click', async () => {
  const response = await send({
    type: 'SET_PRODUCT_METAFIELDS',
    payload: {
      products: selectedProducts(),
      batchIndex: currentBatchIndex,
      batchSize: BATCH_SIZE
    }
  });
  if (response?.error) $('status-text').textContent = `无法启动：${response.error}`;
});
$('previous-batch').addEventListener('click', () => {
  currentBatchIndex = Math.max(0, currentBatchIndex - 1);
  renderBatchControls();
});
$('next-batch').addEventListener('click', () => {
  const totalBatches = Math.max(1, Math.ceil(selectedProductCount() / BATCH_SIZE));
  currentBatchIndex = Math.min(totalBatches - 1, currentBatchIndex + 1);
  renderBatchControls();
});
['pause', 'resume', 'cancel'].forEach((action) => $(action).addEventListener('click', async () => {
  const response = await send({ type: `${action.toUpperCase()}_PRODUCT_JOB` });
  if (response?.error) {
    $('status-text').textContent = `操作失败：${response.error}`;
  } else {
    const labels = { pause: '已暂停', resume: '继续执行', cancel: '已取消' };
    $('status-text').textContent = labels[action] || action;
    send({ type: 'REQUEST_PRODUCT_JOB_STATUS' });
  }
}));
$('reset').addEventListener('click', () => send({ type: 'RESET_COMPLETED_PRODUCTS' }));
$('export-results').addEventListener('click', exportResults);
chrome.storage.onChanged.addListener((changes) => {
  if (currentReportStorageKey && changes[currentReportStorageKey]) {
    latestResults = changes[currentReportStorageKey].newValue?.results || {};
    renderRecentResults();
  }
  if (currentStatusStorageKey && changes[currentStatusStorageKey]) {
    renderStatus(changes[currentStatusStorageKey].newValue);
  }
});
refresh();
