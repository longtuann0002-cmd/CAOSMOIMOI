import QRCode from 'qrcode';

/**
 * Calculates CRC16-CCITT checksum for EMVCo standard
 */
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates official EMVCo standard VietQR string (Napas transfer)
 * Static QR without pre-filled amount (scans to custom amount)
 */
export function generateVietQrString(bin: string, accountNo: string): string {
  const cleanAccount = (accountNo || '').trim();
  const f00 = '000201';
  const f01 = '010211'; // Static QR (payer inputs amount)
  
  // Napas subfields
  const sub00 = '0010A000000727'; // Napas GUID
  const sub01_sub00 = '0006' + bin; // Acquirer Bank BIN (6 digits)
  const sub01_sub01 = '01' + cleanAccount.length.toString().padStart(2, '0') + cleanAccount;
  const sub01_content = sub01_sub00 + sub01_sub01;
  const sub01 = '01' + sub01_content.length.toString().padStart(2, '0') + sub01_content;
  const sub02 = '0208QRIBFTTA'; // QRIBFTTA = Transfer to Account
  
  const f38_content = sub00 + sub01 + sub02;
  const f38 = '38' + f38_content.length.toString().padStart(2, '0') + f38_content;
  
  const f53 = '5303704'; // Currency VND
  const f58 = '5802VN';  // Country Vietnam
  
  const raw = f00 + f01 + f38 + f53 + f58 + '6304';
  const checksum = crc16(raw);
  return raw + checksum;
}

/**
 * Generates pure vector inline SVG string for the QR code
 * 100% offline, zero CORS, zero network requests, renders flawlessly in html-to-image exports
 */
export async function generateQrSvg(text: string): Promise<string> {
  if (!text) return '';
  return new Promise((resolve) => {
    QRCode.toString(text, { 
      type: 'svg', 
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (err, svg) => {
      if (err || !svg) {
        resolve('');
      } else {
        resolve(svg);
      }
    });
  });
}
