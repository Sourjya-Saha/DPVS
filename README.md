Decentralized Prescription Verification System (DPVS) ✨
Secure & Transparent Healthcare Through Blockchain
The Decentralized Prescription Verification System (DPVS) is an innovative application built on blockchain technology to enhance the security, transparency, and integrity of prescription issuance and fulfillment. It aims to eliminate prescription fraud, streamline verification processes, and provide an immutable record of medical prescriptions and their dispensation.

✨ Key Features
Decentralized Pharmacy Registration: Pharmacies can register themselves with their unique MetaMask addresses, fostering a truly decentralized network without reliance on a central authority.

Doctor Registry: Doctors can be registered and verified on-chain, ensuring that only authorized medical professionals can issue prescriptions.

Immutable Prescription Issuance: Doctors issue prescriptions that are securely stored on the blockchain with a unique content hash and IPFS link, making them tamper-proof.

Multi-Fulfillment Tracking: Prescriptions can be fulfilled by multiple authorized pharmacies, with each fulfillment event being immutably recorded on-chain, including the fulfilling pharmacy's details and the timestamp.

Real-time Verification: Pharmacies can quickly and accurately verify the authenticity and validity of a prescription by scanning a QR code, checking its content hash, expiry status, and fulfillment history.

IPFS Integration: Prescription documents (e.g., PDFs) are stored on IPFS, ensuring decentralized and censorship-resistant storage, with only their hashes recorded on the blockchain for privacy and data integrity.

Transparent History: Patients, doctors, and authorized pharmacies can view the full history of a prescription, including all fulfillment events.

🚀 Technologies Used
Solidity: Smart contracts for on-chain logic (Doctor Registry, Pharmacy Registry, Prescription Registry).

Hardhat: Ethereum development environment for smart contract compilation, testing, and deployment.

Ethers.js: JavaScript library for interacting with the Ethereum blockchain from the frontend.

React: Frontend framework for building the user interface (Doctor, Patient, Pharmacy dashboards).

Tailwind CSS: Utility-first CSS framework for rapid and responsive UI development.

Vite: Fast frontend build tool.

MetaMask: Wallet integration for blockchain interactions.

IPFS (InterPlanetary File System): Decentralized storage for prescription documents.

💡 How It Works (High-Level Flow)
Deployment: Smart contracts (DoctorRegistry, PharmacyRegistry, PrescriptionRegistry) are deployed to an Ethereum-compatible blockchain.

Registration:

Authorized entities (e.g., contract owner) register doctors in the DoctorRegistry.

Any pharmacy can register itself in the PharmacyRegistry using its MetaMask address and name.

Prescription Issuance: A registered doctor issues a prescription for a patient. The prescription's content (e.g., a PDF) is uploaded to IPFS, and its unique hash, IPFS link, and other details are recorded in the PrescriptionRegistry smart contract. A QR code containing the prescription's content hash is generated.

Prescription Verification & Fulfillment:

A pharmacist at a registered pharmacy scans the prescription's QR code (or manually enters the hash).

The system uses the PrescriptionRegistry to verify the prescription's authenticity (matching content hash, valid expiry).

It also checks the PharmacyRegistry to confirm the pharmacy is verified.

If valid and not yet fulfilled by that specific pharmacy, the pharmacist can initiate a "Fulfill Prescription" transaction, which adds a new fulfillment record to the prescription's history on the blockchain.

🛠️ Getting Started
To set up the DPVS locally, follow these steps:

Clone the repository:

git clone [YOUR_REPO_URL]
cd decentralized-prescription-system

Install dependencies:

npm install
# or
yarn install

Configure Environment Variables:
Create a .env file in the root directory and add your contract addresses and any other necessary configurations:

VITE_DOCTOR_REGISTRY_ADDRESS=0x...
VITE_PRESCRIPTION_REGISTRY_ADDRESS=0x...
VITE_PHARMACY_REGISTRY_ADDRESS=0x...
# Add any IPFS-related keys or other environment variables

Compile & Deploy Smart Contracts:
(Instructions for compiling and deploying your Hardhat contracts. You will need to deploy DoctorRegistry, PharmacyRegistry, and then PrescriptionRegistry (passing the addresses of the other two to its constructor) and update your .env file accordingly.)

Run the Frontend:

npm run dev
# or
yarn dev

Open your browser to http://localhost:5173 (or the port specified).

🤝 Contributing
Contributions are welcome! Please feel free to open a pull request or open an issue.
