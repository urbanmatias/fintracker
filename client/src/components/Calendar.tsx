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
  month: number; // 1-12
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

  const getDayClass = (day: number) => {
    const dateStr = formatDate(day);
    const info = daysMap.get(dateStr);
    const isToday = todayDate === dateStr;

    if (isToday) {
      return 'bg-secondary/15 border-secondary/60 text-secondary hover:bg-secondary/20';
    }
    if (!info) {
      return 'bg-surface border-border text-text-muted/60 hover:bg-surface-light hover:text-text-muted';
    }
    if (info.status === 'positive') {
      return 'bg-primary/15 border-primary/30 text-primary hover:bg-primary/20';
    }
    if (info.status === 'negative') {
      return 'bg-danger/15 border-danger/30 text-danger hover:bg-danger/20';
    }
    return 'bg-border/40 border-border text-text-muted hover:bg-border/60';
  };

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const summary = {
    positive: days.filter((d) => d.status === 'positive').length,
    negative: days.filter((d) => d.status === 'negative').length,
    neutral: days.filter((d) => d.status === 'neutral').length,
  };

  return (
    <div className="space-y-3">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 text-[11px] text-text-muted text-center font-medium">
        {dayLabels.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      {/* Calendar grid - compact */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (cell === null) {
            return <div key={`empty-${i}`} className="h-9"></div>;
          }
          const dateStr = formatDate(cell);
          const isClickable = !!onDayClick;
          return (
            <button
              key={cell}
              type="button"
              disabled={!isClickable}
              onClick={() => onDayClick?.(dateStr)}
              className={`h-9 flex items-center justify-center rounded-md border text-xs font-medium transition-all ${getDayClass(cell)} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {cell}
            </button>
          );
        })}
      </div>

      {/* Legend - compact */}
      <div className="flex flex-wrap gap-3 text-[11px] text-text-muted pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/40 border border-primary/40"></div>
          <span>Positivo ({summary.positive})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-danger/40 border border-danger/40"></div>
          <span>Negativo ({summary.negative})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-border border border-border"></div>
          <span>Neutro ({summary.neutral})</span>
        </div>
        {todayDate && todaySpent !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-secondary/40 border border-secondary"></div>
            <span>Hoy</span>
          </div>
        )}
      </div>
    </div>
  );
}
