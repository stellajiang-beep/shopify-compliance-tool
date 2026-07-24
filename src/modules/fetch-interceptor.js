export function initFetchInterceptor() {
    // 获取 operationName

    function getOperationName(body) {
        try {
            return JSON.parse(body).operationName;
        } catch (e) {
            return "";
        }
    }


    // fetch监听
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

    // 捕获请求
    function captureRequest(
        operationName,
        url,
        options
    ) {

        // 保存 Shopify Admin GraphQL 请求环境
        if (
            url.includes("/api/operations/")
            &&
            operationName
        ) {

            window.shopifyRequest = {

                url: url,

                headers: options.headers

            };


            console.log(
                "🔥 Shopify GraphQL环境保存:",
                operationName,
                window.shopifyRequest
            );

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


}