-- ==============================================================================
-- Migration: 01_create_users_table
-- Description: Creates the system_users table to handle dynamic authentication.
-- ==============================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[system_users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[system_users] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(50) NOT NULL UNIQUE,
        [password_hash] NVARCHAR(255) NOT NULL,
        [full_name] NVARCHAR(150) NOT NULL,
        [department] NVARCHAR(100) NOT NULL,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'sales',
        [created_at] DATETIME DEFAULT GETDATE(),
        [last_login] DATETIME NULL
    );

    PRINT 'system_users table created.';
END
ELSE
BEGIN
    PRINT 'system_users table already exists.';
END
GO
