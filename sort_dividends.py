import pandas as pd
import os

def sort_dividends():
    csv_file = "proposed_dividends.csv"
    if not os.path.exists(csv_file):
        print(f"{csv_file} not found.")
        return

    try:
        df = pd.read_csv(csv_file)
        
        # Ensure Fiscal Year is treated as string for sorting, though it likely already is.
        # We might need to clean it if there are typos, but assuming standard format.
        
        # Sort by Symbol (Ascending) and Fiscal Year (Descending)
        # This groups by company, and puts the latest year first for each company.
        df_sorted = df.sort_values(by=['Symbol', 'Fiscal Year'], ascending=[True, False])
        
        output_file = "proposed_dividends_sorted.csv"
        df_sorted.to_csv(output_file, index=False)
        
        print(f"Sorted data saved to {output_file}")
        print(df_sorted[['Symbol', 'Fiscal Year', 'Bonus(%)', 'Cash(%)']].head(10))
        
    except Exception as e:
        print(f"Error sorting data: {e}")

if __name__ == "__main__":
    sort_dividends()
