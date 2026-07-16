import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Classes() {
  return (
    <PagePlaceholder
      title="My Active Classrooms"
      desc="Manage classroom lists, student directories, lecture materials, schedule live events, and configure attendance sheets."
      badgeText="Classroom Admin"
      badgeRole="Teacher"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2m2 2a2 2 0 110 4m0 0a2 2 0 01-2-2m2 2v7a2 2 0 01-2 2H9" />
        </svg>
      }
    />
  );
}
