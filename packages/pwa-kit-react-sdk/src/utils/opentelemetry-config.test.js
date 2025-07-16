/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {getOTELConfig, getServiceName} from './opentelemetry-config'

// Mock the module to reset cache between tests
const mockModule = () => {
    jest.resetModules()
    return require('./opentelemetry-config')
}

describe('OpenTelemetry Config', () => {
    const originalEnv = process.env

    beforeEach(() => {
        // Reset environment variables
        process.env = {...originalEnv}

        // Clear module cache to reset _cachedConfig
        jest.resetModules()
    })

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv
    })

    describe('getOTELConfig', () => {
        describe('serviceName', () => {
            test('should return service name when OTEL_SERVICE_NAME is set', () => {
                process.env.OTEL_SERVICE_NAME = 'custom-service'

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.serviceName).toBe('custom-service')
            })

            test('should return default service name when OTEL_SERVICE_NAME is not set', () => {
                delete process.env.OTEL_SERVICE_NAME

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.serviceName).toBe('pwa-kit-react-sdk')
            })

            test('should return default service name when OTEL_SERVICE_NAME is empty string', () => {
                process.env.OTEL_SERVICE_NAME = ''

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.serviceName).toBe('pwa-kit-react-sdk')
            })
        })

        describe('enabled', () => {
            test('should return enabled when OTEL_SDK_ENABLED is "true"', () => {
                process.env.OTEL_SDK_ENABLED = 'true'

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.enabled).toBe(true)
            })

            test('should return disabled when OTEL_SDK_ENABLED is not set', () => {
                delete process.env.OTEL_SDK_ENABLED

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.enabled).toBe(false)
            })

            test('should return disabled when OTEL_SDK_ENABLED is "false"', () => {
                process.env.OTEL_SDK_ENABLED = 'false'

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.enabled).toBe(false)
            })

            test('should return disabled when OTEL_SDK_ENABLED is any non-"true" value', () => {
                const nonTrueValues = ['yes', '1', 'True', 'TRUE', 'on', 'enabled', '']

                nonTrueValues.forEach((value) => {
                    process.env.OTEL_SDK_ENABLED = value

                    const {getOTELConfig} = mockModule()
                    const config = getOTELConfig()

                    expect(config.enabled).toBe(false)
                })
            })
        })

        describe('b3TracingEnabled', () => {
            test('should return enabled when OTEL_B3_TRACING_ENABLED is "true"', () => {
                process.env.OTEL_B3_TRACING_ENABLED = 'true'

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.b3TracingEnabled).toBe(true)
            })

            test('should return disabled when OTEL_B3_TRACING_ENABLED is not set', () => {
                delete process.env.OTEL_B3_TRACING_ENABLED

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.b3TracingEnabled).toBe(false)
            })

            test('should return disabled when OTEL_B3_TRACING_ENABLED is "false"', () => {
                process.env.OTEL_B3_TRACING_ENABLED = 'false'

                const {getOTELConfig} = mockModule()
                const config = getOTELConfig()

                expect(config.b3TracingEnabled).toBe(false)
            })

            test('should return disabled when OTEL_B3_TRACING_ENABLED is any non-"true" value', () => {
                const nonTrueValues = ['yes', '1', 'True', 'TRUE', 'on', 'enabled', '']

                nonTrueValues.forEach((value) => {
                    process.env.OTEL_B3_TRACING_ENABLED = value

                    const {getOTELConfig} = mockModule()
                    const config = getOTELConfig()

                    expect(config.b3TracingEnabled).toBe(false)
                })
            })
        })
    })
})
