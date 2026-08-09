import StatCard from "../components/StatCard";
import RecentContent from "../components/RecentContent";

function Dashboard() {
  return (
    <main className="flex-1 p-6 md:p-8 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-400 md:text-base">
            View your recent projects, AI activity, and latest content.
          </p>
        </div>

        <button
          type="button"
          className="w-full rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 sm:w-auto"
        >
          + New Project
        </button>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Recent Projects" value="3" />
        <StatCard title="AI Usage" value="12" />
        <StatCard title="Activity" value="Active" />
      </section>

      <section className="mt-8">
        <RecentContent />
      </section>
    </main>
  );
}

export default Dashboard;