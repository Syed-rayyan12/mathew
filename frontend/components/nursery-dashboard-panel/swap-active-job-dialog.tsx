'use client'

import { X, AlertTriangle } from 'lucide-react'

interface SwapActiveJobDialogProps {
  newJobTitle: string
  activeJobTitle: string
  activeJobId: string
  onConfirm: (replaceId: string) => void
  onCancel: () => void
}

export default function SwapActiveJobDialog({
  newJobTitle,
  activeJobTitle,
  activeJobId,
  onConfirm,
  onCancel,
}: SwapActiveJobDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={18} />
            <h2 className="text-lg font-bold text-gray-900">One live advert at a time</h2>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 transition"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Your plan allows one live advert. Publishing <strong>{newJobTitle}</strong> will
            take <strong>{activeJobTitle}</strong> offline.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(activeJobId)}
              className="px-5 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
            >
              Swap &amp; publish
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
