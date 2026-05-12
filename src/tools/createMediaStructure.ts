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
  
  // Public assets (Served statically by Astro)
  const publicMediaPath = path.resolve(process.cwd(), 'public', 'media_assets', 'artists', artistPrefix);
  
  // Private assets (Served securely via API)
  const privateMediaPath = path.resolve(process.cwd(), 'private_assets', 'artists', artistPrefix);

  const pathsToCreate = [
    // PUBLIC
    path.join(publicMediaPath, 'profile'),
    path.join(publicMediaPath, 'products', 'photos', 'low_res'),
    path.join(publicMediaPath, 'products', 'photos', 'watermark'),
    path.join(publicMediaPath, 'products', 'videos', 'thumbnails'),
    path.join(publicMediaPath, 'products', 'music', 'previews'),
    
    // PRIVATE (Premium Content)
    path.join(privateMediaPath, 'products', 'music', 'masters'),
    path.join(privateMediaPath, 'products', 'photos', 'high_res'),
    path.join(privateMediaPath, 'products', 'videos', 'source')
  ];

  // If an album title is provided, scaffold the specific album directory
  if (albumTitle) {
    // Basic sanitization for folder names
    const safeAlbumTitle = albumTitle.replace(/[\\/:*?"<>|]/g, '');
    pathsToCreate.push(path.join(privateMediaPath, 'products', 'music', 'masters', safeAlbumTitle));
    pathsToCreate.push(path.join(publicMediaPath, 'products', 'music', 'previews', safeAlbumTitle));
  }

  try {
    for (const dir of pathsToCreate) {
      await fs.mkdir(dir, { recursive: true });
    }
    console.log(`[MediaManager] Successfully verified/scaffolded structure for ${artistPrefix}`);
    return { success: true, publicMediaPath, privateMediaPath };
  } catch (error) {
    console.error(`[MediaManager] Failed to create structure for ${artistPrefix}:`, error);
    return { success: false, error };
  }
}
