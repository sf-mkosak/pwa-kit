/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React from 'react'
import PropTypes from 'prop-types'
import {APIProvider} from '@vis.gl/react-google-maps'
import {useCheckout} from '@salesforce/retail-react-app/app/pages/checkout/util/checkout-context'
import resolveGoogleCloudAPIKey from '@salesforce/retail-react-app/app/utils/address-suggestions'

export const GoogleAPIProvider = ({children}) => {
    const {configurations} = useCheckout()
    const googleCloudAPIKey = resolveGoogleCloudAPIKey(configurations)

    return googleCloudAPIKey ? (
        <APIProvider apiKey={googleCloudAPIKey}>{children}</APIProvider>
    ) : (
        children
    )
}

GoogleAPIProvider.propTypes = {
    googleCloudAPIKey: PropTypes.string,
    children: PropTypes.node.isRequired
}
