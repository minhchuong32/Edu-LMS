import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Children() {
  return (
    <PagePlaceholder
      title="Children Academic Profiles"
      desc="Check enrollment files, active classes databases, study status reports, and classroom advisor contacts."
      badgeText="Family Admin"
      badgeRole="Parent"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }
    />
  );
}
