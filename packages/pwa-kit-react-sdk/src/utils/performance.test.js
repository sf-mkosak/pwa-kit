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

    test('spans are removed when the end mark is added', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        timer.mark('test', 'end')
        expect(timer.spans.size).toBe(0)
    })

    test('measurements are created when a pair of marks is added', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        timer.mark('test', 'end')
        expect(timer.metrics).toHaveLength(1)
        expect(timer.metrics[0].name).toBe('test')
        expect(parseFloat(timer.metrics[0].duration)).toBeGreaterThan(0)
    })

    test('handles multiple measurements', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test1', 'start')
        timer.mark('test1', 'end')
        timer.mark('test2', 'start')
        timer.mark('test2', 'end')

        expect(timer.metrics).toHaveLength(2)
        expect(timer.metrics[0].name).toBe('test1')
        expect(timer.metrics[1].name).toBe('test2')
        expect(timer.spans.size).toBe(0)
    })

    test('handles string detail correctly', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start', {detail: 'test detail'})
        timer.mark('test', 'end', {detail: 'end detail'})

        expect(timer.metrics).toHaveLength(1)
        expect(timer.metrics[0].detail).toBe('end detail')
    })

    test('handles object detail correctly', () => {
        const timer = new PerformanceTimer({enabled: true})
        const detailObj = {key: 'value', nested: {data: 123}}
        timer.mark('test', 'start', {detail: detailObj})
        timer.mark('test', 'end', {detail: detailObj})

        expect(timer.metrics).toHaveLength(1)
        expect(timer.metrics[0].detail).toBe(JSON.stringify(detailObj))
    })

    test('buildServerTimingHeader returns empty string for no metrics', () => {
        const timer = new PerformanceTimer({enabled: true})
        expect(timer.buildServerTimingHeader()).toBe('')
    })

    test('buildServerTimingHeader formats metrics correctly', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test1', 'start')
        timer.mark('test1', 'end')
        timer.mark('test2', 'start')
        timer.mark('test2', 'end')

        const header = timer.buildServerTimingHeader()
        expect(header).toMatch(/test1;dur=\d+\.\d+/)
        expect(header).toMatch(/test2;dur=\d+\.\d+/)
        expect(header).toContain(', ')
    })

    test('log method clears metrics after logging', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        timer.mark('test', 'end')

        expect(timer.metrics).toHaveLength(1)
        timer.log()
        expect(timer.metrics).toHaveLength(0)
    })

    test('handles end mark without start mark gracefully', () => {
        const timer = new PerformanceTimer({enabled: true})

        // This should not throw, but should log a warning
        expect(() => {
            timer.mark('test', 'end')
        }).not.toThrow()

        expect(timer.metrics).toHaveLength(0)
        expect(timer.spans.size).toBe(0)
    })

    test('handles start mark without end mark', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')

        expect(timer.spans.size).toBe(1)
        expect(timer.metrics).toHaveLength(0)
    })

    test('ignores marks when disabled', () => {
        const timer = new PerformanceTimer({enabled: false})
        timer.mark('test', 'start')
        timer.mark('test', 'end')

        expect(timer.spans.size).toBe(0)
        expect(timer.metrics).toHaveLength(0)
    })

    test('ignores marks with empty name', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('', 'start')
        timer.mark(null, 'start')
        timer.mark(undefined, 'start')

        expect(timer.spans.size).toBe(0)
        expect(timer.metrics).toHaveLength(0)
    })

    test('ignores marks with empty type', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', '')
        timer.mark('test', null)
        timer.mark('test', undefined)

        expect(timer.spans.size).toBe(0)
        expect(timer.metrics).toHaveLength(0)
    })

    test('creates spans only for start marks', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test1', 'start')
        timer.mark('test2', 'start')

        expect(timer.spans.size).toBe(2)
        expect(timer.spans.has('test1')).toBe(true)
        expect(timer.spans.has('test2')).toBe(true)
    })

    test('does not create duplicate spans for same name', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        timer.mark('test', 'start') // Duplicate

        expect(timer.spans.size).toBe(1)
        expect(timer.spans.has('test')).toBe(true)
    })

    test('works with default options', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start') // No options parameter
        timer.mark('test', 'end')

        expect(timer.metrics).toHaveLength(1)
        expect(timer.metrics[0].detail).toBe('')
    })

    test('preserves detail from end mark in metrics', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start', {detail: 'start detail'})
        timer.mark('test', 'end', {detail: 'end detail'})

        expect(timer.metrics).toHaveLength(1)
        expect(timer.metrics[0].detail).toBe('end detail')
    })
})
