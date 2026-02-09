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
ALPHA_VANTAGE_KEY = os.getenv('ALPHA_VANTAGE_KEY', '')  # For stocks (optional)

ABI = [
    {"inputs":[],"name":"marketCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"markets","outputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"totalYes","type":"uint256"},{"internalType":"uint256","name":"totalNo","type":"uint256"},{"internalType":"bool","name":"resolved","type":"bool"},{"internalType":"bool","name":"result","type":"bool"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"marketId","type":"uint256"},{"internalType":"bool","name":"result","type":"bool"}],"name":"resolveMarket","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"uint256","name":"duration","type":"uint256"}],"name":"createMarket","outputs":[],"stateMutability":"nonpayable","type":"function"}
]


class RealOracleAgent:
    """
    Production Oracle Agent - Real data only, no hardcoding
    Supports: Football (API-Football), Crypto (yfinance), Stocks (yfinance)
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
        Fetch real upcoming football matches from API-Football (free tier)
        Returns list of fixtures happening in next 24 hours
        """
        try:
            # Using API-Football.com - Free tier allows 100 requests/day
            # Get fixtures for today and tomorrow
            today = datetime.now()
            
            fixtures = []
            
            # Alternative: TheSportsDB (completely free but less reliable)
            # For major leagues: EPL, La Liga, Serie A, Bundesliga, Ligue 1
            leagues = {
                'English Premier League': '4328',
                'Spanish La Liga': '4335',
                'Italian Serie A': '4332',
                'German Bundesliga': '4331',
                'French Ligue 1': '4334'
            }
            
            for league_name, league_id in leagues.items():
                try:
                    # Get next 5 events for this league
                    url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/eventsnextleague.php?id={league_id}"
                    r = requests.get(url, timeout=10)
                    data = r.json()
                    
                    if data and data.get('events'):
                        for event in data['events'][:2]:  # Take top 2 from each league
                            event_date = datetime.strptime(event['dateEvent'], '%Y-%m-%d')
                            # Only matches within next 7 days
                            if (event_date - today).days <= 7 and (event_date - today).days >= 0:
                                fixtures.append({
                                    'home': event['strHomeTeam'],
                                    'away': event['strAwayTeam'],
                                    'league': league_name,
                                    'date': event['dateEvent'],
                                    'time': event.get('strTime', 'TBD'),
                                    'event_id': event['idEvent']
                                })
                    
                    time.sleep(0.5)  # Rate limiting
                    
                except Exception as e:
                    print(f"Error fetching {league_name}: {e}")
                    continue
            
            return fixtures[:max_fixtures]
            
        except Exception as e:
            print(f"❌ Football API Error: {e}")
            return []
    
    def resolve_football_match(self, home_team, away_team, event_id=None):
        """
        Resolve football match using real API data
        Returns: True if home team won, False otherwise, None if match not finished
        """
        try:
            # Method 1: Search by event ID if available
            if event_id:
                url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/lookupevent.php?id={event_id}"
                r = requests.get(url, timeout=10)
                data = r.json()
                
                if data and data.get('events'):
                    event = data['events'][0]
                    if event.get('strStatus') == 'Match Finished':
                        home_score = int(event.get('intHomeScore', 0))
                        away_score = int(event.get('intAwayScore', 0))
                        print(f"⚽ Match Result: {event['strHomeTeam']} {home_score}-{away_score} {event['strAwayTeam']}")
                        return home_score > away_score
            
            # Method 2: Search by team names
            home_normalized = home_team.replace(' ', '_')
            away_normalized = away_team.replace(' ', '_')
            
            url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/searchevents.php?e={home_normalized}_vs_{away_normalized}"
            r = requests.get(url, timeout=10)
            data = r.json()
            
            if data and data.get('event'):
                # Find most recent finished match
                for event in data['event']:
                    if event.get('strStatus') == 'Match Finished':
                        home_score = int(event.get('intHomeScore', 0))
                        away_score = int(event.get('intAwayScore', 0))
                        print(f"⚽ Match Result: {event['strHomeTeam']} {home_score}-{away_score} {event['strAwayTeam']}")
                        return home_score > away_score
            
            # Try reverse search
            url = f"https://www.thesportsdb.com/api/v1/json/{FOOTBALL_API_KEY}/searchevents.php?e={away_normalized}_vs_{home_normalized}"
            r = requests.get(url, timeout=10)
            data = r.json()
            
            if data and data.get('event'):
                for event in data['event']:
                    if event.get('strStatus') == 'Match Finished':
                        home_score = int(event.get('intAwayScore', 0))  # Reversed
                        away_score = int(event.get('intHomeScore', 0))
                        print(f"⚽ Match Result: {event['strAwayTeam']} {home_score}-{away_score} {event['strHomeTeam']}")
                        return home_score > away_score
            
            print(f"⏳ Match not finished yet: {home_team} vs {away_team}")
            return None
            
        except Exception as e:
            print(f"❌ Football Resolution Error: {e}")
            return None

    def resolve_legacy_football(self, description):
        """Specifically handle the 'Match Day' format for older markets"""
        try:
            import re
            match = re.search(r'Match Day: (.+) vs (.+)\. Will (.+) win\?', description)
            if match:
                home, away, target = match.group(1), match.group(2), match.group(3)
                print(f"🕵️ Legacy Football match found: {home} vs {away}. Checking API...")
                return self.resolve_football_match(home, away)
            return None
        except: return None
    
    # ==================== CRYPTO ORACLE ====================
    
    def get_crypto_price(self, symbol, timeframe_hours=1):
        """
        Get real-time crypto price and historical data
        Returns: dict with current_price, high, low, change
        """
        try:
            # Map common names to Yahoo Finance tickers
            ticker_map = {
                'BTC': 'BTC-USD',
                'ETH': 'ETH-USD',
                'USDC': 'USDC-USD',
                'SOL': 'SOL-USD',
                'DOGE': 'DOGE-USD'
            }
            
            ticker_symbol = ticker_map.get(symbol, f"{symbol}-USD")
            
            # Get historical data
            crypto = yf.Ticker(ticker_symbol)
            hist = crypto.history(period=f'{timeframe_hours}h', interval='1m')
            
            if hist.empty:
                # Fallback to 1 day if minute data unavailable
                hist = crypto.history(period='1d', interval='5m')
            
            if hist.empty:
                print(f"❌ No data for {ticker_symbol}")
                return None
            
            current_price = hist['Close'].iloc[-1]
            high = hist['High'].max()
            low = hist['Low'].min()
            change_pct = ((current_price - hist['Close'].iloc[0]) / hist['Close'].iloc[0]) * 100
            
            return {
                'symbol': symbol,
                'current_price': round(current_price, 2),
                'high': round(high, 2),
                'low': round(low, 2),
                'change_pct': round(change_pct, 2)
            }
            
        except Exception as e:
            print(f"❌ Crypto Price Error for {symbol}: {e}")
            return None
    
    def resolve_crypto_target(self, symbol, target_price, start_timestamp, end_timestamp):
        """
        Check if crypto hit target price in given timeframe
        Returns: True if target was hit, False otherwise
        """
        try:
            ticker_map = {
                'BTC': 'BTC-USD',
                'ETH': 'ETH-USD',
                'USDC': 'USDC-USD',
                'SOL': 'SOL-USD'
            }
            
            ticker_symbol = ticker_map.get(symbol, f"{symbol}-USD")
            crypto = yf.Ticker(ticker_symbol)
            
            # Convert timestamps to datetime
            start_dt = datetime.fromtimestamp(start_timestamp)
            end_dt = datetime.fromtimestamp(end_timestamp)
            
            # Fetch data for the specific window
            hist = crypto.history(
                start=start_dt.strftime('%Y-%m-%d'),
                end=(end_dt + timedelta(days=1)).strftime('%Y-%m-%d'),
                interval='1h'
            )
            
            if hist.empty:
                print(f"❌ No historical data for {ticker_symbol}")
                return None
            
            # Filter to exact timeframe
            hist.index = hist.index.tz_localize(None)
            window_data = hist[(hist.index >= start_dt) & (hist.index <= end_dt)]
            
            if window_data.empty:
                print(f"❌ No data in timeframe for {ticker_symbol}")
                return None
            
            max_price = window_data['High'].max()
            result = max_price >= target_price
            
            print(f"📊 {symbol} Target: ${target_price} | Actual High: ${max_price:.2f} | Result: {result}")
            return result
            
        except Exception as e:
            print(f"❌ Crypto Resolution Error: {e}")
            return None
    
    # ==================== STOCK ORACLE ====================
    
    def get_stock_price(self, ticker_symbol):
        """
        Get real-time stock price
        """
        try:
            stock = yf.Ticker(ticker_symbol)
            hist = stock.history(period='1d', interval='1m')
            
            if hist.empty:
                return None
            
            current_price = hist['Close'].iloc[-1]
            return {
                'symbol': ticker_symbol,
                'current_price': round(current_price, 2),
                'change_pct': round(((current_price - hist['Open'].iloc[0]) / hist['Open'].iloc[0]) * 100, 2)
            }
            
        except Exception as e:
            print(f"❌ Stock Price Error for {ticker_symbol}: {e}")
            return None
    
    def resolve_stock_movement(self, ticker_symbol, threshold_pct, start_timestamp, end_timestamp):
        """
        Check if stock moved by threshold % in timeframe
        Returns: True if movement >= threshold, False otherwise
        """
        try:
            stock = yf.Ticker(ticker_symbol)
            
            start_dt = datetime.fromtimestamp(start_timestamp)
            end_dt = datetime.fromtimestamp(end_timestamp)
            
            hist = stock.history(
                start=start_dt.strftime('%Y-%m-%d'),
                end=(end_dt + timedelta(days=1)).strftime('%Y-%m-%d'),
                interval='1h'
            )
            
            if hist.empty or len(hist) < 2:
                return None
            
            # Filter to timeframe
            hist.index = hist.index.tz_localize(None)
            window_data = hist[(hist.index >= start_dt) & (hist.index <= end_dt)]
            
            if window_data.empty or len(window_data) < 2:
                return None
            
            start_price = window_data['Close'].iloc[0]
            max_price = window_data['High'].max()
            actual_change = ((max_price - start_price) / start_price) * 100
            
            result = actual_change >= threshold_pct
            
            print(f"📈 {ticker_symbol} Target: +{threshold_pct}% | Actual: +{actual_change:.2f}% | Result: {result}")
            return result
            
        except Exception as e:
            print(f"❌ Stock Resolution Error: {e}")
            return None
    
    # ==================== MARKET CREATION ====================
    
    def get_active_markets(self):
        """Get all unresolved markets to avoid duplicates"""
        try:
            count = self.contract.functions.marketCount().call()
            active = []
            
            for i in range(max(1, count - 50), count + 1):
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
        fixtures = self.fetch_live_football_fixtures(max_fixtures=3)
        active = self.get_active_markets()
        active_descs = {m['description'] for m in active}
        
        for fixture in fixtures:
            desc = f"Football: {fixture['home']} vs {fixture['away']} ({fixture['league']}) - Will {fixture['home']} win?"
            
            if desc not in active_descs:
                # Calculate deadline: 2 hours after match time
                match_date = datetime.strptime(f"{fixture['date']} {fixture['time']}", '%Y-%m-%d %H:%M:%S')
                duration = int((match_date + timedelta(hours=2) - datetime.now()).total_seconds())
                
                if duration > 0:
                    self.deploy_market(desc, "Football", duration)
                    print(f"⚽ Created: {fixture['home']} vs {fixture['away']}")
                else:
                    print(f"⏭️ Match already started: {fixture['home']} vs {fixture['away']}")
    
    def create_crypto_markets(self):
        """Create markets for crypto price targets"""
        active = self.get_active_markets()
        active_descs = {m['description'] for m in active}
        
        # Get current BTC price
        btc_data = self.get_crypto_price('BTC', timeframe_hours=1)
        
        if btc_data:
            current_price = btc_data['current_price']
            # Set realistic target: +1.5% from current
            target = round(current_price * 1.015, 2)
            
            desc = f"Crypto: Will Bitcoin (BTC) reach ${target} in next 2 hours? (Current: ${current_price})"
            
            if desc not in active_descs:
                self.deploy_market(desc, "Crypto", 7200)  # 2 hours
                print(f"₿ Created BTC market: ${target} target")
    
    def deploy_market(self, description, category, duration):
        """Deploy a single market to blockchain"""
        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            tx = self.contract.functions.createMarket(
                description, 
                category, 
                duration
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 1000000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 5042002
            })
            
            signed = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            raw = getattr(signed, 'raw_transaction', getattr(signed, 'rawTransaction', None))
            tx_hash = self.w3.eth.send_raw_transaction(raw)
            
            print(f"✅ Market deployed: {description[:60]}...")
            time.sleep(2)
            
        except Exception as e:
            print(f"❌ Deploy error: {e}")
    
    # ==================== MARKET RESOLUTION ====================
    
    def parse_market_details(self, description, category):
        """
        Ultra-flexible parser to handle various market formats (including legacy ones)
        """
        desc_upper = description.upper()
        
        # 1. FOOTBALL DETECTION
        if category == "Football" or " VS " in desc_upper:
            import re
            # Try to find teams: "Team A vs Team B"
            match = re.search(r'([a-zA-Z\s]+) VS ([a-zA-Z\s\(\)]+)', description, re.IGNORECASE)
            if match:
                home = match.group(1).strip().split('(')[0].strip()
                away = match.group(2).strip().split('.')[0].split('(')[0].strip()
                # Clean up "Match Day: " or "Football: " prefixes
                home = home.replace("Match Day: ", "").replace("Football: ", "")
                
                # Determine target team (usually the one mentioned at the end or the home team)
                target_team = home
                if "WILL " in desc_upper and " WIN?" in desc_upper:
                    target_match = re.search(r'WILL ([a-zA-Z\s]+) WIN\?', description, re.IGNORECASE)
                    if target_match:
                        target_team = target_match.group(1).strip()
                
                return {
                    'type': 'football',
                    'home': home,
                    'away': away,
                    'target_team': target_team
                }

        # 2. CRYPTO DETECTION
        if category == "Crypto" or any(x in desc_upper for x in ["BITCOIN", "(BTC)", "ETHEREUM", "(ETH)", "SOLANA"]):
            import re
            # Extract symbol: e.g. (BTC) or Bitcoin
            symbol = "BTC"
            if "ETH" in desc_upper: symbol = "ETH"
            elif "SOL" in desc_upper: symbol = "SOL"
            
            # Extract target price: e.g. $105000
            price_match = re.search(r'\$(\d+\.?\d*)', description)
            if price_match:
                return {
                    'type': 'crypto',
                    'symbol': symbol,
                    'target_price': float(price_match.group(1))
                }

        # 3. STOCK/NEWS DETECTION
        if category == "Stocks" or "SURGE" in desc_upper:
            import re
            # Look for tickers like TSLA, AAPL, AMZN
            ticker_match = re.search(r'\b([A-Z]{3,5})\b', description)
            symbol = ticker_match.group(1) if ticker_match else "BTC-USD"
            
            # Look for percentage
            pct_match = re.search(r'(\d+)%', description)
            threshold = float(pct_match.group(1)) if pct_match else 2.0
            
            return {
                'type': 'stock',
                'symbol': symbol,
                'threshold': threshold
            }
        
        return None
    
    def resolve_expired_markets(self):
        """Scan and resolve all expired markets using real oracles"""
        try:
            count = self.contract.functions.marketCount().call()
            now = int(time.time())
            
            print(f"\n🔍 Scanning {count} markets for resolution...")
            
            resolved_count = 0
            
            for market_id in range(1, count + 1):
                try:
                    m = self.contract.functions.markets(market_id).call()
                    
                    description = m[0]
                    category = m[1]
                    resolved = m[4]
                    deadline = m[6]
                    
                    # Resolution Logic: 
                    # We resolve if:
                    # 1. It is expired (now > deadline) -> Must resolve.
                    # 2. Or if we found a DEFINITIVE real-world result (Early Resolution)
                    
                    if not resolved:
                        # 1. Parse details first
                        details = self.parse_market_details(description, category)
                        if not details:
                            print(f"   ⚠️ Cannot parse market format for #{market_id}")
                            continue

                        result = None
                        # Use the PARSED type instead of the CONTRACT category for better accuracy
                        market_type = details.get('type')
                        
                        if market_type == 'football':
                            result = self.resolve_football_match(details['home'], details['away'])
                        
                        elif market_type == 'crypto':
                            # For crypto/stocks, resolve after deadline or if we have definitive data
                            if now > deadline or "FORCE" in desc_upper:
                                start_time = deadline - 7200
                                result = self.resolve_crypto_target(
                                    details.get('symbol', 'BTC'), 
                                    details.get('target_price', 0), 
                                    start_time, 
                                    deadline
                                )
                        
                        elif market_type == 'stock':
                            if now > deadline or "FORCE" in desc_upper:
                                start_time = deadline - 3600
                                result = self.resolve_stock_movement(
                                    details.get('symbol', 'TSLA'), 
                                    details.get('threshold', 2.0), 
                                    start_time, 
                                    deadline
                                )
                        
                        # Trigger resolution
                        if result is not None:
                            print(f"\n🎯 Resolving Market #{market_id} ({market_type.upper()})")
                            print(f"   Description: {description}")
                            self.submit_resolution(market_id, result, description)
                            resolved_count += 1
                            time.sleep(3)
                        elif now > deadline:
                            print(f"   ⏳ Market #{market_id} ({market_type}) expired but no data yet. Retrying...")
                    
                except Exception as e:
                    print(f"   ❌ Error resolving market #{market_id}: {e}")
                    continue
            
            print(f"\n✅ Resolved {resolved_count} markets this cycle\n")
            
        except Exception as e:
            print(f"❌ Resolution scan error: {e}")
    
    def submit_resolution(self, market_id, result, description):
        """Submit resolution transaction to blockchain"""
        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            tx = self.contract.functions.resolveMarket(
                market_id,
                result
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 800000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 5042002
            })
            
            signed = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            raw = getattr(signed, 'raw_transaction', getattr(signed, 'rawTransaction', None))
            tx_hash = self.w3.eth.send_raw_transaction(raw)
            
            result_text = "✅ YES" if result else "❌ NO"
            print(f"   📝 Resolution submitted: {result_text}")
            print(f"   🔗 TX: {tx_hash.hex()}")
            
        except Exception as e:
            print(f"   ❌ Resolution TX error: {e}")
    
    # ==================== MAIN LOOP ====================
    
    def run(self):
        """Main agent loop - create and resolve markets"""
        print("\n" + "="*60)
        print("🔮 REAL ORACLE AGENT - PRODUCTION MODE")
        print("="*60)
        
        cycle = 0
        
        while True:
            try:
                cycle += 1
                print(f"\n{'='*60}")
                print(f"🔄 Cycle #{cycle} - {datetime.now().strftime('%H:%M:%S')}")
                print(f"{'='*60}")
                
                # 1. Resolve expired/past markets FIRST (Priority)
                print("\n⚖️ STEP 1: RESOLVING EXPIRED/PAST MARKETS...")
                self.resolve_expired_markets()
                
                # 2. Create new markets SECOND (Only every 6 hours)
                if cycle % 24 == 1:
                    print("\n📝 STEP 2: CREATING NEW MARKETS...")
                    self.create_football_markets()
                    self.create_crypto_markets()
                
                # 3. Wait before next cycle
                wait_minutes = 15
                print(f"\n💤 Cycle complete. Next check in {wait_minutes} minutes...")
                time.sleep(wait_minutes * 60)
                
            except KeyboardInterrupt:
                print("\n\n👋 Agent stopped by user")
                break
            except Exception as e:
                print(f"\n❌ Cycle error: {e}")
                print("Retrying in 5 minutes...")
                time.sleep(300)


# ==================== WEB SERVER FOR HEALTH CHECKS ====================

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
            return jsonify({
                'status': 'active',
                'total_markets': count,
                'agent_address': agent_instance.account.address
            })
    except:
        pass
    return jsonify({'status': 'initializing'}), 200

def run_agent():
    global agent_instance
    agent_instance = RealOracleAgent()
    agent_instance.run()

if __name__ == "__main__":
    # Start agent in background thread
    agent_thread = threading.Thread(target=run_agent, daemon=True)
    agent_thread.start()
    
    # Start Flask server for health checks (required for Render)
    port = int(os.environ.get("PORT", 8080))
    print(f"\n🌐 Health check server starting on port {port}")
    app.run(host='0.0.0.0', port=port)