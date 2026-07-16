import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Grading() {
  return (
    <PagePlaceholder
      title="Grading & Evaluation Desk"
      desc="Examine essay submissions, review student code files, grade quiz scores, write feedback, and lock class grades."
      badgeText="Gradebook Master"
      badgeRole="Teacher"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      }
    />
  );
}
