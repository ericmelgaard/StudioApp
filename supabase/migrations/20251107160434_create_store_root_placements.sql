/*
  # Create Store Root Placements for All Stores

  1. Creates Root Placements
    - Generate a root placement_group for each store in the stores table
    - Set is_store_root to true for these entries
    - Link via store_id foreign key
    - Use store name as the placement name
    - Preserve all existing placement configuration options

  2. Handle Existing Demo Placement
    - Update the '36355 - WAND Digital Demo' placement to be a store root
    - Find or create a matching store for it

  3. Seed American Airlines Lounges Stores
    - Create store root placements for American Airlines Lounges locations
    - Set appropriate timezone based on location
*/

-- First, create a store for the demo placement if it doesn't exist
INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key)
SELECT 99999, '36355 - WAND Digital Demo', 2156, 1, 8, 16, '', 2156, 316
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id = 99999);

-- Update the existing demo placement to be a store root
UPDATE placement_groups 
SET 
  store_id = 99999,
  is_store_root = true,
  timezone = 'America/Chicago',
  address = '123 Demo Street, Dallas, TX 75201'
WHERE name = '36355 - WAND Digital Demo' AND store_id IS NULL;

-- Create root placements for all existing stores that don't have one
INSERT INTO placement_groups (
  name,
  description,
  store_id,
  is_store_root,
  parent_id,
  daypart_hours,
  meal_stations,
  templates,
  nfc_url,
  timezone,
  address
)
SELECT 
  s.name || ' - Store Root',
  'Root placement for ' || s.name,
  s.id,
  true,
  NULL,
  '{}'::jsonb,
  ARRAY[]::text[],
  '{}'::jsonb,
  NULL,
  'America/New_York', -- Default timezone, can be updated per store
  NULL -- Address can be populated later
FROM stores s
WHERE NOT EXISTS (
  SELECT 1 
  FROM placement_groups pg 
  WHERE pg.store_id = s.id AND pg.is_store_root = true
)
AND s.id != 99999; -- Skip the demo store as it's already handled

-- Add some sample American Airlines Lounge stores with appropriate data
DO $$
DECLARE
  aa_lounges_company_id bigint := 2156;
  aa_concept_id bigint := 316;
BEGIN
  -- DFW American Airlines Admirals Club
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = 1000001) THEN
    INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key)
    VALUES (1000001, 'DFW Admirals Club - Terminal A', aa_lounges_company_id, 1, 8, 16, '', aa_lounges_company_id, aa_concept_id);
    
    INSERT INTO placement_groups (name, description, store_id, is_store_root, timezone, address, phone)
    VALUES (
      'DFW Admirals Club - Terminal A',
      'American Airlines Admirals Club at DFW Terminal A',
      1000001,
      true,
      'America/Chicago',
      'DFW Airport Terminal A, Gate A18, Dallas, TX 75261',
      '(972) 574-8888'
    );
  END IF;

  -- ORD American Airlines Flagship Lounge
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = 1000002) THEN
    INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key)
    VALUES (1000002, 'ORD Flagship Lounge - Terminal 3', aa_lounges_company_id, 1, 8, 16, '', aa_lounges_company_id, aa_concept_id);
    
    INSERT INTO placement_groups (name, description, store_id, is_store_root, timezone, address, phone)
    VALUES (
      'ORD Flagship Lounge - Terminal 3',
      'American Airlines Flagship Lounge at Chicago O''Hare Terminal 3',
      1000002,
      true,
      'America/Chicago',
      'O''Hare Airport Terminal 3, Gate H6, Chicago, IL 60666',
      '(773) 686-2999'
    );
  END IF;

  -- LAX American Airlines Flagship Lounge
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = 1000003) THEN
    INSERT INTO stores (id, name, company_id, privilege_level, parent_level, domain_level, group_type_string, parent_key, grand_parent_key)
    VALUES (1000003, 'LAX Flagship Lounge - Terminal 4', aa_lounges_company_id, 1, 8, 16, '', aa_lounges_company_id, aa_concept_id);
    
    INSERT INTO placement_groups (name, description, store_id, is_store_root, timezone, address, phone)
    VALUES (
      'LAX Flagship Lounge - Terminal 4',
      'American Airlines Flagship Lounge at LAX Terminal 4',
      1000003,
      true,
      'America/Los_Angeles',
      'Los Angeles Airport Terminal 4, near Gate 41, Los Angeles, CA 90045',
      '(310) 646-5252'
    );
  END IF;
END $$;