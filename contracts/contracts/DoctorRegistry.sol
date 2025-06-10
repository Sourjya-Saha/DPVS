// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DoctorRegistry is Ownable {
    struct Doctor {
        string name;
        string licenseNumber;
        string specialization;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => Doctor) public doctors;
    mapping(address => bool) public isVerifiedDoctor;

    event DoctorRegistered(address indexed doctorAddress, string name, string licenseNumber);
    event DoctorDeactivated(address indexed doctorAddress);

    // Add constructor to pass initialOwner to Ownable
    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyVerifiedDoctor() {
        require(isVerifiedDoctor[msg.sender], "Not a verified doctor");
        _;
    }

    // MODIFIED: Removed 'onlyOwner' modifier to allow any address to register
    function registerDoctor(
        address _doctorAddress,
        string memory _name,
        string memory _licenseNumber,
        string memory _specialization
    ) external { // <--- 'onlyOwner' removed here
        // Prevent re-registering an already active doctor at the same address
        require(!doctors[_doctorAddress].isActive, "Doctor already registered and active");

        doctors[_doctorAddress] = Doctor({
            name: _name,
            licenseNumber: _licenseNumber,
            specialization: _specialization,
            isActive: true,
            registeredAt: block.timestamp
        });
        isVerifiedDoctor[_doctorAddress] = true;

        emit DoctorRegistered(_doctorAddress, _name, _licenseNumber);
    }

    function deactivateDoctor(address _doctorAddress) external onlyOwner {
        require(doctors[_doctorAddress].isActive, "Doctor is not active"); // Ensure doctor is active before deactivating
        isVerifiedDoctor[_doctorAddress] = false;
        doctors[_doctorAddress].isActive = false;
        emit DoctorDeactivated(_doctorAddress);
    }

    // Added a getter for a single doctor's full details (useful for frontend)
    // This is optional but good practice if your frontend needs full struct data
    function getDoctorDetails(address _doctorAddress) public view returns (
        string memory name,
        string memory licenseNumber,
        string memory specialization,
        bool isActive,
        uint256 registeredAt
    ) {
        Doctor storage doctor = doctors[_doctorAddress];
        return (doctor.name, doctor.licenseNumber, doctor.specialization, doctor.isActive, doctor.registeredAt);
    }
}
