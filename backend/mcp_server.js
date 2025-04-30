#!/usr/bin/env node

// backend/mcp_server.js - Manual MCP + Namespacing + Capabilities + Nad.fun Example

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const readline = require('readline');
const { ethers } = require('ethers');
// Node.js 18+ has built-in fetch
// const fetch = require('node-fetch'); // Use this if on older Node.js and install 'node-fetch'

// --- Configuration & Setup ---
const MONAD_RPC_URL = process.env.MONAD_RPC_URL;
const SERVER_NAME_MONAD = "monad-multisend"; // Namespace for original tools
const SERVER_NAME_NADFUN = "nadfun";      // Namespace for Nad.fun tools
const NADFUN_API_BASE = "https://testnet-bot-api-server.nad.fun";

// Helper for logging to stderr
function logError(message, ...optionalParams) {
    const msgString = (typeof message === 'string') ? message : JSON.stringify(message);
    // Include server name context in logs
    console.error(`[${new Date().toISOString()}] MCP Server (${SERVER_NAME_MONAD}/${SERVER_NAME_NADFUN}): ${msgString}`, ...optionalParams);
}

if (!MONAD_RPC_URL) {
    logError("WARN: MONAD_RPC_URL environment variable is not set. Monad tools may fail.");
    // Allow server to start, but log warning
}
// Only create provider if URL is set
const provider = MONAD_RPC_URL ? new ethers.JsonRpcProvider(MONAD_RPC_URL) : null;
if (provider) {
    logError(`Monad RPC Provider configured for: ${MONAD_RPC_URL}`);
} else {
     logError(`Monad RPC Provider NOT configured.`);
}


// --- Tool Definitions ---
const tools = [
    // --- Monad Tools (Original) ---
    {
        toolName: `${SERVER_NAME_MONAD}/getBalance`,
        description: "Checks the MON token balance for a specified address on the Monad Testnet using direct RPC.",
        inputSchema: { type: "object", properties: { address: { type: "string", description: "The Monad wallet address (0x...)." } }, required: ["address"] }
    },
    {
        toolName: `${SERVER_NAME_MONAD}/getTransactionCount`,
        description: "Gets the transaction count for a Monad address using direct RPC.",
        inputSchema: { type: "object", properties: { address: { type: "string", description: "The Monad wallet address (0x...)." } }, required: ["address"] }
    },
    {
        toolName: `${SERVER_NAME_MONAD}/getTransactionStatus`,
        description: "Checks the status of a transaction on Monad Testnet using direct RPC.",
        inputSchema: { type: "object", properties: { txHash: { type: "string", description: "The transaction hash (0x...)." } }, required: ["txHash"] }
    },
    {
        toolName: `${SERVER_NAME_MONAD}/getBlockNumber`,
        description: "Gets the current Monad Testnet block number using direct RPC.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        toolName: `${SERVER_NAME_MONAD}/sendMultisendTransaction`,
        description: "INFORMATION ONLY: Instructions for using the separate Web Frontend dApp.",
        inputSchema: { type: "object", properties: { recipients: { type: "array", items: { type:"object", properties:{address:{type:"string"}, amount:{type:"string"}}, required:["address","amount"] } } }, required: ["recipients"] }
    },

    // --- NEW: Nad.fun API Tools ---
    {
        toolName: `${SERVER_NAME_NADFUN}/getTokenMetadata`, // <--- New Tool
        description: "Retrieves detailed metadata for a specific token from the Nad.fun API.",
        inputSchema: {
            type: "object", properties: {
                tokenAddress: { type: "string", description: "The token contract address (0x...)." }
            }, required: ["tokenAddress"]
        }
    }
    // Add more Nad.fun tools here following the same pattern...
    // { toolName: `${SERVER_NAME_NADFUN}/getAccountPositions`, ... }
    // { toolName: `${SERVER_NAME_NADFUN}/getLatestTokens`, ... }
];

// --- Tool Implementation Functions ---

