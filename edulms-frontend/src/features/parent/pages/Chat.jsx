import PagePlaceholder from "../../../components/common/PagePlaceholder";

export default function Chat() {
  return (
    <PagePlaceholder
      title="Teacher Contact Channels"
      desc="Open text chat with course teachers, set parent-teacher appointments, and discuss children learning status reports."
      badgeText="Teacher Messenger"
      badgeRole="Parent"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      }
    />
  );
}
