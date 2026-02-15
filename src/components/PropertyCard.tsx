import { MapPin, Users, Star } from "lucide-react";
import { Link } from "react-router-dom";

interface PropertyCardProps {
  id: string;
  name: string;
  location: string;
  pricePerNight: number;
  maxGuests: number;
  imageUrl?: string;
  amenities: string[];
}

const PropertyCard = ({ id, name, location, pricePerNight, maxGuests, imageUrl, amenities }: PropertyCardProps) => {
  return (
    <Link to={`/properties/${id}`} className="group block animate-fade-in">
      <div className="overflow-hidden rounded-xl shadow-card transition-all duration-300 hover:shadow-elevated">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center bg-secondary">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
          <div className="absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
            ₱{pricePerNight.toLocaleString()}<span className="font-normal text-muted-foreground">/night</span>
          </div>
        </div>
        <div className="bg-card p-4">
          <h3 className="font-heading text-lg font-semibold leading-tight">{name}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Up to {maxGuests} guests
            </div>
            {amenities.length > 0 && (
              <div className="flex gap-1">
                {amenities.slice(0, 3).map((a) => (
                  <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
