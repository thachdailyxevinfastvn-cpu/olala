import os
import sqlite3
import re

conv_dir = '/Users/thach/.gemini/antigravity/conversations'
if not os.path.exists(conv_dir):
    print("Conversations folder not found")
    exit(1)

token_pattern = re.compile(r'vca_[a-zA-Z0-9]{20,80}')
vercel_pattern = re.compile(r'vercel', re.IGNORECASE)

files = os.listdir(conv_dir)
for file in files:
    if not file.endswith('.db'):
        continue
    db_path = os.path.join(conv_dir, file)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        for table in tables:
            try:
                cursor.execute(f"SELECT * FROM {table}")
                rows = cursor.fetchall()
                for row in rows:
                    row_str = str(row)
                    
                    # Search for vercel tokens
                    token_match = token_pattern.search(row_str)
                    if token_match:
                        print(f"Found Vercel Token in DB {file}, table {table}:")
                        print(token_match.group(0))
                        print("Context:", row_str[:1000])
                        print("-" * 50)
                    
                    # Search for 'vercel' and 'token' in the same row
                    elif vercel_pattern.search(row_str) and 'token' in row_str.lower():
                        print(f"Found potential token mention in DB {file}, table {table}:")
                        print("Content:", row_str[:1000])
                        print("-" * 50)
            except Exception as e:
                # Table might not be readable or is virtual
                pass
                
        conn.close()
    except Exception as e:
        print(f"Error reading {file}: {e}")
