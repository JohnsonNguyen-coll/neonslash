import os
import time
import requests
import xml.etree.ElementTree as ET
from web3 import Web3
from dotenv import load_dotenv
from datetime import datetime, timedelta
import pytz

# Load environment variables
if os.path.exists('./frontend/.env.local'):
    load_dotenv(dotenv_path='./frontend/.env.local')
else:
    load_dotenv()

RPC_URL = os.getenv('VITE_ARC_RPC_URL', 'https://rpc.testnet.arc.network')
CONTRACT_ADDRESS = os.getenv('VITE_CONTRACT_ADDRESS', '').replace('"', '').replace("'", "").strip()
PRIVATE_KEY = os.getenv('PRIVATE_KEY', '').replace('"', '').replace("'", "").strip()

# Headers to prevent bot detection
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json'
}

# Optional: Add API keys for better data sources
FOOTBALL_API_KEY = os.getenv('FOOTBALL_API_KEY', '3')  # TheSportsDB test key
CMC_API_KEY = os.getenv('CMC_API_KEY', '').replace('"', '').replace("'", "").strip()

ABI = [
    {"inputs":[],"name":"marketCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"markets","outputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"totalYes","type":"uint256"},{"internalType":"uint256","name":"totalNo","type":"uint256"},{"internalType":"bool","name":"resolved","type":"bool"},{"internalType":"bool","name":"result","type":"bool"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"bool","name":"result","type":"bool"}],"name":"resolveMarket","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"}],"name":"createMarket","outputs":[],"stateMutability":"nonpayable","type":"function"}
]


