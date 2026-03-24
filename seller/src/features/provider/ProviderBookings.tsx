import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:provider/ProviderBookings").catch(() => undefined);

export { default } from "./provider_bookings_booking_detail_previewable";
