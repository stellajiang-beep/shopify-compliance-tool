let metaobjects = [];


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


console.log(
    "🔥 background loaded"
);





chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {


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

                            type:"CREATE_METAOBJECT",

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
                        active:true,
                        currentWindow:true
                    },
                    tabs => {


                        console.log(
                            "🔥 发送 CREATE_METAFIELD 到 content:",
                            tabs[0].id
                        );


                        chrome.tabs.sendMessage(
                            tabs[0].id,
                            {

                                type:"CREATE_METAFIELD",

                                payload:data

                            }
                        );


                    }
                );


            });


        }



    }
);