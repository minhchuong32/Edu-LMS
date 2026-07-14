import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Quizzes() {
  return (
    <PagePlaceholder
      title="Active Quiz Board"
      desc="Start ongoing online tests, check score sheets, verify correct solutions, and track exam deadlines."
      badgeText="Exam Center"
      badgeRole="Student"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
        </svg>
      }
    />
  );
}
