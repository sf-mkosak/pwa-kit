/*
 * Copyright (c) 2024, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
//import {useCommerceApi, useAccessToken} from '@salesforce/commerce-sdk-react'
import {useConfigurations} from '@salesforce/commerce-sdk-react'

/**
 * React hook that provides access to ShopperConfigurations API client
 * and configuration data for the current site.
 * 
 * @returns {Object} Object containing the configurations client and utility methods
 */
const useShopperConfigurations = async () => {
    // const api = useCommerceApi();
    // const {getTokenWhenReady} = useAccessToken()
    // const token = await getTokenWhenReady()
    // return api.shopperConfigurations.getConfigurations({
    //     headers: {
    //         Authorization: `Bearer ${token}`
    //     }
    // });
    
    return useConfigurations({});
}

export default useShopperConfigurations
