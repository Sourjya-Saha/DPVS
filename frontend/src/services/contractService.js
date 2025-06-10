// src/services/contractService.js

import { ethers } from 'ethers';

// --- IMPORTANT: REPLACE THESE WITH YOUR ACTUAL ABI CONTENT ---
// You will typically get these JSON files after compiling your Solidity contracts.
// Example paths: artifacts/contracts/DoctorRegistry.sol/DoctorRegistry.json
// Make sure the paths are correct relative to contractService.js
import DoctorRegistryABI from '../contracts/DoctorRegistry.json'; 
import PrescriptionRegistryABI from '../contracts/PrescriptionRegistry.json'; 
import PharmacyRegistryABI from '../contracts/PharmacyRegistry.json'; 

// Use Vite's import.meta.env to access environment variables with VITE_ prefix
const DOCTOR_REGISTRY_ADDRESS_RAW = import.meta.env.VITE_DOCTOR_REGISTRY_ADDRESS;
const PRESCRIPTION_REGISTRY_ADDRESS_RAW = import.meta.env.VITE_PRESCRIPTION_REGISTRY_ADDRESS;
const PHARMACY_REGISTRY_ADDRESS_RAW = import.meta.env.VITE_PHARMACY_REGISTRY_ADDRESS;

export class ContractService {
    constructor(signer) {
        if (!signer) {
            console.error("ContractService: Signer is undefined. Cannot initialize contracts.");
            throw new Error("Signer is required to initialize ContractService.");
        }
        this.signer = signer;

        let doctorRegistryAddress;
        try {
            // Validate and checksum the address from .env
            doctorRegistryAddress = ethers.getAddress(DOCTOR_REGISTRY_ADDRESS_RAW);
        } catch (e) {
            console.error("Invalid DOCTOR_REGISTRY_ADDRESS from .env:", DOCTOR_REGISTRY_ADDRESS_RAW, e);
            throw new Error("Invalid Doctor Registry Address configured in .env. Please check its format.");
        }

        let prescriptionRegistryAddress;
        try {
            // Validate and checksum the address from .env
            prescriptionRegistryAddress = ethers.getAddress(PRESCRIPTION_REGISTRY_ADDRESS_RAW);
        } catch (e) {
            console.error("Invalid PRESCRIPTION_REGISTRY_ADDRESS from .env:", PRESCRIPTION_REGISTRY_ADDRESS_RAW, e);
            throw new Error("Invalid Prescription Registry Address configured in .env. Please check its format.");
        }

        let pharmacyRegistryAddress;
        try {
            pharmacyRegistryAddress = ethers.getAddress(PHARMACY_REGISTRY_ADDRESS_RAW);
        } catch (e) {
            console.error("Invalid PHARMACY_REGISTRY_ADDRESS from .env:", PHARMACY_REGISTRY_ADDRESS_RAW, e);
            throw new Error("Invalid Pharmacy Registry Address configured in .env. Please check its format.");
        }

        console.log("DEBUG: ContractService initialized.");
        console.log("DEBUG: DOCTOR_REGISTRY_ADDRESS from .env (validated):", doctorRegistryAddress);
        console.log("DEBUG: PRESCRIPTION_REGISTRY_ADDRESS from .env (validated):", prescriptionRegistryAddress);
        console.log("DEBUG: PHARMACY_REGISTRY_ADDRESS from .env (validated):", pharmacyRegistryAddress);

        // Initialize DoctorRegistry contract
        this.doctorRegistry = new ethers.Contract(
            doctorRegistryAddress, // Use the validated address
            DoctorRegistryABI.abi, // Assuming ABI is under .abi property
            signer // Connect with the signer to send transactions
        );

        // Initialize PrescriptionRegistry contract
        this.prescriptionRegistry = new ethers.Contract(
            prescriptionRegistryAddress, // Use the validated address
            PrescriptionRegistryABI.abi, // Assuming ABI is under .abi property
            signer // Connect with the signer to send transactions
        );

        // Initialize PharmacyRegistry contract
        this.pharmacyRegistry = new ethers.Contract(
            pharmacyRegistryAddress, // Use the validated address
            PharmacyRegistryABI.abi, // Assuming ABI is under .abi property
            signer // Connect with the signer for transactions
        );
    }