class RealOracleAgent:
    """
    Production Oracle Agent - Fully Automated
    - Tự động phát hiện thông tin mới (football, crypto)
    - Tự động tạo markets
    - Tự động resolve bằng API thật
    """
    
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        self.contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(CONTRACT_ADDRESS), 
            abi=ABI
        )
        
        # Session for requests with headers
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        
        print(f"🔮 Real Oracle Agent ACTIVE")
        print(f"📍 Agent Address: {self.account.address}")
        print(f"📍 Contract: {CONTRACT_ADDRESS}")
        
    # ==================== FOOTBALL ORACLE ====================
    
    def fetch_live_football_fixtures(self, max_fixtures=5):
        """
        Fetch real upcoming football matches from TheSportsDB API
        """
        try:
            fixtures = []
            seen_event_ids = set()
            
            # Major leagues to monitor (TheSportsDB IDs)
            leagues = {
                'English Premier League': '4328',
                'Spanish La Liga': '4335',
                'Italian Serie A': '4332',
                'German Bundesliga': '4331',
                'French Ligue 1': '4334'
            }
            
            print(f"📡 Fetching football fixtures from TheSportsDB...")
            
            for league_name, league_id in leagues.items():
                try:
                    url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/eventsnextleague.php?id={league_id}"
                    r = self.session.get(url, timeout=10)
                    
                    if r.status_code != 200:
                        print(f"   ⚠️ TheSportsDB Blocked {league_name} (Status {r.status_code})")
                        continue
                        
                    data = r.json()
                    
                    if data and data.get('events'):
                        print(f"   ✅ Found {len(data['events'])} events for {league_name}")
                        for event in data['events']:
                            event_id = event['idEvent']
                            
                            if event_id in seen_event_ids:
                                continue
                            
                            try:
                                # Use ACTUAL league from API for correct labeling
                                actual_league = event.get('strLeague', league_name)
                                
                                fixtures.append({
                                    'home': event['strHomeTeam'],
                                    'away': event['strAwayTeam'],
                                    'league': actual_league,
                                    'date': event['dateEvent'],
                                    'time': event.get('strTime', '00:00:00'),
                                    'event_id': event_id
                                })
                                seen_event_ids.add(event_id)
                                
                                if len(fixtures) >= max_fixtures:
                                    break
                            except:
                                continue
                    
                    if len(fixtures) >= max_fixtures:
                        break
                    
                    time.sleep(1) # Rate limit
                except Exception as e:
                    print(f"   ❌ Error fetching {league_name}: {e}")
            
            return fixtures
            
        except Exception as e:
            print(f"❌ Football API Error: {e}")
            return []

    def resolve_football_match(self, home_team, away_team, target_team, event_id=None):
        """
        Resolve football match using TheSportsDB data with Retry logic
        """
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                print(f"   🔍 Checking match: {home_team} vs {away_team} (Target: {target_team})")
                
                def check_win(h_score, a_score, h_name, a_name):
                    # Normalize names for better matching
                    h_name = h_name.lower()
                    a_name = a_name.lower()
                    target = target_team.lower()
                    
                    if target in h_name:
                        return h_score > a_score
                    elif target in a_name:
                        return a_score > h_score
                    return False

                # Method 1: Use Event ID
                if event_id:
                    url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/lookupevent.php?id={event_id}"
                    r = self.session.get(url, timeout=10)
                    if r.status_code == 200:
                        data = r.json()
                        if data and data.get('events'):
                            event = data['events'][0]
                            if event.get('strStatus') == 'Match Finished':
                                h_s = int(event.get('intHomeScore', 0))
                                a_s = int(event.get('intAwayScore', 0))
                                print(f"   ⚽ Result: {event['strHomeTeam']} {h_s}-{a_s} {event['strAwayTeam']}")
                                return check_win(h_s, a_s, event['strHomeTeam'], event['strAwayTeam'])

                # Method 2: Search by Names
                home_norm = home_team.replace(' ', '_')
                away_norm = away_team.replace(' ', '_')
                url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/searchevents.php?e={home_norm}_vs_{away_norm}"
                r = self.session.get(url, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    if data and data.get('event'):
                        for event in data['event']:
                            if event.get('strStatus') == 'Match Finished':
                                h_s = int(event.get('intHomeScore', 0))
                                a_s = int(event.get('intAwayScore', 0))
                                print(f"   ⚽ Result: {event['strHomeTeam']} {h_s}-{a_s} {event['strAwayTeam']}")
                                return check_win(h_s, a_s, event['strHomeTeam'], event['strAwayTeam'])

                return None
            except Exception as e:
                if attempt < max_retries:
                    print(f"   ⚠️ Football Resolution Attempt {attempt+1} failed ({e}). Retrying...")
                    time.sleep(2)
                else:
                    print(f"   ❌ Football Resolution Error: {e}")
                    return None
    
    # ==================== CRYPTO ORACLE ====================
    
    def get_crypto_price(self, symbol):
        """Get real-time crypto price from CoinMarketCap exclusively"""
        if CMC_API_KEY:
            try:
                url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
                params = {'symbol': symbol, 'convert': 'USD'}
                headers = {
                    'Accepts': 'application/json',
                    'X-CMC_PRO_API_KEY': CMC_API_KEY,
                }
                r = requests.get(url, params=params, headers=headers, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    price = data['data'][symbol]['quote']['USD']['price']
                    return {'symbol': symbol, 'current_price': float(price), 'source': 'CoinMarketCap'}
                else:
                    print(f"   ⚠️ CoinMarketCap API Error (Status {r.status_code})")
            except Exception as e:
                print(f"   ⚠️ CoinMarketCap Exception: {e}")
        else:
            print("   ❌ CMC_API_KEY is missing!")
            
        return None
    
    def resolve_crypto_target(self, symbol, target_price):
        """
        Final check for crypto target using current CMC price (no history)
        Returns: True if current price >= target, False otherwise
        """
        try:
            print(f"   🔍 Resolving {symbol} via CMC (Current Price Check)...")
            data = self.get_crypto_price(symbol)
            if data:
                current_price = data['current_price']
                result = current_price >= target_price
                print(f"   📊 {symbol} Target: ${target_price:.2f} | Current Price: ${current_price:.2f} | Result: {result}")
                return result
            return None
        except Exception as e:
            print(f"   ❌ Crypto Resolution Error (CMC): {e}")
            return None
    
    # ==================== MARKET MANAGEMENT ====================
    
    def get_active_markets(self):
        """Get all unresolved markets"""
        try:
            count = self.contract.functions.marketCount().call()
            active = []
            
            # Check last 100 markets (or all if less)
            start = max(1, count - 99)
            
            for i in range(start, count + 1):
                try:
                    m = self.contract.functions.markets(i).call()
                    if not m[4]:  # Not resolved
                        active.append({
                            'id': i,
                            'description': m[0],
                            'category': m[1],
                            'deadline': m[6]
                        })
                except:
                    continue
            
            return active
            
        except Exception as e:
            print(f"Error fetching active markets: {e}")
            return []
    
    def create_football_markets(self):
        """Create markets for real upcoming matches"""
        fixtures = self.fetch_live_football_fixtures(max_fixtures=5)
        active = self.get_active_markets()
        active_descs = {m['description'] for m in active}
        
        created = 0
        for fixture in fixtures:
            desc = f"Football: {fixture['home']} vs {fixture['away']} ({fixture['league']}) - Will {fixture['home']} win?"
            
            # Skip if already exists
            if desc in active_descs:
                print(f"⏭️  Skipping duplicate: {fixture['home']} vs {fixture['away']}")
                continue
            
            try:
                # Use UTC for duration calculation to match API data
                now_utc = datetime.now(pytz.UTC)
                match_datetime = pytz.UTC.localize(datetime.strptime(
                    f"{fixture['date']} {fixture['time']}", 
                    '%Y-%m-%d %H:%M:%S'
                ))
                duration = int((match_datetime + timedelta(hours=3) - now_utc).total_seconds())
                
                if duration > 0:
                    self.deploy_market(desc, "Football", duration)
                    print(f"⚽ Created: {fixture['home']} vs {fixture['away']}")
                    created += 1
                    time.sleep(2)  # Prevent nonce collision
                else:
                    print(f"⏭️  Match already started: {fixture['home']} vs {fixture['away']}")
                    
            except Exception as e:
                print(f"❌ Error creating football market: {e}")
        
        return created
    
    def create_crypto_markets(self):
        """Create markets for crypto price targets"""
        active = self.get_active_markets()
        
        # FIX: Check by category AND symbol to prevent duplicates
        active_crypto = [m for m in active if m['category'] == 'Crypto']
        
        assets = [
            ('BTC', 'Bitcoin', 0.015),    # +1.5% target
            ('ETH', 'Ethereum', 0.020),   # +2.0% target
            ('SOL', 'Solana', 0.025)      # +2.5% target
        ]
        
        created = 0
        for symbol, name, volatility in assets:
            try:
                # Check if this symbol already has an active market
                has_active = any(f"({symbol})" in m['description'] for m in active_crypto)
                
                if has_active:
                    print(f"⏭️  Skipping {symbol}: Active market exists")
                    continue
                
                # Get current price from Binance
                data = self.get_crypto_price(symbol)
                if not data:
                    print(f"⚠️  Could not fetch price for {symbol}")
                    continue
                
                current_price = data['current_price']
                target = round(current_price * (1 + volatility), 2)
                
                desc = f"Crypto: Will {name} ({symbol}) reach ${target} in next 6 hours? (Current: ${current_price})"
                
                self.deploy_market(desc, "Crypto", 21600)  # 6 hours
                print(f"₿ Created {symbol} market: ${current_price} → ${target}")
                created += 1
                time.sleep(2)
                
            except Exception as e:
                print(f"❌ Error creating {symbol} market: {e}")
        
        return created
    
    def deploy_market(self, description, category, duration):
        """Deploy a single market to blockchain"""
        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address, 'pending')
            
            tx = self.contract.functions.createMarket(
                description, 
                category, 
                duration
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 1000000,
                'gasPrice': int(self.w3.eth.gas_price * 1.2),
                'chainId': self.w3.eth.chain_id
            })
            
            signed = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            raw = getattr(signed, 'raw_transaction', getattr(signed, 'rawTransaction', None))
            tx_hash = self.w3.eth.send_raw_transaction(raw)
            
            print(f"   ✅ TX: {tx_hash.hex()}")
            
        except Exception as e:
            print(f"   ❌ Deploy error: {e}")
    
    # ==================== MARKET RESOLUTION ====================
    
    def parse_market_details(self, description, category):
        """
        Parse market description to extract resolution parameters
        Supports multiple formats including legacy
        """
        import re
        
        desc_upper = description.upper()
        
        # 1. FOOTBALL
        if category == "Football" or " VS " in desc_upper:
            # Try modern format: "Football: Liverpool vs Man City (...) - Will Liverpool win?"
            match = re.search(r'(?:Football:|Match Day:)?\s*(.+?)\s+vs\s+(.+?)(?:\s+\((.+?)\))?\s*[-.]?\s*Will\s+(.+?)\s+win\?', description, re.IGNORECASE)
            
            if match:
                home = match.group(1).strip()
                away = match.group(2).strip()
                target = match.group(4).strip()
                
                return {
                    'type': 'football',
                    'home': home,
                    'away': away,
                    'target_team': target
                }
        
        # 2. CRYPTO
        if category == "Crypto" or any(x in desc_upper for x in ["BITCOIN", "BTC", "ETHEREUM", "ETH", "SOLANA", "SOL"]):
            # Extract symbol
            symbol = "BTC"
            if "ETH" in desc_upper or "ETHEREUM" in desc_upper:
                symbol = "ETH"
            elif "SOL" in desc_upper or "SOLANA" in desc_upper:
                symbol = "SOL"
            
            # Extract target price
            price_match = re.search(r'\$(\d+(?:\.\d+)?)', description)
            if price_match:
                return {
                    'type': 'crypto',
                    'symbol': symbol,
                    'target_price': float(price_match.group(1))
                }
        
        # 3. STOCKS/NEWS
        if category == "Stocks" or "SURGE" in desc_upper or "%" in description:
            # Try to extract ticker and percentage
            ticker_match = re.search(r'\b([A-Z]{2,5})\b', description)
            pct_match = re.search(r'(\d+(?:\.\d+)?)%', description)
            
            return {
                'type': 'stock',
                'symbol': ticker_match.group(1) if ticker_match else None,
                'threshold': float(pct_match.group(1)) if pct_match else 2.0
            }
        
        return None
    
    def resolve_expired_markets(self):
        """Scan and resolve expired markets using real oracles"""
        try:
            count = self.contract.functions.marketCount().call()
            now = int(time.time())
            
            print(f"\n🔍 Scanning {count} markets for resolution...", flush=True)
            
            resolved_count = 0
            
            # Scan backwards from newest to oldest - INCREASED RANGE TO 200
            for market_id in range(count, max(0, count - 200), -1): 
                try:
                    m = self.contract.functions.markets(market_id).call()
                    
                    description = m[0]
                    category = m[1]
                    resolved = m[4]
                    deadline = m[6]
                    
                    # Skip if already resolved
                    if resolved:
                        continue
                    
                    # Check if expired
                    is_expired = now > deadline
                    
                    # Parse market details
                    details = self.parse_market_details(description, category)
                    if not details:
                        continue
                    
                    result = None
                    market_type = details['type']
                    
                    # Try to resolve based on type
                    if market_type == 'football':
                        print(f"\n🎯 Market #{market_id} (Football)")
                        result = self.resolve_football_match(
                            details['home'],
                            details['away'],
                            details['target_team']
                        )
                    
                    elif market_type == 'crypto':
                        # 1. Early Win Check (Checking if target hit ANYTIME)
                        # We use live data to see if it hit the target right now
                        c_data = self.get_crypto_price(details['symbol'])
                        if c_data and c_data['current_price'] >= details['target_price']:
                            print(f"\n🎯 Market #{market_id} (Crypto) - EARLY WIN!")
                            print(f"   🚀 Price ${c_data['current_price']:.2f} hit target ${details['target_price']:.2f}")
                            result = True
                        
                        # 2. Historical Check (Only if expired and haven't found a win yet)
                        # NEW: User requested only CMC price at end of duration
                        elif is_expired:
                            print(f"\n🎯 Market #{market_id} (Crypto) - Expired")
                            result = self.resolve_crypto_target(
                                details['symbol'],
                                details['target_price']
                            )
                    
                    elif market_type == 'stock' and is_expired:
                        print(f"\n🎯 Market #{market_id} (Stock)")
                        # Stocks not implemented yet
                        print(f"   ⚠️ Stock resolution not yet implemented")
                        continue
                    
                    # Submit resolution if we have a result
                    if result is not None:
                        success = self.submit_resolution(market_id, result, description)
                        if success:
                            resolved_count += 1
                            time.sleep(3)  # Prevent RPC overload
                    elif is_expired:
                        print(f"   ⏳ Market expired but no result available yet")
                    
                except Exception as e:
                    print(f"   ❌ Error on market #{market_id}: {e}")
                    continue
            
            print(f"\n✅ Resolved {resolved_count} markets this cycle\n", flush=True)
            
        except Exception as e:
            print(f"❌ Resolution scan error: {e}")
    
    def submit_resolution(self, market_id, result, description):
        """Submit resolution transaction"""
        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address, 'pending')
            
            tx = self.contract.functions.resolveMarket(
                market_id,
                result
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 800000,
                'gasPrice': int(self.w3.eth.gas_price * 1.2),
                'chainId': self.w3.eth.chain_id
            })
            
            signed = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            raw = getattr(signed, 'raw_transaction', getattr(signed, 'rawTransaction', None))
            tx_hash = self.w3.eth.send_raw_transaction(raw)
            
            result_text = "✅ YES" if result else "❌ NO"
            print(f"   📝 Resolution: {result_text}")
            print(f"   🔗 TX: {tx_hash.hex()}")
            return True
            
        except Exception as e:
            print(f"   ❌ TX Error: {e}")
            return False
    
    # ==================== MAIN LOOP ====================
    
    def run(self):
        """Main agent loop"""
        print("\n" + "="*60)
        print("🔮 REAL ORACLE AGENT - FULLY AUTOMATED")
        print("="*60)
        
        cycle = 0
        
        while True:
            try:
                cycle += 1
                print(f"\n{'='*60}")
                print(f"🔄 Cycle #{cycle} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"{'='*60}")
                
                # 1. Resolve expired markets FIRST (Priority)
                print("\n⚖️  RESOLVING MARKETS...")
                self.resolve_expired_markets()
                
                # 2. Create new markets (every cycle)
                print("\n📝 CREATING MARKETS...")
                football_created = self.create_football_markets()
                crypto_created = self.create_crypto_markets()
                
                total_created = football_created + crypto_created
                print(f"\n📊 Summary: Created {total_created} new markets")
                
                # 3. Wait before next cycle
                wait_minutes = 360
                print(f"\n💤 Next cycle in {wait_minutes} minutes...", flush=True)
                time.sleep(wait_minutes * 60)
                
            except KeyboardInterrupt:
                print("\n\n👋 Agent stopped by user")
                break
            except Exception as e:
                print(f"\n❌ Cycle error: {e}")
                print("Retrying in 5 minutes...")
                time.sleep(300)


# ==================== WEB SERVER ====================

import threading
from flask import Flask, jsonify

app = Flask(__name__)
agent_instance = None

@app.route('/')
def health_check():
    return jsonify({
        'status': 'running',
        'agent': 'RealOracleAgent',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/status')
def status():
    try:
        if agent_instance:
            count = agent_instance.contract.functions.marketCount().call()
            active = agent_instance.get_active_markets()
            return jsonify({
                'status': 'active',
                'total_markets': count,
                'active_markets': len(active),
                'agent_address': agent_instance.account.address
            })
    except:
        pass
    return jsonify({'status': 'initializing'}), 200

def run_agent():
    global agent_instance
    try:
        print("🚀 Background Agent Thread STARTING...", flush=True)
        agent_instance = RealOracleAgent()
        agent_instance.run()
    except Exception as e:
        print(f"❌ CRITICAL ERROR IN AGENT THREAD: {e}", flush=True)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Ensure stdout is flushed immediately for Render logs
    import sys
    print("🎬 Starting NeonSlash Prophet System...", flush=True)

    # Start agent in background thread
    agent_thread = threading.Thread(target=run_agent, daemon=True)
    agent_thread.start()
    
    # Start Flask server
    port = int(os.environ.get("PORT", 8080))
    print(f"\n🌐 Health check server on port {port}", flush=True)
    app.run(host='0.0.0.0', port=port)