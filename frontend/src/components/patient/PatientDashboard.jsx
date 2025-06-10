import React, { useState, useEffect } from 'react';
import { ContractService } from '../../services/contractService';
import { ethers } from 'ethers';
import {
    Pill, // For individual prescriptions
    ShieldCheck, // For fulfilled status or general security
    ClipboardList, // For pending prescriptions
    QrCode, // For sharing/QR code functionality
    Wallet, // For wallet connection status
    Loader2, // For loading states
    Info, // For general status messages
    XCircle, // For error messages
    ArrowRight, // For links
    ChevronLeft, // For pagination
    ChevronRight // For pagination
} from 'lucide-react';

const PatientDashboard = ({ signer }) => {
    const [patientPrescriptions, setPatientPrescriptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [qrCodeData, setQrCodeData] = useState(null); // This will now hold the duplicated content hash string
    const [showQrModal, setShowQrModal] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const prescriptionsPerPage = 6;

    // Calculate pagination values
    const totalPages = Math.ceil(patientPrescriptions.length / prescriptionsPerPage);
    const startIndex = (currentPage - 1) * prescriptionsPerPage;
    const endIndex = startIndex + prescriptionsPerPage;
    const currentPrescriptions = patientPrescriptions.slice(startIndex, endIndex);

    // Reset to first page when prescriptions change
    useEffect(() => {
        setCurrentPage(1);
    }, [patientPrescriptions.length]);

    // Helper to generate a QR code (using a simple data URL for demonstration)
    const generateQrCode = (data) => {
        // Data will now be the custom duplicated content hash string
        console.log("Generating QR code for custom string:", data);
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
    };

    const handleShareClick = (prescription) => {
        // *** Construct the QR code data in the specified [contentHash]|[contentHash] format ***
        if (prescription.contentHash && prescription.contentHash !== ethers.ZeroHash) {
            const duplicatedContentHashString = `${prescription.contentHash}|${prescription.contentHash}`;
            setQrCodeData(duplicatedContentHashString);
            setShowQrModal(true);
        } else {
            console.error("Cannot generate QR code: Prescription content hash is missing or invalid.");
            setStatus("Error: Cannot generate QR code for this prescription. Content hash is missing.");
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    useEffect(() => {
        const fetchPatientPrescriptions = async () => {
            if (!signer) {
                setPatientPrescriptions([]);
                setStatus('Please connect your MetaMask wallet to view prescriptions.');
                return;
            }

            let patientAddress;
            try {
                patientAddress = await signer.getAddress();
            } catch (error) {
                console.error("Error getting signer address:", error);
                setPatientPrescriptions([]);
                setStatus('Signer address not available. Please ensure wallet is properly connected.');
                return;
            }

            setIsLoading(true);
            setStatus('Fetching your prescriptions...');
            try {
                const contractService = new ContractService(signer);
                console.log("DEBUG: Fetching prescription IDs (content hashes) for patient:", patientAddress);

                const rawPrescriptionIds = await contractService.prescriptionRegistry.getPatientPrescriptionIds(patientAddress);
                const prescriptionIds = Array.isArray(rawPrescriptionIds) ? rawPrescriptionIds : [];
                console.log("DEBUG: Fetched prescription IDs (content hashes):", prescriptionIds);

                const fetchedPrescriptions = [];
                for (const id of prescriptionIds) {
                    if (!id || id === ethers.ZeroHash || id === ethers.ZeroAddress) {
                        console.warn(`Skipping invalid or zero-hash prescription ID: ${id}`);
                        continue;
                    }

                    try {
                        const prescriptionDetails = await contractService.getPrescriptionDetails(id);
                        console.log(`DEBUG: Fetched details for ID (contentHash) ${id}:`, prescriptionDetails);

                        const fulfillmentsArray = (prescriptionDetails.fulfillments && typeof prescriptionDetails.fulfillments[Symbol.iterator] === 'function')
                            ? Array.from(prescriptionDetails.fulfillments)
                            : [];

                        const isFulfilled = fulfillmentsArray.length > 0;
                        const lastFulfillment = isFulfilled
                            ? fulfillmentsArray[fulfillmentsArray.length - 1]
                            : null;

                        const processedFulfillments = fulfillmentsArray.map(fulfillment => ({
                            pharmacyAddress: fulfillment.pharmacyAddress || ethers.ZeroAddress,
                            pharmacyName: fulfillment.pharmacyName || 'Unknown Pharmacy',
                            fulfilledAt: fulfillment.fulfilledAt > 0
                                ? new Date(Number(fulfillment.fulfilledAt) * 1000).toLocaleDateString()
                                : 'N/A'
                        }));

                        fetchedPrescriptions.push({
                            prescriptionId: prescriptionDetails.contentHash || ethers.ZeroHash,
                            doctor: prescriptionDetails.doctor || ethers.ZeroAddress,
                            patient: prescriptionDetails.patient || ethers.ZeroAddress,
                            contentHash: prescriptionDetails.contentHash || ethers.ZeroHash,
                            ipfsHash: prescriptionDetails.ipfsHash || '',

                            issuedAt: prescriptionDetails.issuedAt > 0
                                ? new Date(Number(prescriptionDetails.issuedAt) * 1000).toLocaleDateString()
                                : 'N/A',
                            expiryDate: prescriptionDetails.expiryDate > 0
                                ? new Date(Number(prescriptionDetails.expiryDate) * 1000).toLocaleDateString()
                                : 'N/A',

                            isFulfilled: isFulfilled,
                            fulfilledBy: lastFulfillment ? (lastFulfillment.pharmacyAddress || ethers.ZeroAddress) : ethers.ZeroAddress,
                            fulfilledAt: lastFulfillment ? lastFulfillment.fulfilledAt : 'N/A',

                            allFulfillments: processedFulfillments
                        });
                    } catch (detailError) {
                        console.error(`Error fetching details for prescription ID ${id}:`, detailError);
                        continue;
                    }
                }

                setPatientPrescriptions(fetchedPrescriptions);
                setStatus(`Found ${fetchedPrescriptions.length} prescriptions.`);

            } catch (error) {
                console.error("❌ Error fetching patient prescriptions:", error);
                setStatus(`❌ Error fetching prescriptions: ${error.message}`);
                setPatientPrescriptions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPatientPrescriptions();
    }, [signer]);

    const truncateAddress = (address) => {
        if (!address || address === ethers.ZeroAddress || address === ethers.ZeroHash) {
            return 'N/A';
        }
        return typeof address === 'string' && address.length > 10
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : address;
    };

    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-start text-white py-8 px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white mb-8 text-center bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text">Your&nbsp;
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">
                         Prescription's
                    </span>
                   
            </h2>

            {/* Status Messages */}
            {status && (
                <div className={`mb-6 p-4 rounded-lg shadow-lg flex items-center space-x-3 w-full max-w-2xl
                    ${status.includes('Found') || status.includes('Connecting') || status.includes('Welcome') ? 'bg-green-600/20 text-green-200 border border-green-500/30' :
                      status.includes('Error') || status.includes('Failed') || status.includes('invalid') ? 'bg-red-600/20 text-red-200 border border-red-500/30' :
                      'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                    } backdrop-blur-md`}>
                    {status.includes('Error') || status.includes('Failed') || status.includes('invalid') ? <XCircle className="w-5 h-5" /> :
                     isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                     <Info className="w-5 h-5" />}
                    <p className="text-sm sm:text-base whitespace-pre-line">{status}</p>
                </div>
            )}

            {/* Main Content Area */}
            {isLoading ? (
                <div className="text-center text-gray-400 text-lg mt-8 flex flex-col items-center">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-4" />
                    Loading your prescriptions from the blockchain...
                </div>
            ) : patientPrescriptions.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 text-center max-w-md mx-auto mt-8">
                    <ClipboardList className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
                    <p className="text-xl text-gray-200 font-semibold mb-3">No Prescriptions Found</p>
                    <p className="text-gray-300">It looks like you don't have any prescriptions recorded on the blockchain yet. New prescriptions will appear here after your doctor issues them.</p>
                </div>
            ) : (
                <>
                    {/* Pagination Info */}
                    <div className="mb-6 text-center">
                        <p className="text-gray-300 text-sm">
                            Showing {startIndex + 1}-{Math.min(endIndex, patientPrescriptions.length)} of {patientPrescriptions.length} prescriptions
                        </p>
                    </div>

                    {/* Prescriptions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
                        {currentPrescriptions.map((prescription, index) => (
                            <div
                                key={`${prescription.prescriptionId}-${index}`}
                                className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/10 hover:border-purple-400/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-semibold text-white flex items-center">
                                        <Pill className={`w-6 h-6 mr-3 ${prescription.isFulfilled ? 'text-green-400' : 'text-cyan-400'}`} />
                                        Prescription <span className="hidden sm:inline-block ml-1">#{startIndex + index + 1}</span>
                                    </h3>
                                    {prescription.isFulfilled ? (
                                        <span className="bg-green-500/30 text-green-200 text-xs font-semibold px-3 py-1 rounded-full flex items-center">
                                            <ShieldCheck className="w-3 h-3 mr-1" /> Fulfilled
                                        </span>
                                    ) : (
                                        <span className="bg-cyan-500/30 text-cyan-200 text-xs font-semibold px-3 py-1 rounded-full flex items-center">
                                            <ClipboardList className="w-3 h-3 mr-1" /> Active
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 text-gray-300 text-sm">
                                    <p><strong className="text-white">Doctor:</strong> {truncateAddress(prescription.doctor)}</p>
                                    <p><strong className="text-white">Issued On:</strong> {prescription.issuedAt}</p>
                                    <p><strong className="text-white">Expires On:</strong> {prescription.expiryDate}</p>
                                    <p><strong className="text-white">Content Hash:</strong> <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">{truncateAddress(prescription.contentHash)}</span></p>
                                    {prescription.ipfsHash && (
                                        <p className="flex items-center">
                                            <strong className="text-white mr-2">IPFS:</strong>
                                            <a
                                                href={`https://gateway.pinata.cloud/ipfs/${prescription.ipfsHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                                            >
                                                View Content <ArrowRight className="w-4 h-4 ml-1" />
                                            </a>
                                        </p>
                                    )}
                                </div>

                                {/* Fulfillments Section */}
                                {prescription.isFulfilled && prescription.allFulfillments && prescription.allFulfillments.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="font-semibold text-white mb-2 text-base">Fulfillment History:</p>
                                        <ul className="space-y-1 text-gray-400 text-xs">
                                            {prescription.allFulfillments.map((fulfillment, fulfillIndex) => (
                                                <li key={fulfillIndex} className="flex items-center">
                                                    <ShieldCheck className="w-3 h-3 mr-2 text-green-300" />
                                                    Fulfilled by <strong className="text-green-300">{fulfillment.pharmacyName}</strong> ({truncateAddress(fulfillment.pharmacyAddress)}) on {fulfillment.fulfilledAt}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Share Button (if not fulfilled, or allow multiple fulfillments) */}
                                {!prescription.isFulfilled && (
                                    <button
                                        onClick={() => handleShareClick(prescription)}
                                        className="mt-6 w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                                    >
                                        <QrCode className="w-5 h-5 mr-2" /> Share with Pharmacy
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center space-x-4">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                    currentPage === 1
                                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                        : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
                                }`}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </button>

                            <div className="flex items-center space-x-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${
                                            currentPage === page
                                                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                                                : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                    currentPage === totalPages
                                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                        : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
                                }`}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 text-center relative max-w-sm w-full">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                        <h3 className="text-3xl font-bold text-white mb-6">Scan to Share</h3>
                        {qrCodeData && (
                            <div className="bg-white p-4 rounded-lg inline-block">
                                {/* The img src now directly uses the `duplicatedContentHashString` */}
                                <img src={generateQrCode(qrCodeData)} alt="QR Code" className="w-48 h-48 sm:w-64 sm:h-64 mx-auto" />
                            </div>
                        )}
                        <p className="text-gray-300 text-sm mt-4">Show this QR code to your pharmacist for quick and secure verification.</p>
                        <p className="text-gray-400 text-xs mt-2">Note: This QR code contains the prescription's content hash for verification.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;