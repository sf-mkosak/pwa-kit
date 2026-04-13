/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {DATA_STORE_BOOTSTRAP_GLOBAL_PREFERENCES_KEY, DATA_STORE_WINDOW_GLOBAL} from './constants'

/**
 * Returns custom global preferences serialized during SSR (`#mobify-data` → `window`).
 *
 * @returns {Record<string, unknown>}
 */
export function getCustomGlobalPreferences() {
    if (typeof window === 'undefined') {
        return {}
    }
    const root = window[DATA_STORE_WINDOW_GLOBAL]
    const value =
        root && typeof root === 'object' && !Array.isArray(root)
            ? root[DATA_STORE_BOOTSTRAP_GLOBAL_PREFERENCES_KEY]
            : undefined
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}
