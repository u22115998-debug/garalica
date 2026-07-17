import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load envs to get DATABASE_URL if run directly
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Fallback DB URL for local testing or inside docker
DB_URL = os.getenv("DATABASE_URL", "postgresql://bugs:change-me-db@db:5432/bugsdb")
# if running locally outside docker, it might be localhost:
if "db:5432" in DB_URL and len(sys.argv) > 1 and sys.argv[1] == "local":
    DB_URL = DB_URL.replace("db:5432", "localhost:5432")

engine = create_engine(DB_URL)

def migrate():
    with engine.begin() as conn:
        print("Migrating users table...")
        
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;"))
            print("Added is_verified column.")
        except Exception as e:
            print(f"Skipping is_verified: {e}")
            
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN verification_code_hash VARCHAR(64);"))
            print("Added verification_code_hash column.")
        except Exception as e:
            print(f"Skipping verification_code_hash: {e}")
            
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN verification_code_expires_at TIMESTAMP WITH TIME ZONE;"))
            print("Added verification_code_expires_at column.")
        except Exception as e:
            print(f"Skipping verification_code_expires_at: {e}")

        print("Migration complete.")

if __name__ == "__main__":
    migrate()
