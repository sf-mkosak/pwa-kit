/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, {createContext, useEffect, useRef, useMemo} from 'react'
import PropTypes from 'prop-types'
import {useLocation} from 'react-router-dom'
import logger from '../../../utils/logger-instance'

const CorrelationIdContext = React.createContext()
const ServerContext = React.createContext()

/**
 * Context for MRT Data Store preferences
 */
const MrtDataStoreContext = createContext({
    customSitePreferences: {},
    customGlobalPreferences: {}
})

/**
 * This provider initializes the correlation id,
 * and will generate a new id whenever there is a location change
 * @private
 * @param children
 * @param correlationId - default correlation id
 * @param resetOnPageChange - a boolean to indicate if it needs to generate a new id when navigating to a new page
 */
const CorrelationIdProvider = ({children, correlationId, resetOnPageChange = true}) => {
    const _correlationIdFn = typeof correlationId === 'function' && correlationId
    const _correlationId = typeof correlationId !== 'function' && correlationId
    if (resetOnPageChange && !_correlationIdFn) {
        logger.warn(
            'correlationId needs to be a function returning a uuid string when resetOnPageChange is true',
            {namespace: 'contexts.CorrelationIdProvider'}
        )
    }
    const [id, setId] = React.useState(_correlationId || _correlationIdFn())
    const location = useLocation()

    const isFirstRun = useRef(true)
    useEffect(() => {
        // this hook only runs on client-side
        // don't run this on first render
        if (isFirstRun.current) {
            isFirstRun.current = false
            return
        }

        if (resetOnPageChange && _correlationIdFn) {
            // NOTE: the function needs to be an uuid v4.
            const newId = _correlationIdFn()
            setId(newId)
        }
    }, [location.pathname])

    return (
        <CorrelationIdContext.Provider value={{correlationId: id}}>
            {children}
        </CorrelationIdContext.Provider>
    )
}

CorrelationIdProvider.propTypes = {
    children: PropTypes.element.isRequired,
    resetOnPageChange: PropTypes.bool,
    correlationId: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
    location: PropTypes.object
}

/**
 * Provider for MRT Data Store preferences.
 *
 * On server (SSR): Receives preferences from SSR bootstrap as props
 * On client: Reads from window.__MRT_DATA_STORE__ (serialized by server)
 *
 * @param {Object} props
 * @param {Object} props.customSitePreferences - Site preferences (from SSR)
 * @param {Object} props.customGlobalPreferences - Global preferences (from SSR)
 * @param {React.ReactNode} props.children
 */
const MrtDataStoreProvider = ({
    customSitePreferences: ssrSitePreferences = {},
    customGlobalPreferences: ssrGlobalPreferences = {},
    children
}) => {
    const value = useMemo(() => {
        // Client: read from bootstrapped window object
        if (typeof window !== 'undefined' && window.__MRT_DATA_STORE__) {
            return {
                customSitePreferences: window.__MRT_DATA_STORE__.customSitePreferences || {},
                customGlobalPreferences: window.__MRT_DATA_STORE__.customGlobalPreferences || {}
            }
        }

        // Server: use props from SSR bootstrap
        return {
            customSitePreferences: ssrSitePreferences,
            customGlobalPreferences: ssrGlobalPreferences
        }
    }, [ssrSitePreferences, ssrGlobalPreferences])

    return <MrtDataStoreContext.Provider value={value}>{children}</MrtDataStoreContext.Provider>
}

MrtDataStoreProvider.propTypes = {
    customSitePreferences: PropTypes.object,
    customGlobalPreferences: PropTypes.object,
    children: PropTypes.node
}

export {
    CorrelationIdContext,
    CorrelationIdProvider,
    ServerContext,
    MrtDataStoreContext,
    MrtDataStoreProvider
}
