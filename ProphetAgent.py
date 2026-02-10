import os
import time
import requests
import xml.etree.ElementTree as ET
import yfinance as yf
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

# Optional: Add API keys for better data sources
FOOTBALL_API_KEY = os.getenv('FOOTBALL_API_KEY', '3')  # TheSportsDB test key

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
        print(f"🔮 Real Oracle Agent ACTIVE")
        print(f"📍 Agent Address: {self.account.address}")
        print(f"📍 Contract: {CONTRACT_ADDRESS}")
        
    # ==================== FOOTBALL ORACLE ====================
    
    def fetch_live_football_fixtures(self, max_fixtures=5):
        """
        Fetch real upcoming football matches from TheSportsDB API
        Returns list of fixtures happening in next 7 days
        """
        try:
            fixtures = []
            
            # Major leagues to monitor
            leagues = {
                'English Premier League': '4328',
                'Spanish La Liga': '4335',
                'Italian Serie A': '4332',
                'German Bundesliga': '4331',
                'French Ligue 1': '4334'
            }
            
            print(f"📡 Fetching football fixtures...")
            seen_event_ids = set() # To prevent duplicates
            
            for league_name, league_id in leagues.items():
                try:
                    url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/eventsnextleague.php?id={league_id}"
                    r = requests.get(url, timeout=10)
                    data = r.json()
                    
                    if data and data.get('events'):
                        print(f"   ✅ Found {len(data['events'])} events for {league_name}")
                        for event in data['events']:
                            event_id = event['idEvent']
                            
                            # Skip if we already processed this event
                            if event_id in seen_event_ids:
                                continue
                            
                            try:
                                # Use date objects for cleaner comparison
                                event_date = datetime.strptime(event['dateEvent'], '%Y-%m-%d').date()
                                today = datetime.now().date()
                                days_until = (event_date - today).days
                                
                                # Matches from today up to 7 days in the future
                                if 0 <= days_until <= 7:
                                    # Use the ACTUAL league name from the API, not our loop variable
                                    # This handles the case where test API keys return mismatched data
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
                            except Exception as e:
                                print(f"   ⚠️ Error parsing event: {e}")
                                continue
                    
                    if len(fixtures) >= max_fixtures:
                        break
                        
                    time.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    print(f"   ❌ Error fetching {league_name}: {e}")
            
            if not fixtures:
                print("   ℹ️ No upcoming fixtures found in next 7 days")
            
            return fixtures
            
        except Exception as e:
            print(f"❌ Football API Error: {e}")
            return []
    
    def resolve_football_match(self, home_team, away_team, target_team, event_id=None):
        """
        Resolve football match using real API data
        Returns: True if target_team won, False if target_team lost/drew, None if not finished
        """
        try:
            print(f"   🔍 Checking match: {home_team} vs {away_team} (Target: {target_team})")
            
            # Helper to check if target won
            def check_win(h_score, a_score, h_name, a_name):
                if target_team.lower() in h_name.lower():
                    return h_score > a_score
                elif target_team.lower() in a_name.lower():
                    return a_score > h_score
                return False

            # Method 1: Search by event ID
            if event_id:
                url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/lookupevent.php?id={event_id}"
                r = requests.get(url, timeout=10)
                data = r.json()
                
                if data and data.get('events'):
                    event = data['events'][0]
                    if event.get('strStatus') == 'Match Finished':
                        h_s = int(event.get('intHomeScore', 0))
                        a_s = int(event.get('intAwayScore', 0))
                        print(f"   ⚽ Result: {event['strHomeTeam']} {h_s}-{a_s} {event['strAwayTeam']}")
                        return check_win(h_s, a_s, event['strHomeTeam'], event['strAwayTeam'])
            
            # Method 2: Search by team names
            home_normalized = home_team.replace(' ', '_')
            away_normalized = away_team.replace(' ', '_')
            
            url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/searchevents.php?e={home_normalized}_vs_{away_normalized}"
            r = requests.get(url, timeout=10)
            data = r.json()
            
            if data and data.get('event'):
                for event in data['event']:
                    if event.get('strStatus') == 'Match Finished':
                        h_s = int(event.get('intHomeScore', 0))
                        a_s = int(event.get('intAwayScore', 0))
                        print(f"   ⚽ Result: {event['strHomeTeam']} {h_s}-{a_s} {event['strAwayTeam']}")
                        return check_win(h_s, a_s, event['strHomeTeam'], event['strAwayTeam'])
            
            # Method 3: Reverse search
            url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/searchevents.php?e={away_normalized}_vs_{home_normalized}"
            r = requests.get(url, timeout=10)
            data = r.json()
            
            if data and data.get('event'):
                for event in data['event']:
                    if event.get('strStatus') == 'Match Finished':
                        # Note: In reverse search, the API might return teams in original or swapped order
                        # We use the names from the API to be safe
                        h_s = int(event.get('intHomeScore', 0))
                        a_s = int(event.get('intAwayScore', 0))
                        print(f"   ⚽ Result: {event['strHomeTeam']} {h_s}-{a_s} {event['strAwayTeam']}")
                        return check_win(h_s, a_s, event['strHomeTeam'], event['strAwayTeam'])
            
            print(f"   ⏳ Match not finished yet")
            return None
            
        except Exception as e:
            print(f"   ❌ Football Resolution Error: {e}")
            return None
    
    # ==================== CRYPTO ORACLE ====================
    
    def get_crypto_price(self, symbol):
        """Get real-time crypto price from Binance (with retry)"""
        for attempt in range(3):  # 3 retries
            try:
                ticker = f"{symbol}USDT"
                url = f"https://api.binance.com/api/v3/ticker/price?symbol={ticker}"
                r = requests.get(url, timeout=10)
                data = r.json()
                
                if 'price' in data:
                    return {
                        'symbol': symbol,
                        'current_price': float(data['price'])
                    }
                
            except Exception as e:
                if attempt == 2:  # Last attempt
                    print(f"❌ Binance API Error for {symbol} after 3 attempts: {e}")
                else:
                    time.sleep(2)  # Wait before retry
        
        return None
    
    def resolve_crypto_target(self, symbol, target_price, start_timestamp, end_timestamp):
        """
        Check if crypto hit target price using Binance historical data
        Returns: True if hit, False if not, None if data unavailable
        """
        try:
            ticker = f"{symbol}USDT"
            
            # Binance klines API (1h candlesticks)
            url = f"https://api.binance.com/api/v3/klines?symbol={ticker}&interval=1h&startTime={int(start_timestamp * 1000)}&endTime={int(end_timestamp * 1000)}"
            r = requests.get(url, timeout=10)
            data = r.json()
            
            if not isinstance(data, list) or len(data) == 0:
                print(f"   ❌ No data from Binance for {ticker}")
                return None
            
            # Find max high in the timeframe
            max_high = max(float(candle[2]) for candle in data)  # Index 2 = High price
            
            result = max_high >= target_price
            print(f"   📊 {symbol} Target: ${target_price:.2f} | Actual High: ${max_high:.2f} | Hit: {result}")
            return result
            
        except Exception as e:
            print(f"   ❌ Crypto Resolution Error: {e}")
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
                
                desc = f"Crypto: Will {name} ({symbol}) reach ${target} in next 2 hours? (Current: ${current_price})"
                
                self.deploy_market(desc, "Crypto", 7200)  # 2 hours
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
            
            print(f"\n🔍 Scanning {count} markets for resolution...")
            
            resolved_count = 0
            
            # Scan backwards from newest to oldest
            for market_id in range(count, max(0, count - 50), -1):  # Last 50 markets
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
                    
                    elif market_type == 'crypto' and is_expired:
                        print(f"\n🎯 Market #{market_id} (Crypto)")
                        start_time = deadline - 7200  # 2 hour window
                        result = self.resolve_crypto_target(
                            details['symbol'],
                            details['target_price'],
                            start_time,
                            deadline
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
            
            print(f"\n✅ Resolved {resolved_count} markets this cycle\n")
            
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
                wait_minutes = 15
                print(f"\n💤 Next cycle in {wait_minutes} minutes...")
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