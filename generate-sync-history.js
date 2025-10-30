import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function generateSyncHistory() {
  try {
    console.log('Generating sync history data...\n');

    const { data: source } = await supabase
      .from('integration_sources')
      .select('id')
      .eq('name', 'QU POS')
      .single();

    if (!source) {
      console.error('QU POS source not found. Please run import-integration-products first.');
      process.exit(1);
    }

    const now = new Date();
    const syncHistory = [];

    const generateSync = (daysAgo, status, syncType = 'scheduled') => {
      const startedAt = new Date(now);
      startedAt.setDate(startedAt.getDate() - daysAgo);
      startedAt.setHours(2, 0, 0, 0);

      const isSuccess = status === 'success';
      const duration = isSuccess
        ? Math.floor(Math.random() * 30000) + 15000
        : Math.floor(Math.random() * 10000) + 5000;

      const completedAt = new Date(startedAt);
      completedAt.setMilliseconds(completedAt.getMilliseconds() + duration);

      const recordsAdded = isSuccess ? Math.floor(Math.random() * 20) : 0;
      const recordsUpdated = isSuccess ? Math.floor(Math.random() * 100) + 10 : 0;
      const recordsDeleted = isSuccess ? Math.floor(Math.random() * 5) : 0;

      const sync = {
        source_id: source.id,
        sync_type: syncType,
        status: status,
        started_at: startedAt.toISOString(),
        completed_at: status !== 'in_progress' ? completedAt.toISOString() : null,
        duration_ms: status !== 'in_progress' ? duration : null,
        records_added: recordsAdded,
        records_updated: recordsUpdated,
        records_deleted: recordsDeleted,
        total_records: 841,
        metadata: {
          products: recordsUpdated * 0.4,
          modifiers: recordsUpdated * 0.5,
          discounts: recordsUpdated * 0.1
        }
      };

      if (status === 'failed') {
        const errors = [
          'Connection timeout while fetching data',
          'Authentication failed: Invalid API credentials',
          'Rate limit exceeded: 429 Too Many Requests',
          'Data validation error: Invalid price format',
          'Network error: Unable to reach integration endpoint'
        ];
        sync.error_message = errors[Math.floor(Math.random() * errors.length)];
        sync.error_details = {
          code: Math.random() > 0.5 ? 'NETWORK_ERROR' : 'API_ERROR',
          retryable: true
        };
      }

      return sync;
    };

    syncHistory.push(generateSync(0.04, 'success', 'manual'));
    syncHistory.push(generateSync(1, 'success', 'scheduled'));
    syncHistory.push(generateSync(2, 'success', 'scheduled'));
    syncHistory.push(generateSync(3, 'failed', 'scheduled'));
    syncHistory.push(generateSync(4, 'success', 'scheduled'));
    syncHistory.push(generateSync(5, 'success', 'scheduled'));
    syncHistory.push(generateSync(6, 'success', 'scheduled'));
    syncHistory.push(generateSync(7, 'success', 'scheduled'));
    syncHistory.push(generateSync(8, 'failed', 'scheduled'));
    syncHistory.push(generateSync(9, 'success', 'scheduled'));
    syncHistory.push(generateSync(10, 'success', 'scheduled'));
    syncHistory.push(generateSync(11, 'success', 'scheduled'));
    syncHistory.push(generateSync(12, 'success', 'scheduled'));
    syncHistory.push(generateSync(13, 'success', 'scheduled'));
    syncHistory.push(generateSync(14, 'success', 'manual'));

    console.log(`Inserting ${syncHistory.length} sync history records...`);

    const { error: historyError } = await supabase
      .from('integration_sync_history')
      .insert(syncHistory);

    if (historyError) {
      console.error('Error inserting sync history:', historyError);
      process.exit(1);
    }

    const successfulSyncs = syncHistory.filter(s => s.status === 'success').length;
    const failedSyncs = syncHistory.filter(s => s.status === 'failed').length;
    const lastSuccessfulSync = syncHistory.find(s => s.status === 'success');

    const { error: updateError } = await supabase
      .from('integration_sources')
      .update({
        last_sync_at: syncHistory[0].started_at,
        last_successful_sync_at: lastSuccessfulSync?.completed_at,
        sync_status: 'idle',
        total_syncs: syncHistory.length,
        failed_syncs: failedSyncs
      })
      .eq('id', source.id);

    if (updateError) {
      console.error('Error updating integration source:', updateError);
      process.exit(1);
    }

    console.log('\n✅ Sync history generated successfully!');
    console.log(`- Total syncs: ${syncHistory.length}`);
    console.log(`- Successful: ${successfulSyncs}`);
    console.log(`- Failed: ${failedSyncs}`);

  } catch (error) {
    console.error('Error generating sync history:', error);
    process.exit(1);
  }
}

generateSyncHistory();
