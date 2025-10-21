import { network } from "hardhat";
import { parseEther } from "ethers";

const { ethers } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main() {
  console.log("=".repeat(60));
  console.log("STEP 1: DEPLOYING CONTRACT");
  console.log("=".repeat(60) + "\n");

  // Get accounts
  const [deployer, fundraiser1, fundraiser2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Fundraiser 1:", fundraiser1.address);
  console.log("Fundraiser 2:", fundraiser2.address);
  console.log();

  // Define initial fundraisers
  const initialFundRaisers = [fundraiser1.address, fundraiser2.address];

  // Deploy contract
  const FundRaising = await ethers.getContractFactory("FundRaising");
  console.log("Deploying FundRaising contract...");
  const fundRaising = await FundRaising.deploy(initialFundRaisers);
  await fundRaising.waitForDeployment();

  const contractAddress = await fundRaising.getAddress();
  console.log("Contract deployed at:", contractAddress);

  // Verify deployment
  const minDonation = await fundRaising.MINIMUM_DONATION();
  console.log("Minimum donation:", ethers.formatEther(minDonation), "ETH\n");

  console.log("=".repeat(60));
  console.log("STEP 2: MAKING DONATION");
  console.log("=".repeat(60) + "\n");

  // Configuration
  const RECEIVER_ADDRESS = fundraiser1.address;
  const DONATION_AMOUNT = "0.001"; // Amount in ETH

  console.log("Donor:", deployer.address);
  console.log("Receiver:", RECEIVER_ADDRESS);
  console.log("Donation amount:", DONATION_AMOUNT, "ETH\n");

  // Check donor balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Donor balance:", ethers.formatEther(balance), "ETH\n");

  // Verify donation amount meets minimum
  const donationWei = parseEther(DONATION_AMOUNT);
  if (donationWei < minDonation) {
    throw new Error(`Donation amount must be at least ${ethers.formatEther(minDonation)} ETH`);
  }

  // Check if receiver is a valid fundraiser
  const isValid = await fundRaising.isValidFundRaiser(RECEIVER_ADDRESS);
  if (!isValid) {
    throw new Error(`${RECEIVER_ADDRESS} is not a valid fundraiser`);
  }
  console.log("Receiver is a valid fundraiser ✓\n");

  // Get initial balances
  const initialRaisedAmount = await fundRaising.totalRaisedOfRaiser(RECEIVER_ADDRESS);
  const initialBalance = await fundRaising.balanceOfRaiser(RECEIVER_ADDRESS);
  const initialDonationCount = await fundRaising.getDonationCountOfRaiser(RECEIVER_ADDRESS);

  console.log("Before donation:");
  console.log("  Total raised:", ethers.formatEther(initialRaisedAmount), "ETH");
  console.log("  Current balance:", ethers.formatEther(initialBalance), "ETH");
  console.log("  Donation count:", initialDonationCount.toString(), "\n");

  // Make donation
  console.log("Sending donation...");
  const tx = await fundRaising.donate(RECEIVER_ADDRESS, {
    value: donationWei,
  });

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  
  console.log("Transaction confirmed! Block:", receipt?.blockNumber, "\n");

  // Get updated balances
  const newRaisedAmount = await fundRaising.totalRaisedOfRaiser(RECEIVER_ADDRESS);
  const newBalance = await fundRaising.balanceOfRaiser(RECEIVER_ADDRESS);
  const newDonationCount = await fundRaising.getDonationCountOfRaiser(RECEIVER_ADDRESS);

  console.log("After donation:");
  console.log("  Total raised:", ethers.formatEther(newRaisedAmount), "ETH");
  console.log("  Current balance:", ethers.formatEther(newBalance), "ETH");
  console.log("  Donation count:", newDonationCount.toString(), "\n");

  // Get donation details
  const donations = await fundRaising.getDonationsOfRaiser(RECEIVER_ADDRESS);
  const latestDonation = donations[donations.length - 1];

  console.log("=".repeat(60));
  console.log("✅ DONATION SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\nDonation Details:");
  console.log("Donor:", latestDonation.donor);
  console.log("Receiver:", latestDonation.raiser);
  console.log("Amount:", ethers.formatEther(latestDonation.amount), "ETH");
  console.log("Timestamp:", new Date(Number(latestDonation.timestamp) * 1000).toLocaleString());
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:");
    console.error(error.message);
    process.exit(1);
  });
