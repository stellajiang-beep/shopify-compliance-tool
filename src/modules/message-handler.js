import { createMetaobjectDefinition } from "./create-metaobject.js";
import { createMetafieldDefinition } from "./create-metafield.js";
import { createMetaobjectEntries } from "./create-metaobject-entry.js";

export function initMessageHandler() {
    window.addEventListener(
        "message",
        async (event) => {
            if (
                event.source !== window
            ) {
                return;
            }
            if (
                event.data.type === "CREATE_METAOBJECT"
            ) {
                console.log(
                    "🔥 收到Metaobject创建任务:",
                    event.data
                );
                const metaobjects =
                    event.data.payload;

                for (
                    const item of metaobjects
                ) {
                    await createMetaobjectDefinition(
                        item
                    );
                }
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
            if (event.data.type === "EXPORT_MANUFACTURER_MAP") {
                console.log("收到 EXPORT_MANUFACTURER_MAP");
                exportManufacturerMap();
            }
        }
    );

}