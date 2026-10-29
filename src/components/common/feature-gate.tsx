'use client';

import type { ReactNode } from 'react';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Card from '@mui/material/Card';
import { FEATURE_REGISTRY, type FeatureKey } from '@attendance/contracts';
import { useSession } from '@/lib/session';
import { EmptyState } from './loading';
import { PageHeader } from './page-header';

interface FeatureGateProps {
  readonly feature: FeatureKey;
  readonly children: ReactNode;
}

/** Renders the page only when the company has the module switched on. */
export function FeatureGate({ feature, children }: FeatureGateProps) {
  const { has, isAdmin, session } = useSession();
  if (has(feature)) return <>{children}</>;
  const label = FEATURE_REGISTRY[feature].label;
  return (
    <>
      <PageHeader title={label} />
      <Card>
        <EmptyState
          icon={<LockOutlinedIcon />}
          title={`${label} is switched off for ${session.tenant.displayName}`}
          description={isAdmin ? 'Turn it on in Settings → Modules, or ask your account manager if it is managed for you.' : 'Ask your company Admin to switch it on.'}
        />
      </Card>
    </>
  );
}
