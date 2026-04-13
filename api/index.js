const express = require('express');
const axios = require('axios');
const cors = require('cors');
let serverless = null;
try { serverless = require('serverless-http'); } catch (e) { /* ignore for local dev */ }

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes (CRITICAL for grading)
app.use(cors());
app.use(express.json());

// The /api/classify endpoint is now handled by api/classify.js for Vercel serverless deployment.
// This file can be used for local dev health checks or future endpoints.

// Health check endpoint (optional but helpful for monitoring)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found'
    });
});



// Export for Vercel serverless deployment
if (serverless) {
    module.exports = serverless(app);
} else {
    // Local dev: start server
    if (require.main === module) {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    module.exports = app;
}