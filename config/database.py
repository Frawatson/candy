"""Database configuration management."""

import os
from typing import Optional
from urllib.parse import urlparse

from dotenv import load_dotenv

from utils.exceptions import ConfigurationError

# Load environment variables
load_dotenv()


class DatabaseConfig:
    """Database configuration settings."""
    
    def __init__(self):
        self.environment = os.getenv('ENVIRONMENT', 'development')
        self.database_url = self._get_database_url()
        self.pool_size = int(os.getenv('DATABASE_POOL_SIZE', '10'))
        self.max_overflow = int(os.getenv('DATABASE_MAX_OVERFLOW', '20'))
        self.pool_timeout = int(os.getenv('DATABASE_POOL_TIMEOUT', '30'))
        self.pool_recycle = int(os.getenv('DATABASE_POOL_RECYCLE', '3600'))
        self.echo = self.environment == 'development'
        
        # Validate configuration
        self._validate_config()
    
    def _get_database_url(self) -> str:
        """Get database URL from environment variables."""
        # First try complete DATABASE_URL
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            return database_url
        
        # Build from individual components
        host = os.getenv('DATABASE_HOST', 'localhost')
        port = os.getenv('DATABASE_PORT', '5432')
        name = os.getenv('DATABASE_NAME')
        user = os.getenv('DATABASE_USER')
        password = os.getenv('DATABASE_PASSWORD')
        
        if not all([name, user, password]):
            raise ConfigurationError(
                "Missing required database configuration. "
                "Provide either DATABASE_URL or all of: "
                "DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD"
            )
        
        return f"postgresql://{user}:{password}@{host}:{port}/{name}"
    
    def _validate_config(self) -> None:
        """Validate database configuration."""
        try:
            parsed = urlparse(self.database_url)
            if not parsed.scheme.startswith('postgresql'):
                raise ConfigurationError(
                    f"Unsupported database scheme: {parsed.scheme}. "
                    "Only PostgreSQL is supported."
                )
            
            if not parsed.hostname:
                raise ConfigurationError("Database hostname is required")
            
            if not parsed.path or len(parsed.path) <= 1:
                raise ConfigurationError("Database name is required")
                
        except Exception as e:
            raise ConfigurationError(f"Invalid database URL: {e}")
        
        # Validate pool settings
        if self.pool_size < 1:
            raise ConfigurationError("Pool size must be at least 1")
        
        if self.max_overflow < 0:
            raise ConfigurationError("Max overflow cannot be negative")
        
        if self.pool_timeout < 1:
            raise ConfigurationError("Pool timeout must be at least 1 second")
    
    def get_test_database_url(self) -> str:
        """Get test database URL with modified database name."""
        parsed = urlparse(self.database_url)
        test_db_name = f"{parsed.path[1:]}_test"
        return self.database_url.replace(parsed.path, f"/{test_db_name}")
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == 'production'
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment == 'development'
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing environment."""
        return self.environment == 'testing'


# Global configuration instance
db_config = DatabaseConfig()