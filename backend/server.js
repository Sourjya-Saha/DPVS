// server.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const cors = require('cors'); // For Cross-Origin Resource Sharing
const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream'); // Import Readable from stream module
const multer = require('multer'); // For handling file uploads

const app = express();

// Pinata API keys (ensure these are set as environment variables in Vercel)
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

// --- CRITICAL DEBUG CONSOLE.LOGS (will appear in Vercel logs) ---
// These logs will show you EXACTLY what API keys your Node.js process is loading.
// Compare these outputs with the keys on your Pinata dashboard.
console.log("DEBUG BACKEND: Attempting to load PINATA_API_KEY...");
console.log(`DEBUG BACKEND: Loaded PINATA_API_KEY (first 5 chars): ${PINATA_API_KEY ? PINATA_API_KEY.substring(0, 5) : 'NOT SET or UNDEFINED'}`);
console.log(`DEBUG BACKEND: Loaded PINATA_SECRET_KEY (first 5 chars): ${PINATA_SECRET_KEY ? PINATA_SECRET_KEY.substring(0, 5) : 'NOT SET or UNDEFINED'}`);
console.log(`DEBUG BACKEND: Is PINATA_API_KEY valid? ${!!PINATA_API_KEY}`);
console.log(`DEBUG BACKEND: Is PINATA_SECRET_KEY valid? ${!!PINATA_SECRET_KEY}`);
// --- END CRITICAL DEBUG CONSOLE.LOGS ---

if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.error("PINATA_API_KEY or PINATA_SECRET_KEY are not set in backend environment variables!");
    console.error("Please ensure these are configured in your Vercel project settings (Environment Variables).");
    // Don't throw error immediately - let Vercel handle gracefully
}

let pinata;
if (PINATA_API_KEY && PINATA_SECRET_KEY) {
    pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);
}

// --- CORS Configuration ---
// IMPORTANT: Replace the 'origin' with your actual frontend deployment URL.
// If your frontend is deployed at 'https://decentralizedprescriptionverificationsys-sourjya-sahas-projects.vercel.app', use that.
const corsOptions = {
    origin: ['https://decentralizedprescriptionverificationsys-sourjya-sahas-projects.vercel.app', 'http://localhost:3000'], // Your frontend's deployed URL + localhost for dev
    methods: ['GET', 'POST'], // Specify allowed methods (GET for test-connection, POST for upload)
    credentials: true, // Set to true if you are handling cookies or authorization headers
    optionsSuccessStatus: 204 // For preflight requests
};

app.use(cors(corsOptions)); // Apply CORS with your specific options
// --- END CORS Configuration ---

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

const storage = multer.memoryStorage(); // Store file in memory as a Buffer
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Endpoint for uploading PDF to IPFS
app.post('/api/upload-prescription', upload.single('prescriptionPdf'), async (req, res) => {
    try {
        // Check if Pinata is initialized
        if (!pinata) {
            return res.status(500).json({ 
                error: 'Pinata API keys not configured properly.',
                details: 'Please check environment variables in Vercel dashboard.'
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file provided.' });
        }
        if (!req.body.patientName) {
            return res.status(400).json({ error: 'Patient name is required for metadata.' });
        }

        const fileBuffer = req.file.buffer; // Get the file as a Buffer
        const readableStreamForFile = Readable.from(fileBuffer); // Use imported Readable

        const fileName = `prescription-${req.body.patientName}-${Date.now()}.pdf`;

        console.log("DEBUG BACKEND: Attempting to pin file to IPFS...");
        const result = await pinata.pinFileToIPFS(readableStreamForFile, {
            pinataMetadata: {
                name: fileName,
                keyvalues: {
                    doctor: req.body.doctorName || 'unknown_doctor',
                    patient: req.body.patientName,
                    patientAddress: req.body.patientAddress || 'unknown_address',
                    issuedAt: new Date().toISOString(),
                    project: 'DPVS',
                    type: 'prescription-pdf',
                    prescriptionId: req.body.prescriptionId || 'no_id'
                }
            }
        });
        console.log("DEBUG BACKEND: File pinned successfully.");

        res.json({
            hash: result.IpfsHash,
            url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`, // Fixed the URL format
            size: result.PinSize
        });

    } catch (error) {
        console.error('Backend Pinata upload error:', error);
        // Provide more detailed error response during development/debugging
        res.status(500).json({
            error: 'Failed to upload to IPFS.',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined // Only expose stack in dev
        });
    }
});

// Endpoint to test Pinata connection from backend
app.get('/api/test-pinata-connection', async (req, res) => {
    try {
        // Check if Pinata is initialized
        if (!pinata) {
            return res.status(500).json({ 
                success: false, 
                message: 'Pinata API keys not configured properly.',
                details: 'Please check environment variables in Vercel dashboard.'
            });
        }

        console.log("DEBUG BACKEND: Testing Pinata authentication...");
        const result = await pinata.testAuthentication();
        console.log('Pinata connection successful (backend):', result);
        res.json({ success: true, message: 'Pinata backend connection successful.' });
    } catch (error) {
        console.error('Pinata connection failed (backend):', error);
        res.status(500).json({ success: false, message: 'Pinata backend connection failed.', details: error.message });
    }
});

// Basic root route for health checks or initial access
app.get('/', (req, res) => {
    res.json({ 
        message: 'DPVS Backend API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Export the Express app for Vercel
module.exports = app;
