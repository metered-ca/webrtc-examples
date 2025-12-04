import { X, User } from 'lucide-react';
import type { ViewerInfo } from '../types';

interface ViewerListProps {
  viewers: ViewerInfo[];
  onClose: () => void;
}

export function ViewerList({ viewers, onClose }: ViewerListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Viewers ({viewers.length})
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Close viewer list"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewer List */}
      {viewers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm text-center">
            No viewers yet.
            <br />
            Share your broadcast code!
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {viewers.map((viewer) => (
            <div
              key={viewer.peerId}
              className="flex items-center gap-3 px-3 py-2 bg-gray-700 rounded-lg"
            >
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <span className="text-sm text-white truncate flex-1">
                {viewer.username}
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
