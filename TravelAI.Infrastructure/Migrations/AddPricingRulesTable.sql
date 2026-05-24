-- Migration: Add PricingRules table
-- Date: 2026-05-16

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PricingRules]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PricingRules] (
        [RuleId] INT IDENTITY(1,1) NOT NULL,
        [ServiceId] INT NOT NULL,
        [StartDate] DATETIME2 NOT NULL,
        [EndDate] DATETIME2 NOT NULL,
        [PriceMultiplier] DECIMAL(18,2) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_PricingRules] PRIMARY KEY CLUSTERED ([RuleId] ASC),
        CONSTRAINT [FK_PricingRules_Services_ServiceId] FOREIGN KEY([ServiceId])
            REFERENCES [dbo].[Services] ([ServiceId])
            ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_PricingRules_ServiceId] 
    ON [dbo].[PricingRules]([ServiceId] ASC);

    CREATE NONCLUSTERED INDEX [IX_PricingRules_DateRange] 
    ON [dbo].[PricingRules]([StartDate] ASC, [EndDate] ASC);
END
GO
