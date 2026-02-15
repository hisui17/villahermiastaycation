import heroImage from "@/assets/hero-villa.jpg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Search, MapPin, Star, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px] overflow-hidden">
        <img src={heroImage} alt="Luxury villa" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight text-primary-foreground md:text-6xl animate-fade-in">
            Your Dream Staycation Awaits
          </h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Discover handpicked villas, cozy retreats, and luxury escapes across the Philippines
          </p>
          <Button size="lg" className="mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }} onClick={() => navigate("/properties")}>
            <Search className="mr-2 h-4 w-4" /> Explore Properties
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-center font-heading text-3xl font-bold">Why VillaverHermia?</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            { icon: MapPin, title: "Prime Locations", desc: "Hand-selected properties in the most beautiful spots across the Philippines." },
            { icon: Star, title: "Verified Quality", desc: "Every listing is personally inspected to ensure the highest standards." },
            { icon: Shield, title: "Secure Booking", desc: "Safe, transparent booking process with instant confirmation." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-8 text-center shadow-card transition-shadow hover:shadow-elevated">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-heading text-lg font-semibold text-foreground">VillaverHermia</p>
          <p className="mt-1">Your trusted staycation partner in the Philippines</p>
          <p className="mt-4">© {new Date().getFullYear()} VillaverHermia. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
};

export default Index;
