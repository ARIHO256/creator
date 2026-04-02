import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:provider/ProviderJointQuote").catch(() => undefined);

export { default } from "./provider_joint_quote_collaboration_split_responsibilities_previewable";
