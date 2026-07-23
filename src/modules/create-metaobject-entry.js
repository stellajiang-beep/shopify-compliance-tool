export async function createMetaobjectEntries(entries) {

    window.manufacturerMap = {};

    const manufacturerMap = window.manufacturerMap;

    for (const entry of entries) {

        if (
            !window.lastMetaobjectEntryRequest
        ) {

            console.log(
                "❌ 没有Metaobject Entry模板"
            );

            return;

        }


        const body = JSON.parse(window.lastMetaobjectEntryRequest.body);

        console.log(JSON.stringify(body, null, 2));
        console.log(body.variables.input);

        body.variables.input.type =
            entry.type;

        body.variables.input.handle =
            entry.handle;

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


            manufacturerMap[
                entry.fields.manufacturer_name
            ] = id;
            console.log(
                "✅ Metaobject ID:",
                id
            );


        }

    }

    console.log(
        "📦 Manufacturer Map:",
        manufacturerMap
    );

    
    exportManufacturerMap();
}

function exportManufacturerMap() {

    console.count("exportManufacturerMap");

    if (!window.manufacturerMap || Object.keys(window.manufacturerMap).length === 0) {
        alert("没有可导出的 Manufacturer Map");
        return;
    }

    const blob = new Blob(
        [
            JSON.stringify(
                window.manufacturerMap,
                null,
                2
            )
        ],
        {
            type: "application/json"
        }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "manufacturer-map.json";

    a.click();

    URL.revokeObjectURL(url);

    console.log("✅ manufacturer-map.json 已导出");

}