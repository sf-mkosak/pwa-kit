/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const {Command} = require('commander')

/**
 * Updates an MRT target via the API with only the provided properties
 */
class MRTTargetUpdater {
    constructor(options = {}) {
        this.projectSlug = options.projectSlug
        this.targetSlug = options.targetSlug
        this.cloudOrigin = options.cloudOrigin || 'https://cloud.mobify.com'
        this.mobifyApiKey = options.mobifyApiKey
    }

    /**
     * Build JSON payload with only truthy values
     * @param {Object} properties - Object with all possible properties
     * @returns {Object} - Object with only truthy properties
     */
    buildPayload(properties) {
        const payload = {}
        
        // Add properties only if they have truthy values
        if (properties.name) payload.name = properties.name
        if (properties.ssrExternalHostname) payload.ssr_external_hostname = properties.ssrExternalHostname
        if (properties.ssrExternalDomain) payload.ssr_external_domain = properties.ssrExternalDomain
        if (properties.ssrRegion) payload.ssr_region = properties.ssrRegion
        if (properties.ssrWhitelistedIps) payload.ssr_whitelisted_ips = properties.ssrWhitelistedIps
        if (properties.ssrProxyConfigs) payload.ssr_proxy_configs = JSON.parse(properties.ssrProxyConfigs)
        if (properties.allowCookies !== undefined) payload.allow_cookies = properties.allowCookies === 'true'
        if (properties.enableSourceMaps !== undefined) payload.enable_source_maps = properties.enableSourceMaps === 'true'
        
        return payload
    }

    /**
     * Make the API call to update the MRT target
     * @param {Object} payload - The JSON payload to send
     * @returns {Promise<Object>} - The API response
     */
    async updateTarget(payload) {
        const url = `${this.cloudOrigin}/api/projects/${this.projectSlug}/target/${this.targetSlug}/`
        
        console.log('🎯 Updating MRT Target...')
        console.log(`URL: ${url}`)
        console.log(`Payload: ${JSON.stringify(payload, null, 2)}`)
        
        try {
            // Use node-fetch or make a curl call
            const fetch = await import('node-fetch').then(mod => mod.default)
            
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.mobifyApiKey}`
                },
                body: JSON.stringify(payload)
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`)
            }
            
            const result = await response.json()
            console.log('✅ Successfully updated MRT target')
            return result
            
        } catch (error) {
            console.error('❌ Error updating target:', error.message)
            throw error
        }
    }
}

async function main() {
    const program = new Command()

    program
        .description('Update MRT target with optional properties')
        .requiredOption('--project-slug <slug>', 'MRT Project slug')
        .requiredOption('--target-slug <slug>', 'MRT Target slug')
        .requiredOption('--mobify-api-key <key>', 'Mobify API key')
        .option('--name <name>', 'Target name')
        .option('--ssr-external-hostname <hostname>', 'SSR external hostname')
        .option('--ssr-external-domain <domain>', 'SSR external domain')
        .option('--ssr-region <region>', 'SSR region')
        .option('--ssr-whitelisted-ips <ips>', 'SSR whitelisted IPs')
        .option('--ssr-proxy-configs <configs>', 'Proxy configs (JSON string)')
        .option('--allow-cookies <boolean>', 'Allow cookies (true/false)')
        .option('--enable-source-maps <boolean>', 'Enable source maps (true/false)')
        .option('--cloud-origin <hostname>', 'MRT Cloud origin', 'https://cloud.mobify.com')

    program.parse()
    const options = program.opts()

    const updater = new MRTTargetUpdater({
        projectSlug: options.projectSlug,
        targetSlug: options.targetSlug,
        cloudOrigin: options.cloudOrigin,
        mobifyApiKey: options.mobifyApiKey
    })

    // Build payload with only provided properties
    const payload = updater.buildPayload({
        name: options.name,
        ssrExternalHostname: options.ssrExternalHostname,
        ssrExternalDomain: options.ssrExternalDomain,
        ssrRegion: options.ssrRegion,
        ssrWhitelistedIps: options.ssrWhitelistedIps,
        ssrProxyConfigs: options.ssrProxyConfigs,
        allowCookies: options.allowCookies,
        enableSourceMaps: options.enableSourceMaps
    })

    // Check if payload is empty
    if (Object.keys(payload).length === 0) {
        console.log('⚠️ No properties provided to update')
        return
    }

    try {
        await updater.updateTarget(payload)
    } catch (error) {
        console.error('❌ Error updating target:', error.message)
        process.exit(1)
    }
}

// Export for use as module
module.exports = MRTTargetUpdater

// Run CLI if called directly
if (require.main === module) {
    main()
}
