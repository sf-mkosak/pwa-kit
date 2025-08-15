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
    buildUpdateTargetPayload(properties) {
        const payload = {}

        // Add properties only if they have truthy values
        if (properties.name) payload.name = properties.name
        if (properties.ssrExternalHostname)
            payload.ssr_external_hostname = properties.ssrExternalHostname
        if (properties.ssrExternalDomain) payload.ssr_external_domain = properties.ssrExternalDomain
        if (properties.ssrRegion) payload.ssr_region = properties.ssrRegion
        if (properties.ssrWhitelistedIps) payload.ssr_whitelisted_ips = properties.ssrWhitelistedIps
        if (properties.ssrProxyConfigs)
            payload.ssr_proxy_configs = JSON.parse(properties.ssrProxyConfigs)
        if (properties.allowCookies !== undefined)
            payload.allow_cookies = properties.allowCookies === 'true'
        if (properties.enableSourceMaps !== undefined)
            payload.enable_source_maps = properties.enableSourceMaps === 'true'

        return payload
    }

    /**
     * Build JSON payload for environment variables in the expected format
     * @param {Object} envVars - Object with environment variable key-value pairs
     * @returns {Object} - Object with environment variables formatted for API
     */
    buildEnvVarsPayload(envVars) {
        const payload = {}

        // Convert each environment variable to the expected format
        if (envVars && Object.keys(envVars).length > 0) {
            Object.keys(envVars).forEach((key) => {
                const value = envVars[key]
                payload[key] = {
                    value: value
                }
            })
        }

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
            const fetch = await import('node-fetch').then((mod) => mod.default)

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.mobifyApiKey}`
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(
                    `API call failed: ${response.status} ${response.statusText}\n${errorText}`
                )
            }

            const result = await response.json()
            console.log('✅ Successfully updated MRT target')
            return result
        } catch (error) {
            console.error('❌ Error updating target:', error.message)
            throw error
        }
    }

    /**
     * Make the API call to update environment variables for the MRT target
     * @param {Object} envVarsPayload - The environment variables payload
     * @returns {Promise<Object>} - The API response
     */
    async updateEnvironmentVariables(envVarsPayload) {
        const url = `${this.cloudOrigin}/api/projects/${this.projectSlug}/target/${this.targetSlug}/env-var/`

        console.log('🔧 Updating Environment Variables...')
        console.log(`URL: ${url}`)
        console.log(`Payload: ${JSON.stringify(envVarsPayload, null, 2)}`)

        try {
            const fetch = await import('node-fetch').then((mod) => mod.default)
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.mobifyApiKey}`
                },
                body: JSON.stringify(envVarsPayload)
            })

            if (response.status !== 204) {
                const errorText = await response.text()
                throw new Error(
                    `Failed to update environment variables: ${response.status} ${response.statusText}\n${errorText}`
                )
            }

            console.log('✅ Successfully updated environment variables')
        } catch (error) {
            console.error('❌ Error updating environment variables:', error.message)
            throw error
        }
    }
}

