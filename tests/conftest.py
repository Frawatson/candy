"""Pytest configuration and shared fixtures."""

import os
import pytest
from unittest.mock import Mock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database.connection import Base, DatabaseManager
from config.database import DatabaseConfig


@pytest.fixture(scope="session")
def test_db_config():
    """Fixture providing test database configuration."""
    with patch.dict(os.environ, {
        'ENVIRONMENT': 'testing',
        'DATABASE_URL': 'postgresql://test_user:test_pass@localhost:5432/test_db',
        'DATABASE_POOL_SIZE': '5',
        'DATABASE_MAX_OVERFLOW': '10',
        'DATABASE_POOL_TIMEOUT': '10',
        'DATABASE_POOL_RECYCLE': '1800'
    }):
        yield DatabaseConfig()


@pytest.fixture
def in_memory_db():
    """Fixture providing in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
        echo=False
    )
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    # Create session factory
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    yield engine, TestingSessionLocal
    
    # Clean up
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def mock_db_manager():
    """Fixture providing a mock database manager."""
    manager = Mock(spec=DatabaseManager)
    manager._initialized = False
    manager.engine = None
    manager.SessionLocal = None
    return manager


@pytest.fixture
def mock_session():
    """Fixture providing a mock database session."""
    session = Mock()
    session.commit.return_value = None
    session.rollback.return_value = None
    session.close.return_value = None
    session.execute.return_value = Mock()
    session.add.return_value = None
    session.query.return_value = Mock()
    return session


@pytest.fixture
def sample_user_data():
    """Fixture providing sample user data for testing."""
    return {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'SecurePass123!',
        'first_name': 'Test',
        'last_name': 'User'
    }


@pytest.fixture
def sample_session_data():
    """Fixture providing sample session data for testing."""
    from datetime import datetime, timedelta
    return {
        'user_id': 1,
        'session_token': 'abc123def456',
        'expires_at': datetime.utcnow() + timedelta(hours=24)
    }


@pytest.fixture(autouse=True)
def reset_environment():
    """Reset environment variables after each test."""
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)