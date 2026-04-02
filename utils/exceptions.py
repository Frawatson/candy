"""Custom exceptions for database and validation operations."""


class DatabaseError(Exception):
    """Base exception for database-related errors."""
    
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(message)
        self.original_error = original_error


class ConnectionError(DatabaseError):
    """Raised when database connection fails."""
    pass


class ValidationError(Exception):
    """Base exception for data validation errors."""
    
    def __init__(self, message: str, field: str = None):
        super().__init__(message)
        self.field = field


class UniqueConstraintError(DatabaseError):
    """Raised when a unique constraint is violated."""
    
    def __init__(self, message: str, field: str = None):
        super().__init__(message)
        self.field = field


class ForeignKeyError(DatabaseError):
    """Raised when a foreign key constraint is violated."""
    pass


class RecordNotFoundError(DatabaseError):
    """Raised when a requested record is not found."""
    pass


class TransactionError(DatabaseError):
    """Raised when a database transaction fails."""
    pass


class MigrationError(DatabaseError):
    """Raised when a database migration fails."""
    pass


class ConfigurationError(Exception):
    """Raised when database configuration is invalid."""
    pass