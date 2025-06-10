const hre = require("hardhat");

async function main() {
  try {
    // Get the deploying account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // --- 1. Deploy DoctorRegistry ---
    console.log("\n1. Deploying DoctorRegistry...");
    const DoctorRegistryFactory = await hre.ethers.getContractFactory("DoctorRegistry");
    // DoctorRegistry constructor: `constructor(address initialOwner) Ownable(initialOwner) {}`
    // It requires the initial owner address.
    const doctorRegistry = await DoctorRegistryFactory.deploy(deployer.address); 
    await doctorRegistry.waitForDeployment();
    const doctorRegistryAddress = await doctorRegistry.getAddress();
    console.log("DoctorRegistry deployed to:", doctorRegistryAddress);

    // --- 2. Deploy PharmacyRegistry ---
    console.log("\n2. Deploying PharmacyRegistry...");
    const PharmacyRegistryFactory = await hre.ethers.getContractFactory("PharmacyRegistry");
    // PharmacyRegistry constructor: `constructor() { owner = msg.sender; }`
    // It requires NO arguments. Fixed: Remove the empty array and undefined parameters.
    const pharmacyRegistry = await PharmacyRegistryFactory.deploy(); 
    await pharmacyRegistry.waitForDeployment();
    const pharmacyRegistryAddress = await pharmacyRegistry.getAddress();
    console.log("PharmacyRegistry deployed to:", pharmacyRegistryAddress);

    // --- 3. Deploy PrescriptionRegistry ---
    console.log("\n3. Deploying PrescriptionRegistry...");
    const PrescriptionRegistryFactory = await hre.ethers.getContractFactory("PrescriptionRegistry");
    // PrescriptionRegistry constructor: `constructor(address _doctorRegistry, address _pharmacyRegistry) { ... }`
    // It requires both previously deployed registry addresses.
    const prescriptionRegistry = await PrescriptionRegistryFactory.deploy(
      doctorRegistryAddress,   // First argument: DoctorRegistry address
      pharmacyRegistryAddress  // Second argument: PharmacyRegistry address
    );
    await prescriptionRegistry.waitForDeployment();
    const prescriptionRegistryAddress = await prescriptionRegistry.getAddress();
    console.log("PrescriptionRegistry deployed to:", prescriptionRegistryAddress);

    // --- 4. Verification ---
    console.log("\n4. Verifying deployments...");
    
    // Verify that PrescriptionRegistry has the correct references
    const storedDoctorRegistry = await prescriptionRegistry.doctorRegistry();
    const storedPharmacyRegistry = await prescriptionRegistry.pharmacyRegistry();
    
    console.log("Stored DoctorRegistry address in PrescriptionRegistry:", storedDoctorRegistry);
    console.log("Stored PharmacyRegistry address in PrescriptionRegistry:", storedPharmacyRegistry);
    
    // Verify addresses match
    if (storedDoctorRegistry.toLowerCase() === doctorRegistryAddress.toLowerCase()) {
      console.log("✅ DoctorRegistry reference is correct");
    } else {
      console.log("❌ DoctorRegistry reference mismatch");
    }
    
    if (storedPharmacyRegistry.toLowerCase() === pharmacyRegistryAddress.toLowerCase()) {
      console.log("✅ PharmacyRegistry reference is correct");
    } else {
      console.log("❌ PharmacyRegistry reference mismatch");
    }

    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("DoctorRegistry Address:", doctorRegistryAddress);
    console.log("PharmacyRegistry Address:", pharmacyRegistryAddress);
    console.log("PrescriptionRegistry Address:", prescriptionRegistryAddress);
    console.log("Deployer (Owner):", deployer.address);
    console.log("Network:", hre.network.name);
    
    // Save addresses to a file for future reference
    const deploymentInfo = {
      network: hre.network.name,
      deployer: deployer.address,
      contracts: {
        DoctorRegistry: doctorRegistryAddress,
        PharmacyRegistry: pharmacyRegistryAddress,
        PrescriptionRegistry: prescriptionRegistryAddress
      },
      deploymentTime: new Date().toISOString()
    };
    
    const fs = require('fs');
    const path = require('path');
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment info
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentFile}`);
    
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});