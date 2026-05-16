// @ts-nocheck
import * as __fd_glob_31 from "../content/help-docs/org-admin/index.mdx?collection=docs"
import * as __fd_glob_30 from "../content/help-docs/orbit/index.mdx?collection=docs"
import * as __fd_glob_29 from "../content/help-docs/hrm/snapshot.mdx?collection=docs"
import * as __fd_glob_28 from "../content/help-docs/hrm/recruitment.mdx?collection=docs"
import * as __fd_glob_27 from "../content/help-docs/hrm/policies.mdx?collection=docs"
import * as __fd_glob_26 from "../content/help-docs/hrm/performance.mdx?collection=docs"
import * as __fd_glob_25 from "../content/help-docs/hrm/payroll.mdx?collection=docs"
import * as __fd_glob_24 from "../content/help-docs/hrm/organization.mdx?collection=docs"
import * as __fd_glob_23 from "../content/help-docs/hrm/onboarding.mdx?collection=docs"
import * as __fd_glob_22 from "../content/help-docs/hrm/leave.mdx?collection=docs"
import * as __fd_glob_21 from "../content/help-docs/hrm/kpi.mdx?collection=docs"
import * as __fd_glob_20 from "../content/help-docs/hrm/index.mdx?collection=docs"
import * as __fd_glob_19 from "../content/help-docs/hrm/imports.mdx?collection=docs"
import * as __fd_glob_18 from "../content/help-docs/hrm/employees.mdx?collection=docs"
import * as __fd_glob_17 from "../content/help-docs/hrm/documents.mdx?collection=docs"
import * as __fd_glob_16 from "../content/help-docs/hrm/compliance.mdx?collection=docs"
import * as __fd_glob_15 from "../content/help-docs/hrm/claims.mdx?collection=docs"
import * as __fd_glob_14 from "../content/help-docs/hrm/benefits.mdx?collection=docs"
import * as __fd_glob_13 from "../content/help-docs/hrm/attendance.mdx?collection=docs"
import * as __fd_glob_12 from "../content/help-docs/hrm/advances.mdx?collection=docs"
import * as __fd_glob_11 from "../content/help-docs/getting-started/workspace-navigation.mdx?collection=docs"
import * as __fd_glob_10 from "../content/help-docs/getting-started/quick-start.mdx?collection=docs"
import * as __fd_glob_9 from "../content/help-docs/getting-started/inviting-your-team.mdx?collection=docs"
import * as __fd_glob_8 from "../content/help-docs/getting-started/index.mdx?collection=docs"
import * as __fd_glob_7 from "../content/help-docs/contacts/index.mdx?collection=docs"
import * as __fd_glob_6 from "../content/help-docs/index.mdx?collection=docs"
import { default as __fd_glob_5 } from "../content/help-docs/org-admin/meta.json?collection=docs"
import { default as __fd_glob_4 } from "../content/help-docs/orbit/meta.json?collection=docs"
import { default as __fd_glob_3 } from "../content/help-docs/hrm/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/help-docs/getting-started/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/help-docs/contacts/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/help-docs/meta.json?collection=docs"
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

export const docs = await create.docs("docs", "content/help-docs", {"meta.json": __fd_glob_0, "contacts/meta.json": __fd_glob_1, "getting-started/meta.json": __fd_glob_2, "hrm/meta.json": __fd_glob_3, "orbit/meta.json": __fd_glob_4, "org-admin/meta.json": __fd_glob_5, }, {"index.mdx": __fd_glob_6, "contacts/index.mdx": __fd_glob_7, "getting-started/index.mdx": __fd_glob_8, "getting-started/inviting-your-team.mdx": __fd_glob_9, "getting-started/quick-start.mdx": __fd_glob_10, "getting-started/workspace-navigation.mdx": __fd_glob_11, "hrm/advances.mdx": __fd_glob_12, "hrm/attendance.mdx": __fd_glob_13, "hrm/benefits.mdx": __fd_glob_14, "hrm/claims.mdx": __fd_glob_15, "hrm/compliance.mdx": __fd_glob_16, "hrm/documents.mdx": __fd_glob_17, "hrm/employees.mdx": __fd_glob_18, "hrm/imports.mdx": __fd_glob_19, "hrm/index.mdx": __fd_glob_20, "hrm/kpi.mdx": __fd_glob_21, "hrm/leave.mdx": __fd_glob_22, "hrm/onboarding.mdx": __fd_glob_23, "hrm/organization.mdx": __fd_glob_24, "hrm/payroll.mdx": __fd_glob_25, "hrm/performance.mdx": __fd_glob_26, "hrm/policies.mdx": __fd_glob_27, "hrm/recruitment.mdx": __fd_glob_28, "hrm/snapshot.mdx": __fd_glob_29, "orbit/index.mdx": __fd_glob_30, "org-admin/index.mdx": __fd_glob_31, });