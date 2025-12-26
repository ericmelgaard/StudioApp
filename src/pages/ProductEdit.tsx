import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import EditProductModal from '../components/EditProductModal';
import { supabase } from '../lib/supabase';

interface ProductEditProps {
  productId: string;
  mode: 'edit' | 'create';
  onBack: () => void;
  onSave: () => void;
}

export default function ProductEdit({ productId, mode, onBack, onSave }: ProductEditProps) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === 'edit') {
      loadProduct();
    } else {
      setLoading(false);
    }
  }, [productId, mode]);

  const loadProduct = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        attribute_template:product_attribute_templates!products_attribute_template_id_fkey(
          id,
          name,
          attribute_schema,
          translations
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

    setProduct(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Products</span>
        </button>
      </div>

      <div className="flex-1">
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
  );
}
