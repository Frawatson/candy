"""Unit tests for database configuration."""

import os
import pytest
from unittest.mock import patch
from config.database import DatabaseConfig
from utils.exceptions import ConfigurationError


class TestDatabaseConfig:
    """Test DatabaseConfig class."""
    
    def test_config_with_database_url(self):
        """Test configuration with complete DATABASE_URL."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'ENVIRONMENT': 'development'
        }):
            config = DatabaseConfig()
            assert config.database_url == 'postgresql://user:pass@localhost:5432/testdb'
            assert config.environment == 'development'
            assert config.echo is True  # development mode
    
    def test_config_with_individual_components(self):
        """Test configuration with individual database components."""
        with patch.dict(os.environ, {
            'DATABASE_HOST': 'localhost',
            'DATABASE_PORT': '5432',
            'DATABASE_NAME': 'testdb',
            'DATABASE_USER': 'testuser',
            'DATABASE_PASSWORD': 'testpass',
            'ENVIRONMENT': 'production'
        }, clear=True):
            config = DatabaseConfig()
            expected_url = 'postgresql://testuser:testpass@localhost:5432/testdb'
            assert config.database_url == expected_url
            assert config.echo is False  # production mode
    
    def test_config_with_pool_settings(self):
        """Test configuration with custom pool settings."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'DATABASE_POOL_SIZE': '20',
            'DATABASE_MAX_OVERFLOW': '30',
            'DATABASE_POOL_TIMEOUT': '60',
            'DATABASE_POOL_RECYCLE': '7200'
        }):
            config = DatabaseConfig()
            assert config.pool_size == 20
            assert config.max_overflow == 30
            assert config.pool_timeout == 60
            assert config.pool_recycle == 7200
    
    def test_config_default_values(self):
        """Test configuration with default values."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb'
        }, clear=True):
            config = DatabaseConfig()
            assert config.environment == 'development'
            assert config.pool_size == 10
            assert config.max_overflow == 20
            assert config.pool_timeout == 30
            assert config.pool_recycle == 3600
    
    def test_config_missing_required_components(self):
        """Test configuration fails with missing required components."""
        with patch.dict(os.environ, {
            'DATABASE_NAME': 'testdb',
            'DATABASE_USER': 'testuser'
            # Missing DATABASE_PASSWORD
        }, clear=True):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Missing required database configuration" in str(exc_info.value)
    
    def test_config_invalid_database_url(self):
        """Test configuration fails with invalid database URL."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'invalid-url'
        }):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Invalid database URL" in str(exc_info.value)
    
    def test_config_unsupported_database_scheme(self):
        """Test configuration fails with unsupported database scheme."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'mysql://user:pass@localhost:3306/testdb'
        }):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Unsupported database scheme" in str(exc_info.value)
    
    def test_config_missing_hostname(self):
        """Test configuration fails with missing hostname."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@/testdb'
        }):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Database hostname is required" in str(exc_info.value)
    
    def test_config_missing_database_name(self):
        """Test configuration fails with missing database name."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/'
        }):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Database name is required" in str(exc_info.value)
    
    def test_config_invalid_pool_size(self):
        """Test configuration fails with invalid pool size."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'DATABASE_POOL_SIZE': '0'
        }):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Pool size must be at least 1" in str(exc_info.value)
    
    def test_config_invalid_max_overflow(self):
        """Test configuration fails with invalid max overflow."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'DATABASE_MAX_OVERFLOW': '-1'
        }):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Max overflow cannot be negative" in str(exc_info.value)
    
    def test_config_invalid_pool_timeout(self):
        """Test configuration fails with invalid pool timeout."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'DATABASE_POOL_TIMEOUT': '0'
        }):
            with pytest.raises(ConfigurationError) as exc_info:
                DatabaseConfig()
            assert "Pool timeout must be at least 1 second" in str(exc_info.value)
    
    def test_get_test_database_url(self):
        """Test getting test database URL."""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/myapp'
        }):
            config = DatabaseConfig()
            test_url = config.get_test_database_url()
            assert test_url == 'postgresql://user:pass@localhost:5432/myapp_test'
    
    def test_environment_properties(self):
        """Test environment check properties."""
        # Test production
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'ENVIRONMENT': 'production'
        }):
            config = DatabaseConfig()
            assert config.is_production is True
            assert config.is_development is False
            assert config.is_testing is False
        
        # Test development
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'ENVIRONMENT': 'development'
        }):
            config = DatabaseConfig()
            assert config.is_production is False
            assert config.is_development is True
            assert config.is_testing is False
        
        # Test testing
        with patch.dict(os.environ, {
            'DATABASE_URL': 'postgresql://user:pass@localhost:5432/testdb',
            'ENVIRONMENT': 'testing'
        }):
            config = DatabaseConfig()
            assert config.is_production is False
            assert config.is_development is False
            assert config.is_testing is True