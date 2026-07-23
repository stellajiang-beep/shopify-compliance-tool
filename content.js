console.log("Compliance content loaded");

let metaobjectTemplate = null;


fetch(
    chrome.runtime.getURL(
        "config/metaobject-definition-template.json"
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


    }
);