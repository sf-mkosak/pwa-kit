#!/usr/bin/env node
/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Starts the retail dev server with MRT Data Store enabled and sample entries
 * from `mrt-data-store-demo.defaults.json` (in-memory local provider; no DynamoDB).
 */
/* eslint @typescript-eslint/no-var-requires: "off" */
'use strict'

const {spawn} = require('child_process')
const fs = require('fs')
const path = require('path')

const pkgRoot = path.join(__dirname, '..')
const defaultsPath = path.join(__dirname, 'mrt-data-store-demo.defaults.json')
const defaultsJson = fs.readFileSync(defaultsPath, 'utf8').trim()

// `hasMrtEnvironment()` in pwa-kit-runtime is true when AWS_REGION + MOBIFY_PROPERTY_ID +
// DEPLOY_TARGET are all set; then the **real** MRT Data Store is used (DynamoDB), not
// `PWAKIT_MRT_DATA_STORE_DEFAULTS`. For this demo we force the **local in-memory** provider by
// clearing the trio in the child process only (your shell / IDE env is unchanged).
const env = {
    ...process.env,
    PWAKIT_MRT_DATA_STORE_ENABLED: 'true',
    PWAKIT_MRT_DATA_STORE_DEFAULTS: defaultsJson,
    PWAKIT_MRT_DATA_STORE_WARN_ON_MISSING: 'false'
}
delete env.AWS_REGION
delete env.MOBIFY_PROPERTY_ID
delete env.DEPLOY_TARGET

const child = spawn('npm', ['run', 'start'], {
    cwd: pkgRoot,
    env,
    stdio: 'inherit',
    shell: true
})

child.on('exit', (code, signal) => {
    if (signal) {
        process.exit(1)
    }
    process.exit(code ?? 0)
})
