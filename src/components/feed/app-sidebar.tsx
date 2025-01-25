"use client";

import { Home, Compass, Bell, User, Video, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: "Home", href: "/feed" },
    { icon: Compass, label: "Discover", href: "/discover" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Video, label: "Upload", href: "/upload" },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-64 border-r border-gray-800 bg-black p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <Video className="h-6 w-6 text-primary" />
        <span className="font-bold text-xl text-white">PopReel</span>
      </div>

      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start mb-2 ${
                  isActive
                    ? "bg-gray-900 text-primary"
                    : "text-gray-400 hover:text-primary hover:bg-gray-900"
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:text-primary hover:bg-gray-900"
        >
          <Settings className="h-5 w-5 mr-3" />
          Settings
        </Button>
      </div>
    </div>
  );
}
