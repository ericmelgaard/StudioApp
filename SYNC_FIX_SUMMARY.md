# Integration Sync Error Fix Summary

## Problem
Sync operation was failing with error:
```
Sync failed: Save failed: {"success":false,"error":"Failed to insert products: there is no unique or exclusion constraint matching the ON CONFLICT specification","error_code":"SAVE_ERROR"}
```

## Root Cause
The `save-integration-data` edge function uses `upsert` with `onConflict` on specific column combinations, but the required unique constraints were missing from the database tables.

## Solution Applied

### Added Unique Constraints

**integration_products:**
- ✅ Added `wand_source_id` column
- ✅ Created unique constraint on `(wand_source_id, external_id)`
- ✅ Created unique constraint on `(source_id, external_id)` for backward compatibility

**integration_modifiers:**
- ✅ Added `wand_source_id` column  
- ✅ Added `path_id` column
- ✅ Created unique constraint on `(wand_source_id, external_id, path_id)`

**integration_discounts:**
- ✅ Added `wand_source_id` column
- ✅ Created unique constraint on `(wand_source_id, external_id)`

### Performance Indexes Added
- `idx_integration_products_wand_source`
- `idx_integration_products_external_id`
- `idx_integration_products_last_synced`
- `idx_integration_modifiers_wand_source`
- `idx_integration_modifiers_external_id`
- `idx_integration_discounts_wand_source`
- `idx_integration_discounts_external_id`

## How It Works Now

The edge function `save-integration-data` can now:
1. **Insert new items** when they don't exist
2. **Update existing items** when the same `(wand_source_id, external_id)` combination is encountered
3. **Handle incremental syncs** without creating duplicates
4. **Track sync timestamps** via `last_synced_at` column

## Expected Behavior

When you click "Sync now" on QU POs (or any integration):
- ✅ First sync: Creates new records
- ✅ Subsequent syncs: Updates existing records with fresh data
- ✅ No duplicate entries for the same external item
- ✅ Proper error handling and sync history tracking

## Testing Recommendations

1. Try syncing QU POs again from Integration Access page
2. Verify sync completes without errors
3. Check Integration Sync History to confirm success status
4. Run another sync to verify upsert behavior (should update existing records)

## Migration File
`supabase/migrations/add_unique_constraints_to_integration_tables.sql`
