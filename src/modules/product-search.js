const JOB_KEY = "shopifyComplianceProductJob";
const COMPLETED_KEY_PREFIX = "shopifyComplianceCompletedProducts";
const SEARCH_WAIT_MS = 1200;
const NEXT_PRODUCT_DELAY_MS = 1800;
const SEARCH_TIMEOUT_MS = 15000;
let resumeRunning = false;

function getStoreId() {
    return location.pathname.match(/^\/store\/([^/]+)/)?.[1] || "unknown-store";
}

function getCompletedKey() {
    return `${COMPLETED_KEY_PREFIX}:${getStoreId()}`;
}

function readCompletedProducts() {
    try {
        return JSON.parse(localStorage.getItem(getCompletedKey()) || "{}");
    } catch {
        return {};
    }
}

function getProductFingerprint(product) {
    return JSON.stringify({
        sku: String(product.sku ?? ""),
        model_number: String(product.model_number ?? ""),
        manufacturer: String(product.manufacturer ?? ""),
        compliance_profile: String(product.compliance_profile ?? ""),
        safety_warning_text: String(product.safety_warning_text ?? ""),
        // This version marker makes previously completed lawn-mower rows run once
        // more after switching them from image warnings to profile text warnings.
        safety_warning_mode: product.compliance_profile === "lawn-mower"
            ? "profile-text" : undefined
    });
}

function markProductCompleted(product, result) {
    const completed = readCompletedProducts();
    completed[getProductFingerprint(product)] = {
        completedAt: Date.now(),
        sku: product.sku,
        model_number: product.model_number,
        result
    };
    localStorage.setItem(getCompletedKey(), JSON.stringify(completed));
}

export function resetCompletedProducts() {
    localStorage.removeItem(getCompletedKey());
    window.postMessage({
        type: "PRODUCT_JOB_STATUS",
        payload: { state: "reset", total: 0, current: 0, processed: 0, skipped: 0, failed: 0 }
    }, "*");
}

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

async function loadComplianceProfileMap() {
    try {
        const cached = JSON.parse(
            sessionStorage.getItem("shopifyComplianceProfileMap") || "null"
        );
        if (cached?.complianceProfileMap) {
            window.shopifyComplianceProfileMap = cached.complianceProfileMap;
        }
    } catch {
        // Continue with the message-based fallback below.
    }
    const started = Date.now();
    while (!window.shopifyComplianceProfileMap && Date.now() - started < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!window.shopifyComplianceProfileMap) {
        throw new Error("Compliance Profile Map 尚未加载");
    }
    return window.shopifyComplianceProfileMap;
}

async function loadSafetyTextMap() {
    try {
        const cached = JSON.parse(
            sessionStorage.getItem("shopifySafetyTextMap") || "null"
        );
        if (cached?.safetyTextMap) {
            window.shopifySafetyTextMap = cached.safetyTextMap;
        }
    } catch {
        // Continue with the message-based fallback below.
    }
    const started = Date.now();
    while (!window.shopifySafetyTextMap && Date.now() - started < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!window.shopifySafetyTextMap) {
        throw new Error("Safety Text Map 尚未加载");
    }
    return window.shopifySafetyTextMap;
}