// --- Monad RPC Handlers (Original) ---
async function handleGetBalance(params) {
    logError(`DEBUG: handleGetBalance called with params:`, params); const address = params?.address;
    if (!provider) throw new Error("Monad RPC provider not configured.");
    try { if (!address || !ethers.isAddress(address)) { throw new Error(`Invalid or missing address parameter.`); } logError(`DEBUG: handleGetBalance calling provider.getBalance for ${address}`); const balanceWei = await provider.getBalance(address); const balanceMon = ethers.formatEther(balanceWei); logError(`Balance retrieved for ${address}: ${balanceMon} MON`); return `Balance for ${address}: ${balanceMon} MON`;
    } catch(error) { logError(`DEBUG: handleGetBalance caught error:`, error); throw error; }
}
async function handleGetTransactionCount(params) {
    logError(`DEBUG: handleGetTransactionCount called with params:`, params); const address = params?.address;
    if (!provider) throw new Error("Monad RPC provider not configured.");
    try { if (!address || !ethers.isAddress(address)) { throw new Error(`Invalid or missing address parameter.`); } logError(`DEBUG: handleGetTransactionCount calling provider.getTransactionCount for ${address}`); const txCount = await provider.getTransactionCount(address); logError(`Transaction count for ${address}: ${txCount}`); return `Transaction count for ${address}: ${txCount}`; } catch(error) { logError(`DEBUG: handleGetTransactionCount caught error:`, error); throw error; }
}
async function handleGetTransactionStatus(params) {
    logError(`DEBUG: handleGetTransactionStatus called with params:`, params); const txHash = params?.txHash;
    if (!provider) throw new Error("Monad RPC provider not configured.");
    try { if (!txHash || !/^0x([A-Fa-f0-9]{64})$/.test(txHash)) { throw new Error(`Invalid or missing txHash parameter.`); } logError(`DEBUG: handleGetTransactionStatus calling provider.getTransactionReceipt for ${txHash}`); const receipt = await provider.getTransactionReceipt(txHash); if (!receipt) { logError(`Transaction receipt not found for ${txHash}`); return `Transaction not found or not yet mined for hash: ${txHash}`; } else { const status = receipt.status === 1 ? 'Success' : 'Failed'; const details = `Transaction ${receipt.hash}\nStatus: ${status}\nBlock: ${receipt.blockNumber}\nFrom: ${receipt.from}\nTo: ${receipt.to}\nGas Used: ${ethers.formatUnits(receipt.gasUsed, 'gwei')} Gwei`; logError(`Transaction status for ${txHash}: ${status}`); return details; } } catch(error) { logError(`DEBUG: handleGetTransactionStatus caught error:`, error); throw error; }
}
async function handleGetBlockNumber(params) {
    logError(`DEBUG: handleGetBlockNumber called`);
    if (!provider) throw new Error("Monad RPC provider not configured.");
    try { logError(`DEBUG: handleGetBlockNumber calling provider.getBlockNumber`); const blockNumber = await provider.getBlockNumber(); logError(`Current block number: ${blockNumber}`); return `Current Monad Testnet block number: ${blockNumber}`; } catch(error) { logError(`DEBUG: handleGetBlockNumber caught error:`, error); throw error; }
}
async function handleSendMultisendTransaction(params) {
    logError(`Executing sendMultisendTransaction (informational only)`); return "This action cannot be performed directly by the MCP server for security reasons. Please use the associated Web Frontend dApp (running locally) to initiate and confirm the multisend transaction via your wallet (MetaMask).";
}

// --- NEW: Nad.fun API Handler ---
async function handleGetTokenMetadata(params) {
    logError(`DEBUG: handleGetTokenMetadata called with params:`, params);
    const tokenAddress = params?.tokenAddress;
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) { // Basic validation
        throw new Error("Invalid or missing tokenAddress parameter.");
    }
    const apiUrl = `${NADFUN_API_BASE}/token/${tokenAddress}`;
    logError(`DEBUG: Calling Nad.fun API: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            // Handle HTTP errors (like 404 Not Found, 500 Server Error)
            const errorText = await response.text();
            logError(`Nad.fun API Error: Status ${response.status}, Response: ${errorText}`);
            throw new Error(`Nad.fun API request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        logError(`Nad.fun API Success: Received data for ${tokenAddress}`);

        // Format the data nicely for the user
        let resultText = `Nad.fun Metadata for ${data.symbol} (${data.name}):\n`;
        resultText += `- Address: ${data.token_address}\n`;
        resultText += `- Creator: ${data.creator_address}\n`;
        resultText += `- Description: ${data.description || 'N/A'}\n`;
        resultText += `- Total Supply: ${data.total_supply || 'N/A'}\n`; // Add formatting if needed
        resultText += `- Created At: ${data.created_at ? new Date(data.created_at * 1000).toLocaleString() : 'N/A'}\n`;
        resultText += `- Website: ${data.website || 'N/A'}\n`;
        resultText += `- Twitter: ${data.twitter || 'N/A'}\n`;
        resultText += `- Telegram: ${data.telegram || 'N/A'}`;

        return resultText;

    } catch (error) {
        logError(`DEBUG: handleGetTokenMetadata caught error:`, error);
        // Re-throw the error to be caught by the main handler and formatted as a tool error
        throw error;
    }
}