    /**
     * Registers a new doctor in the DoctorRegistry contract.
     * @param {string} doctorAddress - The Ethereum address of the doctor.
     * @param {string} name - The name of the doctor.
     * @param {string} licenseNumber - The medical license number of the doctor.
     * @param {string} specialization - The specialization of the doctor.
     * @returns {Promise<ethers.ContractTransactionResponse>} - The transaction response.
     */
    async registerDoctor(doctorAddress, name, licenseNumber, specialization) {
        try {
            console.log("DEBUG: Calling doctorRegistry.registerDoctor with:", { doctorAddress, name, licenseNumber, specialization });
            const tx = await this.doctorRegistry.registerDoctor(
                doctorAddress,
                name,
                licenseNumber,
                specialization
            );
            return tx;
        } catch (error) {
            console.error("Error in ContractService.registerDoctor:", error);
            throw error; // Re-throw the error for handling in the component
        }
    }

    /**
     * Fetches doctor details from the DoctorRegistry contract.
     * This calls a public mapping, so it's a read-only call.
     * @param {string} doctorAddress - The address of the doctor to query.
     * @returns {Promise<object>} - Doctor details (name, licenseNumber, specialization, isActive, registeredAt).
     */
    async getDoctorDetails(doctorAddress) {
        try {
            // Note: If your DoctorRegistry's `doctors` mapping returns a struct,
            // ethers.js v6 will usually return an object with named properties (e.g., doctor.name).
            // If it returns an array-like object by index, you might need doctor[0], doctor[1], etc.
            // The provided placeholder ABI suggests array-like access.
            const doctor = await this.doctorRegistry.doctors(doctorAddress);
            console.log("DEBUG: getDoctorDetails result:", doctor);
            
            return {
                name: doctor[0] || '',
                licenseNumber: doctor[1] || '',
                specialization: doctor[2] || '',
                isActive: doctor[3] || false,
                registeredAt: Number(doctor[4] || 0) // Convert BigInt to Number
            };
        } catch (error) {
            console.error("Error in ContractService.getDoctorDetails:", error);
            // Return default/empty values on error to prevent cascading issues
            return {
                name: '',
                licenseNumber: '',
                specialization: '',
                isActive: false,
                registeredAt: 0
            };
        }
    }

    /**
     * Issues a new prescription in the PrescriptionRegistry contract.
     * @param {string} patientAddress - The Ethereum address of the patient.
     * @param {string} contentHash - The hash of the PDF content (now the primary on-chain ID).
     * @param {string} ipfsHash - The IPFS hash where the PDF is stored.
     * @param {number} expiryTimestamp - Unix timestamp of the prescription expiry.
     * @returns {Promise<ethers.ContractTransactionResponse>} - The transaction response.
     */
    async issuePrescription(patientAddress, contentHash, ipfsHash, expiryTimestamp) {
        try {
            console.log("DEBUG: Calling issuePrescription with:", { patientAddress, contentHash, ipfsHash, expiryTimestamp });
            const tx = await this.prescriptionRegistry.issuePrescription(
                patientAddress,
                contentHash,
                ipfsHash,
                expiryTimestamp
            );
            return tx;
        } catch (error) {
            console.error("Error in ContractService.issuePrescription:", error);
            throw error; // Re-throw the error
        }
    }

