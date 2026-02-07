// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NeonSlashVault
 * @dev AI Agent Reputation Bond System with yield compounding and slash mechanisms.
 * Stake USDC as a "reputation bond" to accept tasks on Arc Network.
 */
contract NeonSlashVault is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    
    uint256 public constant YIELD_RATE = 500; // 5% APY (in basis points)
    uint256 public constant DECAY_RATE = 100; // 1% decay per month of inactivity
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant SECONDS_PER_MONTH = 2592000;
    
    struct Agent {
        uint256 principalBond;
        uint256 lastUpdateTimestamp;
        uint256 totalSlashed;
        uint256 tasksCompleted;
        bool isActive;
    }
    
    struct Task {
        address agent;
        uint256 bondLocked;
        uint256 reward;
        bool isCompleted;
        bool isSlashed;
        uint256 deadline;
    }
    
    mapping(address => Agent) public agents;
    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;
    uint256 public insurancePool;
    
    event BondStaked(address indexed agent, uint256 amount);
    event TaskAccepted(uint256 indexed taskId, address indexed agent, uint256 bondLocked);
    event TaskCompleted(uint256 indexed taskId, uint256 reward, uint256 bonus);
    event TaskSlashed(uint256 indexed taskId, uint256 slashedAmount);
    
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }
    
    /**
     * @dev Calculates the bond with accrued yield and applied decay.
     */
    function getEffectiveBond(address agentAddr) public view returns (uint256) {
        Agent memory agent = agents[agentAddr];
        if (agent.principalBond == 0) return 0;
        
        uint256 timePassed = block.timestamp - agent.lastUpdateTimestamp;
        
        // Simulating Yield: principal * (1 + rate * time / year)
        uint256 yield = (agent.principalBond * YIELD_RATE * timePassed) / (10000 * SECONDS_PER_YEAR);
        
        // Simulating Decay: If timePassed > 1 month, apply decay
        uint256 decay = 0;
        if (timePassed > SECONDS_PER_MONTH) {
            decay = (agent.principalBond * DECAY_RATE * (timePassed / SECONDS_PER_MONTH)) / 10000;
        }
        
        uint256 effective = agent.principalBond + yield;
        return effective > decay ? effective - decay : 0;
    }
    
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Update current bond with yield/decay before adding more
        if (agents[msg.sender].principalBond > 0) {
            agents[msg.sender].principalBond = getEffectiveBond(msg.sender);
        }
        
        usdc.transferFrom(msg.sender, address(this), amount);
        
        agents[msg.sender].principalBond += amount;
        agents[msg.sender].lastUpdateTimestamp = block.timestamp;
        agents[msg.sender].isActive = true;
        
        emit BondStaked(msg.sender, amount);
    }
    
    function acceptTask(uint256 bondRequired, uint256 reward, uint256 duration) external nonReentrant returns (uint256) {
        uint256 currentBond = getEffectiveBond(msg.sender);
        require(currentBond >= bondRequired, "Insufficient bond");
        
        // Update bond state
        agents[msg.sender].principalBond = currentBond - bondRequired;
        agents[msg.sender].lastUpdateTimestamp = block.timestamp;
        
        uint256 taskId = ++taskCount;
        tasks[taskId] = Task({
            agent: msg.sender,
            bondLocked: bondRequired,
            reward: reward,
            isCompleted: false,
            isSlashed: false,
            deadline: block.timestamp + duration
        });
        
        emit TaskAccepted(taskId, msg.sender, bondRequired);
        return taskId;
    }
    
    function finishTask(uint256 taskId, bool success, uint256 bonus) external onlyOwner nonReentrant {
        Task storage task = tasks[taskId];
        require(!task.isCompleted && !task.isSlashed, "Task already settled");
        
        if (success) {
            task.isCompleted = true;
            uint256 totalReturn = task.bondLocked + task.reward + bonus;
            agents[task.agent].principalBond += totalReturn;
            agents[task.agent].tasksCompleted++;
            emit TaskCompleted(taskId, task.reward, bonus);
        } else {
            task.isSlashed = true;
            uint256 slashAmount = task.bondLocked / 2; // Slash 50%
            insurancePool += slashAmount;
            agents[task.agent].principalBond += (task.bondLocked - slashAmount);
            agents[task.agent].totalSlashed += slashAmount;
            emit TaskSlashed(taskId, slashAmount);
        }
        
        agents[task.agent].lastUpdateTimestamp = block.timestamp;
    }
    
    function withdraw(uint256 amount) external nonReentrant {
        uint256 currentBond = getEffectiveBond(msg.sender);
        require(currentBond >= amount, "Insufficient balance");
        
        agents[msg.sender].principalBond = currentBond - amount;
        agents[msg.sender].lastUpdateTimestamp = block.timestamp;
        
        usdc.transfer(msg.sender, amount);
    }

    function getInsurancePool() external view returns (uint256) {
        return insurancePool;
    }
}
