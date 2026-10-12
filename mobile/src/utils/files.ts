import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { apiUrl, authHeaders } from '@/api/client';

export type LocalFile = { uri: string; name: string; type: string; size?: number; base64?: string };

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '_');
}

/**
 * Downloads an authenticated API file to the cache and opens the share sheet
 * (replaces window.open/<a download> on the web).
 */
export async function downloadAndShare(path: string, fileName: string, mimeType?: string) {
  const destination = new File(Paths.cache, safeName(fileName));
  const file = await File.downloadFileAsync(apiUrl(path), destination, { headers: authHeaders(), idempotent: true });
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}

/** Writes text (e.g. CSV) to the cache and opens the share sheet. */
export async function shareTextFile(fileName: string, content: string, mimeType = 'text/csv') {
  const file = new File(Paths.cache, safeName(fileName));
  file.create({ overwrite: true });
  // BOM so Excel opens accented characters correctly
  file.write(mimeType === 'text/csv' ? `﻿${content}` : content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = cell == null ? '' : String(cell);
          return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\n');
}

/**
 * Picks a photo (camera or library) and compresses it so uploads stay under the
 * Vercel request limit (~4.5 MB). Returns null when cancelled or permission denied.
 */
export async function pickImage(
  source: 'camera' | 'library',
  opts: { maxWidth?: number; quality?: number; base64?: boolean; square?: boolean } = {},
): Promise<LocalFile | null> {
  const { maxWidth = 1600, quality = 0.7, base64 = false, square = false } = opts;
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > maxWidth) context.resize({ width: maxWidth, height: null });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality, base64 });

  const baseName = (asset.fileName ?? `foto-${Date.now()}`).replace(/\.[^.]+$/, '');
  return { uri: saved.uri, name: `${baseName}.jpg`, type: 'image/jpeg', base64: saved.base64 };
}

/** Picks any document (PDF, images, Office files...). */
export async function pickDocument(types: string[] = ['*/*'], base64 = false): Promise<LocalFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, base64 });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', size: a.size, base64: a.base64 };
}

/**
 * Appends a local file to FormData. Expo's fetch (SDK 52+) rejects React Native's
 * `{ uri, name, type }` parts ("Unsupported FormDataPart implementation"); it needs a
 * part exposing `bytes()`, plus `name`/`type` for the filename and content-type headers.
 */
export function appendFile(form: FormData, field: string, file: LocalFile) {
  const part = { name: file.name, type: file.type, bytes: () => new File(file.uri).bytes() };
  form.append(field, part as unknown as Blob);
}

/** Reads a local file as base64 (for JSON uploads like invoices). */
export async function readBase64(uri: string) {
  return new File(uri).base64();
}

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
