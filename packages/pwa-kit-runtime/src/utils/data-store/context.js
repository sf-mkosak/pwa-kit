/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {AsyncLocalStorage} from 'node:async_hooks'

const mrtDataStoreContextStorage = new AsyncLocalStorage()

const emptyMrtDataStoreContext = () => ({
    customSitePreferences: {},
    customGlobalPreferences: {}
})

/**
 * Run `fn` with resolved MRT Data Store preference payloads in async context so server-side getters
 * (`getCustomSitePreferences` / `getCustomGlobalPreferences` and their `*FromContext` helpers) read
 * the same objects during SSR (including under concurrency).
 *
 * @param {{
 *   customSitePreferences?: Record<string, unknown>,
 *   customGlobalPreferences?: Record<string, unknown>
 * }} payload
 * @param {() => unknown} fn
 * @returns {unknown}
 */
export function runWithMrtDataStoreContext(payload, fn) {
    const store = {
        customSitePreferences: payload.customSitePreferences ?? {},
        customGlobalPreferences: payload.customGlobalPreferences ?? {}
    }
    return mrtDataStoreContextStorage.run(store, fn)
}

/**
 * @returns {{
 *   customSitePreferences: Record<string, unknown>,
 *   customGlobalPreferences: Record<string, unknown>
 * }}
 */
export function getMrtDataStoreFromContext() {
    return mrtDataStoreContextStorage.getStore() ?? emptyMrtDataStoreContext()
}
