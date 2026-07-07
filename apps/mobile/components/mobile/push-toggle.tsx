"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { notificationsApi } from "@/lib/api";

// Utility to convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      checkSubscription();
      // Register service worker if not already
      navigator.serviceWorker.register("/sw.js").catch(err => {
        console.error("Service Worker registration failed:", err);
      });
    } else {
      setIsSupported(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
  };

  const handleToggle = async () => {
    if (!isSupported) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to enable notifications.");
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          
          // Inform backend
          await notificationsApi.unsubscribe(subscription.endpoint);
        }
        setIsSubscribed(false);
        toast.success("Notifications disabled");
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied");
          setIsLoading(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        
        // Fetch public VAPID key from backend
        const { publicKey } = await notificationsApi.getPublicKey();
        
        if (!publicKey) {
          throw new Error("Failed to get public key from server");
        }

        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Send to backend
        await notificationsApi.subscribe(subscription.toJSON() as PushSubscriptionJSON);

        setIsSubscribed(true);
        toast.success("Notifications enabled!");
      }
    } catch (error: any) {
      console.error("Push toggle error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <button 
      onClick={handleToggle}
      disabled={isLoading}
      className={`rounded-full p-2 transition-colors active:scale-95 ${
        isSubscribed 
          ? "text-brand-600 hover:bg-brand-50" 
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
      }`}
      aria-label={isSubscribed ? "Disable notifications" : "Enable notifications"}
    >
      {isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
    </button>
  );
}
