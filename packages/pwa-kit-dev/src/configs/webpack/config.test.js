/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'path'

const EXT_EXTENDS = '@salesforce/retail-react-app'

const buildBabelExcludeRegex = (sep) => {
    const escapedSep = sep.replace(/\\/g, '\\\\')
    const extendsRegex = EXT_EXTENDS.replace('/', escapedSep)
    return new RegExp(`${escapedSep}node_modules(?!${escapedSep}${extendsRegex})`)
}

describe('babel-loader exclude regex', () => {
    describe(`on current platform (path.sep = '${path.sep}')`, () => {
        const exclude = buildBabelExcludeRegex(path.sep)

        test('excludes regular node_modules packages', () => {
            const lodashPath = path.join('C:', 'project', 'node_modules', 'lodash', 'index.js')
            expect(exclude.test(lodashPath)).toBe(true)
        })

        test('does NOT exclude the extends package', () => {
            const extendsPath = path.join(
                'C:',
                'project',
                'node_modules',
                '@salesforce',
                'retail-react-app',
                'app',
                'index.jsx'
            )
            expect(exclude.test(extendsPath)).toBe(false)
        })

        test('excludes other @salesforce scoped packages', () => {
            const otherPath = path.join(
                'C:',
                'project',
                'node_modules',
                '@salesforce',
                'pwa-kit-runtime',
                'index.js'
            )
            expect(exclude.test(otherPath)).toBe(true)
        })

        test('does not exclude source files outside node_modules', () => {
            const srcPath = path.join('C:', 'project', 'app', 'components', 'index.jsx')
            expect(exclude.test(srcPath)).toBe(false)
        })
    })

    describe('on Windows (path.sep = backslash)', () => {
        const exclude = buildBabelExcludeRegex('\\')

        test('excludes regular node_modules packages', () => {
            expect(exclude.test('C:\\project\\node_modules\\lodash\\index.js')).toBe(true)
        })

        test('does NOT exclude the extends package', () => {
            expect(
                exclude.test(
                    'C:\\project\\node_modules\\@salesforce\\retail-react-app\\app\\index.jsx'
                )
            ).toBe(false)
        })

        test('excludes other @salesforce scoped packages', () => {
            expect(
                exclude.test('C:\\project\\node_modules\\@salesforce\\pwa-kit-runtime\\index.js')
            ).toBe(true)
        })

        test('does not exclude source files outside node_modules', () => {
            expect(exclude.test('C:\\project\\app\\components\\index.jsx')).toBe(false)
        })
    })

    describe('on Unix (path.sep = /)', () => {
        const exclude = buildBabelExcludeRegex('/')

        test('excludes regular node_modules packages', () => {
            expect(exclude.test('/home/dev/project/node_modules/lodash/index.js')).toBe(true)
        })

        test('does NOT exclude the extends package', () => {
            expect(
                exclude.test(
                    '/home/dev/project/node_modules/@salesforce/retail-react-app/app/index.jsx'
                )
            ).toBe(false)
        })

        test('excludes other @salesforce scoped packages', () => {
            const p = '/home/dev/project/node_modules/@salesforce/pwa-kit-runtime/index.js'
            expect(exclude.test(p)).toBe(true)
        })

        test('does not exclude source files outside node_modules', () => {
            expect(exclude.test('/home/dev/project/app/components/index.jsx')).toBe(false)
        })
    })
})
