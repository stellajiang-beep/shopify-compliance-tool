let metaobjects = [];
let productMetafields = [];

function getActiveTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        callback(tabId ? null : new Error("No active tab"), tabId);
    });
}

function productJobStatusKey(tabId) {
    return `productJobStatus:${tabId}`;
}

function importedProductsKey(tabId) {
    return `importedProducts:${tabId}`;
}

function productJobReportKey(tabId) {
    return `productJobReport:${tabId}`;
}

function sendProductJobCommand(type, payload, callback = () => {}) {
    getActiveTab((tabError, tabId) => {
        if (tabError) return callback(tabError);
        const send = (allowInjectionRetry) => chrome.tabs.sendMessage(tabId, { type, payload }, () => {
            const error = chrome.runtime.lastError;
            if (allowInjectionRetry && /Receiving end does not exist/i.test(error?.message || "")) {
                chrome.scripting.executeScript({
                    target: { tabId },
                    files: ["content.js"]
                }, () => {
                    const injectionError = chrome.runtime.lastError;
                    if (injectionError) return callback(new Error(injectionError.message));
                    // page-inject.js is appended by content.js and needs one event loop turn to load.
                    setTimeout(() => send(false), 250);
                });
                return;
            }
            callback(error ? new Error(error.message) : null);
        });
        send(true);
    });
}

async function loadBundledProducts() {
    const response = await fetch(chrome.runtime.getURL("config/data/products.json"));
    return response.json();
}


// 加载 Metaobject 配置

fetch(
    chrome.runtime.getURL(
        "config/data/metaobjects.json"
    )
)
    .then(response => response.json())
    .then(data => {

        metaobjects = data;

        console.log(
            "🔥 metaobjects loaded:",
            metaobjects
        );

    });

fetch(
    chrome.runtime.getURL(
        "config/data/products.json"
    )
)
    .then(response => response.json())
    .then(data => {

        productMetafields = data;

        console.log(
            "🔥 product_metafields loaded:",
            productMetafields
        );

    });


console.log(
    "🔥 background loaded"
);





chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message.type === "PRODUCT_JOB_STATUS") {
            const tabId = sender.tab?.id;
            if (!tabId) return;
            const statusKey = productJobStatusKey(tabId);
            const reportKey = productJobReportKey(tabId);
            if (message.payload?.state === "reset") {
                chrome.storage.local.remove(reportKey);
            }
            chrome.storage.local.get(reportKey, (saved) => {
                const reportResults = message.payload?.state === "reset"
                    ? {}
                    : {
                        ...(saved[reportKey]?.results || {}),
                        ...(message.payload?.results || {})
                    };
                chrome.storage.local.set({
                    [statusKey]: message.payload,
                    [reportKey]: { results: reportResults, updatedAt: Date.now() },
                    [`productJobUpdatedAt:${tabId}`]: Date.now()
                });
            });
            return;
        }

        if (message.type === "GET_PRODUCT_PANEL_DATA") {
            getActiveTab((tabError, tabId) => {
                if (tabError) return sendResponse({ error: tabError.message });
                const importKey = importedProductsKey(tabId);
                const statusKey = productJobStatusKey(tabId);
                const reportKey = productJobReportKey(tabId);
                Promise.all([
                    loadBundledProducts(),
                    chrome.storage.local.get([importKey, statusKey, reportKey])
                ]).then(([bundledProducts, saved]) => sendResponse({
                    tabId,
                    bundledCount: bundledProducts.length,
                    importedCount: Array.isArray(saved[importKey]) ? saved[importKey].length : 0,
                    importedProducts: saved[importKey] || [],
                    status: saved[statusKey] || null,
                    reportResults: saved[reportKey]?.results || {}
                })).catch((error) => sendResponse({ error: error.message }));
            });
            return true;
        }

        if (message.type === "SAVE_IMPORTED_PRODUCTS") {
            if (!Array.isArray(message.payload)) {
                sendResponse({ error: "Imported data must be an array" });
                return;
            }
            getActiveTab((tabError, tabId) => {
                if (tabError) return sendResponse({ error: tabError.message });
                chrome.storage.local.set({ [importedProductsKey(tabId)]: message.payload }, () => {
                    sendResponse({ ok: true, count: message.payload.length });
                });
            });
            return true;
        }

        if (["PAUSE_PRODUCT_JOB", "RESUME_PRODUCT_JOB", "CANCEL_PRODUCT_JOB", "RESET_COMPLETED_PRODUCTS", "REQUEST_PRODUCT_JOB_STATUS"].includes(message.type)) {
            sendProductJobCommand(message.type, null, (error) => {
                sendResponse(error ? { error: error.message } : { ok: true });
            });
            return true;
        }


        console.log(
            "🔥 background收到消息:",
            message
        );




        // ==========================
        // 测试连接 Shopify
        // ==========================

        if (
            message.type === "TEST_CONNECTION"
        ) {


            chrome.tabs.query(
                {
                    active: true,
                    currentWindow: true
                },
                (tabs) => {


                    console.log(
                        "当前tab:",
                        tabs[0].id
                    );


                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        {
                            type: "PAGE_TEST"
                        },
                        (response) => {


                            if (
                                chrome.runtime.lastError
                            ) {


                                console.log(
                                    "发送失败:",
                                    chrome.runtime.lastError.message
                                );


                            } else {


                                console.log(
                                    "content返回:",
                                    response
                                );


                            }


                        }
                    );


                }
            );


        }

        // ==========================
        // 保存 Metaobject 请求模板
        // ==========================


        if (
            message.type === "SAVE_METAOBJECT_TEMPLATE"
        ) {


            chrome.storage.local.set({

                metaobjectTemplate:
                    message.payload

            });


            console.log(
                "🔥 Metaobject模板已经保存"
            );


        }

        // ==========================
        // 创建 Metaobject
        // ==========================


        if (
            message.type === "CREATE_METAOBJECT"
        ) {


            chrome.tabs.query(
                {
                    active: true,
                    currentWindow: true
                },
                (tabs) => {


                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        {

                            type: "CREATE_METAOBJECT",

                            payload:
                                metaobjects

                        }
                    );


                }
            );


        }

        // ==========================
        // 创建 Product Metafield
        // ==========================


        if (
            message.type === "CREATE_METAFIELD"
        ) {


            console.log(
                "🔥 开始读取 metafields.json"
            );


            fetch(
                chrome.runtime.getURL(
                    "config/data/metafields.json"
                )
            )
                .then(res => res.json())
                .then(data => {


                    console.log(
                        "🔥 metafields loaded:",
                        data
                    );



                    chrome.tabs.query(
                        {
                            active: true,
                            currentWindow: true
                        },
                        tabs => {


                            console.log(
                                "🔥 发送 CREATE_METAFIELD 到 content:",
                                tabs[0].id
                            );


                            chrome.tabs.sendMessage(
                                tabs[0].id,
                                {

                                    type: "CREATE_METAFIELD",

                                    payload: data

                                }
                            );


                        }
                    );


                });


        }

        // ==========================
        // Create Metaobject Entry
        // ==========================

        if (
            message.type === "CREATE_METAOBJECT_ENTRY"
        ) {

            fetch(
                chrome.runtime.getURL(
                    "config/data/metaobject_entries.json"
                )
            )
                .then(res => res.json())
                .then(entries => {

                    console.log(
                        "Loading Metaobject Entry data:",
                        entries
                    );

                    chrome.tabs.query(
                        {
                            active: true,
                            currentWindow: true
                        },
                        tabs => {

                            if (!tabs[0]?.id) {
                                console.error(
                                    "No active tab available for Metaobject Entry creation"
                                );
                                return;
                            }

                            chrome.tabs.sendMessage(
                                tabs[0].id,
                                {
                                    type: "CREATE_METAOBJECT_ENTRY",
                                    payload: entries
                                },
                                () => {
                                    if (chrome.runtime.lastError) {
                                        console.error(
                                            "Failed to send Metaobject Entry task:",
                                            chrome.runtime.lastError.message
                                        );
                                    }
                                }
                            );

                        }
                    );

                })
                .catch(error => {
                    console.error(
                        "Failed to load Metaobject Entry data:",
                        error
                    );
                });

        }

        // ==========================
        // Set Product Metafields
        // ==========================

        if (
            message.type === "SET_PRODUCT_METAFIELDS"
        ) {

            console.log(
                "🔥 开始设置 Product Metafields"
            );

            // Service worker 可能刚刚被唤醒，此时初始化 fetch 尚未完成。
            // 点击按钮时确保 products.json 已加载，再发送任务。
            const batchRequest = Array.isArray(message.payload)
                ? { products: message.payload }
                : (message.payload || {});
            const sendProductMetafieldTask = (allProducts) => {
                const batchSize = Math.max(1, Number(batchRequest.batchSize) || allProducts.length);
                const totalBatches = Math.max(1, Math.ceil(allProducts.length / batchSize));
                const batchIndex = Math.min(
                    Math.max(0, Number(batchRequest.batchIndex) || 0),
                    totalBatches - 1
                );
                const products = allProducts.slice(
                    batchIndex * batchSize,
                    (batchIndex + 1) * batchSize
                );
                if (!products.length) {
                    sendResponse?.({ error: "Selected batch is empty" });
                    return;
                }
                sendProductJobCommand(
                    "SET_PRODUCT_METAFIELDS",
                    products,
                    (error) => sendResponse?.(error
                        ? { error: error.message }
                        : { ok: true, count: products.length, batchIndex, totalBatches })
                );
            };

            if (Array.isArray(batchRequest.products)) {
                sendProductMetafieldTask(batchRequest.products);
                return true;
            }

            if (Array.isArray(productMetafields) && productMetafields.length) {
                sendProductMetafieldTask(productMetafields);
            } else {
                fetch(chrome.runtime.getURL("config/data/products.json"))
                    .then(response => response.json())
                    .then(data => {
                        productMetafields = data;
                        console.log("✅ 点击时重新加载 products.json:", productMetafields.length);
                        sendProductMetafieldTask(productMetafields);
                    })
                    .catch(error => console.error("❌ products.json 加载失败:", error));
            }

            return true;
        }

    }
);
