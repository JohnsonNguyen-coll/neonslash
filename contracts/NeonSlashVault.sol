// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NeonSlashVault (Prediction Market Edition)
 * @dev Stake USDC to earn Points, use Points to predict outcomes.
 */
contract NeonSlashVault is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    
    uint256 public constant POINTS_PER_USDC = 5; // 1 USDC = 5 Points initially
    uint256 public constant SECONDS_PER_DAY = 86400; // 1 point per day per USDC
    uint256 public constant LOCK_PERIOD = 30 * SECONDS_PER_DAY; // 30 days lock
    
    struct Market {
        string description;
        string category;
        uint256 totalYes;
        uint256 totalNo;
        bool resolved;
        bool result; // true = Yes, false = No
        uint256 deadline;
        bool exists;
    }
    
    struct UserBet {
        uint256 amount;
        bool prediction; // true = Yes, false = No
        bool claimed;
    }
    
    mapping(address => uint256) public pointBalances;
    mapping(address => uint256) public stakedUSDC;
    mapping(address => uint256) public lastClaimTimestamp;
    mapping(address => uint256) public stakeTimestamp; // Last time user staked
    
    mapping(uint256 => Market) public markets;
    uint256 public marketCount;
    
    // marketId => userAddress => UserBet
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    
    uint256 public rewardPool; // USDC reserved for point rewards
    
    event Staked(address indexed user, uint256 amount, uint256 pointsAdded);
    event PointsClaimed(address indexed user, uint256 points);
    event MarketCreated(uint256 indexed marketId, string description, string category, uint256 deadline);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool prediction, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool result);
    event RewardClaimed(address indexed user, uint256 pointsRedeemed, uint256 usdcReward);
    
    // Fee configurations (in basis points, 100 = 1%)
    uint256 public entryFeeBps = 200; // 2% fee on point bets
    uint256 public claimFeeBps = 200; // 2% fee on claiming winning points
    uint256 public withdrawFeeBps = 100; // 1% fee on USDC withdrawals
    uint256 public redemptionFeeBps = 200; // 2% fee on point-to-USDC redemption
    
    uint256 public accumFeesUSDC; // Collected USDC revenue
    uint256 public accumFeesPoints; // Collected Point revenue (or burned)
    
    event FeesUpdated(uint256 entry, uint256 claim, uint256 withdraw, uint256 redemption);
    event TreasuryWithdrawn(address to, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }
    
    function setFees(uint256 _entry, uint256 _claim, uint256 _withdraw, uint256 _redemption) external onlyOwner {
        entryFeeBps = _entry;
        claimFeeBps = _claim;
        withdrawFeeBps = _withdraw;
        redemptionFeeBps = _redemption;
        emit FeesUpdated(_entry, _claim, _withdraw, _redemption);
    }

    /**
     * @dev Stake USDC to receive points immediately and earn yield.
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        usdc.transferFrom(msg.sender, address(this), amount);
        
        // Update yield before changing staked amount
        _updateYield(msg.sender);
        
        stakedUSDC[msg.sender] += amount;
        stakeTimestamp[msg.sender] = block.timestamp;
        
        uint256 pointsToAdd = (amount * POINTS_PER_USDC) / 1e6; 
        pointBalances[msg.sender] += pointsToAdd;
        
        emit Staked(msg.sender, amount, pointsToAdd);
    }
    
    function withdraw(uint256 amount) external nonReentrant {
        require(stakedUSDC[msg.sender] >= amount, "Insufficient staked balance");
        require(block.timestamp >= stakeTimestamp[msg.sender] + LOCK_PERIOD, "Staked USDC is locked for 30 days");
        
        _updateYield(msg.sender);
        
        stakedUSDC[msg.sender] -= amount;
        
        // Apply withdrawal fee
        uint256 fee = (amount * withdrawFeeBps) / 10000;
        uint256 netAmount = amount - fee;
        accumFeesUSDC += fee;
        
        usdc.transfer(msg.sender, netAmount);
    }
    
    function _updateYield(address user) internal {
        if (stakedUSDC[user] > 0) {
            uint256 timePassed = block.timestamp - lastClaimTimestamp[user];
            uint256 pendingPoints = (stakedUSDC[user] * timePassed) / (SECONDS_PER_DAY * 1e6);
            pointBalances[user] += pendingPoints;
        }
        lastClaimTimestamp[user] = block.timestamp;
    }
    
    function claimYield() external nonReentrant {
        _updateYield(msg.sender);
    }

    /**
     * @dev Prediction Market Functions
     */
    function createMarket(string memory description, string memory category, uint256 duration) external onlyOwner {
        uint256 marketId = ++marketCount;
        markets[marketId] = Market({
            description: description,
            category: category,
            totalYes: 0,
            totalNo: 0,
            resolved: false,
            result: false,
            deadline: block.timestamp + duration,
            exists: true
        });
        
        emit MarketCreated(marketId, description, category, markets[marketId].deadline);
    }
    
    function placeBet(uint256 marketId, bool prediction, uint256 amount) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.exists, "Market does not exist");
        require(!market.resolved, "Market already resolved");
        require(block.timestamp < market.deadline, "Betting period over");
        require(pointBalances[msg.sender] >= amount, "Insufficient points");
        require(userBets[marketId][msg.sender].amount == 0, "Already bet on this market");

        // Apply entry fee (taken from the bet amount)
        uint256 fee = (amount * entryFeeBps) / 10000;
        uint256 netBet = amount - fee;
        accumFeesPoints += fee;

        pointBalances[msg.sender] -= amount;
        
        if (prediction) {
            market.totalYes += netBet;
        } else {
            market.totalNo += netBet;
        }
        
        userBets[marketId][msg.sender] = UserBet({
            amount: netBet,
            prediction: prediction,
            claimed: false
        });
        
        emit BetPlaced(marketId, msg.sender, prediction, netBet);
    }
    
    function resolveMarket(uint256 marketId, bool result) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.exists, "Market does not exist");
        require(!market.resolved, "Market already resolved");
        
        market.resolved = true;
        market.result = result;
        
        emit MarketResolved(marketId, result);
    }
    
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");
        
        UserBet storage bet = userBets[marketId][msg.sender];
        require(bet.amount > 0, "No bet found");
        require(!bet.claimed, "Already claimed");
        require(bet.prediction == market.result, "Prediction incorrect");
        
        bet.claimed = true;
        
        uint256 totalPool = market.totalYes + market.totalNo;
        uint256 winningSidePool = market.result ? market.totalYes : market.totalNo;
        
        uint256 winningAmount = (bet.amount * totalPool) / winningSidePool;
        
        // Apply claim fee on winnings
        uint256 fee = (winningAmount * claimFeeBps) / 10000;
        uint256 netWinning = winningAmount - fee;
        accumFeesPoints += fee;

        pointBalances[msg.sender] += netWinning;
    }
    
    /**
     * @dev Reward redemption
     */
    function addToRewardPool(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
    }
    
    function redeemPoints(uint256 points) external nonReentrant {
        require(pointBalances[msg.sender] >= points, "Insufficient points");
        
        // Exchange rate: 1000 points = 1 USDC
        uint256 rewardAmount = (points * 1e6) / 1000; 
        
        // Apply redemption fee on USDC reward
        uint256 fee = (rewardAmount * redemptionFeeBps) / 10000;
        uint256 netReward = rewardAmount - fee;
        
        require(rewardPool >= netReward, "Reward pool depleted");
        
        pointBalances[msg.sender] -= points;
        rewardPool -= netReward;
        accumFeesUSDC += fee;
        
        usdc.transfer(msg.sender, netReward);
        
        emit RewardClaimed(msg.sender, points, netReward);
    }

    /**
     * @dev Owner functions to extract revenue
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = accumFeesUSDC;
        accumFeesUSDC = 0;
        usdc.transfer(owner(), amount);
        emit TreasuryWithdrawn(owner(), amount);
    }

    // View functions for frontend
    function getPoints(address user) external view returns (uint256) {
        uint256 timePassed = block.timestamp - lastClaimTimestamp[user];
        uint256 pendingPoints = (stakedUSDC[user] * timePassed) / (SECONDS_PER_DAY * 1e6);
        return pointBalances[user] + pendingPoints;
    }

    function getAllMarkets() external view returns (Market[] memory) {
        Market[] memory allMarkets = new Market[](marketCount);
        for (uint256 i = 1; i <= marketCount; i++) {
            allMarkets[i - 1] = markets[i];
        }
        return allMarkets;
    }
}

