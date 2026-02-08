export const ARC_ID = 5042002
export const VAULT_ADDRESS = '0x4cef015F86a4df13676b12616B00126Bd7b6Fab8'
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

export const USDC_ABI = [
      { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
      { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
] as const

export const VAULT_ABI = [
      { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getPoints", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
      { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "stakedUSDC", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
      { "inputs": [{ "internalType": "uint256", "name": "marketId", "type": "uint256" }, { "internalType": "bool", "name": "prediction", "type": "bool" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "placeBet", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [{ "internalType": "uint256", "name": "marketId", "type": "uint256" }], "name": "claimWinnings", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [], "name": "marketCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
      { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "markets", "outputs": [{ "internalType": "string", "name": "description", "type": "string" }, { "internalType": "string", "name": "category", "type": "string" }, { "internalType": "uint256", "name": "totalYes", "type": "uint256" }, { "internalType": "uint256", "name": "totalNo", "type": "uint256" }, { "internalType": "bool", "name": "resolved", "type": "bool" }, { "internalType": "bool", "name": "result", "type": "bool" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "bool", "name": "exists", "type": "bool" }], "stateMutability": "view", "type": "function" },
      { "inputs": [{ "internalType": "uint256", "name": "marketId", "type": "uint256" }, { "internalType": "address", "name": "", "type": "address" }], "name": "userBets", "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "bool", "name": "prediction", "type": "bool" }, { "internalType": "bool", "name": "claimed", "type": "bool" }], "stateMutability": "view", "type": "function" },
      { "inputs": [{ "internalType": "string", "name": "description", "type": "string" }, { "internalType": "string", "name": "category", "type": "string" }, { "internalType": "uint256", "name": "duration", "type": "uint256" }], "name": "createMarket", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [], "name": "getAllMarkets", "outputs": [{ "components": [{ "internalType": "string", "name": "description", "type": "string" }, { "internalType": "string", "name": "category", "type": "string" }, { "internalType": "uint256", "name": "totalYes", "type": "uint256" }, { "internalType": "uint256", "name": "totalNo", "type": "uint256" }, { "internalType": "bool", "name": "resolved", "type": "bool" }, { "internalType": "bool", "name": "result", "type": "bool" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "bool", "name": "exists", "type": "bool" }], "internalType": "struct NeonSlashVault.Market[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" },
      { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
      { "inputs": [], "name": "claimYield", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "stakeTimestamp", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
      { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [], "name": "redeemNFT", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
      { "inputs": [], "name": "nftContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
] as const

export const LOCK_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds
