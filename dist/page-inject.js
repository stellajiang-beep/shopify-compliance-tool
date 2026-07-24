(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/modules/fetch-interceptor.js
  function initFetchInterceptor() {
    function getOperationName(body) {
      try {
        return JSON.parse(body).operationName;
      } catch (e) {
        return "";
      }
    }
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0];
      const options = args[1];
      if (window.isCreating) {
        return originalFetch.apply(
          this,
          args
        );
      }
      try {
        if (options?.method === "POST" && options?.body) {
          const operationName = getOperationName(
            options.body
          );
          console.log(
            "\u{1F525} fetch operation:",
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
    function captureRequest(operationName, url, options) {
      if (url.includes("/api/operations/") && operationName) {
        window.shopifyRequest = {
          url,
          headers: options.headers
        };
        console.log(
          "\u{1F525} Shopify GraphQL\u73AF\u5883\u4FDD\u5B58:",
          operationName,
          window.shopifyRequest
        );
      }
      if (operationName.includes(
        "MetaobjectDefinitionCreate"
      )) {
        window.lastMetaobjectRequest = {
          url,
          headers: options.headers,
          body: options.body
        };
        console.log(
          "\u{1F525} \u6355\u83B7 Metaobject\u6A21\u677F:",
          window.lastMetaobjectRequest
        );
      }
      if (operationName === "MetaobjectCreate") {
        window.lastMetaobjectEntryRequest = {
          url,
          headers: options.headers,
          body: options.body
        };
        console.log(
          "\u{1F525} \u6355\u83B7 Metaobject Entry\u6A21\u677F:",
          window.lastMetaobjectEntryRequest
        );
      }
      if (operationName.includes(
        "MetafieldDefinitionCreate"
      )) {
        window.lastMetafieldRequest = {
          url,
          headers: options.headers,
          body: options.body
        };
        console.log(
          "\u{1F525} \u6355\u83B7 Metafield\u6A21\u677F:",
          window.lastMetafieldRequest
        );
      }
    }
  }
  var init_fetch_interceptor = __esm({
    "src/modules/fetch-interceptor.js"() {
    }
  });

  // src/modules/create-metaobject.js
  async function createMetaobjectDefinition(definition) {
    console.log(
      "\u{1F525} \u51C6\u5907\u521B\u5EFAMetaobject:",
      definition
    );
    if (!window.lastMetaobjectRequest) {
      console.log(
        "\u274C \u6CA1\u6709Metaobject\u6A21\u677F"
      );
      return;
    }
    const body = JSON.parse(
      window.lastMetaobjectRequest.body
    );
    body.variables.input.name = definition.name;
    body.variables.input.type = definition.type;
    body.variables.input.fieldDefinitions = definition.fieldDefinitions;
    body.variables.input.displayNameKey = definition.displayNameKey;
    console.log(
      body.variables.input.displayNameKey
    );
    console.log(
      "\u{1F525} \u6700\u7EC8\u53D1\u9001Metaobject:",
      body
    );
    window.isCreating = true;
    const response = await fetch(
      window.lastMetaobjectRequest.url,
      {
        method: "POST",
        headers: window.lastMetaobjectRequest.headers,
        body: JSON.stringify(body)
      }
    );
    window.isCreating = false;
    console.log(
      "\u{1F525} HTTP\u72B6\u6001:",
      response.status
    );
    const result = await response.text();
    console.log(
      "\u{1F525} Shopify\u8FD4\u56DE:",
      result
    );
  }
  var init_create_metaobject = __esm({
    "src/modules/create-metaobject.js"() {
    }
  });

  // src/modules/create-metafield.js
  async function createMetafieldDefinition(definition) {
    console.log(
      "\u{1F525} \u51C6\u5907\u521B\u5EFA:",
      definition
    );
    if (!window.lastMetafieldRequest) {
      console.log(
        "\u274C \u6CA1\u6709Metafield\u6A21\u677F"
      );
      return;
    }
    const body = JSON.parse(
      window.lastMetafieldRequest.body
    );
    const input = {
      ownerType: "PRODUCT",
      namespace: definition.namespace,
      key: definition.key,
      name: definition.name,
      type: definition.type,
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
    if (definition.type === "metaobject_reference") {
      input.validations = [
        {
          name: "metaobject_definition_id",
          value: definition.reference
        }
      ];
    }
    body.variables.input = input;
    console.log(
      "\u{1F525} \u6700\u7EC8\u53D1\u9001Metafield:",
      body
    );
    window.isCreating = true;
    const response = await fetch(
      window.lastMetafieldRequest.url,
      {
        method: "POST",
        headers: window.lastMetafieldRequest.headers,
        body: JSON.stringify(body)
      }
    );
    window.isCreating = false;
    console.log(
      "\u{1F525} HTTP\u72B6\u6001:",
      response.status
    );
    const result = await response.text();
    console.log(
      "\u{1F525} Shopify\u8FD4\u56DE:",
      result
    );
  }
  var init_create_metafield = __esm({
    "src/modules/create-metafield.js"() {
    }
  });

  // src/modules/create-metaobject-entry.js
  async function createMetaobjectEntries(entries) {
    window.manufacturerMap = {};
    const manufacturerMap = window.manufacturerMap;
    for (const entry of entries) {
      if (!window.lastMetaobjectEntryRequest) {
        console.log(
          "\u274C \u6CA1\u6709Metaobject Entry\u6A21\u677F"
        );
        return;
      }
      const body = JSON.parse(window.lastMetaobjectEntryRequest.body);
      console.log(JSON.stringify(body, null, 2));
      console.log(body.variables.input);
      body.variables.input.type = entry.type;
      body.variables.input.handle = entry.handle;
      body.variables.input.fields = Object.entries(entry.fields).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      console.log(
        "\u{1F525} \u521B\u5EFAMetaobject Entry:",
        body
      );
      const response = await fetch(
        window.lastMetaobjectEntryRequest.url,
        {
          method: "POST",
          headers: window.lastMetaobjectEntryRequest.headers,
          body: JSON.stringify(body)
        }
      );
      const result = await response.json();
      console.log(
        "\u{1F525} Metaobject\u521B\u5EFA\u7ED3\u679C:",
        result
      );
      if (result.data?.metaobjectCreate?.metaobject) {
        const id = result.data.metaobjectCreate.metaobject.id;
        manufacturerMap[entry.fields.manufacturer_name] = id;
        console.log(
          "\u2705 Metaobject ID:",
          id
        );
      }
    }
    console.log(
      "\u{1F4E6} Manufacturer Map:",
      manufacturerMap
    );
    exportManufacturerMap2();
  }
  function exportManufacturerMap2() {
    console.count("exportManufacturerMap");
    if (!window.manufacturerMap || Object.keys(window.manufacturerMap).length === 0) {
      alert("\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684 Manufacturer Map");
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
    console.log("\u2705 manufacturer-map.json \u5DF2\u5BFC\u51FA");
  }
  var init_create_metaobject_entry = __esm({
    "src/modules/create-metaobject-entry.js"() {
    }
  });

  // src/modules/product-search.js
  async function findProductIdBySku(sku) {
    console.log(
      "\u{1F50D} \u5F00\u59CB\u641C\u7D22SKU:",
      sku
    );
    const requestContext = window.shopifyRequest;
    if (!requestContext?.url || !requestContext?.headers) {
      console.log(
        "\u274C \u6CA1\u6709\u53EF\u7528 Shopify \u8BF7\u6C42\u73AF\u5883"
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
      operationName: "ProductSearch",
      variables: {
        query: (
          // The SKU is a variant attribute. Querying productVariants avoids
          // missing products whose SKU only exists on a variant.
          `sku:'${String(sku).replace(/'/g, "\\'")}'`
        )
      },
      query
    };
    const response = await fetch(
      requestContext.url,
      {
        method: "POST",
        // SKU search does not depend on a Metafield-definition request.
        // Reuse the common Admin GraphQL request captured by the interceptor.
        headers: requestContext.headers,
        body: JSON.stringify(body)
      }
    );
    const json = await response.json();
    console.log(
      "\u{1F525} Product Search \u8FD4\u56DE:",
      json
    );
    if (json.errors?.length) {
      console.error(
        "\u274C Product Search GraphQL errors:",
        json.errors
      );
      return null;
    }
    const variant = json.data?.productVariants?.nodes?.[0];
    const product = variant?.product;
    if (!product) {
      console.log(
        "\u274C \u672A\u627E\u5230:",
        sku
      );
      return null;
    }
    console.log(
      "\u2705 \u627E\u5230:",
      product.id,
      product.title
    );
    return product.id;
  }
  var init_product_search = __esm({
    "src/modules/product-search.js"() {
    }
  });

  // src/modules/set-product-metafields.js
  async function setProductMetafields(products) {
    console.log("======================================");
    console.log("\u{1F680} \u5F00\u59CB\u6267\u884C Product Metafields");
    console.log("======================================");
    console.log("\u6536\u5230\u7684\u6570\u636E\uFF1A", products);
    if (!Array.isArray(products)) {
      console.error("\u274C payload \u4E0D\u662F\u6570\u7EC4");
      return;
    }
    console.log(`\u5171 ${products.length} \u4E2A Product`);
    for (const product of products) {
      console.log("--------------------------------------");
      console.log("SKU:", product.sku);
      console.log("Model:", product.model_number);
      console.log("Manufacturer:", product.manufacturer);
      const productId = await findProductIdBySku(
        product.sku
      );
      console.log("Product ID:", productId);
    }
    console.log("======================================");
    console.log("\u2705 Product \u6570\u636E\u8BFB\u53D6\u5B8C\u6210");
    console.log("======================================");
  }
  var init_set_product_metafields = __esm({
    "src/modules/set-product-metafields.js"() {
      init_product_search();
    }
  });

  // src/modules/message-handler.js
  function initMessageHandler() {
    window.addEventListener(
      "message",
      async (event) => {
        if (event.source !== window) {
          return;
        }
        if (event.data.type === "CREATE_METAOBJECT") {
          console.log(
            "\u{1F525} \u6536\u5230Metaobject\u521B\u5EFA\u4EFB\u52A1:",
            event.data
          );
          const metaobjects = event.data.payload;
          for (const item of metaobjects) {
            await createMetaobjectDefinition(
              item
            );
          }
        }
        if (event.data.type === "CREATE_METAFIELD") {
          console.log(
            "\u{1F525} \u6536\u5230Metafield\u521B\u5EFA\u4EFB\u52A1:",
            event.data
          );
          const metafields = event.data.payload;
          for (const item of metafields) {
            await createMetafieldDefinition(
              item
            );
          }
        }
        if (event.data.type === "CREATE_METAOBJECT_ENTRY") {
          createMetaobjectEntries(
            event.data.payload
          );
        }
        if (event.data.type === "EXPORT_MANUFACTURER_MAP") {
          console.log("\u6536\u5230 EXPORT_MANUFACTURER_MAP");
          exportManufacturerMap();
        }
        if (event.data.type === "SET_PRODUCT_METAFIELDS") {
          console.log(
            "\u{1F525} \u6536\u5230 Product Metafields \u4EFB\u52A1:",
            event.data
          );
          await setProductMetafields(
            event.data.payload
          );
        }
      }
    );
  }
  var init_message_handler = __esm({
    "src/modules/message-handler.js"() {
      init_create_metaobject();
      init_create_metafield();
      init_create_metaobject_entry();
      init_set_product_metafields();
    }
  });

  // src/page-inject.js
  var require_page_inject = __commonJS({
    "src/page-inject.js"() {
      init_fetch_interceptor();
      init_message_handler();
      console.log("\u{1F525} page-inject loaded");
      window.lastMetaobjectRequest = null;
      window.lastMetaobjectEntryRequest = null;
      window.lastMetafieldRequest = null;
      window.isCreating = false;
      initFetchInterceptor();
      initMessageHandler();
    }
  });
  require_page_inject();
})();
