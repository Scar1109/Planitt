import pandas as pd
import glob
import os

def analyze():
    print(">>> Analyzing Sales Data...")
    # Fix path: Up two levels to root, then Dataset
    files = glob.glob(os.path.join("../../Dataset/2023", "**", "Sales_*.csv"), recursive=True)
    if not files:
        print("No Sales files found.")
        return

    df = pd.read_csv(files[0], nrows=5000)
    
    print("\n--- SKU Samples ---")
    print(df['SKU'].unique()[:20])
    
    print("\n--- Price Stats ---")
    print(df['UnitPriceLKR'].describe())
    
    print("\n--- Zero Price Check ---")
    zeros = df[df['UnitPriceLKR'] <= 0]
    print(f"Rows with <=0 Price: {len(zeros)}")
    
    # Check for likely category prefixes
    prefixes = df['SKU'].apply(lambda x: x.split('-')[1] if '-' in str(x) else 'UNK')
    print("\n--- Top Prefixes ---")
    print(prefixes.value_counts().head(10))

if __name__ == "__main__":
    analyze()