// --- Tool Handler Mapping ---
const toolHandlers = {
    // Monad Tools
    "getBalance": handleGetBalance,
    "getTransactionCount": handleGetTransactionCount,
    "getTransactionStatus": handleGetTransactionStatus,
    "getBlockNumber": handleGetBlockNumber,
    "sendMultisendTransaction": handleSendMultisendTransaction,
    // Nad.fun Tools
    "getTokenMetadata": handleGetTokenMetadata // <--- Added mapping
    // Add mappings for other Nad.fun handlers here...
};

// --- Stdio Communication & JSON-RPC Handling ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
function sendResponse(responseObject) { /* ... code as before ... */
     try { const responseString = JSON.stringify(responseObject); process.stdout.write(responseString + '\n'); logError("Sent response:", responseString); } catch (error) { logError("ERROR stringifying response:", error); process.stdout.write(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error: Failed to serialize response" }, id: responseObject?.id ?? null }) + '\n'); }
}
function sendJsonRpcError(id, code, message) { /* ... code as before ... */
    logError(`Sending JSON-RPC Error: Code=${code}, Msg=${message}, ID=${id}`); sendResponse({ jsonrpc: "2.0", error: { code: code, message: message }, id: id ?? null });
}

logError(`Manual MCP Server started (Monad + Nad.fun). Listening on stdin...`);

rl.on('line', async (line) => {
    logError("DEBUG: Raw line received:", line);
    let request;
    let requestId = null;

    try { request = JSON.parse(line); requestId = request?.id !== undefined ? request.id : null; }
    catch (e) { logError("JSON Parse Error:", e.message); sendJsonRpcError(null, -32700, "Parse error"); return; }

    try {
        if (request.jsonrpc !== "2.0" || typeof request.method !== 'string') { throw { code: -32600, message: "Invalid Request: Invalid JSON-RPC structure." }; }
        if (!request.method.startsWith('notifications/') && typeof requestId !== 'string' && typeof requestId !== 'number' && requestId !== null) { throw { code: -32600, message: "Invalid Request: Missing or invalid ID for non-notification request." }; }

        logError(`DEBUG: Handling method: ${request.method}`);

        if (request.method.startsWith('notifications/')) { logError(`DEBUG: Ignoring notification: ${request.method}`); return; }

        // --- Method Handling ---
        if (request.method === 'initialize') {
            logError("Handling initialize request");
            const supportedProtocolVersion = "2024-11-05"; // Keep the newer version unless proven problematic
            const responsePayload = {
                jsonrpc: "2.0",
                result: {
                    // Use main server name here, namespaces handle tool distinction
                    serverInfo: { name: SERVER_NAME_MONAD, version: "1.1.0" },
                    protocolVersion: supportedProtocolVersion,
                    // Include capabilities based on previous attempt
                    capabilities: { "tools/list": {}, "tools/call": {} }
                },
                id: requestId
            };
            logError("DEBUG: Sending initialize response:", JSON.stringify(responsePayload));
            sendResponse(responsePayload);
            logError("DEBUG: Finished sending initialize response.");

        } else if (request.method === 'tools/list') {
            logError("Handling tools/list request");
            const responsePayload = { jsonrpc: "2.0", result: { tools: tools }, id: requestId }; // Includes Monad and Nad.fun tools
            logError("DEBUG: Sending tools/list response:", JSON.stringify(responsePayload));
            sendResponse(responsePayload);
            logError("DEBUG: Finished sending tools/list response.");

        } else if (request.method === 'tools/call') {
            const { toolName: fullToolName, params } = request.params || {};
            logError(`Handling tools/call request for full tool: ${fullToolName}`);
            if (!fullToolName || typeof fullToolName !== 'string' || !request.params) { throw { code: -32602, message: "Invalid params: Missing or invalid toolName/params object" }; }

            // --- Handle Namespacing ---
            let actualToolName = fullToolName;
            let namespace = null;
            if (fullToolName.startsWith(`${SERVER_NAME_MONAD}/`)) {
                actualToolName = fullToolName.substring(SERVER_NAME_MONAD.length + 1);
                namespace = SERVER_NAME_MONAD;
            } else if (fullToolName.startsWith(`${SERVER_NAME_NADFUN}/`)) {
                actualToolName = fullToolName.substring(SERVER_NAME_NADFUN.length + 1);
                namespace = SERVER_NAME_NADFUN;
            } else {
                logError(`DEBUG: Received tool name without expected prefix: ${actualToolName}`);
                 // Decide how to handle - maybe try matching without namespace? Or reject?
                 // For now, we'll assume it MUST match a handler name directly if no namespace
            }
             logError(`DEBUG: Namespace detected: ${namespace}, Actual tool name: ${actualToolName}`);
            // --- End Namespace Handling ---


            const handler = toolHandlers[actualToolName]; // Find handler by base name

            if (typeof handler !== 'function') { throw { code: -32601, message: `Method not found: Tool "${fullToolName}" is not supported.` }; }

            try {
                logError(`DEBUG: Calling handler for tool: ${actualToolName} with params:`, params);
                const toolResultText = await handler(params || {}); // Call the correct handler
                logError(`DEBUG: Handler for tool ${actualToolName} returned successfully.`);
                 const responsePayload = { jsonrpc: "2.0", result: { content: [{ type: "text", text: String(toolResultText) }] }, id: requestId };
                logError(`DEBUG: Sending successful tools/call response for ${actualToolName}:`, JSON.stringify(responsePayload)); sendResponse(responsePayload); logError(`DEBUG: Finished sending successful tools/call response for ${actualToolName}.`);
            } catch (toolError) {
                logError(`Error executing tool "${actualToolName}":`, toolError);
                const responsePayload = { jsonrpc: "2.0", result: { isError: true, content: [{ type: "text", text: `Error executing tool "${actualToolName}": ${toolError.message || String(toolError)}` }] }, id: requestId };
                 logError(`DEBUG: Sending error tool result for ${actualToolName}:`, JSON.stringify(responsePayload)); sendResponse(responsePayload); logError(`DEBUG: Finished sending error tool result for ${actualToolName}.`);
            }

        } else if (request.method === 'resources/list') {
            logError("Handling resources/list request"); const responsePayload = { jsonrpc: "2.0", result: { resources: [] }, id: requestId }; logError("DEBUG: Sending resources/list response:", JSON.stringify(responsePayload)); sendResponse(responsePayload); logError("DEBUG: Finished sending resources/list response.");
        } else if (request.method === 'prompts/list') {
            logError("Handling prompts/list request"); const responsePayload = { jsonrpc: "2.0", result: { prompts: [] }, id: requestId }; logError("DEBUG: Sending prompts/list response:", JSON.stringify(responsePayload)); sendResponse(responsePayload); logError("DEBUG: Finished sending prompts/list response.");
        } else { throw { code: -32601, message: `Method not found: ${request.method}` }; }
    } catch (error) { logError("Error during request processing:", error); sendJsonRpcError(requestId, error.code || -32603, error.message || "Internal server error"); }
});

rl.on('close', () => { /* ... code as before ... */ logError("Stdin stream closed. Exiting."); process.exit(0); });
process.on('SIGINT', () => { /* ... code as before ... */ logError('Received SIGINT. Exiting.'); process.exit(0); });
process.on('SIGTERM', () => { /* ... code as before ... */ logError('Received SIGTERM. Exiting.'); process.exit(0); });