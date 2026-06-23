/**
 * Google Drive API Helpers for Receipt Upload
 */

// Search for the folder by name or create it if it doesn't exist
export async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      throw new Error(`Failed to search folder: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id; // Return existing folder ID
    }

    // Create the folder if it doesn't exist
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create folder: ${createRes.statusText}`);
    }

    const folder = await createRes.json();
    return folder.id;
  } catch (error) {
    console.error('Error in getOrCreateFolder:', error);
    throw error;
  }
}

// Upload file (receipt) to the folder
export async function uploadReceiptFile(
  accessToken: string,
  file: File,
  folderId: string
): Promise<{ fileId: string; viewLink: string }> {
  try {
    const filename = `Receipt_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';

    const metadata = {
      name: filename,
      parents: [folderId],
      description: 'Monthly expense payment receipt',
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to upload file to Drive: ${res.statusText} (${errText})`);
    }

    const data = await res.json();
    return {
      fileId: data.id,
      viewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`,
    };
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
}
