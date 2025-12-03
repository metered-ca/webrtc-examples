import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check, Camera, Mic } from 'lucide-react';
import type { MediaDeviceOption } from '../types';

interface DeviceSelectorProps {
  devices: MediaDeviceOption[];
  selectedDeviceId: string | null;
  onSelect: (deviceId: string) => void;
  type: 'camera' | 'microphone';
  disabled?: boolean;
}

export function DeviceSelector({
  devices,
  selectedDeviceId,
  onSelect,
  type,
  disabled = false,
}: DeviceSelectorProps) {
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const Icon = type === 'camera' ? Camera : Mic;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          className="w-full flex items-center justify-between gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-left text-sm text-white hover:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Select ${type}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {selectedDevice?.label || `Select ${type}`}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[200px] max-w-[300px] bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-xl z-50"
          sideOffset={4}
          align="start"
        >
          {devices.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No {type}s found
            </div>
          ) : (
            devices.map((device) => (
              <DropdownMenu.Item
                key={device.deviceId}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-white rounded-md cursor-pointer hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
                onSelect={() => onSelect(device.deviceId)}
              >
                <span className="truncate">{device.label}</span>
                {device.deviceId === selectedDeviceId && (
                  <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
