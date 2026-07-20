#!/bin/bash
set -e
pnpm install --frozen-lockfile
# DB schema is empty — skip push until tables are defined
# pnpm --filter @workspace/db run push
