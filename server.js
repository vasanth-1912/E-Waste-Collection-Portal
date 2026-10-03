/**
 * ==============================================================================
 * EcoCycle – E-Waste Collection Portal
 * Node.js REST API Backend & Static File Server
 * 
 * Architecture:
 * - RESTful API with endpoints for Pickups, Statistics, and Contact queries
 * - Persistent JSON file-based database in ./data/
 * - Static file server for frontend assets (index.html, admin.html, CSS, JS)
 * - Zero external dependencies (uses native Node.js core modules)
 * ==============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const PICKUPS_FILE = path.join(DATA_DIR, 'pickups.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PICKUPS_FILE)) {
    fs.writeFileSync(PICKUPS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(CONTACTS_FILE)) {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify([], null, 2));
}

// MIME types for static assets
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

/* --------------------------------------------------------------------------
   DATABASE HELPER FUNCTIONS
   -------------------------------------------------------------------------- */
function readJsonFile(filePath) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw || '[]');
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return [];
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err.message);
        return false;
    }
}

/* --------------------------------------------------------------------------
   UTILITY HELPERS FOR HTTP RESPONSES
   -------------------------------------------------------------------------- */
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // Prevent oversized payloads (> 1MB)
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                resolve(parsed);
            } catch (err) {
                reject(new Error('Invalid JSON format'));
            }
        });
        req.on('error', reject);
    });
}

