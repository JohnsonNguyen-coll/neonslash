
from web3 import Web3
import os
import time
from dotenv import load_dotenv

load_dotenv(dotenv_path='./frontend/.env.local')

RPC_URL = 'https://rpc.testnet.arc.network'
CONTRACT_ADDRESS = os.getenv('VITE_CONTRACT_ADDRESS', '').replace('"', '').replace("'", "").strip()
PRIVATE_KEY = os.getenv('PRIVATE_KEY', '').replace('"', '').replace("'", "").strip()

ABI = [
    {"inputs":[],"name":"marketCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"markets","outputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"totalYes","type":"uint256"},{"internalType":"uint256","name":"totalNo","type":"uint256"},{"internalType":"bool","name":"resolved","type":"bool"},{"internalType":"bool","name":"result","type":"bool"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"bool","name":"result","type":"bool"}],"name":"resolveMarket","outputs":[],"stateMutability":"nonpayable","type":"function"}
]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
contract = w3.eth.contract(address=w3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)

def cleanup():
    count = contract.functions.marketCount().call()
    print(f"Total Markets to check: {count}")
    
    for i in range(1, count + 1):
        m = contract.functions.markets(i).call()
        resolved = m[4]
        
        if not resolved:
            print(f"🧹 Force resolving Market #{i}...")
            try:
                nonce = w3.eth.get_transaction_count(account.address)
                tx = contract.functions.resolveMarket(i, False).build_transaction({
                    'from': account.address,
                    'nonce': nonce,
                    'gas': 500000,
                    'gasPrice': w3.eth.gas_price,
                    'chainId': 5042002
                })
                signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
                tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                print(f"✅ Resolved #{i}: {tx_hash.hex()}")
                time.sleep(0.5) # Dãn cách để tránh kẹt nonce
            except Exception as e:
                print(f"❌ Error #{i}: {e}")
                time.sleep(1)

if __name__ == "__main__":
    cleanup()
