import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";

const PropertiesPage = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [guests, setGuests] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: props } = await supabase.from("properties").select("*").eq("availability_status", true).order("created_at", { ascending: false });
      setProperties(props || []);

      if (props?.length) {
        const { data: imgs } = await supabase.from("property_images").select("*");
        const map: Record<string, string> = {};
        (imgs || []).forEach((img: any) => {
          if (img.is_primary || !map[img.property_id]) map[img.property_id] = img.image_url;
        });
        setImages(map);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = properties.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (maxPrice && Number(p.price_per_night) > Number(maxPrice)) return false;
    if (guests && p.max_guests < Number(guests)) return false;
    return true;
  });

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-bold">Find Your Perfect Stay</h1>
        <p className="mt-1 text-muted-foreground">Browse our curated collection of staycation properties</p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or location" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Input type="number" placeholder="Max price/night" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-40" />
          <Select value={guests} onValueChange={setGuests}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Guests" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="6">6+</SelectItem>
              <SelectItem value="10">10+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="mt-12 text-center text-muted-foreground">Loading properties...</div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">No properties found matching your criteria.</div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PropertyCard
                key={p.id}
                id={p.id}
                name={p.name}
                location={p.location}
                pricePerNight={Number(p.price_per_night)}
                maxGuests={p.max_guests}
                imageUrl={images[p.id]}
                amenities={p.amenities || []}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default PropertiesPage;
