import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building2, Layers, MapPin, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Concept {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
  concept_id: number;
}

interface Store {
  id: number;
  name: string;
  company_id: number;
}

interface TreeNode {
  id: string;
  label: string;
  level: 'concept' | 'company' | 'store';
  entityId: number;
  children?: TreeNode[];
}

interface LocationScopeTreeSelectorProps {
  value: {
    conceptId: string | null;
    companyId: string | null;
    storeIds: number[];
  };
  onChange: (value: {
    conceptId: string | null;
    companyId: string | null;
    storeIds: number[];
  }) => void;
}

export default function LocationScopeTreeSelector({ value, onChange }: LocationScopeTreeSelectorProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [conceptsRes, companiesRes, storesRes] = await Promise.all([
        supabase.from('concepts').select('id, name').order('name'),
        supabase.from('companies').select('id, name, concept_id').order('name'),
        supabase.from('stores').select('id, name, company_id').order('name'),
      ]);

      if (conceptsRes.data) setConcepts(conceptsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (storesRes.data) setStores(storesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (): TreeNode[] => {
    return concepts.map(concept => {
      const conceptCompanies = companies.filter(c => c.concept_id === concept.id);
      return {
        id: `concept-${concept.id}`,
        label: concept.name,
        level: 'concept',
        entityId: concept.id,
        children: conceptCompanies.map(company => {
          const companyStores = stores.filter(s => s.company_id === company.id);
          return {
            id: `company-${company.id}`,
            label: company.name,
            level: 'company',
            entityId: company.id,
            children: companyStores.map(store => ({
              id: `store-${store.id}`,
              label: store.name,
              level: 'store',
              entityId: store.id,
            })),
          };
        }),
      };
    });
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelect = (node: TreeNode) => {
    if (node.level === 'concept') {
      onChange({
        conceptId: node.entityId.toString(),
        companyId: null,
        storeIds: [],
      });
    } else if (node.level === 'company') {
      const conceptId = companies.find(c => c.id === node.entityId)?.concept_id.toString() || null;
      onChange({
        conceptId,
        companyId: node.entityId.toString(),
        storeIds: [],
      });
    } else if (node.level === 'store') {
      const store = stores.find(s => s.id === node.entityId);
      const company = companies.find(c => c.id === store?.company_id);
      const conceptId = company?.concept_id.toString() || null;
      const companyId = store?.company_id.toString() || null;

      const newStoreIds = [...value.storeIds];
      const storeIndex = newStoreIds.indexOf(node.entityId);

      if (storeIndex > -1) {
        newStoreIds.splice(storeIndex, 1);
      } else {
        newStoreIds.push(node.entityId);
      }

      onChange({
        conceptId,
        companyId,
        storeIds: newStoreIds,
      });
    }
  };

  const isSelected = (node: TreeNode): boolean => {
    if (node.level === 'concept') {
      return value.conceptId === node.entityId.toString() && !value.companyId && value.storeIds.length === 0;
    } else if (node.level === 'company') {
      return value.companyId === node.entityId.toString() && value.storeIds.length === 0;
    } else if (node.level === 'store') {
      return value.storeIds.includes(node.entityId);
    }
    return false;
  };

  const getIcon = (level: 'concept' | 'company' | 'store') => {
    switch (level) {
      case 'concept':
        return <Building2 className="w-4 h-4" />;
      case 'company':
        return <Layers className="w-4 h-4" />;
      case 'store':
        return <MapPin className="w-4 h-4" />;
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const selected = isSelected(node);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer rounded ${
            selected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <div
            onClick={() => handleSelect(node)}
            className="flex items-center gap-2 flex-1"
          >
            <div className={`${selected ? 'text-blue-600' : 'text-slate-400'}`}>
              {getIcon(node.level)}
            </div>
            <span className={`text-sm ${selected ? 'font-medium text-blue-700' : 'text-slate-700'}`}>
              {node.label}
            </span>
            {hasChildren && (
              <span className="text-xs text-slate-400">
                ({node.children?.length})
              </span>
            )}
          </div>

          <div className="flex-shrink-0">
            {selected ? (
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300" />
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children?.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tree = buildTree();

  return (
    <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
      {tree.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p>No locations available</p>
        </div>
      ) : (
        <div className="py-2">
          {tree.map(node => renderNode(node))}
        </div>
      )}
    </div>
  );
}
