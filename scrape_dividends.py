from playwright.sync_api import sync_playwright
import pandas as pd
import time
import os

def scrape():
    output_file = "proposed_dividends_sorted.csv"
    
    # Load existing data to check for duplicates
    existing_hashes = set()
    existing_df = None
    
    if os.path.exists(output_file):
        try:
            # Read as string to ensure matching works with scraped text
            existing_df = pd.read_csv(output_file, dtype=str)
            for _, row in existing_df.iterrows():
                # Create a tuple of the row values to use as a hash
                # We strip whitespace to be safe. 
                # Columns: Symbol, Bonus(%), Cash(%), Right Share, Fiscal Year
                row_tuple = tuple(row.fillna('').astype(str).str.strip().values)
                existing_hashes.add(row_tuple)
            print(f"Loaded {len(existing_hashes)} existing rows from {output_file}.")
        except Exception as e:
            print(f"Error loading existing data: {e}")

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
        stop_scraping = False
        
        while True:
            print(f"Scraping page {page_num}...")
            
            # Wait for rows to load
            page.wait_for_selector("table tbody tr")
            
            rows = page.locator("table tbody tr").all()
            print(f"Found {len(rows)} rows on this page.")
            
            if not rows:
                break
            
            current_page_rows = []
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
                    
                    # Convert Right Share ratio to percentage
                    # Format is usually "1:1" (100%), "1:0.5" (50%), or "-"
                    right_share_val = '0'
                    if right_share != '-' and ':' in right_share:
                        try:
                            parts = right_share.split(':')
                            if len(parts) == 2:
                                # Assuming format Existing:New. 
                                # If 1:1, it's 100%. If 1:0.5, it's 50%.
                                # So we take (New / Existing) * 100
                                existing = float(parts[0])
                                new_share = float(parts[1])
                                if existing > 0:
                                    val = (new_share / existing) * 100
                                    right_share_val = f"{val:.2f}"
                        except:
                            pass
                    
                    # Create row dict
                    row_data = {
                        'Symbol': symbol,
                        'Bonus(%)': bonus,
                        'Cash(%)': cash,
                        'Right Share': right_share_val,
                        'Fiscal Year': fiscal_year
                    }
                    
                    # Check for duplicates
                    # Construct tuple in the same order as CSV columns
                    row_tuple = (symbol, bonus, cash, right_share_val, fiscal_year)
                    
                    if row_tuple in existing_hashes:
                        print(f"Found existing data (Symbol: {symbol}, FY: {fiscal_year}). Stopping scrape.")
                        stop_scraping = True
                        break
                    
                    current_page_rows.append(row_data)
            
            if current_page_rows:
                all_rows.extend(current_page_rows)
            
            if stop_scraping:
                break
            
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
            print(f"Found {len(all_rows)} new rows.")
            new_df = pd.DataFrame(all_rows)
            
            if existing_df is not None:
                # Concatenate new data on top of existing data
                final_df = pd.concat([new_df, existing_df], ignore_index=True)
            else:
                final_df = new_df
            
            # Sort
            print("Sorting data...")
            final_df = final_df.sort_values(by=['Symbol', 'Fiscal Year'], ascending=[True, False])
            
            final_df.to_csv(output_file, index=False)
            print(f"Saved data to {output_file}")
            print(final_df.head())
        else:
            print("No new data found.")

if __name__ == "__main__":
    scrape()
