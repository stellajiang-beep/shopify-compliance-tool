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
        return { ok: false, imageIds: [] };
    }

    const template = JSON.parse(rawTemplate);
    const manufacturerMap = await loadManufacturerMap();
    const manufacturerId = manufacturerMap[product.manufacturer];
    if (!manufacturerId) {
        throw new Error(`找不到 Manufacturer 映射: ${product.manufacturer}`);
    }

    const imageIds = await findImageGidsByModel(product.model_number);

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
    if (imageIds.length) {
        body.variables.metafields.push({
            namespace: "custom",
            key: "safety_warning_image",
            value: JSON.stringify(imageIds),
            type: "list.file_reference",
            ownerId: `gid://shopify/Product/${productId}`
        });
    }

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
            console.error(
                "❌ Shopify metafield userErrors:",
                JSON.stringify(userErrors, null, 2),
                JSON.stringify(result.errors || [], null, 2)
            );
            return { ok: false, imageIds };
        }
        return { ok: response.ok, imageIds };
    } finally {
        window.isCreating = false;
    }
}

function setInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
}

async function waitForElement(selector, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        const element = document.querySelector(selector);
        if (element) return element;
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return null;
}

async function findImageGidsByModel(modelNumber) {
    const model = String(modelNumber ?? "").trim();
    if (!model) return [];

    let pickerInput = document.querySelector('input[placeholder="Search files"]');
    if (!pickerInput) {
        // 先从只读字段进入编辑状态。
        const editControl = await waitForElement(
            '[role="button"][aria-label="Edit Safety Warning Image metafield"]',
            15000
        );
        console.log("🖼️ Safety Warning Image 编辑控件:", Boolean(editControl));
        if (editControl) {
            editControl.click();
        }

        const label = [...document.querySelectorAll("*")]
            .find((element) =>
                element.children.length === 0 &&
                /^Safety Warning Image$/i.test(element.textContent?.trim() || "")
            );
        let fieldContainer = label;
        let readWrappers = [];
        for (let level = 0; level < 8 && fieldContainer; level += 1) {
            readWrappers = [...fieldContainer.querySelectorAll("div[class*='ReadWrapper']")]
                .filter((element) => element.getBoundingClientRect().width > 0);
            if (readWrappers.length) break;
            fieldContainer = fieldContainer.parentElement;
        }
        if (!editControl) readWrappers[0]?.click();
        await new Promise((resolve) => setTimeout(resolve, 300));

        const internalButton = [...document.querySelectorAll("s-internal-button")]
            .find((element) => /select (file|images)/i.test(
                element.shadowRoot?.querySelector("button")?.textContent || ""
            ));
        let selectButton = internalButton?.shadowRoot?.querySelector("button") ||
            [...document.querySelectorAll(
                "button, [role='button'], s-button"
            )].find((button) => /select (file|images)/i.test(
                button.innerText || button.textContent || ""
            )) || [...document.querySelectorAll("*")].find((element) =>
            element.children.length === 0 &&
            /^select (file|images)$/i.test(element.textContent?.trim() || "")
        );
        if (!selectButton) {
            for (const wrapper of readWrappers.slice(1)) {
                wrapper.click();
                await new Promise((resolve) => setTimeout(resolve, 250));
                const button = [...document.querySelectorAll("s-internal-button")]
                    .find((element) => /select (file|images)/i.test(
                        element.shadowRoot?.querySelector("button")?.textContent || ""
                    ));
                if (button) {
                    selectButton = button.shadowRoot.querySelector("button");
                    break;
                }
            }
        }
        console.log("🖼️ Select images 按钮:", Boolean(selectButton));
        selectButton?.click();
        pickerInput = await waitForElement('input[placeholder="Search files"]');
    }
    if (!pickerInput) {
        console.warn("⚠️ 找不到图片选择器:", model);
        return [];
    }

    setInputValue(pickerInput, model);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const started = Date.now();
    while (Date.now() - started < 15000) {
        const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const numberedPattern = new RegExp(`^${escaped}-(\\d+)$`, "i");
        const exactPattern = new RegExp(`^${escaped}$`, "i");
        const candidates = [...document.querySelectorAll("img")].filter((candidate) => {
            const alt = candidate.alt?.trim() || "";
            const filename = decodeURIComponent(candidate.src || "")
                .split("/").pop()?.split("?")[0]
                .replace(/_\d+x\.(png|jpe?g)$/i, ".$1") || "";
            return numberedPattern.test(alt) || exactPattern.test(alt) ||
                numberedPattern.test(filename.replace(/\.(png|jpe?g)$/i, "")) ||
                exactPattern.test(filename.replace(/\.(png|jpe?g)$/i, ""));
        });
        if (Date.now() - started < 2000) {
            console.log("🔎 图片候选:", model, candidates.map((image) => ({
                alt: image.alt,
                src: image.src
            })));
        }

        const numbered = candidates
            .filter((candidate) => numberedPattern.test(candidate.alt.trim()))
            .sort((a, b) => {
                const aNumber = Number(a.alt.match(numberedPattern)?.[1]);
                const bNumber = Number(b.alt.match(numberedPattern)?.[1]);
                return aNumber - bNumber;
            });
        // 有编号图时只选编号图；否则只选完全匹配的型号图。
        const images = numbered.length
            ? numbered
            : candidates.filter((candidate) => exactPattern.test(candidate.alt.trim()));
        const imageIds = images.map((image) => image.closest("div")?.parentElement
            ?.querySelector("s-checkbox[id^='gid://shopify/MediaImage/']")?.id)
            .filter(Boolean);
        if (imageIds.length) {
            images.forEach((image) => {
                const checkbox = image.closest("div")?.parentElement
                    ?.querySelector("s-checkbox[id^='gid://shopify/MediaImage/']");
                if (!checkbox) return;
                const target = checkbox.shadowRoot?.querySelector("input, button") || checkbox;
                target.click?.();
                target.dispatchEvent?.(new MouseEvent("click", {
                    bubbles: true,
                    composed: true,
                    cancelable: true
                }));
            });
            const done = [...document.querySelectorAll("button, [role='button']")]
                .find((button) => /^done$/i.test(button.innerText?.trim() || ""));
            done?.click();
            console.log("🖼️ 找到图片:", model, imageIds);
            return [...new Set(imageIds)];
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    console.warn("⚠️ 找不到图片:", model);
    return [];
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
        const missingImages = Object.entries(job.results)
            .filter(([, result]) => result.image === "not_found")
            .map(([sku, result]) => ({ sku, ...result }));
        if (missingImages.length) {
            console.warn("⚠️ 图片未找到报告:", missingImages);
            const blob = new Blob(
                [JSON.stringify(missingImages, null, 2)],
                { type: "application/json" }
            );
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "missing-product-images.json";
            link.click();
            URL.revokeObjectURL(link.href);
        }
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
            job.results[sku].metafields = written.ok ? "success" : "failed";
            job.results[sku].image = written.imageIds?.length ? "success" : "not_found";
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
