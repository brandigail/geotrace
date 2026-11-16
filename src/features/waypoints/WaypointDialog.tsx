import { Camera, ImageOff, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { cardClass, errorText, iconButton, inputClass, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { PhotoError, preparePhoto } from '../../lib/photo'

export interface WaypointDraft {
  note: string
  photo: Blob | null
}

interface Props {
  /** Open when not null. */
  draft: WaypointDraft | null
  title: string
  where?: string
  onSave: (draft: WaypointDraft) => void
  onClose: () => void
}

/** A window for a waypoint's note and optional photo, used when dropping a pin and when editing one. */
export function WaypointDialog({ draft, title, where, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (draft && !dialog.open) dialog.showModal()
    if (!draft && dialog.open) dialog.close()
  }, [draft])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="waypoint-title"
      className={`${cardClass} m-auto w-[min(30rem,calc(100vw-1.5rem))] p-0 text-slate-900 backdrop:bg-black/50 dark:text-slate-100`}
    >
      {draft && <Form key={`${draft.note}-${draft.photo?.size ?? 0}`} draft={draft} title={title} where={where} onSave={onSave} onCancel={() => ref.current?.close()} />}
    </dialog>
  )
}

function Form({ draft, title, where, onSave, onCancel }: { draft: WaypointDraft; title: string; where?: string; onSave: (draft: WaypointDraft) => void; onCancel: () => void }) {
  const [note, setNote] = useState(draft.note)
  const [photo, setPhoto] = useState<Blob | null>(draft.photo)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const url = useObjectUrl(photo)
  const camera = useRef<HTMLInputElement>(null)

  async function chosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setPhoto(await preparePhoto(file))
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : 'That photo could not be added.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    onSave({ note, photo })
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="waypoint-title" className="text-lg font-semibold">
            {title}
          </h2>
          {where && <p className={`text-sm ${mutedText}`}>{where}</p>}
        </div>
        <button type="button" className={iconButton} onClick={onCancel} aria-label="Close">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div>
        <label htmlFor="waypoint-note" className="text-sm font-medium">
          Note
        </label>
        <textarea id="waypoint-note" className={`${inputClass} min-h-24`} value={note} maxLength={1000} placeholder="What is here?" onChange={(e) => setNote(e.target.value)} autoFocus />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Photo</p>
        {url && <img src={url} alt="The photo for this waypoint" className="max-h-48 w-full rounded-lg object-cover" />}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => camera.current?.click()} disabled={busy}>
            <Camera className="size-4" aria-hidden /> {photo ? 'Change photo' : 'Add a photo'}
          </button>
          {photo && (
            <button type="button" className={secondaryButton} onClick={() => setPhoto(null)}>
              <ImageOff className="size-4" aria-hidden /> Remove photo
            </button>
          )}
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Choose a photo" onChange={(e) => void chosen(e)} />
        {error && (
          <p role="alert" className={`text-sm ${errorText}`}>
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" className={primaryButton} disabled={busy}>
          Save
        </button>
        <button type="button" className={secondaryButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
