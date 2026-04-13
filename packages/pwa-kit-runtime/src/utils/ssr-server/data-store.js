/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 * Re-exports the MRT Data Store from @salesforce/mrt-utilities (single source of truth).
 * Note: mrt-utilities’ published CJS middleware entry can be invalid in plain Node; SSR bundles
 * typically resolve the ESM build via webpack. Jest uses moduleNameMapper (see jest.config.js).
 */

export {
    DataStore,
    DataStoreNotFoundError,
    DataStoreServiceError,
    DataStoreUnavailableError
} from '@salesforce/mrt-utilities/middleware'