    /**
     * Verifies a prescription using its ID (contentHash) and an expected content hash.
     * Calls the smart contract's verifyPrescription directly.
     * @param {string} prescriptionId - The contentHash of the prescription to verify.
     * @param {string} expectedContentHash - The contentHash derived from the external PDF.
     * @returns {Promise<boolean>} - True if the prescription is valid (exists, content hashes match, not expired).
     */
    async verifyPrescription(prescriptionId, expectedContentHash) {
        try {
            if (!this.prescriptionRegistry.runner) {
                throw new Error("PrescriptionRegistry contract not connected to a provider/signer. Cannot verify.");
            }
            console.log("DEBUG: Calling verifyPrescription with:", { prescriptionId, expectedContentHash });
            return await this.prescriptionRegistry.verifyPrescription(
                prescriptionId,
                expectedContentHash
            );
        } catch (error) {
            console.error("Error in ContractService.verifyPrescription:", error);
            throw error;
        }
    }

    /**
     * Fetches complete prescription details, including fulfillment history.
     * @param {string} prescriptionId - The contentHash of the prescription to fetch.
     * @returns {Promise<object>} - Prescription details including doctor, patient, IPFS hash, dates, and fulfillments.
     */
    async getPrescriptionDetails(prescriptionId) {
        try {
            if (!this.prescriptionRegistry.runner) {
                throw new Error("PrescriptionRegistry contract not connected to a provider/signer. Cannot get prescription details.");
            }
            console.log("DEBUG: Calling getPrescriptionDetails for:", prescriptionId);
            const details = await this.prescriptionRegistry.getPrescriptionDetails(prescriptionId);
            
            // Explicitly map properties from the array-like Proxy(_Result) to ensure correct types and fallbacks 
            const mappedFulfillments = Array.isArray(details[6])  
                ? details[6].map(f => ({ 
                    // Ensure addresses are checksummed and then stringified 
                    pharmacyAddress: f[0] ? ethers.getAddress(f[0]) : ethers.ZeroAddress, 
                    pharmacyName: String(f[1] || 'Unknown Pharmacy'), 
                    fulfilledAt: Number(f[2] || 0) // Convert BigInt to Number 
                })) 
                : []; 

            return { 
                doctor: details[0] ? ethers.getAddress(details[0]) : ethers.ZeroAddress, 
                patient: details[1] ? ethers.getAddress(details[1]) : ethers.ZeroAddress, 
                contentHash: details[2] ? String(details[2]) : ethers.ZeroHash,  
                ipfsHash: details[3] ? String(details[3]) : '', 
                issuedAt: Number(details[4] || 0), // Convert BigInt to Number 
                expiryDate: Number(details[5] || 0), // Convert BigInt to Number 
                fulfillments: mappedFulfillments 
            }; 
        } catch (error) {
            console.error("Error in ContractService.getPrescriptionDetails:", error);
            // Return a default structure on error to prevent cascading errors in UI
            return {
                doctor: ethers.ZeroAddress,
                patient: ethers.ZeroAddress,
                contentHash: ethers.ZeroHash,
                ipfsHash: '',
                issuedAt: 0,
                expiryDate: 0,
                fulfillments: [] // Ensure fulfillments is an empty array on error
            };
        }
    }

    /**
     * Checks if a specific pharmacy has already fulfilled a given prescription.
     * This function relies on the PrescriptionRegistry contract having a `hasPharmacyFulfilled` function.
     * @param {string} prescriptionId - The contentHash of the prescription.
     * @param {string} pharmacyAddress - The address of the pharmacy to check.
     * @returns {Promise<boolean>} - True if the pharmacy has fulfilled it, false otherwise.
     */
    async hasPharmacyFulfilled(prescriptionId, pharmacyAddress) {
        try {
            if (!this.prescriptionRegistry.runner) {
                throw new Error("PrescriptionRegistry contract not connected to a provider/signer. Cannot check fulfillment status.");
            }
            console.log("DEBUG: Calling hasPharmacyFulfilled for:", { prescriptionId, pharmacyAddress });
            // Note: This function might not exist in your PrescriptionRegistry.sol.
            // If it doesn't, this call will fail.
            return await this.prescriptionRegistry.hasPharmacyFulfilled(prescriptionId, pharmacyAddress);
        } catch (error) {
            console.error("Error in ContractService.hasPharmacyFulfilled:", error);
            throw error; // Re-throw for specific error handling in component
        }
    }