async function writeProductMetafields(product, productId) {
    const rawTemplate = sessionStorage.getItem(
        "shopifyProductMetafieldTemplate"
    );
    if (!rawTemplate) {
        console.warn("⚠️ 没有 SetTheseMetafields 模板，跳过字段写入");
        return { ok: false, imageIds: [], imageNames: [] };
    }

    const template = JSON.parse(rawTemplate);
    const manufacturerMap = await loadManufacturerMap();
    const manufacturerId = manufacturerMap[product.manufacturer];
    if (!manufacturerId) {
        throw new Error(`找不到 Manufacturer 映射: ${product.manufacturer}`);
    }

    let complianceProfileId = null;
    if (product.compliance_profile) {
        const complianceProfileMap = await loadComplianceProfileMap();
        complianceProfileId = complianceProfileMap[product.compliance_profile];
        if (!complianceProfileId) {
            throw new Error(`找不到 Compliance Profile 映射: ${product.compliance_profile}`);
        }
    }

    let safetyWarningText = null;
    if (product.safety_warning_text) {
        const safetyTextMap = await loadSafetyTextMap();
        safetyWarningText = safetyTextMap[product.safety_warning_text];
        if (!safetyWarningText) {
            throw new Error(`找不到 Safety Warning Text 映射: ${product.safety_warning_text}`);
        }
    }

    const usesSafetyWarningText = Boolean(
        safetyWarningText || product.compliance_profile === "lawn-mower"
    );
    const image = usesSafetyWarningText
        ? { ids: [], names: [] }
        : await findImageGidsByModel(product.image_search_term || product.model_number);
    const imageIds = image.ids;

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
    if (complianceProfileId) {
        body.variables.metafields.push({
            namespace: "custom",
            key: "compliance_profile",
            value: complianceProfileId,
            type: "metaobject_reference",
            ownerId: `gid://shopify/Product/${productId}`
        });
    }
    if (safetyWarningText) {
        body.variables.metafields.push({
            namespace: "custom",
            key: "safety_warning_text",
            value: safetyWarningText,
            type: "multi_line_text_field",
            ownerId: `gid://shopify/Product/${productId}`
        });
    }
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
            return { ok: false, imageIds, imageNames: image.names };
        }
        return { ok: response.ok, imageIds, imageNames: image.names };
    } finally {
        window.isCreating = false;
    }
}

