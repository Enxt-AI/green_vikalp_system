import { ChevronLeft, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { PushNotificationToggle } from "./push-toggle";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  rightActions?: React.ReactNode;
}

export function MobileHeader({ title, showBack = true, rightActions }: MobileHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white px-4 pt-safe border-b border-neutral-200 text-neutral-900 sticky top-0 z-50">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={() => router.back()}
              className="rounded-full p-1 -ml-1 hover:bg-neutral-100 text-neutral-600 transition-colors active:scale-95"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {rightActions ? (
            rightActions
          ) : (
            <>
              <PushNotificationToggle />
              <button className="rounded-full p-2 hover:bg-neutral-100 text-neutral-600 transition-colors active:scale-95">
                <Filter className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
