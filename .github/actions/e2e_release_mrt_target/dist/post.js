/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const core = require('@actions/core')
const path = require('path')
const {execFile} = require('child_process')

function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, opts, (err, stdout, stderr) =>
            err ? reject(err) : resolve({stdout, stderr})
        )
    })
}

/**
 * @file post.js
 * @description Performs the actual release of the MRT target back to the pool of available targets in the MRT staging org.
 * @description This step is executed even when a job fails or is manually cancelled, providing best-effort cleanup of leased resources.
 * @description This step is executed after the main step in the workflow.
 */
(async () => {
    try {
        const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
        const slug = core.getState('slug')
        const maxRetries = core.getState('maxRetries')
        const retryDelay = core.getState('retryDelay')
        if (!slug) return
        const cli = path.resolve(workspace, 'e2e/scripts/mrt-target-manager.js')
        await run(
            'node',
            [cli, 'release', slug, '--max-retries', maxRetries, '--retry-delay', retryDelay],
            {cwd: workspace, stdio: 'inherit'}
        )
        core.info(`Released MRT target: ${slug}`)
    } catch (e) {
        core.warning(`Release failed: ${e.message}`)
    }
})()
