export async function createMetaobjectDefinition(
    definition
) {

    console.log(
        "🔥 准备创建Metaobject:",
        definition
    );

    if (
        !window.lastMetaobjectRequest
    ) {

        console.log(
            "❌ 没有Metaobject模板"
        );

        return;

    }

    // 复制 Shopify 原始模板
    const body =
        JSON.parse(
            window.lastMetaobjectRequest.body
        );

    // 使用模板，只替换需要变化的字段
    body.variables.input.name =
        definition.name;

    body.variables.input.type =
        definition.type;

    body.variables.input.fieldDefinitions =
        definition.fieldDefinitions;
    body.variables.input.displayNameKey =
        definition.displayNameKey;
    console.log(
        body.variables.input.displayNameKey
    );
    console.log(
        "🔥 最终发送Metaobject:",
        body
    );

    window.isCreating = true;

    const response =
        await fetch(
            window.lastMetaobjectRequest.url,
            {
                method: "POST",

                headers:
                    window.lastMetaobjectRequest.headers,

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