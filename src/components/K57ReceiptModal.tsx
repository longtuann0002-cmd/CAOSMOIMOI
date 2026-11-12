import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, Eye, Share2, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { RentalContract, BankConfig } from '../types';
import { getBankBin, VIET_BANKS, renderDocTypeLabel } from './ContractManager';

interface K57ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: RentalContract | null;
  bankConfig: BankConfig;
  customQrImage?: string;
  shopName?: string;
}

export const K57ReceiptModal: React.FC<K57ReceiptModalProps> = ({
  isOpen,
  onClose,
  contract,
  bankConfig,
  customQrImage,
  shopName
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Auto-detect brand name from props or storage
  const effectiveShopName = (shopName || localStorage.getItem('logoText') || 'TIỆM NHÀ CAO').trim().toUpperCase();

  // Detect iOS Safari
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Generate crisp black-and-white QR code data URL
  useEffect(() => {
    if (!contract) return;
    if (customQrImage) {
      setQrDataUrl(customQrImage);
      return;
    }
    const bin = getBankBin(bankConfig.bankId);
    const cleanAccount = (bankConfig.accountNo || '').trim();
    if (!cleanAccount) return;

    // Napas standard QR string
    const f00 = '000201';
    const f01 = '010211';
    const sub00 = '0010A000000727';
    const sub01_sub00 = '0006' + bin;
    const sub01_sub01 = '01' + cleanAccount.length.toString().padStart(2, '0') + cleanAccount;
    const sub01_content = sub01_sub00 + sub01_sub01;
    const sub01 = '01' + sub01_content.length.toString().padStart(2, '0') + sub01_content;
    const sub02 = '0208QRIBFTTA';
    const f38_content = sub00 + sub01 + sub02;
    const f38 = '38' + f38_content.length.toString().padStart(2, '0') + f38_content;
    const f53 = '5303704';
    const f58 = '5802VN';
    const raw = f00 + f01 + f38 + f53 + f58 + '6304';

    // CRC16 Checksum
    let crc = 0xFFFF;
    for (let i = 0; i < raw.length; i++) {
      crc ^= raw.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    const checksum = crc.toString(16).toUpperCase().padStart(4, '0');
    const qrString = raw + checksum;

    QRCode.toDataURL(qrString, {
      margin: 1,
      width: 260,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }).then(url => setQrDataUrl(url)).catch(() => {});
  }, [contract, bankConfig, customQrImage]);

  if (!isOpen || !contract || typeof document === 'undefined') return null;

  // Format dates
  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTimeVN = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${mins} ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const timeRangeText = contract.is6Hours
    ? `6 tiếng: ${contract.startTime || '08:00'} - ${contract.returnTime || '14:00'} (${formatDateVN(contract.startDate)})`
    : `${formatDateVN(contract.startDate)} → ${formatDateVN(contract.endDate)}`;

  const docText = contract.customerDocType === 'Other'
    ? (contract.customerDocNote?.trim() || 'Tài sản khác')
    : `${renderDocTypeLabel(contract.customerDocType)}${
        contract.customerDocNote?.trim() &&
        !['Giữ CCCD gốc + 1.000.000đ', 'Giữ CCCD gốc', 'Giữ GPLX gốc', 'Giữ Hộ chiếu gốc', 'Đặt cọc tiền mặt'].includes(contract.customerDocNote.trim())
          ? ` (${contract.customerDocNote.trim()})`
          : ''
      }`;

  const surcharge = contract.surchargeAmount || 0;
  const finalTotal = contract.totalPrice + surcharge;
  const remaining = Math.max(0, finalTotal - contract.paidAmount);
  const bankName = VIET_BANKS.find(b => b.id === bankConfig.bankId)?.name?.split('(')[0]?.trim() || bankConfig.bankId;

  // Print handler with full iOS Safari / AirPrint support
  const handlePrint = () => {
    if (!printContainerRef.current) return;

    if (isIOS) {
      // On iOS Safari, iframe print fails silently. window.print() is the only working way.
      window.print();
      return;
    }

    // On PC / Android: print via dedicated hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '58mm';
    iframe.style.height = '100px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const receiptHtml = printContainerRef.current.innerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bill K57 - ${contract.contractCode}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                width: 58mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", Courier, monospace;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            body {
              width: 48mm;
              max-width: 48mm;
              margin: 0 auto;
              padding: 2mm 1mm;
              box-sizing: border-box;
              font-size: 11px;
              line-height: 1.35;
              color: #000000;
            }
            * {
              box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .divider {
              border-top: 1px dashed #000000;
              margin: 4px 0;
            }
            .divider-double {
              border-top: 2px solid #000000;
              margin: 5px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 4px;
            }
            .qr-img {
              display: block;
              margin: 3px auto;
              width: 36mm;
              height: 36mm;
            }
          </style>
        </head>
        <body>
          ${receiptHtml}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, fallback to window.print', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    };

    setTimeout(triggerPrint, 300);
  };

  // Export receipt image with native iOS share / popup fallback
  const handleExportImage = async () => {
    if (!printContainerRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(printContainerRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: isIOS ? 2 : 2.5,
        width: 340,
      });

      const filename = `Bill_K57_${contract.contractCode}.png`;

      // 1. Try native Web Share API (Safari / iOS / Chrome Mobile)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Hóa đơn K57 ${contract.contractCode}`,
              text: `Hóa đơn bàn giao ${contract.contractCode} - ${contract.customerName}`
            });
            setIsExporting(false);
            return;
          }
        } catch (shareErr) {
          // User cancelled or share dismissed
          console.log('Share dismissed or unsupported:', shareErr);
        }
      }

      // 2. On PC: download via <a> link
      if (!isIOS) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 3. Always open in-app image preview so iPhone users can touch & hold to save
      setPreviewImageUrl(dataUrl);
    } catch (err) {
      console.error('Lỗi khi xuất ảnh bill K57:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <>
      {/* Global Print Styles for iOS Safari AirPrint */}
      <style>{`
        @media print {
          body > *:not(#k57-print-root) {
            display: none !important;
          }
          #k57-print-root {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 58mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          #k57-printable-receipt {
            width: 48mm !important;
            margin: 0 auto !important;
            padding: 2mm 1mm !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="k57-print-root" className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-150 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-orange-400" />
              <h3 className="font-bold text-sm tracking-wide">Hóa Đơn In Khổ K57 (58mm)</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body: Scrollable Preview */}
          <div className="p-4 bg-gray-100 flex flex-col items-center max-h-[75vh] overflow-y-auto">
            <div className="text-[11px] text-gray-500 mb-2 flex items-center gap-1 no-print">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span>Xem trước cuộn in nhiệt 58mm (không kèm chữ ký):</span>
            </div>

            {/* Thermal Paper Bill Simulation */}
            <div className="w-[300px] bg-white text-black p-3.5 shadow-md border border-gray-300 rounded-sm font-mono text-[11px] leading-[1.35] box-border select-none">
              <div id="k57-printable-receipt" ref={printContainerRef}>
                {/* Header */}
                <div className="text-center font-black text-xs uppercase tracking-tight">
                  {effectiveShopName}
                </div>
                <div className="text-center font-bold text-[10.5px] mt-0.5">
                  HÓA ĐƠN BÀN GIAO &amp; THANH TOÁN
                </div>

                <div className="border-t border-dashed border-black my-1.5" />

                <div className="flex justify-between">
                  <span>Mã HĐ:</span>
                  <span className="font-bold">{contract.contractCode}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>Ngày lập:</span>
                  <span>{formatDateTimeVN(contract.createdAt)}</span>
                </div>

                <div className="border-t border-dashed border-black my-1.5" />

                {/* Customer details */}
                <div className="flex justify-between">
                  <span>Khách:</span>
                  <span className="font-bold">{contract.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>SĐT:</span>
                  <span className="font-bold">{contract.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="shrink-0">Thế chấp:</span>
                  <span className="font-bold text-right ml-1">{docText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="shrink-0">Thời hạn:</span>
                  <span className="font-bold text-right ml-1">{timeRangeText}</span>
                </div>

                <div className="border-t border-dashed border-black my-1.5" />

                {/* Items List - Clothing specific formatting */}
                <div className="font-bold mb-1">DANH SÁCH TRANG PHỤC:</div>
                {contract.items && contract.items.length > 0 ? (
                  contract.items.map((item, idx) => (
                    <div key={idx} className="mb-1.5">
                      <div className="font-bold">
                        {idx + 1}. {item.cameraName}
                      </div>
                      {(item.size || item.color) && (
                        <div className="text-[10px] text-gray-700 pl-2">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.size && item.color && <span> • </span>}
                          {item.color && <span>Màu: {item.color}</span>}
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] text-gray-800 pl-2">
                        <span>SL: {item.quantity || 1}</span>
                        <span className="font-bold">
                          {item.dailyRate
                            ? (item.dailyRate * (item.quantity || 1)).toLocaleString('vi-VN') + 'đ'
                            : ''}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="italic text-gray-500">Chưa có trang phục</div>
                )}

                <div className="border-t border-dashed border-black my-1.5" />

                {/* Financial Calculation */}
                <div className="flex justify-between">
                  <span>Tiền thuê đồ:</span>
                  <span>{contract.totalPrice.toLocaleString('vi-VN')}đ</span>
                </div>

                {Boolean(contract.discountPercent) && (
                  <div className="flex justify-between text-gray-700">
                    <span>Giảm giá:</span>
                    <span>-{contract.discountPercent}%</span>
                  </div>
                )}

                {Boolean(contract.surchargeAmount) && (
                  <div className="flex justify-between text-gray-700">
                    <span>Phụ thu:</span>
                    <span>+{contract.surchargeAmount?.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Cọc thế chấp:</span>
                  <span>{(contract.depositAmount || 0).toLocaleString('vi-VN')}đ</span>
                </div>

                <div className="flex justify-between font-bold">
                  <span>Đã thanh toán:</span>
                  <span>{contract.paidAmount.toLocaleString('vi-VN')}đ</span>
                </div>

                <div className="border-t-2 border-black my-1.5" />

                <div className="flex justify-between font-black text-xs">
                  <span>CÒN LẠI CẦN THU:</span>
                  <span>
                    {remaining > 0 ? `${remaining.toLocaleString('vi-VN')}đ` : '0đ (ĐÃ THU ĐỦ)'}
                  </span>
                </div>

                {/* QR Code */}
                {qrDataUrl && (
                  <>
                    <div className="border-t border-dashed border-black my-1.5" />
                    <div className="text-center">
                      <div className="font-bold text-[9.5px]">QUÉT MÃ VIETQR THANH TOÁN</div>
                      <img
                        src={qrDataUrl}
                        alt="VietQR"
                        className="w-[130px] h-[130px] mx-auto my-1 border border-black/10"
                      />
                      <div className="font-bold text-[9.5px]">
                        {bankConfig.accountNo} • {bankName}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-800">
                        {bankConfig.accountName}
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-dashed border-black my-2" />

                {/* Footer Note - No signature section as requested */}
                <div className="text-center text-[9.5px] italic text-gray-700">
                  * Quý khách vui lòng kiểm tra kỹ trang phục khi nhận bàn giao.
                  <br />
                  Cảm ơn Quý Khách!
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-wrap gap-2 justify-end items-center no-print">
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExporting}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isIOS ? <Share2 className="w-3.5 h-3.5 text-orange-600" /> : <Download className="w-3.5 h-3.5 text-orange-600" />}
              <span>{isExporting ? 'Đang tạo...' : isIOS ? 'Chia sẻ / Lưu ảnh' : 'Tải ảnh Bill K57'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In ra máy in (K57)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* In-app Image Preview Popup for iPhone touch & hold to save */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto no-print animate-in fade-in duration-150"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="bg-white rounded-2xl p-4 max-w-sm w-full flex flex-col items-center gap-3 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <h4 className="font-bold text-sm text-gray-900 flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Đã tạo ảnh Bill K57!
              </h4>
              <p className="text-[11px] text-gray-600">
                {isIOS ? '👉 Nhấn giữ vào ảnh bên dưới 1-2 giây rồi chọn "Lưu vào Ảnh" (Save to Photos) hoặc Chia sẻ qua Zalo.' : 'Bạn có thể xem hoặc lưu ảnh bên dưới.'}
              </p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 shadow-inner p-2 bg-gray-50 flex justify-center w-full">
              <img 
                src={previewImageUrl} 
                alt="Bill K57" 
                className="max-w-[280px] w-full h-auto rounded shadow-sm select-auto"
                style={{ WebkitTouchCallout: 'default' }}
              />
            </div>

            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
            >
              ✕ Đóng ảnh xem trước
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
