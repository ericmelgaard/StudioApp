import { SyncState } from '../components/SyncBadge';

export interface AttributeSyncConfig {
  fieldName: string;
  isSynced: boolean;
  isActive: boolean;
  apiSourceId?: string;
  apiSourceName?: string;
  mappedTo?: string;
  lastSyncedAt?: string;
  isDisabled?: boolean;
}

export interface ProductSyncState {
  integrationProductId?: string;
  integrationSourceId?: string;
  integrationSourceName?: string;
  isLinked: boolean;
  hasActiveMappings: boolean;
  attributeMappings?: Record<string, any>;
  attributeOverrides?: Record<string, boolean>;
  disabledSyncFields?: string[];
}

export interface IntegrationSource {
  id: string;
  name: string;
  isActive: boolean;
  priority?: number;
}

export class SyncStateManager {
  private productState: ProductSyncState;
  private integrationSources: IntegrationSource[];
  private attributeMappings: Record<string, any>;

  constructor(
    productState: ProductSyncState,
    integrationSources: IntegrationSource[] = [],
    attributeMappings: Record<string, any> = {}
  ) {
    this.productState = productState;
    this.integrationSources = integrationSources;
    this.attributeMappings = attributeMappings;
  }

  getSyncState(fieldName: string): SyncState {
    const isOverridden = this.productState.attributeOverrides?.[fieldName];
    const hasMapping = this.hasMapping(fieldName);
    const isSyncDisabled = this.isSyncDisabled(fieldName);

    if (hasMapping && !isOverridden && !isSyncDisabled) {
      if (this.productState.isLinked && this.isActiveMapping(fieldName)) {
        return 'linked-active';
      } else if (this.canSync(fieldName)) {
        return 'linked-inactive';
      }
    }

    if (isOverridden || isSyncDisabled) {
      return 'locally-applied';
    }

    return 'none';
  }

  hasMapping(fieldName: string): boolean {
    if (!this.attributeMappings) return false;

    const productMapping = this.productState.attributeMappings?.[fieldName];
    if (productMapping) return true;

    const templateMapping = this.attributeMappings[fieldName];
    return !!templateMapping;
  }

  isActiveMapping(fieldName: string): boolean {
    if (!this.productState.isLinked) return false;

    const mapping = this.productState.attributeMappings?.[fieldName];
    if (!mapping) return false;

    // If we have an explicit integrationSourceId, check if it's active
    if (this.productState.integrationSourceId) {
      const activeSource = this.getActiveSource();
      if (!activeSource) return false;
      return this.productState.integrationSourceId === activeSource.id;
    }

    // If integrationSourceId is not set but we have integrationProductId and mappings, it's active
    return this.productState.isLinked && !!mapping;
  }

  canSync(fieldName: string): boolean {
    return this.hasMapping(fieldName) && !this.isSyncDisabled(fieldName);
  }

  isSyncDisabled(fieldName: string): boolean {
    return this.productState.disabledSyncFields?.includes(fieldName) || false;
  }

  getActiveSource(): IntegrationSource | undefined {
    const activeSources = this.integrationSources
      .filter(s => s.isActive)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return activeSources[0];
  }

  getAllSources(): IntegrationSource[] {
    return this.integrationSources;
  }

  getMappedField(fieldName: string): string | undefined {
    const productMapping = this.productState.attributeMappings?.[fieldName];
    if (productMapping) {
      if (typeof productMapping === 'string') return productMapping;
      if (typeof productMapping === 'object' && productMapping.type === 'direct' && productMapping.directLink) {
        return productMapping.directLink.field;
      }
    }

    const templateMapping = this.attributeMappings[fieldName];
    if (typeof templateMapping === 'string') return templateMapping;

    return undefined;
  }

  getSyncConfig(fieldName: string): AttributeSyncConfig {
    const state = this.getSyncState(fieldName);
    const activeSource = this.getActiveSource();

    return {
      fieldName,
      isSynced: state === 'linked-active',
      isActive: this.isActiveMapping(fieldName),
      apiSourceId: this.productState.integrationSourceId,
      apiSourceName: this.productState.integrationSourceName || activeSource?.name,
      mappedTo: this.getMappedField(fieldName),
      isDisabled: this.isSyncDisabled(fieldName)
    };
  }

  enableSync(fieldName: string): ProductSyncState {
    const disabledFields = this.productState.disabledSyncFields?.filter(f => f !== fieldName) || [];
    const overrides = { ...this.productState.attributeOverrides };
    delete overrides[fieldName];

    return {
      ...this.productState,
      disabledSyncFields: disabledFields,
      attributeOverrides: overrides
    };
  }

  disableSync(fieldName: string): ProductSyncState {
    const disabledFields = [...(this.productState.disabledSyncFields || [])];
    if (!disabledFields.includes(fieldName)) {
      disabledFields.push(fieldName);
    }

    return {
      ...this.productState,
      disabledSyncFields: disabledFields,
      attributeOverrides: {
        ...this.productState.attributeOverrides,
        [fieldName]: true
      }
    };
  }

  addMapping(fieldName: string, mapping: any): ProductSyncState {
    return {
      ...this.productState,
      attributeMappings: {
        ...this.productState.attributeMappings,
        [fieldName]: mapping
      }
    };
  }

  removeMapping(fieldName: string): ProductSyncState {
    const mappings = { ...this.productState.attributeMappings };
    delete mappings[fieldName];

    return {
      ...this.productState,
      attributeMappings: mappings
    };
  }

  canRevertToSync(fieldName: string): boolean {
    return this.hasMapping(fieldName) && (this.isSyncDisabled(fieldName) || !!this.productState.attributeOverrides?.[fieldName]);
  }

  getAvailableSourcesForMapping(): IntegrationSource[] {
    return this.integrationSources.filter(s => s.isActive);
  }

  getInactiveSourcesForMapping(): IntegrationSource[] {
    return this.integrationSources.filter(s => !s.isActive);
  }

  switchActiveSource(newSourceId: string): ProductSyncState {
    return {
      ...this.productState,
      integrationSourceId: newSourceId,
      integrationSourceName: this.integrationSources.find(s => s.id === newSourceId)?.name
    };
  }
}

export function getNestedValue(obj: any, path: string): any {
  try {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let value = obj;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  } catch {
    return undefined;
  }
}

export function setNestedValue(obj: any, path: string, value: any): any {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    } else {
      current[part] = { ...current[part] };
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return result;
}

export function isFieldSyncable(fieldType: string): boolean {
  const syncableTypes = ['text', 'number', 'boolean', 'image', 'richtext'];
  return syncableTypes.includes(fieldType);
}

export function shouldShowSyncBadge(
  fieldName: string,
  hasIntegration: boolean,
  hasMapping: boolean,
  syncState: SyncState
): boolean {
  if (syncState === 'none') return false;
  if (!hasIntegration && !hasMapping) return false;

  const nonBadgeFields = ['id', 'created_at', 'updated_at'];
  return !nonBadgeFields.includes(fieldName);
}
