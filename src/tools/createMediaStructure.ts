import fs from 'fs/promises';
import path from 'path';

export interface MediaAssetParams {
  humanIdShort: string; // e.g., '19' or short UUID segment
  stageName: string;    // e.g., 'Stevie Wonder'
  albumTitle?: string;  // e.g., 'Hotter Than July'
}

/**
 * Deterministically generates the physical folder structure for an artist's media assets.
 * Based on the Media Management Design architecture.
 */
export async function createMediaStructure({ humanIdShort, stageName, albumTitle }: MediaAssetParams) {
  // Sanitize the artist folder name (remove spaces, special characters)
  const sanitizedArtistName = stageName.replace(/[^a-zA-Z0-9]/g, '');
  const artistPrefix = `${humanIdShort}-${sanitizedArtistName}`;
  
  // Base media assets path (could also be pulled from an environment variable)
  const baseMediaPath = path.resolve(process.cwd(), 'media_assets', 'artists', artistPrefix);

  const pathsToCreate = [
    path.join(baseMediaPath, 'profile'),
    path.join(baseMediaPath, 'products', 'photos'),
    path.join(baseMediaPath, 'products', 'videos'),
    path.join(baseMediaPath, 'products', 'music', 'masters'),
    path.join(baseMediaPath, 'products', 'music', 'previews')
  ];

  // If an album title is provided, scaffold the specific album directory
  if (albumTitle) {
    // Basic sanitization for folder names
    const safeAlbumTitle = albumTitle.replace(/[\\/:*?"<>|]/g, '');
    pathsToCreate.push(path.join(baseMediaPath, 'products', 'music', 'masters', safeAlbumTitle));
    pathsToCreate.push(path.join(baseMediaPath, 'products', 'music', 'previews', safeAlbumTitle));
  }

  try {
    for (const dir of pathsToCreate) {
      await fs.mkdir(dir, { recursive: true });
    }
    console.log(`[MediaManager] Successfully verified/scaffolded structure for ${artistPrefix}`);
    return { success: true, baseMediaPath };
  } catch (error) {
    console.error(`[MediaManager] Failed to create structure for ${artistPrefix}:`, error);
    return { success: false, error };
  }
}
