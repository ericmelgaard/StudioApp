import { supabase } from './supabase';
import { resolveProductAttributes } from './attributeResolver';

interface ExportConfig {
  exportId: string;
  selectedColumns: string[];
  translationLocales: string[];
  includeChildLocations: boolean;
  conceptId?: number;
  companyId?: number;
  siteId?: number;
  selectedProductIds?: string[];
}

interface ProductRow {
  id: string;
  name: string;
  attributes: Record<string, any>;
  location: string;
  [key: string]: any;
}

export async function generateProductExport(config: ExportConfig): Promise<string> {
  const products = await fetchProducts(config);
  const rows = await buildExportRows(products, config);

  switch (config.exportId.split('_')[0]) {
    case 'csv':
      return generateCSV(rows, config);
    case 'json':
      return generateJSON(rows);
    default:
      throw new Error(`Unsupported format`);
  }
}

async function fetchProducts(config: ExportConfig) {
  let query = supabase
    .from('products')
    .select('*, integration_products(data, wand_integration_sources(name))');

  if (config.selectedProductIds && config.selectedProductIds.length > 0) {
    query = query.in('id', config.selectedProductIds);
  }

  const { data: products, error } = await query.order('name');

  if (error) throw error;

  const productsData = products || [];
  const integrationProductIds = productsData
    .filter(p => p.integration_product_id)
    .map(p => p.integration_product_id);

  let integrationDataMap = new Map();
  let integrationSourceMap = new Map();

  if (integrationProductIds.length > 0) {
    const { data: integrationData, error: intError } = await supabase
      .from('integration_products')
      .select('id, data, wand_source_id, wand_integration_sources(name), concept_id, company_id, site_id')
      .in('id', integrationProductIds);

    if (!intError && integrationData) {
      integrationData.forEach(ip => {
        integrationDataMap.set(ip.id, ip.data);
        if ((ip as any).wand_integration_sources) {
          integrationSourceMap.set(ip.id, (ip as any).wand_integration_sources.name);
        }
      });
    }
  }

  const resolvedProducts = productsData.map(product => {
    const sourceName = product.integration_product_id
      ? integrationSourceMap.get(product.integration_product_id)
      : undefined;

    if (product.integration_product_id && product.attribute_mappings) {
      const integrationData = integrationDataMap.get(product.integration_product_id);
      if (integrationData) {
        return {
          ...product,
          attributes: resolveProductAttributes(product, integrationData),
          integration_source_name: sourceName
        };
      }
    }
    return {
      ...product,
      integration_source_name: sourceName
    };
  });

  return resolvedProducts;
}

async function buildExportRows(products: any[], config: ExportConfig): Promise<ProductRow[]> {
  const rows: ProductRow[] = [];

  const { data: publicationsData } = await supabase
    .from('product_publications')
    .select('product_id, status, publish_at, scheduled_at')
    .in('product_id', products.map(p => p.id))
    .in('status', ['draft', 'scheduled']);

  const publicationsMap = new Map();
  if (publicationsData) {
    publicationsData.forEach(pub => {
      publicationsMap.set(pub.product_id, pub);
    });
  }

  for (const product of products) {
    const row: ProductRow = {
      id: product.id,
      name: product.name,
      attributes: product.attributes || {},
      location: await getLocationName(product),
    };

    config.selectedColumns.forEach(columnKey => {
      if (columnKey === 'id') {
        row[columnKey] = product.id;
      } else if (columnKey === 'location') {
        // Already set
      } else if (columnKey === 'current_status') {
        const pub = publicationsMap.get(product.id);
        row[columnKey] = pub ? pub.status : 'published';
      } else if (columnKey === 'scheduled_publish_date') {
        const pub = publicationsMap.get(product.id);
        row[columnKey] = pub?.publish_at || pub?.scheduled_at || '';
      } else if (columnKey === 'integration_source') {
        row[columnKey] = product.integration_source_name || '';
      } else if (columnKey === 'created_at' || columnKey === 'updated_at') {
        row[columnKey] = product[columnKey] || '';
      } else {
        row[columnKey] = product.attributes?.[columnKey] ?? '';
      }
    });

    config.translationLocales.forEach(locale => {
      const translationKey = `translations_${locale.replace('-', '_').toLowerCase()}`;
      const translations = product.attributes?.[translationKey] || {};

      config.selectedColumns.forEach(columnKey => {
        if (columnKey !== 'id' && columnKey !== 'location' && !columnKey.includes('_at') && !columnKey.includes('status')) {
          const translatedKey = `${columnKey}_${locale.replace('-', '_')}`;
          row[translatedKey] = translations[columnKey] ?? '';
        }
      });
    });

    rows.push(row);
  }

  return rows;
}

async function getLocationName(product: any): Promise<string> {
  return 'Main Location';
}

function generateCSV(rows: ProductRow[], config: ExportConfig): string {
  if (rows.length === 0) return '';

  const headers = new Set<string>();

  config.selectedColumns.forEach(col => headers.add(col));

  config.translationLocales.forEach(locale => {
    config.selectedColumns.forEach(col => {
      if (col !== 'id' && col !== 'location' && !col.includes('_at') && !col.includes('status')) {
        headers.add(`${col}_${locale.replace('-', '_')}`);
      }
    });
  });

  const headerArray = Array.from(headers);
  const csvLines = [headerArray.join(',')];

  rows.forEach(row => {
    const values = headerArray.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';

      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvLines.push(values.join(','));
  });

  return csvLines.join('\n');
}

function generateJSON(rows: ProductRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export async function downloadExport(exportId: string, format: string, content: string) {
  const blob = new Blob([content], {
    type: format === 'csv' ? 'text/csv' : 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `product_export_${Date.now()}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
