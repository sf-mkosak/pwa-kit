import {useConfigurations} from '@salesforce/commerce-sdk-react'
import { useState } from 'react';

export const useGcpApiKey = () => {
    const [gcpApiKey, setGcpApiKey] = useState(null)
    const {data} = useConfigurations({})
    if (gcpApiKey !== null) {
        return gcpApiKey;
    }
    const apiKey = data?.configurations?.find(config => config.id === 'gcp')?.value
    setGcpApiKey(apiKey);

    return apiKey;
}