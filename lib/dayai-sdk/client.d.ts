import type { ObjectType, WhereCondition, SearchOptions, SearchQuery, SearchResponse, CreatePersonInput, CreateOrganizationInput, CreateOpportunityInput, SendNotificationInput } from "./types";
export interface DayAIConfig {
    baseUrl?: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    workspaceId?: string;
}
export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}
export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    success: boolean;
}
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number | null;
    method: string;
    params?: any;
}
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
export interface McpTool {
    name: string;
    description?: string;
    inputSchema: {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
    };
}
export interface McpToolResult {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}
export declare class DayAIClient {
    private config;
    private currentAccessToken;
    private tokenExpiresAt;
    private mcpInitialized;
    constructor(config?: Partial<DayAIConfig>);
    private getAccessToken;
    request<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
    graphql<T = any>(query: string, variables?: Record<string, any>): Promise<ApiResponse<T>>;
    getWorkspaceMetadata(): Promise<ApiResponse>;
    testConnection(): Promise<ApiResponse>;
    private mcpRequest;
    mcpInitialize(): Promise<ApiResponse>;
    mcpListTools(): Promise<ApiResponse<{
        tools: McpTool[];
    }>>;
    mcpCallTool(toolName: string, args?: Record<string, any>): Promise<ApiResponse<McpToolResult>>;
    private parseMcpResult;
    search(objectType: ObjectType | string, where?: WhereCondition, options?: SearchOptions): Promise<SearchResponse>;
    searchObjects(queries: SearchQuery[], options?: SearchOptions): Promise<ApiResponse<McpToolResult>>;
    findMeetingsByAttendee(emailOrDomain: string, options?: SearchOptions): Promise<ApiResponse<McpToolResult>>;
    createPerson(input: CreatePersonInput): Promise<any>;
    createOrganization(input: CreateOrganizationInput): Promise<any>;
    createOpportunity(input: CreateOpportunityInput): Promise<any>;
    sendNotification(input: SendNotificationInput): Promise<any>;
}
export default DayAIClient;
