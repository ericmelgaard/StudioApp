/*
  # User Management System Enhancements

  1. Schema Changes
    - Add `status` field to user_profiles (active, inactive, pending)
    - Add `last_login_at` timestamp field
    - Add `created_by` field to track who created the user
    - Create audit_logs table for tracking user changes
    - Add indexes for performance

  2. Audit Logging
    - Track all user profile changes
    - Track role and scope modifications
    - Store actor (who made the change) and timestamp

  3. Security
    - Update RLS policies for audit logs
    - Ensure only admins can view audit logs
*/

-- Add status and tracking fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_login_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN created_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES user_profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON user_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing audit_logs policies if they exist
DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Create RLS policies for audit_logs
CREATE POLICY "Admins can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to log user profile changes
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      user_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      auth.uid(),
      'user_profile_updated',
      'user_profile',
      NEW.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      new_values
    ) VALUES (
      NEW.id,
      auth.uid(),
      'user_profile_created',
      'user_profile',
      NEW.id::text,
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user profile changes
DROP TRIGGER IF EXISTS user_profile_changes_trigger ON user_profiles;
CREATE TRIGGER user_profile_changes_trigger
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_profile_changes();

-- Create function to update last_login_at
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_login_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing demo users to have active status
UPDATE user_profiles
SET status = 'active'
WHERE status IS NULL;