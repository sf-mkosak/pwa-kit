/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Demo page for opt-in MRT Data Store bootstrap (`__MRT_DATA_STORE__` in `#mobify-data`).
 * Run `npm run start:mrt-data-store-demo` from this package, then open this route (with your
 * usual site/locale prefix if configured).
 */

import React, {useEffect, useState} from 'react'
import {Code} from '@chakra-ui/react'
import {Box, Heading, Stack, Text} from '@salesforce/retail-react-app/app/components/shared/ui'
import Link from '@salesforce/retail-react-app/app/components/link'
import {Helmet} from 'react-helmet'
import {getConfig} from '@salesforce/pwa-kit-runtime/utils/ssr-config'
import {DATA_STORE_WINDOW_GLOBAL} from '@salesforce/pwa-kit-runtime/utils/data-store/constants'
import {getCustomGlobalPreferences} from '@salesforce/pwa-kit-runtime/utils/data-store/ssr-global-preferences.client'
import {getCustomSitePreferences} from '@salesforce/pwa-kit-runtime/utils/data-store/ssr-site-preferences.client'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'

const pretty = (value) => JSON.stringify(value, null, 2)

const DemoMrtDataStorePage = () => {
    const {site} = useMultiSite()
    const [clientSnapshot, setClientSnapshot] = useState(null)

    useEffect(() => {
        setClientSnapshot({
            rawBootstrapPresent:
                typeof window !== 'undefined' &&
                window[DATA_STORE_WINDOW_GLOBAL] != null &&
                typeof window[DATA_STORE_WINDOW_GLOBAL] === 'object',
            customSitePreferences: getCustomSitePreferences(),
            customGlobalPreferences: getCustomGlobalPreferences()
        })
    }, [])

    const configEnabled = Boolean(getConfig()?.app?.mrtDataStore?.enabled)

    return (
        <Box data-testid="demo-mrt-data-store-page" layerStyle="page" py={8} px={{base: 4, md: 10}}>
            <Helmet>
                <title>MRT Data Store demo</title>
            </Helmet>
            <Stack spacing={6} maxW="container.lg" mx="auto">
                <Heading as="h1" size="lg">
                    MRT Data Store demo
                </Heading>
                <Text>
                    This page reads values serialized during SSR into{' '}
                    <Code>{DATA_STORE_WINDOW_GLOBAL}</Code>, then exposed on <Code>window</Code> at
                    startup. Use the runtime helpers <Code>getCustomSitePreferences</Code> /{' '}
                    <Code>getCustomGlobalPreferences</Code> (client modules) to consume them.
                </Text>

                <Box as="section" aria-labelledby="demo-run-heading">
                    <Heading as="h2" id="demo-run-heading" size="md" mb={3}>
                        Run locally (no DynamoDB)
                    </Heading>
                    <Stack spacing={2}>
                        <Text>
                            From <Code>packages/template-retail-react-app</Code>:
                        </Text>
                        <Code
                            as="pre"
                            p={4}
                            borderRadius="md"
                            overflow="auto"
                            fontSize="sm"
                            whiteSpace="pre-wrap"
                            wordBreak="break-word"
                        >
                            npm run start:mrt-data-store-demo
                        </Code>
                        <Text fontSize="sm" color="gray.600">
                            That sets <Code>PWAKIT_MRT_DATA_STORE_ENABLED=true</Code>, loads sample
                            keys from <Code>scripts/mrt-data-store-demo.defaults.json</Code> into{' '}
                            <Code>PWAKIT_MRT_DATA_STORE_DEFAULTS</Code>, silences missing-key
                            warnings, and <strong>clears</strong> <Code>AWS_REGION</Code>,{' '}
                            <Code>MOBIFY_PROPERTY_ID</Code>, and <Code>DEPLOY_TARGET</Code> for the
                            dev server only. If those three are all set, the runtime uses the real
                            MRT Data Store (DynamoDB), not local defaults — you will see empty{' '}
                            <Code>customSitePreferences</Code> /{' '}
                            <Code>customGlobalPreferences</Code> when keys are absent there.
                            Alternatively, set the env vars yourself and run <Code>npm start</Code>.
                        </Text>
                    </Stack>
                </Box>

                <Box as="section" aria-labelledby="demo-config-heading">
                    <Heading as="h2" id="demo-config-heading" size="md" mb={3}>
                        Config hint
                    </Heading>
                    <Text mb={2}>
                        <Code>app.mrtDataStore.enabled</Code> in config is{' '}
                        <strong>{configEnabled ? 'true' : 'false'}</strong>. The demo script forces
                        enablement via <Code>PWAKIT_MRT_DATA_STORE_ENABLED</Code> for SSR without
                        editing files.
                    </Text>
                </Box>

                <Box as="section" aria-labelledby="demo-site-heading">
                    <Heading as="h2" id="demo-site-heading" size="md" mb={3}>
                        Current site
                    </Heading>
                    <Text mb={2}>
                        Commerce site id: <Code>{site?.id || '(unknown)'}</Code> — site preferences
                        use the Data Store key{' '}
                        <Code>
                            {site?.id
                                ? `${site.id}-custom-site-preferences`
                                : '<siteId>-custom-site-preferences'}
                        </Code>
                        .
                    </Text>
                </Box>

                <Box as="section" aria-labelledby="demo-prefs-heading">
                    <Heading as="h2" id="demo-prefs-heading" size="md" mb={3}>
                        Resolved preferences (client read)
                    </Heading>
                    {clientSnapshot == null ? (
                        <Text color="gray.600">Loading bootstrap snapshot…</Text>
                    ) : (
                        <Stack spacing={4}>
                            <Text>
                                Bootstrap object present:{' '}
                                <strong>{clientSnapshot.rawBootstrapPresent ? 'yes' : 'no'}</strong>
                                {!clientSnapshot.rawBootstrapPresent && (
                                    <>
                                        {' '}
                                        — enable the Data Store for SSR (see above). If you only use{' '}
                                        <Code>npm start</Code> without env vars, the bootstrap key
                                        is omitted.
                                    </>
                                )}
                            </Text>
                            <Box>
                                <Text fontWeight="semibold" mb={1}>
                                    Site preferences
                                </Text>
                                <Code
                                    as="pre"
                                    p={4}
                                    borderRadius="md"
                                    overflow="auto"
                                    fontSize="sm"
                                    aria-label="Site preferences JSON"
                                >
                                    {pretty(clientSnapshot.customSitePreferences)}
                                </Code>
                            </Box>
                            <Box>
                                <Text fontWeight="semibold" mb={1}>
                                    Global preferences
                                </Text>
                                <Code
                                    as="pre"
                                    p={4}
                                    borderRadius="md"
                                    overflow="auto"
                                    fontSize="sm"
                                    aria-label="Global preferences JSON"
                                >
                                    {pretty(clientSnapshot.customGlobalPreferences)}
                                </Code>
                            </Box>
                        </Stack>
                    )}
                </Box>

                <Link href="/" variant="base">
                    ← Back to home
                </Link>
            </Stack>
        </Box>
    )
}

DemoMrtDataStorePage.getTemplateName = () => 'demo-mrt-data-store'

export default DemoMrtDataStorePage
