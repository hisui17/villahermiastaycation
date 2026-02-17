import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

interface Property {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  guest_name: string;
  num_guests: number;
  check_in_date: string;
  check_out_date: string;
  booking_status: string;
  total_price: number;
}

interface BookedDay {
  date: Date;
  bookings: Booking[];
}

const BookingCalendar = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();

  useEffect(() => {
    supabase.from("properties").select("id, name").then(({ data }) => {
      if (data) setProperties(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedProperty) {
      setBookings([]);
      return;
    }
    supabase
      .from("bookings")
      .select("id, guest_name, num_guests, check_in_date, check_out_date, booking_status, total_price")
      .eq("property_id", selectedProperty)
      .not("booking_status", "eq", "cancelled")
      .then(({ data }) => setBookings(data || []));
  }, [selectedProperty]);

  const bookedDayMap = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const days = eachDayOfInterval({
        start: parseISO(b.check_in_date),
        end: parseISO(b.check_out_date),
      });
      days.forEach((d) => {
        const key = format(d, "yyyy-MM-dd");
        const existing = map.get(key) || [];
        existing.push(b);
        map.set(key, existing);
      });
    });
    return map;
  }, [bookings]);

  const bookedDates = useMemo(() => Array.from(bookedDayMap.keys()).map((k) => parseISO(k)), [bookedDayMap]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    return bookedDayMap.get(format(selectedDay, "yyyy-MM-dd")) || [];
  }, [selectedDay, bookedDayMap]);

  const statusColor = (status: string) => {
    const m: Record<string, string> = {
      pending: "text-warning",
      confirmed: "text-success",
      completed: "text-info",
    };
    return m[status] || "text-muted-foreground";
  };

  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        Booking Calendar
      </h2>

      <div className="mt-4 grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Left: Property selector + Calendar */}
        <div className="space-y-4">
          <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v); setSelectedDay(undefined); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="rounded-xl border bg-card p-3 shadow-card">
            <TooltipProvider delayDuration={200}>
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                month={month}
                onMonthChange={setMonth}
                className={cn("p-3 pointer-events-auto")}
                modifiers={{ booked: bookedDates }}
                modifiersClassNames={{ booked: "bg-primary/20 text-primary font-bold rounded-md" }}
                components={{
                  DayContent: ({ date }) => {
                    const key = format(date, "yyyy-MM-dd");
                    const dayBookings = bookedDayMap.get(key);
                    if (!dayBookings || dayBookings.length === 0) {
                      return <span>{date.getDate()}</span>;
                    }
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="relative cursor-pointer">
                            {date.getDate()}
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {dayBookings.map((b) => (
                            <div key={b.id} className="text-xs">
                              <span className="font-semibold">{b.guest_name || "Guest"}</span>
                              {" · "}{b.num_guests} pax
                              {" · "}<span className={`capitalize ${statusColor(b.booking_status)}`}>{b.booking_status}</span>
                            </div>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    );
                  },
                }}
              />
            </TooltipProvider>
          </div>
        </div>

        {/* Right: Selected day detail panel */}
        <div className="rounded-xl border bg-card p-5 shadow-card min-h-[200px]">
          {!selectedProperty ? (
            <p className="text-sm text-muted-foreground">Select a property to view its booking calendar.</p>
          ) : !selectedDay ? (
            <p className="text-sm text-muted-foreground">Click on a date to see booking details.</p>
          ) : selectedDayBookings.length === 0 ? (
            <div>
              <h3 className="font-heading font-semibold">{format(selectedDay, "MMMM d, yyyy")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">No bookings on this date.</p>
            </div>
          ) : (
            <div>
              <h3 className="font-heading font-semibold">{format(selectedDay, "MMMM d, yyyy")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{selectedDayBookings.length} booking(s)</p>
              <div className="mt-4 space-y-3">
                {selectedDayBookings.map((b) => (
                  <div key={b.id} className="rounded-lg border bg-background p-4 space-y-1">
                    <p className="font-semibold">{b.guest_name || "Guest"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(b.check_in_date), "MMM d")} – {format(parseISO(b.check_out_date), "MMM d, yyyy")}
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                      <span>{b.num_guests} pax</span>
                      <span>₱{Number(b.total_price).toLocaleString()}</span>
                      <span className={`capitalize font-medium ${statusColor(b.booking_status)}`}>{b.booking_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
