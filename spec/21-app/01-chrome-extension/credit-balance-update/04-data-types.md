# 04 — Data Types

All types are PascalCase at the type level, fields are camelCase (TypeScript
convention). SQLite storage continues to use PascalCase column names per memory
`mem://constraints/no-storage-pascalcase-migration`.

## `WorkspaceInfo` (camelCase fields)

| Field                          | Type           | Source           |
|--------------------------------|----------------|------------------|
| id                             | string         | wire `id`        |
| name                           | string         | wire `name`      |
| ownerId                        | string         | wire `owner_id`  |
| plan                           | `Plan`         | mapped from `plan` |
| defaultProjectVisibility       | string         | wire             |
| billingPeriodCreditsUsed       | number         | wire             |
| billingPeriodCreditsLimit      | number         | wire             |
| isPersonal                     | boolean        | wire             |
| numProjects                    | number         | wire             |
| membership                     | `Membership`   | nested object    |

## `Membership`

| Field              | Type   |
|--------------------|--------|
| workspaceId        | string |
| userId             | string |
| role               | string |
| email              | string |
| monthlyCreditLimit | number \| null |
| invitedAt          | string |
| joinedAt           | string |

## `CreditBalance`

| Field                    | Type                  |
|--------------------------|-----------------------|
| totalRemaining           | number                |
| totalGranted             | number                |
| dailyRemaining           | number                |
| dailyLimit               | number                |
| totalBillingPeriodUsed   | number                |
| expiringGrants           | `ExpiringGrant[]`     |
| grantTypeBalances        | `GrantTypeBalance[]`  |

## `GrantTypeBalance`

| Field      | Type        |
|------------|-------------|
| grantType  | `GrantType` |
| granted    | number      |
| remaining  | number      |

## `ExpiringGrant`

| Field      | Type   |
|------------|--------|
| grantType  | `GrantType` |
| remaining  | number |
| expiresAt  | string |

## `CreditFetchResult`

| Field      | Type                  |
|------------|-----------------------|
| outcome    | `CreditFetchOutcome`  |
| balance    | `CreditBalance \| null` |
| fetchedAt  | number (epoch ms)     |
| sourceUrl  | string                |
| errorDetail| string \| null        |
