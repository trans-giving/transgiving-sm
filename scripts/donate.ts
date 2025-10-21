import { network } from "hardhat";
import { parseEther } from "ethers";

const { ethers } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main() {
  console.log("Starting donation process...\n");

  // Configuration - MODIFY THESE VALUES
  const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with deployed contract address
  const RECEIVER_ADDRESS = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"; // Replace with fundraiser address
  const DONATION_AMOUNT = "0.001"; // Amount in ETH

  // Get signer
  const [donor] = await ethers.getSigners();
  console.log("Donor address:", donor.address);

  // Get donor balance
  const balance = await ethers.provider.getBalance(donor.address);
  console.log("Donor balance:", ethers.formatEther(balance), "ETH\n");

  // Get contract instance
  const FundRaising = await ethers.getContractAt("FundRaising", CONTRACT_ADDRESS);

  // Check minimum donation
  const minDonation = await FundRaising.MINIMUM_DONATION();
  console.log("Minimum donation required:", ethers.formatEther(minDonation), "ETH");
  console.log("Your donation amount:", DONATION_AMOUNT, "ETH");

  // Verify donation amount meets minimum
  const donationWei = parseEther(DONATION_AMOUNT);
  if (donationWei < minDonation) {
    throw new Error(`Donation amount must be at least ${ethers.formatEther(minDonation)} ETH`);
  }

  // Check if receiver is a valid fundraiser
  const isValid = await FundRaising.isValidFundRaiser(RECEIVER_ADDRESS);
  if (!isValid) {
    throw new Error(`${RECEIVER_ADDRESS} is not a valid fundraiser`);
  }
  console.log("Receiver is a valid fundraiser ✓\n");

  // Get initial balances
  const initialRaisedAmount = await FundRaising.totalRaisedOfRaiser(RECEIVER_ADDRESS);
  const initialBalance = await FundRaising.balanceOfRaiser(RECEIVER_ADDRESS);
  const initialDonationCount = await FundRaising.getDonationCountOfRaiser(RECEIVER_ADDRESS);

  console.log("Before donation:");
  console.log("  Total raised:", ethers.formatEther(initialRaisedAmount), "ETH");
  console.log("  Current balance:", ethers.formatEther(initialBalance), "ETH");
  console.log("  Donation count:", initialDonationCount.toString(), "\n");

  // Make donation
  console.log("Sending donation...");
  const tx = await FundRaising.donate(RECEIVER_ADDRESS, {
    value: donationWei,
  });

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Transaction confirmed! Block:", receipt.blockNumber, "\n");

  // Get updated balances
  const newRaisedAmount = await FundRaising.totalRaisedOfRaiser(RECEIVER_ADDRESS);
  const newBalance = await FundRaising.balanceOfRaiser(RECEIVER_ADDRESS);
  const newDonationCount = await FundRaising.getDonationCountOfRaiser(RECEIVER_ADDRESS);

  console.log("After donation:");
  console.log("  Total raised:", ethers.formatEther(newRaisedAmount), "ETH");
  console.log("  Current balance:", ethers.formatEther(newBalance), "ETH");
  console.log("  Donation count:", newDonationCount.toString(), "\n");

  // Get donation details
  const donations = await FundRaising.getDonationsOfRaiser(RECEIVER_ADDRESS);
  const latestDonation = donations[donations.length - 1];

  console.log("✅ Donation successful!");
  console.log("\nDonation Details:");
  console.log("═".repeat(60));
  console.log("Donor:", latestDonation.donor);
  console.log("Receiver:", latestDonation.raiser);
  console.log("Amount:", ethers.formatEther(latestDonation.amount), "ETH");
  console.log("Timestamp:", new Date(Number(latestDonation.timestamp) * 1000).toLocaleString());
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error during donation:");
    console.error(error.message);
    process.exit(1);
  });
