import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Logs() {
  return (
    <PagePlaceholder
      title="System Activity & Auth Logs"
      desc="Live logs tracking token generations, security assertions, database updates, background docker triggers, and system sync errors."
      badgeText="Server Audit"
      badgeRole="Admin"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      }
    />
  );
}
