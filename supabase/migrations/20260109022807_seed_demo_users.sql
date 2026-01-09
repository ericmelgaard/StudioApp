/*
  # Seed Demo Users

  1. New Users
    - Admin User (admin@wanddigital.com)
      - Full access to all locations
      - Role: admin
    - Creator User (creator@wanddigital.com)
      - Access to Auntie Anne's concept (15 stores)
      - Role: creator
    - Operator User (operator@wanddigital.com)
      - Access to two specific stores under Wand Demos
      - Role: operator

  2. Store Access Configuration
    - Operator gets access to stores 1003023 and 1003024 via user_store_access
    - Creator gets concept-level access to Auntie Anne's
    - Admin has unrestricted access

  3. Notes
    - Uses fixed UUIDs for easy role-based lookup
    - All users are active by default
    - Operator demonstrates multi-store access pattern
*/

-- Insert demo users into user_profiles
INSERT INTO user_profiles (id, email, role, display_name, concept_id, company_id, store_id, status, created_at)
VALUES
  -- Admin User: Full access, no restrictions
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@wanddigital.com',
    'admin',
    'Admin User',
    NULL,
    NULL,
    NULL,
    'active',
    '2025-01-07T00:00:00Z'
  ),
  -- Creator User: Concept-level access to Auntie Anne's
  (
    '00000000-0000-0000-0000-000000000003',
    'creator@wanddigital.com',
    'creator',
    'Creator User',
    (SELECT id FROM concepts WHERE name = 'Auntie Anne''s' LIMIT 1),
    NULL,
    NULL,
    'active',
    '2025-01-07T00:00:00Z'
  ),
  -- Operator User: Multi-store access via user_store_access table
  (
    '00000000-0000-0000-0000-000000000002',
    'operator@wanddigital.com',
    'operator',
    'Operator User',
    NULL,
    NULL,
    NULL,
    'active',
    '2025-01-07T00:00:00Z'
  )
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  concept_id = EXCLUDED.concept_id,
  company_id = EXCLUDED.company_id,
  store_id = EXCLUDED.store_id,
  status = EXCLUDED.status;

-- Set up operator's multi-store access to Wand Demo stores
-- Store 1003023: Dairy Queen Demo
-- Store 1003024: Eurest Demo
INSERT INTO user_store_access (user_id, store_id, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', 1003023, now()),
  ('00000000-0000-0000-0000-000000000002', 1003024, now())
ON CONFLICT (user_id, store_id) DO NOTHING;
