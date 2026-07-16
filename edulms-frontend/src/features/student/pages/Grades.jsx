import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Grades() {
  return (
    <PagePlaceholder
      title="My Gradebook Summary"
      desc="View detailed score distributions, monitor final class ratings, read teacher grading feedback reports, and review transcripts."
      badgeText="Academic Scores"
      badgeRole="Student"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}
