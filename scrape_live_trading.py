import json
from playwright.sync_api import sync_playwright
from datetime import datetime

def scrape_ltp():
    url = "https://www.sharesansar.com/live-trading"
    output_file = "live-trading-cache.json"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print(f"Navigating to {url}...")
        page.goto(url)
        
        print("Waiting for table...")
        try:
            page.wait_for_selector("table", timeout=30000)
        except:
            print("Table not found or timeout.")
            browser.close()
            return
        
        # Get all rows
        rows = page.locator("table tr").all()
        print(f"Found {len(rows)} rows.")
        
        data = []
        symbol_idx = -1
        ltp_idx = -1
        
        for i, row in enumerate(rows):
            # Get all cells (th or td)
            cells = row.locator("th, td").all_text_contents()
            cells = [c.strip() for c in cells]
            
            if i == 0:
                # Header row
                for idx, cell in enumerate(cells):
                    txt = cell.lower()
                    if txt == 'symbol':
                        symbol_idx = idx
                    elif txt == 'ltp':
                        ltp_idx = idx
                
                if symbol_idx != -1 and ltp_idx != -1:
                    data.append(['Symbol', 'LTP'])
                else:
                    print("Could not find Symbol or LTP columns.")
                    browser.close()
                    return
            else:
                # Data row
                if symbol_idx != -1 and ltp_idx != -1 and len(cells) > max(symbol_idx, ltp_idx):
                    data.append([cells[symbol_idx], cells[ltp_idx]])
        
        browser.close()
        
        if len(data) > 1:
            cache_content = {
                "timestamp": datetime.now().isoformat(),
                "data": data
            }
            
            with open(output_file, 'w') as f:
                json.dump(cache_content, f, indent=2)
            
            print(f"Successfully saved {len(data)-1} records to {output_file}")
        else:
            print("No data extracted.")

if __name__ == "__main__":
    scrape_ltp()
