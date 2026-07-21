console.log("Compliance content loaded");


// 注入 page-inject.js
const script = document.createElement("script");

script.src = chrome.runtime.getURL(
    "page-inject.js"
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
                    payload: message.payload
                },
                "*"
            );


            console.log(
                "已经转发给 page-inject"
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