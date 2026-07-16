import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Assignments() {
  return (
    <PagePlaceholder
      title="Assignments & Quizzes Feed"
      desc="Configure quiz constraints (time limits, retake criteria), compose examination papers, and post homework details."
      badgeText="Exam Controller"
      badgeRole="Teacher"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      }
    />
  );
}
