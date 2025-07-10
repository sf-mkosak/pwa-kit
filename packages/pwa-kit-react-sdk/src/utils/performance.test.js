/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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

    describe('cleanup functionality', () => {
        test('cleanup clears all spans', () => {
            const timer = new PerformanceTimer({enabled: true})
            timer.mark('test1', 'start')
            timer.mark('test2', 'start')
            timer.mark('test3', 'start')

            expect(timer.spans.size).toBe(3)

            timer.cleanup()

            expect(timer.spans.size).toBe(0)
        })

        test('cleanup clears all timeouts', () => {
            const timer = new PerformanceTimer({enabled: true})
            timer.mark('test1', 'start')
            timer.mark('test2', 'start')

            expect(timer.spanTimeouts.size).toBe(2)

            timer.cleanup()

            expect(timer.spanTimeouts.size).toBe(0)
        })

        test('cleanup clears all metrics', () => {
            const timer = new PerformanceTimer({enabled: true})
            timer.mark('test1', 'start')
            timer.mark('test1', 'end')
            timer.mark('test2', 'start')
            timer.mark('test2', 'end')

            expect(timer.metrics).toHaveLength(2)

            timer.cleanup()

            expect(timer.metrics).toHaveLength(0)
        })

        test('cleanup works when there are no spans/timeouts/metrics', () => {
            const timer = new PerformanceTimer({enabled: true})

            expect(() => {
                timer.cleanup()
            }).not.toThrow()

            expect(timer.spans.size).toBe(0)
            expect(timer.spanTimeouts.size).toBe(0)
            expect(timer.metrics).toHaveLength(0)
        })

        test('cleanup works when timer is disabled', () => {
            const timer = new PerformanceTimer({enabled: false})
            timer.mark('test', 'start') // This won't create anything since disabled

            expect(() => {
                timer.cleanup()
            }).not.toThrow()

            expect(timer.spans.size).toBe(0)
            expect(timer.spanTimeouts.size).toBe(0)
            expect(timer.metrics).toHaveLength(0)
        })
    })

    describe('timeout and orphaned span handling', () => {
        beforeEach(() => {
            jest.useFakeTimers()
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        test('orphaned spans are cleaned up after maxSpanDuration', () => {
            const timer = new PerformanceTimer({enabled: true, maxSpanDuration: 1000})
            const cleanupSpy = jest.spyOn(timer, '_cleanupOrphanedSpan')

            timer.mark('test', 'start')

            expect(timer.spans.size).toBe(1)
            expect(timer.spanTimeouts.size).toBe(1)

            // Fast forward time to trigger timeout
            jest.advanceTimersByTime(1001)

            expect(cleanupSpy).toHaveBeenCalledWith('test', 'timeout')
            expect(timer.spans.size).toBe(0)
            expect(timer.spanTimeouts.size).toBe(0)
        })

        test('timeouts are cleared when spans end normally', () => {
            const timer = new PerformanceTimer({enabled: true, maxSpanDuration: 1000})
            const cleanupSpy = jest.spyOn(timer, '_cleanupOrphanedSpan')

            timer.mark('test', 'start')
            timer.mark('test', 'end')

            expect(timer.spans.size).toBe(0)
            expect(timer.spanTimeouts.size).toBe(0)

            // Fast forward time - should not trigger cleanup since span ended normally
            jest.advanceTimersByTime(1001)

            expect(cleanupSpy).not.toHaveBeenCalled()
        })

        test('multiple spans can have independent timeouts', () => {
            const timer = new PerformanceTimer({enabled: true, maxSpanDuration: 1000})
            const cleanupSpy = jest.spyOn(timer, '_cleanupOrphanedSpan')

            timer.mark('test1', 'start')
            timer.mark('test2', 'start')
            timer.mark('test3', 'start')

            expect(timer.spans.size).toBe(3)
            expect(timer.spanTimeouts.size).toBe(3)

            // End one span normally
            timer.mark('test2', 'end')
            expect(timer.spans.size).toBe(2)
            expect(timer.spanTimeouts.size).toBe(2)

            // Trigger timeouts for remaining spans
            jest.advanceTimersByTime(1001)

            expect(cleanupSpy).toHaveBeenCalledTimes(2)
            expect(cleanupSpy).toHaveBeenCalledWith('test1', 'timeout')
            expect(cleanupSpy).toHaveBeenCalledWith('test3', 'timeout')
            expect(timer.spans.size).toBe(0)
            expect(timer.spanTimeouts.size).toBe(0)
        })

        test('cleanup clears all timeouts to prevent them from firing', () => {
            const timer = new PerformanceTimer({enabled: true, maxSpanDuration: 1000})
            const cleanupSpy = jest.spyOn(timer, '_cleanupOrphanedSpan')

            timer.mark('test1', 'start')
            timer.mark('test2', 'start')

            // Cleanup before timeouts fire
            timer.cleanup()

            // Fast forward time - timeouts should not fire since they were cleared
            jest.advanceTimersByTime(1001)

            // _cleanupOrphanedSpan should only be called from cleanup, not from timeouts
            expect(cleanupSpy).toHaveBeenCalledTimes(2)
            expect(cleanupSpy).toHaveBeenCalledWith('test1', 'manual_cleanup')
            expect(cleanupSpy).toHaveBeenCalledWith('test2', 'manual_cleanup')
        })
    })

    test('log can be called multiple times', () => {
        const timer = new PerformanceTimer({enabled: true})
        timer.mark('test', 'start')
        timer.mark('test', 'end')

        expect(() => {
            timer.log()
            timer.log()
            timer.log()
        }).not.toThrow()
    })
})
