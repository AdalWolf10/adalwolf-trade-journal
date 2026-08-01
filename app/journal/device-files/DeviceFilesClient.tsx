"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { useJournalTheme } from "../useJournalTheme";

type DeviceFolder = {
  id: string;
  name: string;
  sharedUrl: string;
  shortCode: string;
  shortUrl: string;
  token: string;
  tokenUpdatedAt: number;
  updatedAt: number;
};

type DeviceFile = {
  contentType: string;
  createdAt: number;
  filename: string;
  id: string;
  sharedUrl: string;
  shortUrl: string;
  size: number;
  updatedAt: number;
};

type DeviceSafety = {
  enabled: boolean;
  isNearStorageLimit: boolean;
  isStorageLimitReached: boolean;
  percentUsed: number;
  remainingBytes: number;
  storageLimitBytes: number;
  storageWarningBytes: number;
  totalSize: number;
};

type DeviceFilesResponse = {
  error?: string;
  file?: DeviceFile;
  files?: DeviceFile[];
  folder?: DeviceFolder;
  ok?: boolean;
  safety?: DeviceSafety;
};

function fileSizeLabel(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function contentTypeLabel(contentType: string) {
  return contentType.split(";")[0] || "application/octet-stream";
}

function updatedLabel(value: number) {
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DeviceFilesClient() {
  const [deviceFiles, setDeviceFiles] = useState<DeviceFile[]>([]);
  const [deviceFolder, setDeviceFolder] = useState<DeviceFolder | null>(null);
  const [deviceSafety, setDeviceSafety] = useState<DeviceSafety | null>(null);
  const { theme, toggleTheme } = useJournalTheme();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUnauthorized = useCallback((response: Response) => {
    if (response.status === 401) {
      window.location.href = "/";
      return true;
    }
    return false;
  }, []);

  const loadDeviceFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/device-files", { cache: "no-store" });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DeviceFilesResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load device files");
      }
      setDeviceFolder(data.folder ?? null);
      setDeviceFiles(data.files ?? []);
      setDeviceSafety(data.safety ?? null);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load device files");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDeviceFiles();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDeviceFiles]);

  async function copyLink(link: string, label = "Link") {
    try {
      await navigator.clipboard.writeText(link);
      setNotice(`${label} copied.`);
    } catch {
      setNotice("Copy failed.");
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) {
      return;
    }
    if (deviceSafety && (!deviceSafety.enabled || deviceSafety.isStorageLimitReached)) {
      setNotice(
        deviceSafety.enabled
          ? "Device Files storage limit reached."
          : "Device Files are paused.",
      );
      return;
    }

    setIsUploading(true);
    setNotice("");
    try {
      let lastFilename = "";
      for (const file of selectedFiles) {
        const response = await fetch(`/api/device-files?filename=${encodeURIComponent(file.name)}`, {
          body: file,
          headers: {
            "content-type": file.type || "application/octet-stream",
            "x-device-file-size": String(file.size),
          },
          method: "POST",
        });
        if (handleUnauthorized(response)) {
          return;
        }
        const data = (await response.json()) as DeviceFilesResponse;
        if (!response.ok || !data.file) {
          throw new Error(data.error ?? "Unable to upload device file");
        }
        lastFilename = data.file.filename;
        setDeviceFolder(data.folder ?? null);
        setDeviceFiles(data.files ?? []);
        setDeviceSafety(data.safety ?? null);
      }

      setNotice(
        selectedFiles.length === 1
          ? `${lastFilename} ready.`
          : `${selectedFiles.length} files ready.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to upload device file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void uploadFiles(event.target.files);
    }
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!canUpload) {
      return;
    }
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    if (!canUpload) {
      return;
    }
    if (event.dataTransfer.files) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  async function deleteDeviceFile(file: DeviceFile) {
    if (!window.confirm(`Delete ${file.filename}?`)) {
      return;
    }

    setNotice("");
    try {
      const response = await fetch(`/api/device-files?id=${encodeURIComponent(file.id)}`, {
        method: "DELETE",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DeviceFilesResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete device file");
      }
      setDeviceFolder(data.folder ?? deviceFolder);
      setDeviceFiles(data.files ?? deviceFiles.filter((item) => item.id !== file.id));
      setDeviceSafety(data.safety ?? deviceSafety);
      setNotice(`${file.filename} removed.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete device file");
    }
  }

  async function rotateDeviceShortCode() {
    if (!window.confirm("Regenerate the TV code? Existing short TV links will stop working.")) {
      return;
    }

    setNotice("");
    try {
      const response = await fetch("/api/device-files", {
        body: JSON.stringify({ action: "rotate-short-code" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DeviceFilesResponse;
      if (!response.ok || !data.folder) {
        throw new Error(data.error ?? "Unable to regenerate TV code");
      }
      setDeviceFolder(data.folder);
      setDeviceFiles(data.files ?? []);
      setDeviceSafety(data.safety ?? deviceSafety);
      setNotice("TV code regenerated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to regenerate TV code");
    }
  }

  async function setDeviceFilesEnabled(enabled: boolean) {
    setNotice("");
    try {
      const response = await fetch("/api/device-files", {
        body: JSON.stringify({ action: "set-enabled", enabled }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DeviceFilesResponse;
      if (!response.ok || !data.safety) {
        throw new Error(data.error ?? "Unable to update Device Files");
      }
      setDeviceFolder(data.folder ?? deviceFolder);
      setDeviceFiles(data.files ?? deviceFiles);
      setDeviceSafety(data.safety);
      setNotice(enabled ? "Device Files enabled." : "Device Files paused.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update Device Files");
    }
  }

  const isDevicePaused = deviceSafety ? !deviceSafety.enabled : false;
  const isDeviceLimitReached = deviceSafety?.isStorageLimitReached ?? false;
  const canUpload = !isUploading && !isDevicePaused && !isDeviceLimitReached;
  const storagePercent = deviceSafety ? Math.min(Math.max(deviceSafety.percentUsed, 0), 100) : 0;
  const storageLabel = deviceSafety
    ? `${fileSizeLabel(deviceSafety.totalSize)} of ${fileSizeLabel(deviceSafety.storageLimitBytes)} used`
    : "Loading storage";

  return (
    <main className="device-page-shell" data-theme={theme}>
      <header className="device-page-header">
        <div>
          <p className="eyebrow">Data</p>
          <h1>Device Files</h1>
        </div>
        <div className="device-page-header-actions">
          <button
            className="utility-button"
            type="button"
            aria-label="Toggle color theme"
            onClick={toggleTheme}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <a className="utility-button" href="/journal">
            Journal
          </a>
          <button className="utility-button" type="button" onClick={() => void loadDeviceFiles()}>
            Refresh
          </button>
        </div>
      </header>

      <section className="device-page-toolbar" aria-label="Device file sharing">
        <div className="device-page-code">
          <span>TV Code</span>
          <strong>{isLoading ? "------" : deviceFolder?.shortCode ?? "------"}</strong>
          {deviceFolder ? <code>{deviceFolder.shortUrl}</code> : null}
        </div>
        <div className="device-page-toolbar-actions">
          <button
            className="secondary-button"
            disabled={!deviceFolder}
            type="button"
            onClick={() => deviceFolder && void copyLink(deviceFolder.shortUrl, "TV base link")}
          >
            Copy TV Base
          </button>
          <button
            className="secondary-button"
            disabled={!deviceFolder}
            type="button"
            onClick={() => void rotateDeviceShortCode()}
          >
            Regenerate TV Code
          </button>
          <button
            className={`secondary-button${isDevicePaused ? "" : " danger"}`}
            disabled={!deviceSafety}
            type="button"
            onClick={() => void setDeviceFilesEnabled(isDevicePaused)}
          >
            {isDevicePaused ? "Enable Device Files" : "Pause Device Files"}
          </button>
        </div>
      </section>

      <section className="device-safety-panel" aria-label="Device Files safety limits">
        <div>
          <span>Storage Safety</span>
          <strong>{storageLabel}</strong>
        </div>
        <div className="device-storage-meter" aria-hidden="true">
          <span style={{ width: `${storagePercent}%` }} />
        </div>
        <small>
          {isDevicePaused
            ? "Paused: public links and uploads are blocked."
            : isDeviceLimitReached
              ? "Limit reached: delete files before uploading more."
              : "Uploads stop before the R2 free storage tier is exhausted."}
        </small>
      </section>

      <label
        className={`device-drop-zone${isDragActive ? " active" : ""}${canUpload ? "" : " disabled"}`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} disabled={!canUpload} multiple type="file" onChange={handleInputChange} />
        <span>
          {isUploading
            ? "Uploading..."
            : isDevicePaused
              ? "Paused"
              : isDeviceLimitReached
                ? "Limit reached"
                : "Drop files here"}
        </span>
        <strong>{isUploading ? "Please keep this page open" : canUpload ? "Choose Files" : "Uploads blocked"}</strong>
      </label>

      {notice ? <p className="device-page-notice">{notice}</p> : null}

      <section className="device-file-table-shell" aria-busy={isLoading || isUploading}>
        <div className="device-file-table-header">
          <strong>{deviceFiles.length} file{deviceFiles.length === 1 ? "" : "s"}</strong>
          <span>{isLoading ? "Loading" : "Ready"}</span>
        </div>
        <div className="device-file-table-scroll">
          <table className="device-file-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Updated</th>
                <th>TV Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deviceFiles.map((file) => (
                <tr key={file.id}>
                  <td>
                    <strong>{file.filename}</strong>
                    <span>{contentTypeLabel(file.contentType)}</span>
                  </td>
                  <td>{fileSizeLabel(file.size)}</td>
                  <td>{updatedLabel(file.updatedAt)}</td>
                  <td>
                    <code>{file.shortUrl}</code>
                  </td>
                  <td>
                    <div className="device-file-row-actions">
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => void copyLink(file.shortUrl, "TV file link")}
                      >
                        Copy
                      </button>
                      <a className="table-action" href={file.shortUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                      <button
                        className="table-action danger"
                        type="button"
                        onClick={() => void deleteDeviceFile(file)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!deviceFiles.length ? (
                <tr>
                  <td colSpan={5}>
                    <p className="device-file-table-empty">
                      {isLoading ? "Loading files..." : "No device files yet."}
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
