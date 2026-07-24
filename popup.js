console.log("🔥 popup.js loaded");

/**
 * 统一发送消息
 */
function send(type, payload = null) {
    chrome.runtime.sendMessage({
        type,
        payload
    });
}

/**
 * 测试连接
 */
document
    .getElementById("test-connection")
    .addEventListener("click", () => {

        console.log("🔥 Test Connection");

        chrome.runtime.sendMessage(
            {
                type: "TEST_CONNECTION"
            },
            (response) => {
                console.log("background response:", response);
            }
        );

    });

/**
 * 创建 Metaobject
 */
document
    .getElementById("create-metaobject")
    .addEventListener("click", () => {

        console.log("🔥 Create Metaobject");

        send("CREATE_METAOBJECT");

    });

/**
 * 创建 Product Metafield
 */
document
    .getElementById("create-metafield")
    .addEventListener("click", () => {

        console.log("🔥 Create Product Metafield");

        send("CREATE_METAFIELD");

    });

/**
 * 创建 Metaobject Entry
 */
document
    .getElementById("create-metaobject-entry")
    .addEventListener("click", () => {

        console.log("🔥 Create Metaobject Entry");

        send("CREATE_METAOBJECT_ENTRY");

    });

document
    .getElementById("set-product-metafields")
    .addEventListener("click", () => {

        console.log("🔥 Set Product Metafields");

        send("SET_PRODUCT_METAFIELDS");

    });