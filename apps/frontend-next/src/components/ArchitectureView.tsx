import React from 'react';

const ArchitectureView: React.FC = () => {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">System Architecture Design</h2>
        <p className="text-gray-500">
          Proposed infrastructure for the B2B Log Monitoring System using BigQuery, NestJS, and NextJS.
        </p>
      </div>

      {/* Diagram Container */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12 relative">
        {/* Source */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 relative group hover:border-blue-500 transition-colors">
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
          </div>
          <h3 className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-wider">Data Source</h3>
          <div className="text-xl font-semibold text-gray-900 mb-2">B2B Partners</div>
          <p className="text-sm text-gray-500">External services sending webhooks, API calls, and transaction logs.</p>
        </div>

        {/* Storage */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 relative group hover:border-yellow-500 transition-colors">
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block text-gray-400">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
          </div>
          <h3 className="text-yellow-400 font-bold mb-2 uppercase text-xs tracking-wider">Data Warehouse</h3>
          <div className="text-xl font-semibold text-gray-900 mb-2">Google BigQuery</div>
          <p className="text-sm text-gray-500">Massive scale storage. Logs are partitioned by date and clustered by PartnerID.</p>
        </div>

        {/* Backend */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 relative group hover:border-red-500 transition-colors">
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block text-gray-400">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
          </div>
          <h3 className="text-red-400 font-bold mb-2 uppercase text-xs tracking-wider">Backend API</h3>
          <div className="text-xl font-semibold text-gray-900 mb-2">NestJS</div>
          <p className="text-sm text-gray-500">
            Node.js framework.
            <br />• <b>@google-cloud/bigquery</b> for querying.
            <br />• <b>BullMQ</b> for scheduled aggregation jobs.
            <br />• <b>Redis</b> for caching hot queries.
          </p>
        </div>

         {/* Client */}
         <div className="bg-white border border-gray-200 rounded-xl p-6 lg:col-span-2 relative group hover:border-emerald-500 transition-colors">
          <h3 className="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-wider">Frontend Application</h3>
          <div className="text-xl font-semibold text-gray-900 mb-2">Next.js (React)</div>
          <p className="text-sm text-gray-500">
            Server Side Rendering (SSR) for initial load. SWR or TanStack Query for client-side polling of log updates.
            Visualized with Recharts and Tailwind CSS.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Implementation Strategy</h3>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-semibold text-blue-400 mb-2">1. The Pipeline</h4>
          <p className="text-gray-600 leading-relaxed">
            Directly querying BigQuery for every frontend page load is slow and expensive. 
            The <b>NestJS</b> backend should implement a &quot;Materialized View&quot; pattern. 
            A Cron job (using NestJS Task Scheduling) runs every minute to aggregate metrics (Count, Error Rate) from BigQuery 
            and stores them in a fast read-layer (Postgres or Redis). 
            The <b>Next.js</b> frontend reads from this fast layer for the dashboard, and only hits BigQuery directly when the user opens the &quot;Log Explorer&quot; for deep dives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-red-400 mb-2">2. NestJS Backend Structure</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
              <li><code>src/logs/logs.controller.ts</code>: API Endpoints.</li>
              <li><code>src/logs/logs.service.ts</code>: Business Logic.</li>
              <li><code>src/bigquery/bigquery.provider.ts</code>: DB Connection.</li>
              <li><code>src/jobs/aggregator.processor.ts</code>: Background tasks.</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-emerald-400 mb-2">3. Next.js Optimization</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
              <li>Use <b>Edge Runtime</b> for low-latency API routes if proxying.</li>
              <li>Implement <b>SWR</b> for auto-revalidating dashboard data.</li>
              <li>Use <b>Virtualization</b> (react-window) for displaying thousands of log lines in the browser.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitectureView;
