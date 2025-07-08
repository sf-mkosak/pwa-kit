/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Mock OpenTelemetry functions BEFORE any imports
jest.mock('./opentelemetry', () => ({
    createChildSpan: jest.fn((name, attributes) => ({
        spanContext: () => ({
            traceId: 'test-trace-id',
            spanId: 'test-span-id'
        }),
        name,
        attributes,
        end: jest.fn()
    })),
    endSpan: jest.fn(),
    logPerformanceMetric: jest.fn()
}))

/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// The @jest-environment comment block *MUST* be the first line of the file for the tests to pass.
// That conflicts with the monorepo header rule, so we must disable the rule!

import PerformanceTimer from './performance'

describe('PerformanceTimer', () => {
    test('is disabled by default', () => {
        const timer = new PerformanceTimer()
        timer.mark('test', 'start')
        expect(timer.spans.size).toBe(0)
    })

    test('can be enabled', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        expect(timer.spans.size).toBe(1)
        expect(timer.spans.has('test')).toBe(true)
    })

    test('spans can be added for both types', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        timer.mark('test', 'end')
        expect(timer.spans.size).toBe(0)
        expect(timer.metrics).toHaveLength(1)
    })

    test('measurements are created when a pair of marks is added', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        timer.mark('test', 'end')
        expect(timer.metrics).toHaveLength(1)
        expect(timer.metrics[0].name).toBe('test')
        expect(parseFloat(timer.metrics[0].duration)).toBeGreaterThan(0)
    })
})
