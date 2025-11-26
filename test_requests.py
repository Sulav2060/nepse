import requests
from bs4 import BeautifulSoup

symbol = "ADBL"
url = f"https://merolagani.com/CompanyDetail.aspx?symbol={symbol}"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Try to find EPS
    # Based on previous output, it's likely in a table
    # Searching for text "EPS"
    eps_elem = soup.find(string=lambda text: text and "EPS" in text)
    if eps_elem:
        # Usually in a <th> or <td>, we want the next <td>
        parent = eps_elem.parent
        # Go up to tr
        row = parent.find_parent('tr')
        if row:
            cells = row.find_all('td')
            # If header is th, cells might be just values. If header is td, it's in cells.
            # Let's print the row text to see structure
            print(f"EPS Row: {row.get_text(strip=True)}")
            
    bv_elem = soup.find(string=lambda text: text and "Book Value" in text)
    if bv_elem:
        parent = bv_elem.parent
        row = parent.find_parent('tr')
        if row:
            print(f"BV Row: {row.get_text(strip=True)}")

except Exception as e:
    print(e)
