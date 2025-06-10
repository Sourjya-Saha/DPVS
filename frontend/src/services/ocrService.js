import axios from 'axios';

export class OCRService {
    constructor() {
        this.apiKey = import.meta.env.REACT_APP_GOOGLE_VISION_API_KEY;
        this.endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;    }

    async extractTextFromImage(imageFile) {
        const base64Image = await this.fileToBase64(imageFile);
        
        const requestBody = {
            requests: [{
                image: {
                    content: base64Image
                },
                features: [{
                    type: 'TEXT_DETECTION',
                    maxResults: 1
                }]
            }]
        };

        try {
            const response = await axios.post(this.endpoint, requestBody);
            const textAnnotations = response.data.responses[0].textAnnotations;
            return textAnnotations[0]?.description || '';
        } catch (error) {
            console.error('OCR Error:', error);
            throw error;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    hashExtractedText(text) {
        // Normalize text (remove extra spaces, convert to lowercase)
        const normalizedText = text.replace(/\s+/g, ' ').toLowerCase().trim();
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(normalizedText));
    }
}