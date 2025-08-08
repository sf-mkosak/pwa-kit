/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
const core = require('@actions/core')

/**
 * @file main.js
 * @description Arms the post-release cleanup for MRT targets in CI. This step
 * only captures inputs and persists them for the post step via core.saveState.
 *
 * Why:
 * - GitHub Actions post steps execute even when a job fails or is manually cancelled,
 *   providing best-effort cleanup of leased resources.
 * - Keeping the actual release in post.js avoids releasing too early while the job
 *   is still running and centralizes all teardown logic at job end.
 *
 * Behavior:
 * - Reads the 'slug','maxRetries' and 'retryDelay' inputs and saves them to the Actions state for post.js.
 * - Does not perform any release here; post.js does the release using the saved inputs.
 *
 * Inputs:
 * - slug: MRT target slug to be released in the post step.
 * - maxRetries: Maximum retry attempts to release MRT target.
 * - retryDelay: Delay between retries in milliseconds.
 *
 * See also:
 * - post.js (performs the actual release using the saved inputs)
 */
(async () => {
    core.saveState('slug', core.getInput('slug', {required: true}))
    core.saveState('maxRetries', core.getInput('maxRetries', {required: false}))
    core.saveState('retryDelay', core.getInput('retryDelay', {required: false}))
})().catch((e) => core.setFailed(e.message))
