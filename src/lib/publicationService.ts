import { supabase } from './supabase';

export interface PendingPublication {
  id: string;
  product_id: string;
  status: string;
  publish_at: string;
  changes: {
    name?: string;
    attributes?: Record<string, any>;
    attribute_overrides?: Record<string, boolean>;
    attribute_mappings?: Record<string, any>;
  };
}

export async function checkAndApplyPendingPublications(): Promise<{
  appliedCount: number;
  errors: Array<{ publicationId: string; productId: string; error: string }>;
}> {
  const now = new Date().toISOString();
  const appliedCount = 0;
  const errors: Array<{ publicationId: string; productId: string; error: string }> = [];

  try {
    const { data: pendingPublications, error: fetchError } = await supabase
      .from('product_publications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('publish_at', now);

    if (fetchError) {
      console.error('Error fetching pending publications:', fetchError);
      return { appliedCount, errors };
    }

    if (!pendingPublications || pendingPublications.length === 0) {
      return { appliedCount, errors };
    }

    for (const publication of pendingPublications) {
      try {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id')
          .eq('id', publication.product_id)
          .maybeSingle();

        if (productError) {
          errors.push({
            publicationId: publication.id,
            productId: publication.product_id,
            error: `Database error: ${productError.message}`
          });
          continue;
        }

        if (!product) {
          await supabase
            .from('product_publications')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', publication.id);

          errors.push({
            publicationId: publication.id,
            productId: publication.product_id,
            error: 'Product no longer exists'
          });
          continue;
        }

        const changes = publication.changes as PendingPublication['changes'];

        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (changes.name !== undefined) {
          updateData.name = changes.name;
        }
        if (changes.attributes !== undefined) {
          updateData.attributes = changes.attributes;
        }
        if (changes.attribute_overrides !== undefined) {
          updateData.attribute_overrides = changes.attribute_overrides;
        }
        if (changes.attribute_mappings !== undefined) {
          updateData.attribute_mappings = changes.attribute_mappings;
        }

        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', publication.product_id);

        if (updateError) {
          errors.push({
            publicationId: publication.id,
            productId: publication.product_id,
            error: `Failed to update product: ${updateError.message}`
          });
          continue;
        }

        const { error: publishError } = await supabase
          .from('product_publications')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', publication.id);

        if (publishError) {
          console.error('Error marking publication as published:', publishError);
        }

      } catch (err) {
        errors.push({
          publicationId: publication.id,
          productId: publication.product_id,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return {
      appliedCount: pendingPublications.length - errors.length,
      errors
    };

  } catch (err) {
    console.error('Error in checkAndApplyPendingPublications:', err);
    return { appliedCount, errors };
  }
}
