/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React from 'react'
import {screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {renderWithProviders} from '@salesforce/retail-react-app/app/utils/test-utils'
import StoreDisplay from '@salesforce/retail-react-app/app/components/store-display/index'

// Mock useBreakpointValue to always return true for desktop layout
jest.mock('@salesforce/retail-react-app/app/components/shared/ui', () => {
    const actual = jest.requireActual('@salesforce/retail-react-app/app/components/shared/ui')
    return {
        ...actual,
        useBreakpointValue: jest.fn(() => true)
    }
})

const mockStore = {
    id: 'store-123',
    name: 'Downtown Store',
    address1: '123 Main Street',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94105',
    phone: '(555) 123-4567',
    c_customerServiceEmail: 'store@example.com',
    storeHours:
        'Monday - Friday: 9:00 AM - 8:00 PM\nSaturday: 10:00 AM - 6:00 PM\nSunday: 12:00 PM - 5:00 PM',
    distance: 2.5,
    distanceUnit: 'miles'
}

describe('StoreDisplay component', () => {
    test('renders all store information by default', () => {
        renderWithProviders(<StoreDisplay store={mockStore} />)

        // Store name
        expect(screen.getByText('Downtown Store')).toBeInTheDocument()

        // Address
        expect(screen.getByText('123 Main Street')).toBeInTheDocument()
        expect(screen.getByText('San Francisco, CA 94105')).toBeInTheDocument()

        // Phone - using regex to match across DOM elements
        expect(screen.getByText(/Phone:/)).toBeInTheDocument()
        expect(screen.getByText(/\(555\) 123-4567/)).toBeInTheDocument()

        // Email - using regex to match across DOM elements
        expect(screen.getByText(/Email:/)).toBeInTheDocument()
        expect(screen.getByText(/store@example\.com/)).toBeInTheDocument()

        // Store hours accordion button
        expect(screen.getByText('Store Hours')).toBeInTheDocument()
    })

    test('renders store without optional fields', () => {
        const storeWithoutOptionalFields = {
            id: 'store-456',
            name: 'Simple Store',
            address1: '456 Oak Avenue',
            city: 'Los Angeles',
            stateCode: 'CA',
            postalCode: '90210'
        }

        renderWithProviders(<StoreDisplay store={storeWithoutOptionalFields} />)

        expect(screen.getByText('Simple Store')).toBeInTheDocument()
        expect(screen.getByText('456 Oak Avenue')).toBeInTheDocument()
        expect(screen.getByText('Los Angeles, CA 90210')).toBeInTheDocument()

        // Should not render optional fields
        expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Email:/)).not.toBeInTheDocument()
        expect(screen.queryByText('Store Hours')).not.toBeInTheDocument()
    })

    test('renders store without stateCode', () => {
        const storeWithoutStateCode = {
            ...mockStore,
            stateCode: null
        }

        renderWithProviders(<StoreDisplay store={storeWithoutStateCode} />)

        expect(screen.getByText(/San Francisco.*94105/)).toBeInTheDocument()
    })

    test('renders store without name', () => {
        const storeWithoutName = {
            ...mockStore,
            name: null
        }

        renderWithProviders(<StoreDisplay store={storeWithoutName} />)

        expect(screen.queryByText('Downtown Store')).not.toBeInTheDocument()
        expect(screen.getByText('123 Main Street')).toBeInTheDocument()
    })

    test('renders distance when showDistance is true', () => {
        renderWithProviders(<StoreDisplay store={mockStore} showDistance={true} />)

        expect(screen.getByText('2.5 miles away')).toBeInTheDocument()
    })

    test('does not render distance when showDistance is false', () => {
        renderWithProviders(<StoreDisplay store={mockStore} showDistance={false} />)

        expect(screen.queryByText('2.5 miles away')).not.toBeInTheDocument()
    })

    test('does not render distance when distance is undefined', () => {
        const storeWithoutDistance = {
            ...mockStore,
            distance: undefined
        }

        renderWithProviders(<StoreDisplay store={storeWithoutDistance} showDistance={true} />)

        expect(screen.queryByText('away')).not.toBeInTheDocument()
    })

    test('does not render phone when showPhone is false', () => {
        renderWithProviders(<StoreDisplay store={mockStore} showPhone={false} />)

        expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/\(555\) 123-4567/)).not.toBeInTheDocument()
    })

    test('does not render email when showEmail is false', () => {
        renderWithProviders(<StoreDisplay store={mockStore} showEmail={false} />)

        expect(screen.queryByText(/Email:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/store@example\.com/)).not.toBeInTheDocument()
    })

    test('does not render store hours when showStoreHours is false', () => {
        renderWithProviders(<StoreDisplay store={mockStore} showStoreHours={false} />)

        expect(screen.queryByText('Store Hours')).not.toBeInTheDocument()
    })

    test('expands and collapses store hours accordion', async () => {
        const user = userEvent.setup()
        renderWithProviders(<StoreDisplay store={mockStore} />)

        const storeHoursButton = screen.getByRole('button', {name: /store hours/i})
        expect(storeHoursButton).toBeInTheDocument()

        // Check that button is initially not expanded
        expect(storeHoursButton).toHaveAttribute('aria-expanded', 'false')

        // Click to expand accordion
        await user.click(storeHoursButton)

        // Check that button is now expanded and content is accessible
        expect(storeHoursButton).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByText(/Monday - Friday: 9:00 AM - 8:00 PM/)).toBeInTheDocument()

        // Click to collapse accordion
        await user.click(storeHoursButton)

        // Check that button is collapsed again
        expect(storeHoursButton).toHaveAttribute('aria-expanded', 'false')
    })

    test('renders nothing when store is null', () => {
        renderWithProviders(<StoreDisplay store={null} />)

        // Should not render any store information
        expect(screen.queryByText('Downtown Store')).not.toBeInTheDocument()
        expect(screen.queryByText('123 Main Street')).not.toBeInTheDocument()
        expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Email:/)).not.toBeInTheDocument()
    })

    test('renders nothing when store is undefined', () => {
        renderWithProviders(<StoreDisplay store={undefined} />)

        // Should not render any store information
        expect(screen.queryByText('Downtown Store')).not.toBeInTheDocument()
        expect(screen.queryByText('123 Main Street')).not.toBeInTheDocument()
        expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Email:/)).not.toBeInTheDocument()
    })

    test('has correct id attribute', () => {
        renderWithProviders(<StoreDisplay store={mockStore} />)

        const storeContainer = screen.getByText('Downtown Store').closest('[id]')
        expect(storeContainer).toHaveAttribute('id', 'store-info-store-123')
    })

    test('renders component structure correctly', () => {
        renderWithProviders(<StoreDisplay store={mockStore} />)

        // Check that store name is rendered as separate element
        const storeName = screen.getByText('Downtown Store')
        expect(storeName).toBeInTheDocument()

        // Check that address elements are rendered
        const address1 = screen.getByText('123 Main Street')
        expect(address1).toBeInTheDocument()

        const cityStateZip = screen.getByText('San Francisco, CA 94105')
        expect(cityStateZip).toBeInTheDocument()
    })

    test('renders with all optional props set to false', () => {
        renderWithProviders(
            <StoreDisplay
                store={mockStore}
                showDistance={false}
                showStoreHours={false}
                showPhone={false}
                showEmail={false}
            />
        )

        // Should still render basic store info
        expect(screen.getByText('Downtown Store')).toBeInTheDocument()
        expect(screen.getByText('123 Main Street')).toBeInTheDocument()
        expect(screen.getByText('San Francisco, CA 94105')).toBeInTheDocument()

        // Should not render optional sections
        expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Email:/)).not.toBeInTheDocument()
        expect(screen.queryByText('Store Hours')).not.toBeInTheDocument()
        expect(screen.queryByText('away')).not.toBeInTheDocument()
    })

    test('renders store hours accordion as button', () => {
        renderWithProviders(<StoreDisplay store={mockStore} />)

        const storeHoursButton = screen.getByRole('button', {name: /store hours/i})
        expect(storeHoursButton).toBeInTheDocument()
    })

    test('handles missing distanceUnit gracefully', () => {
        const storeWithoutDistanceUnit = {
            ...mockStore,
            distanceUnit: undefined
        }

        renderWithProviders(<StoreDisplay store={storeWithoutDistanceUnit} showDistance={true} />)

        expect(screen.getByText(/2\.5.*away/)).toBeInTheDocument()
    })

    test('renders with empty string values', () => {
        const storeWithEmptyStrings = {
            id: 'store-789',
            name: '',
            address1: '789 Empty Street',
            city: 'Empty City',
            stateCode: '',
            postalCode: '12345',
            phone: '',
            c_customerServiceEmail: '',
            storeHours: ''
        }

        renderWithProviders(<StoreDisplay store={storeWithEmptyStrings} />)

        // Should render address
        expect(screen.getByText('789 Empty Street')).toBeInTheDocument()
        expect(screen.getByText(/Empty City.*12345/)).toBeInTheDocument()

        // Should not render empty phone or email
        expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Email:/)).not.toBeInTheDocument()
    })

    describe('Change Store Button', () => {
        test('renders Change Store button when onChangeStore is provided', () => {
            const mockOnChangeStore = jest.fn()
            renderWithProviders(
                <StoreDisplay store={mockStore} onChangeStore={mockOnChangeStore} />
            )

            const changeStoreButton = screen.getByTestId('change-store-button')
            expect(changeStoreButton).toBeInTheDocument()
            expect(changeStoreButton).toHaveTextContent('Use Recent Store')
        })

        test('does not render Change Store button when onChangeStore is not provided', () => {
            renderWithProviders(<StoreDisplay store={mockStore} />)

            expect(screen.queryByTestId('change-store-button')).not.toBeInTheDocument()
        })

        test('calls onChangeStore when Change Store button is clicked', async () => {
            const mockOnChangeStore = jest.fn()
            const user = userEvent.setup()
            renderWithProviders(
                <StoreDisplay store={mockStore} onChangeStore={mockOnChangeStore} />
            )

            const changeStoreButton = screen.getByTestId('change-store-button')
            await user.click(changeStoreButton)

            expect(mockOnChangeStore).toHaveBeenCalledTimes(1)
        })

        test('does not render Change Store button when store has no name', () => {
            const storeWithoutName = {
                ...mockStore,
                name: null
            }
            const mockOnChangeStore = jest.fn()
            renderWithProviders(
                <StoreDisplay store={storeWithoutName} onChangeStore={mockOnChangeStore} />
            )

            expect(screen.queryByTestId('change-store-button')).not.toBeInTheDocument()
        })

        test('renders Change Store button with correct styling', () => {
            const mockOnChangeStore = jest.fn()
            renderWithProviders(
                <StoreDisplay store={mockStore} onChangeStore={mockOnChangeStore} />
            )

            const changeStoreButton = screen.getByTestId('change-store-button')
            expect(changeStoreButton).toBeInTheDocument()

            // Check that it's rendered as a button
            expect(changeStoreButton.tagName).toBe('BUTTON')
        })

        test('positions Change Store button next to store name', () => {
            const mockOnChangeStore = jest.fn()
            renderWithProviders(
                <StoreDisplay store={mockStore} onChangeStore={mockOnChangeStore} />
            )

            const storeName = screen.getByText('Downtown Store')
            const changeStoreButton = screen.getByTestId('change-store-button')

            // Both should be in the same parent container (Flex)
            expect(storeName.parentElement).toBe(changeStoreButton.parentElement)
        })
    })
})

