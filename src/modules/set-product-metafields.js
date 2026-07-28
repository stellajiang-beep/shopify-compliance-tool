import { startProductSearchJob } from "./product-search.js";

export async function setProductMetafields(products) {

    console.log("======================================");
    console.log("🚀 开始执行 Product Metafields");
    console.log("======================================");

    console.log("收到的数据：", products);

    if (!Array.isArray(products)) {
        console.error("❌ payload 不是数组");
        return;
    }

    console.log(`共 ${products.length} 个 Product`);

    console.log("⏳ 启动串行 SKU 搜索队列，产品之间间隔 1.8 秒");
    startProductSearchJob(products);

}
