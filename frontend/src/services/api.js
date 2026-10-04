import { apiFetch, getApiUrl } from "../lib/api";
import { getSocket } from "../lib/socket";

export { apiFetch, getApiUrl, getSocket };

export async function fetchScheduledMeetings() {
  return apiFetch("/api/v1/meetings");
}

export async function scheduleMeeting(data) {
  return apiFetch("/api/v1/meetings/schedule", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelMeeting(id) {
  return apiFetch(`/api/v1/meetings/${id}`, {
    method: "DELETE",
  });
}
