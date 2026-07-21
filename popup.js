
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
        () => {

            console.log("🔥 点击创建按钮");


            chrome.runtime.sendMessage({

                type: "CREATE_METAOBJECT"

            });


        });