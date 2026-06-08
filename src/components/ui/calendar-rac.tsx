"use client";

import { cn } from "@/lib/utils";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { ComponentProps } from "react";
import {
  Button,
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  Heading as HeadingRac,
  RangeCalendar as RangeCalendarRac,
  composeRenderProps,
} from "react-aria-components";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";

interface BaseCalendarProps {
  className?: string;
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps;
type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> & BaseCalendarProps;

const CalendarHeader = () => (
  <header className="flex w-full items-center gap-2 pb-3">
    <Button
      slot="previous"
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[disabled]:opacity-40"
    >
      <ChevronLeftIcon className="h-4 w-4" />
    </Button>
    <HeadingRac className="flex-1 text-center text-sm font-semibold tracking-tight" />
    <Button
      slot="next"
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[disabled]:opacity-40"
    >
      <ChevronRightIcon className="h-4 w-4" />
    </Button>
  </header>
);

const CalendarGridComponent = ({ isRange = false }: { isRange?: boolean }) => {
  const now = today(getLocalTimeZone());

  return (
    <CalendarGridRac className="border-separate border-spacing-y-0.5">
      <CalendarGridHeaderRac>
        {(day) => (
          <CalendarHeaderCellRac className="w-9 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className="[&_td]:px-0">
        {(date) => (
          <CalendarCellRac
            date={date}
            className={cn(
              "relative mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-sm tabular-nums text-foreground/80 outline-none transition-all",
              "data-[hovered]:bg-muted/60 data-[hovered]:text-foreground",
              "data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring",
              "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-30",
              "data-[unavailable]:line-through data-[unavailable]:opacity-40",
              "data-[outside-month]:text-muted-foreground/40",
              now.compare(date) === 0 &&
                "font-bold text-primary ring-1 ring-primary/40",
              isRange
                ? "data-[selected]:bg-primary/15 data-[selected]:text-primary data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selected]:rounded-none data-[selection-start]:rounded-l-lg data-[selection-end]:rounded-r-lg"
                : "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:font-semibold data-[selected]:shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
            )}
          />
        )}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  );
};

const Calendar = ({ className, ...props }: CalendarProps) => {
  return (
    <CalendarRac
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "w-fit rounded-2xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md",
          cls
        )
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent />
    </CalendarRac>
  );
};

const RangeCalendar = ({ className, ...props }: RangeCalendarProps) => {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "w-fit rounded-2xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md",
          cls
        )
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  );
};

export { Calendar, RangeCalendar };
