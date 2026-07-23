import { initFetchInterceptor } from "./modules/fetch-interceptor.js";
import { initMessageHandler } from "./modules/message-handler.js";

console.log("🔥 page-inject loaded");

window.lastMetaobjectRequest = null;
window.lastMetaobjectEntryRequest = null;
window.lastMetafieldRequest = null;
window.isCreating = false;

initFetchInterceptor();
initMessageHandler();


