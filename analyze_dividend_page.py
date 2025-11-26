from playwright.sync_api import sync_playwright
import pandas as pd

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = "https://nepalipaisa.com/dividend"
        print(f"Navigating to {url}...")
        page.goto(url)
        
        # Wait for table to load
        try:
            page.wait_for_selector("table", timeout=10000)
            print("Table found.")
        except:
            print("Timeout waiting for table.")
            browser.close()
            return

        # Analyze Table
        tables = page.query_selector_all("table")
        print(f"Found {len(tables)} tables.")
        
        main_table = None
        for i, table in enumerate(tables):
            # Heuristic: look for 'Symbol' or 'Bonus' in headers
            headers = [th.inner_text().strip() for th in table.query_selector_all("th")]
            print(f"Table {i} Headers: {headers}")
            if "Symbol" in headers or "Bonus Share %" in headers or "Cash Dividend %" in headers:
                main_table = table
                break
        
        if main_table:
            print("\n--- Main Table Data Sample ---")
            # Get headers
            headers = [th.inner_text().strip() for th in main_table.query_selector_all("th")]
            print(f"Headers: {headers}")
            
            # Get rows
            rows = main_table.query_selector_all("tbody tr")
            data = []
            for i, row in enumerate(rows[:5]):
                cells = [td.inner_text().strip() for td in row.query_selector_all("td")]
                print(f"Row {i}: {cells}")
                data.append(cells)
            
            # Check for pagination
            # Common pagination selectors
            next_buttons = page.query_selector_all("text=Next")
            pagination = page.query_selector_all(".pagination")
            
            print("\n--- Pagination Info ---")
            if next_buttons:
                print(f"Found 'Next' text element: {next_buttons[0]}")
                # Get selector if possible
            else:
                print("No explicit 'Next' text found.")
                
            if pagination:
                print(f"Found pagination class: {pagination}")
            
            # Check for popups (basic check)
            popups = page.query_selector_all(".modal, .popup, [role='dialog']")
            if popups:
                print(f"Potential popups found: {len(popups)}")
                for p in popups:
                    if p.is_visible():
                        print("A popup is currently visible.")
            else:
                print("No obvious popups detected.")

        else:
            print("Could not identify main data table.")

        browser.close()

if __name__ == "__main__":
    run()
