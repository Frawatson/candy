"""Database connection management and session handling."""

import logging
import time
from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import create_engine, event, exc, pool
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import QueuePool

from config.database import db_config
from utils.exceptions import ConnectionError, DatabaseError, TransactionError

# Configure logging
logger = logging.getLogger(__name__)

# Create declarative base for ORM models
Base = declarative_base()


class DatabaseManager:
    """Manages database connections and sessions."""
    
    def __init__(self):
        self.engine: Optional[Engine] = None
        self.SessionLocal: Optional[sessionmaker] = None
        self._initialized = False
    
    def initialize(self) -> None:
        """Initialize database engine and session factory."""
        if self._initialized:
            return
        
        try:
            # Create engine with connection pooling
            self.engine = create_engine(
                db_config.database_url,
                poolclass=QueuePool,
                pool_size=db_config.pool_size,
                max_overflow=db_config.max_overflow,
                pool_timeout=db_config.pool_timeout,
                pool_recycle=db_config.pool_recycle,
                pool_pre_ping=True,  # Validate connections before use
                echo=db_config.echo,  # Log SQL in development
                future=True,  # Use SQLAlchemy 2.0 style
            )
            
            # Add connection event listeners
            self._setup_event_listeners()
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
            )
            
            self._initialized = True
            logger.info("Database connection initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database connection: {e}")
            raise ConnectionError(
                "Failed to initialize database connection", 
                original_error=e
            )
    
    def _setup_event_listeners(self) -> None:
        """Set up database event listeners for monitoring and debugging."""
        
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """Set PostgreSQL connection parameters."""
            if db_config.is_production:
                # Set stricter connection settings for production
                with dbapi_connection.cursor() as cursor:
                    cursor.execute("SET statement_timeout = '30s'")
                    cursor.execute("SET lock_timeout = '10s'")
        
        @event.listens_for(self.engine, "checkout")
        def checkout_listener(dbapi_connection, connection_record, connection_proxy):
            """Log connection checkout in development."""
            if db_config.is_development:
                logger.debug("Connection checked out from pool")
        
        @event.listens_for(self.engine, "checkin")
        def checkin_listener(dbapi_connection, connection_record):
            """Log connection checkin in development."""
            if db_config.is_development:
                logger.debug("Connection checked in to pool")
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """
        Get a database session with automatic cleanup.
        
        Usage:
            with db_manager.get_session() as session:
                # Use session here
                pass
        """
        if not self._initialized:
            self.initialize()
        
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise DatabaseError(
                "Database operation failed", 
                original_error=e
            )
        finally:
            session.close()
    
    def create_session(self) -> Session:
        """Create a new database session (manual management required)."""
        if not self._initialized:
            self.initialize()
        
        return self.SessionLocal()
    
    def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            with self.get_session() as session:
                session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    def close(self) -> None:
        """Close database connections and cleanup resources."""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connections closed")


# Global database manager instance
db_manager = DatabaseManager()


# Dependency injection helpers
def get_db_session() -> Generator[Session, None, None]:
    """Dependency for getting database session in web frameworks."""
    with db_manager.get_session() as session:
        yield session


@contextmanager
def transaction() -> Generator[Session, None, None]:
    """
    Context manager for database transactions with rollback on error.
    
    Usage:
        with transaction() as session:
            # Database operations here
            session.add(new_record)
            # Automatically committed if no exception
    """
    session = db_manager.create_session()
    try:
        yield session
        session.commit()
        logger.debug("Transaction committed successfully")
    except Exception as e:
        session.rollback()
        logger.error(f"Transaction rolled back due to error: {e}")
        raise TransactionError(
            "Transaction failed and was rolled back",
            original_error=e
        )
    finally:
        session.close()


def retry_on_database_error(max_retries: int = 3, delay: float = 1.0):
    """
    Decorator for retrying database operations on connection errors.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries (exponential backoff)
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except (exc.DisconnectionError, exc.TimeoutError, ConnectionError) as e:
                    last_exception = e
                    if attempt < max_retries:
                        wait_time = delay * (2 ** attempt)  # Exponential backoff
                        logger.warning(
                            f"Database operation failed (attempt {attempt + 1}), "
                            f"retrying in {wait_time}s: {e}"
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Database operation failed after {max_retries} retries")
                        break
                except Exception as e:
                    # Don't retry on non-connection errors
                    logger.error(f"Database operation failed: {e}")
                    raise
            
            raise ConnectionError(
                f"Database operation failed after {max_retries} retries",
                original_error=last_exception
            )
        
        return wrapper
    return decorator