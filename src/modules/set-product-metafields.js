import { findProductIdBySku } from "./product-search.js";

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

    for (const product of products) {

        console.log("--------------------------------------");
        console.log("SKU:", product.sku);
        console.log("Model:", product.model_number);
        console.log("Manufacturer:", product.manufacturer);

        const productId = await findProductIdBySku(
            product.sku
        );

        console.log("Product ID:", productId);

    }

    console.log("======================================");
    console.log("✅ Product 数据读取完成");
    console.log("======================================");

}