import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main() {
  console.log("Starting withdrawal process...\n");

  // Configuration - MODIFY THESE VALUES
  const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS"; // Replace with deployed contract address

  // Get signer (must be a valid fundraiser)
  const [fundraiser] = await ethers.getSigners();
  console.log("Fundraiser address:", fundraiser.address);

  // Get fundraiser balance before withdrawal
  const ethBalanceBefore = await ethers.provider.getBalance(fundraiser.address);
  console.log("ETH balance before:", ethers.formatEther(ethBalanceBefore), "ETH\n");

  // Get contract instance
  const FundRaising = await ethers.getContractAt("FundRaising", CONTRACT_ADDRESS);

  // Check if address is a valid fundraiser
  const isValid = await FundRaising.isValidFundRaiser(fundraiser.address);
  if (!isValid) {
    throw new Error(`${fundraiser.address} is not a valid fundraiser`);
  }
  console.log("Address is a valid fundraiser ✓\n");

  // Get withdrawal amount
  const withdrawalAmount = await FundRaising.balanceOfRaiser(fundraiser.address);
  console.log("Available to withdraw:", ethers.formatEther(withdrawalAmount), "ETH");

  if (withdrawalAmount === 0n) {
    console.log("\n⚠️  No funds available to withdraw");
    return;
  }

  // Get total raised (for reference)
  const totalRaised = await FundRaising.totalRaisedOfRaiser(fundraiser.address);
  console.log("Total raised (all time):", ethers.formatEther(totalRaised), "ETH\n");

  // Perform withdrawal
  console.log("Initiating withdrawal...");
  const tx = await FundRaising.withdraw();

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Transaction confirmed! Block:", receipt.blockNumber, "\n");

  // Get balances after withdrawal
  const ethBalanceAfter = await ethers.provider.getBalance(fundraiser.address);
  const contractBalanceAfter = await FundRaising.balanceOfRaiser(fundraiser.address);

  // Calculate actual ETH received (accounting for gas fees)
  const ethReceived = ethBalanceAfter - ethBalanceBefore;
  const gasUsed = receipt.gasUsed * receipt.gasPrice;

  console.log("✅ Withdrawal successful!");
  console.log("\nWithdrawal Details:");
  console.log("═".repeat(60));
  console.log("Withdrawn amount:", ethers.formatEther(withdrawalAmount), "ETH");
  console.log("Gas used:", ethers.formatEther(gasUsed), "ETH");
  console.log("Net received:", ethers.formatEther(ethReceived), "ETH");
  console.log("═".repeat(60));
  console.log("\nUpdated Balances:");
  console.log("  ETH balance:", ethers.formatEther(ethBalanceAfter), "ETH");
  console.log("  Contract balance:", ethers.formatEther(contractBalanceAfter), "ETH");
  console.log("  Total raised (lifetime):", ethers.formatEther(totalRaised), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error during withdrawal:");
    console.error(error.message);
    process.exit(1);
  });
