/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const base = require('internal-lib-build/configs/jest/jest.config')

// Tests import @salesforce/pwa-kit-runtime dist, which requires @salesforce/mrt-utilities/middleware.
// Published CJS middleware entry can contain ESM syntax; map to the compiled ESM slice (same as pwa-kit-runtime / react-sdk Jest).
const mrtMiddlewareDataStore = path.join(
    __dirname,
    '..',
    'pwa-kit-runtime',
    'node_modules',
    '@salesforce',
    'mrt-utilities',
    'dist',
    'esm',
    'middleware',
    'data-store.js'
)

module.exports = {
    ...base,
    moduleNameMapper: {
        ...base.moduleNameMapper,
        '^@h4ad/serverless-adapter/lib/(.*)$':
            '<rootDir>/node_modules/@h4ad/serverless-adapter/lib/$1/index.cjs',
        '^@salesforce/mrt-utilities/middleware$': mrtMiddlewareDataStore
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@salesforce/mrt-utilities|jsdom/lib/jsdom/browser/resources/resource-loader))'
    ],
    coverageThreshold: {
        global: {
            branches: 67,
            functions: 75,
            lines: 75,
            statements: 75
        }
    },
    testPathIgnorePatterns: ['bin/*', 'dist/*', 'node_modules/*', 'coverage/*'],
    collectCoverageFrom: [
        'src/**',
        'scripts/**',
        '!src/configs/**',
        '!scripts/version.js',
        '!src/ssr/server/test_fixtures/**',
        '!src/schemas/**'
    ]
}
