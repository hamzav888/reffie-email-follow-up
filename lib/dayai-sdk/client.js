"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayAIClient = void 0;
class DayAIClient {
    constructor(config) {
        this.currentAccessToken = null;
        this.tokenExpiresAt = 0;
        this.mcpInitialized = false;
        this.config = {
            baseUrl: config?.baseUrl || process.env.DAY_AI_BASE_URL || "https://day.ai",
            clientId: config?.clientId || process.env.CLIENT_ID || "",
            clientSecret: config?.clientSecret || process.env.CLIENT_SECRET || "",
            refreshToken: config?.refreshToken || process.env.REFRESH_TOKEN || "",
            workspaceId: config?.workspaceId || process.env.WORKSPACE_ID,
        };
        if (!this.config.clientId ||
            !this.config.clientSecret ||
            !this.config.refreshToken) {
            throw new Error('Missing required OAuth credentials. Please provide clientId, clientSecret, and refreshToken.');
        }
    }
    async getAccessToken() {
        const now = Date.now() / 1000;
        if (this.currentAccessToken && this.tokenExpiresAt > now + 60) {
            return this.currentAccessToken;
        }
        console.log("🔄 Refreshing Day.ai access token...");
        const payload = new URLSearchParams({
            grant_type: "refresh_token",
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: this.config.refreshToken,
        });
        const response = await fetch(`${this.config.baseUrl}/api/oauth`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: payload.toString(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}\n${errorText}`);
        }
        const tokenData = (await response.json());
        this.currentAccessToken = tokenData.access_token;
        this.tokenExpiresAt = now + tokenData.expires_in;
        console.log("✅ Day.ai access token refreshed");
        return this.currentAccessToken;
    }
    async request(endpoint, options = {}) {
        try {
            const accessToken = await this.getAccessToken();
            const url = `${this.config.baseUrl}${endpoint}`;
            const headers = {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                ...options.headers,
            };
            const response = await fetch(url, {
                ...options,
                headers,
            });
            const data = (await response.json());
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error ||
                        `HTTP ${response.status}: ${response.statusText}`,
                    data,
                };
            }
            return {
                success: true,
                data,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred",
            };
        }
    }
    async graphql(query, variables) {
        return this.request("/api/graphql", {
            method: "POST",
            body: JSON.stringify({
                query,
                variables,
            }),
        });
    }
    async getWorkspaceMetadata() {
        const accessToken = await this.getAccessToken();
        return this.request("/api/oauth", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "metadata",
            }).toString(),
        });
    }
    async testConnection() {
        try {
            console.log("🧪 Testing Day.ai connection...");
            const metadata = await this.getWorkspaceMetadata();
            if (!metadata.success) {
                return metadata;
            }
            console.log("✅ Day.ai connection successful!");
            return {
                success: true,
                data: {
                    message: "Connection successful",
                    workspace: metadata.data,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Connection test failed",
            };
        }
    }
    async mcpRequest(method, params) {
        try {
            const accessToken = await this.getAccessToken();
            const jsonRpcRequest = {
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params,
            };
            const response = await fetch(`${this.config.baseUrl}/api/mcp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonRpcRequest),
            });
            const jsonRpcResponse = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    data: jsonRpcResponse,
                };
            }
            if (jsonRpcResponse.error) {
                return {
                    success: false,
                    error: `JSON-RPC Error ${jsonRpcResponse.error.code}: ${jsonRpcResponse.error.message}`,
                    data: jsonRpcResponse.error,
                };
            }
            return {
                success: true,
                data: jsonRpcResponse.result,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'MCP request failed',
            };
        }
    }
    async mcpInitialize() {
        const result = await this.mcpRequest('initialize', {
            protocolVersion: '2025-06-18',
            clientInfo: {
                name: 'Day AI SDK',
                version: '0.1.0',
            },
            capabilities: {
                tools: {},
                resources: {},
            },
        });
        if (result.success) {
            this.mcpInitialized = true;
            console.log('✅ MCP initialized');
        }
        return result;
    }
    async mcpListTools() {
        if (!this.mcpInitialized) {
            const initResult = await this.mcpInitialize();
            if (!initResult.success) {
                return initResult;
            }
        }
        return this.mcpRequest('tools/list');
    }
    async mcpCallTool(toolName, args = {}) {
        if (!this.mcpInitialized) {
            const initResult = await this.mcpInitialize();
            if (!initResult.success) {
                return initResult;
            }
        }
        return this.mcpRequest('tools/call', {
            name: toolName,
            arguments: args,
        });
    }
    parseMcpResult(response) {
        if (!response.success) {
            throw new Error(response.error ?? 'MCP call failed');
        }
        if (response.data?.isError) {
            throw new Error(response.data.content[0]?.text ?? 'MCP tool error');
        }
        const text = response.data?.content[0]?.text;
        if (!text) {
            throw new Error('Empty MCP tool response');
        }
        return JSON.parse(text);
    }
    async search(objectType, where, options) {
        const raw = await this.mcpCallTool('search_objects', {
            ...options,
            queries: [{ objectType, ...(where ? { where } : {}) }],
        });
        return this.parseMcpResult(raw);
    }
    async searchObjects(queries, options) {
        return this.mcpCallTool('search_objects', {
            ...options,
            queries,
        });
    }
    async findMeetingsByAttendee(emailOrDomain, options) {
        const isOrg = !emailOrDomain.includes('@');
        return this.mcpCallTool('search_objects', {
            ...options,
            queries: [
                {
                    objectType: 'native_meetingrecording',
                    where: {
                        relationship: 'attendee',
                        targetObjectType: isOrg ? 'native_organization' : 'native_contact',
                        targetObjectId: emailOrDomain,
                        operator: 'eq',
                    },
                },
            ],
        });
    }
    async createPerson(input) {
        const { customProperties, ...standardProperties } = input;
        const raw = await this.mcpCallTool('create_or_update_person_organization', {
            isCreating: true,
            objectType: 'Person',
            standardProperties,
            ...(customProperties ? { customProperties } : {}),
        });
        return this.parseMcpResult(raw);
    }
    async createOrganization(input) {
        const { customProperties, ...standardProperties } = input;
        const raw = await this.mcpCallTool('create_or_update_person_organization', {
            isCreating: true,
            objectType: 'Organization',
            standardProperties,
            ...(customProperties ? { customProperties } : {}),
        });
        return this.parseMcpResult(raw);
    }
    async createOpportunity(input) {
        const { customProperties, ...standardProperties } = input;
        const raw = await this.mcpCallTool('create_or_update_opportunity', {
            isCreating: true,
            standardProperties,
            ...(customProperties ? { customProperties } : {}),
        });
        return this.parseMcpResult(raw);
    }
    async sendNotification(input) {
        const raw = await this.mcpCallTool('send_notification_mcp', input);
        return this.parseMcpResult(raw);
    }
}
exports.DayAIClient = DayAIClient;
exports.default = DayAIClient;
//# sourceMappingURL=client.js.map
