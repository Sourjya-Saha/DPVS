import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ContractService } from '../../services/contractService';
import { IPFSService } from '../../services/ipfsService';
import { PDFService } from '../../services/pdfService';
import {
    Pill, // For prescription icon
    ShieldCheck, // For fulfilled status or general security
    ClipboardList, // For scanning/verification or registration
    QrCode, // For QR scanning/input
    Wallet, // For wallet connection status
    Loader2, // For loading states
    Info, // For general status messages
    XCircle, // For error messages
    CheckCircle, // For success messages
    Scan, // For initiating scan
    UserPlus, // For pharmacy registration
    Trash2, // For removing registration
    Link as LinkIcon // For IPFS link
} from 'lucide-react';
// Ensure 'html5-qrcode' is installed: `npm install html5-qrcode`
import { Html5Qrcode } from 'html5-qrcode';

const PharmacyDashboard = ({ signer, account }) => {
    const [qrCodeInput, setQrCodeInput] = useState('');
    const [verificationStatus, setVerificationStatus] = useState(null); // null, 'loading', 'valid', 'invalid', 'error'
    const [verifiedPrescription, setVerifiedPrescription] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [isPharmacyVerified, setIsPharmacyVerified] = useState(false);
    const [pharmacyName, setPharmacyName] = useState('');

    // State for pharmacy registration form
    const [pharmacyRegistrationName, setPharmacyRegistrationName] = useState('');

    // Helper to truncate addresses for display
    const truncateAddress = (address) => {
        if (!address || address === ethers.ZeroAddress || address === ethers.ZeroHash) {
            return 'N/A';
        }
        return typeof address === 'string' && address.length > 10
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : address;
    };

    // Effect for QR code scanner initialization and cleanup
    useEffect(() => {
        let html5QrcodeScanner;

        if (showScanner) {
            const timer = setTimeout(async () => {
                const qrCodeDivId = "qr-code-reader";
                const scannerElement = document.getElementById(qrCodeDivId);

                if (!scannerElement) {
                    console.error("QR code reader div not found. Cannot initialize scanner.");
                    setStatusMessage("Error: QR scanner container not found.");
                    setShowScanner(false);
                    return;
                }

                try {
                    html5QrcodeScanner = new Html5Qrcode(qrCodeDivId);
                    const cameras = await Html5Qrcode.getCameras();
                    if (cameras && cameras.length > 0) {
                        let cameraId = null;
                        const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

                        if (isMobile) {
                            const rearCamera = cameras.find(camera =>
                                camera.label.toLowerCase().includes('back') ||
                                camera.label.toLowerCase().includes('environment')
                            );
                            cameraId = rearCamera ? rearCamera.id : cameras[0].id;
                            if (!rearCamera) console.warn("Could not find a specific back camera for mobile, using first available.");
                        } else {
                            const frontCamera = cameras.find(camera =>
                                camera.label.toLowerCase().includes('front') ||
                                camera.label.toLowerCase().includes('user')
                            );
                            cameraId = frontCamera ? frontCamera.id : cameras[0].id;
                            if (!frontCamera) console.warn("Could not find a specific front camera for desktop, using first available.");
                        }

                        if (cameraId) {
                            setStatusMessage("Starting camera...");
                            await html5QrcodeScanner.start(
                                cameraId,
                                {
                                    fps: 10,
                                    qrbox: { width: 250, height: 250 },
                                    disableFlip: false,
                                },
                                (decodedText, decodedResult) => {
                                    console.log(`QR Code scanned: ${decodedText}`);
                                    setQrCodeInput(decodedText);
                                    setShowScanner(false); // Hide scanner after successful scan
                                    setStatusMessage('QR code scanned. Click "Verify" to proceed.');
                                },
                                (error) => {
                                    // console.warn(`QR Code scan error: ${error}`); // Suppress constant logging of errors
                                }
                            );
                        } else {
                            throw new Error("No suitable camera found on this device.");
                        }
                    } else {
                        throw new Error("No cameras found on this device.");
                    }
                } catch (err) {
                    console.error("Error initializing QR scanner:", err);
                    setStatusMessage(`Error initializing scanner: ${err.message}. Please ensure camera access is granted.`);
                    setShowScanner(false);
                }
            }, 100); // Small delay to ensure DOM is ready

            return () => {
                clearTimeout(timer);
                if (html5QrcodeScanner && typeof html5QrcodeScanner.stop === 'function') {
                    html5QrcodeScanner.stop().catch(err => {
                        console.warn("Failed to stop QR scanner during cleanup:", err);
                    });
                }
            };
        } else {
            // If scanner is hidden, ensure it's stopped
            if (html5QrcodeScanner && typeof html5QrcodeScanner.stop === 'function') {
                html5QrcodeScanner.stop().catch(err => {
                    console.warn("Failed to stop QR scanner when showScanner changed to false:", err);
                });
            }
        }
        return () => {}; // Empty cleanup for when showScanner is false
    }, [showScanner]);

    // Effect to check pharmacy verification status on account change or signer availability
    const checkPharmacyStatus = async () => {
        if (!signer || !account) {
            setIsPharmacyVerified(false);
            setPharmacyName('');
            setStatusMessage('Please connect your wallet to log in as a pharmacy.');
            return;
        }

        setIsLoading(true);
        try {
            const contractService = new ContractService(signer);
            const isVerified = await contractService.isVerifiedPharmacy(account); // Use the isVerifiedPharmacy function
            setIsPharmacyVerified(isVerified);
            if (isVerified) {
                const name = await contractService.getPharmacyName(account); // Use the getPharmacyName function
                setPharmacyName(name);
                setStatusMessage(`Logged in as verified pharmacy: ${name}`);
            } else {
                setPharmacyName(''); // Clear name if not verified
                setStatusMessage('Your connected account is not registered as a verified pharmacy. Please register below.');
            }
        } catch (error) {
            console.error('Error checking pharmacy status:', error);
            setStatusMessage(`Error checking pharmacy status: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkPharmacyStatus();
    }, [signer, account]); // Rerun when signer or account changes

    const handleBlockchainError = (error) => {
        console.error('Full error object:', error);
        
        let errorMessage = 'An unexpected error occurred. Please try again.';
        
        // Handle ethers.js v6 specific error structure
        if (error.code) {
          switch (error.code) {
            case 'UNPREDICTABLE_GAS_LIMIT':
              errorMessage = 'Transaction failed: Insufficient gas or contract execution reverted. Please check your inputs or contract state.';
              break;
            
            case 'ACTION_REJECTED':
              errorMessage = 'Transaction rejected by user in MetaMask.';
              break;
            
            case -32603: // Internal JSON-RPC error
              errorMessage = 'Blockchain network error: The network is congested or experiencing issues. Please wait a moment and try again.';
              break;
            
            case 'UNKNOWN_ERROR':
              // Handle the specific "could not coalesce error" case
              if (error.message && error.message.includes('could not coalesce error')) {
                // Extract the actual error from the payload if available
                if (error.payload && error.payload.error) {
                  if (error.payload.error.code === -32603) {
                    errorMessage = 'Blockchain network error: Internal JSON-RPC error occurred. The network may be busy or experiencing issues. Please try again in a few moments.';
                  } else {
                    errorMessage = `Blockchain error: ${error.payload.error.message || 'Unknown network error'}`;
                  }
                } else {
                  errorMessage = 'Blockchain network error: Unable to process transaction. Please check your network connection and try again.';
                }
              } else if (error.reason) {
                errorMessage = `Blockchain error: ${error.reason}`;
              } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
              }
              break;
            
            case 'INSUFFICIENT_FUNDS':
              errorMessage = 'Insufficient funds: You don\'t have enough ETH to pay for this transaction.';
              break;
            
            case 'NONCE_EXPIRED':
              errorMessage = 'Transaction expired: Please try again with a new transaction.';
              break;
            
            case 'REPLACEMENT_UNDERPRICED':
              errorMessage = 'Transaction underpriced: Please increase the gas price and try again.';
              break;
            
            default:
              if (error.reason) {
                errorMessage = `Blockchain error: ${error.reason}`;
              } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
              }
              break;
          }
        } 
        // Handle string-based error messages
        else if (error.message) {
          const message = error.message.toLowerCase();
          
          if (message.includes('user rejected') || message.includes('user denied')) {
            errorMessage = 'Transaction rejected by user in MetaMask.';
          } else if (message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds: You don\'t have enough ETH to pay for this transaction.';
          } else if (message.includes('gas required exceeds allowance')) {
            errorMessage = 'Gas limit exceeded: The transaction requires more gas than allowed. Please try increasing the gas limit.';
          } else if (message.includes('internal json-rpc error')) {
            errorMessage = 'Blockchain network error: Internal JSON-RPC error. The network may be experiencing issues. Please try again.';
          } else if (message.includes('network error') || message.includes('connection')) {
            errorMessage = 'Network connection error: Please check your internet connection and try again.';
          } else {
            errorMessage = `Error: ${error.message}`;
          }
        }
        
        return errorMessage;
      };
      
    // Handles the registration of the connected MetaMask account as a pharmacy
    const handleRegisterPharmacy = async () => {
        setIsLoading(true);
        setStatusMessage('Attempting to register pharmacy...');
        try {
            if (!signer) {
                throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
            }
            if (!account || !ethers.isAddress(account)) {
                throw new Error('Invalid or missing connected account address. Please ensure MetaMask is connected and an account is selected.');
            }
            if (!pharmacyRegistrationName.trim()) {
                throw new Error('Please enter a pharmacy name to register.');
            }

            const contractService = new ContractService(signer);
            console.log("DEBUG: Calling pharmacyRegistry.registerPharmacy with name:", pharmacyRegistrationName);

            // Call registerPharmacy with only the name; contract uses msg.sender for the address
            const tx = await contractService.registerPharmacy(pharmacyRegistrationName);

            setStatusMessage(`Transaction sent! Waiting for confirmation... Hash: ${tx.hash.slice(0, 10)}...`);

            const receipt = await tx.wait();

            console.log('✅ Pharmacy registered successfully!');
            const finalTxHash = receipt?.hash || tx.hash;
            console.log('Transaction Hash:', finalTxHash);

            setStatusMessage(`✅ Pharmacy "${pharmacyRegistrationName}" registered successfully! Transaction: ${finalTxHash.slice(0, 10)}...`);
            // After successful registration, re-check status to update the UI
            await checkPharmacyStatus();

        } catch (error) {
            console.error('❌ Error registering pharmacy:', error);
            const errorMessage = handleBlockchainError(error);
            setStatusMessage(`❌ Error registering pharmacy: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Handles the removal of the connected MetaMask account's pharmacy registration
    const handleRemovePharmacy = async () => {
        setIsLoading(true);
        setStatusMessage('Attempting to unregister pharmacy...');

        try {
            if (!signer) {
                throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
            }
            if (!isPharmacyVerified) {
                throw new Error('Your account is not a registered pharmacy. Cannot unregister.');
            }

            const contractService = new ContractService(signer);
            console.log("DEBUG: Calling pharmacyRegistry.removePharmacy (self-removal)");

            // Call removePharmacy; contract uses msg.sender for the address
            const tx = await contractService.removePharmacy();

            setStatusMessage(`Transaction sent! Waiting for confirmation... Hash: ${tx.hash.slice(0, 10)}...`);

            const receipt = await tx.wait();

            console.log('✅ Pharmacy unregistered successfully!');
            const finalTxHash = receipt?.hash || tx.hash;
            console.log('Transaction Hash:', finalTxHash);

            setStatusMessage(`✅ Your pharmacy registration has been removed. Transaction: ${finalTxHash.slice(0, 10)}...`);
            // After successful removal, re-check status to update the UI
            await checkPharmacyStatus();

        } catch (error) {
            console.error('❌ Error unregistering pharmacy:', error);
            const errorMessage = handleBlockchainError(error);
            setStatusMessage(`❌ Error unregistering pharmacy: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };


    const handleVerify = async () => {
        setIsLoading(true);
        setVerificationStatus('loading');
        setVerifiedPrescription(null);
        setStatusMessage('Verifying prescription...');

        try {
            if (!signer) {
                throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
            }
            if (!isPharmacyVerified) {
                throw new Error('You are not logged in as a verified pharmacy. Cannot verify prescriptions. Please register.');
            }
            if (!qrCodeInput.trim()) {
                throw new Error('Please paste QR code data or scan a QR code.');
            }

            const parts = qrCodeInput.trim().split('|');
            if (parts.length !== 2) {
                throw new Error('Invalid QR code format. Expected "contentHash|contentHash" (e.g., "0x...|0x...").');
            }

            const [prescriptionIdFromQR, contentHashFromQR] = parts;

            if (!ethers.isHexString(prescriptionIdFromQR, 32)) {
                throw new Error(`Invalid Prescription ID (Content Hash) format from QR code: "${prescriptionIdFromQR}". Expected a 32-byte hex string.`);
            }
            if (!ethers.isHexString(contentHashFromQR, 32)) {
                throw new Error(`Invalid Content Hash format from QR code: "${contentHashFromQR}". Expected a 32-byte hex string.`);
            }

            if (prescriptionIdFromQR !== contentHashFromQR) {
                throw new Error('QR code data mismatch. Both parts should be the same content hash.');
            }

            const contractService = new ContractService(signer);

            // Use getPrescriptionDetails to fetch full data
            const blockchainPrescription = await contractService.getPrescriptionDetails(prescriptionIdFromQR);

            // Check if prescription exists (doctor address will be zero if not found)
            if (blockchainPrescription.doctor === ethers.ZeroAddress) {
                setVerificationStatus('invalid');
                setStatusMessage('Prescription not found on blockchain (Content Hash does not exist).');
                return;
            }

            // Verify basic validity using smart contract
            const isValidOnChain = await contractService.verifyPrescription(
                prescriptionIdFromQR,
                contentHashFromQR
            );

            // Also check if *this* pharmacy has already fulfilled it by iterating through the fulfillments array
            // Ensure blockchainPrescription.fulfillments is an array before calling .some()
            const hasCurrentPharmacyFulfilled = (blockchainPrescription.fulfillments || []).some(
                f => ethers.getAddress(f.pharmacyAddress) === ethers.getAddress(account)
            );

            if (isValidOnChain) {
                let currentStatusMessage = '✅ Prescription is VALID!';
                if (hasCurrentPharmacyFulfilled) {
                    currentStatusMessage += ' This pharmacy has already fulfilled this prescription.';
                    setVerificationStatus('invalid'); // Mark as invalid for *this* fulfillment attempt
                } else {
                    setVerificationStatus('valid');
                }
                setStatusMessage(currentStatusMessage);

                // Map fulfillments for display (ContractService already does it, but we'll ensure types)
                const fulfillmentsFormatted = (blockchainPrescription.fulfillments || []).map(f => ({
                    pharmacyAddress: f.pharmacyAddress,
                    pharmacyName: f.pharmacyName,
                    fulfilledAt: new Date(Number(f.fulfilledAt) * 1000).toLocaleString()
                }));

                // Explicitly map properties from the blockchainPrescription to ensure correct types and fallbacks
                setVerifiedPrescription({
                    prescriptionId: prescriptionIdFromQR,
                    doctor: blockchainPrescription.doctor ? ethers.getAddress(blockchainPrescription.doctor) : ethers.ZeroAddress,
                    patient: blockchainPrescription.patient ? ethers.getAddress(blockchainPrescription.patient) : ethers.ZeroAddress,
                    contentHash: blockchainPrescription.contentHash ? String(blockchainPrescription.contentHash) : ethers.ZeroHash,
                    ipfsHash: blockchainPrescription.ipfsHash ? String(blockchainPrescription.ipfsHash) : '',
                    issuedAt: blockchainPrescription.issuedAt ? new Date(Number(blockchainPrescription.issuedAt) * 1000).toLocaleString() : 'Invalid Date',
                    expiryDate: blockchainPrescription.expiryDate ? new Date(Number(blockchainPrescription.expiryDate) * 1000).toLocaleString() : 'Invalid Date',
                    fulfillments: fulfillmentsFormatted,
                    hasCurrentPharmacyFulfilled: hasCurrentPharmacyFulfilled // Store this for UI logic
                });
            } else {
                let reason = 'Unknown reason.';
                if (blockchainPrescription.contentHash !== contentHashFromQR) {
                    reason = 'Content hash mismatch (PDF might have been altered or QR code is incorrect).';
                } else if (Number(blockchainPrescription.expiryDate) < (Date.now() / 1000)) {
                    reason = 'Prescription has expired.';
                }
                setVerificationStatus('invalid');
                setStatusMessage(`❌ Prescription is INVALID: ${reason}`);
            }

        } catch (error) {
            console.error('❌ Error during verification:', error);
            setVerificationStatus('error');
            setStatusMessage(`❌ Error verifying: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFulfillPrescription = async () => {
        setIsLoading(true);
        setStatusMessage('Attempting to fulfill prescription...');

        try {
            if (!signer) {
                throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
            }
            if (!isPharmacyVerified) {
                throw new Error('You are not logged in as a verified pharmacy. Cannot fulfill prescriptions.');
            }
            if (!verifiedPrescription || verificationStatus !== 'valid') {
                throw new Error('Please verify a valid and active prescription first.');
            }
            // Frontend check: Prevent fulfillment if this pharmacy already fulfilled it
            if (verifiedPrescription.hasCurrentPharmacyFulfilled) {
                throw new Error('This pharmacy has already fulfilled this prescription.');
            }

            const contractService = new ContractService(signer);
            const tx = await contractService.fulfillPrescription(
                verifiedPrescription.prescriptionId
            );

            setStatusMessage(`Fulfillment transaction sent! Waiting for confirmation... Hash: ${tx.hash.slice(0, 10)}...`);

            const receipt = await tx.wait();
            const finalTxHash = receipt?.hash || tx.hash;

            console.log('✅ Prescription fulfilled successfully!');
            setStatusMessage(`✅ Prescription ${verifiedPrescription.prescriptionId.slice(0, 8)}... fulfilled! Transaction: ${finalTxHash.slice(0, 10)}...`);

            // Re-fetch details to update fulfillments list and hasCurrentPharmacyFulfilled status
            await handleVerify(); // Re-run verification to get updated state

        } catch (error) {
            console.error('❌ Error fulfilling prescription:', error);
            const errorMessage = handleBlockchainError(error);
            setStatusMessage(`❌ Error fulfilling prescription: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleScanner = () => {
        setShowScanner(prev => !prev);
        if (showScanner) {
            setQrCodeInput('');
            setVerificationStatus(null);
            setVerifiedPrescription(null);
            setStatusMessage('');
        }
    };

    return (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
             <div className="
    relative
    max-w-screen-xl w-full
    mx-auto 
  
    text-gray-100
    overflow-hidden
">
                {/* Subtle gradient overlay behind the glass for enhanced depth */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute inset-0  rounded-3xl"></div>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-center mb-10 text-white leading-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">
                        Pharmacy
                    </span> Dashboard
                </h1>

                {statusMessage && (
                    <div className={`
                        mb-6 p-4 rounded-xl border
                        ${statusMessage.includes('✅') ? 'bg-green-600/20 border-green-400 text-green-200' :
                          statusMessage.includes('❌') ? 'bg-red-600/20 border-red-400 text-red-200' :
                          'bg-blue-600/20 border-blue-400 text-blue-200'}
                        backdrop-blur-sm
                        transition-all duration-300 ease-in-out
                        flex items-center space-x-3
                    `}>
                        {statusMessage.includes('✅') && <CheckCircle className="w-5 h-5 text-green-400" />}
                        {statusMessage.includes('❌') && <XCircle className="w-5 h-5 text-red-400" />}
                        {!(statusMessage.includes('✅') || statusMessage.includes('❌')) && isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                        {!(statusMessage.includes('✅') || statusMessage.includes('❌')) && !isLoading && <Info className="w-5 h-5 text-blue-400" />}
                        <p className="text-sm font-medium whitespace-pre-line">{statusMessage}</p>
                    </div>
                )}

                {!signer ? (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 text-center max-w-md mx-auto mt-8">
                        <Wallet className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
                        <p className="text-xl text-gray-200 font-semibold mb-3">Wallet Disconnected</p>
                        <p className="text-gray-300">Please connect your MetaMask wallet to access the Pharmacy Dashboard.</p>
                    </div>
                ) : (
                    <>
                        {!isPharmacyVerified && (
                            <div className="
                                bg-yellow-600/10 border border-yellow-500/30
                                p-6 rounded-xl mb-8
                                backdrop-blur-sm
                                shadow-md shadow-yellow-500/5
                            ">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <Info className="w-6 h-6 text-yellow-400" />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="text-lg font-semibold text-yellow-200">Pharmacy Registration Required</h3>
                                        <p className="mt-1 text-sm text-yellow-100">
                                            Your connected address ({truncateAddress(account)}) is not registered as a verified pharmacy.
                                            Please provide your pharmacy details to register.
                                        </p>
                                    </div>
                                </div>
                                <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
                                    <div>
                                        <label htmlFor="pharmacy-name" className="block text-sm font-medium text-gray-300 mb-2">
                                            Pharmacy Name
                                        </label>
                                        <input
                                            type="text"
                                            id="pharmacy-name"
                                            placeholder="e.g., Central Pharmacy"
                                            value={pharmacyRegistrationName}
                                            onChange={(e) => setPharmacyRegistrationName(e.target.value)}
                                            className="
                                                w-full p-3
                                                bg-white/10 border border-white/20 rounded-lg
                                                text-white placeholder-gray-400
                                                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                                transition-all duration-200 ease-in-out
                                            "
                                            disabled={isLoading || !account} // Disable if no account is connected
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRegisterPharmacy}
                                        disabled={isLoading || !pharmacyRegistrationName.trim() || !account} // Disable if no account
                                        className={`
                                            w-full py-3 px-4 rounded-xl font-semibold
                                            transition-all duration-300 ease-in-out
                                            flex items-center justify-center space-x-2
                                            ${isLoading || !pharmacyRegistrationName.trim() || !account
                                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800 transform hover:scale-[1.01] shadow-lg shadow-yellow-500/20'
                                            }
                                        `}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="animate-spin h-5 w-5 text-white" />
                                                <span>Registering...</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-5 h-5" />
                                                <span>Register Pharmacy</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {isPharmacyVerified && ( // Only show the dashboard if pharmacy is verified
                            <>
                                <div className="
                                    bg-white/5 p-6 sm:p-8 rounded-xl
                                    backdrop-blur-sm border border-white/20
                                    shadow-md shadow-blue-500/5
                                    mb-8
                                ">
                                    <h3 className="text-2xl font-semibold text-gray-100 mb-6 flex items-center space-x-3">
                                        <QrCode className="w-7 h-7 text-teal-400" />
                                        <span>Verify Prescription</span>
                                    </h3>
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-300">
                                            You are logged in as a verified pharmacy: <strong className="text-teal-400">{pharmacyName}</strong> ({truncateAddress(account)}).
                                        </p>
                                        <div>
                                            <label htmlFor="qr-input" className="block text-sm font-medium text-gray-300 mb-2">
                                                Paste QR Code Data (Content Hash | Content Hash)
                                            </label>
                                            <input
                                                type="text"
                                                id="qr-input"
                                                placeholder="e.g., 0x123...abc|0x123...abc"
                                                value={qrCodeInput}
                                                onChange={(e) => setQrCodeInput(e.target.value)}
                                                className="
                                                    w-full p-3
                                                    bg-white/10 border border-white/20 rounded-lg
                                                    text-white placeholder-gray-400
                                                    focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400
                                                    transition-all duration-200 ease-in-out
                                                "
                                                disabled={isLoading || showScanner}
                                            />
                                            <p className="mt-1 text-xs text-gray-400">
                                                (For demonstration, paste the full QR data. In a real app, use the scanner below.)
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={toggleScanner}
                                            className={`
                                                w-full py-3 px-4 rounded-xl font-semibold
                                                transition-all duration-300 ease-in-out
                                                flex items-center justify-center space-x-2
                                                ${isLoading
                                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transform hover:scale-[1.01] shadow-lg shadow-purple-500/20'
                                                }
                                            `}
                                            disabled={isLoading}
                                        >
                                            {showScanner ? (
                                                <>
                                                    <QrCode className="w-5 h-5" />
                                                    <span>Hide QR Scanner</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Scan className="w-5 h-5" />
                                                    <span>Scan QR Code</span>
                                                </>
                                            )}
                                        </button>

                                        {showScanner && (
                                            <div className="border border-white/20 rounded-lg overflow-hidden mt-4 bg-black/20">
                                                <div
                                                    id="qr-code-reader"
                                                    className="w-full min-h-[300px] flex items-center justify-center text-gray-400"
                                                >
                                                    <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                                                    <p className="ml-2">Initializing camera...</p>
                                                </div>
                                            </div>
                                        )}

                                        {!showScanner && (
                                            <button
                                                type="button"
                                                onClick={handleVerify}
                                                disabled={isLoading || !qrCodeInput.trim()}
                                                className={`
                                                    w-full py-3 px-4 rounded-xl font-semibold
                                                    transition-all duration-300 ease-in-out
                                                    flex items-center justify-center space-x-2
                                                    ${isLoading || !qrCodeInput.trim()
                                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transform hover:scale-[1.01] shadow-lg shadow-blue-500/20'
                                                    }
                                                `}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                                                        <span>Verifying...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-5 h-5" />
                                                        <span>Verify Prescription</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {verifiedPrescription && (
                                    <div className="bg-white/5 p-6 rounded-xl shadow-md border border-white/10 mt-6">
                                        <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                                            <Pill className="w-6 h-6 text-cyan-400" />
                                            <span>Verified Prescription Details</span>
                                        </h3>
                                        <div className="space-y-2 text-sm text-gray-300">
                                            <p><strong>Prescription ID (Content Hash):</strong> <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">{truncateAddress(verifiedPrescription.prescriptionId)}</span></p>
                                            <p><strong>Doctor Address:</strong> {truncateAddress(verifiedPrescription.doctor)}</p>
                                            <p><strong>Patient Address:</strong> {truncateAddress(verifiedPrescription.patient)}</p>
                                            <p><strong>Issued At:</strong> {verifiedPrescription.issuedAt}</p>
                                            <p><strong>Expiry Date:</strong> {verifiedPrescription.expiryDate}</p>

                                            <p className="pt-2">
                                                <strong>Current Pharmacy Status:</strong> {' '}
                                                {verifiedPrescription.hasCurrentPharmacyFulfilled ? (
                                                    <span className="text-red-400 font-semibold flex items-center">
                                                        <XCircle className="w-4 h-4 mr-1" /> ALREADY FULFILLED BY THIS PHARMACY
                                                    </span>
                                                ) : (
                                                    <span className="text-green-400 font-semibold flex items-center">
                                                        <CheckCircle className="w-4 h-4 mr-1" /> CAN BE FULFILLED BY THIS PHARMACY
                                                    </span>
                                                )}
                                            </p>

                                            {verifiedPrescription.fulfillments && verifiedPrescription.fulfillments.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                    <p className="font-semibold text-gray-100 mb-2 text-base">Fulfillment History:</p>
                                                    <ul className="space-y-1 text-gray-400 text-xs">
                                                        {verifiedPrescription.fulfillments.map((fulfillment, index) => (
                                                            <li key={index} className="flex items-center">
                                                                <ShieldCheck className="w-3 h-3 mr-2 text-green-300" />
                                                                Fulfilled by <strong className="text-green-300">{fulfillment.pharmacyName}</strong> ({truncateAddress(fulfillment.pharmacyAddress)}) on {fulfillment.fulfilledAt}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {verifiedPrescription.ipfsHash && (
                                                <p className="pt-2">
                                                    <a
                                                        href={`https://gateway.pinata.cloud/ipfs/${verifiedPrescription.ipfsHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                                                    >
                                                        <LinkIcon className="h-4 w-4 mr-1" />
                                                        View PDF on IPFS
                                                    </a>
                                                </p>
                                            )}
                                        </div>

                                        {(verificationStatus === 'valid' && !verifiedPrescription.hasCurrentPharmacyFulfilled) && (
                                            <button
                                                type="button"
                                                onClick={handleFulfillPrescription}
                                                disabled={isLoading}
                                                className={`mt-4 w-full py-3 px-4 rounded-xl font-semibold
                                                    transition-all duration-300 ease-in-out
                                                    flex items-center justify-center space-x-2
                                                    ${isLoading
                                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                        : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transform hover:scale-[1.01] shadow-lg shadow-green-500/20'
                                                    }`}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                                                        <span>Fulfilling...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="w-5 h-5" />
                                                        <span>Fulfill Prescription</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="bg-white/5 p-6 rounded-xl shadow-md border border-red-500/30 mt-6">
                                    <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                                        <Trash2 className="w-6 h-6 text-red-400" />
                                        <span>Unregister Pharmacy</span>
                                    </h3>
                                    <p className="text-sm text-gray-300 mb-4">
                                        If you no longer wish for this address to be a verified pharmacy, you can unregister it. This action cannot be undone.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleRemovePharmacy}
                                        disabled={isLoading || !isPharmacyVerified}
                                        className={`w-full py-3 px-4 rounded-xl font-semibold
                                            transition-all duration-300 ease-in-out
                                            flex items-center justify-center space-x-2
                                            ${isLoading || !isPharmacyVerified
                                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transform hover:scale-[1.01] shadow-lg shadow-red-500/20'
                                            }`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="animate-spin h-5 w-5 text-white" />
                                                <span>Unregistering...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-5 h-5" />
                                                <span>Unregister My Pharmacy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PharmacyDashboard;
