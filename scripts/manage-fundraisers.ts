import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main() {
  console.log("Fundraiser Management Tool\n");

  // Configuration - MODIFY THESE VALUES
  const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS"; // Replace with deployed contract address
  const FUNDRAISER_ADDRESS = "ADDRESS_TO_MANAGE"; // Replace with fundraiser address to activate/deactivate
  const ACTION = "activate"; // "activate" or "deactivate"

  // Get admin signer
  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address, "\n");

  // Get contract instance
  const FundRaising = await ethers.getContractAt("FundRaising", CONTRACT_ADDRESS);

  // Verify admin
  const contractAdmin = await FundRaising.getAdmin();
  if (admin.address.toLowerCase() !== contractAdmin.toLowerCase()) {
    throw new Error(`Only admin (${contractAdmin}) can manage fundraisers. Current address: ${admin.address}`);
  }
  console.log("Admin verification successful ✓\n");

  // Check current status
  const currentStatus = await FundRaising.isValidFundRaiser(FUNDRAISER_ADDRESS);
  console.log("Current Status:");
  console.log("  Fundraiser:", FUNDRAISER_ADDRESS);
  console.log("  Status:", currentStatus ? "Active ✓" : "Inactive ✗");
  console.log("  Action to perform:", ACTION, "\n");

  // Perform action
  let tx;
  if (ACTION === "activate") {
    if (currentStatus) {
      console.log("⚠️  Fundraiser is already active");
      return;
    }
    console.log("Activating fundraiser...");
    tx = await FundRaising.activateFundRaiser(FUNDRAISER_ADDRESS);
  } else if (ACTION === "deactivate") {
    if (!currentStatus) {
      console.log("⚠️  Fundraiser is already inactive");
      return;
    }
    console.log("Deactivating fundraiser...");
    tx = await FundRaising.deactivateFundRaiser(FUNDRAISER_ADDRESS);
  } else {
    throw new Error(`Invalid action: ${ACTION}. Use "activate" or "deactivate"`);
  }

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Transaction confirmed! Block:", receipt.blockNumber, "\n");

  // Verify new status
  const newStatus = await FundRaising.isValidFundRaiser(FUNDRAISER_ADDRESS);

  // Get fundraiser info
  const totalRaised = await FundRaising.totalRaisedOfRaiser(FUNDRAISER_ADDRESS);
  const balance = await FundRaising.balanceOfRaiser(FUNDRAISER_ADDRESS);
  const donationCount = await FundRaising.getDonationCountOfRaiser(FUNDRAISER_ADDRESS);

  console.log("✅ Operation successful!");
  console.log("\nFundraiser Details:");
  console.log("═".repeat(60));
  console.log("Address:", FUNDRAISER_ADDRESS);
  console.log("Status:", newStatus ? "Active ✓" : "Inactive ✗");
  console.log("Total raised:", ethers.formatEther(totalRaised), "ETH");
  console.log("Current balance:", ethers.formatEther(balance), "ETH");
  console.log("Total donations:", donationCount.toString());
  console.log("═".repeat(60));

  if (ACTION === "deactivate" && balance > 0n) {
    console.log("\n⚠️  Note: This fundraiser still has", ethers.formatEther(balance), "ETH available to withdraw");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error managing fundraiser:");
    console.error(error.message);
    process.exit(1);
  });
