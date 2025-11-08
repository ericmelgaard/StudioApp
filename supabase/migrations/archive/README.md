# Archived Migrations

This folder contains duplicate migration files that were archived on 2025-11-08.

## What's Here

These are migration files with two timestamps in their filenames (e.g., `20251022152607_20251021235308_...`), indicating they were re-runs of earlier migrations during development.

## Why Archived

- **23 duplicate migrations** were moved here to clean up the migrations folder
- These files are **not needed** for database operation
- They represent re-application of migrations during development iterations
- The original migrations remain in the parent folder

## Safety

- All data is backed up in `backup-complete-2025-11-08T15-17-01/`
- Original migrations are preserved in the parent directory
- Database schema is unchanged
- These files can be safely deleted if needed, but are kept for historical reference

## If You Need To Restore

These files are reference only. The active migrations in the parent folder contain the complete schema history.
