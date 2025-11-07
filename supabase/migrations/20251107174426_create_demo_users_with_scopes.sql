/*
  # Create Demo Users with Location Scopes

  1. Demo Users
    - Admin: Full access (no location restrictions)
    - Operator: Scoped to American Airlines Lounges company (ID 2156)
    - Creator: Scoped to Auntie Anne's concept (ID 54)
*/

-- Admin user - Full access (no location restrictions)
INSERT INTO user_profiles (id, email, role, display_name, concept_id, company_id, store_id)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@wanddigital.com',
  'admin',
  'Admin User',
  NULL,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  concept_id = EXCLUDED.concept_id,
  company_id = EXCLUDED.company_id,
  store_id = EXCLUDED.store_id;

-- Operator user - Scoped to American Airlines Lounges company (ID 2156)
INSERT INTO user_profiles (id, email, role, display_name, concept_id, company_id, store_id)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'operator@wanddigital.com',
  'operator',
  'Operator User',
  NULL,
  2156,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  concept_id = EXCLUDED.concept_id,
  company_id = EXCLUDED.company_id,
  store_id = EXCLUDED.store_id;

-- Creator user - Scoped to Auntie Anne's concept (ID 54)
INSERT INTO user_profiles (id, email, role, display_name, concept_id, company_id, store_id)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'creator@wanddigital.com',
  'creator',
  'Creator User',
  54,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  concept_id = EXCLUDED.concept_id,
  company_id = EXCLUDED.company_id,
  store_id = EXCLUDED.store_id;