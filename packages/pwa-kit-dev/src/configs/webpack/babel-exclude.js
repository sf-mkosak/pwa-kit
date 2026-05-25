/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export const buildBabelExcludeRegex = (sep, extendsPackage) => {
    const escapedSep = sep.replace(/\\/g, '\\\\')
    const extendsRegex = extendsPackage.replace('/', escapedSep)
    return new RegExp(`${escapedSep}node_modules(?!${escapedSep}${extendsRegex})`)
}
