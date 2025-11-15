/*
  # Update French Translation Policy to Check fr-CA

  ## Changes
  - Update `check_french_translation_policy` function to check for `translations_fr_ca` instead of `translations_fr_fr`
  - This aligns with the actual locale used in the system (French-Canadian)
*/

-- Update function to check French-Canadian translation policy
CREATE OR REPLACE FUNCTION check_french_translation_policy(product_attributes jsonb)
RETURNS jsonb AS $$
DECLARE
  fr_translations jsonb;
  fr_name text;
  result jsonb;
BEGIN
  -- Check for translations_fr_ca key (French-Canadian)
  fr_translations := product_attributes->'translations_fr_ca';

  -- If translations_fr_ca doesn't exist or is null
  IF fr_translations IS NULL THEN
    result := jsonb_build_object(
      'status', 'violation',
      'missing_fields', jsonb_build_array('translations_fr_ca.name'),
      'message', 'French translation for name is missing'
    );
    RETURN result;
  END IF;

  -- Check if name field exists in French translations
  fr_name := fr_translations->>'name';

  IF fr_name IS NULL OR fr_name = '' THEN
    result := jsonb_build_object(
      'status', 'violation',
      'missing_fields', jsonb_build_array('translations_fr_ca.name'),
      'message', 'French translation for name is empty or missing'
    );
    RETURN result;
  END IF;

  -- All checks passed
  result := jsonb_build_object(
    'status', 'compliant',
    'message', 'French translation for name exists'
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
