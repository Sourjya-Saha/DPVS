import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export class PDFService {
    /**
     * Generates a PDF for a medical prescription, including a QR code.
     * The QR code will embed the prescriptionId and contentHash for verification.
     * @param {object} prescriptionData - Object containing prescription details:
     * {string} patientName
     * {string} medications
     * {string} dosage (optional)
     * {string} doctorActualName - The doctor's name for the signature.
     * {string} date (issued date)
     * {string} expiryDate
     * {string} prescriptionId (UUID generated in frontend, now recommended to be the contentHash)
     * {string} contentHash (keccak256 hash of PDF content)
     * @returns {Promise<Blob>} - A Blob representing the generated PDF.
     */
    async generatePrescriptionPDF(prescriptionData) {
        const pdf = new jsPDF();
        
        // Set basic font and size
        pdf.setFont('helvetica');
        pdf.setFontSize(20);
        pdf.text('Medical Prescription', 105, 20, { align: 'center' }); // Centered title
        
        pdf.setFontSize(12);
        pdf.setLineHeightFactor(1.5); // Spacing between lines

        let y = 40; // Starting Y position for details

        // Doctor & Patient Information
        pdf.text(`Doctor: ${prescriptionData.doctorActualName}`, 20, y); y += 10; // Use doctorActualName here
        pdf.text(`Patient: ${prescriptionData.patientName}`, 20, y); y += 10;
        pdf.text(`Issued Date: ${prescriptionData.date}`, 20, y); y += 10;
        pdf.text(`Expiry Date: ${prescriptionData.expiryDate}`, 20, y); y += 10;

        y += 10; // Extra space before medications
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40); // Darker color for headings
        pdf.text('Medications and Instructions:', 20, y); y += 8;

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0); // Reset text color
        const medicationsText = prescriptionData.medications;
        // Split text into lines if it's too long
        const splitMedications = pdf.splitTextToSize(medicationsText, 170); // Max width 170mm
        pdf.text(splitMedications, 20, y);
        y += (splitMedications.length * 7); // Adjust Y based on number of lines

        if (prescriptionData.dosage) {
            y += 8; // Space before dosage
            pdf.setFontSize(14);
            pdf.setTextColor(40, 40, 40);
            pdf.text('Dosage Information:', 20, y); y += 8;
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            const splitDosage = pdf.splitTextToSize(prescriptionData.dosage, 170);
            pdf.text(splitDosage, 20, y);
            y += (splitDosage.length * 7);
        }

        // Add a line for signature
        y += 20;
        pdf.line(20, y, 80, y); // Draw a line
        pdf.text('Doctor\'s Signature', 20, y + 7);

        // QR code data: Combine prescriptionId and contentHash for blockchain verification
        // Here, prescriptionId is usually the contentHash itself for consistency
        const qrCodeData = `${prescriptionData.prescriptionId}|${prescriptionData.contentHash}`;
        
        // Generate QR code as Data URL
        const qrDataURL = await QRCode.toDataURL(qrCodeData, { width: 100 }); // Increase QR code size slightly
        
        // Add QR code to the PDF
        const qrCodeX = pdf.internal.pageSize.getWidth() - 60; // 60mm from right edge
        const qrCodeY = pdf.internal.pageSize.getHeight() - 60; // 60mm from bottom edge
        pdf.addImage(qrDataURL, 'PNG', qrCodeX, qrCodeY, 40, 40); // x, y, width, height
        pdf.setFontSize(8);
        pdf.text('Scan for Verification', qrCodeX + 2, qrCodeY + 43);


        return pdf.output('blob'); // Return as Blob
    }
}
