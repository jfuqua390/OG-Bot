// Minimal client for the Warcraft Logs API v2 (GraphQL), using the
// OAuth2 client-credentials flow (read-only, public-data access).
// Docs: https://www.warcraftlogs.com/api/docs

const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const GRAPHQL_URL = 'https://www.warcraftlogs.com/api/v2/client';

let cachedToken = null; // { accessToken, expiresAt }

async function getAccessToken({ clientId, clientSecret }) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WCL OAuth token request failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

async function graphql(credentials, query, variables) {
  const token = await getAccessToken(credentials);
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WCL GraphQL request failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`WCL GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

const RECENT_REPORTS_QUERY = /* GraphQL */ `
  query RecentReportsByUser($userID: Int!, $limit: Int!) {
    reportData {
      reports(userID: $userID, limit: $limit) {
        data {
          code
          title
          startTime
          endTime
          zone {
            name
          }
          owner {
            id
            name
          }
        }
      }
    }
  }
`;

// Returns the most recent reports uploaded by the given numeric WCL user ID,
// sorted newest first.
export async function fetchRecentReportsForUser(credentials, userId, limit = 5) {
  const data = await graphql(credentials, RECENT_REPORTS_QUERY, { userID: userId, limit });
  const reports = data?.reportData?.reports?.data ?? [];
  return [...reports].sort((a, b) => b.startTime - a.startTime);
}

const REPORT_BY_CODE_QUERY = /* GraphQL */ `
  query ReportOwner($code: String!) {
    reportData {
      report(code: $code) {
        code
        title
        owner {
          id
          name
        }
      }
    }
  }
`;

// Given a report code, returns { code, title, owner: { id, name } }.
// Useful for discovering a player's numeric user ID from a report they uploaded.
export async function fetchReportByCode(credentials, code) {
  const data = await graphql(credentials, REPORT_BY_CODE_QUERY, { code });
  const report = data?.reportData?.report;
  if (!report) {
    throw new Error(`No report found for code "${code}"`);
  }
  return report;
}

export function reportUrl(code) {
  return `https://www.warcraftlogs.com/reports/${code}`;
}
