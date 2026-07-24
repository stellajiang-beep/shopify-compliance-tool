export async function findProductIdBySku(sku) {


    console.log(
        "🔍 开始搜索SKU:",
        sku
    );


    const requestContext = window.shopifyRequest;

    if (
        !requestContext?.url || !requestContext?.headers
    ) {

        console.log(
            "❌ 没有可用 Shopify 请求环境"
        );

        return null;

    }



    const query = `
    query ProductSearch($query: String!) {

        productVariants(
            first: 1,
            query: $query
        ) {

            nodes {

                sku

                product {

                    id

                    title

                }

            }

        }

    }
    `;



    const body = {


        operationName:
            "ProductSearch",


        variables: {

            query:
                // The SKU is a variant attribute. Querying productVariants avoids
                // missing products whose SKU only exists on a variant.
                `sku:'${String(sku).replace(/'/g, "\\'")}'`

        },


        query

    };




    const response =
        await fetch(

            requestContext.url,

            {

                method:"POST",

                // SKU search does not depend on a Metafield-definition request.
                // Reuse the common Admin GraphQL request captured by the interceptor.
                headers:
                    requestContext.headers,

                body:
                    JSON.stringify(body)

            }

        );



    const json =
        await response.json();



    console.log(
        "🔥 Product Search 返回:",
        json
    );



    if (json.errors?.length) {

        console.error(
            "❌ Product Search GraphQL errors:",
            json.errors
        );

        return null;

    }

    const variant =
        json.data
        ?.productVariants
        ?.nodes
        ?.[0];


    const product = variant?.product;



    if (!product) {


        console.log(
            "❌ 未找到:",
            sku
        );


        return null;

    }



    console.log(
        "✅ 找到:",
        product.id,
        product.title
    );


    return product.id;


}
