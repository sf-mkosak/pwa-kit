/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {getMrtDataStoreFromContext, runWithMrtDataStoreContext} from './context'
import {getCustomGlobalPreferencesFromContext} from './ssr-global-preferences.server'
import {getCustomSitePreferencesFromContext} from './ssr-site-preferences.server'

describe('data-store/context', () => {
    test('getters return empty object outside run', () => {
        expect(getMrtDataStoreFromContext()).toEqual({
            customSitePreferences: {},
            customGlobalPreferences: {}
        })
        expect(getCustomSitePreferencesFromContext()).toEqual({})
        expect(getCustomGlobalPreferencesFromContext()).toEqual({})
    })

    test('runWithMrtDataStoreContext exposes payloads to getters', () => {
        runWithMrtDataStoreContext(
            {customSitePreferences: {a: 1}, customGlobalPreferences: {b: 2}},
            () => {
                expect(getCustomSitePreferencesFromContext()).toEqual({a: 1})
                expect(getCustomGlobalPreferencesFromContext()).toEqual({b: 2})
                expect(getMrtDataStoreFromContext()).toEqual({
                    customSitePreferences: {a: 1},
                    customGlobalPreferences: {b: 2}
                })
            }
        )
    })

    test('defaults missing keys to empty object', () => {
        runWithMrtDataStoreContext({customSitePreferences: {x: true}}, () => {
            expect(getCustomGlobalPreferencesFromContext()).toEqual({})
        })
        runWithMrtDataStoreContext({customGlobalPreferences: {y: true}}, () => {
            expect(getCustomSitePreferencesFromContext()).toEqual({})
        })
    })
})
