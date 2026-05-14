import WorkflowQueuePage from "../components/WorkflowQueuePage";

export default function WashingQueue() {
  return (
    <WorkflowQueuePage
      fromStatus="RECEIVED"
      toStatus="WASHING"
      title="Washing Queue"
      description="Items received from departments — confirm and begin washing"
      actionLabel="Move to Washing"
    />
  );
}
