import { useState } from 'react';

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
}

export default function Calendar({ year, month, days, todaySpent, todayDate }: CalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<CalendarDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const daysMap = new Map(days.map((d) => [d.date.split('T')[0], d]));

  // Calculate days in month and first day of week
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  // Adjust to Monday start (0 = Mon, ..., 6 = Sun)
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const formatDate = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getDayInfo = (day: number) => {
    const dateStr = formatDate(day);
    return daysMap.get(dateStr);
  };

  const getDayClass = (day: number) => {
    const dateStr = formatDate(day);
    const info = daysMap.get(dateStr);
    const isToday = todayDate === dateStr;

    if (isToday) {
      return 'bg-secondary/20 border-secondary text-secondary';
    }
    if (!info) {
      return 'bg-surface border-border/50 text-text-muted';
    }
    if (info.status === 'positive') {
      return 'bg-primary/15 border-primary/30 text-primary';
    }
    if (info.status === 'negative') {
      return 'bg-danger/15 border-danger/30 text-danger';
    }
    return 'bg-border/30 border-border text-text-muted';
  };

  const handleMouseEnter = (day: number, e: React.MouseEvent) => {
    const info = getDayInfo(day);
    if (info) {
      setHoveredDay(info);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    }
  };

  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Compute month summary
  const summary = {
    positive: days.filter((d) => d.status === 'positive').length,
    negative: days.filter((d) => d.status === 'negative').length,
    neutral: days.filter((d) => d.status === 'neutral').length,
  };

  return (
    <div className="space-y-4 relative">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-2 text-xs text-text-muted text-center">
        {dayLabels.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, i) => {
          if (cell === null) {
            return <div key={`empty-${i}`} className="aspect-square"></div>;
          }
          const info = getDayInfo(cell);
          return (
            <div
              key={cell}
              onMouseEnter={(e) => handleMouseEnter(cell, e)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-sm transition-all ${getDayClass(cell)} ${info ? 'cursor-pointer hover:scale-105' : ''}`}
            >
              <span className="font-semibold">{cell}</span>
              {info && (
                <span className="text-[10px] mt-0.5 opacity-70">
                  {info.status === 'positive' ? '+' : info.status === 'negative' ? '−' : '·'}
                  ${Math.abs(info.surplus).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-muted pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/40 border border-primary/40"></div>
          <span>Positivo ({summary.positive})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-danger/40 border border-danger/40"></div>
          <span>Negativo ({summary.negative})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-border border border-border"></div>
          <span>Neutro ({summary.neutral})</span>
        </div>
        {todayDate && todaySpent !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-secondary/40 border border-secondary"></div>
            <span>Hoy (${todaySpent.toLocaleString('es-AR', { maximumFractionDigits: 0 })} gastado)</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none bg-surface border border-border rounded-xl p-3 shadow-2xl text-xs"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold text-sm mb-1">
            {new Date(hoveredDay.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="space-y-0.5 text-text-muted">
            <div>Presupuesto: <span className="text-text">${hoveredDay.budget.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
            <div>Gastado: <span className="text-danger">${hoveredDay.spent.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
            <div>
              {hoveredDay.surplus >= 0 ? 'Sobró: ' : 'Pasaste: '}
              <span className={hoveredDay.surplus >= 0 ? 'text-primary' : 'text-danger'}>
                ${Math.abs(hoveredDay.surplus).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>Excedente: <span className="text-warning">${hoveredDay.excedent_balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
