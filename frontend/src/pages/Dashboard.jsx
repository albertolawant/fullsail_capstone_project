import StatCard from "../components/StatCard";
import RecentContent from "../components/RecentContent";

function Dashboard() {
  return (
    <main className="flex-1 p-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-bold">Dashboard</h2>

        <button className="bg-cyan-500 hover:bg-cyan-600 px-5 py-2 rounded-lg font-semibold">
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <StatCard title="Recent Projects" value="3" />
        <StatCard title="AI Usage" value="12" />
        <StatCard title="Activity" value="Active" />
      </div>

      <RecentContent />
    </main>
  );
}

export default Dashboard;