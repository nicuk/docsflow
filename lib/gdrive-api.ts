import { google } from 'googleapis';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// TODO: Implement token storage and retrieval for tenants
// For now, we'll use a placeholder
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN, // This should be stored per-tenant
});

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

export async function listFiles(folderId: string): Promise<GoogleDriveFile[]> {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime)',
      pageSize: 100, // Adjust as needed
    });

    return res.data.files as GoogleDriveFile[];
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    throw new Error('Failed to list Google Drive files');
  }
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as any);
  } catch (error) {
    console.error('Error downloading Google Drive file:', error);
    throw new Error('Failed to download Google Drive file');
  }
}

// TODO: Add functions for syncing files, handling permissions, etc. 