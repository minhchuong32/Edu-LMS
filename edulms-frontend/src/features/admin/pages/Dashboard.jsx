import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Dashboard() {
  return (
    <PagePlaceholder
      title="Admin System Control"
      desc="Global overview of student registration counts, server CPU loads, database health replica logs, and configuration matrices."
      badgeText="Administrator Active"
      badgeRole="Admin"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      }
    />
  );
}