async function setInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value"
        )?.set;
        setter?.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 50));

        for (let i = 0; i < value.length; i++) {
            const char = value[i];
            const currentValue = value.slice(0, i + 1);
            setter?.call(input, currentValue);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 30));
        }

        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
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
    if (!model) return { ids: [], names: [] };

    const closeExistingPicker = async () => {
        const doneBtn = [...document.querySelectorAll("button, [role='button'], s-button")]
            .find((button) => /^done$/i.test((button.innerText || button.textContent || "").trim()));
        if (doneBtn) {
            doneBtn.click();
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        const cancelBtn = [...document.querySelectorAll("button, [role='button'], s-button")]
            .find((button) => /^(cancel|×|close)$/i.test((button.innerText || button.textContent || "").trim()));
        if (cancelBtn) {
            cancelBtn.click();
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    };
    await closeExistingPicker();

    let pickerInput = document.querySelector('input[placeholder="Search files"]');
    if (pickerInput) {
        await setInputValue(pickerInput, "");
        await new Promise((resolve) => setTimeout(resolve, 500));
        pickerInput = null;
        await closeExistingPicker();
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (!pickerInput) {
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
        return { ids: [], names: [] };
    }

    await setInputValue(pickerInput, "");
    await new Promise((resolve) => setTimeout(resolve, 300));
    await setInputValue(pickerInput, model);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const NORMALIZE_PATTERN = /[\(\)\[\]\/\\\s]+/g;
    const normalizedModel = model.replace(NORMALIZE_PATTERN, "_").replace(/__+/g, "_").replace(/^_|_$/g, "");
    const escapedNormalized = normalizedModel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const numberedPattern = new RegExp(`^${escapedNormalized}[-_](\\d+)$`, "i");
    const exactPattern = new RegExp(`^${escapedNormalized}$`, "i");
    const loosePattern = new RegExp(escapedNormalized, "i");

    function normalizeForMatch(str) {
        return str.replace(NORMALIZE_PATTERN, "_").replace(/__+/g, "_").replace(/^_|_$/g, "");
    }

    function getCleanFilename(src) {
        const filename = decodeURIComponent(src || "")
            .split("/").pop()?.split("?")[0] || "";
        return filename
            .replace(/_\d+x\d+\.(png|jpe?g|webp)$/i, "")
            .replace(/_\d+x\.(png|jpe?g|webp)$/i, "")
            .replace(/\.(png|jpe?g|webp)$/i, "");
    }

    function matchImage(img) {
        const alt = (img.alt || "").trim();
        const cleanFile = getCleanFilename(img.src);
        const normAlt = normalizeForMatch(alt);
        const normFile = normalizeForMatch(cleanFile);
        if (!normAlt && !normFile) return false;
        if (numberedPattern.test(normAlt)) return { match: "numbered", score: 3 };
        if (exactPattern.test(normAlt)) return { match: "exact", score: 2 };
        if (numberedPattern.test(normFile)) return { match: "numbered-file", score: 3 };
        if (exactPattern.test(normFile)) return { match: "exact-file", score: 2 };
        if (normAlt && loosePattern.test(normAlt)) return { match: "loose-alt", score: 1 };
        if (normFile && loosePattern.test(normFile)) return { match: "loose-file", score: 1 };
        return false;
    }

    function findCheckboxForImage(img) {
        let container = img;
        for (let i = 0; i < 10 && container; i++) {
            container = container.parentElement;
            if (!container) break;
            const checkbox = container.querySelector(
                "s-checkbox[id*='MediaImage'], " +
                "s-checkbox[id*='media_image'], " +
                "[data-checkbox-id*='MediaImage']"
            );
            if (checkbox) {
                const id = checkbox.id || checkbox.getAttribute("data-checkbox-id") || "";
                return { checkbox, id: id || null };
            }
        }

        const allCheckboxes = document.querySelectorAll(
            "s-checkbox[id*='MediaImage'], s-checkbox[id*='media_image']"
        );
        for (const cb of allCheckboxes) {
            const cbRect = cb.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();
            const dx = Math.abs(cbRect.left - imgRect.left);
            const dy = Math.abs(cbRect.top - imgRect.top);
            if (dx < 200 && dy < 200) {
                const id = cb.id || "";
                return { checkbox: cb, id: id || null };
            }
        }
        return null;
    }

    const started = Date.now();
    let lastCandidates = [];
    while (Date.now() - started < 15000) {
        const allImgs = [...document.querySelectorAll("img")];
        const candidates = [];
        for (const img of allImgs) {
            const result = matchImage(img);
            if (result) {
                candidates.push({ img, result });
            }
        }

        if (Date.now() - started < 3000) {
            console.log(`🔎 图片搜索 [${model}] (规范化: ${normalizedModel}) 候选 ${candidates.length}/${allImgs.length}:`,
                candidates.slice(0, 5).map((c) => ({
                    match: c.result.match,
                    alt: c.img.alt,
                    normAlt: normalizeForMatch(c.img.alt || ""),
                    file: getCleanFilename(c.img.src),
                    normFile: normalizeForMatch(getCleanFilename(c.img.src)),
                    score: c.result.score
                }))
            );
        }

        if (candidates.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
        }

        const numberedMatches = candidates.filter(
            (c) => c.result.match === "numbered" || c.result.match === "numbered-file"
        );
        const exactMatches = candidates.filter(
            (c) => c.result.match === "exact" || c.result.match === "exact-file"
        );
        const looseMatches = candidates.filter(
            (c) => c.result.match === "loose-alt" || c.result.match === "loose-file"
        );

        let pool;
        let poolSource = "exact";
        if (numberedMatches.length > 0) {
            pool = numberedMatches.sort((a, b) => {
                const aNormAlt = normalizeForMatch(a.img.alt || "");
                const bNormAlt = normalizeForMatch(b.img.alt || "");
                const aNormFile = normalizeForMatch(getCleanFilename(a.img.src));
                const bNormFile = normalizeForMatch(getCleanFilename(b.img.src));
                const aMatch = aNormAlt.match(numberedPattern) || aNormFile.match(numberedPattern);
                const bMatch = bNormAlt.match(numberedPattern) || bNormFile.match(numberedPattern);
                const aNum = aMatch ? Number(aMatch[1]) : 9999;
                const bNum = bMatch ? Number(bMatch[1]) : 9999;
                return aNum - bNum;
            });
            poolSource = "numbered";
            console.log(`🔢 优先使用编号图片: ${pool.length} 张`);
        } else if (exactMatches.length > 0) {
            pool = exactMatches;
            poolSource = "exact";
            console.log(`✅ 使用精确匹配: ${pool.length} 张`);
        } else {
            pool = looseMatches;
            poolSource = "loose";
            console.log(`🔍 使用包含匹配: ${pool.length} 张`);
        }

        const selectedIds = [];
        const selectedImages = [];
        const fallbackClicks = [];

        for (const candidate of pool) {
            const found = findCheckboxForImage(candidate.img);
            if (found) {
                if (found.id) selectedIds.push(found.id);
                selectedImages.push(candidate);
            } else {
                const rect = candidate.img.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    fallbackClicks.push(candidate);
                    const alt = candidate.img.alt || "";
                    console.log(`⚠️ 找不到checkbox: ${alt}, 将尝试直接点击图片`);
                }
            }
        }

        if (selectedIds.length === 0 && selectedImages.length === 0 && fallbackClicks.length === 0 && poolSource !== "loose" && looseMatches.length > 0) {
            console.log(`🔄 精确/编号匹配全部无checkbox，回退到包含匹配 (${looseMatches.length} 张)`);
            pool = looseMatches;
            for (const candidate of pool) {
                const found = findCheckboxForImage(candidate.img);
                if (found) {
                    if (found.id) selectedIds.push(found.id);
                    selectedImages.push(candidate);
                } else {
                    const rect = candidate.img.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        fallbackClicks.push(candidate);
                    }
                }
            }
        }

        if (selectedImages.length > 0 || fallbackClicks.length > 0) {
            selectedImages.forEach((c) => {
                const found = findCheckboxForImage(c.img);
                if (!found) return;
                const { checkbox } = found;
                const target = checkbox.shadowRoot?.querySelector("input, button") || checkbox;
                target.click?.();
                target.dispatchEvent?.(new MouseEvent("click", {
                    bubbles: true,
                    composed: true,
                    cancelable: true
                }));
            });

            fallbackClicks.forEach((c) => {
                c.img.click?.();
                c.img.dispatchEvent?.(new MouseEvent("click", {
                    bubbles: true,
                    composed: true,
                    cancelable: true
                }));
            });

            await new Promise((resolve) => setTimeout(resolve, 500));

            const done = [...document.querySelectorAll("button, [role='button'], s-button")]
                .find((button) => /^done$/i.test((button.innerText || button.textContent || "").trim()));
            if (done) {
                done.click();
            } else {
                const doneAlternative = [...document.querySelectorAll("button, [role='button'], s-button")]
                    .find((button) => /^(done|select)$/i.test((button.innerText || button.textContent || "").trim()));
                doneAlternative?.click();
            }

            const imageNames = selectedImages.map((c) => {
                if (c.img.alt?.trim()) return c.img.alt.trim();
                return getCleanFilename(c.img.src) || "unknown";
            });
            fallbackClicks.forEach((c) => {
                if (c.img.alt?.trim()) imageNames.push(c.img.alt.trim());
                else imageNames.push(getCleanFilename(c.img.src) || "unknown");
            });
            console.log(`🖼️ 找到图片: ${model} (${selectedIds.length + fallbackClicks.length}张)`, imageNames);
            return {
                ids: [...new Set(selectedIds)],
                names: [...new Set(imageNames)]
            };
        }

        lastCandidates = candidates;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.warn(`⚠️ 找不到图片: ${model} (扫描了 ${lastCandidates.length} 个候选)`);
    if (lastCandidates.length > 0) {
        console.warn(`候选详情:`, lastCandidates.map((c) => ({
            match: c.result.match,
            score: c.result.score,
            alt: c.img.alt,
            normAlt: normalizeForMatch(c.img.alt || ""),
            file: getCleanFilename(c.img.src),
            normFile: normalizeForMatch(getCleanFilename(c.img.src)),
            rect: (() => { const r = c.img.getBoundingClientRect(); return `${r.width}x${r.height}`; })()
        })));
    }
    return { ids: [], names: [] };
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
    publishJobStatus(job);
}

function clearJob() {
    sessionStorage.removeItem(JOB_KEY);
}

function publishJobStatus(job, stateOverride) {
    if (!job) return;
    const total = job.originalTotal || job.products?.length || 0;
    const skipped = job.skipped || 0;
    const current = Math.min(skipped + (job.index || 0) + 1, total);
    const processed = job.phase === "complete" ? total : Math.min(skipped + (job.index || 0), total);
    const failed = Object.values(job.results || {})
        .filter((result) => result.metafields === "failed")
        .length;
    const skuNotFound = Object.values(job.results || {})
        .filter((result) => result.productStatus === "SKU未找到")
        .length;
    window.postMessage({
        type: "PRODUCT_JOB_STATUS",
        payload: {
            state: stateOverride || job.phase || "search",
            total,
            current,
            processed,
            skipped,
            failed,
            skuNotFound,
            sku: job.products?.[job.index]?.sku || null,
            startedAt: job.startedAt || null,
            results: job.results || {}
        }
    }, "*");
}

export function getProductSearchJobStatus() {
    const job = readJob();
    if (!job) return null;
    const total = job.originalTotal || job.products?.length || 0;
    const skipped = job.skipped || 0;
    return {
        state: job.phase || "search",
        total,
        current: Math.min(skipped + (job.index || 0) + 1, total),
        processed: Math.min(skipped + (job.index || 0), total),
        skipped,
        failed: Object.values(job.results || {})
            .filter((result) => result.metafields === "failed")
            .length,
        skuNotFound: Object.values(job.results || {})
            .filter((result) => result.productStatus === "SKU未找到")
            .length,
        sku: job.products?.[job.index]?.sku || null,
        startedAt: job.startedAt || null,
        results: job.results || {}
    };
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

function getSearchProductResults() {
    const rows = [...document.querySelectorAll("[role='row']")];
    if (!rows.length) {
        return getSearchProductLinks().map((link) => ({
            link,
            href: link.href,
            status: null,
            productType: null
        }));
    }

    const results = [];
    for (const row of rows) {
        const cells = [...row.querySelectorAll("[role='cell']")];
        if (cells.length < 3) continue;

        const productCell = cells[2];
        if (!productCell) continue;

        const link = productCell.querySelector("a[href]");
        if (!link) continue;

        try {
            const path = new URL(link.href, location.href).pathname;
            if (!/^\/store\/[^/]+\/products\/\d+$/.test(path)) continue;
        } catch {
            continue;
        }

        const statusCell = cells[3];
        const productTypeCell = cells[8];

        const statusText = statusCell?.innerText?.trim() || "";
        const productTypeText = productTypeCell?.innerText?.trim() || "";

        results.push({
            link,
            href: link.href,
            status: statusText.toLowerCase(),
            productType: productTypeText.toLowerCase()
        });
    }

    if (!results.length) {
        return getSearchProductLinks().map((link) => ({
            link,
            href: link.href,
            status: null,
            productType: null
        }));
    }

    return results;
}

function getSkuOccurrenceIndex(products, currentIndex) {
    const sku = String(products[currentIndex]?.sku ?? "").trim();
    if (!sku) return 0;
    let count = 0;
    for (let i = 0; i <= currentIndex; i++) {
        if (String(products[i]?.sku ?? "").trim() === sku) count++;
    }
    return count - 1;
}

function selectBestProduct(results, previousHrefs = [], occurrenceIndex = 0) {
    const previous = new Set(previousHrefs);
    const candidates = results.filter((r) => !previous.has(r.href));

    if (!candidates.length) return null;

    const pickIndex = (arr) => Math.min(occurrenceIndex, arr.length - 1);

    const AMAZON_PATTERN = /amazon/i;
    const NON_AMAZON = candidates.filter(
        (r) => !r.productType || !AMAZON_PATTERN.test(r.productType)
    );

    if (NON_AMAZON.length === 0) {
        console.warn("⚠️ 所有搜索结果都包含 amazon，跳过过滤");
        return candidates[pickIndex(candidates)];
    }

    if (NON_AMAZON.length === 1) {
        console.log("✅ 找到唯一非 amazon 产品");
        return NON_AMAZON[0];
    }

    const ACTIVE = NON_AMAZON.filter(
        (r) => r.status === "active" || r.status === "in stock"
    );

    if (ACTIVE.length > 0) {
        console.log(`✅ 优先选择 ${ACTIVE.length} 个 active 产品 (序号${occurrenceIndex})`);
        return ACTIVE[pickIndex(ACTIVE)];
    }

    const DRAFT = NON_AMAZON.filter(
        (r) => r.status === "draft"
    );

    if (DRAFT.length > 0) {
        console.log(`⚠️ 没有 active 产品，选择 ${DRAFT.length} 个 draft 中的第 ${occurrenceIndex + 1} 个`);
        return DRAFT[pickIndex(DRAFT)];
    }

    console.log(`⚠️ 状态未知，选择 ${NON_AMAZON.length} 个非 amazon 产品中的第 ${occurrenceIndex + 1} 个`);
    return NON_AMAZON[pickIndex(NON_AMAZON)];
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
    // 只保留 Shopify 原生 query 参数；自定义参数会干扰部分店铺的搜索路由。
    // 必须让 Shopify Remix Router 完整导航，pushState 只改地址不会刷新搜索结果。
    location.assign(url.href);
}

export function startProductSearchJob(products) {
    if (!Array.isArray(products) || products.length === 0) return;

    const completed = readCompletedProducts();
    const skippedResults = {};
    const pendingProducts = products.filter((product) => {
        const previous = completed[getProductFingerprint(product)];
        if (!previous) return true;
        skippedResults[product.sku] = {
            ...(previous.result || {}),
            status: "skipped",
            sku: product.sku,
            model_number: product.model_number
        };
        return false;
    });
    const skipped = products.length - pendingProducts.length;
    if (!pendingProducts.length) {
        window.postMessage({
            type: "PRODUCT_JOB_STATUS",
            payload: {
                state: "complete",
                total: products.length,
                current: products.length,
                processed: products.length,
                skipped,
                failed: 0,
                sku: null,
                results: {}
            }
        }, "*");
        return;
    }

    const job = {
        products: pendingProducts,
        originalTotal: products.length,
        skipped,
        index: 0,
        phase: "search",
        results: skippedResults,
        previousProductHrefs: [...getCurrentProductHrefs()],
        startedAt: Date.now()
    };
    writeJob(job);
    navigateToSku(pendingProducts[0].sku);
}

export function pauseProductSearchJob() {
    const job = readJob();
    if (job) {
        job.pausedPhase = job.phase;
        job.phase = "paused";
        writeJob(job);
        publishJobStatus(job, "paused");
        console.log("⏸️ SKU 搜索任务已暂停");
    }
}

export async function resumePausedProductSearchJob() {
    const job = readJob();
    if (!job || job.phase !== "paused") return;
    job.phase = job.pausedPhase === "detail" ? "detail" : "search";
    delete job.pausedPhase;
    writeJob(job);
    await resumeProductSearchJob();
}

export function cancelProductSearchJob() {
    const job = readJob();
    if (job) publishJobStatus(job, "cancelled");
    clearJob();
}

async function waitForProductLink(sku, previousProductHrefs = [], occurrenceIndex = 0) {
    const started = Date.now();
    console.log("🔎 等待搜索结果:", sku, `(序号${occurrenceIndex})`);
    while (Date.now() - started < SEARCH_TIMEOUT_MS) {
        const results = getSearchProductResults();
        const best = selectBestProduct(results, previousProductHrefs, occurrenceIndex);
        if (best) {
            if (results.length > 1) {
                console.log(`🔍 搜索到 ${results.length} 个结果，筛选选择: status=${best.status}, type=${best.productType}`);
            }
            return best.link;
        }
        await new Promise((resolve) => setTimeout(resolve, SEARCH_WAIT_MS));
    }
    console.warn("❌ 搜索超时，未找到 SKU:", sku);
    return null;
}

async function continueJob(job) {
    const currentJob = readJob();
    if (!currentJob) {
        console.log("🛑 任务已取消，停止执行");
        return;
    }
    if (currentJob.phase === "paused") {
        console.log("⏸️ 任务已暂停，等待恢复");
        publishJobStatus(currentJob, "paused");
        return;
    }

    const nextIndex = job.index + 1;
    if (nextIndex >= job.products.length) {
        console.log("✅ 所有 SKU 处理完成:", job.results);
        job.phase = "complete";
        publishJobStatus(job, "complete");
        clearJob();
        return;
    }

    job.index = nextIndex;
    job.phase = "search";
    job.previousProductHrefs = [...getCurrentProductHrefs()];
    writeJob(job);
    await new Promise((resolve) => setTimeout(resolve, NEXT_PRODUCT_DELAY_MS));

    const jobAfterDelay = readJob();
    if (!jobAfterDelay) {
        console.log("🛑 延迟后任务已取消");
        return;
    }
    if (jobAfterDelay.phase === "paused") {
        console.log("⏸️ 延迟后任务已暂停");
        publishJobStatus(jobAfterDelay, "paused");
        return;
    }

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
    if (job.phase === "paused") return;

    const product = job.products[job.index];
    const sku = String(product?.sku ?? "").trim();
    if (!sku) {
        job.results[`row-${job.index}`] = {
            productStatus: "SKU未找到",
            sku: "",
            model_number: product?.model_number || "",
            product_name: product?.product_name || "",
            manufacturer: product?.manufacturer || "",
            processedAt: Date.now()
        };
        await continueJob(job);
        return;
    }

    const detailId = getDetailProductId();
    if (detailId && job.phase === "detail") {
        job.results[sku] = {
            productStatus: "SKU找到",
            productId: detailId,
            sku,
            model_number: product.model_number,
            product_name: product.product_name || "",
            manufacturer: product.manufacturer || "",
            processedAt: Date.now()
        };
        console.log("✅ SKU -> Product ID:", sku, detailId);
        try {
            const written = await writeProductMetafields(product, detailId);
            job.results[sku].metafields = written.ok ? "success" : "failed";
            const usesTextWarning = (product.safety_warning_text || product.compliance_profile === "lawn-mower");
            if (usesTextWarning) {
                job.results[sku].imageStatus = "文字警示";
                job.results[sku].imageNames = [];
            } else if (written.imageIds?.length) {
                job.results[sku].imageStatus = "成功";
                job.results[sku].imageNames = written.imageNames || [];
            } else {
                job.results[sku].imageStatus = "图片未找到";
                job.results[sku].imageNames = [];
            }
            if (written.ok) markProductCompleted(product, job.results[sku]);
        } catch (error) {
            job.results[sku].metafields = "failed";
            job.results[sku].error = error.message;
            job.results[sku].imageStatus = "图片未找到";
            job.results[sku].imageNames = [];
            console.error("❌ Product Metafields 写入失败:", error);
        }

        const jobAfterWrite = readJob();
        if (!jobAfterWrite) {
            console.log("🛑 写入完成后任务已取消");
            return;
        }
        if (jobAfterWrite.phase === "paused") {
            console.log("⏸️ 写入完成后任务已暂停");
            publishJobStatus(jobAfterWrite, "paused");
            writeJob(job);
            job.phase = "paused";
            return;
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

    const occurrenceIndex = getSkuOccurrenceIndex(job.products, job.index);
    const link = await waitForProductLink(sku, [], occurrenceIndex);

    const jobAfterSearch = readJob();
    if (!jobAfterSearch) {
        console.log("🛑 搜索完成后任务已取消");
        return;
    }
    if (jobAfterSearch.phase === "paused") {
        console.log("⏸️ 搜索完成后任务已暂停");
        publishJobStatus(jobAfterSearch, "paused");
        return;
    }

    if (!link) {
        job.results[sku] = {
            productStatus: "SKU未找到",
            sku,
            model_number: product.model_number,
            product_name: product.product_name || "",
            manufacturer: product.manufacturer || "",
            processedAt: Date.now()
        };
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
