// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    docs: {
      /**
       * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
       */
      extractedReferences: import("fumadocs-mdx").ExtractedReference[];
    },
  }
} & {
  DocData: {
    docs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/help-docs/index.mdx?collection=docs"), "contacts/index.mdx": () => import("../content/help-docs/contacts/index.mdx?collection=docs"), "getting-started/index.mdx": () => import("../content/help-docs/getting-started/index.mdx?collection=docs"), "getting-started/inviting-your-team.mdx": () => import("../content/help-docs/getting-started/inviting-your-team.mdx?collection=docs"), "getting-started/quick-start.mdx": () => import("../content/help-docs/getting-started/quick-start.mdx?collection=docs"), "getting-started/workspace-navigation.mdx": () => import("../content/help-docs/getting-started/workspace-navigation.mdx?collection=docs"), "hrm/advances.mdx": () => import("../content/help-docs/hrm/advances.mdx?collection=docs"), "hrm/attendance.mdx": () => import("../content/help-docs/hrm/attendance.mdx?collection=docs"), "hrm/benefits.mdx": () => import("../content/help-docs/hrm/benefits.mdx?collection=docs"), "hrm/claims.mdx": () => import("../content/help-docs/hrm/claims.mdx?collection=docs"), "hrm/compliance.mdx": () => import("../content/help-docs/hrm/compliance.mdx?collection=docs"), "hrm/documents.mdx": () => import("../content/help-docs/hrm/documents.mdx?collection=docs"), "hrm/employees.mdx": () => import("../content/help-docs/hrm/employees.mdx?collection=docs"), "hrm/imports.mdx": () => import("../content/help-docs/hrm/imports.mdx?collection=docs"), "hrm/index.mdx": () => import("../content/help-docs/hrm/index.mdx?collection=docs"), "hrm/kpi.mdx": () => import("../content/help-docs/hrm/kpi.mdx?collection=docs"), "hrm/leave.mdx": () => import("../content/help-docs/hrm/leave.mdx?collection=docs"), "hrm/onboarding.mdx": () => import("../content/help-docs/hrm/onboarding.mdx?collection=docs"), "hrm/organization.mdx": () => import("../content/help-docs/hrm/organization.mdx?collection=docs"), "hrm/payroll.mdx": () => import("../content/help-docs/hrm/payroll.mdx?collection=docs"), "hrm/performance.mdx": () => import("../content/help-docs/hrm/performance.mdx?collection=docs"), "hrm/policies.mdx": () => import("../content/help-docs/hrm/policies.mdx?collection=docs"), "hrm/recruitment.mdx": () => import("../content/help-docs/hrm/recruitment.mdx?collection=docs"), "hrm/snapshot.mdx": () => import("../content/help-docs/hrm/snapshot.mdx?collection=docs"), "orbit/index.mdx": () => import("../content/help-docs/orbit/index.mdx?collection=docs"), "org-admin/index.mdx": () => import("../content/help-docs/org-admin/index.mdx?collection=docs"), }),
};
export default browserCollections;