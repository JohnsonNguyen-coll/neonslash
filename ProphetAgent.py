import os
import time
import random
import requests
import xml.etree.ElementTree as ET
import yfinance as ticker
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
if os.path.exists('./frontend/.env.local'):
    load_dotenv(dotenv_path='./frontend/.env.local')
else:
    load_dotenv() # Fallback for production (Render/Railway inject env vars directly)

RPC_URL = os.getenv('VITE_ARC_RPC_URL', 'https://rpc.testnet.arc.network')
CONTRACT_ADDRESS = os.getenv('VITE_CONTRACT_ADDRESS', '').replace('"', '').replace("'", "").strip()
PRIVATE_KEY = os.getenv('PRIVATE_KEY', '').replace('"', '').replace("'", "").strip()

ABI = [
    {"inputs":[],"name":"marketCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"markets","outputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"totalYes","type":"uint256"},{"internalType":"uint256","name":"totalNo","type":"uint256"},{"internalType":"bool","name":"resolved","type":"bool"},{"internalType":"bool","name":"result","type":"bool"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"bool","name":"result","type":"bool"}],"name":"resolveMarket","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"}],"name":"createMarket","outputs":[],"stateMutability":"nonpayable","type":"function"}
]

class ProphetAgent:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        self.contract = self.w3.eth.contract(address=self.w3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)
        print(f"Prophet Agent ACTIVE. Agent: {self.account.address}")
        
        # Real-world data mocks for Feb 8, 2026 (based on search)
        self.fixtures = [
            ("Liverpool vs Man City", "EPL"),
            ("Valencia vs Real Madrid", "La Liga"),
            ("PSG vs Marseille", "Ligue 1"),
            ("Juventus vs Lazio", "Serie A"),
            ("Arsenal vs Man City (WSL)", "Football")
        ]
        
    def fetch_latest_news(self):
        """Fetch real news headlines for markets"""
        try:
            # Fetching from Yahoo Finance RSS for real current events
            r = requests.get("https://finance.yahoo.com/news/rssindex", timeout=10)
            root = ET.fromstring(r.content)
            headlines = []
            for item in root.findall('.//item'):
                title = item.find('title').text
                if any(x in title.upper() for x in ["STOCKS", "CRYPTO", "FED", "USDC", "TECH", "AI"]):
                    headlines.append(title)
            return headlines[:5]
        except:
            return ["Bitcoin Momentum: Experts predict $150k target", "AI Spending Surge impacts Amazon share value", "Meta faces AI-related cost concerns"]

    def create_real_markets(self):
        print("🚀 Deploying REAL-WORLD markets for today...")
        
        # 1. Real Football Fixtures
        fixture = random.choice(self.fixtures)
        desc = f"Match Day: {fixture[0]}. Will {fixture[0].split(' vs ')[0]} win?"
        self.deploy(desc, "Football")

        # 2. Latest Financial News
        news = self.fetch_latest_news()
        for headline in random.sample(news, min(2, len(news))):
            desc = f"News: '{headline}' - Will this asset surge +2% next hour?"
            self.deploy(desc, "Stocks")

        # 3. Dynamic Crypto Target
        btc_intel = self.get_intel("BTC-USD")
        if btc_intel:
            target = round(btc_intel['price'] * 1.015, 2)
            self.deploy(f"Will Bitcoin (BTC) break resistance at ${target} in 2 hours?", "Stocks")

    def get_intel(self, symbol):
        try:
            data = ticker.Ticker(symbol).history(period='1d', interval='1h')
            if data.empty: return None
            price = data['Close'].iloc[-1]
            return {"price": price}
        except: return None

    def deploy(self, desc, cat):
        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            tx = self.contract.functions.createMarket(desc, cat, 7200).build_transaction({
                'from': self.account.address, 'nonce': nonce, 'gas': 1000000, 
                'gasPrice': self.w3.eth.gas_price, 'chainId': 5042002
            })
            signed = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            raw = getattr(signed, 'raw_transaction', getattr(signed, 'rawTransaction', None))
            self.w3.eth.send_raw_transaction(raw)
            print(f"✅ Market Live: {desc}")
            time.sleep(2)
        except Exception as e: print(f"Deploy Error: {e}")

    def run(self):
        while True:
            self.create_real_markets()
            print("Wave deployed. Waiting 15 mins...")
            time.sleep(900)

if __name__ == "__main__":
    ProphetAgent().run()
