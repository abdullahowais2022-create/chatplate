import "server-only";
import type { Job } from "../queue";
import { processWebhookEvent } from "../whatsapp/ingest";
import { deliverNotification } from "../services/notifications";

export async function runJob(job: Job) {
  switch (job.type) {
    case "process-webhook-event":
      return processWebhookEvent(job.eventId);
    case "deliver-notification":
      return deliverNotification(job.notificationId);
  }
}
