import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
