const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
    HeadObjectCommand
} = require('@aws-sdk/client-s3')
const {STSClient, AssumeRoleCommand} = require('@aws-sdk/client-sts')

class SecureS3Client {
    constructor(options = {}) {
        this.roleArn = options.roleArn
        this.roleSessionName = options.roleSessionName || 'S3Session'
        this.region = options.region || 'us-east-1'
        this.isReadOnly = options.readOnly || false
        this.credentials = null
    }

    async initialize() {
        // If role ARN is provided, assume the role
        if (this.roleArn) {
            await this._assumeRole()
        }

        // Create S3 client after role assumption
        this.s3 = new S3Client({
            region: this.region,
            credentials: this.credentials
        })

        console.log(`🔐 Using ${this.isReadOnly ? 'READ-ONLY' : 'READ-WRITE'} access`)
    }

    async _assumeRole() {
        try {
            const sts = new STSClient({region: this.region})
            const command = new AssumeRoleCommand({
                RoleArn: this.roleArn,
                RoleSessionName: this.roleSessionName,
                DurationSeconds: 3600,
                ExternalId: 'developer-access'
            })

            const data = await sts.send(command)

            this.credentials = {
                accessKeyId: data.Credentials.AccessKeyId,
                secretAccessKey: data.Credentials.SecretAccessKey,
                sessionToken: data.Credentials.SessionToken
            }

            console.log('✅ Successfully assumed role')
        } catch (error) {
            console.error('❌ Failed to assume role:', error)
            throw error
        }
    }

    async upload(bucket, key, body, expectedETag = null) {
        if (this.isReadOnly) {
            throw new Error('❌ Upload not allowed - read-only access')
        }

        try {
            console.log(
                `📤 Uploading to s3://${bucket}/${key}${
                    expectedETag ? ` with expected ETag: ${expectedETag}` : ''
                }`
            )

            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ...(expectedETag && {IfMatch: expectedETag}) // Only include IfMatch if expectedETag is provided
            })

            const result = await this.s3.send(command)

            console.log('✅ Upload successful')
            return result
        } catch (error) {
            if (error.name === 'PreconditionFailedException') {
                console.error(
                    '❌ Upload failed: ETag mismatch - file was modified by another process'
                )
            }
            console.error('❌ Upload failed:', error)
            throw error
        }
    }

    async download(bucket, key) {
        try {
            console.log(`📥 Downloading from s3://${bucket}/${key}`)

            const command = new GetObjectCommand({
                Bucket: bucket,
                Key: key
            })

            const result = await this.s3.send(command)

            console.log('✅ Download successful')
            return {
                body: result.Body,
                etag: result.ETag,
                lastModified: result.LastModified,
                contentType: result.ContentType,
                contentLength: result.ContentLength
            }
        } catch (error) {
            console.error('❌ Download failed:', error)
            throw error
        }
    }

    async listFiles(bucket, prefix = '') {
        try {
            console.log(`📋 Listing files in s3://${bucket}/${prefix}`)

            const command = new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix
            })

            const result = await this.s3.send(command)

            console.log('✅ List successful')
            return result.Contents || []
        } catch (error) {
            console.error('❌ List failed:', error)
            throw error
        }
    }

    async getETag(bucket, key) {
        try {
            console.log(`🏷️ Getting ETag for s3://${bucket}/${key}`)

            const command = new HeadObjectCommand({
                Bucket: bucket,
                Key: key
            })

            const result = await this.s3.send(command)

            console.log('✅ ETag retrieved:', result.ETag)
            return result.ETag
        } catch (error) {
            console.error('❌ ETag retrieval failed:', error)
            throw error
        }
    }

    async delete(bucket, key) {
        if (this.isReadOnly) {
            throw new Error('❌ Delete not allowed - read-only access')
        }

        try {
            console.log(`🗑️ Deleting s3://${bucket}/${key}`)

            const command = new DeleteObjectCommand({
                Bucket: bucket,
                Key: key
            })

            const result = await this.s3.send(command)

            console.log('✅ Delete successful')
            return result
        } catch (error) {
            console.error('❌ Delete failed:', error)
            throw error
        }
    }
}

module.exports = SecureS3Client
