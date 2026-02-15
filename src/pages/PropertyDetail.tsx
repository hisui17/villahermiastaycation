import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { MapPin, Users, CalendarIcon, Wifi, Car, Waves, UtensilsCrossed, Wind, Tv } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";

const amenityIcons: Record<string, any> = {
  WiFi: Wifi, Parking: Car, Pool: Waves, Kitchen: UtensilsCrossed, Aircon: Wind, TV: Tv,
};

const PropertyDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      const { data } = await supabase.from("properties").select("*").eq("id", id).single();
      setProperty(data);
      const { data: imgs } = await supabase.from("property_images").select("*").eq("property_id", id);
      setImages(imgs || []);
    };
    if (id) fetchProperty();
  }, [id]);

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const totalPrice = property ? nights * Number(property.price_per_night) : 0;

  const handleBook = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!checkIn || !checkOut || nights <= 0) {
      toast({ title: "Invalid dates", description: "Please select valid check-in and check-out dates.", variant: "destructive" });
      return;
    }
    setBooking(true);
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      property_id: id,
      check_in_date: format(checkIn, "yyyy-MM-dd"),
      check_out_date: format(checkOut, "yyyy-MM-dd"),
      total_price: totalPrice,
    });
    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Booking created!", description: "Your booking is pending confirmation." });
      navigate("/bookings");
    }
    setBooking(false);
  };

  if (!property) return (
    <>
      <Navbar />
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </>
  );

  const primaryImage = images.find((i) => i.is_primary)?.image_url || images[0]?.image_url;

  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Image */}
        <div className="mb-8 overflow-hidden rounded-2xl">
          {primaryImage ? (
            <img src={primaryImage} alt={property.name} className="h-[400px] w-full object-cover" />
          ) : (
            <div className="flex h-[400px] items-center justify-center bg-secondary">
              <span className="text-muted-foreground">No image available</span>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Details */}
          <div className="lg:col-span-2">
            <h1 className="font-heading text-3xl font-bold">{property.name}</h1>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {property.location}
              <span className="mx-2">·</span>
              <Users className="h-4 w-4" /> Up to {property.max_guests} guests
            </div>

            <div className="mt-6">
              <h2 className="font-heading text-xl font-semibold">About this property</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{property.description || "No description available."}</p>
            </div>

            {property.amenities?.length > 0 && (
              <div className="mt-6">
                <h2 className="font-heading text-xl font-semibold">Amenities</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {property.amenities.map((a: string) => {
                    const Icon = amenityIcons[a];
                    return (
                      <div key={a} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                        {Icon ? <Icon className="h-4 w-4 text-accent" /> : null}
                        {a}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Booking card */}
          <div className="rounded-2xl border bg-card p-6 shadow-card lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 text-center">
              <span className="text-2xl font-bold text-primary">₱{Number(property.price_per_night).toLocaleString()}</span>
              <span className="text-muted-foreground"> / night</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Check-in</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !checkIn && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={checkIn} onSelect={setCheckIn}
                      disabled={(d) => d < new Date()} className="pointer-events-auto p-3" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium">Check-out</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !checkOut && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={checkOut} onSelect={setCheckOut}
                      disabled={(d) => d < (checkIn || new Date())} className="pointer-events-auto p-3" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {nights > 0 && (
              <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span>₱{Number(property.price_per_night).toLocaleString()} × {nights} nights</span>
                  <span>₱{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">₱{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            )}

            <Button onClick={handleBook} disabled={booking || nights <= 0} className="mt-4 w-full" size="lg">
              {booking ? "Booking..." : "Book Now"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyDetail;
