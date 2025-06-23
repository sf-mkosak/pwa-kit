/**
 * @jest-environment node
 */
/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// The @jest-environment comment block *MUST* be the first line of the file for the tests to pass.
// That conflicts with the monorepo header rule, so we must disable the rule!
/* eslint-disable header/header */

// Mock OpenTelemetry dependencies
jest.mock('@opentelemetry/sdk-trace-node', () => ({
    NodeTracerProvider: jest.fn()
}))

jest.mock('@opentelemetry/sdk-trace-base', () => ({
    SimpleSpanProcessor: jest.fn()
}))

jest.mock('@opentelemetry/propagator-b3', () => ({
    B3Propagator: jest.fn()
}))

jest.mock('@opentelemetry/resources', () => ({
    Resource: jest.fn()
}))

jest.mock('@opentelemetry/semantic-conventions', () => ({
    SemanticResourceAttributes: {
        SERVICE_NAME: 'service.name'
    }
}))

jest.mock('@opentelemetry/api', () => ({
    propagation: {
        setGlobalPropagator: jest.fn()
    }
}))

describe('OpenTelemetry Server Tracing', () => {
    let mockNodeTracerProvider
    let mockSimpleSpanProcessor
    let mockB3Propagator
    let mockResource
    let mockPropagation
    let consoleWarnSpy
    let initializeServerTracing
    let shutdownServerTracing
    let isServerTracingInitialized

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks()

        // Set up console.warn spy
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

        // Get mocked constructors
        /* eslint-disable @typescript-eslint/no-var-requires */
        const {NodeTracerProvider} = require('@opentelemetry/sdk-trace-node')
        const {SimpleSpanProcessor} = require('@opentelemetry/sdk-trace-base')
        const {B3Propagator} = require('@opentelemetry/propagator-b3')
        const {Resource} = require('@opentelemetry/resources')
        const {propagation} = require('@opentelemetry/api')
        const opentelemetryServer = require('./opentelemetry-server')
        /* eslint-enable @typescript-eslint/no-var-requires */

        mockNodeTracerProvider = NodeTracerProvider
        mockSimpleSpanProcessor = SimpleSpanProcessor
        mockB3Propagator = B3Propagator
        mockResource = Resource
        mockPropagation = propagation

        // Set up mock instances
        const mockProviderInstance = {
            addSpanProcessor: jest.fn(),
            register: jest.fn(),
            shutdown: jest.fn()
        }

        const mockResourceInstance = {}
        const mockSpanProcessorInstance = {}
        const mockB3PropagatorInstance = {}

        // Configure mocks
        mockNodeTracerProvider.mockImplementation(() => mockProviderInstance)
        mockResource.mockImplementation(() => mockResourceInstance)
        mockSimpleSpanProcessor.mockImplementation(() => mockSpanProcessorInstance)
        mockB3Propagator.mockImplementation(() => mockB3PropagatorInstance)

        // Import the functions after mocks are set up
        initializeServerTracing = opentelemetryServer.initializeServerTracing
        shutdownServerTracing = opentelemetryServer.shutdownServerTracing
        isServerTracingInitialized = opentelemetryServer.isServerTracingInitialized
    })

    afterEach(async () => {
        consoleWarnSpy.mockRestore()

        // Clean up any existing provider
        if (shutdownServerTracing) {
            await shutdownServerTracing()
        }

        // Reset module state to ensure clean state between tests
        jest.resetModules()
    })

    describe('initializeServerTracing', () => {
        test('should successfully initialize OpenTelemetry tracing', () => {
            const result = initializeServerTracing()

            // Verify NodeTracerProvider was called with correct resource
            expect(mockNodeTracerProvider).toHaveBeenCalledWith({
                resource: expect.any(Object)
            })

            // Verify Resource was created with correct service name
            expect(mockResource).toHaveBeenCalledWith({
                'service.name': 'pwa-kit-react-sdk'
            })

            // Verify span processor was added
            expect(mockSimpleSpanProcessor).toHaveBeenCalled()
            expect(result.addSpanProcessor).toHaveBeenCalledWith(expect.any(Object))

            // Verify B3 propagator was set globally
            expect(mockB3Propagator).toHaveBeenCalled()
            expect(mockPropagation.setGlobalPropagator).toHaveBeenCalledWith(expect.any(Object))

            // Verify provider was registered
            expect(result.register).toHaveBeenCalled()

            // Verify the provider was returned
            expect(result).toBeDefined()

            // Verify initialization state
            expect(isServerTracingInitialized()).toBe(true)
        })

        test('should handle initialization errors gracefully', () => {
            // Mock NodeTracerProvider to throw an error
            mockNodeTracerProvider.mockImplementation(() => {
                throw new Error('OpenTelemetry initialization failed')
            })

            const result = initializeServerTracing()

            // Verify error was logged
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to initialize OpenTelemetry provider:',
                'OpenTelemetry initialization failed'
            )

            // Verify null was returned
            expect(result).toBeNull()

            // Verify initialization state
            expect(isServerTracingInitialized()).toBe(false)
        })

        test('should handle resource creation errors', () => {
            // Mock Resource to throw an error
            mockResource.mockImplementation(() => {
                throw new Error('Resource creation failed')
            })

            const result = initializeServerTracing()

            // Verify error was logged
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to initialize OpenTelemetry provider:',
                'Resource creation failed'
            )

            // Verify null was returned
            expect(result).toBeNull()
        })

        test('should handle provider registration errors', () => {
            // Set up mock provider that throws on register
            const mockProviderInstance = {
                addSpanProcessor: jest.fn(),
                register: jest.fn().mockImplementation(() => {
                    throw new Error('Provider registration failed')
                }),
                shutdown: jest.fn()
            }
            mockNodeTracerProvider.mockImplementation(() => mockProviderInstance)

            const result = initializeServerTracing()

            // Verify error was logged
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to initialize OpenTelemetry provider:',
                'Provider registration failed'
            )

            // Verify null was returned
            expect(result).toBeNull()
        })
    })

    describe('shutdownServerTracing', () => {
        test('should successfully shutdown OpenTelemetry provider when provider exists', async () => {
            // First initialize to create a provider
            const provider = initializeServerTracing()
            expect(provider).toBeDefined()

            // Then shutdown
            await shutdownServerTracing()

            // Verify shutdown was called
            expect(provider.shutdown).toHaveBeenCalled()

            // Verify provider is cleaned up
            expect(isServerTracingInitialized()).toBe(false)
        })

        test('should handle shutdown when no provider exists', async () => {
            // Don't initialize first, so no provider exists
            expect(isServerTracingInitialized()).toBe(false)

            await shutdownServerTracing()

            // Verify no error was logged (graceful handling)
            expect(consoleWarnSpy).not.toHaveBeenCalled()
        })

        test('should handle shutdown errors gracefully', async () => {
            // Set up mock provider that throws on shutdown
            const mockProviderInstance = {
                addSpanProcessor: jest.fn(),
                register: jest.fn(),
                shutdown: jest.fn().mockRejectedValue(new Error('Shutdown failed'))
            }
            mockNodeTracerProvider.mockImplementation(() => mockProviderInstance)

            // Initialize to create provider
            const provider = initializeServerTracing()
            expect(provider).toBeDefined()

            // Shutdown should not throw
            await expect(shutdownServerTracing()).resolves.not.toThrow()

            // Verify error was logged
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to shutdown OpenTelemetry provider:',
                'Shutdown failed'
            )
        })
    })

    describe('isServerTracingInitialized', () => {
        test('should return true when provider is initialized', () => {
            initializeServerTracing()
            expect(isServerTracingInitialized()).toBe(true)
        })

        test('should return false when not initialized', () => {
            expect(isServerTracingInitialized()).toBe(false)
        })

        test('should return false after shutdown', async () => {
            initializeServerTracing()
            expect(isServerTracingInitialized()).toBe(true)

            await shutdownServerTracing()
            expect(isServerTracingInitialized()).toBe(false)
        })
    })

    describe('integration scenarios', () => {
        test('should handle complete lifecycle: initialize -> shutdown', async () => {
            // Initialize
            const provider = initializeServerTracing()
            expect(provider).toBeDefined()
            expect(isServerTracingInitialized()).toBe(true)

            // Verify all setup was done
            expect(mockNodeTracerProvider).toHaveBeenCalled()
            expect(mockResource).toHaveBeenCalled()
            expect(mockSimpleSpanProcessor).toHaveBeenCalled()
            expect(mockB3Propagator).toHaveBeenCalled()
            expect(mockPropagation.setGlobalPropagator).toHaveBeenCalled()
            expect(provider.register).toHaveBeenCalled()

            // Shutdown
            await shutdownServerTracing()
            expect(provider.shutdown).toHaveBeenCalled()
            expect(isServerTracingInitialized()).toBe(false)
        })

        test('should handle failed initialization followed by shutdown', async () => {
            // Mock initialization to fail
            mockNodeTracerProvider.mockImplementation(() => {
                throw new Error('Initialization failed')
            })

            // Initialize should fail
            const provider = initializeServerTracing()
            expect(provider).toBeNull()
            expect(isServerTracingInitialized()).toBe(false)
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to initialize OpenTelemetry provider:',
                'Initialization failed'
            )

            // Shutdown should still work gracefully
            await expect(shutdownServerTracing()).resolves.not.toThrow()
        })
    })
})
