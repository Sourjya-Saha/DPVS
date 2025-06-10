// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DoctorRegistry.sol";
import "./PharmacyRegistry.sol"; // Import the new PharmacyRegistry

contract PrescriptionRegistry {
    DoctorRegistry public doctorRegistry;
    PharmacyRegistry public pharmacyRegistry; // New: Reference to PharmacyRegistry

    struct Fulfillment {
        address pharmacyAddress;
        string pharmacyName; // Store the name for easy lookup
        uint256 fulfilledAt;
    }

    struct Prescription {
        address doctor;
        address patient;
        bytes32 contentHash; // Primary on-chain identifier
        string ipfsHash;
        uint256 issuedAt;
        uint256 expiryDate;
        // isFulfilled and fulfilledBy/At are no longer simple booleans/addresses
        // Instead, we'll use a dynamic array of Fulfillment structs
        Fulfillment[] fulfillments;
        // Mapping to prevent the same pharmacy from fulfilling twice for this prescription
        mapping(address => bool) hasFulfilled; 
    }
    
    // Mapping now uses contentHash as the key for direct lookup
    mapping(bytes32 => Prescription) public prescriptions;
    // Patient and doctor mappings now store contentHashes as their IDs
    mapping(address => bytes32[]) public patientPrescriptions;
    mapping(address => bytes32[]) public doctorPrescriptions;
    
    event PrescriptionIssued(
        bytes32 indexed prescriptionId, // This is now the contentHash
        address indexed doctor,
        address indexed patient,
        string ipfsHash
    );
    
    event PrescriptionFulfilled(
        bytes32 indexed prescriptionId, // This is now the contentHash
        address indexed pharmacist,
        string pharmacyName, // Include pharmacy name in event
        uint256 fulfilledAt
    );
    
    constructor(address _doctorRegistry, address _pharmacyRegistry) {
        doctorRegistry = DoctorRegistry(_doctorRegistry);
        pharmacyRegistry = PharmacyRegistry(_pharmacyRegistry); // Initialize PharmacyRegistry
    }
    
    /**
     * @dev Issues a new prescription. The contentHash now serves as the unique identifier.
     * @param _patient The address of the patient.
     * @param _contentHash The keccak256 hash of the PDF content. This is the unique ID.
     * @param _ipfsHash The IPFS hash where the PDF is stored.
     * @param _expiryDate Unix timestamp of the prescription expiry.
     * @return bytes32 The contentHash, which is also the prescriptionId on-chain.
     */
    function issuePrescription(
        address _patient,
        bytes32 _contentHash,
        string memory _ipfsHash,
        uint256 _expiryDate
    ) external returns (bytes32) {
        require(doctorRegistry.isVerifiedDoctor(msg.sender), "PrescriptionRegistry: Not a verified doctor");
        require(_expiryDate > block.timestamp, "PrescriptionRegistry: Invalid expiry date");
        // Ensure this contentHash is not already used for a prescription
        require(prescriptions[_contentHash].doctor == address(0), "PrescriptionRegistry: Prescription with this content hash already exists.");

        // FIX: Cannot assign struct with mapping directly. Assign individual fields.
        Prescription storage newPrescription = prescriptions[_contentHash];
        newPrescription.doctor = msg.sender;
        newPrescription.patient = _patient;
        newPrescription.contentHash = _contentHash;
        newPrescription.ipfsHash = _ipfsHash;
        newPrescription.issuedAt = block.timestamp;
        newPrescription.expiryDate = _expiryDate;
        // The `fulfillments` dynamic array is implicitly empty.
        // The `hasFulfilled` mapping is implicitly initialized to all false.
        
        patientPrescriptions[_patient].push(_contentHash); // Use contentHash as ID
        doctorPrescriptions[msg.sender].push(_contentHash); // Use contentHash as ID
        
        emit PrescriptionIssued(_contentHash, msg.sender, _patient, _ipfsHash);
        return _contentHash; // Return the contentHash as the on-chain ID
    }
    
    /**
     * @dev Fulfills an existing prescription. Can be called by different pharmacies multiple times.
     * A single pharmacy cannot fulfill the same prescription more than once.
     * @param _prescriptionId The contentHash of the prescription to fulfill.
     */
    function fulfillPrescription(bytes32 _prescriptionId) external {
        // Ensure the caller is a verified pharmacy
        require(pharmacyRegistry.isVerifiedPharmacy(msg.sender), "PrescriptionRegistry: Not a verified pharmacy");

        // Retrieve the prescription using contentHash as the key
        Prescription storage prescription = prescriptions[_prescriptionId];
        
        require(prescription.doctor != address(0), "PrescriptionRegistry: Prescription does not exist");
        require(block.timestamp <= prescription.expiryDate, "PrescriptionRegistry: Prescription expired");
        require(!prescription.hasFulfilled[msg.sender], "PrescriptionRegistry: This pharmacy has already fulfilled this prescription.");

        // Get the pharmacy name
        string memory pharmacyName = pharmacyRegistry.getPharmacyName(msg.sender);
        require(bytes(pharmacyName).length > 0, "PrescriptionRegistry: Pharmacy name not found."); // Should not happen if isVerifiedPharmacy passes

        // Add new fulfillment record
        prescription.fulfillments.push(Fulfillment({
            pharmacyAddress: msg.sender,
            pharmacyName: pharmacyName,
            fulfilledAt: block.timestamp
        }));
        
        // Mark that this pharmacy has fulfilled this prescription
        prescription.hasFulfilled[msg.sender] = true;
        
        emit PrescriptionFulfilled(_prescriptionId, msg.sender, pharmacyName, block.timestamp);
    }
    
    /**
     * @dev Verifies a prescription using its contentHash.
     * The `isFulfilled` check is now about *any* fulfillment, not full completion.
     * @param _prescriptionId The contentHash of the prescription to verify.
     * @param _expectedContentHash The contentHash derived from the external PDF.
     * @return isValid True if the prescription is valid (exists, content hashes match, not expired).
     */ // FIX: Added return parameter name 'isValid'
    function verifyPrescription(bytes32 _prescriptionId, bytes32 _expectedContentHash) 
        external view returns (bool isValid) { // FIX: Named return parameter
        // FIX: Changed 'memory' to 'storage' because Prescription struct contains a mapping.
        Prescription storage prescription = prescriptions[_prescriptionId]; 
        isValid = prescription.contentHash == _expectedContentHash && 
               prescription.doctor != address(0) && // Check if prescription exists (doctor address is not zero)
               block.timestamp <= prescription.expiryDate;
               // No longer checking !prescription.isFulfilled here, as it can be fulfilled multiple times.
               // The frontend will determine if *this* pharmacy can fulfill it.
    }

    /**
     * @dev Returns details of a specific prescription, including its fulfillments.
     * @param _prescriptionId The contentHash of the prescription.
     * @return doctor_ The doctor's address.
     * @return patient_ The patient's address.
     * @return contentHash_ The content hash of the prescription.
     * @return ipfsHash_ The IPFS hash of the prescription PDF.
     * @return issuedAt_ The timestamp when the prescription was issued.
     * @return expiryDate_ The timestamp when the prescription expires.
     * @return fulfillments_ An array of all fulfillment records.
     */ // FIX: Added names for all return parameters
    function getPrescriptionDetails(bytes32 _prescriptionId) 
        public view returns (
            address doctor_, 
            address patient_, 
            bytes32 contentHash_, 
            string memory ipfsHash_, 
            uint256 issuedAt_, 
            uint256 expiryDate_, 
            Fulfillment[] memory fulfillments_ // Renamed to add '_' for clarity
        ) {
        Prescription storage prescription = prescriptions[_prescriptionId];
        require(prescription.doctor != address(0), "PrescriptionRegistry: Prescription does not exist");

        return (
            prescription.doctor,
            prescription.patient,
            prescription.contentHash,
            prescription.ipfsHash,
            prescription.issuedAt,
            prescription.expiryDate,
            prescription.fulfillments
        );
    }

    /**
     * @dev Checks if a specific pharmacy has already fulfilled a given prescription.
     * @param _prescriptionId The contentHash of the prescription.
     * @param _pharmacyAddress The address of the pharmacy to check.
     * @return bool True if the pharmacy has fulfilled it, false otherwise.
     */
    function hasPharmacyFulfilled(bytes32 _prescriptionId, address _pharmacyAddress) 
        public view returns (bool) {
        Prescription storage prescription = prescriptions[_prescriptionId];
        return prescription.hasFulfilled[_pharmacyAddress];
    }
    
    /**
     * @dev Returns all prescription IDs (contentHashes) for a given patient address.
     * @param _patientAddress The address of the patient.
     * @return An array of bytes32 containing all prescription IDs (contentHashes) for the patient.
     */
    function getPatientPrescriptionIds(address _patientAddress) 
        public view returns (bytes32[] memory) {
        return patientPrescriptions[_patientAddress];
    }

    /**
     * @dev Returns all prescription IDs (contentHashes) for a given doctor address.
     * @param _doctorAddress The address of the doctor.
     * @return An array of bytes32 containing all prescription IDs (contentHashes) for the doctor.
     */
    function getDoctorPrescriptionIds(address _doctorAddress) 
        public view returns (bytes32[] memory) {
        return doctorPrescriptions[_doctorAddress];
    }
}
