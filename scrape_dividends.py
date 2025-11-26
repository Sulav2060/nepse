from playwright.sync_api import sync_playwright
import pandas as pd
import time
import os

def scrape():
    # We are switching sources, so we might want to start fresh or handle the schema change.
    # For now, let's overwrite or handle the new columns.
    output_file = "proposed_dividends_sorted.csv"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = "https://nepalipaisa.com/dividend"
        print(f"Navigating to {url}...")
        page.goto(url)
        
        print("Waiting for table...")
        try:
            page.wait_for_selector("table", timeout=30000)
        except:
            print("Table not found or timeout.")
            browser.close()
            return

        # Extract headers
        # The site has headers: Symbol, Bonus Share, Cash Dividend, Total Dividend (%), Bonus Book Close Date, Right Share, Right Book Close Date, Fiscal Year
        # We want to map them to: Symbol, Bonus(%), Cash(%), Right Share, Fiscal Year
        
        all_rows = []
        page_num = 1
        
        while True:
            print(f"Scraping page {page_num}...")
            
            # Wait for rows to load
            page.wait_for_selector("table tbody tr")
            
            rows = page.locator("table tbody tr").all()
            print(f"Found {len(rows)} rows on this page.")
            
            if not rows:
                break
                
            for row in rows:
                cells = row.locator("td").all_text_contents()
                cells = [c.strip() for c in cells]
                
                # Expected index based on observation:
                # 0: Symbol
                # 1: Bonus Share (e.g. "0.00 %")
                # 2: Cash Dividend (e.g. "6.40 %")
                # 3: Total Dividend
                # 4: Bonus Date
                # 5: Right Share (e.g. "1:1" or "-")
                # 6: Right Date
                # 7: Fiscal Year
                
                if len(cells) >= 8:
                    symbol = cells[0]
                    bonus = cells[1].replace('%', '').strip()
                    cash = cells[2].replace('%', '').strip()
                    right_share = cells[5]
                    fiscal_year = cells[7]
                    
                    # Normalize '-' to '0' for calculations, or keep as is?
                    # The previous scraper kept them as strings.
                    # Let's keep them as strings but clean up.
                    if bonus == '-': bonus = '0'
                    if cash == '-': cash = '0'
                    
                    all_rows.append({
                        'Symbol': symbol,
                        'Bonus(%)': bonus,
                        'Cash(%)': cash,
                        'Right Share': right_share,
                        'Fiscal Year': fiscal_year
                    })
            
            # Check for Next button
            # The next button is an anchor with text "Next"
            next_btn = page.locator("a:has-text('Next')")
            
            if next_btn.count() > 0 and next_btn.is_visible():
                # Check if it's disabled? Usually class 'disabled' on li parent
                # The HTML structure is usually ul.pagination > li > a
                # If the parent li has class disabled, we stop.
                parent_li = next_btn.locator("..")
                class_attr = parent_li.get_attribute("class")
                if class_attr and "disabled" in class_attr:
                    print("Next button disabled. Stopping.")
                    break
                
                print("Clicking Next...")
                next_btn.click()
                page_num += 1
                time.sleep(2) # Wait for AJAX load
            else:
                print("No next button found. Stopping.")
                break
            
            # Safety break
            if page_num > 200:
                break
        
        browser.close()
        
        if all_rows:
            print(f"Found {len(all_rows)} total rows.")
            df = pd.DataFrame(all_rows)
            
            # Sort
            print("Sorting data...")
            df = df.sort_values(by=['Symbol', 'Fiscal Year'], ascending=[True, False])
            
            df.to_csv(output_file, index=False)
            print(f"Saved data to {output_file}")
            print(df.head())
        else:
            print("No data found.")

if __name__ == "__main__":
    scrape()