describe('Desktop Pickup In Store Layout', () => {
    test('renders store name, address on the same line, and store hours button spanning full width', () => {
        const store = {
            id: 'store-999',
            name: 'Boston Back Bay Retail Store',
            address1: '500 Boylston St',
            city: 'Boston',
            stateCode: 'MA',
            postalCode: '02116',
            storeHours:
                'Monday 8AM–5PM Tuesday 8AM–5PM Wednesday 8AM–5PM Thursday 8AM–5PM Friday 8AM–5PM Saturday Closed Sunday Closed'
        }
        renderWithProviders(<StoreDisplay store={store} useAltLayoutforPickupStoreInfo={true} />)
        // Store name and address should be in the same row
        const storeName = screen.getByText('Boston Back Bay Retail Store')
        expect(storeName).toBeInTheDocument()
        expect(screen.getByText(/500 Boylston St/, {exact: false})).toBeInTheDocument()
        // Store Hours button should be present and not in the same parent as the address
        const storeHoursButton = screen.getByRole('button', {name: /store hours/i})
        expect(storeHoursButton).toBeInTheDocument()
        expect(storeHoursButton).toBeVisible()
        // The button should not be in the same parent as the address
        const address = screen.getByText(/500 Boylston St/, {exact: false})
        expect(storeHoursButton.parentElement).not.toBe(address.parentElement)
    })
})
describe('Default Mobile Layout', () => {
    test('renders store name, address, phone, and store hours button in default mobile layout', () => {
        // Mock useBreakpointValue to always return false for mobile
        jest.mock('@salesforce/retail-react-app/app/components/shared/ui', () => {
            const actual = jest.requireActual(
                '@salesforce/retail-react-app/app/components/shared/ui'
            )
            return {
                ...actual,
                useBreakpointValue: jest.fn(() => false)
            }
        })
        const store = {
            id: 'store-888',
            name: 'Cambridge Retail Store',
            address1: '100 Main St',
            city: 'Cambridge',
            stateCode: 'MA',
            postalCode: '02142',
            phone: '111-111-1111',
            storeHours:
                'Monday 8AM–5PM Tuesday 8AM–5PM Wednesday 8AM–5PM Thursday 8AM–5PM Friday 8AM–5PM Saturday Closed Sunday Closed'
        }
        const {container} = renderWithProviders(
            <StoreDisplay store={store} showPhone={true} useAltLayoutforPickupStoreInfo={false} />
        )
        // Store name and address should be present
        expect(screen.getByText('Cambridge Retail Store')).toBeInTheDocument()
        expect(screen.getByText(/100 Main St/, {exact: false})).toBeInTheDocument()
        // Phone number and label should be present in the full text content
        expect(container.textContent.replace(/\s/g, '')).toContain('111-111-1111')
        expect(container.textContent).toContain('Phone:')
        // Store Hours button should be present and visible
        const storeHoursButton = screen.getByRole('button', {name: /store hours/i})
        expect(storeHoursButton).toBeInTheDocument()
        expect(storeHoursButton).toBeVisible()
    })
})
describe('Default Desktop Layout with Distance', () => {
    test('renders store name, address, distance, and store hours button in default desktop layout', () => {
        // Mock useBreakpointValue to always return true for desktop
        jest.mock('@salesforce/retail-react-app/app/components/shared/ui', () => {
            const actual = jest.requireActual(
                '@salesforce/retail-react-app/app/components/shared/ui'
            )
            return {
                ...actual,
                useBreakpointValue: jest.fn(() => true)
            }
        })
        const store = {
            id: 'store-999',
            name: 'Cambridge Retail Store',
            address1: '100 Main St',
            city: 'Cambridge',
            stateCode: 'MA',
            postalCode: '02142',
            distance: 1,
            distanceUnit: 'km',
            storeHours:
                'Monday 8AM–5PM Tuesday 8AM–5PM Wednesday 8AM–5PM Thursday 8AM–5PM Friday 8AM–5PM Saturday Closed Sunday Closed'
        }
        renderWithProviders(
            <StoreDisplay
                store={store}
                showDistance={true}
                useAltLayoutforPickupStoreInfo={false}
            />
        )
        // Store name and address should be present
        expect(screen.getByText('Cambridge Retail Store')).toBeInTheDocument()
        expect(screen.getByText(/100 Main St/, {exact: false})).toBeInTheDocument()
        // Distance string should be present
        expect(screen.getByText(/1 km away/)).toBeInTheDocument()
        // Store Hours button should be present and visible
        const storeHoursButton = screen.getByRole('button', {name: /store hours/i})
        expect(storeHoursButton).toBeInTheDocument()
        expect(storeHoursButton).toBeVisible()
    })
})
