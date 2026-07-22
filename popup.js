
console.log("🔥 popup.js loaded");
document
    .getElementById("test")
    .addEventListener("click", () => {


        console.log("popup clicked");


        chrome.runtime.sendMessage(
            {
                type: "TEST_CONNECTION"
            },
            (response) => {

                console.log(
                    "background response:",
                    response
                );

            });


    });

document
    .getElementById("createMetaobject")
    .addEventListener(
        "click",
        async () => {

            console.log("🔥 点击创建按钮");

            const response =
                await fetch(
                    chrome.runtime.getURL(
                        "config/metaobjects.json"
                    )
                );


            const metaobjects =
                await response.json();
            chrome.runtime.sendMessage({

                type: "CREATE_METAOBJECT",
                payload: metaobjects

            });


        });

document
    .getElementById("createMetafield")
    .addEventListener(
        "click",
        () => {


            console.log(
                "🔥 点击创建 Product Metafield"
            );


            chrome.runtime.sendMessage({

                type: "CREATE_METAFIELD"

            });


        });

document
    .getElementById("createMetaobjectentries")
    .onclick = async () => {


        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });


        chrome.tabs.sendMessage(
            tab.id,
            {
                type: "CREATE_METAOBJECT_ENTRY",
                payload: [
                    {
                        type: "compliance_manufacturer",
                        fields: {
                            manufacturer_name:
                                "TEST Manufacturer",

                            manufacturer_address:
                                "TEST ADDRESS"
                        }
                    }
                ]
            }
        );

    };