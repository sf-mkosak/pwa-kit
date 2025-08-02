const SecureS3Client = require('./aws-s3-client')
const {Command} = require('commander')

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
            roleArn: process.env.CI ? null : options.roleArn, // Don't use role ARN in CI since AWS credentials action handles it
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
        const availableEnvs = poolData.environments.filter((env) => env.status === 'available')

        if (availableEnvs.length === 0) {
            return null
        }

        return availableEnvs[0]
    }

    /**
     * Mark environment as in-use by current PR
     */
    updateMRTTargetStatus(poolData, environment, status) {
        const updatedPoolData = {
            ...poolData,
            environments: poolData.environments.map((env) => {
                if (env.mrtEnvId === environment.mrtEnvId) {
                    const updatedEnv = {
                        ...env,
                        status,
                        acquiredAt: new Date().toISOString(),
                        lastUsed: new Date().toISOString()
                    }

                    if (status === 'in-use') {
                        // Add PR, branch, and action info when marking as in-use
                        if (this.prNumber) updatedEnv.prNumber = this.prNumber
                        if (this.branch) updatedEnv.branch = this.branch
                        if (this.runId) updatedEnv.runId = this.runId
                    } else if (status === 'available') {
                        // Remove PR, branch, and action info when marking as available
                        delete updatedEnv.prNumber
                        delete updatedEnv.branch
                        delete updatedEnv.runId
                        delete updatedEnv.acquiredAt
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
                    (env) => env.status === 'available'
                ).length,
                inUse: downloadResponse.poolData.environments.filter(
                    (env) => env.status === 'in-use'
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
        console.log("Read only 1", process.env.CI, !process.env.CI)
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
                console.log(`✅ Successfully acquired environment: ${availableEnv.mrtEnvId}`)
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
     * Release an environment back to the pool
     */
    async releaseEnvironment(mrtEnvId) {
        if (!process.env.CI) {
            throw new Error(`❌ Cannot release environment in local development - Read only access`)
        }
        console.log(`🔓 Releasing environment: ${mrtEnvId}`)

        let retryCount = 0

        while (retryCount < this.maxRetries) {
            try {
                // Step 1: Download pool file and get ETag
                const downloadResponse = await this.downloadPoolFile()
                const poolData = downloadResponse.poolData

                const envToRelease = poolData.environments.find((env) => env.mrtEnvId === mrtEnvId)

                if (!envToRelease) {
                    throw new Error(`❌ Environment ${mrtEnvId} not found`)
                }

                // Step 3: Mark environment as in-use
                const updatedPoolData = this.updateMRTTargetStatus(
                    downloadResponse.poolData,
                    envToRelease,
                    'available'
                )

                await this.s3Client.upload(
                    this.bucket,
                    this.poolDataFileKey,
                    JSON.stringify(updatedPoolData, null, 2),
                    poolData.etag
                )

                console.log(`✅ Successfully released environment: ${mrtEnvId}`)
                return true
            } catch (error) {
                retryCount++

                if (error.name === 'PreconditionFailedException') {
                    console.log(`⚠️ ETag mismatch on release attempt ${retryCount}, retrying...`)

                    if (retryCount < this.maxRetries) {
                        await this.sleep(this.retryDelay)
                        continue
                    } else {
                        throw new Error(
                            `❌ Failed to release environment after ${this.maxRetries} attempts`
                        )
                    }
                } else {
                    throw error
                }
            }
        }

        throw new Error(`❌ Failed to release environment after ${this.maxRetries} attempts`)
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
        .option('--pr-number <pr-number>', 'PR number')
        .option('--branch <branch>', 'Branch name')
        .option('--run-id <runId>', 'Run ID')
        .option('--max-retries <number>', 'Maximum retry attempts', '3')
        .option('--retry-delay <ms>', 'Delay between retries in milliseconds', '10000')

    program
        .command('status')
        .description('Show pool status')
        .action(async () => {
            const mrtTargetManager = new MRTTargetManager({
                bucket: process.env.AWS_S3_BUCKET,
                poolDataFileKey: process.env.AWS_S3_POOL_DATA_FILE_KEY,
                roleArn: process.env.AWS_ROLE_ARN,
                region: process.env.AWS_REGION,
                roleSessionName: process.env.CI ? 'GithubActions E2E CI' : 'LocalDev'
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
        .action(async () => {
            const globalOpts = program.opts()

            const mrtTargetManager = new MRTTargetManager({
                bucket: process.env.AWS_S3_BUCKET,
                poolDataFileKey: process.env.AWS_S3_POOL_DATA_FILE_KEY,
                roleArn: process.env.AWS_ROLE_ARN,
                region: process.env.AWS_REGION,
                prNumber: globalOpts.prNumber,
                branch: globalOpts.branch,
                runId: globalOpts.runId,
                maxRetries: parseInt(globalOpts.maxRetries),
                retryDelay: parseInt(globalOpts.retryDelay),
                roleSessionName: process.env.CI ? 'GithubActions E2E CI' : 'LocalDev'
            })

            await mrtTargetManager.initialize()

            try {
                const result = await mrtTargetManager.acquireEnvironment()

                console.log(`Environment: ${result.environment.mrtEnvId}`)
                console.log(`URL: ${result.environment.envURL}`)

                // Output for GitHub Actions
                console.log(`::set-output name=mrt_env_id::${result.environment.mrtEnvId}`)
                console.log(`::set-output name=mrt_env_url::${result.environment.envURL}`)
                console.log(`::set-output name=status::success`)
            } catch (error) {
                console.error('❌ Error:', error.message)
                process.exit(1)
            }
        })

    // Release command
    program
        .command('release')
        .description('Release an MRT environment')
        .argument('<mrtEnvId>', 'Environment Id to release')
        .option('--max-retries <number>', 'Maximum retry attempts', '3')
        .option('--retry-delay <ms>', 'Delay between retries in milliseconds', '10000')
        .action(async (mrtEnvId) => {
            const globalOpts = program.opts()

            const mrtTargetManager = new MRTTargetManager({
                bucket: process.env.AWS_S3_BUCKET,
                poolDataFileKey: process.env.AWS_S3_POOL_DATA_FILE_KEY,
                roleArn: process.env.AWS_ROLE_ARN,
                region: process.env.AWS_REGION,
                maxRetries: parseInt(globalOpts.maxRetries),
                retryDelay: parseInt(globalOpts.retryDelay),
                roleSessionName: process.env.CI ? 'GithubActions E2E CI' : 'LocalDev'
            })

            await mrtTargetManager.initialize()

            try {
                await mrtTargetManager.releaseEnvironment(mrtEnvId)
            } catch (error) {
                console.error('❌ Error:', error.message)
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
