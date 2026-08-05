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
  function getStoreId() {
    return location.pathname.match(/^\/store\/([^/]+)/)?.[1] || "unknown-store";
  }
  function getCompletedKey() {
    return `${COMPLETED_KEY_PREFIX}:${getStoreId()}`;
  }
  function readCompletedProducts() {
    try {
      return JSON.parse(localStorage.getItem(getCompletedKey()) || "{}");
    } catch {
      return {};
    }
  }
  function getProductFingerprint(product) {
    return JSON.stringify({
      sku: String(product.sku ?? ""),
      model_number: String(product.model_number ?? ""),
      manufacturer: String(product.manufacturer ?? ""),
      compliance_profile: String(product.compliance_profile ?? ""),
      safety_warning_text: String(product.safety_warning_text ?? ""),
      // This version marker makes previously completed lawn-mower rows run once
      // more after switching them from image warnings to profile text warnings.
      safety_warning_mode: product.compliance_profile === "lawn-mower" ? "profile-text" : void 0
    });
  }
  function markProductCompleted(product, result) {
    const completed = readCompletedProducts();
    completed[getProductFingerprint(product)] = {
      completedAt: Date.now(),
      sku: product.sku,
      model_number: product.model_number,
      result
    };
    localStorage.setItem(getCompletedKey(), JSON.stringify(completed));
  }
  function resetCompletedProducts() {
    localStorage.removeItem(getCompletedKey());
    window.postMessage({
      type: "PRODUCT_JOB_STATUS",
      payload: { state: "reset", total: 0, current: 0, processed: 0, skipped: 0, failed: 0 }
    }, "*");
  }
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
  async function loadComplianceProfileMap() {
    try {
      const cached = JSON.parse(
        sessionStorage.getItem("shopifyComplianceProfileMap") || "null"
      );
      if (cached?.complianceProfileMap) {
        window.shopifyComplianceProfileMap = cached.complianceProfileMap;
      }
    } catch {
    }
    const started = Date.now();
    while (!window.shopifyComplianceProfileMap && Date.now() - started < 5e3) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!window.shopifyComplianceProfileMap) {
      throw new Error("Compliance Profile Map \u5C1A\u672A\u52A0\u8F7D");
    }
    return window.shopifyComplianceProfileMap;
  }
  async function loadSafetyTextMap() {
    try {
      const cached = JSON.parse(
        sessionStorage.getItem("shopifySafetyTextMap") || "null"
      );
      if (cached?.safetyTextMap) {
        window.shopifySafetyTextMap = cached.safetyTextMap;
      }
    } catch {
    }
    const started = Date.now();
    while (!window.shopifySafetyTextMap && Date.now() - started < 5e3) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!window.shopifySafetyTextMap) {
      throw new Error("Safety Text Map \u5C1A\u672A\u52A0\u8F7D");
    }
    return window.shopifySafetyTextMap;
  }
  async function writeProductMetafields(product, productId) {
    const rawTemplate = sessionStorage.getItem(
      "shopifyProductMetafieldTemplate"
    );
    if (!rawTemplate) {
      console.warn("\u26A0\uFE0F \u6CA1\u6709 SetTheseMetafields \u6A21\u677F\uFF0C\u8DF3\u8FC7\u5B57\u6BB5\u5199\u5165");
      return { ok: false, imageIds: [], imageNames: [] };
    }
    const template = JSON.parse(rawTemplate);
    const manufacturerMap = await loadManufacturerMap();
    const manufacturerId = manufacturerMap[product.manufacturer];
    if (!manufacturerId) {
      throw new Error(`\u627E\u4E0D\u5230 Manufacturer \u6620\u5C04: ${product.manufacturer}`);
    }
    let complianceProfileId = null;
    if (product.compliance_profile) {
      const complianceProfileMap = await loadComplianceProfileMap();
      complianceProfileId = complianceProfileMap[product.compliance_profile];
      if (!complianceProfileId) {
        throw new Error(`\u627E\u4E0D\u5230 Compliance Profile \u6620\u5C04: ${product.compliance_profile}`);
      }
    }
    let safetyWarningText = null;
    if (product.safety_warning_text) {
      const safetyTextMap = await loadSafetyTextMap();
      safetyWarningText = safetyTextMap[product.safety_warning_text];
      if (!safetyWarningText) {
        throw new Error(`\u627E\u4E0D\u5230 Safety Warning Text \u6620\u5C04: ${product.safety_warning_text}`);
      }
    }
    const usesSafetyWarningText = Boolean(
      safetyWarningText || product.compliance_profile === "lawn-mower"
    );
    const image = usesSafetyWarningText ? { ids: [], names: [] } : await findImageGidsByModel(product.image_search_term || product.model_number);
    const imageIds = image.ids;
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
    if (complianceProfileId) {
      body.variables.metafields.push({
        namespace: "custom",
        key: "compliance_profile",
        value: complianceProfileId,
        type: "metaobject_reference",
        ownerId: `gid://shopify/Product/${productId}`
      });
    }
    if (safetyWarningText) {
      body.variables.metafields.push({
        namespace: "custom",
        key: "safety_warning_text",
        value: safetyWarningText,
        type: "multi_line_text_field",
        ownerId: `gid://shopify/Product/${productId}`
      });
    }
    if (imageIds.length) {
      body.variables.metafields.push({
        namespace: "custom",
        key: "safety_warning_image",
        value: JSON.stringify(imageIds),
        type: "list.file_reference",
        ownerId: `gid://shopify/Product/${productId}`
      });
    }
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
        console.error(
          "\u274C Shopify metafield userErrors:",
          JSON.stringify(userErrors, null, 2),
          JSON.stringify(result.errors || [], null, 2)
        );
        return { ok: false, imageIds, imageNames: image.names };
      }
      return { ok: response.ok, imageIds, imageNames: image.names };
    } finally {
      window.isCreating = false;
    }
  }
  async function setInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    setter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      const currentValue = value.slice(0, i + 1);
      setter?.call(input, currentValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  }
  async function waitForElement(selector, timeout = 15e3) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return null;
  }
  async function findImageGidsByModel(modelNumber) {
    const model = String(modelNumber ?? "").trim();
    if (!model) return { ids: [], names: [] };
    const closeExistingPicker = async () => {
      const doneBtn = [...document.querySelectorAll("button, [role='button'], s-button")].find((button) => /^done$/i.test((button.innerText || button.textContent || "").trim()));
      if (doneBtn) {
        doneBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const cancelBtn = [...document.querySelectorAll("button, [role='button'], s-button")].find((button) => /^(cancel|×|close)$/i.test((button.innerText || button.textContent || "").trim()));
      if (cancelBtn) {
        cancelBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };
    await closeExistingPicker();
    let pickerInput = document.querySelector('input[placeholder="Search files"]');
    if (pickerInput) {
      await setInputValue(pickerInput, "");
      await new Promise((resolve) => setTimeout(resolve, 500));
      pickerInput = null;
      await closeExistingPicker();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!pickerInput) {
      const editControl = await waitForElement(
        '[role="button"][aria-label="Edit Safety Warning Image metafield"]',
        15e3
      );
      console.log("\u{1F5BC}\uFE0F Safety Warning Image \u7F16\u8F91\u63A7\u4EF6:", Boolean(editControl));
      if (editControl) {
        editControl.click();
      }
      const label = [...document.querySelectorAll("*")].find(
        (element) => element.children.length === 0 && /^Safety Warning Image$/i.test(element.textContent?.trim() || "")
      );
      let fieldContainer = label;
      let readWrappers = [];
      for (let level = 0; level < 8 && fieldContainer; level += 1) {
        readWrappers = [...fieldContainer.querySelectorAll("div[class*='ReadWrapper']")].filter((element) => element.getBoundingClientRect().width > 0);
        if (readWrappers.length) break;
        fieldContainer = fieldContainer.parentElement;
      }
      if (!editControl) readWrappers[0]?.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const internalButton = [...document.querySelectorAll("s-internal-button")].find((element) => /select (file|images)/i.test(
        element.shadowRoot?.querySelector("button")?.textContent || ""
      ));
      let selectButton = internalButton?.shadowRoot?.querySelector("button") || [...document.querySelectorAll(
        "button, [role='button'], s-button"
      )].find((button) => /select (file|images)/i.test(
        button.innerText || button.textContent || ""
      )) || [...document.querySelectorAll("*")].find(
        (element) => element.children.length === 0 && /^select (file|images)$/i.test(element.textContent?.trim() || "")
      );
      if (!selectButton) {
        for (const wrapper of readWrappers.slice(1)) {
          wrapper.click();
          await new Promise((resolve) => setTimeout(resolve, 250));
          const button = [...document.querySelectorAll("s-internal-button")].find((element) => /select (file|images)/i.test(
            element.shadowRoot?.querySelector("button")?.textContent || ""
          ));
          if (button) {
            selectButton = button.shadowRoot.querySelector("button");
            break;
          }
        }
      }
      console.log("\u{1F5BC}\uFE0F Select images \u6309\u94AE:", Boolean(selectButton));
      selectButton?.click();
      pickerInput = await waitForElement('input[placeholder="Search files"]');
    }
    if (!pickerInput) {
      console.warn("\u26A0\uFE0F \u627E\u4E0D\u5230\u56FE\u7247\u9009\u62E9\u5668:", model);
      return { ids: [], names: [] };
    }
    await setInputValue(pickerInput, "");
    await new Promise((resolve) => setTimeout(resolve, 300));
    await setInputValue(pickerInput, model);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const NORMALIZE_PATTERN = /[\(\)\[\]\/\\\s]+/g;
    const normalizedModel = model.replace(NORMALIZE_PATTERN, "_").replace(/__+/g, "_").replace(/^_|_$/g, "");
    const escapedNormalized = normalizedModel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const numberedPattern = new RegExp(`^${escapedNormalized}[-_](\\d+)$`, "i");
    const exactPattern = new RegExp(`^${escapedNormalized}$`, "i");
    const loosePattern = new RegExp(escapedNormalized, "i");
    function normalizeForMatch(str) {
      return str.replace(NORMALIZE_PATTERN, "_").replace(/__+/g, "_").replace(/^_|_$/g, "");
    }
    function getCleanFilename(src) {
      const filename = decodeURIComponent(src || "").split("/").pop()?.split("?")[0] || "";
      return filename.replace(/_\d+x\d+\.(png|jpe?g|webp)$/i, "").replace(/_\d+x\.(png|jpe?g|webp)$/i, "").replace(/\.(png|jpe?g|webp)$/i, "");
    }
    function matchImage(img) {
      const alt = (img.alt || "").trim();
      const cleanFile = getCleanFilename(img.src);
      const normAlt = normalizeForMatch(alt);
      const normFile = normalizeForMatch(cleanFile);
      if (!normAlt && !normFile) return false;
      if (numberedPattern.test(normAlt)) return { match: "numbered", score: 3 };
      if (exactPattern.test(normAlt)) return { match: "exact", score: 2 };
      if (numberedPattern.test(normFile)) return { match: "numbered-file", score: 3 };
      if (exactPattern.test(normFile)) return { match: "exact-file", score: 2 };
      if (normAlt && loosePattern.test(normAlt)) return { match: "loose-alt", score: 1 };
      if (normFile && loosePattern.test(normFile)) return { match: "loose-file", score: 1 };
      return false;
    }
    function findCheckboxForImage(img) {
      let container = img;
      for (let i = 0; i < 10 && container; i++) {
        container = container.parentElement;
        if (!container) break;
        const checkbox = container.querySelector(
          "s-checkbox[id*='MediaImage'], s-checkbox[id*='media_image'], [data-checkbox-id*='MediaImage']"
        );
        if (checkbox) {
          const id = checkbox.id || checkbox.getAttribute("data-checkbox-id") || "";
          return { checkbox, id: id || null };
        }
      }
      const allCheckboxes = document.querySelectorAll(
        "s-checkbox[id*='MediaImage'], s-checkbox[id*='media_image']"
      );
      for (const cb of allCheckboxes) {
        const cbRect = cb.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        const dx = Math.abs(cbRect.left - imgRect.left);
        const dy = Math.abs(cbRect.top - imgRect.top);
        if (dx < 200 && dy < 200) {
          const id = cb.id || "";
          return { checkbox: cb, id: id || null };
        }
      }
      return null;
    }
    const started = Date.now();
    let lastCandidates = [];
    while (Date.now() - started < 15e3) {
      const allImgs = [...document.querySelectorAll("img")];
      const candidates = [];
      for (const img of allImgs) {
        const result = matchImage(img);
        if (result) {
          candidates.push({ img, result });
        }
      }
      if (Date.now() - started < 3e3) {
        console.log(
          `\u{1F50E} \u56FE\u7247\u641C\u7D22 [${model}] (\u89C4\u8303\u5316: ${normalizedModel}) \u5019\u9009 ${candidates.length}/${allImgs.length}:`,
          candidates.slice(0, 5).map((c) => ({
            match: c.result.match,
            alt: c.img.alt,
            normAlt: normalizeForMatch(c.img.alt || ""),
            file: getCleanFilename(c.img.src),
            normFile: normalizeForMatch(getCleanFilename(c.img.src)),
            score: c.result.score
          }))
        );
      }
      if (candidates.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      const numberedMatches = candidates.filter(
        (c) => c.result.match === "numbered" || c.result.match === "numbered-file"
      );
      const exactMatches = candidates.filter(
        (c) => c.result.match === "exact" || c.result.match === "exact-file"
      );
      const looseMatches = candidates.filter(
        (c) => c.result.match === "loose-alt" || c.result.match === "loose-file"
      );
      let pool;
      let poolSource = "exact";
      if (numberedMatches.length > 0) {
        pool = numberedMatches.sort((a, b) => {
          const aNormAlt = normalizeForMatch(a.img.alt || "");
          const bNormAlt = normalizeForMatch(b.img.alt || "");
          const aNormFile = normalizeForMatch(getCleanFilename(a.img.src));
          const bNormFile = normalizeForMatch(getCleanFilename(b.img.src));
          const aMatch = aNormAlt.match(numberedPattern) || aNormFile.match(numberedPattern);
          const bMatch = bNormAlt.match(numberedPattern) || bNormFile.match(numberedPattern);
          const aNum = aMatch ? Number(aMatch[1]) : 9999;
          const bNum = bMatch ? Number(bMatch[1]) : 9999;
          return aNum - bNum;
        });
        poolSource = "numbered";
        console.log(`\u{1F522} \u4F18\u5148\u4F7F\u7528\u7F16\u53F7\u56FE\u7247: ${pool.length} \u5F20`);
      } else if (exactMatches.length > 0) {
        pool = exactMatches;
        poolSource = "exact";
        console.log(`\u2705 \u4F7F\u7528\u7CBE\u786E\u5339\u914D: ${pool.length} \u5F20`);
      } else {
        pool = looseMatches;
        poolSource = "loose";
        console.log(`\u{1F50D} \u4F7F\u7528\u5305\u542B\u5339\u914D: ${pool.length} \u5F20`);
      }
      const selectedIds = [];
      const selectedImages = [];
      const fallbackClicks = [];
      for (const candidate of pool) {
        const found = findCheckboxForImage(candidate.img);
        if (found) {
          if (found.id) selectedIds.push(found.id);
          selectedImages.push(candidate);
        } else {
          const rect = candidate.img.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            fallbackClicks.push(candidate);
            const alt = candidate.img.alt || "";
            console.log(`\u26A0\uFE0F \u627E\u4E0D\u5230checkbox: ${alt}, \u5C06\u5C1D\u8BD5\u76F4\u63A5\u70B9\u51FB\u56FE\u7247`);
          }
        }
      }
      if (selectedIds.length === 0 && selectedImages.length === 0 && fallbackClicks.length === 0 && poolSource !== "loose" && looseMatches.length > 0) {
        console.log(`\u{1F504} \u7CBE\u786E/\u7F16\u53F7\u5339\u914D\u5168\u90E8\u65E0checkbox\uFF0C\u56DE\u9000\u5230\u5305\u542B\u5339\u914D (${looseMatches.length} \u5F20)`);
        pool = looseMatches;
        for (const candidate of pool) {
          const found = findCheckboxForImage(candidate.img);
          if (found) {
            if (found.id) selectedIds.push(found.id);
            selectedImages.push(candidate);
          } else {
            const rect = candidate.img.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              fallbackClicks.push(candidate);
            }
          }
        }
      }
      if (selectedImages.length > 0 || fallbackClicks.length > 0) {
        selectedImages.forEach((c) => {
          const found = findCheckboxForImage(c.img);
          if (!found) return;
          const { checkbox } = found;
          const target = checkbox.shadowRoot?.querySelector("input, button") || checkbox;
          target.click?.();
          target.dispatchEvent?.(new MouseEvent("click", {
            bubbles: true,
            composed: true,
            cancelable: true
          }));
        });
        fallbackClicks.forEach((c) => {
          c.img.click?.();
          c.img.dispatchEvent?.(new MouseEvent("click", {
            bubbles: true,
            composed: true,
            cancelable: true
          }));
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        const done = [...document.querySelectorAll("button, [role='button'], s-button")].find((button) => /^done$/i.test((button.innerText || button.textContent || "").trim()));
        if (done) {
          done.click();
        } else {
          const doneAlternative = [...document.querySelectorAll("button, [role='button'], s-button")].find((button) => /^(done|select)$/i.test((button.innerText || button.textContent || "").trim()));
          doneAlternative?.click();
        }
        const imageNames = selectedImages.map((c) => {
          if (c.img.alt?.trim()) return c.img.alt.trim();
          return getCleanFilename(c.img.src) || "unknown";
        });
        fallbackClicks.forEach((c) => {
          if (c.img.alt?.trim()) imageNames.push(c.img.alt.trim());
          else imageNames.push(getCleanFilename(c.img.src) || "unknown");
        });
        console.log(`\u{1F5BC}\uFE0F \u627E\u5230\u56FE\u7247: ${model} (${selectedIds.length + fallbackClicks.length}\u5F20)`, imageNames);
        return {
          ids: [...new Set(selectedIds)],
          names: [...new Set(imageNames)]
        };
      }
      lastCandidates = candidates;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    console.warn(`\u26A0\uFE0F \u627E\u4E0D\u5230\u56FE\u7247: ${model} (\u626B\u63CF\u4E86 ${lastCandidates.length} \u4E2A\u5019\u9009)`);
    if (lastCandidates.length > 0) {
      console.warn(`\u5019\u9009\u8BE6\u60C5:`, lastCandidates.map((c) => ({
        match: c.result.match,
        score: c.result.score,
        alt: c.img.alt,
        normAlt: normalizeForMatch(c.img.alt || ""),
        file: getCleanFilename(c.img.src),
        normFile: normalizeForMatch(getCleanFilename(c.img.src)),
        rect: (() => {
          const r = c.img.getBoundingClientRect();
          return `${r.width}x${r.height}`;
        })()
      })));
    }
    return { ids: [], names: [] };
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
    publishJobStatus(job);
  }
  function clearJob() {
    sessionStorage.removeItem(JOB_KEY);
  }
  function publishJobStatus(job, stateOverride) {
    if (!job) return;
    const total = job.originalTotal || job.products?.length || 0;
    const skipped = job.skipped || 0;
    const current = Math.min(skipped + (job.index || 0) + 1, total);
    const processed = job.phase === "complete" ? total : Math.min(skipped + (job.index || 0), total);
    const failed = Object.values(job.results || {}).filter((result) => result.metafields === "failed").length;
    const skuNotFound = Object.values(job.results || {}).filter((result) => result.productStatus === "SKU\u672A\u627E\u5230").length;
    window.postMessage({
      type: "PRODUCT_JOB_STATUS",
      payload: {
        state: stateOverride || job.phase || "search",
        total,
        current,
        processed,
        skipped,
        failed,
        skuNotFound,
        sku: job.products?.[job.index]?.sku || null,
        startedAt: job.startedAt || null,
        results: job.results || {}
      }
    }, "*");
  }
  function getProductSearchJobStatus() {
    const job = readJob();
    if (!job) return null;
    const total = job.originalTotal || job.products?.length || 0;
    const skipped = job.skipped || 0;
    return {
      state: job.phase || "search",
      total,
      current: Math.min(skipped + (job.index || 0) + 1, total),
      processed: Math.min(skipped + (job.index || 0), total),
      skipped,
      failed: Object.values(job.results || {}).filter((result) => result.metafields === "failed").length,
      skuNotFound: Object.values(job.results || {}).filter((result) => result.productStatus === "SKU\u672A\u627E\u5230").length,
      sku: job.products?.[job.index]?.sku || null,
      startedAt: job.startedAt || null,
      results: job.results || {}
    };
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
  function getSearchProductResults() {
    const rows = [...document.querySelectorAll("[role='row']")];
    if (!rows.length) {
      return getSearchProductLinks().map((link) => ({
        link,
        href: link.href,
        status: null,
        productType: null
      }));
    }
    const results = [];
    for (const row of rows) {
      const cells = [...row.querySelectorAll("[role='cell']")];
      if (cells.length < 3) continue;
      const productCell = cells[2];
      if (!productCell) continue;
      const link = productCell.querySelector("a[href]");
      if (!link) continue;
      try {
        const path = new URL(link.href, location.href).pathname;
        if (!/^\/store\/[^/]+\/products\/\d+$/.test(path)) continue;
      } catch {
        continue;
      }
      const statusCell = cells[3];
      const productTypeCell = cells[8];
      const statusText = statusCell?.innerText?.trim() || "";
      const productTypeText = productTypeCell?.innerText?.trim() || "";
      results.push({
        link,
        href: link.href,
        status: statusText.toLowerCase(),
        productType: productTypeText.toLowerCase()
      });
    }
    if (!results.length) {
      return getSearchProductLinks().map((link) => ({
        link,
        href: link.href,
        status: null,
        productType: null
      }));
    }
    return results;
  }
  function getSkuOccurrenceIndex(products, currentIndex) {
    const sku = String(products[currentIndex]?.sku ?? "").trim();
    if (!sku) return 0;
    let count = 0;
    for (let i = 0; i <= currentIndex; i++) {
      if (String(products[i]?.sku ?? "").trim() === sku) count++;
    }
    return count - 1;
  }
  function selectBestProduct(results, previousHrefs = [], occurrenceIndex = 0) {
    const previous = new Set(previousHrefs);
    const candidates = results.filter((r) => !previous.has(r.href));
    if (!candidates.length) return null;
    const pickIndex = (arr) => Math.min(occurrenceIndex, arr.length - 1);
    const AMAZON_PATTERN = /amazon/i;
    const NON_AMAZON = candidates.filter(
      (r) => !r.productType || !AMAZON_PATTERN.test(r.productType)
    );
    if (NON_AMAZON.length === 0) {
      console.warn("\u26A0\uFE0F \u6240\u6709\u641C\u7D22\u7ED3\u679C\u90FD\u5305\u542B amazon\uFF0C\u8DF3\u8FC7\u8FC7\u6EE4");
      return candidates[pickIndex(candidates)];
    }
    if (NON_AMAZON.length === 1) {
      console.log("\u2705 \u627E\u5230\u552F\u4E00\u975E amazon \u4EA7\u54C1");
      return NON_AMAZON[0];
    }
    const ACTIVE = NON_AMAZON.filter(
      (r) => r.status === "active" || r.status === "in stock"
    );
    if (ACTIVE.length > 0) {
      console.log(`\u2705 \u4F18\u5148\u9009\u62E9 ${ACTIVE.length} \u4E2A active \u4EA7\u54C1 (\u5E8F\u53F7${occurrenceIndex})`);
      return ACTIVE[pickIndex(ACTIVE)];
    }
    const DRAFT = NON_AMAZON.filter(
      (r) => r.status === "draft"
    );
    if (DRAFT.length > 0) {
      console.log(`\u26A0\uFE0F \u6CA1\u6709 active \u4EA7\u54C1\uFF0C\u9009\u62E9 ${DRAFT.length} \u4E2A draft \u4E2D\u7684\u7B2C ${occurrenceIndex + 1} \u4E2A`);
      return DRAFT[pickIndex(DRAFT)];
    }
    console.log(`\u26A0\uFE0F \u72B6\u6001\u672A\u77E5\uFF0C\u9009\u62E9 ${NON_AMAZON.length} \u4E2A\u975E amazon \u4EA7\u54C1\u4E2D\u7684\u7B2C ${occurrenceIndex + 1} \u4E2A`);
    return NON_AMAZON[pickIndex(NON_AMAZON)];
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
    location.assign(url.href);
  }
  function startProductSearchJob(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    const completed = readCompletedProducts();
    const skippedResults = {};
    const pendingProducts = products.filter((product) => {
      const previous = completed[getProductFingerprint(product)];
      if (!previous) return true;
      skippedResults[product.sku] = {
        ...previous.result || {},
        status: "skipped",
        sku: product.sku,
        model_number: product.model_number
      };
      return false;
    });
    const skipped = products.length - pendingProducts.length;
    if (!pendingProducts.length) {
      window.postMessage({
        type: "PRODUCT_JOB_STATUS",
        payload: {
          state: "complete",
          total: products.length,
          current: products.length,
          processed: products.length,
          skipped,
          failed: 0,
          sku: null,
          results: {}
        }
      }, "*");
      return;
    }
    const job = {
      products: pendingProducts,
      originalTotal: products.length,
      skipped,
      index: 0,
      phase: "search",
      results: skippedResults,
      previousProductHrefs: [...getCurrentProductHrefs()],
      startedAt: Date.now()
    };
    writeJob(job);
    navigateToSku(pendingProducts[0].sku);
  }
  function pauseProductSearchJob() {
    const job = readJob();
    if (job) {
      job.pausedPhase = job.phase;
      job.phase = "paused";
      writeJob(job);
      publishJobStatus(job, "paused");
      console.log("\u23F8\uFE0F SKU \u641C\u7D22\u4EFB\u52A1\u5DF2\u6682\u505C");
    }
  }
  async function resumePausedProductSearchJob() {
    const job = readJob();
    if (!job || job.phase !== "paused") return;
    job.phase = job.pausedPhase === "detail" ? "detail" : "search";
    delete job.pausedPhase;
    writeJob(job);
    await resumeProductSearchJob();
  }
  function cancelProductSearchJob() {
    const job = readJob();
    if (job) publishJobStatus(job, "cancelled");
    clearJob();
  }
  async function waitForProductLink(sku, previousProductHrefs = [], occurrenceIndex = 0) {
    const started = Date.now();
    console.log("\u{1F50E} \u7B49\u5F85\u641C\u7D22\u7ED3\u679C:", sku, `(\u5E8F\u53F7${occurrenceIndex})`);
    while (Date.now() - started < SEARCH_TIMEOUT_MS) {
      const results = getSearchProductResults();
      const best = selectBestProduct(results, previousProductHrefs, occurrenceIndex);
      if (best) {
        if (results.length > 1) {
          console.log(`\u{1F50D} \u641C\u7D22\u5230 ${results.length} \u4E2A\u7ED3\u679C\uFF0C\u7B5B\u9009\u9009\u62E9: status=${best.status}, type=${best.productType}`);
        }
        return best.link;
      }
      await new Promise((resolve) => setTimeout(resolve, SEARCH_WAIT_MS));
    }
    console.warn("\u274C \u641C\u7D22\u8D85\u65F6\uFF0C\u672A\u627E\u5230 SKU:", sku);
    return null;
  }
  async function continueJob(job) {
    const currentJob = readJob();
    if (!currentJob) {
      console.log("\u{1F6D1} \u4EFB\u52A1\u5DF2\u53D6\u6D88\uFF0C\u505C\u6B62\u6267\u884C");
      return;
    }
    if (currentJob.phase === "paused") {
      console.log("\u23F8\uFE0F \u4EFB\u52A1\u5DF2\u6682\u505C\uFF0C\u7B49\u5F85\u6062\u590D");
      publishJobStatus(currentJob, "paused");
      return;
    }
    const nextIndex = job.index + 1;
    if (nextIndex >= job.products.length) {
      console.log("\u2705 \u6240\u6709 SKU \u5904\u7406\u5B8C\u6210:", job.results);
      job.phase = "complete";
      publishJobStatus(job, "complete");
      clearJob();
      return;
    }
    job.index = nextIndex;
    job.phase = "search";
    job.previousProductHrefs = [...getCurrentProductHrefs()];
    writeJob(job);
    await new Promise((resolve) => setTimeout(resolve, NEXT_PRODUCT_DELAY_MS));
    const jobAfterDelay = readJob();
    if (!jobAfterDelay) {
      console.log("\u{1F6D1} \u5EF6\u8FDF\u540E\u4EFB\u52A1\u5DF2\u53D6\u6D88");
      return;
    }
    if (jobAfterDelay.phase === "paused") {
      console.log("\u23F8\uFE0F \u5EF6\u8FDF\u540E\u4EFB\u52A1\u5DF2\u6682\u505C");
      publishJobStatus(jobAfterDelay, "paused");
      return;
    }
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
    if (job.phase === "paused") return;
    const product = job.products[job.index];
    const sku = String(product?.sku ?? "").trim();
    if (!sku) {
      job.results[`row-${job.index}`] = {
        productStatus: "SKU\u672A\u627E\u5230",
        sku: "",
        model_number: product?.model_number || "",
        product_name: product?.product_name || "",
        manufacturer: product?.manufacturer || "",
        processedAt: Date.now()
      };
      await continueJob(job);
      return;
    }
    const detailId = getDetailProductId();
    if (detailId && job.phase === "detail") {
      job.results[sku] = {
        productStatus: "SKU\u627E\u5230",
        productId: detailId,
        sku,
        model_number: product.model_number,
        product_name: product.product_name || "",
        manufacturer: product.manufacturer || "",
        processedAt: Date.now()
      };
      console.log("\u2705 SKU -> Product ID:", sku, detailId);
      try {
        const written = await writeProductMetafields(product, detailId);
        job.results[sku].metafields = written.ok ? "success" : "failed";
        const usesTextWarning = product.safety_warning_text || product.compliance_profile === "lawn-mower";
        if (usesTextWarning) {
          job.results[sku].imageStatus = "\u6587\u5B57\u8B66\u793A";
          job.results[sku].imageNames = [];
        } else if (written.imageIds?.length) {
          job.results[sku].imageStatus = "\u6210\u529F";
          job.results[sku].imageNames = written.imageNames || [];
        } else {
          job.results[sku].imageStatus = "\u56FE\u7247\u672A\u627E\u5230";
          job.results[sku].imageNames = [];
        }
        if (written.ok) markProductCompleted(product, job.results[sku]);
      } catch (error) {
        job.results[sku].metafields = "failed";
        job.results[sku].error = error.message;
        job.results[sku].imageStatus = "\u56FE\u7247\u672A\u627E\u5230";
        job.results[sku].imageNames = [];
        console.error("\u274C Product Metafields \u5199\u5165\u5931\u8D25:", error);
      }
      const jobAfterWrite = readJob();
      if (!jobAfterWrite) {
        console.log("\u{1F6D1} \u5199\u5165\u5B8C\u6210\u540E\u4EFB\u52A1\u5DF2\u53D6\u6D88");
        return;
      }
      if (jobAfterWrite.phase === "paused") {
        console.log("\u23F8\uFE0F \u5199\u5165\u5B8C\u6210\u540E\u4EFB\u52A1\u5DF2\u6682\u505C");
        publishJobStatus(jobAfterWrite, "paused");
        writeJob(job);
        job.phase = "paused";
        return;
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
    const occurrenceIndex = getSkuOccurrenceIndex(job.products, job.index);
    const link = await waitForProductLink(sku, [], occurrenceIndex);
    const jobAfterSearch = readJob();
    if (!jobAfterSearch) {
      console.log("\u{1F6D1} \u641C\u7D22\u5B8C\u6210\u540E\u4EFB\u52A1\u5DF2\u53D6\u6D88");
      return;
    }
    if (jobAfterSearch.phase === "paused") {
      console.log("\u23F8\uFE0F \u641C\u7D22\u5B8C\u6210\u540E\u4EFB\u52A1\u5DF2\u6682\u505C");
      publishJobStatus(jobAfterSearch, "paused");
      return;
    }
    if (!link) {
      job.results[sku] = {
        productStatus: "SKU\u672A\u627E\u5230",
        sku,
        model_number: product.model_number,
        product_name: product.product_name || "",
        manufacturer: product.manufacturer || "",
        processedAt: Date.now()
      };
      await continueJob(job);
      return;
    }
    job.phase = "detail";
    writeJob(job);
    console.log("\u{1F517} \u70B9\u51FB\u5546\u54C1:", link.href);
    link.click();
  }
  var JOB_KEY, COMPLETED_KEY_PREFIX, SEARCH_WAIT_MS, NEXT_PRODUCT_DELAY_MS, SEARCH_TIMEOUT_MS, resumeRunning;
  var init_product_search = __esm({
    "src/modules/product-search.js"() {
      JOB_KEY = "shopifyComplianceProductJob";
      COMPLETED_KEY_PREFIX = "shopifyComplianceCompletedProducts";
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
        if (event.data.type === "PAUSE_PRODUCT_JOB") {
          pauseProductSearchJob();
        }
        if (event.data.type === "RESUME_PRODUCT_JOB") {
          await resumePausedProductSearchJob();
        }
        if (event.data.type === "CANCEL_PRODUCT_JOB") {
          cancelProductSearchJob();
        }
        if (event.data.type === "RESET_COMPLETED_PRODUCTS") {
          resetCompletedProducts();
        }
        if (event.data.type === "REQUEST_PRODUCT_JOB_STATUS") {
          const status = getProductSearchJobStatus();
          if (status) {
            window.postMessage({
              type: "PRODUCT_JOB_STATUS",
              payload: status
            }, "*");
          }
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
      init_product_search();
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
      try {
        window.shopifyComplianceProfileMap = JSON.parse(
          sessionStorage.getItem("shopifyComplianceProfileMap") || "null"
        )?.complianceProfileMap || null;
      } catch {
        window.shopifyComplianceProfileMap = null;
      }
      try {
        window.shopifySafetyTextMap = JSON.parse(
          sessionStorage.getItem("shopifySafetyTextMap") || "null"
        )?.safetyTextMap || null;
      } catch {
        window.shopifySafetyTextMap = null;
      }
      window.addEventListener("message", (event) => {
        if (event.source === window && event.data?.type === "SHOPIFY_MANUFACTURER_MAP") {
          window.shopifyManufacturerMap = event.data.manufacturerMap;
          console.log("\u2705 Manufacturer Map \u5DF2\u52A0\u8F7D:", event.data.locale);
        }
        if (event.source === window && event.data?.type === "SHOPIFY_COMPLIANCE_PROFILE_MAP") {
          window.shopifyComplianceProfileMap = event.data.complianceProfileMap;
          console.log("\u2705 Compliance Profile Map \u5DF2\u52A0\u8F7D:", event.data.locale);
        }
        if (event.source === window && event.data?.type === "SHOPIFY_SAFETY_TEXT_MAP") {
          window.shopifySafetyTextMap = event.data.safetyTextMap;
          console.log("\u2705 Safety Text Map \u5DF2\u52A0\u8F7D:", event.data.locale);
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
