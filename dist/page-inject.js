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
      if (typeof url !== "string") {
        return;
      }
      if (url.includes("/api/operations/") && operationName) {
        window.shopifyRequest = {
          url,
          headers: options.headers
        };
        if (operationName === "SetTheseMetafields") {
          window.lastProductMetafieldRequest = {
            url,
            headers: options.headers,
            body: options.body
          };
          sessionStorage.setItem(
            "shopifyProductMetafieldTemplate",
            JSON.stringify(window.lastProductMetafieldRequest)
          );
          console.log("\u{1F525} \u6355\u83B7 Product Metafield \u66F4\u65B0\u6A21\u677F:", window.lastProductMetafieldRequest);
        }
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
  async function loadManufacturerMap() {
    try {
      const cached = JSON.parse(
        sessionStorage.getItem("shopifyManufacturerMap") || "null"
      );
      if (cached?.manufacturerMap) {
        window.shopifyManufacturerMap = cached.manufacturerMap;
      }
    } catch {
    }
    const started = Date.now();
    while (!window.shopifyManufacturerMap && Date.now() - started < 5e3) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!window.shopifyManufacturerMap) {
      throw new Error("Manufacturer Map \u5C1A\u672A\u52A0\u8F7D");
    }
    return window.shopifyManufacturerMap;
  }
  async function writeProductMetafields(product, productId) {
    const rawTemplate = sessionStorage.getItem(
      "shopifyProductMetafieldTemplate"
    );
    if (!rawTemplate) {
      console.warn("\u26A0\uFE0F \u6CA1\u6709 SetTheseMetafields \u6A21\u677F\uFF0C\u8DF3\u8FC7\u5B57\u6BB5\u5199\u5165");
      return false;
    }
    const template = JSON.parse(rawTemplate);
    const manufacturerMap = await loadManufacturerMap();
    const manufacturerId = manufacturerMap[product.manufacturer];
    if (!manufacturerId) {
      throw new Error(`\u627E\u4E0D\u5230 Manufacturer \u6620\u5C04: ${product.manufacturer}`);
    }
    const body = JSON.parse(template.body);
    body.variables.metafields = [
      {
        namespace: "custom",
        key: "model_number",
        value: String(product.model_number ?? ""),
        type: "single_line_text_field",
        ownerId: `gid://shopify/Product/${productId}`
      },
      {
        namespace: "custom",
        key: "compliance_manufacturer",
        value: manufacturerId,
        type: "metaobject_reference",
        ownerId: `gid://shopify/Product/${productId}`
      }
    ];
    console.log("\u{1F4DD} \u5199\u5165 Product Metafields:", body.variables.metafields);
    window.isCreating = true;
    try {
      const response = await fetch(template.url, {
        method: "POST",
        headers: template.headers,
        body: JSON.stringify(body)
      });
      const result = await response.json();
      console.log("\u2705 Product Metafields \u5199\u5165\u8FD4\u56DE:", result);
      const userErrors = Object.values(result.data || {}).flatMap((value) => Array.isArray(value?.userErrors) ? value.userErrors : []);
      if (result.errors?.length || userErrors.length) {
        console.error("\u274C Shopify metafield userErrors:", userErrors, result.errors);
        return false;
      }
      return response.ok;
    } finally {
      window.isCreating = false;
    }
  }
  function readJob() {
    try {
      return JSON.parse(sessionStorage.getItem(JOB_KEY) || "null");
    } catch {
      return null;
    }
  }
  function writeJob(job) {
    sessionStorage.setItem(JOB_KEY, JSON.stringify(job));
  }
  function clearJob() {
    sessionStorage.removeItem(JOB_KEY);
  }
  function getProductsUrl() {
    const url = new URL(location.href);
    const store = url.pathname.match(/^\/store\/([^/]+)/)?.[1];
    if (!store) return null;
    url.pathname = `/store/${store}/products`;
    return url;
  }
  function getDetailProductId() {
    return location.pathname.match(
      /^\/store\/[^/]+\/products\/(\d+)(?:\/|$)/
    )?.[1] || null;
  }
  function getSearchProductLinks() {
    return [...document.querySelectorAll("a[href]")].filter((a) => {
      try {
        const path = new URL(a.href, location.href).pathname;
        return /^\/store\/[^/]+\/products\/\d+$/.test(path);
      } catch {
        return false;
      }
    });
  }
  function getCurrentProductHrefs() {
    return new Set([...document.querySelectorAll("a[href]")].map((a) => {
      try {
        const path = new URL(a.href, location.href).pathname;
        return /^\/store\/[^/]+\/products\/\d+$/.test(path) ? a.href : null;
      } catch {
        return null;
      }
    }).filter(Boolean));
  }
  function navigateToSku(sku) {
    const url = getProductsUrl();
    if (!url) throw new Error("\u5F53\u524D\u9875\u9762\u4E0D\u662F Shopify Admin \u5E97\u94FA\u9875\u9762");
    url.searchParams.set("query", String(sku).trim());
    url.searchParams.set("_complianceJob", String(Date.now()));
    location.assign(url.href);
  }
  function startProductSearchJob(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    const job = {
      products,
      index: 0,
      phase: "search",
      results: {},
      previousProductHrefs: [...getCurrentProductHrefs()],
      startedAt: Date.now()
    };
    writeJob(job);
    navigateToSku(products[0].sku);
  }
  function pauseProductSearchJob() {
    const job = readJob();
    if (job) {
      job.phase = "paused";
      writeJob(job);
      console.log("\u23F8\uFE0F SKU \u641C\u7D22\u4EFB\u52A1\u5DF2\u6682\u505C");
    }
  }
  async function waitForProductLink(sku, previousProductHrefs = []) {
    const started = Date.now();
    console.log("\u{1F50E} \u7B49\u5F85\u641C\u7D22\u7ED3\u679C:", sku);
    const previous = new Set(previousProductHrefs);
    while (Date.now() - started < SEARCH_TIMEOUT_MS) {
      const link = getSearchProductLinks().find((candidate) => !previous.has(candidate.href));
      if (link) return link;
      await new Promise((resolve) => setTimeout(resolve, SEARCH_WAIT_MS));
    }
    console.warn("\u274C \u641C\u7D22\u8D85\u65F6\uFF0C\u672A\u627E\u5230 SKU:", sku);
    return null;
  }
  async function continueJob(job) {
    const nextIndex = job.index + 1;
    if (nextIndex >= job.products.length) {
      console.log("\u2705 \u6240\u6709 SKU \u5904\u7406\u5B8C\u6210:", job.results);
      clearJob();
      return;
    }
    job.index = nextIndex;
    job.phase = "search";
    job.previousProductHrefs = [...getCurrentProductHrefs()];
    writeJob(job);
    await new Promise((resolve) => setTimeout(resolve, NEXT_PRODUCT_DELAY_MS));
    navigateToSku(job.products[nextIndex].sku);
  }
  async function resumeProductSearchJob() {
    if (resumeRunning) return;
    resumeRunning = true;
    try {
      await resumeProductSearchJobInternal();
    } finally {
      resumeRunning = false;
    }
  }
  async function resumeProductSearchJobInternal() {
    const job = readJob();
    if (!job?.products?.length) return;
    const product = job.products[job.index];
    const sku = String(product?.sku ?? "").trim();
    if (!sku) {
      job.results[`row-${job.index}`] = { status: "failed", reason: "empty SKU" };
      await continueJob(job);
      return;
    }
    const detailId = getDetailProductId();
    if (detailId && job.phase === "detail") {
      job.results[sku] = { status: "success", productId: detailId };
      console.log("\u2705 SKU -> Product ID:", sku, detailId);
      try {
        const written = await writeProductMetafields(product, detailId);
        job.results[sku].metafields = written ? "success" : "skipped";
      } catch (error) {
        job.results[sku].metafields = "failed";
        job.results[sku].error = error.message;
        console.error("\u274C Product Metafields \u5199\u5165\u5931\u8D25:", error);
      }
      writeJob(job);
      await continueJob(job);
      return;
    }
    if (!getProductsUrl() || job.phase !== "search") return;
    if (new URL(location.href).searchParams.get("query") !== sku) {
      navigateToSku(sku);
      return;
    }
    const link = await waitForProductLink(sku, []);
    if (!link) {
      job.results[sku] = { status: "failed", reason: "not found" };
      await continueJob(job);
      return;
    }
    job.phase = "detail";
    writeJob(job);
    console.log("\u{1F517} \u70B9\u51FB\u5546\u54C1:", link.href);
    link.click();
  }
  var JOB_KEY, SEARCH_WAIT_MS, NEXT_PRODUCT_DELAY_MS, SEARCH_TIMEOUT_MS, resumeRunning;
  var init_product_search = __esm({
    "src/modules/product-search.js"() {
      JOB_KEY = "shopifyComplianceProductJob";
      SEARCH_WAIT_MS = 1200;
      NEXT_PRODUCT_DELAY_MS = 1800;
      SEARCH_TIMEOUT_MS = 15e3;
      resumeRunning = false;
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
    console.log("\u23F3 \u542F\u52A8\u4E32\u884C SKU \u641C\u7D22\u961F\u5217\uFF0C\u4EA7\u54C1\u4E4B\u95F4\u95F4\u9694 1.8 \u79D2");
    startProductSearchJob(products);
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
      init_product_search();
      console.log("\u{1F525} page-inject loaded");
      window.lastMetaobjectRequest = null;
      window.lastMetaobjectEntryRequest = null;
      window.lastMetafieldRequest = null;
      window.lastProductMetafieldRequest = null;
      window.isCreating = false;
      try {
        window.shopifyManufacturerMap = JSON.parse(
          sessionStorage.getItem("shopifyManufacturerMap") || "null"
        )?.manufacturerMap || null;
      } catch {
        window.shopifyManufacturerMap = null;
      }
      window.addEventListener("message", (event) => {
        if (event.source === window && event.data?.type === "SHOPIFY_MANUFACTURER_MAP") {
          window.shopifyManufacturerMap = event.data.manufacturerMap;
          console.log("\u2705 Manufacturer Map \u5DF2\u52A0\u8F7D:", event.data.locale);
        }
      });
      initFetchInterceptor();
      initMessageHandler();
      var navigationEntry = performance.getEntriesByType("navigation")[0];
      if (navigationEntry?.type === "reload") {
        pauseProductSearchJob();
      } else {
        resumeProductSearchJob().catch((error) => {
          console.error("\u274C \u6062\u590D SKU \u641C\u7D22\u4EFB\u52A1\u5931\u8D25:", error);
        });
      }
      var lastObservedUrl = location.href;
      setInterval(() => {
        if (location.href !== lastObservedUrl) {
          lastObservedUrl = location.href;
          resumeProductSearchJob().catch((error) => {
            console.error("\u274C \u8DEF\u7531\u53D8\u5316\u540E\u6062\u590D SKU \u4EFB\u52A1\u5931\u8D25:", error);
          });
        }
      }, 500);
    }
  });
  require_page_inject();
})();
