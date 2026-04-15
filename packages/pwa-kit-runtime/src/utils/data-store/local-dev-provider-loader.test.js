/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
    isMrtDataStoreLocalProviderAllowed,
    resetLocalMrtDataStoreProviderCacheForTests,
    tryFetchPlainObjectFromLocalMrtDataStore
} from './local-dev-provider-loader'

describe('local-dev-provider-loader', () => {
    const originalEnv = {...process.env}

    afterEach(() => {
        process.env = {...originalEnv}
        resetLocalMrtDataStoreProviderCacheForTests()
    })

    describe('isMrtDataStoreLocalProviderAllowed', () => {
        it('is true when PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL=true', () => {
            process.env.NODE_ENV = 'production'
            process.env.PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL = 'true'
            expect(isMrtDataStoreLocalProviderAllowed()).toBe(true)
        })

        it('is true when CI=true', () => {
            process.env.NODE_ENV = 'production'
            delete process.env.PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL
            process.env.CI = 'true'
            expect(isMrtDataStoreLocalProviderAllowed()).toBe(true)
        })

        it('is false in production without allow or CI', () => {
            process.env.NODE_ENV = 'production'
            delete process.env.PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL
            delete process.env.CI
            expect(isMrtDataStoreLocalProviderAllowed()).toBe(false)
        })

        it('is true when NODE_ENV is not production', () => {
            process.env.NODE_ENV = 'test'
            delete process.env.PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL
            delete process.env.CI
            expect(isMrtDataStoreLocalProviderAllowed()).toBe(true)
        })
    })

    describe('tryFetchPlainObjectFromLocalMrtDataStore', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'test'
            delete process.env.PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL
            delete process.env.CI
        })

        it('returns null when local provider is not allowed', async () => {
            process.env.NODE_ENV = 'production'
            delete process.env.CI
            delete process.env.PWAKIT_MRT_DATA_STORE_ALLOW_LOCAL
            await expect(
                tryFetchPlainObjectFromLocalMrtDataStore('any-key', 'test-ns')
            ).resolves.toBeNull()
        })

        it('returns object from PWAKIT_MRT_DATA_STORE_DEFAULTS via real dev provider', async () => {
            process.env.PWAKIT_MRT_DATA_STORE_DEFAULTS = JSON.stringify({
                'dal-key-one': {flag: true}
            })
            await expect(
                tryFetchPlainObjectFromLocalMrtDataStore('dal-key-one', 'test-ns')
            ).resolves.toEqual({flag: true})
        })
    })
})
