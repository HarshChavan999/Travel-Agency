"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeFirebase = initializeFirebase;
exports.verifyToken = verifyToken;
exports.authenticateRequest = authenticateRequest;
exports.withAuth = withAuth;
const admin = __importStar(require("firebase-admin"));
const app_1 = require("firebase-admin/app");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Initialize Firebase Admin
let firebaseApp = null;
function normalizePrivateKey(value) {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed
        // Support keys stored with escaped newlines (e.g. in environment variables)
        .replace(/\\n/g, '\n')
        // Remove carriage returns that can appear on Windows
        .replace(/\r/g, '')
        // Ensure final newline at end of key for Firebase parser compatibility
        .replace(/\n?$/, '\n');
}
function isLikelyValidPrivateKey(key) {
    if (!key) {
        return false;
    }
    const trimmed = key.trim();
    if (!trimmed.startsWith('-----BEGIN PRIVATE KEY-----') || !trimmed.endsWith('-----END PRIVATE KEY-----')) {
        return false;
    }
    // Filter out placeholder or truncated keys often represented with ellipses
    if (trimmed.includes('...')) {
        return false;
    }
    // Real private keys are typically longer than 100 characters when base64 encoded
    return trimmed.length > 100;
}
function isValidServiceAccountConfig(config) {
    if (!config) {
        return false;
    }
    const { project_id, client_email, private_key } = config;
    if (!project_id || !client_email) {
        return false;
    }
    if (!isLikelyValidPrivateKey(private_key)) {
        return false;
    }
    return true;
}
function readServiceAccountFromFile() {
    const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const defaultPath = path_1.default.join(process.cwd(), 'firebase-admin-key.json');
    const candidatePaths = configuredPath ? [configuredPath] : [defaultPath];
    for (const relativePath of candidatePaths) {
        if (!relativePath)
            continue;
        const filePath = path_1.default.isAbsolute(relativePath) ? relativePath : path_1.default.join(process.cwd(), relativePath);
        try {
            if (!fs_1.default.existsSync(filePath)) {
                continue;
            }
            const fileContents = fs_1.default.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(fileContents);
            parsed.private_key = normalizePrivateKey(parsed.private_key);
            if (isValidServiceAccountConfig(parsed)) {
                console.info(`Firebase service account loaded from file: ${path_1.default.relative(process.cwd(), filePath)}`);
                return parsed;
            }
            console.warn(`Firebase service account file ${filePath} is missing required fields.`);
        }
        catch (error) {
            console.warn(`Failed to read Firebase service account from ${relativePath}:`, error);
        }
    }
    return null;
}
function serviceAccountFromEnvVariables() {
    var _a;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            parsed.private_key = normalizePrivateKey(parsed.private_key);
            if (isValidServiceAccountConfig(parsed)) {
                console.info('Firebase service account loaded from FIREBASE_SERVICE_ACCOUNT.');
                return parsed;
            }
            console.warn('FIREBASE_SERVICE_ACCOUNT JSON is missing required fields or contains an invalid private key.');
        }
        catch (error) {
            console.warn('FIREBASE_SERVICE_ACCOUNT must contain valid JSON.', error);
        }
    }
    const serviceAccount = {
        type: (_a = process.env.FIREBASE_SERVICE_ACCOUNT_TYPE) !== null && _a !== void 0 ? _a : 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };
    if (isValidServiceAccountConfig(serviceAccount)) {
        console.info('Firebase service account loaded from environment variables.');
        return serviceAccount;
    }
    return null;
}
function resolveServiceAccount() {
    const envConfig = serviceAccountFromEnvVariables();
    if (envConfig) {
        return envConfig;
    }
    const fileConfig = readServiceAccountFromFile();
    if (fileConfig) {
        return fileConfig;
    }
    throw new Error('Unable to resolve Firebase service account credentials. Please provide a valid FIREBASE_SERVICE_ACCOUNT JSON string, individual FIREBASE_* environment variables, or a firebase-admin-key.json file.');
}
function initializeFirebase() {
    if (!admin.apps.length) {
        const serviceAccount = resolveServiceAccount();
        if (!serviceAccount.project_id) {
            throw new Error('Firebase service account is missing the project_id field.');
        }
        if (!serviceAccount.private_key || !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
            throw new Error('Firebase service account is missing a valid private key. Ensure FIREBASE_PRIVATE_KEY (or related configuration) is set correctly.');
        }
        const credential = (0, app_1.cert)(serviceAccount);
        firebaseApp = admin.initializeApp({
            credential,
            projectId: serviceAccount.project_id
        });
    }
    else {
        firebaseApp = admin.app();
    }
}
async function verifyToken(token) {
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    }
    catch (error) {
        throw new Error('Invalid authentication token');
    }
}
// For API route authentication
async function authenticateRequest(request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        return await verifyToken(token);
    }
    catch (error) {
        console.error('Request authentication failed:', error);
        return null;
    }
}
// Middleware for API routes that require authentication
function withAuth(handler) {
    return async (request) => {
        try {
            const user = await authenticateRequest(request);
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return await handler(request, user);
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    };
}
