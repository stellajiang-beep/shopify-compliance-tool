let metaobjects = [];


fetch(
    chrome.runtime.getURL(
        "config/metaobjects.json"
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
console.log("🔥 background loaded");

chrome.runtime.onMessage.addListener(
    (message) => {


        if (message.type === "TEST_CONNECTION") {


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


                            if (chrome.runtime.lastError) {

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


                        });


                });

            if (
                message.type === "SAVE_METAOBJECT_TEMPLATE"
            ) {


                chrome.storage.local.set({

                    metaobjectTemplate:
                        message.payload

                });


                console.log(
                    "🔥 模板已经保存"
                );


            }


        }



        if (message.type === "CREATE_METAOBJECT") {


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
                            payload: metaobjects
                        }
                    );


                });


        }


    });