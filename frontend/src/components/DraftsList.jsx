import { Trash2, Clock, File } from 'lucide-react'

export default function DraftsList({ formName, onLoadDraft, onDeleteDraft, onClose }) {
  const draftsListKey = `drafts_list_${formName}`
  const drafts = JSON.parse(localStorage.getItem(draftsListKey) || '[]')

  const handleLoadDraft = (draft) => {
    onLoadDraft(draft.id, draft.data)
    onClose && onClose()
  }

  const handleDeleteDraft = (draftId) => {
    if (confirm('Are you sure you want to delete this draft?')) {
      onDeleteDraft(draftId)
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-8">
        <File size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-xs">No saved drafts</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-gray-900 mb-3">Saved Drafts</h3>
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="flex items-center justify-between p-3 border border-gray-200 rounded-xs hover:bg-gray-50 transition group"
        >
          <div
            className="flex-1 cursor-pointer"
            onClick={() => handleLoadDraft(draft)}
          >
            <p className="text-xs font-medium text-gray-900 group-hover:text-blue-600 transition">
              {draft.label}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Clock size={12} />
              <span>
                {new Date(draft.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleDeleteDraft(draft.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition flex-shrink-0"
            title="Delete draft"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
