import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ContractService } from '../../services/contractService';
import { IPFSService } from '../../services/ipfsService';
import { PDFService } from '../../services/pdfService';

// Note: For optimal icon integration, you'd typically install a library like Lucide React:
// `npm install lucide-react` and then import specific icons:
// import { AlertCircle, CheckCircle, XCircle, Info, UserPlus, FileText, FilePlus } from 'lucide-react';
// For this example, I'm including simplified SVG paths directly.

const DoctorDashboard = ({ signer }) => {
    const [prescription, setPrescription] = useState({
        patientAddress: '',
        patientName: '',
        medications: '',
        dosage: '',
        expiryDate: ''
    });

    const [doctorRegistrationName, setDoctorRegistrationName] = useState('');
    const [doctorSpecialization, setDoctorSpecialization] = useState('');
    const [doctorLicenseNumber, setDoctorLicenseNumber] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [isDoctorRegistered, setIsDoctorRegistered] = useState(false);

    // Function to check if the current signer is a registered doctor
    const checkDoctorStatus = async () => {
        if (!signer) {
            setIsDoctorRegistered(false);
            setStatus('Wallet not connected. Connect your MetaMask to check doctor status.');
            return;
        }

        try {
            const contractService = new ContractService(signer);
            // Ensure to await signer.getAddress() if it's an async operation
            const doctorAddress = await signer.getAddress();
            const doctorStructData = await contractService.doctorRegistry.doctors(doctorAddress);
            const isCurrentlyVerified = await contractService.doctorRegistry.isVerifiedDoctor(doctorAddress);

            if (isCurrentlyVerified && doctorStructData.name !== "" && doctorStructData.isActive) {
                setIsDoctorRegistered(true);
                setDoctorRegistrationName(doctorStructData.name);
                setDoctorSpecialization(doctorStructData.specialization);
                setDoctorLicenseNumber(doctorStructData.licenseNumber);
                setStatus(`Welcome, Dr. ${doctorStructData.name || doctorAddress.slice(0, 6)}... (Verified)`);
            } else {
                setIsDoctorRegistered(false);
                setStatus('Please register as a doctor to issue prescriptions.');
            }
        } catch (error) {
            console.error("Error checking doctor status:", error);
            setIsDoctorRegistered(false);
            setStatus('Could not verify doctor status. Please register.');
        }
    };

    useEffect(() => {
        checkDoctorStatus();
    }, [signer]);


    const handleRegisterDoctor = async () => {
        setIsLoading(true);
        setStatus('Attempting to register doctor...');
        
        try {
          if (!signer) {
            throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
          }
          if (!doctorRegistrationName || !doctorSpecialization || !doctorLicenseNumber) {
            throw new Error('Please fill in doctor name, specialization, and license number to register.');
          }
      
          const contractService = new ContractService(signer);
          const doctorAddress = await signer.getAddress();
          console.log("DEBUG: Calling registerDoctor with:", { 
            doctorAddress, 
            doctorRegistrationName, 
            doctorLicenseNumber, 
            doctorSpecialization 
          });
      
          try {
            const tx = await contractService.registerDoctor(
              doctorAddress,
              doctorRegistrationName,
              doctorLicenseNumber,
              doctorSpecialization
            );
      
            setStatus(`Transaction sent! Waiting for confirmation... Hash: ${tx.hash.slice(0, 10)}...`);
      
            const receipt = await tx.wait();
      
            console.log('✅ Doctor registered successfully!');
            const finalTxHash = receipt?.hash || tx.hash;
            console.log('Transaction Hash:', finalTxHash);
      
            setStatus(`✅ Doctor ${doctorRegistrationName} registered successfully! Transaction: ${finalTxHash.slice(0, 10)}...`);
            setIsDoctorRegistered(true);
      
          } catch (blockchainError) {
            console.error('❌ Blockchain registration error:', blockchainError);
            throw blockchainError;
          }
      
        } catch (error) {
          console.error('❌ Error registering doctor:', error);
          const errorMessage = handleBlockchainError(error);
          setStatus(`❌ ${errorMessage}`);
        } finally {
          setIsLoading(false);
        }
      };

// Enhanced error handling function for blockchain/MetaMask errors
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
  

  const handleIssuePrescription = async () => {
    setIsLoading(true);
    setStatus('Starting prescription issuance...');
  
    try {
      if (!prescription.patientAddress || !prescription.patientName ||
        !prescription.medications || !prescription.expiryDate) {
        throw new Error('Please fill in all required fields.');
      }
  
      if (!ethers.isAddress(prescription.patientAddress)) {
        throw new Error('Invalid patient address format.');
      }
  
      if (!signer) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
      }
  
      if (!isDoctorRegistered) {
        throw new Error('You must be a registered doctor to issue prescriptions. Please register first.');
      }
  
      const contractService = new ContractService(signer);
      const ipfsService = new IPFSService();
      const pdfService = new PDFService();
  
      setStatus('Testing IPFS connection via backend...');
      const connected = await ipfsService.testConnection();
      if (!connected) {
        throw new Error('IPFS backend connection failed. Ensure your backend server is running and configured correctly.');
      }
  
      const doctorAddress = await signer.getAddress();
      const issueDate = new Date().toLocaleDateString('en-CA');
  
      const pdfData = {
        patientName: prescription.patientName,
        medications: prescription.medications,
        dosage: prescription.dosage,
        doctorActualName: doctorRegistrationName,
        date: issueDate,
        expiryDate: prescription.expiryDate,
        prescriptionId: 'N/A_BEFORE_HASH',
        contentHash: ''
      };
      
      setStatus('Generating PDF for content and IPFS upload...');
  
      const tempPdfBlobForContentHash = await pdfService.generatePrescriptionPDF({
        ...pdfData,
        prescriptionId: 'TEMP_ID_FOR_HASH_CALC',
        contentHash: '0x' + '0'.repeat(64)
      });
      
      const arrayBuffer = await tempPdfBlobForContentHash.arrayBuffer();
      const contentHash = ethers.keccak256(new Uint8Array(arrayBuffer));
      console.log("Calculated Content Hash:", contentHash);
  
      const finalPdfData = {
        ...pdfData,
        prescriptionId: contentHash,
        contentHash: contentHash
      };
      
      setStatus('Generating final PDF with QR code embedding content hash...');
      const finalPdfBlob = await pdfService.generatePrescriptionPDF(finalPdfData);
  
      setStatus('Uploading prescription PDF to IPFS...');
      const uploadResult = await ipfsService.uploadPrescriptionPDF(finalPdfBlob, finalPdfData);
      console.log('✅ PDF uploaded to IPFS:', uploadResult.url);
      const ipfsHash = uploadResult.hash;
  
      setStatus('Recording prescription on blockchain...');
  
      try {
        const tx = await contractService.issuePrescription(
          prescription.patientAddress,
          contentHash,
          ipfsHash,
          Math.floor(new Date(prescription.expiryDate).getTime() / 1000)
        );
  
        setStatus(`Blockchain transaction sent! Waiting for confirmation... Hash: ${tx.hash.slice(0, 10)}...`);
  
        const receipt = await tx.wait();
        if (receipt.status === 0) {
          throw new Error(`Blockchain transaction failed. Tx Hash: ${receipt.hash}`);
        }
        console.log('✅ Blockchain transaction confirmed!');
  
        setStatus(`✅ Prescription issued successfully!
          Tx Hash: ${receipt.hash.slice(0, 10)}...
          IPFS: ${ipfsHash.slice(0, 10)}...
          Prescription ID (Content Hash): ${contentHash.slice(0, 8)}...`);
  
        setTimeout(() => {
          setPrescription({
            patientAddress: '',
            patientName: '',
            medications: '',
            dosage: '',
            expiryDate: ''
          });
          setStatus('');
        }, 5000);
  
      } catch (blockchainError) {
        console.error('❌ Blockchain transaction error:', blockchainError);
        throw blockchainError; // Re-throw to be caught by outer catch block
      }
  
    } catch (error) {
      console.error('❌ Error issuing prescription:', error);
      const errorMessage = handleBlockchainError(error);
      setStatus(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
    return (
        <div className="relative z-10 min-h-screen flex items-center justify-center  p-4 sm:p-6 lg:p-8">
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
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Doctor's
                    </span> Dashboard
                </h1>

                {status && (
                    <div className={`
                        mb-6 p-4 rounded-xl border
                        ${status.includes('✅') ? 'bg-green-600/20 border-green-400 text-green-200' :
                          status.includes('❌') ? 'bg-red-600/20 border-red-400 text-red-200' :
                          'bg-blue-600/20 border-blue-400 text-blue-200'}
                        backdrop-blur-sm
                        transition-all duration-300 ease-in-out
                        flex items-center space-x-3
                    `}>
                        {status.includes('✅') && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                        )}
                        {status.includes('❌') && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                        )}
                        {!(status.includes('✅') || status.includes('❌')) && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        )}
                        <p className="text-sm font-medium whitespace-pre-line">{status}</p>
                    </div>
                )}

                {!isDoctorRegistered && (
                    <div className="
                        bg-yellow-600/10 border border-yellow-500/30
                        p-6 rounded-xl mb-8
                        backdrop-blur-sm
                        shadow-md shadow-yellow-500/5
                    ">
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-lg font-semibold text-yellow-200">Doctor Registration Required</h3>
                                <p className="mt-1 text-sm text-yellow-100">
                                    Your wallet address is not yet registered as a doctor. Please register to issue prescriptions.
                                </p>
                            </div>
                        </div>
                        <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
                            <div>
                                <label htmlFor="doctor-name" className="block text-sm font-medium text-gray-300 mb-2">
                                    Doctor Name
                                </label>
                                <input
                                    type="text"
                                    id="doctor-name"
                                    placeholder="Your Name"
                                    value={doctorRegistrationName}
                                    onChange={(e) => setDoctorRegistrationName(e.target.value)}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="specialization" className="block text-sm font-medium text-gray-300 mb-2">
                                    Specialization
                                </label>
                                <input
                                    type="text"
                                    id="specialization"
                                    placeholder="e.g., General Physician, Cardiologist"
                                    value={doctorSpecialization}
                                    onChange={(e) => setDoctorSpecialization(e.target.value)}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="license-number" className="block text-sm font-medium text-gray-300 mb-2">
                                    License Number
                                </label>
                                <input
                                    type="text"
                                    id="license-number"
                                    placeholder="Medical License Number"
                                    value={doctorLicenseNumber}
                                    onChange={(e) => setDoctorLicenseNumber(e.target.value)}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleRegisterDoctor}
                                disabled={isLoading}
                                className={`
                                    w-full py-3 px-4 rounded-xl font-semibold
                                    transition-all duration-300 ease-in-out
                                    flex items-center justify-center space-x-2
                                    ${isLoading
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800 transform hover:scale-[1.01] shadow-lg shadow-yellow-500/20'
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <span>Registering...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=""><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="19" y1="11" y2="14"/><line x1="19" x2="19" y1="8" y2="14"/></svg>
                                        <span>Register as Doctor</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {isDoctorRegistered && (
                <div className="
                bg-white/5 p-6 sm:p-8 rounded-xl
                backdrop-blur-sm border border-white/20
                shadow-md shadow-blue-500/5
                mt-8
                w-full md:w-[800px] mx-auto
            ">
            
              
               
                        <h3 className="text-2xl font-semibold text-gray-100 mb-6 flex items-center space-x-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                            <span>Issue New Prescription</span>
                        </h3>
                        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                            <div>
                                <label htmlFor="patient-address" className="block text-sm font-medium text-gray-300 mb-2">
                                    Patient Wallet Address <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="patient-address"
                                    placeholder="0x..."
                                    value={prescription.patientAddress}
                                    onChange={(e) => setPrescription({
                                        ...prescription,
                                        patientAddress: e.target.value
                                    })}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="patient-name" className="block text-sm font-medium text-gray-300 mb-2">
                                    Patient Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="patient-name"
                                    placeholder="Patient full name"
                                    value={prescription.patientName}
                                    onChange={(e) => setPrescription({
                                        ...prescription,
                                        patientName: e.target.value
                                    })}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="medications" className="block text-sm font-medium text-gray-300 mb-2">
                                    Medications and Instructions <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    id="medications"
                                    placeholder="List medications, dosage, frequency, and special instructions..."
                                    value={prescription.medications}
                                    onChange={(e) => setPrescription({
                                        ...prescription,
                                        medications: e.target.value
                                    })}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        h-32 resize-y
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="dosage" className="block text-sm font-medium text-gray-300 mb-2">
                                    Dosage Information
                                </label>
                                <input
                                    type="text"
                                    id="dosage"
                                    placeholder="e.g., Take 2 tablets daily after meals"
                                    value={prescription.dosage}
                                    onChange={(e) => setPrescription({
                                        ...prescription,
                                        dosage: e.target.value
                                    })}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-300 mb-2">
                                    Expiry Date <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="expiry-date"
                                    value={prescription.expiryDate}
                                    onChange={(e) => setPrescription({
                                        ...prescription,
                                        expiryDate: e.target.value
                                    })}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="
                                        w-full p-3
                                        bg-white/10 border border-white/20 rounded-lg
                                        text-white placeholder-gray-400
                                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                                        transition-all duration-200 ease-in-out
                                    "
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleIssuePrescription}
                                disabled={isLoading}
                                className={`
                                    w-full py-3 px-4 rounded-xl font-semibold
                                    transition-all duration-300 ease-in-out
                                    flex items-center justify-center space-x-2
                                    ${isLoading
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transform hover:scale-[1.01] shadow-lg shadow-blue-500/20'
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=""><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
                                        <span>Issue Prescription</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorDashboard;
