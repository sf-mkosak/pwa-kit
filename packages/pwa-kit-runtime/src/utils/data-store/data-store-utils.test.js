/*
 * Copyright (c) 2026, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {DataStore, DataStoreNotFoundError, DataStoreServiceError} from '../ssr-server/data-store'
import {getPlainObjectForDataStoreKey} from './data-store-utils'

const baseOptions = () => ({
    logNamespace: 'data-store-utils-test',
    serviceErrorMessage: 'Test Data Store request failed'
})

describe('data-store-utils', () => {
    describe('getPlainObjectForDataStoreKey', () => {
        const originalEnv = {...process.env}
        let mockSend

        beforeEach(() => {
            process.env.AWS_REGION = 'us-east-1'
            process.env.MOBIFY_PROPERTY_ID = 'proj'
            process.env.DEPLOY_TARGET = 'production'
            DataStore._instance = null
            DataStore._testDocumentClient = null
            mockSend = jest.fn()
            DataStore._testDocumentClient = {send: mockSend}
        })

        afterEach(() => {
            process.env = originalEnv
            DataStore._instance = null
            DataStore._testDocumentClient = null
        })

        test('returns {} when dataStoreKey is null', async () => {
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: null})
            ).resolves.toEqual({})
        })

        test('returns {} when dataStoreKey is empty string', async () => {
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: ''})
            ).resolves.toEqual({})
        })

        test('returns {} when data store unavailable', async () => {
            delete process.env.AWS_REGION
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'any-key'})
            ).resolves.toEqual({})
        })

        test('returns plain object value from Data Store', async () => {
            mockSend.mockResolvedValue({Item: {value: {a: 1, nested: {b: 2}}}})
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'my-key'})
            ).resolves.toEqual({a: 1, nested: {b: 2}})
        })

        test('returns {} when entry is not found', async () => {
            mockSend.mockResolvedValue({})
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'missing'})
            ).resolves.toEqual({})
        })

        test('returns {} on DataStoreServiceError (e.g. DynamoDB failure)', async () => {
            mockSend.mockRejectedValue(new Error('throttle'))
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'my-key'})
            ).resolves.toEqual({})
        })

        test('returns {} when stored value is not a plain object', async () => {
            mockSend.mockResolvedValue({Item: {value: [1, 2]}})
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'my-key'})
            ).resolves.toEqual({})
            mockSend.mockResolvedValue({Item: {value: 'scalar'}})
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'my-key'})
            ).resolves.toEqual({})
        })

        test('returns {} when getEntry throws DataStoreNotFoundError', async () => {
            const store = DataStore.getDataStore()
            jest.spyOn(store, 'getEntry').mockRejectedValue(new DataStoreNotFoundError('gone'))
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'my-key'})
            ).resolves.toEqual({})
            store.getEntry.mockRestore()
        })

        test('returns {} when getEntry throws DataStoreServiceError', async () => {
            const store = DataStore.getDataStore()
            jest.spyOn(store, 'getEntry').mockRejectedValue(
                new DataStoreServiceError('unavailable')
            )
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'my-key'})
            ).resolves.toEqual({})
            store.getEntry.mockRestore()
        })

        test('rethrows unexpected errors from getEntry', async () => {
            const store = DataStore.getDataStore()
            jest.spyOn(store, 'getEntry').mockRejectedValue(new Error('unexpected'))
            await expect(
                getPlainObjectForDataStoreKey({...baseOptions(), dataStoreKey: 'my-key'})
            ).rejects.toThrow('unexpected')
            store.getEntry.mockRestore()
        })
    })
})
