import { useState, useEffect, useRef } from 'react';
import { Info, Image, FileText, DollarSign, Globe, Link2, Copy, Check } from 'lucide-react';
import EditProductModal from '../components/EditProductModal';
import { supabase } from '../lib/supabase';
import { LocationProductService } from '../lib/locationProductService';
import Breadcrumb from '../components/Breadcrumb';

interface ProductEditProps {
  productId: string;
  mode: 'edit' | 'create';
  onBack: () => void;
  onSave: () => void;
}

export default function ProductEdit({ productId, mode, onBack, onSave }: ProductEditProps) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('basic-info');
  const [idCopied, setIdCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'edit') {
      loadProduct();
    } else {
      setLoading(false);
    }
  }, [productId, mode]);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const scrollPosition = window.scrollY + 200;
      const sections = getSections();

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.querySelector(`[data-section="${sections[i].id}"]`);
        if (element) {
          const offsetTop = (element as HTMLElement).offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveSection(sections[i].id);
            return;
          }
        }
      }

      if (sections.length > 0) {
        setActiveSection(sections[0].id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const getSections = () => {
    return [
      { id: 'basic-info', label: 'Basic Information', icon: Info },
      { id: 'images-media', label: 'Images & Media', icon: Image },
      { id: 'description', label: 'Description & Details', icon: FileText },
      { id: 'pricing', label: 'Pricing & Options', icon: DollarSign },
      { id: 'translations', label: 'Translations', icon: Globe },
      { id: 'integration', label: 'Integration Links', icon: Link2 }
    ];
  };

  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Product Management', onClick: onBack }
    ];

    if (mode === 'edit') {
      items.push({ label: 'Edit Product' });
    } else {
      items.push({ label: 'Create Product' });
    }

    return items;
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(`[data-section="${sectionId}"]`);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const copyIdToClipboard = async () => {
    if (productId) {
      try {
        await navigator.clipboard.writeText(productId);
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const loadProduct = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        integration_source:wand_integration_sources!products_integration_source_id_fkey(
          id,
          name,
          integration_type
        )
      `)
      .eq('id', productId)
      .maybeSingle();

    if (error) {
      console.error('Error loading product:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      console.error('Product not found');
      setLoading(false);
      return;
    }

    let integrationDataMap: Map<string, any> | undefined;
    if (data.integration_product_id) {
      const { data: integrationData } = await supabase
        .from('integration_products')
        .select('*')
        .eq('id', data.integration_product_id)
        .maybeSingle();

      if (integrationData) {
        integrationDataMap = new Map([[integrationData.id, integrationData]]);
      }
    }

    const resolvedProduct = await LocationProductService.resolveProductWithInheritance(
      data,
      integrationDataMap
    );

    const productWithSource = {
      ...resolvedProduct,
      integration_source_name: data.integration_source?.name || null,
      integration_type: data.integration_source?.integration_type || data.integration_type
    };

    setProduct(productWithSource);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const productName = product?.attributes?.name || product?.name || 'Untitled Product';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <Breadcrumb items={getBreadcrumbItems()} className="mb-0" />
            {mode === 'edit' && productId && (
              <button
                onClick={copyIdToClipboard}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors text-xs font-mono border border-slate-300"
                title="Click to copy ID"
              >
                {idCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>ID: {productId.slice(0, 8)}...</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {mode === 'edit' ? `Edit: ${productName.replace(/<[^>]*>/g, '')}` : 'Create Product'}
            </h1>
            <p className="text-sm text-slate-600">
              {mode === 'edit'
                ? 'Update product information, pricing, and settings'
                : 'Create a new product for your menu'}
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-[124px] z-10 bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">
                Sections
              </h3>
              <nav className="space-y-1">
                {getSections().map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 -ml-px pl-2.5'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-left">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div ref={contentRef} className="flex-1">
            <EditProductModal
              isOpen={true}
              onClose={onBack}
              product={product}
              onSuccess={() => {
                onSave();
              }}
              mode={mode}
              renderAsPage={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
