# Plan: Integrate `@salesforce/mrt-utilities` into pwa-kit

This document describes how **Storefront Next–style** MRT Data Store usage maps onto **pwa-kit**, and records **what is implemented today** vs **optional follow-ups**. Package layout and SSR model differ from storefront-next; the sections below reflect the **current** monorepo state.

## Product context: DAL, Data Store, and site preferences

**Background:** The **Data Access Layer (DAL)** stores selected **e-commerce site metadata** in a **key-value DynamoDB table** co-located with the SSR Lambda. Customer-facing docs call the reader the **“Data Store.”**

**Customer abstraction:** Apps should avoid raw DAL keys and low-level `getEntry` where possible. PWA Kit exposes **`getCustomSitePreferences()`** and **`getCustomGlobalPreferences()`** (universal imports) plus higher-level resolvers on the server barrel.

**References (confirm keys and contracts with MRT / owning teams):**

- PWA Kit Data Store client: [pwa-kit#3648](https://github.com/SalesforceCommerceCloud/pwa-kit/pull/3648)
- Managed runtime libraries: [managed-runtime-libraries#19](https://github.com/SalesforceCommerceCloud/managed-runtime-libraries/pull/19)
- **DAL keys:** Site pattern `<siteId>-custom-site-preferences` (suffix in runtime **`CUSTOM_SITE_PREFERENCES_KEY_SUFFIX`**). Global key **`custom-global-preferences`** (`CUSTOM_GLOBAL_PREFERENCES_DATA_STORE_KEY`). Confirm with MRT before treating as immutable.

## PWA Kit vs Storefront Next: universal app and serialization

**Storefront-next** can attach data to **server-only** request context (e.g. loaders). The browser does not call DynamoDB.

**PWA Kit** is **universal**: the same modules run on the **server** (SSR) and in the **browser**. The Data Store is **Lambda-local** and **not** callable from the browser. Implemented approach:

1. **Server:** During SSR, [`react-rendering.js`](../packages/pwa-kit-react-sdk/src/ssr/server/react-rendering.js) calls `resolveCustomSitePreferencesForRequest` / `resolveCustomGlobalPreferencesForRequest` (from `@salesforce/pwa-kit-runtime/utils/ssr-server`) using `res.locals.site?.id` for the site key.
2. **Async context:** Resolved objects are bound with **`runWithMrtDataStoreContext`** from [`utils/data-store/context.js`](../packages/pwa-kit-runtime/src/utils/data-store/context.js) (Node **`AsyncLocalStorage`**) so **`getCustomSitePreferences()`** / **`getCustomGlobalPreferences()`** need no `req`/`res` during the render subtree.
3. **Serialize:** A **single** `windowGlobals` entry uses **`DATA_STORE_WINDOW_GLOBAL`** (`__MRT_DATA_STORE__`) with nested keys **`customSitePreferences`** and **`customGlobalPreferences`** (see [`constants.js`](../packages/pwa-kit-runtime/src/utils/data-store/constants.js)). That object is serialized in `#mobify-data` like other globals (same pattern as `__CONFIG__`).
4. **Client:** Conditional modules [`ssr-site-preferences.js`](../packages/pwa-kit-runtime/src/utils/data-store/ssr-site-preferences.js) / [`ssr-global-preferences.js`](../packages/pwa-kit-runtime/src/utils/data-store/ssr-global-preferences.js) (`WEBPACK_TARGET === 'web'` → `.client.js`, else `.server.js`) expose one import path each; **client** reads `window.__MRT_DATA_STORE__.customSitePreferences` / `customGlobalPreferences`.

**Design notes:**

- One public import path per feature (`getCustomSitePreferences` from the conditional `ssr-site-preferences` entry, etc.).
- **No** separate top-level globals like `__CUSTOM_SITE_PREFERENCES__`; everything lives under **`__MRT_DATA_STORE__`** to keep bootstrap JSON grouped and extensible.

---

## Implemented architecture (snapshot)

### `@salesforce/pwa-kit-runtime`

| Area | Implementation |
|------|------------------|
| **Data Store I/O** | [`utils/ssr-server/data-store.js`](../packages/pwa-kit-runtime/src/utils/ssr-server/data-store.js) **re-exports** `DataStore`, `DataStoreNotFoundError`, `DataStoreServiceError`, `DataStoreUnavailableError` from `@salesforce/mrt-utilities/middleware`. No duplicate DynamoDB logic in pwa-kit. |
| **Shared fetch helper** | [`utils/data-store/data-store-utils.js`](../packages/pwa-kit-runtime/src/utils/data-store/data-store-utils.js) — **`getPlainObjectForDataStoreKey`** (null key / unavailable store / not found / service error → `{}`; plain object pass-through; unexpected errors rethrown). Unit tests: `data-store-utils.test.js`. |
| **SSR async context** | [`utils/data-store/context.js`](../packages/pwa-kit-runtime/src/utils/data-store/context.js) — `runWithMrtDataStoreContext`, `getMrtDataStoreFromContext`. |
| **Site prefs** | `ssr-site-preferences.js` → server: resolve + ALS getters + `buildCustomSitePreferencesDataStoreKey`; client: read nested site key from `__MRT_DATA_STORE__`. Tests: `ssr-site-preferences.test.js` (client + server suites). |
| **Global prefs** | `ssr-global-preferences.js` — same split for org-wide key `custom-global-preferences`. Tests: `ssr-global-preferences.test.js`. |
| **Constants** | [`utils/data-store/constants.js`](../packages/pwa-kit-runtime/src/utils/data-store/constants.js) — window global name, nested bootstrap property names, DAL key suffix / global key string. |
| **Barrel** | [`utils/ssr-server.js`](../packages/pwa-kit-runtime/src/utils/ssr-server.js) re-exports `context`, `data-store-utils`, `ssr-*-preferences.server` (resolve/build + context readers), `ssr-server/data-store`, etc. |

**Dependency:** `pwa-kit-runtime` **`package.json`** lists **`@salesforce/mrt-utilities`** (implementation of `DataStore`). AWS SDK clients are not declared directly on runtime for this path; they come transitively via mrt-utilities.

### `@salesforce/pwa-kit-react-sdk`

- [`ssr/server/react-rendering.js`](../packages/pwa-kit-react-sdk/src/ssr/server/react-rendering.js): after `AppConfig.restore`, **`Promise.all`** resolves site + global preferences, then wraps the render pipeline in **`runWithMrtDataStoreContext`**. `windowGlobals` includes **`[DATA_STORE_WINDOW_GLOBAL]: { customSitePreferences, customGlobalPreferences }`** (imported constants). `renderApp` receives the same objects for consistency.

### Templates and tests

- **`template-mrt-reference-app`** — still the **low-level** example: imports `@salesforce/pwa-kit-runtime/utils/ssr-server/data-store`, exposes `/data-store/:key`, returns `{ dataStore: false }` when `isDataStoreAvailable()` is false (typical local dev without MRT env).
- **`template-retail-react-app`** — optional customer-facing usage of `getCustomSitePreferences` / docs; not required for the runtime wiring above.
- **Jest:** `pwa-kit-runtime`, `pwa-kit-react-sdk`, and `template-mrt-reference-app` use **`moduleNameMapper`** for `@salesforce/mrt-utilities/middleware` → ESM build slice and **`transformIgnorePatterns`** so Jest can compile mrt-utilities (published CJS entry can still be invalid in plain Node `require`; SSR bundles resolve ESM via webpack).

---

## Caveat: mrt-utilities CJS vs ESM in Node

As of the pinned **`@salesforce/mrt-utilities`** version, **`dist/cjs/middleware`** may still contain ESM-only syntax, so a bare **`require("@salesforce/mrt-utilities/middleware")` in Node** can fail. **Webpack SSR** resolves the ESM path. **Jest** uses the mapper to **`dist/esm/middleware/data-store.js`** (see runtime `jest.config.js`). A **fixed CJS build upstream** would reduce those workarounds.

---

## Goals (original) — status

1. **Single source of truth for Data Store I/O** — **Done** (mrt-utilities).
2. **Stable `utils/ssr-server/data-store` path** — **Done** (re-export).
3. **No duplicate DynamoDB wiring in pwa-kit** — **Done**.
4. **Customer-facing metadata APIs** — **Done** for site + global custom preferences (universal getters + server resolvers); further metadata types can follow the same `constants` + serialization + conditional module pattern.
5. **Parity narrative with Storefront Next** — Same **concept** (prefs from DAL); **mechanism** differs (universal serialization + ALS vs middleware-only).

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
- [x] **`getCustomSitePreferences()` / `getCustomGlobalPreferences()`** universal modules (server/client split + constants).
- [x] **`react-rendering.js`:** resolve prefs, **`runWithMrtDataStoreContext`**, **`windowGlobals['__MRT_DATA_STORE__']`** nested payload.
- [ ] **MRT confirmation:** Document any final DAL key / scoping changes from constants in repo.
- [ ] **Customer example:** Retail template or docs showing **`getCustomSitePreferences()`** (not raw keys) — optional product follow-up.
- [x] **CHANGELOG** for runtime (feature + exports).
- [ ] **Local provider (Phase 4)** + developer docs — optional.
- [ ] **Storefront Next** parity tracking — separate repo.

---

## Recommendation (unchanged in spirit)

Keep **all MRT Data Store I/O** inside **`@salesforce/mrt-utilities`**. PWA Kit should add only **thin orchestration**: ALS bootstrap, serialization shape, universal getters, and **`getPlainObjectForDataStoreKey`**-style helpers — not a second DynamoDB client.

For **universal** access, the **`ssr-config`–style conditional module** plus **`__MRT_DATA_STORE__`** serialization is the PWA Kit–specific answer; storefront-next middleware patterns are a reference for **server-only** resolution and optional **local providers**, not a drop-in template.
