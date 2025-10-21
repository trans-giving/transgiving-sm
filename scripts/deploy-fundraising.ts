import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main() {
  console.log("Starting FundRaising contract deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Define initial fundraisers (modify these addresses as needed)
  const initialFundRaisers: string[] = [
    // Add your fundraiser addresses here
    '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
    // Example: "0x1234567890123456789012345678901234567890",
    // Example: "0x2345678901234567890123456789012345678901",
  ];

  // If no fundraisers are provided, you can add the deployer as a default fundraiser
  if (initialFundRaisers.length === 0) {
    console.log("No initial fundraisers provided. Adding deployer as default fundraiser.\n");
    initialFundRaisers.push(deployer.address);
  }

  console.log("Initial fundraisers:", initialFundRaisers);
  console.log("Number of initial fundraisers:", initialFundRaisers.length, "\n");

  // Get the contract factory
  const FundRaising = await ethers.getContractFactory("FundRaising");

  // Deploy the contract
  console.log("Deploying FundRaising contract...");
  const fundRaising = await FundRaising.deploy(initialFundRaisers);

  // Wait for deployment to complete
  await fundRaising.waitForDeployment();

  const contractAddress = await fundRaising.getAddress();
  console.log("\nFundRaising contract deployed successfully!");
  console.log("Contract address:", contractAddress);

  // Verify deployment by checking some contract state
  console.log("\nVerifying deployment...");
  const admin = await fundRaising.getAdmin();
  console.log("Contract admin:", admin);
  console.log("Minimum donation:", ethers.formatEther(await fundRaising.MINIMUM_DONATION()), "ETH");

  // Check if initial fundraisers are active
  console.log("\nVerifying initial fundraisers:");
  for (const fundraiser of initialFundRaisers) {
    const isValid = await fundRaising.isValidFundRaiser(fundraiser);
    console.log(`  ${fundraiser}: ${isValid ? "✓ Active" : "✗ Inactive"}`);
  }

  console.log("\n✅ Deployment completed successfully!");
  console.log("\nContract Details:");
  console.log("═".repeat(60));
  console.log("Address:", contractAddress);
  console.log("Admin:", admin);
  console.log("Initial Fundraisers:", initialFundRaisers.length);
  console.log("═".repeat(60));

  // Save deployment info to a file (optional)
  const fs = await import("fs");
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    contractAddress: contractAddress,
    admin: admin,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    initialFundRaisers: initialFundRaisers,
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n📄 Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error during deployment:");
    console.error(error);
    process.exit(1);
  });
