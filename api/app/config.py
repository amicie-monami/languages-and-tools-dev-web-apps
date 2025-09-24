import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        database_url = os.getenv("DATABASE_URL")
        
        print(f"[DEBUG] DATABASE_URL from env: {database_url}")
        
        if not database_url or self._is_invalid_database_url(database_url):
            print("[DEBUG] Using SQLite fallback")
            self.DATABASE_URL = "sqlite:///./messenger.db"
        else:
            self.DATABASE_URL = database_url
            
        print(f"[DEBUG] Final DATABASE_URL: {self.DATABASE_URL}")
        
        # jwt
        self.SECRET_KEY = os.getenv("SECRET_KEY", "secret-jwt-key")
        self.ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days
        
        # File Upload Settings
        self.UPLOAD_DIR = "static"
        self.MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
        
        # Environment
        self.ENVIRONMENT = "development"
        self.DEBUG = True
    
    def _is_invalid_database_url(self, url: str) -> bool:
        """Check if database URL format is invalid"""
        if not url:
            return True
            
        valid_prefixes = ["postgresql://", "sqlite:///", "mysql://"]
        if not any(url.startswith(prefix) for prefix in valid_prefixes):
            return True
            
        if "admin:" in url and not url.startswith(("postgresql://", "mysql://")):
            return True
            
        return False

settings = Settings()