import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ApiError, authHeader, documentDownloadUrl, type TripDocument } from "@/src/api";

const dir = () => `${FileSystem.documentDirectory}tickets/`;
const ext = (mime: string) => (mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg");
const localUri = (ref: string, d: TripDocument) => `${dir()}${ref}-${d.id}-${d.sha256.slice(0, 12)}.${ext(d.mime)}`;

/** Downloads (or reuses the saved copy of) an ACTIVE document and opens the system share/viewer sheet.
 *  Revoked or replaced documents are deleted locally and never opened. */
export async function openDocument(ref: string, d: TripDocument): Promise<void> {
  const uri = localUri(ref, d);
  if (d.status !== "active") {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    throw new ApiError({ status: 410, code: "document_revoked", message: "This document is no longer valid. Contact us if you have questions." });
  }
  await FileSystem.makeDirectoryAsync(dir(), { intermediates: true }).catch(() => {});
  const have = await FileSystem.getInfoAsync(uri);
  if (!have.exists) {
    let res;
    try {
      res = await FileSystem.downloadAsync(documentDownloadUrl(ref, d.id), uri, { headers: { ...(await authHeader()), Accept: "*/*" } });
    } catch {
      throw new ApiError({ status: 0, code: "network_error", message: "Can't download right now. Connect to the internet and try again." });
    }
    if (res.status !== 200) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      const msg = res.status === 410 ? "This document is no longer valid. Contact us if you have questions."
        : res.status === 403 ? "This document is not available yet." : "The document could not be downloaded.";
      throw new ApiError({ status: res.status, code: "document_unavailable", message: msg });
    }
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: d.mime, dialogTitle: d.title });
}

/** Remove local copies of documents the server says are no longer active. */
export async function purgeInactive(ref: string, docs: TripDocument[]) {
  for (const d of docs) if (d.status !== "active") await FileSystem.deleteAsync(localUri(ref, d), { idempotent: true }).catch(() => {});
}
