import React, { useState, useEffect, useRef } from 'react';

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  suffixColor?: 'gray' | 'amber' | 'orange' | 'rose';
}

const MoneyInput: React.FC<MoneyInputProps> = ({
  value, onChange,
  placeholder = 'VD: 5.000.000',
  className = '', disabled = false, required = false,
  id, name, min, max, suffixColor = 'gray',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const formatDisplay = (num: number): string => {
    if (!num && num !== 0) return '';
    return num.toLocaleString('vi-VN');
  };
  const parseRaw = (raw: string): number => {
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };
  const [display, setDisplay] = useState<string>(value ? formatDisplay(value) : '');
  useEffect(() => {
    const numeric = parseRaw(display);
    if (numeric !== value) setDisplay(value ? formatDisplay(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseRaw(raw);
    const clamped = max !== undefined ? Math.min(numeric, max) : numeric;
    const final = min !== undefined ? Math.max(clamped, min) : clamped;
    const formatted = final > 0 ? formatDisplay(final) : '';
    const cursorOffset = raw.length - (e.target.selectionStart ?? raw.length);
    setDisplay(formatted);
    onChange(final);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = Math.max(0, formatted.length - cursorOffset);
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  };
  const handleBlur = () => {
    const numeric = parseRaw(display);
    setDisplay(numeric > 0 ? formatDisplay(numeric) : '');
  };
  const sfx: Record<string, string> = {
    gray: 'text-gray-500', amber: 'text-amber-700',
    orange: 'text-orange-600', rose: 'text-rose-600',
  };
  return (
    <div className='relative w-full'>
      <input
        ref={inputRef} id={id} name={name}
        type='text' inputMode='numeric' pattern='[0-9.]*'
        value={display} onChange={handleChange} onBlur={handleBlur}
        placeholder={placeholder} disabled={disabled} required={required}
        className={'w-full pr-8 font-mono ' + className}
      />
      <div className={'absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none font-bold text-xs font-mono select-none ' + (sfx[suffixColor] ?? sfx.gray)}>
        đ
      </div>
    </div>
  );
};

export default MoneyInput;