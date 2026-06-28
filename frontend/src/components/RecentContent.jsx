function RecentContent() {
  return (
    <div className="mt-10">
      <h3 className="text-2xl font-bold mb-4">
        Recent Content
      </h3>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 text-slate-400 text-sm p-4 border-b border-slate-800">
          <p>Title</p>
          <p>Type</p>
          <p>Project</p>
          <p>Status</p>
        </div>

        <div className="grid grid-cols-4 p-4 border-b border-slate-800">
          <p>Homepage Hero</p>
          <p className="text-slate-400">
            Marketing Copy
          </p>
          <p className="text-slate-400">
            Tanio AI Website
          </p>
          <p className="text-cyan-400">
            Saved
          </p>
        </div>

        <div className="grid grid-cols-4 p-4">
          <p>Product Roadmap</p>
          <p className="text-slate-400">
            Planning
          </p>
          <p className="text-slate-400">
            Product Architect
          </p>
          <p className="text-cyan-400">
            Draft
          </p>
        </div>
      </div>
    </div>
  );
}

export default RecentContent;