/* --------------------------------------------------------------------------
   MAIN REQUEST HANDLER
   -------------------------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // Enable CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    // ==========================================
    // REST API ROUTING (/api/...)
    // ==========================================
    if (pathname.startsWith('/api/')) {

        // 1. Health & Server Status (GET /api/status)
        if (pathname === '/api/status' && method === 'GET') {
            return sendJson(res, 200, {
                status: 'online',
                service: 'EcoCycle E-Waste Portal REST API',
                version: '1.0.0',
                uptimeSeconds: Math.floor(process.uptime()),
                timestamp: new Date().toISOString()
            });
        }

        // 2. Dynamic Live Statistics (GET /api/stats)
        if (pathname === '/api/stats' && method === 'GET') {
            const pickups = readJsonFile(PICKUPS_FILE);
            const totalPickups = pickups.length;
            const totalUnits = pickups.reduce((sum, p) => sum + (parseInt(p.quantity, 10) || 1), 0);
            const scheduledCount = pickups.filter(p => p.status === 'Scheduled').length;
            const inTransitCount = pickups.filter(p => p.status === 'In Transit').length;
            const recycledCount = pickups.filter(p => p.status === 'Recycled').length;

            const categoryBreakdown = {};
            pickups.forEach(p => {
                const cat = p.category || 'Other Electronics';
                categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (parseInt(p.quantity, 10) || 1);
            });

            return sendJson(res, 200, {
                success: true,
                stats: {
                    totalPickups,
                    totalUnits,
                    scheduledCount,
                    inTransitCount,
                    recycledCount,
                    categoryBreakdown
                }
            });
        }

        // 3. Pickup Requests Collection (GET & POST /api/pickups)
        if (pathname === '/api/pickups') {
            // GET /api/pickups - List with optional filters (?category=...&status=...)
            if (method === 'GET') {
                let pickups = readJsonFile(PICKUPS_FILE);
                const { category, status, search } = parsedUrl.query;

                if (category) {
                    pickups = pickups.filter(p => p.category.toLowerCase() === category.toLowerCase());
                }
                if (status) {
                    pickups = pickups.filter(p => p.status.toLowerCase() === status.toLowerCase());
                }
                if (search) {
                    const q = search.toLowerCase();
                    pickups = pickups.filter(p => 
                        p.id.toLowerCase().includes(q) ||
                        p.fullName.toLowerCase().includes(q) ||
                        p.email.toLowerCase().includes(q) ||
                        p.mobile.includes(q)
                    );
                }

                return sendJson(res, 200, {
                    success: true,
                    count: pickups.length,
                    data: pickups
                });
            }

            // POST /api/pickups - Create new pickup request
            if (method === 'POST') {
                try {
                    const body = await parseRequestBody(req);
                    const { fullName, email, mobile, category, quantity, pickupDate, address } = body;

                    // Server-side validation
                    if (!fullName || fullName.trim().length < 3) {
                        return sendJson(res, 400, { success: false, message: 'Full Name is required (minimum 3 characters).' });
                    }
                    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        return sendJson(res, 400, { success: false, message: 'Valid email address is required.' });
                    }
                    if (!mobile || mobile.replace(/\D/g, '').length !== 10) {
                        return sendJson(res, 400, { success: false, message: 'Valid 10-digit mobile number is required.' });
                    }
                    if (!category) {
                        return sendJson(res, 400, { success: false, message: 'E-Waste Category is required.' });
                    }
                    const parsedQty = parseInt(quantity, 10);
                    if (isNaN(parsedQty) || parsedQty < 1) {
                        return sendJson(res, 400, { success: false, message: 'Quantity must be at least 1 device.' });
                    }
                    if (!pickupDate) {
                        return sendJson(res, 400, { success: false, message: 'Pickup date is required.' });
                    }
                    if (!address || address.trim().length < 10) {
                        return sendJson(res, 400, { success: false, message: 'Detailed pickup address is required (minimum 10 characters).' });
                    }

                    // Generate unique ID
                    const requestId = 'ECO-' + Math.floor(10000 + Math.random() * 90000);
                    const newPickup = {
                        id: requestId,
                        fullName: fullName.trim(),
                        email: email.trim(),
                        mobile: mobile.trim(),
                        category,
                        quantity: parsedQty,
                        pickupDate,
                        address: address.trim(),
                        status: 'Scheduled',
                        createdAt: new Date().toLocaleString()
                    };

                    const existing = readJsonFile(PICKUPS_FILE);
                    existing.unshift(newPickup);
                    writeJsonFile(PICKUPS_FILE, existing);

                    console.log(`[API] New Pickup Created: ${requestId} for ${newPickup.fullName}`);

                    return sendJson(res, 201, {
                        success: true,
                        message: 'Pickup scheduled successfully!',
                        data: newPickup
                    });
                } catch (err) {
                    return sendJson(res, 400, { success: false, message: err.message });
                }
            }
        }

        // 4. Single Pickup Item Operations (/api/pickups/:id)
        const pickupIdMatch = pathname.match(/^\/api\/pickups\/([A-Za-z0-9\-]+)$/);
        if (pickupIdMatch) {
            const requestId = pickupIdMatch[1];
            const pickups = readJsonFile(PICKUPS_FILE);

            // GET single pickup
            if (method === 'GET') {
                const item = pickups.find(p => p.id === requestId);
                if (!item) {
                    return sendJson(res, 404, { success: false, message: `Pickup ${requestId} not found.` });
                }
                return sendJson(res, 200, { success: true, data: item });
            }

            // DELETE single pickup
            if (method === 'DELETE') {
                const index = pickups.findIndex(p => p.id === requestId);
                if (index === -1) {
                    return sendJson(res, 404, { success: false, message: `Pickup ${requestId} not found.` });
                }
                const deleted = pickups.splice(index, 1)[0];
                writeJsonFile(PICKUPS_FILE, pickups);

                console.log(`[API] Pickup Deleted: ${requestId}`);
                return sendJson(res, 200, {
                    success: true,
                    message: `Pickup request ${requestId} deleted successfully.`,
                    data: deleted
                });
            }
        }

        // 5. Update Status Endpoint (PATCH /api/pickups/:id/status)
        const statusMatch = pathname.match(/^\/api\/pickups\/([A-Za-z0-9\-]+)\/status$/);
        if (statusMatch && method === 'PATCH') {
            try {
                const requestId = statusMatch[1];
                const body = await parseRequestBody(req);
                const { status } = body;

                const allowedStatuses = ['Scheduled', 'In Transit', 'Recycled', 'Cancelled'];
                if (!allowedStatuses.includes(status)) {
                    return sendJson(res, 400, {
                        success: false,
                        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
                    });
                }

                const pickups = readJsonFile(PICKUPS_FILE);
                const item = pickups.find(p => p.id === requestId);
                if (!item) {
                    return sendJson(res, 404, { success: false, message: `Pickup ${requestId} not found.` });
                }

                item.status = status;
                item.updatedAt = new Date().toLocaleString();
                writeJsonFile(PICKUPS_FILE, pickups);

                console.log(`[API] Status Updated: ${requestId} -> ${status}`);
                return sendJson(res, 200, {
                    success: true,
                    message: `Status for ${requestId} updated to ${status}.`,
                    data: item
                });
            } catch (err) {
                return sendJson(res, 400, { success: false, message: err.message });
            }
        }

        // 6. Clear All Pickups (POST /api/pickups/clear)
        if (pathname === '/api/pickups/clear' && method === 'POST') {
            writeJsonFile(PICKUPS_FILE, []);
            return sendJson(res, 200, {
                success: true,
                message: 'All pickup requests cleared successfully.'
            });
        }

        // 7. Contact Inquiries (GET & POST /api/contact)
        if (pathname === '/api/contact' || pathname === '/api/contacts') {
            if (method === 'GET') {
                const contacts = readJsonFile(CONTACTS_FILE);
                return sendJson(res, 200, { success: true, count: contacts.length, data: contacts });
            }

            if (method === 'POST') {
                try {
                    const body = await parseRequestBody(req);
                    const { name, email, message } = body;

                    if (!name || name.trim().length < 2) {
                        return sendJson(res, 400, { success: false, message: 'Name is required.' });
                    }
                    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        return sendJson(res, 400, { success: false, message: 'Valid email is required.' });
                    }
                    if (!message || message.trim().length < 5) {
                        return sendJson(res, 400, { success: false, message: 'Message must be at least 5 characters.' });
                    }

                    const newContact = {
                        id: 'MSG-' + Math.floor(1000 + Math.random() * 9000),
                        name: name.trim(),
                        email: email.trim(),
                        message: message.trim(),
                        createdAt: new Date().toLocaleString()
                    };

                    const contacts = readJsonFile(CONTACTS_FILE);
                    contacts.unshift(newContact);
                    writeJsonFile(CONTACTS_FILE, contacts);

                    console.log(`[API] New Contact Message from ${newContact.name}`);
                    return sendJson(res, 201, {
                        success: true,
                        message: 'Thank you! Your message has been received.',
                        data: newContact
                    });
                } catch (err) {
                    return sendJson(res, 400, { success: false, message: err.message });
                }
            }
        }

        // API 404 handler
        return sendJson(res, 404, { success: false, message: `Endpoint ${method} ${pathname} not found.` });
    }

    // ==========================================
    // STATIC FILE SERVER
    // ==========================================
    if (method === 'GET') {
        let cleanPath = pathname === '/' ? '/index.html' : pathname;
        // Strip trailing slash if present
        if (cleanPath.endsWith('/') && cleanPath !== '/') {
            cleanPath = cleanPath.slice(0, -1);
        }

        let filePath = path.join(__dirname, cleanPath);

        // Security check: ensure requests don't escape project directory
        if (!filePath.startsWith(__dirname)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('403 Forbidden');
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                // If not found, serve index.html or 404
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>404 - Page Not Found</title><style>body{font-family:sans-serif;text-align:center;padding:50px;}</style></head>
                    <body>
                        <h2>404 - File Not Found</h2>
                        <p>The requested file <code>${pathname}</code> was not found.</p>
                        <a href="/">Back to EcoCycle Home</a>
                    </body>
                    </html>
                `);
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
        });
        return;
    }

    // Default method not allowed
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('405 Method Not Allowed');
});

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  EcoCycle E-Waste Portal Backend Server`);
    console.log(`  Running at: http://localhost:${PORT}`);
    console.log(`  REST API Root: http://localhost:${PORT}/api/`);
    console.log(`  Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`=======================================================`);
});
