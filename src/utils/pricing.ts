import { Camera } from '../types';

/**
 * Lấy đơn giá thuê tương ứng dựa trên số ngày thuê hoặc hình thức thuê 6 tiếng
 * @param camera Thiết bị camera/lens tương ứng
 * @param days Số ngày thuê (mặc định lấy ít nhất 1 ngày)
 * @param is6Hours Có phải hình thức thuê 6 tiếng hay không
 */
export function getCameraRateForDuration(camera: Camera, days: number, is6Hours?: boolean): number {
  if (is6Hours) {
    return camera.price6Hours ?? Math.round((camera.price1Day ?? camera.dailyRate) * 0.6); // Mặc định 60% giá ngày đầu
  }

  const d = Math.max(1, days);
  
  // Lấy các mốc giá đã thiết lập, nếu chưa thiết lập thì tính theo tỷ lệ mặc định từ dailyRate
  const p1 = camera.price1Day ?? camera.dailyRate;
  const p2 = camera.price2Days ?? Math.round(p1 * 0.9); // Giảm 10%
  const p3 = camera.price3Days ?? Math.round(p1 * 0.8); // Giảm 20%
  const p4 = camera.price4DaysPlus ?? Math.round(p1 * 0.7); // Giảm 30%

  if (d === 1) {
    return p1;
  }
  if (d === 2) {
    return p2;
  }
  if (d === 3) {
    return p3;
  }
  return p4;
}

/**
 * Tạo giá trị mặc định cho cấu hình giá thuê đa tầng dựa trên đơn giá mặc định
 */
export function getInitialTieredPrices(dailyRate: number) {
  return {
    price6Hours: Math.round(dailyRate * 0.6),
    price1Day: dailyRate,
    price2Days: Math.round(dailyRate * 0.9),
    price3Days: Math.round(dailyRate * 0.8),
    price4DaysPlus: Math.round(dailyRate * 0.7)
  };
}

/**
 * Kiểm tra xung đột đặt lịch giữa 6 tiếng và cả ngày / nhiều ngày
 */
export function checkBookingConflict(
  selectedCameraIds: string[],
  startDate: string,
  endDate: string,
  is6Hours: boolean,
  existingContracts: any[],
  ignoreContractId?: string
): { hasConflict: boolean; message: string } {
  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    const loop = new Date(start);
    while (loop <= end) {
      const yyyy = loop.getFullYear();
      const mm = String(loop.getMonth() + 1).padStart(2, '0');
      const dd = String(loop.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      loop.setDate(loop.getDate() + 1);
    }
    return dates;
  };

  const candidateDates = is6Hours ? [startDate] : getDatesInRange(startDate, endDate);

  for (const cameraId of selectedCameraIds) {
    for (const contract of existingContracts) {
      if (contract.status === 'Cancelled') continue;
      if (ignoreContractId && contract.id === ignoreContractId) continue;

      const hasCamera = contract.items.some((item: any) => item.cameraId === cameraId);
      if (!hasCamera) continue;

      const existingDates = contract.is6Hours ? [contract.startDate] : getDatesInRange(contract.startDate, contract.endDate);
      
      const overlapDate = candidateDates.find(d => existingDates.includes(d));
      if (overlapDate) {
        const item = contract.items.find((i: any) => i.cameraId === cameraId);
        const name = item ? item.cameraName : 'Thiết bị';
        
        if (is6Hours && !contract.is6Hours) {
          return {
            hasConflict: true,
            message: `Trùng lịch: Thiết bị "${name}" đã có hợp đồng thuê cả ngày/nhiều ngày vào ngày ${overlapDate}. Không được phép đặt thêm lịch thuê 6 tiếng!`
          };
        }
        if (!is6Hours && contract.is6Hours) {
          return {
            hasConflict: true,
            message: `Trùng lịch: Thiết bị "${name}" đã có hợp đồng thuê 6 tiếng vào ngày ${overlapDate}. Không được phép đặt thêm lịch thuê cả ngày!`
          };
        }
        if (!is6Hours && !contract.is6Hours) {
          return {
            hasConflict: true,
            message: `Trùng lịch: Thiết bị "${name}" đã có lịch thuê cả ngày/nhiều ngày vào ngày ${overlapDate}. Không thể đặt trùng!`
          };
        }
        if (is6Hours && contract.is6Hours) {
          return {
            hasConflict: true,
            message: `Trùng lịch: Thiết bị "${name}" đã có lịch thuê 6 tiếng vào ngày ${overlapDate}. Không thể đặt trùng thời gian!`
          };
        }
      }
    }
  }

  return { hasConflict: false, message: '' };
}
