export const PROVIDER_SERVICE_TAXONOMY_TREE_ID = 'taxonomy_tree_provider_service';
export const PROVIDER_SERVICE_TAXONOMY_TREE_SLUG = 'provider-service-taxonomy';
export const PROVIDER_SERVICE_TAXONOMY_TREE_NAME = 'Provider Service Taxonomy';

type ServiceNode = {
  id: string;
  name: string;
  description: string;
  flags?: Record<string, boolean>;
};

type TaxonomySeedNode = {
  id: string;
  type: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
  children: TaxonomySeedNode[];
};

const SERVICE_NODES: Record<string, ServiceNode> = {
  charger_install: {
    id: 'charger_install',
    name: 'Charger Installation',
    description: 'Site survey, mounting, wiring, commissioning and testing.',
    flags: { fieldWork: true, electrical: true }
  },
  charger_maintenance: {
    id: 'charger_maintenance',
    name: 'Charger Maintenance',
    description: 'Preventive maintenance, troubleshooting, parts replacement.',
    flags: { fieldWork: true, electrical: true }
  },
  ev_diagnostics: {
    id: 'ev_diagnostics',
    name: 'EV Diagnostics',
    description: 'Diagnostics, calibration, firmware checks, inspections.',
    flags: { fieldWork: true }
  },
  battery_service: {
    id: 'battery_service',
    name: 'Battery Service',
    description: 'Battery health assessment, BMS checks, safe handling guidance.',
    flags: { fieldWork: true, regulated: true }
  },
  software_integration: {
    id: 'software_integration',
    name: 'Software and CPMS Integration',
    description: 'OCPP setup, backend integration, dashboards, monitoring.',
    flags: { remoteOk: true }
  },
  training: {
    id: 'training',
    name: 'Training',
    description: 'EV, charger, maintenance, safety and operations training.',
    flags: { training: true }
  },
  consulting: {
    id: 'consulting',
    name: 'Consulting',
    description: 'Feasibility, procurement guidance, rollout planning.',
    flags: { remoteOk: true }
  },
  other: {
    id: 'other',
    name: 'Other',
    description: 'Any service that does not fit the categories above.'
  }
};

const serviceLeaf = (id: keyof typeof SERVICE_NODES): TaxonomySeedNode => ({
  id,
  type: 'Service',
  name: SERVICE_NODES[id].name,
  description: SERVICE_NODES[id].description,
  metadata: {
    role: 'provider',
    surface: 'provider_onboarding',
    categoryId: id,
    flags: SERVICE_NODES[id].flags || {}
  },
  children: []
});

export const PROVIDER_SERVICE_TAXONOMY: TaxonomySeedNode[] = [
  {
    id: 'service-marketplace-evzone',
    type: 'Service Marketplace',
    name: 'EVzone Services',
    description: 'Services for EVzone buyers.',
    metadata: { role: 'provider', surface: 'provider_onboarding' },
    children: [
      {
        id: 'service-family-field',
        type: 'Service Family',
        name: 'Field & Installation',
        description: 'On-site delivery, maintenance, and diagnostics.',
        metadata: { role: 'provider', surface: 'provider_onboarding' },
        children: [
          {
            id: 'service-category-chargers',
            type: 'Service Category',
            name: 'Charger Operations',
            description: 'Installation and maintenance services.',
            metadata: { role: 'provider', surface: 'provider_onboarding' },
            children: [serviceLeaf('charger_install'), serviceLeaf('charger_maintenance')]
          },
          {
            id: 'service-category-diagnostics',
            type: 'Service Category',
            name: 'Diagnostics & Health',
            description: 'Diagnostics and battery services.',
            metadata: { role: 'provider', surface: 'provider_onboarding' },
            children: [serviceLeaf('ev_diagnostics'), serviceLeaf('battery_service')]
          }
        ]
      },
      {
        id: 'service-family-digital',
        type: 'Service Family',
        name: 'Digital & Advisory',
        description: 'Remote, training, and advisory services.',
        metadata: { role: 'provider', surface: 'provider_onboarding' },
        children: [
          {
            id: 'service-category-software',
            type: 'Service Category',
            name: 'Software & Integrations',
            description: 'Software integration and monitoring.',
            metadata: { role: 'provider', surface: 'provider_onboarding' },
            children: [serviceLeaf('software_integration')]
          },
          {
            id: 'service-category-advisory',
            type: 'Service Category',
            name: 'Training & Consulting',
            description: 'Training and advisory services.',
            metadata: { role: 'provider', surface: 'provider_onboarding' },
            children: [serviceLeaf('training'), serviceLeaf('consulting')]
          },
          {
            id: 'service-category-other',
            type: 'Service Category',
            name: 'Other Services',
            description: 'Specialized or custom services.',
            metadata: { role: 'provider', surface: 'provider_onboarding' },
            children: [serviceLeaf('other')]
          }
        ]
      }
    ]
  }
];
