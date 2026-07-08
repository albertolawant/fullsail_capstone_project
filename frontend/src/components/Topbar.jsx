import UserProfilePanel from "./UserProfilePanel";

function TopBar() {
  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
      {/* Reserved for future features such as search or page actions */}
      <div className="flex items-center gap-4"></div>

      {/* Future controls such as notifications can be added here */}
      <div className="flex items-center gap-4">
        <UserProfilePanel />
      </div>
    </header>
  );
}

export default TopBar;