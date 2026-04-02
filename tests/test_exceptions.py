"""Unit tests for custom exceptions."""

import pytest
from utils.exceptions import (
    DatabaseError, ConnectionError, ValidationError, UniqueConstraintError,
    ForeignKeyError, RecordNotFoundError, TransactionError, MigrationError,
    ConfigurationError
)


class TestDatabaseError:
    """Test DatabaseError exception class."""
    
    def test_database_error_with_message_only(self):
        """Test DatabaseError with message only."""
        error = DatabaseError("Database operation failed")
        assert str(error) == "Database operation failed"
        assert error.original_error is None
    
    def test_database_error_with_original_error(self):
        """Test DatabaseError with original error."""
        original = ValueError("Original error")
        error = DatabaseError("Database operation failed", original_error=original)
        assert str(error) == "Database operation failed"
        assert error.original_error is original
    
    def test_database_error_inheritance(self):
        """Test DatabaseError inherits from Exception."""
        error = DatabaseError("Test error")
        assert isinstance(error, Exception)


class TestConnectionError:
    """Test ConnectionError exception class."""
    
    def test_connection_error_inherits_database_error(self):
        """Test ConnectionError inherits from DatabaseError."""
        error = ConnectionError("Connection failed")
        assert isinstance(error, DatabaseError)
        assert isinstance(error, Exception)
    
    def test_connection_error_with_original_error(self):
        """Test ConnectionError with original error."""
        original = OSError("Network unreachable")
        error = ConnectionError("Failed to connect", original_error=original)
        assert error.original_error is original


class TestValidationError:
    """Test ValidationError exception class."""
    
    def test_validation_error_with_message_only(self):
        """Test ValidationError with message only."""
        error = ValidationError("Invalid data")
        assert str(error) == "Invalid data"
        assert error.field is None
    
    def test_validation_error_with_field(self):
        """Test ValidationError with field name."""
        error = ValidationError("Invalid email format", field="email")
        assert str(error) == "Invalid email format"
        assert error.field == "email"
    
    def test_validation_error_inheritance(self):
        """Test ValidationError inherits from Exception."""
        error = ValidationError("Test error")
        assert isinstance(error, Exception)


class TestUniqueConstraintError:
    """Test UniqueConstraintError exception class."""
    
    def test_unique_constraint_error_inherits_database_error(self):
        """Test UniqueConstraintError inherits from DatabaseError."""
        error = UniqueConstraintError("Duplicate key")
        assert isinstance(error, DatabaseError)
        assert isinstance(error, Exception)
    
    def test_unique_constraint_error_with_field(self):
        """Test UniqueConstraintError with field name."""
        error = UniqueConstraintError("Email already exists", field="email")
        assert error.field == "email"


class TestOtherExceptions:
    """Test other custom exception classes."""
    
    def test_foreign_key_error(self):
        """Test ForeignKeyError."""
        error = ForeignKeyError("Foreign key violation")
        assert isinstance(error, DatabaseError)
    
    def test_record_not_found_error(self):
        """Test RecordNotFoundError."""
        error = RecordNotFoundError("User not found")
        assert isinstance(error, DatabaseError)
    
    def test_transaction_error(self):
        """Test TransactionError."""
        error = TransactionError("Transaction failed")
        assert isinstance(error, DatabaseError)
    
    def test_migration_error(self):
        """Test MigrationError."""
        error = MigrationError("Migration failed")
        assert isinstance(error, DatabaseError)
    
    def test_configuration_error(self):
        """Test ConfigurationError."""
        error = ConfigurationError("Invalid config")
        assert isinstance(error, Exception)
        assert not isinstance(error, DatabaseError)