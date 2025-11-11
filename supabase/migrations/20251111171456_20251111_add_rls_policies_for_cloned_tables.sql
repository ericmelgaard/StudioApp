-- RLS Policies for all tables (open for demo - allows anon access)

-- Concepts policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepts' AND policyname = 'Anyone can view concepts') THEN
    CREATE POLICY "Anyone can view concepts" ON concepts FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepts' AND policyname = 'Anyone can insert concepts') THEN
    CREATE POLICY "Anyone can insert concepts" ON concepts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepts' AND policyname = 'Anyone can update concepts') THEN
    CREATE POLICY "Anyone can update concepts" ON concepts FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Companies policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can view companies') THEN
    CREATE POLICY "Anyone can view companies" ON companies FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can insert companies') THEN
    CREATE POLICY "Anyone can insert companies" ON companies FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can update companies') THEN
    CREATE POLICY "Anyone can update companies" ON companies FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Stores policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can view stores') THEN
    CREATE POLICY "Anyone can view stores" ON stores FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can insert stores') THEN
    CREATE POLICY "Anyone can insert stores" ON stores FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Anyone can update stores') THEN
    CREATE POLICY "Anyone can update stores" ON stores FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- User profiles policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Anyone can view user_profiles') THEN
    CREATE POLICY "Anyone can view user_profiles" ON user_profiles FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Anyone can insert user_profiles') THEN
    CREATE POLICY "Anyone can insert user_profiles" ON user_profiles FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Anyone can update user_profiles') THEN
    CREATE POLICY "Anyone can update user_profiles" ON user_profiles FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Placement groups policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'placement_groups' AND policyname = 'Anyone can view placement_groups') THEN
    CREATE POLICY "Anyone can view placement_groups" ON placement_groups FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'placement_groups' AND policyname = 'Anyone can insert placement_groups') THEN
    CREATE POLICY "Anyone can insert placement_groups" ON placement_groups FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'placement_groups' AND policyname = 'Anyone can update placement_groups') THEN
    CREATE POLICY "Anyone can update placement_groups" ON placement_groups FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Product templates policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_templates' AND policyname = 'Anyone can view product_templates') THEN
    CREATE POLICY "Anyone can view product_templates" ON product_templates FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_templates' AND policyname = 'Anyone can insert product_templates') THEN
    CREATE POLICY "Anyone can insert product_templates" ON product_templates FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_templates' AND policyname = 'Anyone can update product_templates') THEN
    CREATE POLICY "Anyone can update product_templates" ON product_templates FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- WAND integration sources policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wand_integration_sources' AND policyname = 'Anyone can view wand_integration_sources') THEN
    CREATE POLICY "Anyone can view wand_integration_sources" ON wand_integration_sources FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wand_integration_sources' AND policyname = 'Anyone can insert wand_integration_sources') THEN
    CREATE POLICY "Anyone can insert wand_integration_sources" ON wand_integration_sources FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wand_integration_sources' AND policyname = 'Anyone can update wand_integration_sources') THEN
    CREATE POLICY "Anyone can update wand_integration_sources" ON wand_integration_sources FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Integration source configs policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_source_configs' AND policyname = 'Anyone can view integration_source_configs') THEN
    CREATE POLICY "Anyone can view integration_source_configs" ON integration_source_configs FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_source_configs' AND policyname = 'Anyone can insert integration_source_configs') THEN
    CREATE POLICY "Anyone can insert integration_source_configs" ON integration_source_configs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_source_configs' AND policyname = 'Anyone can update integration_source_configs') THEN
    CREATE POLICY "Anyone can update integration_source_configs" ON integration_source_configs FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Integration products policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_products' AND policyname = 'Anyone can view integration_products') THEN
    CREATE POLICY "Anyone can view integration_products" ON integration_products FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_products' AND policyname = 'Anyone can insert integration_products') THEN
    CREATE POLICY "Anyone can insert integration_products" ON integration_products FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_products' AND policyname = 'Anyone can update integration_products') THEN
    CREATE POLICY "Anyone can update integration_products" ON integration_products FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Integration modifiers policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_modifiers' AND policyname = 'Anyone can view integration_modifiers') THEN
    CREATE POLICY "Anyone can view integration_modifiers" ON integration_modifiers FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_modifiers' AND policyname = 'Anyone can insert integration_modifiers') THEN
    CREATE POLICY "Anyone can insert integration_modifiers" ON integration_modifiers FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_modifiers' AND policyname = 'Anyone can update integration_modifiers') THEN
    CREATE POLICY "Anyone can update integration_modifiers" ON integration_modifiers FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Integration discounts policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_discounts' AND policyname = 'Anyone can view integration_discounts') THEN
    CREATE POLICY "Anyone can view integration_discounts" ON integration_discounts FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_discounts' AND policyname = 'Anyone can insert integration_discounts') THEN
    CREATE POLICY "Anyone can insert integration_discounts" ON integration_discounts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_discounts' AND policyname = 'Anyone can update integration_discounts') THEN
    CREATE POLICY "Anyone can update integration_discounts" ON integration_discounts FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Integration formatters policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_formatters' AND policyname = 'Anyone can view integration_formatters') THEN
    CREATE POLICY "Anyone can view integration_formatters" ON integration_formatters FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_formatters' AND policyname = 'Anyone can insert integration_formatters') THEN
    CREATE POLICY "Anyone can insert integration_formatters" ON integration_formatters FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integration_formatters' AND policyname = 'Anyone can update integration_formatters') THEN
    CREATE POLICY "Anyone can update integration_formatters" ON integration_formatters FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Products policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Anyone can view products') THEN
    CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Anyone can insert products') THEN
    CREATE POLICY "Anyone can insert products" ON products FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Anyone can update products') THEN
    CREATE POLICY "Anyone can update products" ON products FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
