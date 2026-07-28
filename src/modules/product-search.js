const JOB_KEY = "shopifyComplianceProductJob";
const SEARCH_WAIT_MS = 1200;
const NEXT_PRODUCT_DELAY_MS = 1800;
const SEARCH_TIMEOUT_MS = 15000;
let resumeRunning = false;

async function loadManufacturerMap() {
    try {
        const cached = JSON.parse(
            sessionStorage.getItem("shopifyManufacturerMap") || "null"
        );
        if (cached?.manufacturerMap) {
            window.shopifyManufacturerMap = cached.manufacturerMap;
        }
    } catch {
        // Continue with the message-based fallback below.
    }
    const started = Date.now();
    while (!window.shopifyManufacturerMap && Date.now() - started < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!window.shopifyManufacturerMap) {
        throw new Error("Manufacturer Map 尚未加载");
    }
    return window.shopifyManufacturerMap;
}

async function writeProductMetafields(product, productId) {
    const rawTemplate = sessionStorage.getItem(
        "shopifyProductMetafieldTemplate"
    );
    if (!rawTemplate) {
        console.warn("⚠️ 没有 SetTheseMetafields 模板，跳过字段写入");
        return false;
    }

    const template = JSON.parse(rawTemplate);
    const manufacturerMap = await loadManufacturerMap();
    const manufacturerId = manufacturerMap[product.manufacturer];
    if (!manufacturerId) {
        throw new Error(`找不到 Manufacturer 映射: ${product.manufacturer}`);
    }

    const body = JSON.parse(template.body);
    body.variables.metafields = [
        {
            namespace: "custom",
            key: "model_number",
            value: String(product.model_number ?? ""),
            type: "single_line_text_field",
            ownerId: `gid://shopify/Product/${productId}`
        },
        {
            namespace: "custom",
            key: "compliance_manufacturer",
            value: manufacturerId,
            type: "metaobject_reference",
            ownerId: `gid://shopify/Product/${productId}`
        }
    ];

    console.log("📝 写入 Product Metafields:", body.variables.metafields);
    window.isCreating = true;
    try {
        const response = await fetch(template.url, {
            method: "POST",
            headers: template.headers,
            body: JSON.stringify(body)
        });
        const result = await response.json();
        console.log("✅ Product Metafields 写入返回:", result);
        const userErrors = Object.values(result.data || {})
            .flatMap((value) => Array.isArray(value?.userErrors) ? value.userErrors : []);
        if (result.errors?.length || userErrors.length) {
            console.error("❌ Shopify metafield userErrors:", userErrors, result.errors);
            return false;
        }
        return response.ok;
    } finally {
        window.isCreating = false;
    }
}

function readJob() {
    try {
        return JSON.parse(sessionStorage.getItem(JOB_KEY) || "null");
    } catch {
        return null;
    }
}

function writeJob(job) {
    sessionStorage.setItem(JOB_KEY, JSON.stringify(job));
}

function clearJob() {
    sessionStorage.removeItem(JOB_KEY);
}

function getProductsUrl() {
    const url = new URL(location.href);
    const store = url.pathname.match(/^\/store\/([^/]+)/)?.[1];
    if (!store) return null;
    url.pathname = `/store/${store}/products`;
    return url;
}

function getDetailProductId() {
    return location.pathname.match(
        /^\/store\/[^/]+\/products\/(\d+)(?:\/|$)/
    )?.[1] || null;
}

function getSearchProductLinks() {
    return [...document.querySelectorAll("a[href]")].filter((a) => {
        try {
            const path = new URL(a.href, location.href).pathname;
            return /^\/store\/[^/]+\/products\/\d+$/.test(path);
        } catch {
            return false;
        }
    });
}

function getCurrentProductHrefs() {
    return new Set([...document.querySelectorAll("a[href]")]
        .map((a) => {
            try {
                const path = new URL(a.href, location.href).pathname;
                return /^\/store\/[^/]+\/products\/\d+$/.test(path) ? a.href : null;
            } catch {
                return null;
            }
        })
        .filter(Boolean));
}

