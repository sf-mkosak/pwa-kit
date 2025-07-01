/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {NodeTracerProvider} from '@opentelemetry/sdk-trace-node'
import {SimpleSpanProcessor} from '@opentelemetry/sdk-trace-base'
import {B3Propagator} from '@opentelemetry/propagator-b3'
import {Resource} from '@opentelemetry/resources'
import {propagation} from '@opentelemetry/api'
import logger from '../../utils/logger-instance'

const DEFAULT_SERVICE_NAME = 'pwa-kit-react-sdk'

let provider = null

/**
 * Initialize OpenTelemetry tracing for server-side rendering
 * @param {Object} options
 * @param {string} [options.serviceName]
 * @param {string} [options.serviceVersion]
 * @param {boolean} [options.enabled]
 * @returns {NodeTracerProvider|null}
 */
export const initializeServerTracing = (options = {}) => {
    const {
        serviceName = process.env.OTEL_SERVICE_NAME || DEFAULT_SERVICE_NAME,
        serviceVersion,
        enabled = process.env.OTEL_SDK_ENABLED === 'true'
    } = options

    // If tracing is disabled, return null without initializing
    if (!enabled) {
        return null
    }

    try {
        // Build resource attributes
        const resourceAttributes = {
            'service.name': serviceName
        }

        // Add service version if provided
        if (serviceVersion) {
            resourceAttributes['service.version'] = serviceVersion
        }

        // Initialize the tracer provider
        provider = new NodeTracerProvider({
            resource: new Resource(resourceAttributes),
            spanProcessor: new SimpleSpanProcessor()
        })

        // Add B3 propagator
        propagation.setGlobalPropagator(new B3Propagator())
        provider.register()

        return provider
    } catch (error) {
        // Log errors from OpenTelemetry initialization
        logger.error('Failed to initialize OpenTelemetry provider', {
            namespace: 'opentelemetry-server.initializeServerTracing',
            additionalProperties: {error: error.message}
        })
        return null
    }
}

/**
 * Shutdown OpenTelemetry tracing and clean up resources
 * @returns {Promise<void>}
 */
export const shutdownServerTracing = async () => {
    if (provider) {
        try {
            await provider.shutdown()
            provider = null // Clean up after successful shutdown
        } catch (error) {
            logger.warn('Failed to shutdown OpenTelemetry provider', {
                namespace: 'opentelemetry-server.shutdownServerTracing',
                additionalProperties: {error: error.message}
            })
        }
    }
}

/**
 * Get the current OpenTelemetry provider instance
 * @returns {NodeTracerProvider|null} The current provider or null if not initialized
 */
export const getServerTracingProvider = () => {
    return provider
}

/**
 * Check if OpenTelemetry tracing is currently initialized
 * @returns {boolean} True if tracing is initialized, false otherwise
 */
export const isServerTracingInitialized = () => {
    return provider !== null
}
