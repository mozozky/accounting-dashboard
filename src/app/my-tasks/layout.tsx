import AppSidebar from "@/components/AppSidebar";

export default function MyTasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 bg-zinc-950">{children}</main>
    </div>
  );
}