function navigateToSku(sku) {
    const url = getProductsUrl();
    if (!url) throw new Error("当前页面不是 Shopify Admin 店铺页面");
    url.searchParams.set("query", String(sku).trim());
    url.searchParams.set("_complianceJob", String(Date.now()));
    // 必须让 Shopify Remix Router 完整导航，pushState 只改地址不会刷新搜索结果。
    location.assign(url.href);
}

export function startProductSearchJob(products) {
    if (!Array.isArray(products) || products.length === 0) return;

    const job = {
        products,
        index: 0,
        phase: "search",
        results: {},
        previousProductHrefs: [...getCurrentProductHrefs()],
        startedAt: Date.now()
    };
    writeJob(job);
    navigateToSku(products[0].sku);
}

export function pauseProductSearchJob() {
    const job = readJob();
    if (job) {
        job.phase = "paused";
        writeJob(job);
        console.log("⏸️ SKU 搜索任务已暂停");
    }
}

async function waitForProductLink(sku, previousProductHrefs = []) {
    const started = Date.now();
    console.log("🔎 等待搜索结果:", sku);
    const previous = new Set(previousProductHrefs);
    while (Date.now() - started < SEARCH_TIMEOUT_MS) {
        const link = getSearchProductLinks()
            .find((candidate) => !previous.has(candidate.href));
        if (link) return link;
        await new Promise((resolve) => setTimeout(resolve, SEARCH_WAIT_MS));
    }
    console.warn("❌ 搜索超时，未找到 SKU:", sku);
    return null;
}

async function continueJob(job) {
    const nextIndex = job.index + 1;
    if (nextIndex >= job.products.length) {
        console.log("✅ 所有 SKU 处理完成:", job.results);
        clearJob();
        return;
    }

    job.index = nextIndex;
    job.phase = "search";
    job.previousProductHrefs = [...getCurrentProductHrefs()];
    writeJob(job);
    await new Promise((resolve) => setTimeout(resolve, NEXT_PRODUCT_DELAY_MS));
    navigateToSku(job.products[nextIndex].sku);
}

export async function resumeProductSearchJob() {
    if (resumeRunning) return;
    resumeRunning = true;
    try {
        await resumeProductSearchJobInternal();
    } finally {
        resumeRunning = false;
    }
}

async function resumeProductSearchJobInternal() {
    const job = readJob();
    if (!job?.products?.length) return;

    const product = job.products[job.index];
    const sku = String(product?.sku ?? "").trim();
    if (!sku) {
        job.results[`row-${job.index}`] = { status: "failed", reason: "empty SKU" };
        await continueJob(job);
        return;
    }

    const detailId = getDetailProductId();
    if (detailId && job.phase === "detail") {
        job.results[sku] = { status: "success", productId: detailId };
        console.log("✅ SKU -> Product ID:", sku, detailId);
        try {
            const written = await writeProductMetafields(product, detailId);
            job.results[sku].metafields = written ? "success" : "skipped";
        } catch (error) {
            job.results[sku].metafields = "failed";
            job.results[sku].error = error.message;
            console.error("❌ Product Metafields 写入失败:", error);
        }
        writeJob(job);
        await continueJob(job);
        return;
    }

    if (!getProductsUrl() || job.phase !== "search") return;
    if (new URL(location.href).searchParams.get("query") !== sku) {
        navigateToSku(sku);
        return;
    }

    // 搜索使用完整页面导航，旧页面 DOM 已被清除，不需要排除旧链接。
    const link = await waitForProductLink(sku, []);
    if (!link) {
        job.results[sku] = { status: "failed", reason: "not found" };
        await continueJob(job);
        return;
    }

    job.phase = "detail";
    writeJob(job);
    console.log("🔗 点击商品:", link.href);
    link.click();
}

// Kept for compatibility with existing callers.
export async function findProductIdBySku(sku) {
    const product = { sku: String(sku ?? "").trim() };
    startProductSearchJob([product]);
    return null;
}
