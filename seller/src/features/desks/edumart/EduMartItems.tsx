import { sellerBackendApi } from "../../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:desks/edumart/EduMartItems").catch(() => undefined);

export { default } from "./edu_mart_desk_seller_compliance_center_previewable";
