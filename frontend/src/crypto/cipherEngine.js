// Hybrid WebCrypto + Fallback Cipher Engine so LAN IPs (192.168.x.x over HTTP) never crash!
const isSubtleAvailable = typeof window !== 'undefined' && window.crypto && window.crypto.subtle;
function xorCipher(text, keyStr) {
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(keyStr || 'cipherchat_default_secret_key_256');
  const out = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    out[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  let binary = '';
  for (let i = 0; i < out.byteLength; i++) {
    binary += String.fromCharCode(out[i]);
  }
  return btoa(binary);
}
function xorDecipher(base64Cipher, keyStr) {
  try {
    const binary = atob(base64Cipher);
    const cipherBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i);
    }
    const keyBytes = new TextEncoder().encode(keyStr || 'cipherchat_default_secret_key_256');
    const out = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      out[i] = cipherBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(out);
  } catch {
    return base64Cipher;
  }
}
export async function getOrCreateIdentityKeys(username) {
  const storageKey = `cipherchat_keys_${username}`;
  const saved = localStorage.getItem(storageKey);
  if (!isSubtleAvailable) {
    // Fallback for HTTP LAN IPs (like http://192.168.1.32:5173) where browsers disable crypto.subtle
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { publicKeyBase64: parsed.publicKeyBase64 || btoa(username), privateKey: parsed.privateKey || username };
      } catch {}
    }
    const fallbackObj = { publicKeyBase64: btoa(`PUB_${username}_256`), privateKey: `PRIV_${username}_256` };
    localStorage.setItem(storageKey, JSON.stringify(fallbackObj));
    return fallbackObj;
  }
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.privateJwk) {
        const privateKey = await window.crypto.subtle.importKey(
          'jwk',
          parsed.privateJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          ['deriveKey', 'deriveBits']
        );
        return { publicKeyBase64: parsed.publicKeyBase64, privateKey };
      }
    } catch (e) {
      console.warn('Re-generating keys due to format change', e);
    }
  }
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const pubRaw = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(pubRaw)));
  const privateJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  localStorage.setItem(storageKey, JSON.stringify({ publicKeyBase64, privateJwk }));
  return { publicKeyBase64, privateKey: keyPair.privateKey };
}
async function deriveAesKey(privateKey, partnerPublicKeyBase64) {
  const pubBinary = atob(partnerPublicKeyBase64);
  const pubBytes = new Uint8Array(pubBinary.length);
  for (let i = 0; i < pubBinary.length; i++) pubBytes[i] = pubBinary.charCodeAt(i);
  const partnerPubKey = await window.crypto.subtle.importKey(
    'raw',
    pubBytes.buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
  return window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: partnerPubKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
export async function encryptText(plaintext, privateKey, partnerPublicKeyBase64) {
  if (!isSubtleAvailable || typeof privateKey === 'string' || !partnerPublicKeyBase64 || partnerPublicKeyBase64.startsWith('UFVCXw')) {
    return {
      ciphertext: xorCipher(plaintext, 'SHARED_CIPHERCHAT_SECRET_256'),
      iv: 'FALLBACK_IV',
    };
  }
  try {
    const aesKey = await deriveAesKey(privateKey, partnerPublicKeyBase64);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
    let binary = '';
    const bytes = new Uint8Array(encrypted);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      ciphertext: btoa(binary),
      iv: btoa(String.fromCharCode(...iv)),
    };
  } catch {
    return {
      ciphertext: xorCipher(plaintext, 'SHARED_CIPHERCHAT_SECRET_256'),
      iv: 'FALLBACK_IV',
    };
  }
}
export async function decryptText(ciphertextBase64, ivBase64, privateKey, partnerPublicKeyBase64) {
  if (ivBase64 === 'PLAINTEXT') return ciphertextBase64;
  if (ivBase64 === 'FALLBACK_IV' || !isSubtleAvailable || typeof privateKey === 'string') {
    return xorDecipher(ciphertextBase64, 'SHARED_CIPHERCHAT_SECRET_256');
  }
  try {
    const aesKey = await deriveAesKey(privateKey, partnerPublicKeyBase64);
    const ivBinary = atob(ivBase64);
    const iv = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) iv[i] = ivBinary.charCodeAt(i);
    const cipherBinary = atob(ciphertextBase64);
    const cipherBytes = new Uint8Array(cipherBinary.length);
    for (let i = 0; i < cipherBinary.length; i++) cipherBytes[i] = cipherBinary.charCodeAt(i);
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipherBytes.buffer);
    return new TextDecoder().decode(decrypted);
  } catch {
    return xorDecipher(ciphertextBase64, 'SHARED_CIPHERCHAT_SECRET_256');
  }
}