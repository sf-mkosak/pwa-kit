/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'path'

/**
 * Reproduces the exact regex construction from config.js (ruleForBabelLoader)
 * using the real path.sep. On Windows (path.sep === '\\'), the unescaped backslash
 * in the template string creates broken escape sequences (\n, \r, etc.) in the regex,
 * causing the exclude pattern to match nothing — so babel-loader processes ALL of
 * node_modules, breaking pre-compiled CJS packages.
 *
 * See: https://github.com/SalesforceCommerceCloud/pwa-kit/issues/3789
 */
const EXT_EXTENDS = '@salesforce/retail-react-app'
const EXT_EXTENDS_WIN = EXT_EXTENDS.replace('/', '\\')

const buildBabelExcludeRegex = () => {
    return new RegExp(
        `${path.sep}node_modules(?!${path.sep}${
            path.sep === '/' ? EXT_EXTENDS : EXT_EXTENDS_WIN
        })`
    )
}

describe('babel-loader exclude regex (Windows regression - issue #3789)', () => {
    const exclude = buildBabelExcludeRegex()

    if (path.sep === '\\') {
        // eslint-disable-next-line no-console
        console.log(
            `[DEBUG] Running on Windows. path.sep='\\\\', regex source: ${exclude.source}`
        )
    }

    test('excludes regular node_modules packages', () => {
        const lodashPath = path.join(
            'C:',
            'Users',
            'dev',
            'project',
            'node_modules',
            'lodash',
            'index.js'
        )
        expect(exclude.test(lodashPath)).toBe(true)
    })

    test('does NOT exclude the extends package (@salesforce/retail-react-app)', () => {
        const extendsPath = path.join(
            'C:',
            'Users',
            'dev',
            'project',
            'node_modules',
            '@salesforce',
            'retail-react-app',
            'app',
            'components',
            'header',
            'index.jsx'
        )
        expect(exclude.test(extendsPath)).toBe(false)
    })

    test('excludes other @salesforce scoped packages in node_modules', () => {
        const otherPkgPath = path.join(
            'C:',
            'Users',
            'dev',
            'project',
            'node_modules',
            '@salesforce',
            'pwa-kit-runtime',
            'index.js'
        )
        expect(exclude.test(otherPkgPath)).toBe(true)
    })

    test('does not exclude project source files outside node_modules', () => {
        const srcPath = path.join(
            'C:',
            'Users',
            'dev',
            'project',
            'app',
            'components',
            'header',
            'index.jsx'
        )
        expect(exclude.test(srcPath)).toBe(false)
    })
})
