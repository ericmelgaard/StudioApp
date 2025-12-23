/*
  # Update Violet Color Definitions

  Per project preferences, violet/indigo/purple colors should not be used.
  Replace any existing violet colors with blue alternative.
*/

UPDATE daypart_definitions
SET color = 'bg-blue-100 text-blue-800 border-blue-300'
WHERE color LIKE '%violet%' OR color LIKE '%purple%' OR color LIKE '%indigo%';