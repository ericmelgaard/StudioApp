# Database Migration Workflow

## The Problem We Solved

Previously, adding a new column to a table would trigger a cycle of:
1. Creating a new Supabase database
2. Changing environment variables
3. Migrating data
4. Problems arise
5. Revert and repeat

This caused constant instability, data loss risks, and made it impossible to maintain continuity.

## The New Standard

**One database, forever.** Schema changes are applied IN-PLACE using ALTER TABLE migrations.

Your database URL is now locked: `https://igqlyqbhbqmxcksiuzix.supabase.co`

## Core Principles

1. **Never create a new database for schema changes**
2. **Always use ALTER TABLE to add columns**
3. **Always use IF NOT EXISTS for safety**
4. **Environment variables never change**
5. **Data stays in one place and grows over time**

## How to Add a Column (The Standard Process)

### Step 1: Create Migration File

```bash
cd scripts
node migration-helpers.js new "add column_name to table_name"
```

This creates a timestamped file in `supabase/migrations/`

### Step 2: Edit the Migration

Open the new file and write your SQL:

```sql
/*
  # Add column_name to table_name

  1. Changes
    - Add column_name column to table_name table

  2. Security
    - Maintains existing RLS policies
*/

ALTER TABLE table_name
  ADD COLUMN IF NOT EXISTS column_name text DEFAULT '';

COMMENT ON COLUMN table_name.column_name IS 'Description of this column';
```

### Step 3: Apply the Migration

Use the MCP tool approach:

```bash
node apply-migration-mcp.js FILENAME.sql
```

Then use the output with the `mcp__supabase__apply_migration` tool.

Or test locally first if you have direct access:

```bash
node apply-single-migration.js FILENAME.sql
```

### Step 4: Verify

```bash
node verify-database-state.js
```

This shows:
- Applied migrations
- Current tables
- Any unapplied migrations

## Migration Templates

Templates are available in `scripts/migration-templates/`:

- `add-column-template.sql` - For adding columns
- `add-table-template.sql` - For creating tables

Copy and customize these for your needs.

## Environment Lock

### Lock Your Environment

Prevent accidental database switches:

```bash
cd scripts
node lock-environment.js create
```

This creates `.env.lock` with your current database URL.

### Verify Environment Stability

Before important work:

```bash
node lock-environment.js verify
```

If the database URL changed, you'll get an error.

### View Lock Info

```bash
node lock-environment.js info
```

## Current Database State

As of implementation:
- **Database URL:** `https://igqlyqbhbqmxcksiuzix.supabase.co`
- **Applied Migrations:** 5
- **Tables:** 13
- **Migration Files:** 144 (139 unapplied legacy files)

## The 144 Migration Files Situation

You have 144 migration files on disk, but only 5 are applied to the database. This is because:

1. The database was recently created from a backup
2. Only the most recent schema-creation migrations were applied
3. The older 139 files represent the chaotic history of database switching

**What to do about this:**

1. **Do nothing for now** - The database has the correct schema
2. **Archive old migrations** - Move unapplied files to `supabase/migrations/archive/`
3. **Clean slate option** - Generate fresh migrations from current schema
4. **Going forward** - All new migrations start from this point

The important part: **Stop the cycle of creating new databases.**

## Migration Workflow Scripts

All scripts are in the `scripts/` directory:

| Script | Purpose |
|--------|---------|
| `migration-helpers.js` | Create new migrations, list applied |
| `verify-database-state.js` | Check what's applied vs on disk |
| `apply-single-migration.js` | Apply one migration file |
| `apply-migration-mcp.js` | Prepare migration for MCP tool |
| `lock-environment.js` | Lock and verify database URL |

## Best Practices

### DO:
- ✅ Add columns with `IF NOT EXISTS`
- ✅ Make new columns nullable or have defaults
- ✅ Use descriptive migration names
- ✅ Test migrations locally first
- ✅ Keep the same database URL forever
- ✅ Add comments to document columns
- ✅ Verify environment before major work

### DON'T:
- ❌ Create new Supabase projects for schema changes
- ❌ Change environment variables
- ❌ Drop and recreate tables (use ALTER instead)
- ❌ Make columns NOT NULL without defaults
- ❌ Skip migration files
- ❌ Apply migrations manually without recording them

## Example: Common Scenarios

### Adding a nullable column:
```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subtitle text;
```

### Adding a column with default:
```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

### Adding a required column safely:
```sql
-- Step 1: Add nullable column
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id uuid;

-- Step 2: Backfill data (if needed)
UPDATE products SET category_id = 'some-default-uuid' WHERE category_id IS NULL;

-- Step 3: Make it required (optional, in a future migration)
-- ALTER TABLE products ALTER COLUMN category_id SET NOT NULL;
```

### Adding an indexed column:
```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku text;

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
```

## Troubleshooting

### "Migration already applied"
Check `schema_migrations` table in Supabase to see what's recorded.

### "Database URL changed"
1. Check `.env` file
2. Run `node lock-environment.js verify`
3. Restore correct URL if changed
4. Investigate how/why it changed

### "RLS policy error"
Ensure your migration maintains existing RLS policies. Don't drop tables - use ALTER.

### "Too many unapplied migrations"
This is the legacy of the old workflow. Archive them:
```bash
mv supabase/migrations/[old-file].sql supabase/migrations/archive/
```

## Package.json Scripts

Add these to your package.json for convenience:

```json
{
  "scripts": {
    "db:verify": "node scripts/verify-database-state.js",
    "db:lock": "node scripts/lock-environment.js verify",
    "db:new": "node scripts/migration-helpers.js new",
    "db:apply": "node scripts/apply-single-migration.js"
  }
}
```

## Summary

**The new workflow is simple:**

1. Need a column? Write a migration with ALTER TABLE
2. Apply it to the existing database
3. Continue working
4. Never change the database URL

**The database URL is permanent:** `https://igqlyqbhbqmxcksiuzix.supabase.co`

This ends the cycle of database switching and brings stability to your development process.
