import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:provider/ProviderConsultations").catch(() => undefined);

export { default } from "./provider_consultations_queue_scheduling_notes_previewable";
