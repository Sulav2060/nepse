from playwright.sync_api import sync_playwright
import pandas as pd
import time
import os

def scrape():
    # Load existing data to check for duplicates
    existing_hashes = set()
    existing_df = None
    # Prefer the sorted file as the main database
    csv_file = "proposed_dividends_sorted.csv"
    if not os.path.exists(csv_file) and os.path.exists("proposed_dividends.csv"):
        csv_file = "proposed_dividends.csv"
    
    if os.path.exists(csv_file):
        try:
            # Read as string to ensure matching works with scraped text
            existing_df = pd.read_csv(csv_file, dtype=str)
            for _, row in existing_df.iterrows():
                # Create a tuple of the row values to use as a hash
                # We strip whitespace to be safe
                row_tuple = tuple(row.fillna('').astype(str).str.strip().values)
                existing_hashes.add(row_tuple)
            print(f"Loaded {len(existing_hashes)} existing rows from {csv_file}.")
        except Exception as e:
            print(f"Error loading existing data: {e}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating...")
        page.goto("https://sharehubnepal.com/investment/proposed-dividend")
        
        print("Waiting for table...")
        # Wait for the table to be visible and have rows
        # Wait for a row that has text in the first cell to ensure data is loaded
        page.wait_for_selector("table tbody tr td:first-child:not(:empty)")
        
        # Handle popup if present
        try:
            # Look for a close button in a fixed overlay
            # Common selectors for close buttons
            close_btn = page.locator("div.fixed button svg").first
            if close_btn.is_visible():
                print("Closing popup...")
                close_btn.click()
                time.sleep(1)
            else:
                # Try finding text "Don't show again" and clicking it or a close icon near it
                dont_show = page.locator("text=Don't show again")
                if dont_show.is_visible():
                    print("Found 'Don't show again', looking for close button...")
                    # Usually the close button is nearby. 
                    # Let's try to click the overlay background or look for an SVG
                    page.mouse.click(10, 10) # Click top left to maybe close?
                    # Or try to find a button in the same container
        except Exception as e:
            print(f"Popup handling error: {e}")

        # Try to find "Items Per Page" dropdown
        # It usually is a select element.
        selects = page.locator("select").all()
        print(f"Found {len(selects)} select elements.")
        
        items_per_page_select = None
        for s in selects:
            options = s.locator("option").all_text_contents()
            print(f"Select options: {options}")
            if "10" in options and ("20" in options or "50" in options):
                items_per_page_select = s
                # Try to select the largest number
                numeric_options = [int(o) for o in options if o.isdigit()]
                if numeric_options:
                    max_opt = str(max(numeric_options))
                    print(f"Selecting {max_opt} items per page...")
                    s.select_option(max_opt)
                    # Wait for table to reload
                    time.sleep(5) 
                    break
        
        # Extract headers
        headers = page.locator("table thead th").all_text_contents()
        print(f"Headers: {headers}")
        
        all_rows = []
        page_num = 1
        last_page_rows = []
        stop_scraping = False
        
        while True:
            print(f"Scraping page {page_num}...")
            # Extract rows
            rows = page.locator("table tbody tr").all()
            print(f"Found {len(rows)} rows on this page.")
            
            current_page_rows = []
            for row in rows:
                cells = row.locator("td").all_text_contents()
                cells = [c.strip() for c in cells]
                if cells and any(cells):
                    # Check if this row already exists
                    row_tuple = tuple(cells)
                    if row_tuple in existing_hashes:
                        print(f"Found existing data (Symbol: {cells[0]}). Stopping scrape.")
                        stop_scraping = True
                        break
                    
                    current_page_rows.append(cells)
            
            if not current_page_rows and not stop_scraping:
                print("No rows found. Stopping.")
                break
            
            # If we found some new rows, add them
            if current_page_rows:
                all_rows.extend(current_page_rows)
                
            if stop_scraping:
                break
                
            # Check for duplicates (end of pagination)
            if current_page_rows == last_page_rows:
                print("Duplicate page detected. Stopping.")
                break
            
            last_page_rows = current_page_rows
            
            # Check for Next button
            next_btn = page.locator("button[aria-label='Go to next page']")
            if not next_btn.count():
                 next_btn = page.locator("button:has-text('Next')")
            if not next_btn.count():
                 next_btn = page.locator("button:has-text('>')")
            
            if next_btn.count() > 0 and next_btn.is_enabled():
                print("Clicking Next...")
                
                # Try to close popup if present
                try:
                    close_btn = page.locator("div.fixed button svg").first
                    if close_btn.is_visible():
                        close_btn.click()
                        time.sleep(0.5)
                except:
                    pass

                try:
                    next_btn.click(timeout=2000)
                except:
                    print("Click failed, trying force click...")
                    try:
                        page.locator("div.fixed button").first.click(timeout=1000)
                    except:
                        pass
                    next_btn.click(force=True)
                
                page_num += 1
                # Wait for table to reload. 
                try:
                    page.wait_for_selector("table tbody tr td:first-child:not(:empty)", timeout=5000)
                except:
                    print("Timeout waiting for table rows. Continuing...")
                    time.sleep(2)
            else:
                print("No next button or disabled. Stopping.")
                break
            
            # Safety break
            if page_num > 200: 
                print("Reached page limit.")
                break
            
        browser.close()
        
        if all_rows:
            print(f"Found {len(all_rows)} new rows.")
            new_df = pd.DataFrame(all_rows, columns=headers if len(headers)==len(all_rows[0]) else None)
            
            if existing_df is not None:
                # Concatenate new data on top of existing data
                final_df = pd.concat([new_df, existing_df], ignore_index=True)
            else:
                final_df = new_df
            
            # Sort the data by Symbol (Asc) and Fiscal Year (Desc)
            try:
                if 'Symbol' in final_df.columns and 'Fiscal Year' in final_df.columns:
                    print("Sorting data by Symbol and Fiscal Year...")
                    final_df = final_df.sort_values(by=['Symbol', 'Fiscal Year'], ascending=[True, False])
            except Exception as e:
                print(f"Error sorting data: {e}")
                
            # Save to the sorted file
            output_file = "proposed_dividends_sorted.csv"
            final_df.to_csv(output_file, index=False)
            print(f"Saved updated and sorted data to {output_file}")
            print(final_df.head())
        else:
            print("No new data found.")

if __name__ == "__main__":
    scrape()
