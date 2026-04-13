const express = require('express');
const axios = require('axios');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(express.json());

// Main classification endpoint (now at /api/classify)
app.get('/', async (req, res) => {
    try {
        const { name } = req.query;
        if (!name || name.trim() === '') {
            return res.status(400).json({
                status: 'error',
                message: 'Missing or empty name parameter'
            });
        }
        if (typeof name !== 'string') {
            return res.status(422).json({
                status: 'error',
                message: 'name is not a string'
            });
        }
        const response = await axios.get('https://api.genderize.io', {
            params: { name: name.trim().toLowerCase() },
            timeout: 5000
        });
        const { gender, probability, count } = response.data;
        if (!gender || count === 0) {
            return res.status(422).json({
                status: 'error',
                message: 'No prediction available for the provided name'
            });
        }
        const is_confident = (probability >= 0.7 && count >= 100);
        res.status(200).json({
            status: 'success',
            data: {
                name: name.trim().toLowerCase(),
                gender: gender,
                probability: probability,
                sample_size: count,
                is_confident: is_confident,
                processed_at: new Date().toISOString()
            }
        });
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return res.status(502).json({
                status: 'error',
                message: 'Upstream service timeout'
            });
        }
        if (error.response) {
            return res.status(502).json({
                status: 'error',
                message: 'Upstream service error'
            });
        }
        if (error.request) {
            return res.status(502).json({
                status: 'error',
                message: 'Unable to reach external API'
            });
        }
        console.error('Server error:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

module.exports = serverless(app);
