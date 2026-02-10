
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
    try:
        count = contract.functions.marketCount().call()
        print(f"Total Markets: {count}")
    except Exception as e:
        print(f"Error fetching market count: {e}")
        return
    
    now = datetime.now().timestamp()
    active_count = 0
    pending_resolution = 0
    categories = {}
    
    # Scan from newest to oldest for better relevance
    start_id = max(1, count - 100) # Only check last 100 for speed
    for i in range(count, start_id - 1, -1):
        try:
            m = contract.functions.markets(i).call()
            # The structure is: desc, cat, tYes, tNo, resolved, result, deadline, exists
            desc, cat, tYes, tNo, resolved, result, deadline, exists = m
            
            if not exists: continue
            
            is_expired = now > deadline
            categories[cat] = categories.get(cat, 0) + 1
            
            if not resolved:
                if not is_expired:
                    active_count += 1
                    if active_count <= 20: 
                        print(f"Active #{i}: {desc} ({cat}) - Deadline: {datetime.fromtimestamp(deadline)}")
                else:
                    pending_resolution += 1
                    print(f"Expired/Pending #{i}: {desc} ({cat}) - Ended at: {datetime.fromtimestamp(deadline)}")
            else:
                pass # Already resolved
        except Exception as e:
            print(f"Error reading market #{i}: {e}")
            
    print(f"\nStats:")
    print(f"- Total scanned (last 100): {count - start_id + 1}")
    print(f"- Unresolved & Active: {active_count}")
    print(f"- Unresolved & Expired (Awaiting Agent): {pending_resolution}")
    print(f"- Categories: {categories}")

if __name__ == "__main__":
    check()
