
from web3 import Web3
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv(dotenv_path='./frontend/.env.local')

RPC_URL = 'https://rpc.testnet.arc.network'
CONTRACT_ADDRESS = '0x212628aA49B0F770eBc4A7abCd5F1074fb2c303E'

ABI = [
    {"inputs":[],"name":"marketCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"markets","outputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"totalYes","type":"uint256"},{"internalType":"uint256","name":"totalNo","type":"uint256"},{"internalType":"bool","name":"resolved","type":"bool"},{"internalType":"bool","name":"result","type":"bool"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"}
]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
contract = w3.eth.contract(address=w3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)

def check():
    count = contract.functions.marketCount().call()
    print(f"Total Markets: {count}")
    
    now = datetime.now().timestamp()
    active_count = 0
    pending_resolution = 0
    categories = {}
    
    for i in range(1, count + 1):
        m = contract.functions.markets(i).call()
        desc, cat, tYes, tNo, resolved, result, deadline, exists = m
        is_expired = now > deadline
        
        categories[cat] = categories.get(cat, 0) + 1
        
        if not resolved:
            if not is_expired:
                active_count += 1
                if active_count <= 5: # Show first 5 active
                    print(f"Active #{i}: {desc} ({cat})")
            else:
                pending_resolution += 1
                if pending_resolution <= 5:
                    print(f"Expired/Pending #{i}: {desc} ({cat})")
            
    print(f"\nStats:")
    print(f"- Active (Betting open): {active_count}")
    print(f"- Pending Resolution (Event ended): {pending_resolution}")
    print(f"- Categories: {categories}")

if __name__ == "__main__":
    check()
