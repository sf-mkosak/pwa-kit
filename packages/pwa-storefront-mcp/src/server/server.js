#!/usr/bin/env node
/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {AddComponentTool} from '../utils/AddComponentTool.js'
import {InsertExistingComponentTool} from '../utils/InsertExistingComponentTool.js'
import {CreateNewComponentTool} from '../utils/CreateNewComponentTool.js'
import {StorefrontDevelopmentGuide} from '../utils/pwa-storefront-development-guide.js'
import {ComponentCreatorModifier} from '../utils/pwa-storefront-component-creator.js'

class PwaStorefrontMCPServerHighLevel {
    constructor() {
        // Using McpServer instead of Server
        this.server = new McpServer(
            {
                name: 'pwa-commerce-storefront-code',
                version: '0.1.0'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        )

        this.addComponentTool = new AddComponentTool()
        this.insertExistingComponentTool = new InsertExistingComponentTool()
        this.CreateNewComponentTool = new CreateNewComponentTool()
        this.setupTools()
    }

    setupTools() {
        // Register pwa-developing-guide tool
        this.server.tool(
            StorefrontDevelopmentGuide.name,
            StorefrontDevelopmentGuide.description,
            StorefrontDevelopmentGuide.inputSchema,
            StorefrontDevelopmentGuide.fn
        )
        this.server.tool(
            ComponentCreatorModifier.name,
            ComponentCreatorModifier.description,
            ComponentCreatorModifier.inputSchema,
            ComponentCreatorModifier.fn
        )
    }

    async run() {
        const transport = new StdioServerTransport()
        await this.server.connect(transport)
        console.error('PWA Storefront MCP server (McpServer version) running on stdio')
    }
}

const server = new PwaStorefrontMCPServerHighLevel()
server.run().catch(console.error)
