import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const MONTHS = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

function parseMonthYear(val: string): { month: string; year: string } {
  if (!val) return { month: '', year: '' };
  const parts = val.split(' ');
  if (parts.length === 2) {
    const monthIdx = MONTHS.indexOf(parts[0]);
    if (monthIdx !== -1) return { month: String(monthIdx), year: parts[1] };
  }
  return { month: '', year: '' };
}

function formatMonthYear(month: string, year: string): string {
  if (!month || !year) return '';
  return `${MONTHS[parseInt(month)]} ${year}`;
}

interface Props {
  value: string; // e.g. "Янв 2022 — Дек 2023" or "Янв 2022 — настоящее время"
  onChange: (value: string) => void;
}

export default function PeriodPicker({ value, onChange }: Props) {
  const parts = value.split(' — ');
  const startParsed = parseMonthYear(parts[0] || '');
  const isPresent = parts[1] === 'настоящее время';
  const endParsed = isPresent ? { month: '', year: '' } : parseMonthYear(parts[1] || '');

  const [startMonth, setStartMonth] = useState(startParsed.month);
  const [startYear, setStartYear] = useState(startParsed.year);
  const [endMonth, setEndMonth] = useState(endParsed.month);
  const [endYear, setEndYear] = useState(endParsed.year);
  const [present, setPresent] = useState(isPresent);

  const buildValue = (sm: string, sy: string, em: string, ey: string, pres: boolean) => {
    const start = formatMonthYear(sm, sy);
    if (!start) return '';
    if (pres) return `${start} — настоящее время`;
    const end = formatMonthYear(em, ey);
    if (!end) return start;
    return `${start} — ${end}`;
  };

  const handleChange = (sm: string, sy: string, em: string, ey: string, pres: boolean) => {
    onChange(buildValue(sm, sy, em, ey, pres));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={startMonth} onValueChange={(v) => { setStartMonth(v); handleChange(v, startYear, endMonth, endYear, present); }}>
          <SelectTrigger className="w-[90px] h-9 text-xs">
            <SelectValue placeholder="Месяц" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={startYear} onValueChange={(v) => { setStartYear(v); handleChange(startMonth, v, endMonth, endYear, present); }}>
          <SelectTrigger className="w-[80px] h-9 text-xs">
            <SelectValue placeholder="Год" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">—</span>

        {present ? (
          <span className="text-xs text-muted-foreground px-2">настоящее время</span>
        ) : (
          <>
            <Select value={endMonth} onValueChange={(v) => { setEndMonth(v); handleChange(startMonth, startYear, v, endYear, present); }}>
              <SelectTrigger className="w-[90px] h-9 text-xs">
                <SelectValue placeholder="Месяц" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={endYear} onValueChange={(v) => { setEndYear(v); handleChange(startMonth, startYear, endMonth, v, present); }}>
              <SelectTrigger className="w-[80px] h-9 text-xs">
                <SelectValue placeholder="Год" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={present}
          onCheckedChange={(checked) => {
            const pres = !!checked;
            setPresent(pres);
            if (pres) { setEndMonth(''); setEndYear(''); }
            handleChange(startMonth, startYear, endMonth, endYear, pres);
          }}
        />
        <span className="text-xs text-muted-foreground">По настоящее время</span>
      </label>
    </div>
  );
}
