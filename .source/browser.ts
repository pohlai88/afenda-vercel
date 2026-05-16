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
  docs: create.doc("docs", {"index.mdx": () => import("../content/ask-docs/index.mdx?collection=docs"), "index.ms.mdx": () => import("../content/ask-docs/index.ms.mdx?collection=docs"), "index.vi.mdx": () => import("../content/ask-docs/index.vi.mdx?collection=docs"), "index.zh-CN.mdx": () => import("../content/ask-docs/index.zh-CN.mdx?collection=docs"), "contacts/index.mdx": () => import("../content/ask-docs/contacts/index.mdx?collection=docs"), "getting-started/index.mdx": () => import("../content/ask-docs/getting-started/index.mdx?collection=docs"), "getting-started/index.ms.mdx": () => import("../content/ask-docs/getting-started/index.ms.mdx?collection=docs"), "getting-started/index.vi.mdx": () => import("../content/ask-docs/getting-started/index.vi.mdx?collection=docs"), "getting-started/index.zh-CN.mdx": () => import("../content/ask-docs/getting-started/index.zh-CN.mdx?collection=docs"), "getting-started/inviting-your-team.mdx": () => import("../content/ask-docs/getting-started/inviting-your-team.mdx?collection=docs"), "getting-started/quick-start.mdx": () => import("../content/ask-docs/getting-started/quick-start.mdx?collection=docs"), "getting-started/workspace-navigation.mdx": () => import("../content/ask-docs/getting-started/workspace-navigation.mdx?collection=docs"), "hrm/advances.mdx": () => import("../content/ask-docs/hrm/advances.mdx?collection=docs"), "hrm/attendance.mdx": () => import("../content/ask-docs/hrm/attendance.mdx?collection=docs"), "hrm/benefits.mdx": () => import("../content/ask-docs/hrm/benefits.mdx?collection=docs"), "hrm/claims.mdx": () => import("../content/ask-docs/hrm/claims.mdx?collection=docs"), "hrm/compliance.mdx": () => import("../content/ask-docs/hrm/compliance.mdx?collection=docs"), "hrm/documents.mdx": () => import("../content/ask-docs/hrm/documents.mdx?collection=docs"), "hrm/employees.mdx": () => import("../content/ask-docs/hrm/employees.mdx?collection=docs"), "hrm/imports.mdx": () => import("../content/ask-docs/hrm/imports.mdx?collection=docs"), "hrm/index.mdx": () => import("../content/ask-docs/hrm/index.mdx?collection=docs"), "hrm/index.ms.mdx": () => import("../content/ask-docs/hrm/index.ms.mdx?collection=docs"), "hrm/index.vi.mdx": () => import("../content/ask-docs/hrm/index.vi.mdx?collection=docs"), "hrm/index.zh-CN.mdx": () => import("../content/ask-docs/hrm/index.zh-CN.mdx?collection=docs"), "hrm/kpi.mdx": () => import("../content/ask-docs/hrm/kpi.mdx?collection=docs"), "hrm/leave.mdx": () => import("../content/ask-docs/hrm/leave.mdx?collection=docs"), "hrm/onboarding.mdx": () => import("../content/ask-docs/hrm/onboarding.mdx?collection=docs"), "hrm/organization.mdx": () => import("../content/ask-docs/hrm/organization.mdx?collection=docs"), "hrm/payroll.mdx": () => import("../content/ask-docs/hrm/payroll.mdx?collection=docs"), "hrm/performance.mdx": () => import("../content/ask-docs/hrm/performance.mdx?collection=docs"), "hrm/policies.mdx": () => import("../content/ask-docs/hrm/policies.mdx?collection=docs"), "hrm/recruitment.mdx": () => import("../content/ask-docs/hrm/recruitment.mdx?collection=docs"), "hrm/snapshot.mdx": () => import("../content/ask-docs/hrm/snapshot.mdx?collection=docs"), "orbit/index.mdx": () => import("../content/ask-docs/orbit/index.mdx?collection=docs"), "org-admin/index.mdx": () => import("../content/ask-docs/org-admin/index.mdx?collection=docs"), "portals/employee.mdx": () => import("../content/ask-docs/portals/employee.mdx?collection=docs"), }),
};
export default browserCollections;