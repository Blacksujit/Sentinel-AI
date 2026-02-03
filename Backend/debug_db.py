import os
from sqlalchemy import create_engine, text

def debug_database():
    """Debug database connection and tables"""
    print("🔍 Database Debug Info")
    print("=" * 50)
    
    # Check environment variables
    db_url = os.getenv("DATABASE_URL")
    print(f"DATABASE_URL: {db_url}")
    print(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    if not db_url:
        print("❌ DATABASE_URL not set")
        return
    
    try:
        # Test connection
        if db_url.startswith("postgresql") or db_url.startswith("postgres"):
            # Use psycopg driver for PostgreSQL
            if db_url.startswith("postgresql://"):
                sqlalchemy_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
            elif db_url.startswith("postgres://"):
                sqlalchemy_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
            else:
                sqlalchemy_url = db_url
        else:
            sqlalchemy_url = db_url
            
        engine = create_engine(sqlalchemy_url)
        
        with engine.connect() as conn:
            # Test basic connection
            result = conn.execute(text("SELECT 1"))
            print(f"✅ Database connection successful: {result.fetchone()}")
            
            # Check tables
            if db_url.startswith("postgresql"):
                result = conn.execute(text("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """))
                tables = [row[0] for row in result.fetchall()]
                print(f"📋 Tables found: {tables}")
                
                # Check risk_logs count
                if 'risk_logs' in tables:
                    result = conn.execute(text("SELECT COUNT(*) FROM risk_logs"))
                    count = result.fetchone()[0]
                    print(f"📊 risk_logs count: {count}")
                    
                    # Get sample logs
                    result = conn.execute(text("SELECT * FROM risk_logs LIMIT 3"))
                    logs = result.fetchall()
                    print(f"📝 Sample logs: {logs}")
                else:
                    print("❌ risk_logs table not found")
            else:
                # SQLite
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in result.fetchall()]
                print(f"📋 Tables found: {tables}")
                
    except Exception as e:
        print(f"❌ Database error: {str(e)}")

if __name__ == "__main__":
    debug_database()
