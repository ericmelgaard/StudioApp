# CCGS Import Complete Guide

## Overview

CCGS (Central Content & Graphics System) import is ready. This will populate your database with **6,159 records**:
- **192 concepts** (restaurant brands like Wendy's, Starbucks, Subway, etc.)
- **1,395 companies** (franchise operators and corporate entities)
- **4,572 stores** (individual restaurant locations)

## Files Ready

✅ Schema migration already applied (adds `ccgs_key` fields)
✅ Import SQL generated and ready to apply:

- `import_concepts.sql` (9.5 KB) - 192 concepts
- `import_companies.sql` (80.5 KB) - 1,395 companies
- `import_stores.sql` (337.6 KB) - 4,572 stores
- `ccgs_import_final.sql` (427.7 KB) - All three combined

## How to Apply (3 Simple Steps)

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **SQL Editor**
3. Click **New Query**

### Step 2: Run Each Import

**Option A: Import All at Once** (Recommended)

1. Open `ccgs_import_final.sql`
2. Copy the entire contents
3. Paste into SQL Editor
4. Click **Run**
5. Wait 1-2 minutes

**Option B: Import Separately** (If Option A fails)

Run each file in order:

1. First: `import_concepts.sql`
2. Then: `import_companies.sql`
3. Finally: `import_stores.sql`

### Step 3: Validate

Run this command:
```bash
node validate-ccgs.cjs
```

Expected output:
```
✅ Concepts: 192 records
✅ Companies: 1,395 records
✅ Stores: 4,572 records
🎉 All CCGS data imported successfully!
```

## What the Import Does

### Safe & Smart
- **Updates existing** records if they match by name
- **Inserts new** records that don't exist yet
- **Only populates ccgs_key** if it's currently NULL
- **Generates IDs** automatically for new records
- **Idempotent** - safe to run multiple times

### Data Added
Each import adds these fields:
- `ccgs_key` - Unique CCGS identifier
- `privilege_level` - Access level in CCGS
- `parent_level` - Hierarchy level
- `domain_level` - Domain classification
- `group_type_string` - Group type identifier
- `parent_key` - Reference to parent entity
- `grand_parent_key` - (stores only) Reference to grandparent

## Validation Queries

Check the data in Supabase Dashboard:

```sql
-- Count records with CCGS keys
SELECT COUNT(*) FROM concepts WHERE ccgs_key IS NOT NULL;  -- Should be 192
SELECT COUNT(*) FROM companies WHERE ccgs_key IS NOT NULL; -- Should be 1,395
SELECT COUNT(*) FROM stores WHERE ccgs_key IS NOT NULL;    -- Should be 4,572

-- View sample data
SELECT name, ccgs_key, parent_key FROM concepts WHERE ccgs_key IS NOT NULL LIMIT 10;
SELECT name, ccgs_key, parent_key FROM companies WHERE ccgs_key IS NOT NULL LIMIT 10;
SELECT name, ccgs_key, parent_key, grand_parent_key FROM stores WHERE ccgs_key IS NOT NULL LIMIT 10;

-- Find specific brands
SELECT * FROM concepts WHERE name LIKE '%Wendy%';
SELECT * FROM concepts WHERE name LIKE '%Starbucks%';
SELECT * FROM concepts WHERE name LIKE '%Subway%';
```

## Troubleshooting

### Import seems stuck
- Large imports take 1-2 minutes
- Check browser console for errors
- Check Supabase logs

### Partial import
- Run validation to see what's missing
- Safe to re-run any import file
- It will fill in gaps without duplicating

### Need to start over
Run this to clear all CCGS data:

```sql
UPDATE concepts SET ccgs_key = NULL, privilege_level = NULL, parent_level = NULL,
  domain_level = NULL, group_type_string = NULL, parent_key = NULL
WHERE ccgs_key IS NOT NULL;

UPDATE companies SET ccgs_key = NULL, privilege_level = NULL, parent_level = NULL,
  domain_level = NULL, group_type_string = NULL, parent_key = NULL
WHERE ccgs_key IS NOT NULL;

UPDATE stores SET ccgs_key = NULL, privilege_level = NULL, parent_level = NULL,
  domain_level = NULL, group_type_string = NULL, parent_key = NULL,
  grand_parent_key = NULL
WHERE ccgs_key IS NOT NULL;
```

Then re-run the imports.

## File Sizes

| File | Size | Records |
|------|------|---------|
| import_concepts.sql | 9.5 KB | 192 |
| import_companies.sql | 80.5 KB | 1,395 |
| import_stores.sql | 337.6 KB | 4,572 |
| **Total** | **427.7 KB** | **6,159** |

## After Import

Once validated:
- CCGS keys link your database to the central system
- You can match records by `ccgs_key` for synchronization
- All hierarchical relationships are preserved via `parent_key` and `grand_parent_key`

## Support

If you encounter any issues:
1. Check validation queries above
2. Review Supabase logs
3. Try importing files separately instead of combined
4. Check that schema migration was applied (ccgs_key fields exist)
