import os
import requests
from dotenv import load_dotenv

# Load environment variables
if os.path.exists('./frontend/.env.local'):
    load_dotenv(dotenv_path='./frontend/.env.local')
else:
    load_dotenv()

CMC_API_KEY = os.getenv('CMC_API_KEY', '').replace('"', '').replace("'", "").strip()

def test_prices():
    symbol = "BTC"
    print(f"Testing {symbol} via CoinMarketCap...")
    
    if not CMC_API_KEY:
        print("❌ Error: CMC_API_KEY is missing from environment!")
        return

    try:
        url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
        params = {'symbol': symbol, 'convert': 'USD'}
        headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': CMC_API_KEY,
        }
        r = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"CMC Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            price = data['data'][symbol]['quote']['USD']['price']
            print(f"✅ CMC Price: ${price:.2f}")
        else:
            print(f"❌ CMC API Error: {r.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_prices()
