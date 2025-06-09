import {useSearchStores} from '@salesforce/commerce-sdk-react'
import {ReactNode} from 'react'
export type Stores = NonNullable<ReturnType<typeof useSearchStores>['data']>['data']
export type Store = Stores[number]

export interface StoreLocatorConfig {
    radius?: number
    radiusUnit?: string
    defaultPageSize?: number
    defaultCountry: string
    defaultCountryCode: string
    defaultPostalCode: string
    supportedCountries: Array<{
        countryCode: string
        countryName: string
    }>
}

export type StoreLocatorMode = 'device' | 'input'
export interface StoreLocatorFormValues {
    countryCode: string
    postalCode: string
}

export interface StoreLocatorDeviceCoordinates {
    latitude: number | null
    longitude: number | null
}

export interface StoreLocatorState {
    mode: StoreLocatorMode
    formValues: StoreLocatorFormValues
    deviceCoordinates: StoreLocatorDeviceCoordinates
    config: StoreLocatorConfig
}

export interface StoreLocatorContextValue {
    state: StoreLocatorState
    setState: React.Dispatch<React.SetStateAction<StoreLocatorState>>
}

export interface StoreLocatorProviderProps {
    config: StoreLocatorConfig
    children: ReactNode
}