// @ts-nocheck
import { frontmatter as __fd_glob_41 } from "../content/ask-docs/portals/employee.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_40 } from "../content/ask-docs/org-admin/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_39 } from "../content/ask-docs/orbit/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_38 } from "../content/ask-docs/hrm/snapshot.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_37 } from "../content/ask-docs/hrm/recruitment.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_36 } from "../content/ask-docs/hrm/policies.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_35 } from "../content/ask-docs/hrm/performance.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_34 } from "../content/ask-docs/hrm/payroll.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_33 } from "../content/ask-docs/hrm/organization.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_32 } from "../content/ask-docs/hrm/onboarding.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_31 } from "../content/ask-docs/hrm/leave.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_30 } from "../content/ask-docs/hrm/kpi.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_29 } from "../content/ask-docs/hrm/index.zh-CN.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_28 } from "../content/ask-docs/hrm/index.vi.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_27 } from "../content/ask-docs/hrm/index.ms.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_26 } from "../content/ask-docs/hrm/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_25 } from "../content/ask-docs/hrm/imports.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_24 } from "../content/ask-docs/hrm/employees.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_23 } from "../content/ask-docs/hrm/documents.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_22 } from "../content/ask-docs/hrm/compliance.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_21 } from "../content/ask-docs/hrm/claims.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_20 } from "../content/ask-docs/hrm/benefits.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_19 } from "../content/ask-docs/hrm/attendance.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_18 } from "../content/ask-docs/hrm/advances.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_17 } from "../content/ask-docs/getting-started/workspace-navigation.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_16 } from "../content/ask-docs/getting-started/quick-start.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_15 } from "../content/ask-docs/getting-started/inviting-your-team.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_14 } from "../content/ask-docs/getting-started/index.zh-CN.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_13 } from "../content/ask-docs/getting-started/index.vi.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_12 } from "../content/ask-docs/getting-started/index.ms.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_11 } from "../content/ask-docs/getting-started/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_10 } from "../content/ask-docs/contacts/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_9 } from "../content/ask-docs/index.zh-CN.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_8 } from "../content/ask-docs/index.vi.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_7 } from "../content/ask-docs/index.ms.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_6 } from "../content/ask-docs/index.mdx?collection=docs&only=frontmatter"
import { default as __fd_glob_5 } from "../content/ask-docs/org-admin/meta.json?collection=docs"
import { default as __fd_glob_4 } from "../content/ask-docs/orbit/meta.json?collection=docs"
import { default as __fd_glob_3 } from "../content/ask-docs/hrm/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/ask-docs/getting-started/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/ask-docs/contacts/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/ask-docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
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
}>({"doc":{"passthroughs":["extractedReferences","lastModified"]}});

