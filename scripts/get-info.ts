import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main() {
  console.log("FundRaising Contract Information\n");

  // Configuration - MODIFY THESE VALUES
  const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS"; // Replace with deployed contract address
  const QUERY_ADDRESS = "ADDRESS_TO_QUERY"; // Optional: specific address to query (fundraiser or donor)
  const QUERY_TYPE = "fundraiser"; // "fundraiser", "donor", or "contract"

  // Get contract instance
  const FundRaising = await ethers.getContractAt("FundRaising", CONTRACT_ADDRESS);

  console.log("Contract Address:", CONTRACT_ADDRESS, "\n");

  if (QUERY_TYPE === "contract") {
    // Display general contract information
    console.log("═".repeat(60));
    console.log("GENERAL CONTRACT INFORMATION");
    console.log("═".repeat(60));

    const admin = await FundRaising.getAdmin();
    const minDonation = await FundRaising.MINIMUM_DONATION();

    console.log("Admin:", admin);
    console.log("Minimum Donation:", ethers.formatEther(minDonation), "ETH");
    console.log();

  } else if (QUERY_TYPE === "fundraiser") {
    // Display fundraiser information
    console.log("═".repeat(60));
    console.log("FUNDRAISER INFORMATION");
    console.log("═".repeat(60));
    console.log("Address:", QUERY_ADDRESS, "\n");

    const isValid = await FundRaising.isValidFundRaiser(QUERY_ADDRESS);
    const totalRaised = await FundRaising.totalRaisedOfRaiser(QUERY_ADDRESS);
    const balance = await FundRaising.balanceOfRaiser(QUERY_ADDRESS);
    const donationCount = await FundRaising.getDonationCountOfRaiser(QUERY_ADDRESS);

    console.log("Status:", isValid ? "Active ✓" : "Inactive ✗");
    console.log("Total Raised (All Time):", ethers.formatEther(totalRaised), "ETH");
    console.log("Current Balance:", ethers.formatEther(balance), "ETH");
    console.log("Total Donations Received:", donationCount.toString());
    console.log();

    // Get donation history
    if (donationCount > 0n) {
      console.log("─".repeat(60));
      console.log("DONATION HISTORY");
      console.log("─".repeat(60));

      const donations = await FundRaising.getDonationsOfRaiser(QUERY_ADDRESS);

      for (let i = 0; i < donations.length; i++) {
        const donation = donations[i];
        console.log(`\nDonation #${i + 1}:`);
        console.log("  From:", donation.donor);
        console.log("  Amount:", ethers.formatEther(donation.amount), "ETH");
        console.log("  Signature:", donation.signature);
        console.log("  Timestamp:", new Date(Number(donation.timestamp) * 1000).toLocaleString());
      }
    }

  } else if (QUERY_TYPE === "donor") {
    // Display donor information
    console.log("═".repeat(60));
    console.log("DONOR INFORMATION");
    console.log("═".repeat(60));
    console.log("Address:", QUERY_ADDRESS, "\n");

    const donationCount = await FundRaising.getDonationCountOfDonor(QUERY_ADDRESS);
    console.log("Total Donations Made:", donationCount.toString());

    if (donationCount > 0n) {
      const donations = await FundRaising.getDonationsOfDonor(QUERY_ADDRESS);

      // Calculate total donated
      let totalDonated = 0n;
      const fundraiserMap = new Map<string, bigint>();

      for (const donation of donations) {
        totalDonated += donation.amount;
        const current = fundraiserMap.get(donation.raiser) || 0n;
        fundraiserMap.set(donation.raiser, current + donation.amount);
      }

      console.log("Total Donated (All Time):", ethers.formatEther(totalDonated), "ETH");
      console.log("\nDonations by Fundraiser:");
      for (const [fundraiser, amount] of fundraiserMap.entries()) {
        console.log(`  ${fundraiser}: ${ethers.formatEther(amount)} ETH`);
      }

      console.log("\n" + "─".repeat(60));
      console.log("DONATION HISTORY");
      console.log("─".repeat(60));

      for (let i = 0; i < donations.length; i++) {
        const donation = donations[i];
        console.log(`\nDonation #${i + 1}:`);
        console.log("  To:", donation.raiser);
        console.log("  Amount:", ethers.formatEther(donation.amount), "ETH");
        console.log("  Signature:", donation.signature);
        console.log("  Timestamp:", new Date(Number(donation.timestamp) * 1000).toLocaleString());
      }
    }

  } else {
    throw new Error(`Invalid query type: ${QUERY_TYPE}. Use "contract", "fundraiser", or "donor"`);
  }

  console.log("\n" + "═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error querying contract:");
    console.error(error.message);
    process.exit(1);
  });
