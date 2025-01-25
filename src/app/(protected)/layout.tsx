import { AppSidebar } from "@/components/feed/app-sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-black">
      <AppSidebar />
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}