export const docs = await create.docsLazy("docs", "content/ask-docs", {"meta.json": __fd_glob_0, "contacts/meta.json": __fd_glob_1, "getting-started/meta.json": __fd_glob_2, "hrm/meta.json": __fd_glob_3, "orbit/meta.json": __fd_glob_4, "org-admin/meta.json": __fd_glob_5, }, {"index.mdx": __fd_glob_6, "index.ms.mdx": __fd_glob_7, "index.vi.mdx": __fd_glob_8, "index.zh-CN.mdx": __fd_glob_9, "contacts/index.mdx": __fd_glob_10, "getting-started/index.mdx": __fd_glob_11, "getting-started/index.ms.mdx": __fd_glob_12, "getting-started/index.vi.mdx": __fd_glob_13, "getting-started/index.zh-CN.mdx": __fd_glob_14, "getting-started/inviting-your-team.mdx": __fd_glob_15, "getting-started/quick-start.mdx": __fd_glob_16, "getting-started/workspace-navigation.mdx": __fd_glob_17, "hrm/advances.mdx": __fd_glob_18, "hrm/attendance.mdx": __fd_glob_19, "hrm/benefits.mdx": __fd_glob_20, "hrm/claims.mdx": __fd_glob_21, "hrm/compliance.mdx": __fd_glob_22, "hrm/documents.mdx": __fd_glob_23, "hrm/employees.mdx": __fd_glob_24, "hrm/imports.mdx": __fd_glob_25, "hrm/index.mdx": __fd_glob_26, "hrm/index.ms.mdx": __fd_glob_27, "hrm/index.vi.mdx": __fd_glob_28, "hrm/index.zh-CN.mdx": __fd_glob_29, "hrm/kpi.mdx": __fd_glob_30, "hrm/leave.mdx": __fd_glob_31, "hrm/onboarding.mdx": __fd_glob_32, "hrm/organization.mdx": __fd_glob_33, "hrm/payroll.mdx": __fd_glob_34, "hrm/performance.mdx": __fd_glob_35, "hrm/policies.mdx": __fd_glob_36, "hrm/recruitment.mdx": __fd_glob_37, "hrm/snapshot.mdx": __fd_glob_38, "orbit/index.mdx": __fd_glob_39, "org-admin/index.mdx": __fd_glob_40, "portals/employee.mdx": __fd_glob_41, }, {"index.mdx": () => import("../content/ask-docs/index.mdx?collection=docs"), "index.ms.mdx": () => import("../content/ask-docs/index.ms.mdx?collection=docs"), "index.vi.mdx": () => import("../content/ask-docs/index.vi.mdx?collection=docs"), "index.zh-CN.mdx": () => import("../content/ask-docs/index.zh-CN.mdx?collection=docs"), "contacts/index.mdx": () => import("../content/ask-docs/contacts/index.mdx?collection=docs"), "getting-started/index.mdx": () => import("../content/ask-docs/getting-started/index.mdx?collection=docs"), "getting-started/index.ms.mdx": () => import("../content/ask-docs/getting-started/index.ms.mdx?collection=docs"), "getting-started/index.vi.mdx": () => import("../content/ask-docs/getting-started/index.vi.mdx?collection=docs"), "getting-started/index.zh-CN.mdx": () => import("../content/ask-docs/getting-started/index.zh-CN.mdx?collection=docs"), "getting-started/inviting-your-team.mdx": () => import("../content/ask-docs/getting-started/inviting-your-team.mdx?collection=docs"), "getting-started/quick-start.mdx": () => import("../content/ask-docs/getting-started/quick-start.mdx?collection=docs"), "getting-started/workspace-navigation.mdx": () => import("../content/ask-docs/getting-started/workspace-navigation.mdx?collection=docs"), "hrm/advances.mdx": () => import("../content/ask-docs/hrm/advances.mdx?collection=docs"), "hrm/attendance.mdx": () => import("../content/ask-docs/hrm/attendance.mdx?collection=docs"), "hrm/benefits.mdx": () => import("../content/ask-docs/hrm/benefits.mdx?collection=docs"), "hrm/claims.mdx": () => import("../content/ask-docs/hrm/claims.mdx?collection=docs"), "hrm/compliance.mdx": () => import("../content/ask-docs/hrm/compliance.mdx?collection=docs"), "hrm/documents.mdx": () => import("../content/ask-docs/hrm/documents.mdx?collection=docs"), "hrm/employees.mdx": () => import("../content/ask-docs/hrm/employees.mdx?collection=docs"), "hrm/imports.mdx": () => import("../content/ask-docs/hrm/imports.mdx?collection=docs"), "hrm/index.mdx": () => import("../content/ask-docs/hrm/index.mdx?collection=docs"), "hrm/index.ms.mdx": () => import("../content/ask-docs/hrm/index.ms.mdx?collection=docs"), "hrm/index.vi.mdx": () => import("../content/ask-docs/hrm/index.vi.mdx?collection=docs"), "hrm/index.zh-CN.mdx": () => import("../content/ask-docs/hrm/index.zh-CN.mdx?collection=docs"), "hrm/kpi.mdx": () => import("../content/ask-docs/hrm/kpi.mdx?collection=docs"), "hrm/leave.mdx": () => import("../content/ask-docs/hrm/leave.mdx?collection=docs"), "hrm/onboarding.mdx": () => import("../content/ask-docs/hrm/onboarding.mdx?collection=docs"), "hrm/organization.mdx": () => import("../content/ask-docs/hrm/organization.mdx?collection=docs"), "hrm/payroll.mdx": () => import("../content/ask-docs/hrm/payroll.mdx?collection=docs"), "hrm/performance.mdx": () => import("../content/ask-docs/hrm/performance.mdx?collection=docs"), "hrm/policies.mdx": () => import("../content/ask-docs/hrm/policies.mdx?collection=docs"), "hrm/recruitment.mdx": () => import("../content/ask-docs/hrm/recruitment.mdx?collection=docs"), "hrm/snapshot.mdx": () => import("../content/ask-docs/hrm/snapshot.mdx?collection=docs"), "orbit/index.mdx": () => import("../content/ask-docs/orbit/index.mdx?collection=docs"), "org-admin/index.mdx": () => import("../content/ask-docs/org-admin/index.mdx?collection=docs"), "portals/employee.mdx": () => import("../content/ask-docs/portals/employee.mdx?collection=docs"), });