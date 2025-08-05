const SecureS3Client = require('./aws-s3-client')
const {Command} = require('commander')
const fs = require('fs-extra')
const {MRT_TARGET_DETAILS_FILE} = require('../config')

class MRTTargetManager {
    constructor(options = {}) {
        this.bucket = options.bucket
        this.poolDataFileKey = options.poolDataFileKey
        this.maxRetries = options.maxRetries || 3
        this.retryDelay = options.retryDelay || 10000 // 10 seconds
        this.prNumber = options.prNumber || process.env.GITHUB_PR_NUMBER || null
        this.branch = options.branch || null
        this.runId = options.runId || null
        this.s3Client = new SecureS3Client({
            region: options.region,
            readOnly: !process.env.CI,
            roleArn: process.env.CI ? options.roleArn : options.roleArn, // Don't use role ARN in CI since AWS credentials action handles it
            roleSessionName: options.roleSessionName || 'LocalDev'
        })
    }

    async initialize() {
        await this.s3Client.initialize()
    }

    /**
     * Convert a ReadableStream object returned by the S3 client to a string
     * @param {Stream} stream - The stream to convert
     * @returns {Promise<string>} - The string representation of the stream
     */
    async streamToString(stream) {
        const chunks = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }
        return Buffer.concat(chunks).toString()
    }

    /**
     * Download the pool file and return data with ETag
     */
    async downloadPoolFile() {
        try {
            const downloadResult = await this.s3Client.download(this.bucket, this.poolDataFileKey)
            // Convert stream to string and parse JSON
            const contentString = await this.streamToString(downloadResult.body)
            const poolData = JSON.parse(contentString)

            return {
                ...downloadResult,
                poolData
            }
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                console.log('❌ Pool file not found.')
            }
            throw error
        }
    }

    /**
     * Find an available environment of the specified type
     */
    findAvailableEnvironment(poolData) {
        const availableEnvs = poolData.environments.filter(
            (env) => env.ciAvailability === 'available'
        )

        if (availableEnvs.length === 0) {
            return null
        }

        return availableEnvs[0]
    }

    /**
     * Mark environment as in-use by current PR
     */
    updateMRTTargetStatus(poolData, environment, ciAvailability) {
        const updatedPoolData = {
            ...poolData,
            environments: poolData.environments.map((env) => {
                if (env.slug === environment.slug) {
                    const updatedEnv = {
                        ...env,
                        ciAvailability,
                        ciAcquiredAt: new Date().toISOString(),
                        ciLastUsed: new Date().toISOString()
                    }

                    if (ciAvailability === 'in-use') {
                        if (this.prNumber) updatedEnv.ciPRNumber = this.prNumber
                        if (this.branch) updatedEnv.ciBranch = this.branch
                        if (this.runId) updatedEnv.ciRunId = this.runId
                    } else if (ciAvailability === 'available') {
                        delete updatedEnv.ciPRNumber
                        delete updatedEnv.ciBranch
                        delete updatedEnv.ciRunId
                        delete updatedEnv.ciAcquiredAt
                    }

                    return updatedEnv
                }
                return env
            })
        }

        return updatedPoolData
    }

    /**
     * Get current pool status
     */
    async getPoolStatus() {
        try {
            // Step 1: Download pool file and get ETag
            const downloadResponse = await this.downloadPoolFile()

            const status = {
                total: downloadResponse.poolData.environments.length,
                available: downloadResponse.poolData.environments.filter(
                    (env) => env.ciAvailability === 'available'
                ).length,
                inUse: downloadResponse.poolData.environments.filter(
                    (env) => env.ciAvailability === 'in-use'
                ).length,
                environments: downloadResponse.poolData.environments
            }

            return status
        } catch (error) {
            console.error('❌ Failed to get pool status:', error)
            throw error
        }
    }

    /**
     * Acquire an MRT environment with optimistic locking
     * @param {string} environmentType - Type of environment to acquire (e.g., 'staging', 'production')
     * @returns {Object} - Acquired environment details
     */
    async acquireEnvironment() {
        if (!process.env.CI) {
            throw new Error(`❌ Cannot acquire environment in local development - Read only access`)
        }
        const prInfo = this.prNumber ? ` for PR #${this.prNumber}` : ` for "${this.branch}" branch`
        console.log(`🎯 Attempting to acquire environment${prInfo}`)

        let retryCount = 0

        while (retryCount < this.maxRetries) {
            try {
                console.log(`\n🔄 Attempt ${retryCount + 1}/${this.maxRetries}`)

                // Step 1: Download pool file and get ETag
                const downloadResponse = await this.downloadPoolFile()

                // Step 2: Find available environment
                const availableEnv = this.findAvailableEnvironment(downloadResponse.poolData)

                if (!availableEnv) {
                    throw new Error(`❌ No available environments found`)
                }

                // Step 3: Mark environment as in-use
                const updatedPoolData = this.updateMRTTargetStatus(
                    downloadResponse.poolData,
                    availableEnv,
                    'in-use'
                )

                // Step 4: Try to upload with ETag precondition
                await this.s3Client.upload(
                    this.bucket,
                    this.poolDataFileKey,
                    JSON.stringify(updatedPoolData, null, 2),
                    downloadResponse.etag
                )

                // Step 5: Success! Return acquired environment
                console.log(`✅ Successfully acquired environment: ${availableEnv.slug}`)
                return {
                    environment: availableEnv,
                    poolData: updatedPoolData,
                    attempt: retryCount + 1
                }
            } catch (error) {
                retryCount++

                if (error.name === 'PreconditionFailedException') {
                    console.log(`⚠️ ETag mismatch on attempt ${retryCount}, retrying...`)

                    if (retryCount < this.maxRetries) {
                        await this.sleep(this.retryDelay)
                        continue
                    } else {
                        throw new Error(
                            `❌ Failed to acquire environment after ${this.maxRetries} attempts due to concurrent modifications`
                        )
                    }
                } else {
                    // Non-retryable error
                    throw error
                }
            }
        }

        throw new Error(`❌ Failed to acquire environment after ${this.maxRetries} attempts`)
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}

