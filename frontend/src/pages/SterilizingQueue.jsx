import WorkflowQueuePage from "../components/WorkflowQueuePage";

export default function SterilizingQueue() {
  return (
    <WorkflowQueuePage
      fromStatus="WASHING"
      toStatus="STERILIZING"
      title="Sterilizing Queue"
      description="Washed items — confirm clean and move to sterilizer"
      actionLabel="Move to Sterilizing"
    />
  );
}
