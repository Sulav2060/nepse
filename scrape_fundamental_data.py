import json
import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
import os
import concurrent.futures
import random

def scrape_symbol(symbol):
    url = f"https://merolagani.com/CompanyDetail.aspx?symbol={symbol}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    result = {
        "Symbol": symbol,
        "EPS": "N/A",
        "Book Value": "N/A"
    }

    try:
        # Add a small random delay to avoid hitting the server too precisely
        time.sleep(random.uniform(0.1, 0.5))
        
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"Failed to fetch {symbol}: Status {response.status_code}")
            return result
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find EPS
        # Strategy: Find text "EPS" and look at the row
        eps_elem = soup.find(string=lambda text: text and "EPS" in text)
        if eps_elem:
            # Usually <th>EPS</th><td>Value</td> or similar
            # Go up to the row <tr>
            row = eps_elem.find_parent('tr')
            if row:
                cells = row.find_all(['td', 'th'])
                # Assuming the structure is Label | Value
                # We look for the cell containing "EPS" and take the next one
                for i, cell in enumerate(cells):
                    if "EPS" in cell.get_text():
                        if i + 1 < len(cells):
                            raw_eps = cells[i+1].get_text(strip=True)
                            # Clean up " (FY:...)"
                            if "(" in raw_eps:
                                raw_eps = raw_eps.split("(")[0].strip()
                            result["EPS"] = raw_eps
                        break
        
        # Find Book Value
        bv_elem = soup.find(string=lambda text: text and "Book Value" in text)
        if bv_elem:
            row = bv_elem.find_parent('tr')
            if row:
                cells = row.find_all(['td', 'th'])
                for i, cell in enumerate(cells):
                    if "Book Value" in cell.get_text():
                        if i + 1 < len(cells):
                            result["Book Value"] = cells[i+1].get_text(strip=True)
                        break
                        
        print(f"Scraped {symbol}: EPS={result['EPS']}, BV={result['Book Value']}")
        
    except Exception as e:
        print(f"Error scraping {symbol}: {e}")
        
    return result

def scrape_fundamentals():
    # Load symbols from live-trading-cache.json
    if not os.path.exists('live-trading-cache.json'):
        print("live-trading-cache.json not found. Please ensure it exists.")
        return

    with open('live-trading-cache.json', 'r') as f:
        data = json.load(f)
    
    # data['data'] is a list of lists: [["Symbol", "LTP"], ["ACLBSL", "1,011.00"], ...]
    # Skip header
    symbols = [row[0] for row in data['data'][1:]]
    
    print(f"Found {len(symbols)} symbols to scrape.")
    
    results = []
    
    # Use ThreadPoolExecutor for parallel scraping
    # max_workers=5 is a safe number to avoid getting banned while being much faster than sequential
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_symbol = {executor.submit(scrape_symbol, symbol): symbol for symbol in symbols}
        
        for future in concurrent.futures.as_completed(future_to_symbol):
            symbol = future_to_symbol[future]
            try:
                data = future.result()
                results.append(data)
            except Exception as exc:
                print(f'{symbol} generated an exception: {exc}')
        
    # Save to CSV
    # Sort by Symbol for consistency
    results.sort(key=lambda x: x['Symbol'])
    
    df = pd.DataFrame(results)
    df.to_csv("eps.csv", index=False)
    print("Saved to eps.csv")

if __name__ == "__main__":
    scrape_fundamentals()
