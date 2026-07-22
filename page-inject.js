console.log("🔥 page-inject loaded");


// ==============================
// 保存请求模板
// ==============================

window.lastMetaobjectRequest = null;
window.lastMetaobjectEntryRequest = null;
window.lastMetafieldRequest = null;


// 防止监听自己的请求
window.isCreating = false;




// ==============================
// 获取 operationName
// ==============================

function getOperationName(body) {

    try {

        return JSON.parse(body).operationName;

    } catch (e) {

        return "";

    }

}






// ==============================
// fetch监听
// ==============================


const originalFetch = window.fetch;


window.fetch = async function (...args) {


    const url = args[0];

    const options = args[1];



    if (
        window.isCreating
    ) {

        return originalFetch.apply(
            this,
            args
        );

    }



    try {


        if (
            options?.method === "POST" &&
            options?.body
        ) {


            const operationName =
                getOperationName(
                    options.body
                );



            console.log(
                "🔥 fetch operation:",
                operationName,
                url
            );



            captureRequest(
                operationName,
                url,
                options
            );


        }


    } catch (e) {

        console.log(
            "fetch monitor error:",
            e
        );

    }



    return originalFetch.apply(
        this,
        args
    );


};








// ==============================
// 捕获请求
// ==============================


function captureRequest(
    operationName,
    url,
    options
) {


    if (
        !url.includes("/api/operations/")
    ) {

        return;

    }




    // 捕获 Metaobject

    if (
        operationName.includes(
            "MetaobjectDefinitionCreate"
        )
    ) {

        window.lastMetaobjectRequest = {

            url: url,

            headers:
                options.headers,

            body:
                options.body

        };


        console.log(
            "🔥 捕获 Metaobject模板:",
            window.lastMetaobjectRequest
        );

    }

    // 捕获 Metaobject Entry

    if (
        operationName === "MetaobjectCreate"
    ) {

        window.lastMetaobjectEntryRequest = {

            url: url,

            headers:
                options.headers,

            body:
                options.body

        };


        console.log(
            "🔥 捕获 Metaobject Entry模板:",
            window.lastMetaobjectEntryRequest
        );

    }




    // 捕获 Metafield

    if (
        operationName.includes(
            "MetafieldDefinitionCreate"
        )
    ) {


        window.lastMetafieldRequest = {


            url: url,


            headers:
                options.headers,


            body:
                options.body


        };



        console.log(
            "🔥 捕获 Metafield模板:",
            window.lastMetafieldRequest
        );


    }


}












// ==============================
// 接收插件消息
// ==============================


window.addEventListener(
    "message",
    async (event) => {


        if (
            event.source !== window
        ) {

            return;

        }



        if (
            event.data.type === "CREATE_METAFIELD"
        ) {


            console.log(
                "🔥 收到Metafield创建任务:",
                event.data
            );



            const metafields =
                event.data.payload;



            for (
                const item of metafields
            ) {


                await createMetafieldDefinition(
                    item
                );


            }


        }

        if (
            event.data.type === "CREATE_METAOBJECT_ENTRY"
        ) {

            createMetaobjectEntries(
                event.data.payload
            );

        }

    }

);


// ==============================
// 创建 Metafield Definition
// ==============================


async function createMetafieldDefinition(
    definition
) {


    console.log(
        "🔥 准备创建:",
        definition
    );



    if (
        !window.lastMetafieldRequest
    ) {


        console.log(
            "❌ 没有Metafield模板"
        );


        return;

    }





    // 复制 Shopify 原始模板

    const body =
        JSON.parse(
            window.lastMetafieldRequest.body
        );





    const input = {


        ownerType: "PRODUCT",


        namespace:
            definition.namespace,


        key:
            definition.key,


        name:
            definition.name,


        type:
            definition.type,


        description: "",


        pin: true,



        access: {

            customerAccount: "NONE",

            storefront: "PUBLIC_READ"

        },



        constraints: null,



        capabilities: {


            uniqueValues: {

                enabled: false

            },


            adminFilterable: {

                enabled: false

            },


            smartCollectionCondition: {

                enabled: false

            },


            cartToOrderCopyable: {

                enabled: false

            },


            analyticsQueryable: {

                enabled: false

            }


        }



    };






    // metaobject reference 特殊处理

    if (

        definition.type === "metaobject_reference"

    ) {


        input.validations = [

            {

                name:
                    "metaobject_definition_id",


                value:
                    definition.reference

            }

        ];


    }







    body.variables.input =
        input;





    console.log(
        "🔥 最终发送Metafield:",
        body
    );







    window.isCreating = true;



    const response =
        await fetch(


            window.lastMetafieldRequest.url,


            {

                method: "POST",


                headers:
                    window.lastMetafieldRequest.headers,


                body:
                    JSON.stringify(body)


            }


        );



    window.isCreating = false;






    console.log(
        "🔥 HTTP状态:",
        response.status
    );




    const result =
        await response.text();




    console.log(
        "🔥 Shopify返回:",
        result
    );



}

async function createMetaobjectEntries(entries) {

    for (const entry of entries) {

        if (
            !window.lastMetaobjectEntryRequest
        ) {

            console.log(
                "❌ 没有Metaobject Entry模板"
            );

            return;

        }


        const body =
            JSON.parse(
                window.lastMetaobjectEntryRequest.body
            );


        body.variables.input.type =
            entry.type;


        body.variables.input.fields =
            Object.entries(entry.fields)
                .map(([key, value]) => ({

                    key: key,
                    value: String(value)

                }));


        console.log(
            "🔥 创建Metaobject Entry:",
            body
        );


        const response =
            await fetch(
                window.lastMetaobjectEntryRequest.url,
                {
                    method: "POST",

                    headers:
                        window.lastMetaobjectEntryRequest.headers,

                    body:
                        JSON.stringify(body)
                }
            );


        const result =
            await response.json();


        console.log(
            "🔥 Metaobject创建结果:",
            result
        );


        if (
            result.data?.metaobjectCreate?.metaobject
        ) {

            const id =
                result.data
                    .metaobjectCreate
                    .metaobject
                    .id;


            console.log(
                "✅ Metaobject ID:",
                id
            );


        }

    }

}

