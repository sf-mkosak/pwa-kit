/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {useState, useRef, useCallback, useEffect} from 'react'
import {useMapsLibrary} from '@vis.gl/react-google-maps'
import {convertGoogleMapsSuggestions} from '@salesforce/retail-react-app/app/utils/address-suggestions'
import {useCheckout} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'

const DEBOUNCE_DELAY = 300

/**
 * Resolve the Google Cloud API key from the configurations
 * It will only return a key if the FT is enabled
 * regardless of the key being provided by the platform or the MRT env variable
 * Custom keys(MRT Env variable) take precedence over the platform provided key
 *
 * @param {Object} configurations - The configurations object
 * @returns {string} The Google Cloud API key
 */
function resolveGoogleCloudAPIKey(configurations) {
    // If the FT is not enabled, the gcp API key will not be returned from the Shopper Config API
    // Therefore the presence of the SF platform provided key is also serving as our feature toggle
    // const platformProvidedKey = configurations?.configurations?.find(
    //     (config) => config.id === 'gcp'
    // )?.value

    // return !platformProvidedKey
    //     ? null
    //     : getConfig()?.app?.googleCloudAPI?.apiKey || platformProvidedKey
    return getConfig()?.app?.googleCloudAPI?.apiKey
}

/**
 * Custom hook for Google Maps Places autocomplete suggestions
 * @param {string} inputString - The input string to search for
 * @param {string} countryCode - Country code to filter results (e.g., 'US', 'CA')
 * @param {Object} requestOptions - Additional request options for the API
 * @returns {Object} Object containing suggestions, loading state, and reset function
 */
export const useAutocompleteSuggestions = (
    inputString = '',
    countryCode = '',
    requestOptions = {}
) => {
    const places = useMapsLibrary('places')

    const sessionTokenRef = useRef(null)
    const debounceTimeoutRef = useRef(null)

    const [suggestions, setSuggestions] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    const fetchSuggestions = useCallback(
        async (input) => {
            if (!places || !input || input.length < 3) {
                setSuggestions([])
                return
            }

            setIsLoading(true)

            try {
                const {AutocompleteSessionToken, AutocompleteSuggestion} = places

                if (!sessionTokenRef.current) {
                    sessionTokenRef.current = new AutocompleteSessionToken()
                }

                const request = {
                    ...requestOptions,
                    input: input,
                    includedPrimaryTypes: ['street_address'],
                    sessionToken: sessionTokenRef.current
                }

                if (countryCode) {
                    request.includedRegionCodes = [countryCode]
                }

                const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

                const googleSuggestions = convertGoogleMapsSuggestions(response.suggestions)

                setSuggestions(googleSuggestions)
            } catch (error) {
                setSuggestions([])
            } finally {
                setIsLoading(false)
            }
        },
        [places, countryCode]
    )

    const resetSession = useCallback(() => {
        sessionTokenRef.current = null
        setSuggestions([])
        setIsLoading(false)
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }
    }, [])

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        if (!inputString || inputString.length < 3) {
            setSuggestions([])
            return
        }

        debounceTimeoutRef.current = setTimeout(() => {
            fetchSuggestions(inputString)
        }, DEBOUNCE_DELAY)

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [inputString, fetchSuggestions])

    return {
        suggestions,
        isLoading,
        resetSession,
        fetchSuggestions
    }
}
