export async function createMetafieldDefinition(
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