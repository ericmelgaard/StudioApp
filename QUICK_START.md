# Quick Start: New Migration Workflow

## The Rule

**Never create a new database.** Always ALTER the existing one.

Your database is locked at: `https://igqlyqbhbqmxcksiuzix.supabase.co`

## Add a Column (Most Common Task)

```bash
# 1. Create migration file
npm run db:new "add my_column to my_table"

# 2. Edit the file in supabase/migrations/
# Example:
ALTER TABLE my_table
  ADD COLUMN IF NOT EXISTS my_column text DEFAULT '';

# 3. Apply it
node scripts/apply-migration-mcp.js FILENAME.sql
# Then use the MCP tool with the output

# 4. Verify
npm run db:verify
```

## Daily Commands

```bash
npm run db:verify          # Check database state
npm run db:lock            # Verify environment hasn't changed
npm run db:list            # List applied migrations
npm run db:new "desc"      # Create new migration
```

## Templates

Copy from `scripts/migration-templates/`:
- `add-column-template.sql`
- `add-table-template.sql`

## What Changed

**Before:**
- Need column → New database → Change .env → Migrate → Problems → Revert → Repeat

**Now:**
- Need column → ALTER TABLE → Done

## Important Files

- `MIGRATION_WORKFLOW.md` - Complete documentation
- `.env.lock` - Locked database URL
- `scripts/` - All workflow tools

## Environment Protection

The app will now warn you in the console if the database URL changes unexpectedly. This prevents accidental data loss from switching databases.

## Test Results

✅ Test migration applied successfully
✅ Column `workflow_test_column` added to products table
✅ Environment locked and verified
✅ 6 migrations now in database (was 5)

## Need Help?

Read `MIGRATION_WORKFLOW.md` for complete details, examples, and troubleshooting.

**The core principle: Your .env file never changes. The database evolves in place.**
