import WorkflowQueuePage from "../components/WorkflowQueuePage";

export default function ReadyQueue() {
  return (
    <WorkflowQueuePage
      fromStatus="STERILIZING"
      toStatus="READY"
      title="Ready Queue"
      description="Sterilized items — inspect and mark as ready for dispatch"
      actionLabel="Mark as Ready"
    />
  );
}
