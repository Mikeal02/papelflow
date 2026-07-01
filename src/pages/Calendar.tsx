import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, RangeCalendar } from '@/components/ui/calendar-rac';
import { getLocalTimeZone, today } from '@internationalized/date';
import type { DateValue } from 'react-aria-components';

export default function CalendarPage() {
  const now = today(getLocalTimeZone());
  const [date, setDate] = useState<DateValue>(now);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Date selection and scheduling</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Single Date
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar value={date} onChange={(d) => d && setDate(d)} />
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RangeCalendar />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
