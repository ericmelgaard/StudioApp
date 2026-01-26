export interface HardwareDevice {
  id: string;
  device_id: string;
  device_type: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired' | 'activated';
  activation_id?: string;
  client_version?: string;
  activated_at?: string;
  battery_level: number | null;
  last_seen: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LabelPosition {
  id: string;
  position_id: string;
  product_name: string;
  product_sku: string | null;
  price: number;
  location: string;
  hardware_device_id: string | null;
  status: 'active' | 'pending' | 'error' | 'unassigned';
  display_template: string | null;
  last_synced: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabelPositionWithDevice extends LabelPosition {
  hardware_device?: HardwareDevice;
}
