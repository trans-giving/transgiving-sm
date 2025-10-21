import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("FundRaising", function () {
  const MINIMUM_DONATION = ethers.parseEther("0.0001");

  async function deployFundRaisingFixture() {
    const [admin, fundraiser1, fundraiser2, donor1, donor2, nonFundraiser] = await ethers.getSigners();
    const fundRaising = await ethers.deployContract("FundRaising", [[fundraiser1.address, fundraiser2.address]]);
    return { fundRaising, admin, fundraiser1, fundraiser2, donor1, donor2, nonFundraiser };
  }

  describe("Deployment", function () {
    it("Should set the right admin", async function () {
      const { fundRaising, admin } = await deployFundRaisingFixture();
      expect(await fundRaising.getAdmin()).to.equal(admin.address);
    });

    it("Should activate fundraisers passed in constructor", async function () {
      const { fundRaising, fundraiser1, fundraiser2 } = await deployFundRaisingFixture();
      expect(await fundRaising.isValidFundRaiser(fundraiser1.address)).to.be.true;
      expect(await fundRaising.isValidFundRaiser(fundraiser2.address)).to.be.true;
    });

    it("Should emit FundRaiserActivated events for initial fundraisers", async function () {
      const [, fundraiser1] = await ethers.getSigners();
      const contract = await ethers.deployContract("FundRaising", [[fundraiser1.address]]);
      const deploymentTx = contract.deploymentTransaction();
      await expect(deploymentTx)
        .to.emit(contract, "FundRaiserActivated")
        .withArgs(fundraiser1.address);
    });

    it("Should reject zero address fundraisers in constructor", async function () {
      await expect(
        ethers.deployContract("FundRaising", [[ethers.ZeroAddress]])
      ).to.be.revertedWith("Invalid fundraiser address");
    });

    it("Should set correct MINIMUM_DONATION constant", async function () {
      const { fundRaising } = await deployFundRaisingFixture();
      expect(await fundRaising.MINIMUM_DONATION()).to.equal(MINIMUM_DONATION);
    });
  });

  describe("Donations", function () {
    describe("Validations", function () {
      it("Should reject donations below minimum amount", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        const tooSmall = ethers.parseEther("0.00009");
        await expect(
          fundRaising.connect(donor1).donate(fundraiser1.address, "Thank you!", { value: tooSmall })
        ).to.be.revertedWith("Must send at least 0.0001 ETH to prevent spamming");
      });

      it("Should reject donations to invalid fundraisers", async function () {
        const { fundRaising, donor1, nonFundraiser } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(donor1).donate(nonFundraiser.address, "Thank you!", { value: MINIMUM_DONATION })
        ).to.be.revertedWith("Receiver is not a valid fundraiser");
      });

      it("Should reject donations to zero address", async function () {
        const { fundRaising, donor1 } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(donor1).donate(ethers.ZeroAddress, "Thank you!", { value: MINIMUM_DONATION })
        ).to.be.revertedWith("Invalid receiver address");
      });

      it("Should accept donations equal to minimum amount", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(donor1).donate(fundraiser1.address, "Minimum donation", { value: MINIMUM_DONATION })
        ).to.not.be.revert(ethers);
      });
    });

    describe("Successful Donations", function () {
      it("Should record donation correctly", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        const donationAmount = ethers.parseEther("1.0");
        const signature = "Great cause!";

        await fundRaising.connect(donor1).donate(fundraiser1.address, signature, { value: donationAmount });

        expect(await fundRaising.totalRaisedOfRaiser(fundraiser1.address)).to.equal(donationAmount);
        expect(await fundRaising.balanceOfRaiser(fundraiser1.address)).to.equal(donationAmount);
      });

      it("Should emit Donate event", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        const donationAmount = ethers.parseEther("1.0");
        const signature = "Great cause!";

        await expect(
          fundRaising.connect(donor1).donate(fundraiser1.address, signature, { value: donationAmount })
        )
          .to.emit(fundRaising, "Donate")
          .withArgs(donor1.address, fundraiser1.address, donationAmount, signature);
      });

      it("Should store donation in donor's history", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        const donationAmount = ethers.parseEther("1.0");
        const signature = "Great cause!";

        await fundRaising.connect(donor1).donate(fundraiser1.address, signature, { value: donationAmount });

        const donations = await fundRaising.getDonationsOfDonor(donor1.address);
        expect(donations.length).to.equal(1);
        expect(donations[0].amount).to.equal(donationAmount);
        expect(donations[0].signature).to.equal(signature);
        expect(donations[0].raiser).to.equal(fundraiser1.address);
        expect(donations[0].donor).to.equal(donor1.address);
      });

      it("Should store donation in fundraiser's history", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        const donationAmount = ethers.parseEther("1.0");
        const signature = "Great cause!";

        await fundRaising.connect(donor1).donate(fundraiser1.address, signature, { value: donationAmount });

        const donations = await fundRaising.getDonationsOfRaiser(fundraiser1.address);
        expect(donations.length).to.equal(1);
        expect(donations[0].amount).to.equal(donationAmount);
        expect(donations[0].signature).to.equal(signature);
      });

      it("Should handle multiple donations from same donor", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        await fundRaising.connect(donor1).donate(fundraiser1.address, "First", { value: ethers.parseEther("1.0") });
        await fundRaising.connect(donor1).donate(fundraiser1.address, "Second", { value: ethers.parseEther("2.0") });

        const donations = await fundRaising.getDonationsOfDonor(donor1.address);
        expect(donations.length).to.equal(2);
        expect(await fundRaising.getDonationCountOfDonor(donor1.address)).to.equal(2);
        expect(await fundRaising.totalRaisedOfRaiser(fundraiser1.address)).to.equal(ethers.parseEther("3.0"));
      });

      it("Should handle donations to multiple fundraisers", async function () {
        const { fundRaising, donor1, fundraiser1, fundraiser2 } = await deployFundRaisingFixture();
        await fundRaising.connect(donor1).donate(fundraiser1.address, "To #1", { value: ethers.parseEther("1.0") });
        await fundRaising.connect(donor1).donate(fundraiser2.address, "To #2", { value: ethers.parseEther("2.0") });

        expect(await fundRaising.getDonationCountOfDonor(donor1.address)).to.equal(2);
        expect(await fundRaising.totalRaisedOfRaiser(fundraiser1.address)).to.equal(ethers.parseEther("1.0"));
        expect(await fundRaising.totalRaisedOfRaiser(fundraiser2.address)).to.equal(ethers.parseEther("2.0"));
      });

      it("Should handle multiple donors to same fundraiser", async function () {
        const { fundRaising, donor1, donor2, fundraiser1 } = await deployFundRaisingFixture();
        await fundRaising.connect(donor1).donate(fundraiser1.address, "From donor1", { value: ethers.parseEther("1.0") });
        await fundRaising.connect(donor2).donate(fundraiser1.address, "From donor2", { value: ethers.parseEther("2.0") });

        expect(await fundRaising.getDonationCountOfRaiser(fundraiser1.address)).to.equal(2);
        expect(await fundRaising.totalRaisedOfRaiser(fundraiser1.address)).to.equal(ethers.parseEther("3.0"));
      });

      it("Should record timestamp for donations", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        const tx = await fundRaising.connect(donor1).donate(fundraiser1.address, "Test", { value: MINIMUM_DONATION });
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt!.blockNumber);

        const donations = await fundRaising.getDonationsOfDonor(donor1.address);
        expect(donations[0].timestamp).to.equal(block!.timestamp);
      });
    });

    describe("Contract Balance", function () {
      it("Should increase contract balance after donation", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        const donationAmount = ethers.parseEther("1.0");
        const initialBalance = await ethers.provider.getBalance(await fundRaising.getAddress());

        await fundRaising.connect(donor1).donate(fundraiser1.address, "Test", { value: donationAmount });

        const finalBalance = await ethers.provider.getBalance(await fundRaising.getAddress());
        expect(finalBalance - initialBalance).to.equal(donationAmount);
      });
    });
  });

  describe("Withdrawals", function () {
    it("Should allow fundraiser to withdraw their funds", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "Donation", { value: ethers.parseEther("5.0") });

      const initialBalance = await ethers.provider.getBalance(fundraiser1.address);
      const withdrawAmount = await fundRaising.balanceOfRaiser(fundraiser1.address);

      const tx = await fundRaising.connect(fundraiser1).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(fundraiser1.address);
      expect(finalBalance).to.equal(initialBalance + withdrawAmount - gasUsed);
    });

    it("Should emit FundsWithdrawn event", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "Donation", { value: ethers.parseEther("5.0") });

      const amount = await fundRaising.balanceOfRaiser(fundraiser1.address);
      await expect(fundRaising.connect(fundraiser1).withdraw())
        .to.emit(fundRaising, "FundsWithdrawn")
        .withArgs(fundraiser1.address, amount);
    });

    it("Should set balance to zero after withdrawal", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "Donation", { value: ethers.parseEther("5.0") });

      await fundRaising.connect(fundraiser1).withdraw();
      expect(await fundRaising.balanceOfRaiser(fundraiser1.address)).to.equal(0);
    });

    it("Should not change totalRaisedOfRaiser after withdrawal", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "Donation", { value: ethers.parseEther("5.0") });

      const totalBefore = await fundRaising.totalRaisedOfRaiser(fundraiser1.address);
      await fundRaising.connect(fundraiser1).withdraw();
      expect(await fundRaising.totalRaisedOfRaiser(fundraiser1.address)).to.equal(totalBefore);
    });

    it("Should reject withdrawal from non-fundraiser", async function () {
      const { fundRaising, nonFundraiser } = await deployFundRaisingFixture();
      await expect(
        fundRaising.connect(nonFundraiser).withdraw()
      ).to.be.revertedWith("Only valid fundraisers can withdraw");
    });

    it("Should reject withdrawal when balance is zero", async function () {
      const { fundRaising, fundraiser1 } = await deployFundRaisingFixture();
      await expect(
        fundRaising.connect(fundraiser1).withdraw()
      ).to.be.revertedWith("No funds to withdraw");
    });

    it("Should reject withdrawal from deactivated fundraiser", async function () {
      const { fundRaising, donor1, admin, fundraiser1 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "Donation", { value: ethers.parseEther("5.0") });
      await fundRaising.connect(admin).deactivateFundRaiser(fundraiser1.address);

      await expect(
        fundRaising.connect(fundraiser1).withdraw()
      ).to.be.revertedWith("Only valid fundraisers can withdraw");
    });

    it("Should handle multiple withdrawals correctly", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "First donation", { value: ethers.parseEther("5.0") });
      await fundRaising.connect(fundraiser1).withdraw();

      await fundRaising.connect(donor1).donate(fundraiser1.address, "Another donation", { value: ethers.parseEther("2.0") });

      expect(await fundRaising.balanceOfRaiser(fundraiser1.address)).to.equal(ethers.parseEther("2.0"));
      await fundRaising.connect(fundraiser1).withdraw();
      expect(await fundRaising.balanceOfRaiser(fundraiser1.address)).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    describe("Activate FundRaiser", function () {
      it("Should allow admin to activate new fundraiser", async function () {
        const { fundRaising, admin, nonFundraiser } = await deployFundRaisingFixture();
        await fundRaising.connect(admin).activateFundRaiser(nonFundraiser.address);
        expect(await fundRaising.isValidFundRaiser(nonFundraiser.address)).to.be.true;
      });

      it("Should emit FundRaiserActivated event", async function () {
        const { fundRaising, admin, nonFundraiser } = await deployFundRaisingFixture();
        await expect(fundRaising.connect(admin).activateFundRaiser(nonFundraiser.address))
          .to.emit(fundRaising, "FundRaiserActivated")
          .withArgs(nonFundraiser.address);
      });

      it("Should reject activation from non-admin", async function () {
        const { fundRaising, donor1, nonFundraiser } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(donor1).activateFundRaiser(nonFundraiser.address)
        ).to.be.revertedWith("Only admin can call this function");
      });

      it("Should reject activation of already active fundraiser", async function () {
        const { fundRaising, admin, fundraiser1 } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(admin).activateFundRaiser(fundraiser1.address)
        ).to.be.revertedWith("Fundraiser already active");
      });

      it("Should reject zero address activation", async function () {
        const { fundRaising, admin } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(admin).activateFundRaiser(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid fundraiser address");
      });

      it("Should allow donations to newly activated fundraiser", async function () {
        const { fundRaising, admin, donor1, nonFundraiser } = await deployFundRaisingFixture();
        await fundRaising.connect(admin).activateFundRaiser(nonFundraiser.address);
        await expect(
          fundRaising.connect(donor1).donate(nonFundraiser.address, "Test", { value: MINIMUM_DONATION })
        ).to.not.be.revert(ethers);
      });
    });

    describe("Deactivate FundRaiser", function () {
      it("Should allow admin to deactivate fundraiser", async function () {
        const { fundRaising, admin, fundraiser1 } = await deployFundRaisingFixture();
        await fundRaising.connect(admin).deactivateFundRaiser(fundraiser1.address);
        expect(await fundRaising.isValidFundRaiser(fundraiser1.address)).to.be.false;
      });

      it("Should emit FundRaiserDeactivated event", async function () {
        const { fundRaising, admin, fundraiser1 } = await deployFundRaisingFixture();
        await expect(fundRaising.connect(admin).deactivateFundRaiser(fundraiser1.address))
          .to.emit(fundRaising, "FundRaiserDeactivated")
          .withArgs(fundraiser1.address);
      });

      it("Should reject deactivation from non-admin", async function () {
        const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(donor1).deactivateFundRaiser(fundraiser1.address)
        ).to.be.revertedWith("Only admin can call this function");
      });

      it("Should reject deactivation of already inactive fundraiser", async function () {
        const { fundRaising, admin, nonFundraiser } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(admin).deactivateFundRaiser(nonFundraiser.address)
        ).to.be.revertedWith("Fundraiser already inactive");
      });

      it("Should reject zero address deactivation", async function () {
        const { fundRaising, admin } = await deployFundRaisingFixture();
        await expect(
          fundRaising.connect(admin).deactivateFundRaiser(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid fundraiser address");
      });

      it("Should prevent donations to deactivated fundraiser", async function () {
        const { fundRaising, admin, donor1, fundraiser1 } = await deployFundRaisingFixture();
        await fundRaising.connect(admin).deactivateFundRaiser(fundraiser1.address);
        await expect(
          fundRaising.connect(donor1).donate(fundraiser1.address, "Test", { value: MINIMUM_DONATION })
        ).to.be.revertedWith("Receiver is not a valid fundraiser");
      });

      it("Should allow reactivation after deactivation", async function () {
        const { fundRaising, admin, fundraiser1 } = await deployFundRaisingFixture();
        await fundRaising.connect(admin).deactivateFundRaiser(fundraiser1.address);
        await fundRaising.connect(admin).activateFundRaiser(fundraiser1.address);
        expect(await fundRaising.isValidFundRaiser(fundraiser1.address)).to.be.true;
      });
    });
  });

  describe("View Functions", function () {
    it("Should return correct donations for donor", async function () {
      const { fundRaising, donor1, fundraiser1, fundraiser2 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "First", { value: ethers.parseEther("1.0") });
      await fundRaising.connect(donor1).donate(fundraiser2.address, "Second", { value: ethers.parseEther("2.0") });

      const donations = await fundRaising.getDonationsOfDonor(donor1.address);
      expect(donations.length).to.equal(2);
    });

    it("Should return correct donations for fundraiser", async function () {
      const { fundRaising, donor1, donor2, fundraiser1 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "First", { value: ethers.parseEther("1.0") });
      await fundRaising.connect(donor2).donate(fundraiser1.address, "Third", { value: ethers.parseEther("3.0") });

      const donations = await fundRaising.getDonationsOfRaiser(fundraiser1.address);
      expect(donations.length).to.equal(2);
      expect(donations[0].donor).to.equal(donor1.address);
      expect(donations[1].donor).to.equal(donor2.address);
    });

    it("Should return correct donation count for donor", async function () {
      const { fundRaising, donor1, donor2, fundraiser1, fundraiser2 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "First", { value: ethers.parseEther("1.0") });
      await fundRaising.connect(donor1).donate(fundraiser2.address, "Second", { value: ethers.parseEther("2.0") });
      await fundRaising.connect(donor2).donate(fundraiser1.address, "Third", { value: ethers.parseEther("3.0") });

      expect(await fundRaising.getDonationCountOfDonor(donor1.address)).to.equal(2);
      expect(await fundRaising.getDonationCountOfDonor(donor2.address)).to.equal(1);
    });

    it("Should return correct donation count for fundraiser", async function () {
      const { fundRaising, donor1, donor2, fundraiser1, fundraiser2 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "First", { value: ethers.parseEther("1.0") });
      await fundRaising.connect(donor1).donate(fundraiser2.address, "Second", { value: ethers.parseEther("2.0") });
      await fundRaising.connect(donor2).donate(fundraiser1.address, "Third", { value: ethers.parseEther("3.0") });

      expect(await fundRaising.getDonationCountOfRaiser(fundraiser1.address)).to.equal(2);
      expect(await fundRaising.getDonationCountOfRaiser(fundraiser2.address)).to.equal(1);
    });

    it("Should return empty array for donor with no donations", async function () {
      const { fundRaising, nonFundraiser } = await deployFundRaisingFixture();
      const donations = await fundRaising.getDonationsOfDonor(nonFundraiser.address);
      expect(donations.length).to.equal(0);
    });

    it("Should return admin address", async function () {
      const { fundRaising, admin } = await deployFundRaisingFixture();
      expect(await fundRaising.getAdmin()).to.equal(admin.address);
    });
  });

  describe("Fallback Functions", function () {
    it("Should reject direct ETH transfers via receive", async function () {
      const { fundRaising, donor1 } = await deployFundRaisingFixture();
      await expect(
        donor1.sendTransaction({
          to: await fundRaising.getAddress(),
          value: ethers.parseEther("1.0")
        })
      ).to.be.revertedWith("Please use the donate function");
    });

    it("Should reject calls with data via fallback", async function () {
      const { fundRaising, donor1 } = await deployFundRaisingFixture();
      await expect(
        donor1.sendTransaction({
          to: await fundRaising.getAddress(),
          value: ethers.parseEther("1.0"),
          data: "0x1234"
        })
      ).to.be.revertedWith("Please use the donate function");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty signature string", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      await expect(
        fundRaising.connect(donor1).donate(fundraiser1.address, "", { value: MINIMUM_DONATION })
      ).to.not.be.revert(ethers);
    });

    it("Should handle very long signature string", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      const longSignature = "a".repeat(1000);
      await expect(
        fundRaising.connect(donor1).donate(fundraiser1.address, longSignature, { value: MINIMUM_DONATION })
      ).to.not.be.revert(ethers);
    });

    it("Should handle large donation amounts", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      const largeAmount = ethers.parseEther("1000.0");
      await expect(
        fundRaising.connect(donor1).donate(fundraiser1.address, "Large donation", { value: largeAmount })
      ).to.not.be.revert(ethers);
    });

    it("Should maintain separate balances for different fundraisers", async function () {
      const { fundRaising, donor1, fundraiser1, fundraiser2 } = await deployFundRaisingFixture();
      await fundRaising.connect(donor1).donate(fundraiser1.address, "To 1", { value: ethers.parseEther("1.0") });
      await fundRaising.connect(donor1).donate(fundraiser2.address, "To 2", { value: ethers.parseEther("2.0") });

      expect(await fundRaising.balanceOfRaiser(fundraiser1.address)).to.equal(ethers.parseEther("1.0"));
      expect(await fundRaising.balanceOfRaiser(fundraiser2.address)).to.equal(ethers.parseEther("2.0"));

      await fundRaising.connect(fundraiser1).withdraw();

      expect(await fundRaising.balanceOfRaiser(fundraiser1.address)).to.equal(0);
      expect(await fundRaising.balanceOfRaiser(fundraiser2.address)).to.equal(ethers.parseEther("2.0"));
    });
  });

  describe("Gas Optimization Checks", function () {
    it("Should handle deployment with many fundraisers", async function () {
      const accounts = await ethers.getSigners();
      const manyFundraisers = accounts.slice(0, 10).map(a => a.address);

      const contract = await ethers.deployContract("FundRaising", [manyFundraisers]);

      for (const addr of manyFundraisers) {
        expect(await contract.isValidFundRaiser(addr)).to.be.true;
      }
    });

    it("Should handle many donations efficiently", async function () {
      const { fundRaising, donor1, fundraiser1 } = await deployFundRaisingFixture();
      for (let i = 0; i < 10; i++) {
        await fundRaising.connect(donor1).donate(
          fundraiser1.address,
          `Donation ${i}`,
          { value: MINIMUM_DONATION }
        );
      }

      expect(await fundRaising.getDonationCountOfDonor(donor1.address)).to.equal(10);
      expect(await fundRaising.getDonationCountOfRaiser(fundraiser1.address)).to.equal(10);
    });
  });
});
