// ============================================
// Shared Crypto Utility: AES-256-GCM
// Encrypt/decrypt OAuth tokens for connected_accounts
// ============================================
// Format: base64(iv):base64(ciphertext):base64(tag)
// - IV: 12 bytes random per encryption (GCM standard)
// - Key: 32-byte hex string from TOKEN_ENCRYPTION_KEY env var
// - Tag: 16 bytes (128-bit), appended by Web Crypto to ciphertext
// ============================================

const GCM_IV_LENGTH = 12 // 96 bits — recommended for AES-GCM
const GCM_TAG_LENGTH = 128 // bits — authentication tag length

/**
 * Convert a hex-encoded string to a Uint8Array.
 * Expects an even-length hex string (e.g. 64 hex chars = 32 bytes).
 */
function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/\s+/g, '')
  if (cleaned.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd length')
  }
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Encode a Uint8Array to a base64 string.
 */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Decode a base64 string to a Uint8Array.
 */
function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Import a 32-byte hex key as a CryptoKey for AES-256-GCM.
 */
async function importKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(hexKey)
  if (keyBytes.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY harus 32 bytes (64 hex chars), dapat ${keyBytes.length} bytes`
    )
  }
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * @param plaintext - The string to encrypt (e.g. an OAuth access token)
 * @param key - A 32-byte hex-encoded encryption key (64 hex characters)
 * @returns Encrypted string in format: base64(iv):base64(ciphertext):base64(tag)
 * Web Crypto's AES-GCM encrypt appends the auth tag to the ciphertext.
 * We split them apart so the storage format is explicit about all three components.
 */
export async function encryptToken(plaintext: string, key: string): Promise<string> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty plaintext')
  }
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY tidak tersedia. Set env variable terlebih dahulu.')
  }

  const cryptoKey = await importKey(key)

  // Generate a random 12-byte IV for each encryption operation
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH))

  // Encode plaintext to bytes
  const encoder = new TextEncoder()
  const plaintextBytes = encoder.encode(plaintext)

  // Encrypt — result includes ciphertext + appended auth tag
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: GCM_TAG_LENGTH,
    },
    cryptoKey,
    plaintextBytes
  )

  const encryptedBytes = new Uint8Array(encryptedBuffer)

  // Web Crypto appends the 16-byte (128-bit) GCM tag at the end of the ciphertext
  const tagLengthBytes = GCM_TAG_LENGTH / 8 // 16 bytes
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - tagLengthBytes)
  const tag = encryptedBytes.slice(encryptedBytes.length - tagLengthBytes)

  // Return as base64(iv):base64(ciphertext):base64(tag)
  return `${toBase64(iv)}:${toBase64(ciphertext)}:${toBase64(tag)}`
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 *
 * @param encrypted - Encrypted string in format: base64(iv):base64(ciphertext):base64(tag)
 * @param key - A 32-byte hex-encoded encryption key (64 hex characters)
 * @returns The original plaintext string
 * @throws Error with clear message if decryption fails (token re-auth needed)
 */
export async function decryptToken(encrypted: string, key: string): Promise<string> {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty string')
  }
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY tidak tersedia. Set env variable terlebih dahulu.')
  }

  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error(
      'Format token terenkripsi tidak valid (expected iv:ciphertext:tag). ' +
      'Token mungkin belum terenkripsi atau sudah rusak. Silakan hubungkan ulang akun Anda.'
    )
  }

  const [ivB64, ciphertextB64, tagB64] = parts

  let iv: Uint8Array
  let ciphertext: Uint8Array
  let tag: Uint8Array

  try {
    iv = fromBase64(ivB64)
    ciphertext = fromBase64(ciphertextB64)
    tag = fromBase64(tagB64)
  } catch (_e) {
    throw new Error(
      'Gagal decode token terenkripsi (base64 tidak valid). ' +
      'Silakan hubungkan ulang akun Anda.'
    )
  }

  if (iv.length !== GCM_IV_LENGTH) {
    throw new Error(
      `IV length tidak valid: expected ${GCM_IV_LENGTH} bytes, got ${iv.length}. ` +
      'Silakan hubungkan ulang akun Anda.'
    )
  }

  const cryptoKey = await importKey(key)

  // Web Crypto expects ciphertext + tag concatenated for decryption
  const encryptedBytes = new Uint8Array(ciphertext.length + tag.length)
  encryptedBytes.set(ciphertext, 0)
  encryptedBytes.set(tag, ciphertext.length)

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: GCM_TAG_LENGTH,
      },
      cryptoKey,
      encryptedBytes
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (_e) {
    throw new Error(
      'Gagal mendekripsi token. Kemungkinan penyebab: encryption key berubah atau token corrupt. ' +
      'Silakan hubungkan ulang akun Anda di Pengaturan → Akun Terhubung.'
    )
  }
}
