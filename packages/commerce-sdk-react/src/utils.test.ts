/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as utils from './utils'

describe('Utils', () => {
    test.each([
        ['/callback', false],
        ['https://pwa-kit.mobify-storefront.com/callback', true],
        ['/social-login/callback', false]
    ])('isAbsoluteUrl', (url, expected) => {
        const isURL = utils.isAbsoluteUrl(url)
        expect(isURL).toBe(expected)
    })
    test('extractCustomParameters only returns custom parameters', () => {
        const parameters = {
            c_param1: 'this is a custom',
            param1: 'this is not a custom',
            c_param2: 1,
            param2: 2,
            param3: false,
            c_param3: true
        }
        const customParameters = utils.extractCustomParameters(parameters)
        expect(customParameters).toEqual({
            c_param1: 'this is a custom',
            c_param2: 1,
            c_param3: true
        })
    })
})
