import os
from dotenv import load_dotenv

load_dotenv()
uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME")

print(f"MONGO_URI: {uri}")
print(f"DB_NAME: {db_name}")

if not uri:
    print("WARNING: MONGO_URI is not set in .env")
