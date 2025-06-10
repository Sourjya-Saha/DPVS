// src/services/ipfsService.js
import axios from 'axios';

// Replace with the URL of your backend server
const BACKEND_API_URL = 'https://dpvs.vercel.app/api'; // Or your deployed backend URL

export class IPFSService {
    constructor() {
        // No need to instantiate pinataSDK here anymore
    }

    async uploadPrescriptionPDF(pdfBlob, prescriptionData) {
        try {
            const formData = new FormData();
            formData.append('prescriptionPdf', pdfBlob, 'prescription.pdf');
            // Append other prescription data fields if your backend needs them
            formData.append('patientName', prescriptionData.patientName);
            formData.append('patientAddress', prescriptionData.patientAddress);
            formData.append('doctorName', prescriptionData.doctorName || ''); // If you have a doctorName in state

            const response = await axios.post(`${BACKEND_API_URL}/upload-prescription`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return response.data; // This will contain hash, url, size from your backend
        } catch (error) {
            console.error('Frontend PDF upload error via backend:', error);
            // Propagate the error message from the backend if available
            throw new Error(error.response?.data?.error || 'Failed to upload prescription PDF.');
        }
    }

    async testConnection() {
        try {
            // Test connection to your own backend's Pinata check
            const response = await axios.get(`${BACKEND_API_URL}/test-pinata-connection`);
            return response.data.success;
        } catch (error) {
            console.error('Frontend Pinata backend connection test failed:', error);
            return false;
        }
    }

    // You might remove or adapt other methods like uploadFile, uploadJSON, removeFile
    // if they are not used or need to go through the backend as well.
    // getFileInfo, extractHashFromUrl can remain as they are client-side helpers.
    
    getGatewayUrl(ipfsHash) {
        return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    }

    extractHashFromUrl(url) {
        const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }
}