    /**
     * Registers the calling MetaMask account as a new pharmacy in the PharmacyRegistry contract.
     * The pharmacy's address is derived from the connected signer (msg.sender on-chain).
     * @param {string} name - The name of the pharmacy.
     * @returns {Promise<ethers.ContractTransactionResponse>} - The transaction response.
     */
    async registerPharmacy(name) {
        try {
            console.log("DEBUG: Calling pharmacyRegistry.registerPharmacy with name:", name);
            // The PharmacyRegistry contract's registerPharmacy function now takes `_pharmacyAddress` and `_name`.
            // The `_pharmacyAddress` should be the address of the signer.
            const pharmacyAddress = await this.signer.getAddress();
            const tx = await this.pharmacyRegistry.registerPharmacy(pharmacyAddress, name); 
            return tx;
        } catch (error) {
            console.error("Error in ContractService.registerPharmacy:", error);
            throw error;
        }
    }

    /**
     * Allows the calling MetaMask account (registered pharmacy) to remove its own registration.
     * @returns {Promise<ethers.ContractTransactionResponse>} - The transaction response.
     */
    async removePharmacy() { // No parameters needed, uses msg.sender
        try {
            console.log("DEBUG: Calling pharmacyRegistry.removePharmacy (self-removal)");
            const pharmacyAddress = await this.signer.getAddress();
            const tx = await this.pharmacyRegistry.removePharmacy(pharmacyAddress);
            return tx;
        } catch (error) {
            console.error("Error in ContractService.removePharmacy:", error);
            throw error;
        }
    }

    /**
     * Checks if an address is a verified pharmacy.
     * @param {string} pharmacyAddress - The address to check.
     * @returns {Promise<boolean>} - True if the address is a verified pharmacy, false otherwise.
     */
    async isVerifiedPharmacy(pharmacyAddress) {
        try {
            if (!this.pharmacyRegistry.runner) {
                throw new Error("PharmacyRegistry contract not connected to a provider/signer. Cannot check pharmacy verification.");
            }
            console.log("DEBUG: Calling pharmacyRegistry.isVerifiedPharmacy for:", pharmacyAddress);
            return await this.pharmacyRegistry.isVerifiedPharmacy(pharmacyAddress);
        } catch (error) {
            console.error("Error in ContractService.isVerifiedPharmacy:", error);
            return false; // Assume not verified on error
        }
    }

    /**
     * Returns the name of a verified pharmacy.
     * @param {string} pharmacyAddress - The address of the pharmacy.
     * @returns {Promise<string>} - The name of the pharmacy. Returns an empty string if not registered.
     */
    async getPharmacyName(pharmacyAddress) {
        try {
            if (!this.pharmacyRegistry.runner) {
                throw new Error("PharmacyRegistry contract not connected to a provider/signer. Cannot get pharmacy name.");
            }
            console.log("DEBUG: Calling pharmacyRegistry.getPharmacyName for:", pharmacyAddress);
            return await this.pharmacyRegistry.getPharmacyName(pharmacyAddress);
        } catch (error) {
            console.error("Error in ContractService.getPharmacyName:", error);
            return ''; // Return empty string on error or if not found
        }
    }

    /**
     * Fulfills a prescription in the PrescriptionRegistry contract.
     * @param {string} prescriptionId - The ID (content hash) of the prescription to fulfill.
     * @returns {Promise<ethers.ContractTransactionResponse>} - The transaction response.
     */
    async fulfillPrescription(prescriptionId) {
        try {
            console.log("DEBUG: Calling prescriptionRegistry.fulfillPrescription with:", { prescriptionId });
            const tx = await this.prescriptionRegistry.fulfillPrescription(
                prescriptionId
            );
            return tx;
        } catch (error) {
            console.error("Error in ContractService.fulfillPrescription:", error);
            throw error;
        }
    }
}