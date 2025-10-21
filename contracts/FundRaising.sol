// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FundRaising {
  struct Donation {
    uint256 amount;
    address raiser;
    address donor;
    uint256 timestamp;
  }

  // Events
  event Donate(address indexed donor, address indexed raiser, uint256 amount);
  event FundRaiserActivated(address indexed raiser);
  event FundRaiserDeactivated(address indexed raiser);
  event FundsWithdrawn(address indexed raiser, uint256 amount);

  // State variables
  address private admin;
  uint256 public constant MINIMUM_DONATION = 0.0001 ether;

  mapping(address => uint256) public totalRaisedOfRaiser;
  mapping(address => uint256) public balanceOfRaiser;
  mapping(address => bool) public isValidFundRaiser;
  mapping(address => Donation[]) private donationsOfDonor;
  mapping(address => Donation[]) private donationsOfRaiser;

  // Modifiers
  modifier onlyAdmin() {
    require(msg.sender == admin, "Only admin can call this function");
    _;
  }

  modifier isSenderValid() {
    require(msg.sender != address(0), "Invalid sender address");
    _;
  }

  modifier donatedEnough() {
    require(msg.value >= MINIMUM_DONATION, "Must send at least 0.0001 ETH to prevent spamming");
    _;
  }

  modifier isValidReceiver(address receiver) {
    require(receiver != address(0), "Invalid receiver address");
    require(isValidFundRaiser[receiver], "Receiver is not a valid fundraiser");
    _;
  }

  constructor(address[] memory fundRaisers) {
    require(msg.sender != address(0), "Invalid admin address");
    admin = msg.sender;

    for (uint i = 0; i < fundRaisers.length; i++) {
      require(fundRaisers[i] != address(0), "Invalid fundraiser address");
      isValidFundRaiser[fundRaisers[i]] = true;
      emit FundRaiserActivated(fundRaisers[i]);
    }
  }

  // Donation function
  function donate(address receiver)
    public
    payable
    isSenderValid()
    donatedEnough()
    isValidReceiver(receiver)
  {
    Donation memory newDonation = Donation({
      amount: msg.value,
      raiser: receiver,
      donor: msg.sender,
      timestamp: block.timestamp
    });

    donationsOfDonor[msg.sender].push(newDonation);
    donationsOfRaiser[receiver].push(newDonation);

    totalRaisedOfRaiser[receiver] += msg.value;
    balanceOfRaiser[receiver] += msg.value;

    emit Donate(msg.sender, receiver, msg.value);
  }

  // Withdraw function for fundraisers
  function withdraw() public isSenderValid() {
    require(isValidFundRaiser[msg.sender], "Only valid fundraisers can withdraw");
    uint256 amount = balanceOfRaiser[msg.sender];
    require(amount > 0, "No funds to withdraw");

    balanceOfRaiser[msg.sender] = 0;

    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");

    emit FundsWithdrawn(msg.sender, amount);
  }

  // Admin functions
  function activateFundRaiser(address raiser) public onlyAdmin {
    require(raiser != address(0), "Invalid fundraiser address");
    require(!isValidFundRaiser[raiser], "Fundraiser already active");

    isValidFundRaiser[raiser] = true;
    emit FundRaiserActivated(raiser);
  }

  function deactivateFundRaiser(address raiser) public onlyAdmin {
    require(raiser != address(0), "Invalid fundraiser address");
    require(isValidFundRaiser[raiser], "Fundraiser already inactive");

    isValidFundRaiser[raiser] = false;
    emit FundRaiserDeactivated(raiser);
  }

  // View functions
  function getDonationsOfDonor(address donor) public view returns (Donation[] memory) {
    return donationsOfDonor[donor];
  }

  function getDonationsOfRaiser(address raiser) public view returns (Donation[] memory) {
    return donationsOfRaiser[raiser];
  }

  function getDonationCountOfDonor(address donor) public view returns (uint256) {
    return donationsOfDonor[donor].length;
  }

  function getDonationCountOfRaiser(address raiser) public view returns (uint256) {
    return donationsOfRaiser[raiser].length;
  }

  function getAdmin() public view returns (address) {
    return admin;
  }

  // Fallback function to reject direct ETH transfers
  receive() external payable {
    revert("Please use the donate function");
  }

  fallback() external payable {
    revert("Please use the donate function");
  }
}
