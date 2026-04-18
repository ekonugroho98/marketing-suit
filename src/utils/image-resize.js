export const RESIZE_PRESETS = {
  ig_post: { w: 1080, h: 1080, label: 'Instagram Post' },
  ig_story: { w: 1080, h: 1920, label: 'Instagram Story' },
  ig_landscape: { w: 1080, h: 566, label: 'Instagram Landscape' },
  tiktok: { w: 1080, h: 1920, label: 'TikTok' },
  twitter: { w: 1200, h: 675, label: 'Twitter/X' },
  facebook: { w: 1200, h: 630, label: 'Facebook' },
  threads: { w: 1080, h: 1080, label: 'Threads Post' },
  yt_shorts: { w: 1080, h: 1920, label: 'YouTube Shorts' },
  yt_thumb: { w: 1280, h: 720, label: 'YouTube Thumbnail' },
  lynkid: { w: 1024, h: 1024, label: 'Lynk.id Product' },
  og_image: { w: 1200, h: 630, label: 'OG Image' },
}

export function resizeImage(file, targetWidth, targetHeight, format = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      canvas.width = targetWidth
      canvas.height = targetHeight

      const srcRatio = img.width / img.height
      const tgtRatio = targetWidth / targetHeight

      let sx, sy, sw, sh
      if (srcRatio > tgtRatio) {
        sh = img.height
        sw = sh * tgtRatio
        sx = (img.width - sw) / 2
        sy = 0
      } else {
        sw = img.width
        sh = sw / tgtRatio
        sx = 0
        sy = (img.height - sh) / 2
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Resize failed'))
          resolve(blob)
        },
        format,
        quality
      )
    }

    img.onerror = () => reject(new Error('Gagal memuat gambar'))
    img.src = URL.createObjectURL(file)
  })
}