async function main() {
    const program = new Command()

    program
        .description('Acquire and manage MRT environments with optimistic locking')
        .option('--max-retries <number>', 'Maximum retry attempts', '3')
        .option('--retry-delay <ms>', 'Delay between retries in milliseconds', '10000')

    program
        .command('status')
        .description('Show pool status')
        .action(async () => {
            /**
             * roleArn: [ARN - Amazon Resource Name] unique identifier for the 'Role' resource
             * that the currently authenticated AWS user assumes to get permissions defined by policies attached to the role.
             *
             * roleSessionName: Arbitrary identifier used to point out which session did certain actions originate from.
             * Typically used in logs [AWS Cloudwatch logs] like:
             * - [GithubActions-E2E-CI] Created new resource pwa-kit-ci/demo.json in S3.
             * or
             * - [LocalDev] Downloaded resource pwa-kit-ci/demo.json from S3.
             */
            const mrtTargetManager = new MRTTargetManager({
                bucket: process.env.AWS_S3_BUCKET,
                poolDataFileKey: process.env.AWS_S3_POOL_DATA_FILE_KEY,
                roleArn: process.env.AWS_ROLE_ARN,
                region: process.env.AWS_REGION,
                roleSessionName: process.env.CI ? 'GithubActions-E2E-CI' : 'LocalDev'
            })

            await mrtTargetManager.initialize()

            try {
                const status = await mrtTargetManager.getPoolStatus()

                console.log('Pool status:', JSON.stringify(status, null, 2))
            } catch (error) {
                console.error('❌ Error:', error.message)
                process.exit(1)
            }
        })

    program
        .command('acquire')
        .description('Acquire an MRT environment')
        .option('--pr-number <prNumber>', 'PR number')
        .option('--branch <branch>', 'Branch name')
        .option('--run-id <runId>', 'Run ID')
        .action(async ({prNumber, branch, runId}) => {
            const globalOpts = program.opts()

            const mrtTargetManager = new MRTTargetManager({
                bucket: process.env.AWS_S3_BUCKET,
                poolDataFileKey: process.env.AWS_S3_POOL_DATA_FILE_KEY,
                roleArn: process.env.AWS_ROLE_ARN,
                region: process.env.AWS_REGION,
                prNumber,
                branch,
                runId,
                maxRetries: parseInt(globalOpts.maxRetries),
                retryDelay: parseInt(globalOpts.retryDelay),
                roleSessionName: process.env.CI ? 'GithubActions-E2E-CI' : 'LocalDev'
            })

            await mrtTargetManager.initialize()

            await fs.ensureFile(MRT_TARGET_DETAILS_FILE)

            try {
                const result = await mrtTargetManager.acquireEnvironment()

                console.log(`Environment: ${result.environment.slug}`)
                console.log(`URL: ${result.environment.ssrExternalHostname}`)

                /**
                 * We need to write the environment details and status to a file so that the workflow can use it.
                 * Propagating outputs from node to composite actions to workflow is not robust enough.
                 */
                const mrtTargetDetails = {
                    ...result.environment,
                    status: 'ACQUIRE_TARGET_SUCCESS'
                }

                await fs.writeJson(MRT_TARGET_DETAILS_FILE, mrtTargetDetails)
            } catch (error) {
                console.error('❌ Error:', error.message)
                await fs.writeJson(MRT_TARGET_DETAILS_FILE, {
                    status: 'ACQUIRE_TARGET_FAILED',
                    error: error.message
                })
                process.exit(1)
            }
        })
    await program.parseAsync()
}

// Export for use as module
module.exports = MRTTargetManager

// Run CLI if called directly
if (require.main === module) {
    main()
}
