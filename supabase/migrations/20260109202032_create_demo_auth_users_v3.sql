/*
  # Create Demo Auth Users

  1. Purpose
    - Create actual Supabase auth.users entries for demo accounts
    - Ensures auth.uid() works properly for RLS policies
    - Uses fixed UUIDs matching user_profiles entries

  2. Demo Users
    - admin@wanddigital.com (UUID: 00000000-0000-0000-0000-000000000001)
    - operator@wanddigital.com (UUID: 00000000-0000-0000-0000-000000000002)
    - creator@wanddigital.com (UUID: 00000000-0000-0000-0000-000000000003)
    - Password for all: demo123456

  3. Security Notes
    - These are demo accounts only
    - All use the same simple password for easy testing
    - In production, proper authentication should be enforced
*/

DO $$
DECLARE
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  operator_id uuid := '00000000-0000-0000-0000-000000000002';
  creator_id uuid := '00000000-0000-0000-0000-000000000003';
  encrypted_pw text;
BEGIN
  -- Generate encrypted password for 'demo123456'
  encrypted_pw := crypt('demo123456', gen_salt('bf'));

  -- Insert admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
  VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@wanddigital.com',
    encrypted_pw,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Admin User"}',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now();

  -- Insert operator user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
  VALUES (
    operator_id,
    '00000000-0000-0000-0000-000000000000',
    'operator@wanddigital.com',
    encrypted_pw,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Operator User"}',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now();

  -- Insert creator user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
  VALUES (
    creator_id,
    '00000000-0000-0000-0000-000000000000',
    'creator@wanddigital.com',
    encrypted_pw,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Creator User"}',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now();

  -- Delete existing identities if they exist
  DELETE FROM auth.identities WHERE user_id IN (admin_id, operator_id, creator_id);

  -- Create identity records for email auth
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES
    (
      gen_random_uuid(),
      admin_id,
      admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@wanddigital.com'),
      'email',
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      operator_id,
      operator_id::text,
      jsonb_build_object('sub', operator_id::text, 'email', 'operator@wanddigital.com'),
      'email',
      now(),
      now(),
      now()
    ),
    (
      gen_random_uuid(),
      creator_id,
      creator_id::text,
      jsonb_build_object('sub', creator_id::text, 'email', 'creator@wanddigital.com'),
      'email',
      now(),
      now(),
      now()
    );

END $$;