async function main() {
    const program = new Command()

    // Global options
    program
        .option('--project-slug <slug>', 'MRT Project slug')
        .option('--target-slug <slug>', 'MRT Target slug')
        .option('--mobify-api-key <key>', 'Mobify API key')
        .option('--cloud-origin <hostname>', 'MRT Cloud origin', 'https://cloud.mobify.com')

    // Command for updating target properties
    program
        .command('target')
        .description('Update MRT target properties')
        .option('--name <name>', 'Target name')
        .option('--ssr-external-hostname <hostname>', 'SSR external hostname')
        .option('--ssr-external-domain <domain>', 'SSR external domain')
        .option('--ssr-region <region>', 'SSR region')
        .option('--ssr-whitelisted-ips <ips>', 'SSR whitelisted IPs')
        .option('--ssr-proxy-configs <configs>', 'Proxy configs (JSON string)')
        .option('--allow-cookies <boolean>', 'Allow cookies (true/false)')
        .option('--enable-source-maps <boolean>', 'Enable source maps (true/false)')
        .action(async (options) => {
            const globalOpts = program.opts()

            // Validate required options
            if (!globalOpts.projectSlug || !globalOpts.targetSlug || !globalOpts.mobifyApiKey) {
                console.error(
                    '❌ Required options: --project-slug, --target-slug, --mobify-api-key'
                )
                process.exit(1)
            }

            const updater = new MRTTargetUpdater({
                projectSlug: globalOpts.projectSlug,
                targetSlug: globalOpts.targetSlug,
                cloudOrigin: globalOpts.cloudOrigin,
                mobifyApiKey: globalOpts.mobifyApiKey
            })

            // Build payload with only provided properties
            const payload = updater.buildUpdateTargetPayload({
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
        })

    // Command for updating environment variables
    program
        .command('env-var')
        .description('Update environment variables for MRT target')
        .option(
            '--env <key=value...>',
            'Environment variables as key=value pairs (use key=null to delete)'
        )
        .option('--env-file <path>', 'Path to .env file containing environment variables')
        .action(async (options) => {
            const globalOpts = program.opts()

            // Validate required options
            if (!globalOpts.projectSlug || !globalOpts.targetSlug || !globalOpts.mobifyApiKey) {
                console.error(
                    '❌ Required options: --project-slug, --target-slug, --mobify-api-key'
                )
                process.exit(1)
            }

            const updater = new MRTTargetUpdater({
                projectSlug: globalOpts.projectSlug,
                targetSlug: globalOpts.targetSlug,
                cloudOrigin: globalOpts.cloudOrigin,
                mobifyApiKey: globalOpts.mobifyApiKey
            })

            let envVars = {}

            // Parse environment variables from --env options
            if (options.env) {
                options.env.forEach((envPair) => {
                    const [key, ...valueParts] = envPair.split('=')
                    const value = valueParts.join('=') // Handle values with = signs
                    if (key && value !== undefined) {
                        // Convert string 'null' to actual null for deletion
                        envVars[key] = value === 'null' ? null : value
                    }
                })
            }

            // Parse environment variables from .env file if provided
            if (options.envFile) {
                try {
                    const fs = require('fs')
                    const envFileContent = fs.readFileSync(options.envFile, 'utf8')
                    const envFileVars = {}

                    envFileContent.split('\n').forEach((line) => {
                        const trimmedLine = line.trim()
                        if (trimmedLine && !trimmedLine.startsWith('#')) {
                            const [key, ...valueParts] = trimmedLine.split('=')
                            const value = valueParts.join('=')
                            if (key && value !== undefined) {
                                const trimmedValue = value.trim()
                                // Convert string 'null' to actual null for deletion
                                envFileVars[key.trim()] =
                                    trimmedValue === 'null' ? null : trimmedValue
                            }
                        }
                    })

                    // Merge with command line env vars (command line takes precedence)
                    envVars = {...envFileVars, ...envVars}
                } catch (error) {
                    console.error(`❌ Error reading env file: ${error.message}`)
                    process.exit(1)
                }
            }

            // Check if any environment variables were provided
            if (Object.keys(envVars).length === 0) {
                console.log(
                    '⚠️ No environment variables provided. Use --env or --env-file options.'
                )
                return
            }

            // Build environment variables payload
            const payload = updater.buildEnvVarsPayload(envVars)

            try {
                await updater.updateEnvironmentVariables(payload)
            } catch (error) {
                console.error('❌ Error updating environment variables:', error.message)
                process.exit(1)
            }
        })

    program.parse()

    // If no command is provided, show help
    if (!process.argv.slice(2).length) {
        program.outputHelp()
    }
}

// Export for use as module
module.exports = MRTTargetUpdater

// Run CLI if called directly
if (require.main === module) {
    main()
}
