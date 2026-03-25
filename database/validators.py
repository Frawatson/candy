"""Data validation functions and custom validators."""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from email_validator import validate_email, EmailNotValidError

from utils.exceptions import ValidationError


class DataValidator:
    """Data validation utility class."""
    
    # Regex patterns
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,30}$')
    STRONG_PASSWORD_PATTERN = re.compile(
        r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    )
    
    @staticmethod
    def validate_email_address(email: str) -> str:
        """
        Validate email address format.
        
        Args:
            email: Email address to validate
            
        Returns:
            Normalized email address
            
        Raises:
            ValidationError: If email is invalid
        """
        if not email:
            raise ValidationError("Email address is required", field="email")
        
        try:
            # Validate and normalize email
            valid_email = validate_email(email)
            return valid_email.email
        except EmailNotValidError as e:
            raise ValidationError(f"Invalid email address: {str(e)}", field="email")
    
    @staticmethod
    def validate_username(username: str) -> str:
        """
        Validate username format and constraints.
        
        Args:
            username: Username to validate
            
        Returns:
            Validated username
            
        Raises:
            ValidationError: If username is invalid
        """
        if not username:
            raise ValidationError("Username is required", field="username")
        
        if not DataValidator.USERNAME_PATTERN.match(username):
            raise ValidationError(
                "Username must be 3-30 characters long and contain only "
                "letters, numbers, and underscores",
                field="username"
            )
        
        # Check for reserved usernames
        reserved_usernames = {
            'admin', 'administrator', 'root', 'system', 'api', 'www',
            'mail', 'email', 'support', 'help', 'info', 'contact',
            'test', 'demo', 'guest', 'anonymous', 'null', 'undefined'
        }
        
        if username.lower() in reserved_usernames:
            raise ValidationError(
                "This username is reserved and cannot be used",
                field="username"
            )
        
        return username.lower()  # Store usernames in lowercase
    
    @staticmethod
    def validate_password(password: str, min_length: int = 8) -> str:
        """
        Validate password strength and format.
        
        Args:
            password: Password to validate
            min_length: Minimum password length
            
        Returns:
            Validated password
            
        Raises:
            ValidationError: If password is invalid
        """
        if not password:
            raise ValidationError("Password is required", field="password")
        
        if len(password) < min_length:
            raise ValidationError(
                f"Password must be at least {min_length} characters long",
                field="password"
            )
        
        # Check for common weak passwords
        weak_passwords = {
            'password', 'password123', '123456', '123456789', 'qwerty',
            'abc123', 'password1', 'admin', 'letmein', 'welcome'
        }
        
        if password.lower() in weak_passwords:
            raise ValidationError(
                "This password is too common and insecure",
                field="password"
            )
        
        # Optional: Enforce strong password policy
        if len(password) >= 8 and not DataValidator.STRONG_PASSWORD_PATTERN.match(password):
            raise ValidationError(
                "Password must contain at least one lowercase letter, "
                "one uppercase letter, one digit, and one special character",
                field="password"
            )
        
        return password
    
    @staticmethod
    def validate_string_length(
        value: str, 
        field_name: str, 
        min_length: int = 0, 
        max_length: int = 255
    ) -> str:
        """
        Validate string length constraints.
        
        Args:
            value: String value to validate
            field_name: Name of the field for error messages
            min_length: Minimum allowed length
            max_length: Maximum allowed length
            
        Returns:
            Validated string
            
        Raises:
            ValidationError: If string length is invalid
        """
        if value is None:
            if min_length > 0:
                raise ValidationError(f"{field_name} is required", field=field_name)
            return ""
        
        value = str(value).strip()
        
        if len(value) < min_length:
            raise ValidationError(
                f"{field_name} must be at least {min_length} characters long",
                field=field_name
            )
        
        if len(value) > max_length:
            raise ValidationError(
                f"{field_name} must be no more than {max_length} characters long",
                field=field_name
            )
        
        return value
    
    @staticmethod
    def validate_not_empty(value: Any, field_name: str) -> Any:
        """
        Validate that a value is not empty or None.
        
        Args:
            value: Value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Validated value
            
        Raises:
            ValidationError: If value is empty
        """
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValidationError(f"{field_name} is required", field=field_name)
        
        return value
    
    @staticmethod
    def validate_choice(
        value: Any, 
        choices: List[Any], 
        field_name: str
    ) -> Any:
        """
        Validate that a value is in the allowed choices.
        
        Args:
            value: Value to validate
            choices: List of allowed choices
            field_name: Name of the field for error messages
            
        Returns:
            Validated value
            
        Raises:
            ValidationError: If value is not in choices
        """
        if value not in choices:
            raise ValidationError(
                f"{field_name} must be one of: {', '.join(map(str, choices))}",
                field=field_name
            )
        
        return value
    
    @staticmethod
    def validate_datetime(value: Any, field_name: str) -> datetime:
        """
        Validate and convert datetime value.
        
        Args:
            value: Datetime value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Validated datetime object
            
        Raises:
            ValidationError: If datetime is invalid
        """
        if isinstance(value, datetime):
            return value
        
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                pass
        
        raise ValidationError(
            f"{field_name} must be a valid datetime",
            field=field_name
        )
    
    @staticmethod
    def validate_positive_integer(value: Any, field_name: str) -> int:
        """
        Validate that a value is a positive integer.
        
        Args:
            value: Value to validate
            field_name: Name of the field for error messages
            
        Returns:
            Validated integer
            
        Raises:
            ValidationError: If value is not a positive integer
        """
        try:
            int_value = int(value)
            if int_value <= 0:
                raise ValidationError(
                    f"{field_name} must be a positive integer",
                    field=field_name
                )
            return int_value
        except (ValueError, TypeError):
            raise ValidationError(
                f"{field_name} must be a valid integer",
                field=field_name
            )


def validate_user_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate user registration/update data.
    
    Args:
        data: Dictionary containing user data
        
    Returns:
        Dictionary with validated data
        
    Raises:
        ValidationError: If any validation fails
    """
    validated_data = {}
    
    # Validate username if present
    if 'username' in data:
        validated_data['username'] = DataValidator.validate_username(data['username'])
    
    # Validate email if present
    if 'email' in data:
        validated_data['email'] = DataValidator.validate_email_address(data['email'])
    
    # Validate password if present
    if 'password' in data:
        validated_data['password'] = DataValidator.validate_password(data['password'])
    
    return validated_data


def validate_session_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate session data.
    
    Args:
        data: Dictionary containing session data
        
    Returns:
        Dictionary with validated data
        
    Raises:
        ValidationError: If any validation fails
    """
    validated_data = {}
    
    # Validate user_id if present
    if 'user_id' in data:
        validated_data['user_id'] = DataValidator.validate_positive_integer(
            data['user_id'], 'user_id'
        )
    
    # Validate expires_at if present
    if 'expires_at' in data:
        validated_data['expires_at'] = DataValidator.validate_datetime(
            data['expires_at'], 'expires_at'
        )
    
    return validated_data