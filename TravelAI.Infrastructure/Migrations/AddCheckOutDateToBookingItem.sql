-- Migration: Add CheckOutDate column to BookingItems table
-- Purpose: Support multi-day rental for Transport services (car/motorbike rental)
-- Date: 2026-05-19

-- Add CheckOutDate column (nullable for backward compatibility)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[BookingItems]') 
    AND name = 'CheckOutDate'
)
BEGIN
    ALTER TABLE [dbo].[BookingItems]
    ADD [CheckOutDate] DATETIME2 NULL;
    
    PRINT 'Added CheckOutDate column to BookingItems table';
END
ELSE
BEGIN
    PRINT 'CheckOutDate column already exists in BookingItems table';
END
GO

-- Add index for better query performance on date range searches
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_BookingItems_CheckInDate_CheckOutDate' 
    AND object_id = OBJECT_ID(N'[dbo].[BookingItems]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BookingItems_CheckInDate_CheckOutDate]
    ON [dbo].[BookingItems] ([CheckInDate], [CheckOutDate])
    INCLUDE ([ServiceId], [Quantity]);
    
    PRINT 'Created index IX_BookingItems_CheckInDate_CheckOutDate';
END
ELSE
BEGIN
    PRINT 'Index IX_BookingItems_CheckInDate_CheckOutDate already exists';
END
GO

PRINT 'Migration completed successfully';
