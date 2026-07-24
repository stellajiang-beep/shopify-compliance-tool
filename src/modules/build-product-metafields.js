import { getProductData } from "./product-data.js";

export function buildProductMetafields(sku) {

    const {
        products,
        manufacturerMap
    } = getProductData();

    const product =
        products.find(
            p => p.sku === sku
        );

    if (!product) {
        throw new Error(`找不到SKU：${sku}`);
    }

    const manufacturerId =
        manufacturerMap[
            product.manufacturer
        ];

    if (!manufacturerId) {
        throw new Error(
            `找不到Manufacturer：${product.manufacturer}`
        );
    }

    return [

        {
            namespace: "custom",
            key: "model_number",
            value: product.model_number,
            type: "single_line_text_field"
        },

        {
            namespace: "custom",
            key: "compliance_profile",
            value: manufacturerId,
            type: "metaobject_reference"
        }

    ];

}