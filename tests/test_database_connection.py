"""Unit tests for database connection management."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.exc import DisconnectionError, TimeoutError
from database.connection import DatabaseManager, transaction, retry_on_database_error
from utils.exceptions import ConnectionError, DatabaseError, TransactionError


class TestDatabaseManager:
    """Test DatabaseManager class."""
    
    def test_initialize_creates_engine_and_session_factory(self, test_db_config):
        """Test database manager initialization."""
        manager = DatabaseManager()
        
        with patch('database.connection.create_engine') as mock_create_engine, \
             patch('database.connection.sessionmaker') as mock_sessionmaker:
            
            mock_engine = Mock()
            mock_create_engine.return_value = mock_engine
            mock_session_factory = Mock()
            mock_sessionmaker.return_value = mock_session_factory
            
            manager.initialize()
            
            assert manager._initialized is True
            assert manager.engine is mock_engine
            assert manager.SessionLocal is mock_session_factory
            
            # Verify engine creation parameters
            mock_create_engine.assert_called_once()
            args, kwargs = mock_create_engine.call_args
            assert 'poolclass' in kwargs
            assert 'pool_size' in kwargs
            assert 'pool_pre_ping' in kwargs
            assert kwargs['pool_pre_ping'] is True
    
    def test_initialize_only_once(self, test_db_config):
        """Test that initialize only runs once."""
        manager = DatabaseManager()
        
        with patch('database.connection.create_engine') as mock_create_engine:
            manager.initialize()
            manager.initialize()  # Second call
            
            mock_create_engine.assert_called_once()
    
    def test_initialize_failure_raises_connection_error(self, test_db_config):
        """Test initialization failure raises ConnectionError."""
        manager = DatabaseManager()
        
        with patch('database.connection.create_engine', side_effect=Exception("Connection failed")):
            with pytest.raises(ConnectionError) as exc_info:
                manager.initialize()
            
            assert "Failed to initialize database connection" in str(exc_info.value)
            assert exc_info.value.original_error is not None
    
    def test_get_session_context_manager_success(self, mock_session):
        """Test successful session context manager usage."""
        manager = DatabaseManager()
        manager._initialized = True
        manager.SessionLocal = Mock(return_value=mock_session)
        
        with manager.get_session() as session:
            assert session is mock_session
        
        mock_session.commit.assert_called_once()
        mock_session.close.assert_called_once()
        mock_session.rollback.assert_not_called()
    
    def test_get_session_context_manager_rollback_on_error(self, mock_session):
        """Test session context manager rollback on error."""
        manager = DatabaseManager()
        manager._initialized = True
        manager.SessionLocal = Mock(return_value=mock_session)
        
        with pytest.raises(DatabaseError):
            with manager.get_session() as session:
                raise ValueError("Something went wrong")
        
        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()
        mock_session.commit.assert_not_called()
    
    def test_get_session_initializes_if_needed(self):
        """Test get_session initializes manager if needed."""
        manager = DatabaseManager()
        
        with patch.object(manager, 'initialize') as mock_initialize, \
             patch.object(manager, 'SessionLocal', Mock(return_value=Mock())):
            
            with manager.get_session():
                pass
            
            mock_initialize.assert_called_once()
    
    def test_create_session(self, mock_session):
        """Test creating a session manually."""
        manager = DatabaseManager()
        manager._initialized = True
        manager.SessionLocal = Mock(return_value=mock_session)
        
        session = manager.create_session()
        
        assert session is mock_session
        manager.SessionLocal.assert_called_once()
    
    def test_create_session_initializes_if_needed(self):
        """Test create_session initializes manager if needed."""
        manager = DatabaseManager()
        
        with patch.object(manager, 'initialize') as mock_initialize, \
             patch.object(manager, 'SessionLocal', Mock(return_value=Mock())):
            
            manager.create_session()
            mock_initialize.assert_called_once()
    
    def test_health_check_success(self):
        """Test successful health check."""
        manager = DatabaseManager()
        mock_session = Mock()
        
        with patch.object(manager, 'get_session') as mock_get_session:
            mock_get_session.return_value.__enter__.return_value = mock_session
            mock_get_session.return_value.__exit__.return_value = None
            
            result = manager.health_check()
            
            assert result is True
            mock_session.execute.assert_called_once_with("SELECT 1")
    
    def test_health_check_failure(self):
        """Test failed health check."""
        manager = DatabaseManager()
        
        with patch.object(manager, 'get_session', side_effect=Exception("Connection failed")):
            result = manager.health_check()
            assert result is False
    
    def test_close_disposes_engine(self):
        """Test closing database connections."""
        manager = DatabaseManager()
        mock_engine = Mock()
        manager.engine = mock_engine
        
        manager.close()
        
        mock_engine.dispose.assert_called_once()


class TestTransactionContextManager:
    """Test transaction context manager."""
    
    def test_transaction_success_commits(self):
        """Test successful transaction commits."""
        mock_session = Mock()
        
        with patch('database.connection.db_manager') as mock_db_manager:
            mock_db_manager.create_session.return_value = mock_session
            
            with transaction() as session:
                assert session is mock_session
                session.add(Mock())
            
            mock_session.commit.assert_called_once()
            mock_session.close.assert_called_once()
            mock_session.rollback.assert_not_called()
    
    def test_transaction_error_rollback(self):
        """Test transaction rollback on error."""
        mock_session = Mock()
        
        with patch('database.connection.db_manager') as mock_db_manager:
            mock_db_manager.create_session.return_value = mock_session
            
            with pytest.raises(TransactionError):
                with transaction() as session:
                    raise ValueError("Something went wrong")
            
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()
            mock_session.commit.assert_not_called()


class TestRetryDecorator:
    """Test retry_on_database_error decorator."""
    
    def test_retry_success_on_first_attempt(self):
        """Test successful execution on first attempt."""
        @retry_on_database_error(max_retries=2, delay=0.1)
        def test_function():
            return "success"
        
        result = test_function()
        assert result == "success"
    
    def test_retry_success_after_retries(self):
        """Test successful execution after retries."""
        call_count = 0
        
        @retry_on_database_error(max_retries=2, delay=0.1)
        def test_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise DisconnectionError("Connection lost", None, None)
            return "success"
        
        with patch('time.sleep'):  # Speed up test
            result = test_function()
        
        assert result == "success"
        assert call_count == 3
    
    def test_retry_fails_after_max_retries(self):
        """Test failure after max retries exceeded."""
        @retry_on_database_error(max_retries=1, delay=0.1)
        def test_function():
            raise TimeoutError("Timeout", None, None)
        
        with patch('time.sleep'):  # Speed up test
            with pytest.raises(ConnectionError) as exc_info:
                test_function()
        
        assert "failed after 1 retries" in str(exc_info.value)
    
    def test_retry_does_not_retry_non_connection_errors(self):
        """Test that non-connection errors are not retried."""
        call_count = 0
        
        @retry_on_database_error(max_retries=2, delay=0.1)
        def test_function():
            nonlocal call_count
            call_count += 1
            raise ValueError("Business logic error")
        
        with pytest.raises(ValueError):
            test_function()
        
        assert call_count == 1  # Only called once, no retries
    
    def test_retry_exponential_backoff(self):
        """Test exponential backoff delay."""
        call_count = 0
        sleep_times = []
        
        @retry_on_database_error(max_retries=2, delay=1.0)
        def test_function():
            nonlocal call_count
            call_count += 1
            raise DisconnectionError("Connection lost", None, None)
        
        def mock_sleep(duration):
            sleep_times.append(duration)
        
        with patch('time.sleep', side_effect=mock_sleep):
            with pytest.raises(ConnectionError):
                test_function()
        
        assert sleep_times == [1.0, 2.0]  # Exponential backoff: 1, 2