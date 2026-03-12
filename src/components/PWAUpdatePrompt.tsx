import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 30 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 30 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast({
        title: "New version available",
        description: "A new version of Villa Hermia is available. Tap refresh to update.",
        duration: Infinity,
        action: (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => updateServiceWorker(true)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        ),
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default PWAUpdatePrompt;
