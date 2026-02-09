/*
  # Allow Public Access to Board Content

  ## Overview
  Adds public access policies for board_content table to allow unauthenticated users
  to insert, update, and delete board content. This is needed for the demo/public
  access mode of the theme builder.

  ## Changes
    - Add public INSERT policy for board_content
    - Add public UPDATE policy for board_content
    - Add public DELETE policy for board_content

  ## Security
    - These policies are intentionally permissive for demo purposes
    - In production, these should be restricted based on user authentication
*/

-- Allow public insert access to board_content
CREATE POLICY "Allow public insert access to board content"
  ON board_content FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public update access to board_content
CREATE POLICY "Allow public update access to board content"
  ON board_content FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow public delete access to board_content
CREATE POLICY "Allow public delete access to board content"
  ON board_content FOR DELETE
  TO public
  USING (true);
