import React, { useEffect, useState, useCallback } from 'react'
import {
  X, RefreshCw, Download, Trash2, CheckCircle2,
  PackageOpen, Loader2, AlertCircle, Cpu, Check,
  HardDrive, CloudDownload, ChevronDown
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { FormEngineVersion } from '../store/useStore'
import { cn } from '../lib/utils'

interface EngineManagerDialogProps {
  isOpen: boolean
  onClose: () => void
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export const EngineManagerDialog: React.FC<EngineManagerDialogProps> = ({ isOpen, onClose }) => {
  const {
    engineVersions,
    selectedEngineVersion,
    storedEngineVersions,
    isFetchingVersions,
    isDownloadingVersion,
    downloadProgress,
    fetchEngineVersions,
    setSelectedEngineVersion,
    downloadEngineVersion,
    deleteLocalEngineVersion,
    refreshStoredVersions,
  } = useStore()

  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [justDownloaded, setJustDownloaded] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (isOpen) {
      refreshStoredVersions()
      fetchEngineVersions()
      setDownloadError(null)
    }
  }, [isOpen])

  const handleDownload = useCallback(async (v: FormEngineVersion) => {
    setDownloadError(null)
    try {
      await downloadEngineVersion(v)
      setJustDownloaded(v.version)
      setTimeout(() => setJustDownloaded(null), 3000)
    } catch (e: any) {
      setDownloadError(`Gagal mengunduh ${v.version}: ${e.message}`)
    }
  }, [downloadEngineVersion])

  const handleDelete = useCallback(async (version: string) => {
    await deleteLocalEngineVersion(version)
  }, [deleteLocalEngineVersion])

  const handleSelect = useCallback((version: string | null) => {
    setSelectedEngineVersion(version)
    setTimeout(onClose, 300)
  }, [setSelectedEngineVersion, onClose])

  if (!isOpen) return null

  const visibleVersions = showAll ? engineVersions : engineVersions.slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Engine Version Manager</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Fasih Form Engine · formEngineId: 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Info Bar */}
        <div className="px-5 py-3 border-b bg-muted/20 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className={cn(
              "w-2 h-2 rounded-full",
              selectedEngineVersion ? "bg-primary" : "bg-green-500"
            )} />
            <span className="text-muted-foreground">Active:</span>
            <span className="font-bold font-mono">
              {selectedEngineVersion
                ? `v${selectedEngineVersion} (local)`
                : 'Built-in (/engine/fasih-form.js)'}
            </span>
          </div>
          {selectedEngineVersion && (
            <button
              onClick={() => handleSelect(null)}
              className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors"
            >
              Reset ke Built-in
            </button>
          )}
        </div>

        {/* Error Alert */}
        {downloadError && (
          <div className="mx-5 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-2 text-xs text-destructive shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Version List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
          {isFetchingVersions && engineVersions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium animate-pulse">Fetching versions from API...</p>
            </div>
          )}

          {!isFetchingVersions && engineVersions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <PackageOpen className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No versions found</p>
              <p className="text-xs opacity-60">Make sure your bearer token is configured.</p>
            </div>
          )}

          {visibleVersions.map((v) => {
            const isStored = storedEngineVersions.includes(v.version)
            const isSelected = selectedEngineVersion === v.version
            const isBeingDownloaded = isDownloadingVersion === v.version
            const wasJustDownloaded = justDownloaded === v.version

            return (
              <div
                key={v.id}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isSelected
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "bg-background/50 border-border/40 hover:border-border hover:bg-muted/30"
                )}
              >
                {/* Version badge */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isStored
                    ? "bg-green-500/10 text-green-600 border border-green-500/20"
                    : "bg-muted text-muted-foreground"
                )}>
                  {isSelected ? <Check className="w-4 h-4" /> : <PackageOpen className="w-4 h-4" />}
                </div>

                {/* Version info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold truncate">v{v.version}</span>
                    {isSelected && (
                      <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                        AKTIF
                      </span>
                    )}
                    {isStored && !isSelected && (
                      <span className="text-[9px] font-bold bg-green-500/10 text-green-600 border border-green-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <HardDrive className="w-2.5 h-2.5" />
                        TERSIMPAN
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(v.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isBeingDownloaded ? (
                    /* Download progress */
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-primary tabular-nums w-8 text-right">
                        {downloadProgress}%
                      </span>
                    </div>
                  ) : wasJustDownloaded ? (
                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Done
                    </span>
                  ) : (
                    <>
                      {isStored ? (
                        <>
                          {/* Use button */}
                          {!isSelected && (
                            <button
                              onClick={() => handleSelect(v.version)}
                              className="px-2.5 py-1.5 text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all"
                            >
                              Gunakan
                            </button>
                          )}
                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(v.version)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            title="Hapus dari lokal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        /* Download button */
                        <button
                          onClick={() => handleDownload(v)}
                          disabled={!!isDownloadingVersion}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                            isDownloadingVersion
                              ? "text-muted-foreground cursor-not-allowed opacity-50"
                              : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
                          )}
                          title="Unduh ke lokal"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          Unduh
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Show more */}
          {!showAll && engineVersions.length > 10 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Lihat {engineVersions.length - 10} versi lainnya
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{storedEngineVersions.length} versi tersimpan di browser</span>
          </div>
          <button
            onClick={() => fetchEngineVersions(true)}
            disabled={isFetchingVersions}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
              isFetchingVersions
                ? "text-muted-foreground cursor-wait"
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
          >
            <RefreshCw className={cn("w-3 h-3", isFetchingVersions && "animate-spin")} />
            {isFetchingVersions ? 'Fetching...' : 'Refresh Daftar'}
          </button>
        </div>
      </div>
    </div>
  )
}
