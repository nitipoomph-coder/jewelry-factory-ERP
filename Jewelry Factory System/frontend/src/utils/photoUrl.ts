// ============================================================================
// photoUrl — SSOT สำหรับ URL รูปสินค้า (เสิร์ฟ from network file share ผ่าน Photo Bridge)
// ----------------------------------------------------------------------------
// รูป All ในSystem ดึง from network path (\\<PHOTO_SERVER>\Cost) ผ่าน backend
// endpoint /api/photos/ps/:itemNo (server.js — unauthenticated, res.sendFile)
//
// ใช้ relative path เพื่อให้ผ่าน Vite proxy (/api -> :3001) ได้ทุก host บน LAN
// <img> ไม่ต้องแนบ token เพราะ Photo Bridge ไม่ได้อยู่หลัง auth middleware
// ============================================================================

export const psPhotoUrl = (itemNo?: string | null): string =>
  itemNo ? `/api/photos/ps/${encodeURIComponent(itemNo)}` : '';

/**
 * onError handler สำหรับ <img>: ถ้าโหลดรูปไม่ได้ให้ซ่อนรูปแล้วเรียก onMissing (ถ้ามี)
 * เพื่อโชว์ placeholder
 */
export function attachPhotoFallback(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  _itemNo?: string | null,
  onMissing?: () => void,
): void {
  const img = e.currentTarget;
  img.style.display = 'none';
  onMissing?.();
}
