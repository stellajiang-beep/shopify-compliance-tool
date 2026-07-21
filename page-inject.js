console.log("🔥 page-inject loaded");


const originalFetch = window.fetch;

window.fetch = async function (...args) {


    const url = args[0];
    const options = args[1];


    try {


        if (
            typeof url === "string" &&
            url.includes("/api/operations/") &&
            options?.method === "POST"
        ) {


            console.log(
                "🔥 POST:",
                url
            );


            console.log(
                "🔥 headers:",
                options.headers
            );


            console.log(
                "🔥 body:",
                options.body
            );


            // 捕获 MetaobjectDefinitionCreate
            if (
                options.body &&
                options.body.includes(
                    "MetaobjectDefinitionCreate"
                )
            ) {


                window.lastMetaobjectRequest = {

                    url: url,

                    headers: options.headers,

                    body: options.body

                };


                console.log(
                    "🔥 已保存 MetaobjectDefinitionCreate 请求模板:",
                    window.lastMetaobjectRequest
                );


            }


        }


    } catch (error) {


        console.log(
            "monitor error:",
            error
        );


    }



    return originalFetch.apply(
        this,
        args
    );


};




// 接收 content.js 消息
window.addEventListener(
    "message",
    async (event) => {


        if (event.source !== window) {

            return;

        }



        if (
            event.data.type === "CREATE_METAOBJECT"
        ) {


            console.log(
                "🔥 page-inject 收到创建任务:",
                event.data
            );



            const metaobjects =
                event.data.payload;



            for (
                const metaobject of metaobjects
            ) {


                await createMetaobjectDefinition(
                    metaobject
                );


            }


        }


    }
);


// 创建 Metaobject Definition
async function createMetaobjectDefinition(
    definition
) {


    const template =
        window.lastMetaobjectRequest;


    if (!template) {


        console.log(
            "❌ 没有找到 MetaobjectDefinitionCreate 模板"
        );

        return;

    }


    const body =
        JSON.parse(
            template.body
        );


    body.variables.input =
        definition;


    const response =
        await fetch(
            template.url,
            {
                method:"POST",
                headers:template.headers,
                body:JSON.stringify(body)
            }
        );


    const result =
        await response.json();


    console.log(
        "🔥 创建结果:",
        result
    );


}