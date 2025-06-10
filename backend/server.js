// server.js (example using Express)
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const cors = require('cors'); // For Cross-Origin Resource Sharing
const pinataSDK = require('@pinata/sdk');
const stream = require('stream'); // Import the stream module
const multer = require('multer'); // For handling file uploads

const app = express();
const port = process.env.PORT || 5000; // Use a different port than your React app (e.g., 5000)

// Pinata API keys (ensure these are in your backend's .env)
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

// --- CRITICAL DEBUG CONSOLE.LOGS ---
// These logs will show you EXACTLY what API keys your Node.js process is loading.
// Compare these outputs with the keys on your Pinata dashboard.
console.log("DEBUG BACKEND: Attempting to load PINATA_API_KEY...");
console.log(`DEBUG BACKEND: Loaded PINATA_API_KEY (first 5 chars): ${PINATA_API_KEY ? PINATA_API_KEY.substring(0, 5) : 'NOT SET or UNDEFINED'}`);
console.log(`DEBUG BACKEND: Loaded PINATA_SECRET_KEY (first 5 chars): ${PINATA_SECRET_KEY ? PINATA_SECRET_KEY.substring(0, 5) : 'NOT SET or UNDEFINED'}`);
console.log(`DEBUG BACKEND: Is PINATA_API_KEY valid? ${!!PINATA_API_KEY}`);
console.log(`DEBUG BACKEND: Is PINATA_SECRET_KEY valid? ${!!PINATA_SECRET_KEY}`);
// --- END CRITICAL DEBUG CONSOLE.LOGS ---

if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.error("PINATA_API_KEY or PINATA_SECRET_KEY are not set in backend .env! Please check your backend/.env file and ensure it's in the correct directory where the server is run.");
    // Do not exit process. Allows testing connection endpoint to still work.
    // process.exit(1);
    throw new Error("Pinata API keys are missing or invalid in backend environment."); // Throw error instead of process.exit
}

const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);

app.use(cors()); // Enable CORS for your frontend to access
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

const storage = multer.memoryStorage(); // Store file in memory as a Buffer
const upload = multer({ storage: storage });

// Endpoint for uploading PDF to IPFS
app.post('/api/upload-prescription', upload.single('prescriptionPdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file provided.' });
        }
        if (!req.body.patientName) {
            return res.status(400).json({ error: 'Patient name is required for metadata.' });
        }

        const fileBuffer = req.file.buffer; // Get the file as a Buffer
        const readableStreamForFile = stream.Readable.from(fileBuffer); // Use imported stream module

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
            url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
            size: result.PinSize
        });

    } catch (error) {
        console.error('Backend Pinata upload error:', error);
        res.status(500).json({ error: 'Failed to upload to IPFS.', details: error.message, stack: error.stack });
    }
});

// Endpoint to test Pinata connection from backend
app.get('/api/test-pinata-connection', async (req, res) => {
    try {
        console.log("DEBUG BACKEND: Testing Pinata authentication...");
        const result = await pinata.testAuthentication();
        console.log('Pinata connection successful (backend):', result);
        res.json({ success: true, message: 'Pinata backend connection successful.' });
    } catch (error) {
        console.error('Pinata connection failed (backend):', error);
        res.status(500).json({ success: false, message: 'Pinata backend connection failed.', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});