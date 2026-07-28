import { initFetchInterceptor } from "./modules/fetch-interceptor.js";
import { initMessageHandler } from "./modules/message-handler.js";
import {
    pauseProductSearchJob,
    resumeProductSearchJob
} from "./modules/product-search.js";

console.log("🔥 page-inject loaded");

window.lastMetaobjectRequest = null;
window.lastMetaobjectEntryRequest = null;
window.lastMetafieldRequest = null;
window.lastProductMetafieldRequest = null;
window.isCreating = false;
try {
    window.shopifyManufacturerMap = JSON.parse(
        sessionStorage.getItem("shopifyManufacturerMap") || "null"
    )?.manufacturerMap || null;
} catch {
    window.shopifyManufacturerMap = null;
}

window.addEventListener("message", (event) => {
    if (event.source === window && event.data?.type === "SHOPIFY_MANUFACTURER_MAP") {
        window.shopifyManufacturerMap = event.data.manufacturerMap;
        console.log("✅ Manufacturer Map 已加载:", event.data.locale);
    }
});

initFetchInterceptor();
initMessageHandler();
// 页面跳转后 content script 会重新注入，从 sessionStorage 恢复队列。
const navigationEntry = performance.getEntriesByType("navigation")[0];
if (navigationEntry?.type === "reload") {
    // 用户手动刷新时停止旧任务，避免刷新后自动重新搜索。
    pauseProductSearchJob();
} else {
    resumeProductSearchJob().catch((error) => {
        console.error("❌ 恢复 SKU 搜索任务失败:", error);
    });
}

// Shopify Admin 是 SPA：点击商品后 URL 会变化，但脚本通常不会重新加载。
// 定时检查 URL，让 detail 阶段能够在同一个页面实例中继续执行。
let lastObservedUrl = location.href;
setInterval(() => {
    if (location.href !== lastObservedUrl) {
        lastObservedUrl = location.href;
        resumeProductSearchJob().catch((error) => {
            console.error("❌ 路由变化后恢复 SKU 任务失败:", error);
        });
    }
}, 500);


