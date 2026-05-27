interface CalendarDay {
  date: string;
  budget: number;
  spent: number;
  surplus: number;
  excedent_balance: number;
  status: 'positive' | 'negative' | 'neutral';
}

interface CalendarProps {
  year: number;
  month: number;
  days: CalendarDay[];
  todaySpent?: number;
  todayDate?: string;
  onDayClick?: (date: string) => void;
}

export default function Calendar({ year, month, days, todaySpent, todayDate, onDayClick }: CalendarProps) {
  const daysMap = new Map(days.map((d) => [d.date.split('T')[0], d]));

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const formatDate = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Compute max surplus/deficit for intensity
  const maxPositive = Math.max(0, ...days.filter((d) => d.surplus > 0).map((d) => d.surplus));
  const maxNegative = Math.max(0, ...days.filter((d) => d.surplus < 0).map((d) => Math.abs(d.surplus)));

  const getDayStyle = (day: number): React.CSSProperties => {
    const dateStr = formatDate(day);
    const info = daysMap.get(dateStr);
    const isToday = todayDate === dateStr;

    if (isToday) {
      return { backgroundColor: 'rgba(74, 222, 222, 0.15)', borderColor: '#4ADEDE', color: '#4ADEDE' };
    }
    if (!info) return {};

    if (info.status === 'positive') {
      const intensity = maxPositive > 0 ? Math.min(info.surplus / maxPositive, 1) : 0;
      const alpha = 0.1 + intensity * 0.4;
      return {
        backgroundColor: `rgba(25, 195, 125, ${alpha})`,
        borderColor: `rgba(25, 195, 125, ${0.2 + intensity * 0.4})`,
        color: '#19C37D',
      };
    }
    if (info.status === 'negative') {
      const intensity = maxNegative > 0 ? Math.min(Math.abs(info.surplus) / maxNegative, 1) : 0;
      const alpha = 0.1 + intensity * 0.4;
      return {
        backgroundColor: `rgba(255, 93, 115, ${alpha})`,
        borderColor: `rgba(255, 93, 115, ${0.2 + intensity * 0.4})`,
        color: '#FF5D73',
      };
    }
    return {
      backgroundColor: 'rgba(43, 54, 66, 0.4)',
      borderColor: '#2B3642',
      color: '#9BA9B4',
    };
  };

  const getDayClass = (day: number) => {
    const dateStr = formatDate(day);
    const info = daysMap.get(dateStr);
    const isToday = todayDate === dateStr;

    if (isToday || info) return 'border';
    return 'bg-surface border border-border text-text-muted/60';
  };

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const summary = {
    positive: days.filter((d) => d.status === 'positive').length,
    negative: days.filter((d) => d.status === 'negative').length,
    neutral: days.filter((d) => d.status === 'neutral').length,
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5 text-[11px] text-text-muted text-center font-medium">
        {dayLabels.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (cell === null) {
            return <div key={`empty-${i}`} className="h-9 md:h-10"></div>;
          }
          const dateStr = formatDate(cell);
          const isClickable = !!onDayClick;
          return (
            <button
              key={cell}
              type="button"
              disabled={!isClickable}
              onClick={() => onDayClick?.(dateStr)}
              style={getDayStyle(cell)}
              className={`h-9 md:h-10 flex items-center justify-center rounded-md text-xs font-semibold transition-all ${getDayClass(cell)} ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
            >
              {cell}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-text-muted pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(25, 195, 125, 0.5)', border: '1px solid #19C37D' }}></div>
          <span>Positivo · {summary.positive}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(255, 93, 115, 0.5)', border: '1px solid #FF5D73' }}></div>
          <span>Negativo · {summary.negative}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-border border border-border"></div>
          <span>Neutro · {summary.neutral}</span>
        </div>
        {todayDate && todaySpent !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(74, 222, 222, 0.3)', border: '1px solid #4ADEDE' }}></div>
            <span>Hoy</span>
          </div>
        )}
      </div>
    </div>
  );
}
