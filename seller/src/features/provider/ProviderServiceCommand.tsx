import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:provider/ProviderServiceCommand").catch(() => undefined);

export { default } from "./provider_service_command_previewable";
