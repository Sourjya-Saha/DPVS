// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PharmacyRegistry {
    address public owner; // Retain owner for other potential owner-only functions if needed
    // Mapping to store verified pharmacies and their names
    mapping(address => string) private verifiedPharmacies;

    event PharmacyRegistered(address indexed pharmacyAddress, string name);
    event PharmacyRemoved(address indexed pharmacyAddress);

    constructor() {
        owner = msg.sender;
    }

    // You can keep onlyOwner for functions you truly want restricted to the deployer,
    // but it's removed from registerPharmacy and removePharmacy.
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Registers a new pharmacy.
     * This function is now accessible to any external address.
     * @param _pharmacyAddress The address of the pharmacy to register.
     * @param _name The name of the pharmacy.
     */
    function registerPharmacy(address _pharmacyAddress, string memory _name) external { // Removed onlyOwner
        require(_pharmacyAddress != address(0), "PharmacyRegistry: Invalid address");
        require(bytes(_name).length > 0, "PharmacyRegistry: Pharmacy name cannot be empty");
        require(bytes(verifiedPharmacies[_pharmacyAddress]).length == 0, "PharmacyRegistry: Pharmacy already registered");
        
        verifiedPharmacies[_pharmacyAddress] = _name;
        emit PharmacyRegistered(_pharmacyAddress, _name);
    }

    /**
     * @dev Removes a registered pharmacy.
     * This function is now accessible to any external address.
     * IMPORTANT CONSIDERATION: Do you want ANYONE to be able to remove ANY pharmacy,
     * or only the pharmacy itself, or only the contract owner?
     * Current implementation allows anyone to remove any pharmacy.
     * If only the pharmacy itself should be able to remove its own registration,
     * you would change the require statement to `require(msg.sender == _pharmacyAddress, "Only the registered pharmacy can remove itself");`
     * If only the owner should remove, add `onlyOwner` modifier back.
     * @param _pharmacyAddress The address of the pharmacy to remove.
     */
    function removePharmacy(address _pharmacyAddress) external { // Removed onlyOwner
        require(bytes(verifiedPharmacies[_pharmacyAddress]).length > 0, "PharmacyRegistry: Pharmacy not registered");
        
        // Optional: Add a check if only the pharmacy itself can remove its registration
        // require(msg.sender == _pharmacyAddress, "PharmacyRegistry: Only the registered pharmacy can remove itself");

        delete verifiedPharmacies[_pharmacyAddress];
        emit PharmacyRemoved(_pharmacyAddress);
    }

    /**
     * @dev Checks if an address is a verified pharmacy.
     * @param _pharmacyAddress The address to check.
     * @return True if the address is a verified pharmacy, false otherwise.
     */
    function isVerifiedPharmacy(address _pharmacyAddress) public view returns (bool) {
        return bytes(verifiedPharmacies[_pharmacyAddress]).length > 0;
    }

    /**
     * @dev Returns the name of a verified pharmacy.
     * @param _pharmacyAddress The address of the pharmacy.
     * @return The name of the pharmacy. Returns an empty string if not registered.
     */
    function getPharmacyName(address _pharmacyAddress) public view returns (string memory) {
        return verifiedPharmacies[_pharmacyAddress];
    }
}