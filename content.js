console.log("Compliance content loaded");

let metaobjectTemplate = null;


fetch(
    chrome.runtime.getURL(
        "config/templates/metaobject-definition-template.json"
    )
)
    .then(res => res.json())
    .then(data => {

        metaobjectTemplate = data;

        console.log(
            "🔥 Metaobject模板加载成功:",
            data
        );


    });
// 注入 page-inject.js
const script = document.createElement("script");

script.src = chrome.runtime.getURL(
    "dist/page-inject.js"
);

console.log(
    "🔥 准备注入:",
    script.src
);

script.onload = function () {
    this.remove();
};

(document.head || document.documentElement)
    .appendChild(script);



chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {


        console.log(
            "content 收到消息:",
            message
        );

        window.postMessage(
            message,
            "*"
        );


        if (message.type === "PAGE_TEST") {


            console.log(
                "收到页面测试消息"
            );


            sendResponse({
                success: true
            });


        }

        if (message.type === "CREATE_METAOBJECT") {


            window.postMessage(
                {
                    type: "CREATE_METAOBJECT",
                    payload: message.payload,
                    template: metaobjectTemplate
                },
                "*"
            );


            console.log(
                "已经转发给 page-inject"
            );


        }
        if (
            message.type === "CREATE_METAFIELD"
        ) {


            window.postMessage(
                {

                    type: "CREATE_METAFIELD",

                    payload: message.payload

                },
                "*"
            );


            console.log(
                "🔥 已转发创建Metafield任务"
            );


        }
        if (
            message.type === "CREATE_METAFIELD"
        ) {

            window.postMessage(
                {
                    type: "CREATE_METAFIELD",
                    payload: message.payload
                },
                "*"
            );

            console.log(
                "🔥 已转发创建Metafield任务"
            );

        }


        if (message.type !== "PAGE_TEST") {
            sendResponse({ success: true });
        }
        return true;



    });

window.addEventListener(
    "message",
    (event) => {


        if (event.data.type === "SAVE_METAOBJECT_TEMPLATE") {


            chrome.runtime.sendMessage({

                type: "SAVE_METAOBJECT_TEMPLATE",

                payload: event.data.payload

            });


        }

        if (event.source === window && event.data.type === "PRODUCT_JOB_STATUS") {
            chrome.runtime.sendMessage({
                type: "PRODUCT_JOB_STATUS",
                payload: event.data.payload
            });
        }


    }
);
// 在 extension isolated world 读取店铺语言和 Manufacturer Map，
// 再传给 page-inject.js（页面 world 无法访问 chrome.runtime）。
(async () => {
    try {
        const storeId = location.pathname.match(/^\/store\/([^/]+)/)?.[1];
        if (!storeId) return;
        const localeMap = await fetch(
            chrome.runtime.getURL("config/store-locale-map.json")
        ).then((response) => response.json());
        const locale = localeMap[storeId];
        if (!locale) return;
        const manufacturerMap = await fetch(
            chrome.runtime.getURL(`manufacturer-map/${locale}-manufacturer-map.json`)
        ).then((response) => response.json());
        const profileMaps = await fetch(
            chrome.runtime.getURL("config/compliance-profile-map.json")
        ).then((response) => response.json());
        const complianceProfileMap = profileMaps[locale] || {};
        const safetyTextMaps = await fetch(
            chrome.runtime.getURL("config/safty-text.json")
        ).then((response) => response.json());
        const safetyTextMap = safetyTextMaps[locale] || {};
        sessionStorage.setItem("shopifyManufacturerMap", JSON.stringify({
            storeId,
            locale,
            manufacturerMap
        }));
        sessionStorage.setItem("shopifyComplianceProfileMap", JSON.stringify({
            storeId,
            locale,
            complianceProfileMap
        }));
        sessionStorage.setItem("shopifySafetyTextMap", JSON.stringify({
            storeId,
            locale,
            safetyTextMap
        }));
        window.postMessage({
            type: "SHOPIFY_MANUFACTURER_MAP",
            storeId,
            locale,
            manufacturerMap
        }, "*");
        window.postMessage({
            type: "SHOPIFY_COMPLIANCE_PROFILE_MAP",
            storeId,
            locale,
            complianceProfileMap
        }, "*");
        window.postMessage({
            type: "SHOPIFY_SAFETY_TEXT_MAP",
            storeId,
            locale,
            safetyTextMap
        }, "*");
    } catch (error) {
        console.error("Manufacturer Map 加载失败:", error);
    }
})();
