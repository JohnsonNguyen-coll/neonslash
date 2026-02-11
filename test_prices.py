import yfinance as yf
import requests

def test_prices():
    symbol = "BTC"
    print(f"Testing {symbol}...")
    
    # 1. Binance
    try:
        url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}USDT"
        r = requests.get(url, timeout=5)
        print(f"Binance Status: {r.status_code}")
        if r.status_code == 200:
            print(f"Binance Price: {r.json()['price']}")
    except Exception as e:
        print(f"Binance Error: {e}")

    # 2. CoinGecko
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
        r = requests.get(url, timeout=5)
        print(f"CoinGecko Status: {r.status_code}")
        if r.status_code == 200:
            print(f"CoinGecko Price: {r.json()}")
    except Exception as e:
        print(f"CoinGecko Error: {e}")

    # 3. Yahoo Finance
    try:
        print("Testing Yahoo Finance...")
        ticker = yf.Ticker(f"{symbol}-USD")
        hist = ticker.history(period="1d")
        if not hist.empty:
            print(f"Yahoo Price (History): {hist['Close'].iloc[-1]}")
        else:
            print("Yahoo History Empty")
            
        try:
            print(f"Yahoo Fast Info: {ticker.fast_info['last_price']}")
        except Exception as e:
            print(f"Yahoo Fast Info Error: {e}")
            
    except Exception as e:
        print(f"Yahoo Error: {e}")

if __name__ == "__main__":
    test_prices()
