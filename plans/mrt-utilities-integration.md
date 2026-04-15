# Plan: Integrate `@salesforce/mrt-utilities` into pwa-kit

This document describes how **Storefront Next–style** MRT Data Store usage maps onto **pwa-kit**, and records **what is implemented today** vs **optional follow-ups**. Package layout and SSR model differ from storefront-next; the sections below reflect the **current** monorepo state.

## Product context: DAL, Data Store, and site preferences

**Background:** The **Data Access Layer (DAL)** stores selected **e-commerce site metadata** in a **key-value DynamoDB table** co-located with the SSR Lambda. Customer-facing docs call the reader the **“Data Store.”**

**Customer abstraction:** Apps should avoid raw DAL keys and low-level `getEntry` where possible. On the **server**, **`getCustomSitePreferences`** / **`getCustomGlobalPreferences`** fetch from the Data Store (async). On the **client**, the same names (conditional `ssr-*-preferences` imports) read **`window.__MRT_DATA_STORE__`** after bootstrap. Build helpers like **`buildCustomSitePreferencesDataStoreKey`** live on the server barrel.

**References (confirm keys and contracts with MRT / owning teams):**

- PWA Kit Data Store client: [pwa-kit#3648](https://github.com/SalesforceCommerceCloud/pwa-kit/pull/3648)
- Managed runtime libraries: [managed-runtime-libraries#19](https://github.com/SalesforceCommerceCloud/managed-runtime-libraries/pull/19)
- **DAL keys:** Site pattern `<siteId>-custom-site-preferences` (suffix in runtime **`CUSTOM_SITE_PREFERENCES_KEY_SUFFIX`**). Global key **`custom-global-preferences`** (`CUSTOM_GLOBAL_PREFERENCES_DATA_STORE_KEY`). Confirm with MRT before treating as immutable.

## PWA Kit vs Storefront Next: universal app and serialization

**Storefront-next** can attach data to **server-only** request context (e.g. loaders). The browser does not call DynamoDB.

**PWA Kit** is **universal**: the same modules run on the **server** (SSR) and in the **browser**. The Data Store is **Lambda-local** and **not** callable from the browser. Implemented approach:

1. **Server:** During SSR, [`react-rendering.js`](../packages/pwa-kit-react-sdk/src/ssr/server/react-rendering.js) calls `getCustomSitePreferences` / `getCustomGlobalPreferences` (from `@salesforce/pwa-kit-runtime/utils/ssr-server`) **when `isMrtDataStoreEnabled`** (`app.mrtDataStore.enabled` or `PWAKIT_MRT_DATA_STORE_ENABLED`). Otherwise SSR skips resolution and **does not** serialize `__MRT_DATA_STORE__`. Uses `res.locals.site?.id` for the site key when resolving.
2. **Serialize:** When enabled, a **`windowGlobals`** entry uses **`DATA_STORE_WINDOW_GLOBAL`** (`__MRT_DATA_STORE__`) with nested **`customSitePreferences`** and **`customGlobalPreferences`** (see [`constants.js`](../packages/pwa-kit-runtime/src/utils/data-store/constants.js)). When disabled, the key is **omitted** (not `{}`). The same resolved objects are passed into `renderApp` when bootstrap is enabled.
3. **Client:** Conditional modules [`ssr-site-preferences.js`](../packages/pwa-kit-runtime/src/utils/data-store/ssr-site-preferences.js) / [`ssr-global-preferences.js`](../packages/pwa-kit-runtime/src/utils/data-store/ssr-global-preferences.js) (`WEBPACK_TARGET === 'web'` → `.client.js`, else `.server.js`) expose one import path each; **client** reads `window.__MRT_DATA_STORE__.customSitePreferences` / `customGlobalPreferences` via **`getCustomSitePreferences`** / **`getCustomGlobalPreferences`**.

**Design notes:**

- One public import path per feature (`getCustomSitePreferences` from the conditional `ssr-site-preferences` entry — server async fetch vs client `window` read).
- **No** separate top-level globals like `__CUSTOM_SITE_PREFERENCES__`; everything lives under **`__MRT_DATA_STORE__`** to keep bootstrap JSON grouped and extensible.

---

## Implemented architecture (snapshot)

### `@salesforce/pwa-kit-runtime`

| Area | Implementation |
|------|------------------|
| **Data Store I/O** | [`utils/ssr-server/data-store.js`](../packages/pwa-kit-runtime/src/utils/ssr-server/data-store.js) **re-exports** `DataStore`, `DataStoreNotFoundError`, `DataStoreServiceError`, `DataStoreUnavailableError` from `@salesforce/mrt-utilities/middleware`. No duplicate DynamoDB logic in pwa-kit. |
| **Shared fetch helper** | [`utils/data-store/data-store-utils.js`](../packages/pwa-kit-runtime/src/utils/data-store/data-store-utils.js) — **`getPlainObjectForDataStoreKey`** (null key / unavailable real store → optional **local dev** in-memory provider via [`local-dev-provider-loader.js`](../packages/pwa-kit-runtime/src/utils/data-store/local-dev-provider-loader.js); else `{}`; not found / service error → `{}`; plain object pass-through; unexpected errors rethrown). Unit tests: `data-store-utils.test.js`, `local-dev-provider-loader.test.js`. |
| **Site prefs** | `ssr-site-preferences.js` → server: **`getCustomSitePreferences`** + `buildCustomSitePreferencesDataStoreKey`; client: **`getCustomSitePreferences`** reads nested site key from `__MRT_DATA_STORE__`. Tests: `ssr-site-preferences.test.js` (client + server suites). |
| **Global prefs** | `ssr-global-preferences.js` — same split for org-wide key `custom-global-preferences`. Tests: `ssr-global-preferences.test.js`. |
| **Constants** | [`utils/data-store/constants.js`](../packages/pwa-kit-runtime/src/utils/data-store/constants.js) — window global name, nested bootstrap property names, DAL key suffix / global key string. |
| **SSR opt-in** | [`utils/data-store/data-store-utils.js`](../packages/pwa-kit-runtime/src/utils/data-store/data-store-utils.js) — `isMrtDataStoreEnabled(config)` (`app.mrtDataStore.enabled`, `PWAKIT_MRT_DATA_STORE_ENABLED`). Re-exported from [`utils/ssr-server.js`](../packages/pwa-kit-runtime/src/utils/ssr-server.js). |
| **Barrel** | [`utils/ssr-server.js`](../packages/pwa-kit-runtime/src/utils/ssr-server.js) re-exports `data-store-utils` (includes `isMrtDataStoreEnabled`, `getPlainObjectForDataStoreKey`, `warnIfMrtDataStoreBootstrapMissing` from `logging-utils.js`), `ssr-*-preferences.server` (fetch/build), `ssr-server/data-store`, etc. |

**Dependency:** `pwa-kit-runtime` **`package.json`** lists **`@salesforce/mrt-utilities`** (implementation of `DataStore`). AWS SDK clients are not declared directly on runtime for this path; they come transitively via mrt-utilities.

### `@salesforce/pwa-kit-react-sdk`

- [`ssr/server/react-rendering.js`](../packages/pwa-kit-react-sdk/src/ssr/server/react-rendering.js): after `AppConfig.restore`, when **`isMrtDataStoreEnabled(config)`** is true, **`Promise.all`** resolves site + global preferences and **`windowGlobals`** includes **`__MRT_DATA_STORE__`**. When false, resolution is skipped and the **`__MRT_DATA_STORE__` key is omitted** from `#mobify-data`.

### Templates and tests

- **`template-mrt-reference-app`** — still the **low-level** example: imports `@salesforce/pwa-kit-runtime/utils/ssr-server/data-store`, exposes `/data-store/:key`, returns `{ dataStore: false }` when `isDataStoreAvailable()` is false (typical local dev without MRT env).
- **`template-retail-react-app`** — optional customer-facing usage of `getCustomSitePreferences` / docs; not required for the runtime wiring above.
- **Jest:** `pwa-kit-runtime`, `pwa-kit-react-sdk`, `pwa-kit-dev`, and `template-mrt-reference-app` use **`moduleNameMapper`** for `@salesforce/mrt-utilities/middleware` → ESM build slice and **`transformIgnorePatterns`** so Jest can compile mrt-utilities (published CJS entry can still be invalid in plain Node `require`; SSR bundles resolve ESM via webpack). **`pwa-kit-dev`** needs this because tests load **`pwa-kit-runtime` `dist`**, which `require()`s the middleware entry.

---

## Caveat: mrt-utilities CJS vs ESM in Node

As of the pinned **`@salesforce/mrt-utilities`** version, **`dist/cjs/middleware`** may still contain ESM-only syntax, so a bare **`require("@salesforce/mrt-utilities/middleware")` in Node** can fail. **Webpack SSR** resolves the ESM path. **Jest** uses the mapper to **`dist/esm/middleware/data-store.js`** (see runtime `jest.config.js`). A **fixed CJS build upstream** would reduce those workarounds.

---

## Goals (original) — status

1. **Single source of truth for Data Store I/O** — **Done** (mrt-utilities).
2. **Stable `utils/ssr-server/data-store` path** — **Done** (re-export).
3. **No duplicate DynamoDB wiring in pwa-kit** — **Done**.
4. **Customer-facing metadata APIs** — **Done** for site + global custom preferences (conditional server fetch + client `window` readers + server resolvers); further metadata types can follow the same `constants` + serialization + conditional module pattern.
5. **Parity narrative with Storefront Next** — Same **concept** (prefs from DAL); **mechanism** differs (universal serialization to `window` vs middleware-only).

---

## Local development: providers (still a gap vs storefront-next)

**Storefront-next** can use a **local provider** when MRT env vars are missing.

**pwa-kit today:** No runtime provider abstraction. Reference app stays diagnostic (`dataStore: false` without env). **Phase 4–style** work remains **optional** if product wants SF-Next–like local defaults.

| Direction | Description |
|-----------|-------------|
| **A — Unchanged** | Document that exercising `getEntry` / full SSR Data Store paths locally needs MRT env (or deployed target). |
| **B — Provider in dev tooling** | Local provider in **`pwa-kit-dev`** (or similar), dynamic `import()` from runtime so production bundles stay clean. |
| **C — Upstream** | mrt-utilities ships a supported mock/local API; pwa-kit only wires selection. |

---

## Constraints (still worth verifying with package metadata)

| Topic | Notes |
|--------|--------|
| **Express** | pwa-kit-runtime uses **`express@^4`**. Confirm mrt-utilities **`peerDependencies`** when upgrading either side. |
| **Node** | Runtime engines include **18 / 20 / 22 / 24**; align with mrt-utilities supported range on upgrades. |
| **`getEntry` contract** | Throws **`DataStoreNotFoundError`** when missing value; **`DataStoreServiceError`** on DynamoDB path failures — wrapped by **`getPlainObjectForDataStoreKey`** into `{}` where appropriate. |

---

## Deliverables checklist (updated)

- [x] **`pwa-kit-runtime`:** `data-store` module is re-export-only from **`@salesforce/mrt-utilities`**; no duplicate DynamoDB implementation.
- [x] **`getPlainObjectForDataStoreKey`** in **`data-store-utils`** (+ tests).
- [x] **`getCustomSitePreferences` / `getCustomGlobalPreferences`** conditional modules (server async fetch + client `window` readers + constants).
- [x] **`react-rendering.js`:** resolve prefs (opt-in), **`windowGlobals['__MRT_DATA_STORE__']`** nested payload.
- [ ] **MRT confirmation:** Document any final DAL key / scoping changes from constants in repo.
- [ ] **Customer example:** Retail template or docs showing **`getCustomSitePreferences`** (not raw keys) — optional product follow-up.
- [x] **CHANGELOG** for runtime (feature + exports).
- [x] **Local provider (Phase 4):** `createLocalMrtDataStoreProvider` in **`@salesforce/pwa-kit-dev`**, dynamic import from **`pwa-kit-runtime`** `local-dev-provider-loader` when Data Store unavailable (env `PWAKIT_MRT_DATA_STORE_*`). Developer docs — optional follow-up in retail README.
- [ ] **Storefront Next** parity tracking — separate repo.

---

## Recommendation (unchanged in spirit)

Keep **all MRT Data Store I/O** inside **`@salesforce/mrt-utilities`**. PWA Kit should add only **thin orchestration**: serialization shape, conditional getters, and **`getPlainObjectForDataStoreKey`**-style helpers — not a second DynamoDB client.

For **universal** access, the **`ssr-config`–style conditional module** plus **`__MRT_DATA_STORE__`** serialization is the PWA Kit–specific answer; storefront-next middleware patterns are a reference for **server-only** resolution and optional **local providers**, not a drop-in template.
