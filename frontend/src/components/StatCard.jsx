function StatCard({ title, value }) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 h-40 border border-slate-800">
      <p className="text-slate-400">{title}</p>

      <h3 className="text-3xl font-bold mt-4">
        {value}
      </h3>
    </div>
  );
}

export default StatCard;