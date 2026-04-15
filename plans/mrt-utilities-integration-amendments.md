# MRT utilities integration — amendments / enhancements

This document **extends** [mrt-utilities-integration.md](./mrt-utilities-integration.md). It records planned work that was explicitly deferred or not in scope for the initial integration: **local developer testing** of Data Store behavior and an **SSR feature flag** to avoid the performance cost of population when disabled.

The baseline architecture (mrt-utilities I/O, `__MRT_DATA_STORE__`, conditional `getCustom*` modules) is unchanged; these items adjust **when** data is resolved and **how** empty environments behave.

---

## 1. Local developer environment (Data Store without MRT / DynamoDB)

### Problem

When `DataStore.getDataStore().isDataStoreAvailable()` is false, **`getPlainObjectForDataStoreKey`** uses the optional **local in-memory provider** from **`@salesforce/pwa-kit-dev`** (see `local-dev-provider-loader.js`) so apps can exercise prefs without DynamoDB.

### Direction (aligned with integration plan “Phase 4 / B”) — **implemented**

- **Dev-only local provider** in **`@salesforce/pwa-kit-dev`** (`src/utils/mrt-data-store-local-provider.js`, `createLocalMrtDataStoreProvider`).
- **`pwa-kit-runtime`** `tryFetchPlainObjectFromLocalMrtDataStore` dynamically `import()`s that module (tries `dist/utils/…` then `utils/…` for workspace vs published layout) when the real store is unavailable and **`isMrtDataStoreLocalProviderAllowed()`** is true.
- Env (all **`PWAKIT_*`**):

  | Variable | Role |
  |----------|------|
  | `PWAKIT_MRT_DATA_STORE_DEFAULTS` | JSON map of **full DAL keys** → preference objects. |
  | `PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL` | Set to `true` to allow the local provider when `NODE_ENV=production` (and not `CI`). |
  | `PWAKIT_MRT_DATA_STORE_WARN_ON_MISSING` | Set to `false` to silence missing-key warnings. |

- **SSR opt-in** (`isMrtDataStoreEnabled`) still gates whether **`getCustomSitePreferences` / `getCustomGlobalPreferences`** run and whether **`__MRT_DATA_STORE__`** is serialized; the local provider only applies when that path runs and the real store is unavailable.

### Constraints (unchanged)

- Real DynamoDB remains in **`@salesforce/mrt-utilities`**; local provider matches `getEntry` result shape only.
- Local provider module does **not** import `pwa-kit-runtime` (avoids circular deps).

### Deliverables

- [x] Local provider module + unit tests (`pwa-kit-dev`).
- [x] Runtime `local-dev-provider-loader.js` + `getPlainObjectForDataStoreKey` wiring + Jest mappers (`pwa-kit-runtime`, `pwa-kit-react-sdk`, `template-mrt-reference-app`).
- [x] Update [mrt-utilities-integration.md](./mrt-utilities-integration.md) Phase 4 note.

---

## 2. Feature flag — gate SSR Data Store population (performance) — **implemented (opt-in)**

### Problem

SSR previously always awaited `getCustomSitePreferences` and `getCustomGlobalPreferences`, adding latency even when apps did not use prefs.

### Implemented behavior

- **Opt-in:** `isMrtDataStoreEnabled(getConfig())` in **`@salesforce/pwa-kit-runtime`** (`utils/data-store/data-store-utils`, exported from **`utils/ssr-server`**).
- **`config.app.mrtDataStore.enabled === true`** turns resolution on; default in templates is **`false`**.
- **`PWAKIT_MRT_DATA_STORE_ENABLED`**: when set to a recognized value (`true` / `false` / `1` / `0` / `yes` / `no` / `on` / `off`), it **overrides** config for ops and local scripts. Unrecognized or blank values fall through to config.
- When **disabled**: skip `Promise.all` and **omit** **`__MRT_DATA_STORE__`** from **`windowGlobals`** / `#mobify-data`.

### Follow-ups (optional)

- [ ] `react-rendering.test.js` coverage that mocks resolvers when we want to assert “not called” (runtime unit tests already cover the gate).
- [ ] Local provider (section 1) should only run when this opt-in is **on** (see interaction matrix).

### Deliverables

- [x] Config shape + defaults (`mrtDataStore.enabled: false` in retail template / create-app `default.js`).
- [x] `react-rendering.js` gate + runtime **`data-store-utils.test.js`** (`isMrtDataStoreEnabled`).
- [x] CHANGELOG entries (runtime + react-sdk).
- [x] Cross-reference in [mrt-utilities-integration.md](./mrt-utilities-integration.md).

---

## 3. Interaction matrix

| Opt-in off (`enabled` false, env unset / not forcing on) | MRT available | Local allowed | Result |
|----------|----------------|---------------|--------|
| Yes | any | any | `{}` / `{}`, no I/O |
| No | Yes | n/a | MRT resolution via `getPlainObjectForDataStoreKey` |
| No | No | Yes | Local provider (once implemented; must respect opt-in) |
| No | No | No | `{}` / `{}` |

---

## 4. Reference — sister project (Storefront Next)

Storefront Next added **`createLocalDataStoreProvider`**, **`getDefaultDataStoreProvider`**, and middleware that dynamically imports **`@salesforce/storefront-next-dev/data-store/local-provider`** when MRT env is incomplete. This repo should **mirror the pattern**, not the package names, and respect pwa-kit’s universal SSR + `__MRT_DATA_STORE__` serialization model described in the main plan.

---

## 5. Open decisions

- **Resolved:** SSR Data Store population is **opt-in** (`mrtDataStore.enabled` default `false`; env `PWAKIT_MRT_DATA_STORE_ENABLED` overrides).
- Final **env var prefix** for local provider defaults (`PWAKIT_*` vs shared `SFNEXT_*`) — pending section 1.
- Whether local provider requires **flag on** or can run when flag off but store unavailable (recommended: **local provider only runs when opt-in is on**, so “off” is strictly free).
