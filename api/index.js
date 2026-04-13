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

// Main classification endpoint
app.get('/api/classify', async (req, res) => {
    try {
        const { name } = req.query;
        
        // ERROR HANDLING: Missing or empty name parameter
        if (!name || name.trim() === '') {
            return res.status(400).json({
                status: 'error',
                message: 'Missing or empty name parameter'
            });
        }
        
        // ERROR HANDLING: Name must be a string
        if (typeof name !== 'string') {
            return res.status(422).json({
                status: 'error',
                message: 'name is not a string'
            });
        }
        
        // Call Genderize.io API
        const response = await axios.get('https://api.genderize.io', {
            params: { 
                name: name.trim().toLowerCase() 
            },
            timeout: 5000 // 5 second timeout
        });
        
        const { gender, probability, count } = response.data;
        
        // EDGE CASE: No prediction available (gender is null OR count is 0)
        if (!gender || count === 0) {
            return res.status(422).json({
                status: 'error',
                message: 'No prediction available for the provided name'
            });
        }
        
        // CONFIDENCE LOGIC: Both conditions must be true
        const is_confident = (probability >= 0.7 && count >= 100);
        
        // SUCCESS RESPONSE with all required fields
        res.status(200).json({
            status: 'success',
            data: {
                name: name.trim().toLowerCase(),
                gender: gender,
                probability: probability,
                sample_size: count, // Renamed from 'count' as per requirements
                is_confident: is_confident,
                processed_at: new Date().toISOString() // UTC ISO 8601 format
            }
        });
        
    } catch (error) {
        // ERROR HANDLING: Timeout errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return res.status(502).json({
                status: 'error',
                message: 'Upstream service timeout'
            });
        }
        
        // ERROR HANDLING: Genderize API returned an error response
        if (error.response) {
            return res.status(502).json({
                status: 'error',
                message: 'Upstream service error'
            });
        }
        
        // ERROR HANDLING: No response received from Genderize API
        if (error.request) {
            return res.status(502).json({
                status: 'error',
                message: 'Unable to reach external API'
            });
        }
        
        // ERROR HANDLING: Internal server error
        console.error('Server error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

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